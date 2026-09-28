"""
RION LEADS GENERATION TOOL - SCRAPER ENGINE
High-performance Google Maps & Business Lead Extractor with Website Email Enrichment.
"""

import asyncio
import re
import sys
import os
import time
from datetime import datetime
from typing import List, Dict, Any, Callable, Optional
import httpx
from bs4 import BeautifulSoup
import pandas as pd
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

sys.stdout.reconfigure(encoding="utf-8")

# Email regex pattern
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
EXCLUDED_EXTS = ('.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.js', '.css', '.woff', '.woff2', '.ttf')
DUMMY_DOMAINS = ('example.com', 'domain.com', 'yourdomain.com', 'email.com', 'wixpress.com', 'sentry.io', 'google.com')

# Phone regex pattern
PHONE_REGEX = re.compile(r'(?:\+?\d{1,4}[ -]?)?(?:\(?\d{2,5}\)?[ -]?)?\d{3,5}[ -]?\d{3,5}')


class LeadScraper:
    def __init__(self, callback: Optional[Callable[[Dict[str, Any]], None]] = None):
        self.callback = callback
        self.is_running = False
        self.should_stop = False
        self.scraped_leads: List[Dict[str, Any]] = []
        self.stats = {
            "total_found": 0,
            "emails_found": 0,
            "phones_found": 0,
            "websites_found": 0,
            "status": "idle",
            "progress_percent": 0,
            "current_action": "Ready"
        }

    async def emit(self, event_type: str, data: Dict[str, Any]):
        if self.callback:
            try:
                payload = {
                    "type": event_type,
                    "timestamp": datetime.now().isoformat(),
                    "stats": self.stats,
                    "data": data
                }
                if asyncio.iscoroutinefunction(self.callback):
                    await self.callback(payload)
                else:
                    self.callback(payload)
            except Exception as e:
                print(f"[Callback Error] {e}")

    async def extract_email_from_website(self, client: httpx.AsyncClient, website_url: str) -> Dict[str, str]:
        """Asynchronously scrapes emails and phone numbers from company website."""
        if not website_url or not website_url.startswith("http"):
            return {"email": "", "phone": ""}
        
        found_emails = set()
        found_phones = set()

        def clean_email(e: str) -> Optional[str]:
            e = e.strip().lower()
            # Ignore version numbers like @5.3.6, cdn paths, images
            if re.search(r'@\d+\.\d+', e):
                return None
            if any(d in e for d in DUMMY_DOMAINS) or any(e.endswith(ext) for ext in EXCLUDED_EXTS):
                return None
            if len(e) > 55 or len(e) < 5 or "@" not in e or "." not in e.split("@")[-1]:
                return None
            return e

        def extract_from_html(html: str):
            # Check mailto: links
            for mailto in re.findall(r'mailto:([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', html, re.I):
                clean_e = clean_email(mailto)
                if clean_e:
                    found_emails.add(clean_e)
            
            # Text regex emails
            for email in EMAIL_REGEX.findall(html):
                clean_e = clean_email(email)
                if clean_e:
                    found_emails.add(clean_e)

            # Check tel: links for phone
            for tel in re.findall(r'href=["\']tel:([+\d\s()-]{7,20})["\']', html, re.I):
                clean_tel = re.sub(r'[^\d+]', ' ', tel).strip()
                digits = re.sub(r'\D', '', clean_tel)
                if 7 <= len(digits) <= 14:
                    found_phones.add(clean_tel)

        # 1. Homepage scan
        try:
            resp = await client.get(website_url, timeout=5.0)
            if resp.status_code == 200:
                extract_from_html(resp.text)
        except Exception:
            pass

        # 2. Contact page scan if no email found
        if not found_emails:
            base_url = website_url.rstrip("/")
            candidate_paths = ["/contact", "/contact-us", "/contactus", "/about-us", "/about"]
            for path in candidate_paths:
                try:
                    c_url = base_url + path
                    resp = await client.get(c_url, timeout=4.0)
                    if resp.status_code == 200:
                        extract_from_html(resp.text)
                        if found_emails:
                            break
                except Exception:
                    continue

        valid_emails = list(found_emails)
        valid_phones = list(found_phones)

        return {
            "email": ", ".join(valid_emails[:2]) if valid_emails else "",
            "phone": valid_phones[0] if valid_phones else ""
        }

    async def parse_card_info(self, card, client: httpx.AsyncClient, query_keywords: str, query_region: str) -> Optional[Dict[str, Any]]:
        """Parses an individual Google Maps listing card."""
        try:
            # 1. Company Name & Maps Link
            name = ""
            maps_url = ""
            place_link = card.locator('a[href*="/maps/place/"]').first
            if await place_link.count() > 0:
                name = (await place_link.get_attribute("aria-label")) or ""
                maps_url = (await place_link.get_attribute("href")) or ""
            
            if not name:
                title_el = card.locator('div.qBF1Pd').first
                if await title_el.count() > 0:
                    name = await title_el.inner_text()

            name = name.strip()
            if not name:
                return None

            # 2. Rating & Review Count
            rating = ""
            review_count = ""
            stars_el = card.locator('span[aria-label*="star" i]').first
            if await stars_el.count() > 0:
                aria_text = (await stars_el.get_attribute("aria-label")) or ""
                # Format: "4.7 stars 42 Reviews"
                m_rate = re.search(r'([\d.]+)\s*star', aria_text, re.I)
                if m_rate:
                    rating = m_rate.group(1)
                m_rev = re.search(r'([\d,]+)\s*Review', aria_text, re.I)
                if m_rev:
                    review_count = m_rev.group(1).replace(",", "")
            
            if not rating:
                rate_span = card.locator('span.MW4etd').first
                if await rate_span.count() > 0:
                    rating = (await rate_span.inner_text()).strip()
            if not review_count:
                rev_span = card.locator('span.UY7F9').first
                if await rev_span.count() > 0:
                    txt = await rev_span.inner_text()
                    review_count = re.sub(r'[^\d]', '', txt)

            # 3. Website
            website = ""
            web_link = card.locator('a[aria-label*="website" i], a[data-value="Website"]').first
            if await web_link.count() > 0:
                website = (await web_link.get_attribute("href")) or ""

            # 4. Text lines for Category, Address, Phone
            full_card_text = await card.inner_text()
            lines = [l.strip() for l in full_card_text.split("\n") if l.strip()]

            category = ""
            address = ""
            phone = ""

            for line in lines:
                # Check for category
                if " · " in line and not category:
                    parts = [p.strip() for p in line.split(" · ")]
                    if parts:
                        category = parts[0]
                    if len(parts) > 1:
                        addr_candidate = parts[-1]
                        if not any(h in addr_candidate.lower() for h in ["open", "close", "am", "pm", "hours"]):
                            address = addr_candidate

                # Check for phone in any part of the line
                # e.g., "Open · Closes 5:30 pm · 080 4953 7848"
                parts = line.split(" · ") if " · " in line else [line]
                for p in parts:
                    clean_p = p.strip()
                    digits = re.sub(r'\D', '', clean_p)
                    if 7 <= len(digits) <= 14 and not any(k in clean_p.lower() for k in ["star", "review", "open", "close", "am", "pm"]):
                        phone = clean_p
                        break

            # If address is still blank
            if not address and len(lines) >= 3:
                for l in lines[1:]:
                    if any(c in l.lower() for c in [",", "road", "rd", "st", "street", "ave", "floor", "nagar", "sector", "estate", "opp"]):
                        address = l
                        break

            # 5. Extract Email & Phone from Website
            email = ""
            if website:
                web_data = await self.extract_email_from_website(client, website)
                email = web_data.get("email", "")
                if not phone and web_data.get("phone"):
                    phone = web_data.get("phone", "")

            lead = {
                "company_name": name,
                "category": category or "Business",
                "phone": phone,
                "email": email,
                "website": website,
                "address": address or query_region,
                "rating": rating or "N/A",
                "reviews": review_count or "0",
                "google_maps_url": maps_url,
                "query_keywords": query_keywords,
                "query_region": query_region,
                "scraped_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

            return lead
        except Exception as e:
            print(f"[Parse Card Error] {e}")
            return None

    async def run(
        self,
        keywords: str,
        region: str,
        target_count: int = 20,
        output_format: str = "xlsx",
        output_dir: str = "./exports"
    ) -> Dict[str, Any]:
        """Main scraping routine."""
        self.is_running = True
        self.should_stop = False
        self.scraped_leads = []
        self.stats = {
            "total_found": 0,
            "emails_found": 0,
            "phones_found": 0,
            "websites_found": 0,
            "status": "running",
            "progress_percent": 0,
            "current_action": f"Starting search for '{keywords}' in '{region}'..."
        }

        os.makedirs(output_dir, exist_ok=True)
        search_query = f"{keywords} {region}".strip().replace(" ", "+")
        maps_url = f"https://www.google.com/maps/search/{search_query}"

        await self.emit("log", {"level": "info", "message": f"Initializing RION LEADS engine for query: '{keywords}' | Region: '{region}'"})
        await self.emit("status", {"status": "starting", "message": "Launching browser..."})

        client_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }

        async with httpx.AsyncClient(headers=client_headers, timeout=6.0, follow_redirects=True, verify=False) as http_client:
            async with async_playwright() as p:
                try:
                    browser: Browser = await p.chromium.launch(
                        headless=True,
                        args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"]
                    )
                    context: BrowserContext = await browser.new_context(
                        user_agent=client_headers["User-Agent"],
                        viewport={"width": 1366, "height": 850}
                    )
                    page: Page = await context.new_page()

                    await self.emit("log", {"level": "info", "message": f"Navigating to Google Maps search: {maps_url}"})
                    await page.goto(maps_url, timeout=40000)
                    await page.wait_for_timeout(3000)

                    # Handle cookie consent if visible
                    for btn_text in ["Accept all", "I agree", "Accept", "Agree", "Alle akzeptieren"]:
                        try:
                            btn = page.get_by_role("button", name=btn_text)
                            if await btn.is_visible(timeout=1000):
                                await btn.click()
                                await self.emit("log", {"level": "info", "message": "Dismissed cookie banner."})
                                await page.wait_for_timeout(2000)
                                break
                        except Exception:
                            pass

                    # Wait for feed container
                    try:
                        await page.wait_for_selector('div[role="feed"], div.Nv2PK', timeout=12000)
                    except Exception:
                        await self.emit("log", {"level": "warn", "message": "Standard feed container not detected immediately, trying alternative elements..."})

                    processed_names = set()
                    consecutive_no_new_cards = 0
                    max_scroll_attempts = 50

                    await self.emit("log", {"level": "info", "message": f"Target goal: {target_count} leads. Beginning scroll and extraction..."})

                    scroll_round = 0
                    while len(self.scraped_leads) < target_count and not self.should_stop and scroll_round < max_scroll_attempts:
                        scroll_round += 1

                        # Locate all cards currently in the feed
                        card_locators = await page.locator('div.Nv2PK').all()
                        new_found_in_round = 0

                        for card in card_locators:
                            if self.should_stop or len(self.scraped_leads) >= target_count:
                                break

                            # Check company name preview to avoid re-parsing
                            place_link = card.locator('a[href*="/maps/place/"]').first
                            preview_name = ""
                            if await place_link.count() > 0:
                                preview_name = await place_link.get_attribute("aria-label") or ""
                            
                            if preview_name and preview_name in processed_names:
                                continue

                            lead = await self.parse_card_info(card, http_client, keywords, region)
                            if lead and lead["company_name"] not in processed_names:
                                processed_names.add(lead["company_name"])
                                self.scraped_leads.append(lead)
                                new_found_in_round += 1

                                # Update stats
                                self.stats["total_found"] = len(self.scraped_leads)
                                if lead["email"]:
                                    self.stats["emails_found"] += 1
                                if lead["phone"]:
                                    self.stats["phones_found"] += 1
                                if lead["website"]:
                                    self.stats["websites_found"] += 1
                                
                                self.stats["progress_percent"] = min(100, int((len(self.scraped_leads) / target_count) * 100))
                                self.stats["current_action"] = f"Extracted: {lead['company_name']}"

                                email_tag = f" | Email: {lead['email']}" if lead['email'] else ""
                                phone_tag = f" | Phone: {lead['phone']}" if lead['phone'] else ""
                                await self.emit("lead_found", {
                                    "lead": lead,
                                    "current": len(self.scraped_leads),
                                    "target": target_count
                                })
                                await self.emit("log", {
                                    "level": "success" if lead['email'] else "info",
                                    "message": f"[{len(self.scraped_leads)}/{target_count}] {lead['company_name']} ({lead['category']}){phone_tag}{email_tag}"
                                })

                        # Scroll feed down to load more results
                        scroll_res = await page.evaluate("""() => {
                            const feed = document.querySelector('div[role="feed"]');
                            if (feed) {
                                feed.scrollBy(0, 2500);
                                return true;
                            }
                            window.scrollBy(0, 2500);
                            return false;
                        }""")
                        await page.wait_for_timeout(2000)

                        # Check if reached end of list
                        end_text = await page.locator("text=\"You've reached the end of the list.\"").count()
                        if end_text > 0:
                            await self.emit("log", {"level": "info", "message": "Google Maps indicated all available listings for this query have been reached."})
                            break

                        if new_found_in_round == 0:
                            consecutive_no_new_cards += 1
                            if consecutive_no_new_cards >= 4:
                                await self.emit("log", {"level": "info", "message": "No additional new listings loaded after multiple scrolls. Finalizing."})
                                break
                        else:
                            consecutive_no_new_cards = 0

                    await browser.close()
                except Exception as e:
                    await self.emit("log", {"level": "error", "message": f"Engine error: {str(e)}"})
                finally:
                    self.is_running = False

        # Export file
        saved_file_path = ""
        if self.scraped_leads:
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            sanitized_keywords = re.sub(r'[^a-zA-Z0-9]', '_', keywords)[:25]
            sanitized_region = re.sub(r'[^a-zA-Z0-9]', '_', region)[:25]
            filename = f"RION_Leads_{sanitized_keywords}_{sanitized_region}_{timestamp_str}"
            
            df = pd.DataFrame(self.scraped_leads)
            # Rename columns nicely for professional lead generation deliverables
            display_columns = {
                "company_name": "Company Name",
                "category": "Industry / Category",
                "phone": "Phone Number",
                "email": "Email ID",
                "website": "Website URL",
                "address": "Address / Location",
                "rating": "Rating",
                "reviews": "Review Count",
                "google_maps_url": "Google Maps Link",
                "query_keywords": "Search Keywords",
                "query_region": "Search Region",
                "scraped_at": "Extraction Date"
            }
            df = df.rename(columns=display_columns)

            if output_format.lower() == "csv":
                saved_file_path = os.path.join(output_dir, f"{filename}.csv")
                df.to_csv(saved_file_path, index=False, encoding="utf-8-sig")
            else:
                saved_file_path = os.path.join(output_dir, f"{filename}.xlsx")
                with pd.ExcelWriter(saved_file_path, engine="openpyxl") as writer:
                    df.to_excel(writer, index=False, sheet_name="RION Leads")

            await self.emit("log", {
                "level": "success",
                "message": f"Successfully exported {len(self.scraped_leads)} leads to: {os.path.abspath(saved_file_path)}"
            })

        self.stats["status"] = "completed" if not self.should_stop else "stopped"
        self.stats["progress_percent"] = 100
        self.stats["current_action"] = f"Finished. Total leads: {len(self.scraped_leads)}"

        result = {
            "status": self.stats["status"],
            "total_leads": len(self.scraped_leads),
            "file_path": os.path.abspath(saved_file_path) if saved_file_path else "",
            "file_name": os.path.basename(saved_file_path) if saved_file_path else "",
            "leads": self.scraped_leads,
            "stats": self.stats
        }

        await self.emit("completed", result)
        return result

    def stop(self):
        """Signals the scraper to stop gracefully."""
        self.should_stop = True
        self.stats["status"] = "stopping"
        self.stats["current_action"] = "Stopping task..."

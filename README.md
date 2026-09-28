# ⚡ RION LEADS Generation Tool (v1.2 PRO)

An autonomous, AI-assisted B2B Lead Generation and Business Intelligence Extractor designed to discover companies on Google Maps based on keywords and target regions, extract direct phone numbers, enriched official corporate emails, websites, physical locations, and ratings, and automatically export results into structured **Microsoft Excel (.xlsx)** or **CSV (.csv)** files.

---

## 🌟 Key Features

- **Dynamic Query Inputs**:
  - **Company Keywords / Industry**: E.g., `electronics, product manufacturing`, `solar panel suppliers`, `medical equipment`, etc.
  - **Area / Region**: E.g., `Bangalore`, `Texas`, `London`, `Mumbai`, etc.
  - **Lead Target Counter**: Set exact required lead counts (10 to 500+).
  - **Output Format**: Choose between formatted **Excel (`.xlsx`)** or universal **CSV (`.csv`)**.
  - **Output Location Directory**: Custom export directory with 1-click folder browsing and opening in Windows Explorer.
- **Deep Data Extraction**:
  - **Company Name**
  - **Industry / Category** (e.g. *Electronics Manufacturer*, *Corporate Office*)
  - **Direct Phone Numbers** (Local and mobile landlines)
  - **Verified Email IDs** (Crawls company websites and contact pages with regex email verification)
  - **Official Website URL**
  - **Physical Address & Location**
  - **Google Rating & Review Count**
  - **Google Maps Direct Link**
- **Modern Cyberpunk Glassmorphic Dashboard**:
  - Real-time animated KPI counters (Total leads, emails found, phones found, websites).
  - Live progress bar & current scraping action tracker.
  - Interactive table with real-time text search and filter pills (*Has Email*, *Has Phone*, *Has Website*).
  - One-click copy for all extracted email addresses.
  - Live activity terminal showing engine logs in real-time.
  - Export Archive viewer with 1-click download and folder open.
  - Detail inspection modal for every lead card.

---

## 🚀 Quick Start (1-Click Launch)

### Method 1: Using the Windows Launcher (Recommended)
Simply double-click:
```bat
start_rion_leads.bat
```
This automatically starts the RION LEADS engine server on port `8000` and opens your default web browser to:
```
http://localhost:8000
```

### Method 2: Manual Terminal Execution
```powershell
# Navigate to project directory
cd "c:\Users\Administrator\Downloads\Naveen Folder\Projects\Others\Leads_generations"

# Run with Python
python app.py
```

---

## 📁 File Structure

```text
Leads_generations/
│
├── app.py                  # FastAPI server & REST/WebSocket real-time API
├── scraper_engine.py       # Playwright engine, Maps scraper & Website Email crawler
├── start_rion_leads.bat    # 1-Click Windows desktop launcher
├── requirements.txt        # Python dependency manifest
├── README.md               # User documentation & architecture guide
│
├── static/                 # Rich Modern Dashboard UI
│   ├── index.html          # Structure & components
│   ├── style.css           # Glassmorphism dark neon design system
│   └── app.js              # Real-time WebSocket logic, filters, and exports
│
└── exports/                # Generated Excel (.xlsx) and CSV (.csv) lead files
```

---

## 📊 Output File Columns

| Column Header | Description |
| :--- | :--- |
| **Company Name** | Verified business or organization title |
| **Industry / Category** | Primary service classification on Google Maps |
| **Phone Number** | Direct phone/mobile contact number |
| **Email ID** | Official corporate email(s) extracted from website |
| **Website URL** | Official corporate website link |
| **Address / Location** | Physical street address and zone |
| **Rating** | Google Maps customer star rating (e.g. 4.7) |
| **Review Count** | Total number of published reviews |
| **Google Maps Link** | Direct link to the listing on Google Maps |
| **Search Keywords** | User query keywords used during extraction |
| **Search Region** | User target region/city |
| **Extraction Date** | Timestamp of extraction |

---

## 🛠️ Technology Stack

- **Backend**: Python 3.11, FastAPI, Uvicorn, WebSockets
- **Browser Automation**: Playwright (Headless Chromium)
- **Email & Web Enrichment**: HTTPX (Async HTTP Client), BeautifulSoup4, Regular Expressions
- **Data Export**: Pandas, OpenPyXL
- **Frontend**: HTML5, Vanilla Modern CSS (Glassmorphism, CSS Grid/Flexbox), ES6+ JavaScript, FontAwesome

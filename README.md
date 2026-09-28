# ⚡ RION LEADS Generation Tool (v1.2 PRO)

[![Live Web Dashboard](https://img.shields.io/badge/Live%20Dashboard-GitHub%20Pages-06b6d4?style=for-the-badge&logo=github)](https://rdrionxt.github.io/Leads_generation_rion/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Playwright](https://img.shields.io/badge/Scraper-Playwright-2EAD33?style=for-the-badge&logo=playwright)](https://playwright.dev)
[![Docker](https://img.shields.io/badge/Container-Docker%20Ready-2496ED?style=for-the-badge&logo=docker)](https://docker.com)

An autonomous, AI-assisted B2B Lead Generation and Business Intelligence Extractor designed to discover companies on Google Maps based on keywords and target regions, extract direct phone numbers, enriched official corporate emails, websites, physical locations, and ratings, and automatically export results into structured **Microsoft Excel (.xlsx)** or **CSV (.csv)** files.

---

## 🌐 Live Web App Links

- **Live Hosted Web Dashboard**: [https://rdrionxt.github.io/Leads_generation_rion/](https://rdrionxt.github.io/Leads_generation_rion/)
- **GitHub Repository**: [https://github.com/rdrionxt/Leads_generation_rion](https://github.com/rdrionxt/Leads_generation_rion)

> **💡 How the Hosted Dashboard Works**:
> The web dashboard is hosted on GitHub Pages. You can use it in **Interactive Demo Mode** immediately or connect it to your local scraper engine (`http://localhost:8000`) or cloud backend with 1 click using the **Backend Connection** button in the header!

---

## 🌟 Key Features

- **Dynamic Query Inputs**:
  - **Company Keywords / Industry**: E.g., `electronics, product manufacturing`, `solar panel suppliers`, `medical equipment`, etc.
  - **Area / Region**: E.g., `Bangalore`, `Texas`, `London`, `Mumbai`, etc.
  - **Lead Target Counter**: Set exact required lead counts (10 to 500+).
  - **Output Format**: Formatted **Excel (`.xlsx`)** or universal **CSV (`.csv`)**.
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
  - Configurable Backend Engine Endpoint (Localhost or Cloud).

---

## 🚀 How to Run the App

### Method 1: 1-Click Launch on Windows (Recommended)
Simply double-click:
```bat
start_rion_leads.bat
```
This automatically starts the RION LEADS engine server on port `8000` and opens your default browser at:
```
http://localhost:8000
```

---

### Method 2: Run via Terminal

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rdrionxt/Leads_generation_rion.git
   cd Leads_generation_rion
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   playwright install chromium
   ```

3. **Start the server**:
   ```bash
   python app.py
   ```

4. **Open in browser**:
   Navigate to `http://localhost:8000` or open the hosted dashboard at [https://rdrionxt.github.io/Leads_generation_rion/](https://rdrionxt.github.io/Leads_generation_rion/).

---

### Method 3: Run with Docker

1. **Build and start container**:
   ```bash
   docker-compose up -d
   ```
2. Open `http://localhost:8000` in your browser.

---

### Method 4: Free Cloud Hosting (Render / Koyeb / Railway)

1. Fork or push this repository to your GitHub account.
2. Sign up at [Render.com](https://render.com) and create a **New Web Service**.
3. Select your repository `Leads_generation_rion`.
4. Choose **Docker** as runtime (it will automatically use the included `Dockerfile`).
5. Set `PORT` to `8000`.
6. Once deployed, copy your Render URL and paste it into the **Backend Connection** modal in your [GitHub Pages Dashboard](https://rdrionxt.github.io/Leads_generation_rion/)!

---

## 📁 File Structure

```text
Leads_generation_rion/
│
├── app.py                      # FastAPI server & REST/WebSocket real-time API
├── scraper_engine.py           # Playwright engine, Maps scraper & Email crawler
├── start_rion_leads.bat        # 1-Click Windows desktop launcher
├── requirements.txt            # Python dependency manifest
├── Dockerfile                  # Official Playwright Jammy container image
├── docker-compose.yml          # 1-Command container orchestrator
├── render.yaml                 # 1-Click Render cloud deployment blueprint
├── README.md                   # Documentation & quick start guide
│
├── .github/workflows/
│   └── deploy-pages.yml        # GitHub Actions workflow for automatic GitHub Pages deployment
│
├── static/                     # Modern Glassmorphic Dashboard UI
│   ├── index.html              # Structure & modal components
│   ├── style.css               # Glassmorphism dark neon design system
│   └── app.js                  # WebSocket logic, backend switcher & table filters
│
└── exports/                    # Generated Excel (.xlsx) and CSV (.csv) lead files
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
- **Data Parsing**: BeautifulSoup4, Regular Expressions, Pandas, OpenPyXL
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Glassmorphism), Vanilla JavaScript (ES6+)
- **Hosting & CI/CD**: GitHub Pages, GitHub Actions, Docker

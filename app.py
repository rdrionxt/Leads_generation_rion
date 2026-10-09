"""
RION LEADS GENERATION TOOL - SERVER & REST/WEBSOCKET API
FastAPI backend powering the RION LEADS Dashboard with real-time updates and export features.
"""

import os
import sys
import json
import asyncio
import subprocess
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from scraper_engine import LeadScraper

sys.stdout.reconfigure(encoding="utf-8")

app = FastAPI(title="RION LEADS Generation Tool API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State
active_scraper: Optional[LeadScraper] = None
scrape_task: Optional[asyncio.Task] = None
connected_websockets: List[WebSocket] = []
current_session_data: Dict[str, Any] = {
    "leads": [],
    "logs": [],
    "stats": {
        "total_found": 0,
        "emails_found": 0,
        "phones_found": 0,
        "websites_found": 0,
        "status": "idle",
        "progress_percent": 0,
        "current_action": "Ready"
    },
    "last_result": None
}

EXPORTS_DEFAULT_DIR = os.path.abspath("./exports")
os.makedirs(EXPORTS_DEFAULT_DIR, exist_ok=True)

# Restore auto-saved session data on startup if present
autosave_file = os.path.join(EXPORTS_DEFAULT_DIR, "autosave_leads.json")
if os.path.exists(autosave_file):
    try:
        with open(autosave_file, "r", encoding="utf-8") as f:
            saved_leads = json.load(f)
            if isinstance(saved_leads, list) and saved_leads:
                current_session_data["leads"] = saved_leads
                current_session_data["stats"]["total_found"] = len(saved_leads)
                current_session_data["stats"]["emails_found"] = len([l for l in saved_leads if l.get("email")])
                current_session_data["stats"]["phones_found"] = len([l for l in saved_leads if l.get("phone")])
                current_session_data["stats"]["websites_found"] = len([l for l in saved_leads if l.get("website")])
                current_session_data["stats"]["status"] = "idle"
                current_session_data["stats"]["progress_percent"] = 100
                current_session_data["stats"]["current_action"] = f"Restored {len(saved_leads)} leads from previous autosave"
                print(f"[*] Restored {len(saved_leads)} leads from autosave_leads.json")
    except Exception as e:
        print(f"[Autosave Restore Error] {e}")


class ScrapeRequest(BaseModel):
    keywords: str
    region: str
    target_count: int = 20
    output_format: str = "xlsx"  # "xlsx" or "csv"
    output_dir: Optional[str] = None


async def broadcast_ws(message: Dict[str, Any]):
    """Broadcasts a JSON message to all connected WebSocket clients."""
    dead_connections = []
    for ws in connected_websockets:
        try:
            await ws.send_json(message)
        except Exception:
            dead_connections.append(ws)
    for dc in dead_connections:
        if dc in connected_websockets:
            connected_websockets.remove(dc)


async def scraper_event_handler(event: Dict[str, Any]):
    """Receives events from the LeadScraper and dispatches them to UI."""
    event_type = event.get("type")
    data = event.get("data", {})
    stats = event.get("stats", {})

    if stats:
        current_session_data["stats"] = stats

    if event_type == "log":
        log_entry = {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "level": data.get("level", "info"),
            "message": data.get("message", "")
        }
        current_session_data["logs"].append(log_entry)
        # Keep last 250 logs
        if len(current_session_data["logs"]) > 250:
            current_session_data["logs"] = current_session_data["logs"][-250:]

    elif event_type == "lead_found":
        lead = data.get("lead")
        if lead:
            current_session_data["leads"].append(lead)

    elif event_type == "completed":
        current_session_data["last_result"] = data

    await broadcast_ws(event)


@app.post("/api/start")
async def start_scraping(req: ScrapeRequest):
    global active_scraper, scrape_task, current_session_data

    if active_scraper and active_scraper.is_running:
        raise HTTPException(status_code=400, detail="A scraping session is already running.")

    if not req.keywords.strip() or not req.region.strip():
        raise HTTPException(status_code=400, detail="Keywords and Region are required.")

    target_count = max(1, min(req.target_count, 1000))
    output_dir = req.output_dir.strip() if req.output_dir and req.output_dir.strip() else EXPORTS_DEFAULT_DIR
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    # Reset current session state
    current_session_data["leads"] = []
    current_session_data["logs"] = []
    current_session_data["stats"] = {
        "total_found": 0,
        "emails_found": 0,
        "phones_found": 0,
        "websites_found": 0,
        "status": "starting",
        "progress_percent": 0,
        "current_action": f"Searching for '{req.keywords}' in '{req.region}'..."
    }
    current_session_data["last_result"] = None

    active_scraper = LeadScraper(callback=scraper_event_handler)

    # Launch in background
    scrape_task = asyncio.create_task(
        active_scraper.run(
            keywords=req.keywords.strip(),
            region=req.region.strip(),
            target_count=target_count,
            output_format=req.output_format.lower(),
            output_dir=output_dir
        )
    )

    return {
        "status": "started",
        "keywords": req.keywords,
        "region": req.region,
        "target_count": target_count,
        "output_dir": output_dir,
        "output_format": req.output_format
    }


@app.post("/api/stop")
async def stop_scraping():
    global active_scraper
    if active_scraper and active_scraper.is_running:
        active_scraper.stop()
        return {"status": "stopping", "message": "Signal sent to stop scraping."}
    return {"status": "idle", "message": "No active scraping process."}


@app.get("/api/status")
async def get_status():
    is_running = active_scraper.is_running if active_scraper else False
    return {
        "is_running": is_running,
        "stats": current_session_data["stats"],
        "lead_count": len(current_session_data["leads"]),
        "last_result": current_session_data["last_result"]
    }


@app.get("/api/leads")
async def get_leads():
    return {
        "total": len(current_session_data["leads"]),
        "leads": current_session_data["leads"]
    }


@app.get("/api/logs")
async def get_logs():
    return {
        "logs": current_session_data["logs"]
    }


@app.get("/api/exports")
async def list_exports(dir_path: Optional[str] = None):
    """Lists files saved in the output directory."""
    target_dir = os.path.abspath(dir_path) if dir_path else EXPORTS_DEFAULT_DIR
    if not os.path.exists(target_dir):
        return {"exports": [], "directory": target_dir}

    results = []
    try:
        for f in os.listdir(target_dir):
            if f.endswith(".xlsx") or f.endswith(".csv"):
                full_p = os.path.join(target_dir, f)
                stat = os.stat(full_p)
                results.append({
                    "filename": f,
                    "filepath": full_p,
                    "format": "Excel" if f.endswith(".xlsx") else "CSV",
                    "size_bytes": stat.st_size,
                    "size_display": f"{stat.st_size / 1024:.1f} KB",
                    "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                })
        results.sort(key=lambda x: x["modified"], reverse=True)
    except Exception as e:
        print(f"[List Exports Error] {e}")

    return {"exports": results, "directory": target_dir}


@app.get("/api/download")
async def download_file(filepath: str = Query(...)):
    """Downloads an exported file."""
    norm_path = os.path.abspath(filepath)
    if not os.path.exists(norm_path):
        raise HTTPException(status_code=404, detail="File not found.")
    filename = os.path.basename(norm_path)
    return FileResponse(norm_path, filename=filename)


@app.post("/api/open-folder")
async def open_folder(data: Dict[str, str]):
    """Opens the directory in Windows Explorer."""
    folder = data.get("directory", EXPORTS_DEFAULT_DIR)
    folder = os.path.abspath(folder)
    os.makedirs(folder, exist_ok=True)
    try:
        os.startfile(folder)
        return {"status": "success", "message": f"Opened folder: {folder}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.append(websocket)
    # Send initial snapshot immediately upon connection
    await websocket.send_json({
        "type": "initial_state",
        "stats": current_session_data["stats"],
        "leads": current_session_data["leads"],
        "logs": current_session_data["logs"][-50:],
        "last_result": current_session_data["last_result"],
        "default_dir": EXPORTS_DEFAULT_DIR
    })

    try:
        while True:
            # Keep connection alive & handle incoming commands if any
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in connected_websockets:
            connected_websockets.remove(websocket)


# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
async def root():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "RION LEADS generation tool API active. Dashboard loading..."}


@app.get("/style.css")
async def get_root_style():
    style_file = os.path.join(static_dir, "style.css")
    if os.path.exists(style_file):
        return FileResponse(style_file, media_type="text/css")
    raise HTTPException(status_code=404, detail="style.css not found")


@app.get("/app.js")
async def get_root_script():
    js_file = os.path.join(static_dir, "app.js")
    if os.path.exists(js_file):
        return FileResponse(js_file, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="app.js not found")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print("\n" + "=" * 65)
    print("  🚀 RION LEADS GENERATION TOOL SERVER")
    print(f"  Dashboard URL: http://localhost:{port}")
    print(f"  Default Exports: {EXPORTS_DEFAULT_DIR}")
    print("=" * 65 + "\n")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)

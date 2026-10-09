/**
 * RION LEADS GENERATION TOOL - FRONTEND LOGIC & WEBSOCKET CLIENT
 * Real-time lead ingestion, animated counters, live logs, data export.
 */

// Global State
const state = {
  leads: [],
  logs: [],
  filteredLeads: [],
  activeFilter: 'all',
  searchQuery: '',
  isRunning: false,
  targetCount: 25,
  defaultDir: '',
  ws: null,
  reconnectAttempts: 0
};

// DOM Elements
const elements = {
  // Navigation
  navButtons: document.querySelectorAll('.nav-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  logCounterBadge: document.getElementById('logCounterBadge'),
  
  // Status Indicator
  statusPill: document.getElementById('engineStatusPill'),
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  
  // Form Inputs
  form: document.getElementById('leadScraperForm'),
  inputKeywords: document.getElementById('inputKeywords'),
  inputRegion: document.getElementById('inputRegion'),
  inputLeadSlider: document.getElementById('inputLeadSlider'),
  leadCountDisplay: document.getElementById('leadCountDisplay'),
  presetButtons: document.querySelectorAll('.preset-btn'),
  chips: document.querySelectorAll('.chip'),
  regionChips: document.querySelectorAll('.region-chip'),
  formatOptions: document.querySelectorAll('.format-option'),
  inputOutputDir: document.getElementById('inputOutputDir'),
  resetDirBtn: document.getElementById('resetDirBtn'),
  openConfigDirBtn: document.getElementById('openConfigDirBtn'),
  openDefaultDirBtn: document.getElementById('openDefaultDirBtn'),
  resetFormBtn: document.getElementById('resetFormBtn'),
  startScrapeBtn: document.getElementById('startScrapeBtn'),
  stopScrapeBtn: document.getElementById('stopScrapeBtn'),

  // Metrics
  statTotalFound: document.getElementById('statTotalFound'),
  statTargetRatio: document.getElementById('statTargetRatio'),
  statEmailsFound: document.getElementById('statEmailsFound'),
  statEmailRate: document.getElementById('statEmailRate'),
  statPhonesFound: document.getElementById('statPhonesFound'),
  statPhoneRate: document.getElementById('statPhoneRate'),
  statWebsitesFound: document.getElementById('statWebsitesFound'),
  metricBarTotal: document.getElementById('metricBarTotal'),
  metricBarEmails: document.getElementById('metricBarEmails'),
  metricBarPhones: document.getElementById('metricBarPhones'),
  metricBarWebsites: document.getElementById('metricBarWebsites'),

  // Progress Banner
  progressBanner: document.getElementById('progressBanner'),
  progressTitle: document.getElementById('progressTitle'),
  progressSubtitle: document.getElementById('progressCurrentAction'),
  progressPercentageText: document.getElementById('progressPercentageText'),
  mainProgressBar: document.getElementById('mainProgressBar'),

  // Leads Table & Toolbar
  tableSearchInput: document.getElementById('tableSearchInput'),
  pillButtons: document.querySelectorAll('.pill-btn'),
  countAllFilter: document.getElementById('countAllFilter'),
  btnCopyEmails: document.getElementById('btnCopyEmails'),
  btnExportMenu: document.getElementById('btnExportMenu'),
  exportDropdownMenu: document.getElementById('exportDropdownMenu'),
  exportExcelBtn: document.getElementById('exportExcelBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  leadsTable: document.getElementById('leadsTable'),
  leadsTableBody: document.getElementById('leadsTableBody'),
  emptyStateContainer: document.getElementById('emptyStateContainer'),
  tableShowingCount: document.getElementById('tableShowingCount'),

  // Terminal
  terminalLogsContainer: document.getElementById('terminalLogsContainer'),
  autoscrollCheck: document.getElementById('autoscrollCheck'),
  clearTerminalBtn: document.getElementById('clearTerminalBtn'),

  // Archive
  archiveTableBody: document.getElementById('archiveTableBody'),
  emptyArchiveMessage: document.getElementById('emptyArchiveMessage'),
  refreshArchiveBtn: document.getElementById('refreshArchiveBtn'),
  openArchiveFolderBtn: document.getElementById('openArchiveFolderBtn'),

  // Toast & Modal
  toastContainer: document.getElementById('toastContainer'),
  leadModalOverlay: document.getElementById('leadModalOverlay'),
  modalCompanyName: document.getElementById('modalCompanyName'),
  modalBodyContent: document.getElementById('modalBodyContent'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),

  // Backend Engine Config Modal
  btnServerConfig: document.getElementById('btnServerConfig'),
  serverUrlLabel: document.getElementById('serverUrlLabel'),
  serverModalOverlay: document.getElementById('serverModalOverlay'),
  serverModalCloseBtn: document.getElementById('serverModalCloseBtn'),
  serverModalCancelBtn: document.getElementById('serverModalCancelBtn'),
  inputBackendUrl: document.getElementById('inputBackendUrl'),
  btnPresetLocal: document.getElementById('btnPresetLocal'),
  btnPresetCurrent: document.getElementById('btnPresetCurrent'),
  btnSaveBackendUrl: document.getElementById('btnSaveBackendUrl')
};

/* ==========================================================================
   BACKEND ENGINE CONFIGURATION & DEMO STATE
   ========================================================================== */
let API_BASE = (function() {
  const saved = localStorage.getItem('rion_backend_url');
  if (saved !== null) return saved.trim().replace(/\/$/, '');
  // Default to active Render cloud backend if hosted on GitHub Pages
  if (window.location.hostname.includes('github.io')) {
    return 'https://rion-leads.onrender.com';
  }
  if (window.location.protocol === 'file:') {
    return 'http://localhost:8000';
  }
  return '';
})();

function getApiUrl(path) {
  if (!API_BASE) return path;
  return `${API_BASE}${path}`;
}

const DEMO_LEADS = [
  {
    company_name: "Emsys Electronics Pvt Ltd",
    category: "Electronics Manufacturer",
    phone: "080 4953 7848",
    email: "info@cresonix.com",
    website: "http://www.cresonix.com/",
    address: "#39/52, 8th Cross, Govardhan Gardens, Dr H Anjaneyappa Industrial Estate, Off Kanakapura Main Rd",
    rating: 4.7,
    reviews: 42,
    google_maps_url: "https://www.google.com/maps/search/Emsys+Electronics+Pvt+Ltd+Bangalore"
  },
  {
    company_name: "Sparr Electronics Limited",
    category: "Electronics Manufacturer",
    phone: "099004 77055",
    email: "info@sparrl.com, sales@sparrl.com",
    website: "https://www.sparrl.com/",
    address: "414A, 7th Main Rd, Bangalore",
    rating: 4.1,
    reviews: 89,
    google_maps_url: "https://www.google.com/maps/search/Sparr+Electronics+Limited+Bangalore"
  },
  {
    company_name: "Electronics & Controls Power Systems Private Limited",
    category: "Electronics Manufacturer",
    phone: "080 2837 1974",
    email: "sales@eandcpower.com",
    website: "http://www.eandcpower.com/",
    address: "29-A, Peenya Industrial Area, Bangalore",
    rating: 4.9,
    reviews: 312,
    google_maps_url: "https://www.google.com/maps/search/Electronics+Controls+Power+Systems+Bangalore"
  },
  {
    company_name: "Raytech Electronics",
    category: "Electronics Manufacturer",
    phone: "098454 62488",
    email: "info@raytech-electronics.com",
    website: "http://www.raytech-electronics.com/",
    address: "1st Floor, S Lane, 3rd Cross Road, Bangalore",
    rating: 4.3,
    reviews: 13,
    google_maps_url: "https://www.google.com/maps/search/Raytech+Electronics+Bangalore"
  },
  {
    company_name: "PODRAIN ELECTRONICS PVT LTD",
    category: "Manufacturer",
    phone: "074110 01030",
    email: "contact@podrain.com",
    website: "https://podrain.com/",
    address: "35, 1st Main Rd, Bangalore",
    rating: 4.1,
    reviews: 115,
    google_maps_url: "https://www.google.com/maps/search/PODRAIN+ELECTRONICS+PVT+LTD+Bangalore"
  },
  {
    company_name: "MEDASUS HEALTHCARE PVT LTD",
    category: "Medical equipment supplier",
    phone: "080 2341 5566",
    email: "info@medasus.com",
    website: "https://medasus.com",
    address: "No.694, 4th floor, GMR Plaza, 7th main, CBI Main Rd, Bangalore",
    rating: 5.0,
    reviews: 28,
    google_maps_url: "https://www.google.com/maps/search/MEDASUS+HEALTHCARE+PVT+LTD+Bangalore"
  }
];

function updateServerBadgeUI(connected = false) {
  if (!elements.serverUrlLabel) return;
  if (!API_BASE) {
    elements.serverUrlLabel.textContent = 'Backend: Same Host';
    if (elements.btnServerConfig) elements.btnServerConfig.classList.add('connected');
  } else {
    try {
      const u = new URL(API_BASE);
      elements.serverUrlLabel.textContent = `Backend: ${u.host}`;
    } catch (e) {
      elements.serverUrlLabel.textContent = `Backend: ${API_BASE}`;
    }
    if (elements.btnServerConfig) {
      elements.btnServerConfig.classList.toggle('connected', connected);
    }
  }
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  updateServerBadgeUI(false);
  initEventListeners();
  initServerConfigEvents();
  initWebSocket();
  fetchArchiveFiles();

  // If on GitHub Pages or demo, load sample preview leads if backend not connected yet
  setTimeout(() => {
    if (state.leads.length === 0) {
      state.leads = [...DEMO_LEADS];
      renderLeads();
      updateStatsUI({
        total_found: DEMO_LEADS.length,
        emails_found: DEMO_LEADS.filter(l => l.email).length,
        phones_found: DEMO_LEADS.filter(l => l.phone).length,
        websites_found: DEMO_LEADS.filter(l => l.website).length,
        status: 'idle',
        progress_percent: 100,
        current_action: 'Demo Preview Loaded'
      });
    }
  }, 1200);
});

function initServerConfigEvents() {
  if (!elements.btnServerConfig) return;

  elements.btnServerConfig.addEventListener('click', () => {
    elements.inputBackendUrl.value = API_BASE || window.location.origin;
    elements.serverModalOverlay.classList.add('show');
  });

  const closeServerModal = () => elements.serverModalOverlay.classList.remove('show');
  if (elements.serverModalCloseBtn) elements.serverModalCloseBtn.addEventListener('click', closeServerModal);
  if (elements.serverModalCancelBtn) elements.serverModalCancelBtn.addEventListener('click', closeServerModal);
  if (elements.serverModalOverlay) {
    elements.serverModalOverlay.addEventListener('click', (e) => {
      if (e.target === elements.serverModalOverlay) closeServerModal();
    });
  }

  if (elements.btnPresetLocal) {
    elements.btnPresetLocal.addEventListener('click', () => {
      elements.inputBackendUrl.value = 'http://localhost:8000';
    });
  }

  if (elements.btnPresetCurrent) {
    elements.btnPresetCurrent.addEventListener('click', () => {
      elements.inputBackendUrl.value = window.location.origin;
    });
  }

  if (elements.btnSaveBackendUrl) {
    elements.btnSaveBackendUrl.addEventListener('click', () => {
      const val = elements.inputBackendUrl.value.trim().replace(/\/$/, '');
      if (val === window.location.origin) {
        API_BASE = '';
        localStorage.removeItem('rion_backend_url');
      } else {
        API_BASE = val;
        localStorage.setItem('rion_backend_url', val);
      }
      updateServerBadgeUI(false);
      closeServerModal();
      showToast(`Updated backend to: ${API_BASE || 'Same Host'}. Reconnecting...`, 'info');
      initWebSocket();
      fetchArchiveFiles();
    });
  }
}

/* ==========================================================================
   WEBSOCKET REAL-TIME SYNC
   ========================================================================== */
function initWebSocket() {
  let wsUrl;
  if (API_BASE) {
    const isHttps = API_BASE.startsWith('https:');
    const cleanHost = API_BASE.replace(/^https?:\/\//, '');
    wsUrl = `${isHttps ? 'wss:' : 'ws:'}//${cleanHost}/ws`;
  } else {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl = `${protocol}//${window.location.host}/ws`;
  }

  try {
    if (state.ws) {
      try { state.ws.close(); } catch (e) {}
    }

    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      console.log('[RION WS] Connected to backend:', wsUrl);
      state.reconnectAttempts = 0;
      updateServerBadgeUI(true);
    };

    state.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWsMessage(msg);
      } catch (e) {
        console.error('[RION WS] Parse error:', e);
      }
    };

    state.ws.onclose = () => {
      updateServerBadgeUI(false);
      setTimeout(() => {
        if (state.reconnectAttempts < 30) {
          state.reconnectAttempts++;
          initWebSocket();
        }
      }, 3000);
    };

    state.ws.onerror = (err) => {
      updateServerBadgeUI(false);
    };
  } catch (err) {
    updateServerBadgeUI(false);
  }

  // Resilient Polling Fallback (Polls every 2.5 seconds to ensure sync)
  if (!window._rionPollingStarted) {
    window._rionPollingStarted = true;
    setInterval(async () => {
      try {
        const res = await fetch(getApiUrl('/api/status'));
        if (res.ok) {
          updateServerBadgeUI(true);
          const data = await res.json();
          if (data.is_running !== state.isRunning) {
            setRunningState(data.is_running);
          }
          if (data.stats) {
            updateStatsUI(data.stats);
          }
          // If lead count changed, fetch leads
          if (data.lead_count !== state.leads.length) {
            const lRes = await fetch(getApiUrl('/api/leads'));
            if (lRes.ok) {
              const lData = await lRes.json();
              if (lData.leads) {
                state.leads = lData.leads;
                renderLeads();
              }
            }
          }
        }
      } catch (e) {
        // Offline or backend not active yet
      }
    }, 2500);
  }
}

function handleWsMessage(msg) {
  const type = msg.type;
  const data = msg.data || {};
  const stats = msg.stats || {};

  if (type === 'initial_state') {
    if (msg.default_dir && !elements.inputOutputDir.value) {
      elements.inputOutputDir.value = msg.default_dir;
      state.defaultDir = msg.default_dir;
    }
    if (msg.leads && msg.leads.length > 0) {
      state.leads = msg.leads;
      renderLeads();
    }
    if (msg.logs && msg.logs.length > 0) {
      msg.logs.forEach(log => appendLogLine(log.timestamp, log.level, log.message));
    }
    if (msg.stats) {
      updateStatsUI(msg.stats);
    }
  } 
  else if (type === 'lead_found') {
    if (data.lead) {
      state.leads.push(data.lead);
      renderLeads();
      animateStatTick(elements.statTotalFound, state.leads.length);
    }
    if (stats) updateStatsUI(stats);
  }
  else if (type === 'log') {
    appendLogLine(new Date().toLocaleTimeString(), data.level || 'info', data.message || '');
  }
  else if (type === 'status') {
    if (data.status === 'starting') {
      setRunningState(true);
    }
    if (stats) updateStatsUI(stats);
  }
  else if (type === 'completed') {
    setRunningState(false);
    if (stats) updateStatsUI(stats);
    showToast(`🎉 Extraction completed! Found ${data.total_leads} leads. Saved to: ${data.file_name}`, 'success');
    fetchArchiveFiles();
  }
}

/* ==========================================================================
   EVENT LISTENERS SETUP
   ========================================================================== */
function initEventListeners() {
  // Navigation Tabs
  elements.navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.navButtons.forEach(b => b.classList.remove('active'));
      elements.tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(tabId);
      if (targetPane) targetPane.classList.add('active');

      if (tabId === 'tab-history') {
        fetchArchiveFiles();
      }
    });
  });

  // Keywords Quick Chips
  elements.chips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.inputKeywords.value = chip.getAttribute('data-kw');
      elements.inputKeywords.focus();
    });
  });

  // Region Quick Chips
  elements.regionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.inputRegion.value = chip.getAttribute('data-reg');
      elements.inputRegion.focus();
    });
  });

  // Slider & Presets
  elements.inputLeadSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    state.targetCount = parseInt(val, 10);
    elements.leadCountDisplay.textContent = `${val} leads`;
    elements.statTargetRatio.textContent = `/ ${val} goal`;

    elements.presetButtons.forEach(b => {
      b.classList.toggle('active', parseInt(b.getAttribute('data-count'), 10) === state.targetCount);
    });
  });

  elements.presetButtons.forEach(b => {
    b.addEventListener('click', () => {
      const count = parseInt(b.getAttribute('data-count'), 10);
      elements.inputLeadSlider.value = count;
      elements.inputLeadSlider.dispatchEvent(new Event('input'));
    });
  });

  // Format Radio Pills
  elements.formatOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      elements.formatOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      opt.querySelector('input').checked = true;
    });
  });

  // Directory Reset & Open
  elements.resetDirBtn.addEventListener('click', () => {
    if (state.defaultDir) {
      elements.inputOutputDir.value = state.defaultDir;
      showToast('Reset to default output directory.', 'info');
    }
  });

  const openFolderHandler = async () => {
    const dir = elements.inputOutputDir.value || state.defaultDir;
    try {
      const res = await fetch(getApiUrl('/api/open-folder'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: dir })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showToast('Opened export folder in Windows Explorer.', 'success');
      } else {
        showToast('Could not open folder: ' + data.message, 'error');
      }
    } catch (e) {
      showToast('Error opening directory.', 'error');
    }
  };

  elements.openConfigDirBtn.addEventListener('click', openFolderHandler);
  elements.openDefaultDirBtn.addEventListener('click', openFolderHandler);
  elements.openArchiveFolderBtn.addEventListener('click', openFolderHandler);

  // Form Reset
  elements.resetFormBtn.addEventListener('click', () => {
    elements.inputKeywords.value = 'electronics, product manufacturing';
    elements.inputRegion.value = 'Bangalore';
    elements.inputLeadSlider.value = 25;
    elements.inputLeadSlider.dispatchEvent(new Event('input'));
    showToast('Parameters reset to default.', 'info');
  });

  // Start & Stop Engine
  elements.startScrapeBtn.addEventListener('click', handleStartScraper);
  elements.stopScrapeBtn.addEventListener('click', handleStopScraper);

  // Table Search & Filters
  elements.tableSearchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    applyTableFilters();
  });

  elements.pillButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.pillButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.getAttribute('data-filter');
      applyTableFilters();
    });
  });

  // Copy Emails
  elements.btnCopyEmails.addEventListener('click', () => {
    const emails = state.leads
      .map(l => l.email)
      .filter(e => e && e.trim() !== '')
      .flatMap(e => e.split(',').map(item => item.trim()));

    const uniqueEmails = [...new Set(emails)];
    if (uniqueEmails.length === 0) {
      showToast('No emails available to copy yet.', 'warning');
      return;
    }
    navigator.clipboard.writeText(uniqueEmails.join(', ')).then(() => {
      showToast(`Copied ${uniqueEmails.length} verified emails to clipboard!`, 'success');
    });
  });

  // Export Menu Toggle
  elements.btnExportMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.exportDropdownMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    elements.exportDropdownMenu.classList.remove('show');
  });

  elements.exportExcelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    triggerBrowserExport('xlsx');
  });

  elements.exportCsvBtn.addEventListener('click', (e) => {
    e.preventDefault();
    triggerBrowserExport('csv');
  });

  // Terminal Controls
  elements.clearTerminalBtn.addEventListener('click', () => {
    elements.terminalLogsContainer.innerHTML = '';
    elements.logCounterBadge.textContent = '0';
    showToast('Terminal logs cleared.', 'info');
  });

  // Archive Refresh
  elements.refreshArchiveBtn.addEventListener('click', fetchArchiveFiles);

  // Modal Close
  elements.modalCloseBtn.addEventListener('click', () => {
    elements.leadModalOverlay.classList.remove('show');
  });
  elements.leadModalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.leadModalOverlay) {
      elements.leadModalOverlay.classList.remove('show');
    }
  });
}

/* ==========================================================================
   START & STOP ACTIONS
   ========================================================================== */
async function handleStartScraper() {
  const keywords = elements.inputKeywords.value.trim();
  const region = elements.inputRegion.value.trim();
  const targetCount = parseInt(elements.inputLeadSlider.value, 10);
  const selectedFormatEl = document.querySelector('input[name="outputFormat"]:checked');
  const outputFormat = selectedFormatEl ? selectedFormatEl.value : 'xlsx';
  const outputDir = elements.inputOutputDir.value.trim() || state.defaultDir;

  if (!keywords) {
    showToast('Please specify target keywords or industry.', 'error');
    elements.inputKeywords.focus();
    return;
  }
  if (!region) {
    showToast('Please specify target area or region.', 'error');
    elements.inputRegion.focus();
    return;
  }

  // Clear current leads for new run
  state.leads = [];
  renderLeads();

  setRunningState(true);

  try {
    const res = await fetch(getApiUrl('/api/start'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords,
        region,
        target_count: targetCount,
        output_format: outputFormat,
        output_dir: outputDir
      })
    });

    if (!res.ok) {
      if (res.status === 405 || res.status === 404) {
        showToast('⚠️ Static GitHub Pages cannot run scraping directly (HTTP 405). Please connect your Cloud backend URL (Render/Cloudflare) or open the cloud deployment.', 'error');
        if (elements.serverModalOverlay) {
          setTimeout(() => elements.serverModalOverlay.classList.add('show'), 600);
        }
        setRunningState(false);
        return;
      }
      let errDetail = 'Failed to start engine.';
      try {
        const data = await res.json();
        errDetail = data.detail || errDetail;
      } catch (e) {}
      showToast(errDetail, 'error');
      setRunningState(false);
      return;
    }

    const data = await res.json();
    showToast(`🚀 RION Engine launched! Searching for '${keywords}' in '${region}'...`, 'success');
  } catch (err) {
    console.error('[RION Error]', err);
    if (window.location.protocol === 'https:' && (!API_BASE || API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1'))) {
      showToast('⚠️ Browser blocked connection to localhost from HTTPS. To run scraping, open the app directly at http://localhost:8000 or deploy the backend to Render.', 'error');
      if (elements.serverModalOverlay) {
        setTimeout(() => elements.serverModalOverlay.classList.add('show'), 800);
      }
    } else {
      showToast('⚠️ Backend engine is not running. Please start "start_rion_leads.bat" or run "python app.py" on port 8000.', 'error');
    }
    setRunningState(false);
  }
}

async function handleStopScraper() {
  try {
    elements.stopScrapeBtn.disabled = true;
    elements.stopScrapeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Stopping...';
    const res = await fetch(getApiUrl('/api/stop'), { method: 'POST' });
    const data = await res.json();
    showToast(data.message || 'Stop request sent.', 'info');
  } catch (e) {
    showToast('Error requesting stop.', 'error');
  }
}

function setRunningState(running) {
  state.isRunning = running;
  elements.startScrapeBtn.disabled = running;
  elements.stopScrapeBtn.disabled = !running;

  if (running) {
    elements.startScrapeBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Engine Active...';
    elements.stopScrapeBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Engine';
    elements.statusPill.classList.add('running');
    elements.statusText.textContent = 'Scraping in Progress';
    elements.progressBanner.classList.add('running');
  } else {
    elements.startScrapeBtn.innerHTML = '<i class="fa-solid fa-play"></i> Launch RION Engine';
    elements.stopScrapeBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Engine';
    elements.statusPill.classList.remove('running');
    elements.statusText.textContent = 'System Ready';
    elements.progressBanner.classList.remove('running');
  }
}

/* ==========================================================================
   UI STATS & PROGRESS UPDATE
   ========================================================================== */
function updateStatsUI(stats) {
  if (!stats) return;

  const total = stats.total_found || 0;
  const emails = stats.emails_found || 0;
  const phones = stats.phones_found || 0;
  const websites = stats.websites_found || 0;
  const progressPercent = stats.progress_percent || 0;
  const currentAction = stats.current_action || 'Standby';

  elements.statTotalFound.textContent = total;
  elements.statEmailsFound.textContent = emails;
  elements.statPhonesFound.textContent = phones;
  elements.statWebsitesFound.textContent = websites;

  // Rates
  const emailRate = total > 0 ? Math.round((emails / total) * 100) : 0;
  const phoneRate = total > 0 ? Math.round((phones / total) * 100) : 0;
  elements.statEmailRate.textContent = `${emailRate}% rate`;
  elements.statPhoneRate.textContent = `${phoneRate}% rate`;

  // Bars
  elements.metricBarTotal.style.width = `${Math.min(100, progressPercent)}%`;
  elements.metricBarEmails.style.width = `${emailRate}%`;
  elements.metricBarPhones.style.width = `${phoneRate}%`;
  elements.metricBarWebsites.style.width = `${total > 0 ? Math.round((websites / total) * 100) : 0}%`;

  // Progress Banner
  elements.progressPercentageText.textContent = `${progressPercent}%`;
  elements.mainProgressBar.style.width = `${progressPercent}%`;
  elements.progressSubtitle.textContent = currentAction;

  if (stats.status === 'running' || stats.status === 'starting') {
    elements.progressTitle.textContent = `Scraping: ${total} of ${state.targetCount} Leads Extracted`;
  } else if (stats.status === 'completed') {
    elements.progressTitle.textContent = `Complete: Extracted ${total} Leads`;
  }
}

/* ==========================================================================
   TABLE RENDERING & FILTERING
   ========================================================================== */
function applyTableFilters() {
  let list = [...state.leads];

  // 1. Text Search Filter
  if (state.searchQuery) {
    const q = state.searchQuery;
    list = list.filter(l => 
      (l.company_name && l.company_name.toLowerCase().includes(q)) ||
      (l.category && l.category.toLowerCase().includes(q)) ||
      (l.address && l.address.toLowerCase().includes(q)) ||
      (l.phone && l.phone.toLowerCase().includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.website && l.website.toLowerCase().includes(q))
    );
  }

  // 2. Pill Filter
  if (state.activeFilter === 'email') {
    list = list.filter(l => l.email && l.email.trim() !== '');
  } else if (state.activeFilter === 'phone') {
    list = list.filter(l => l.phone && l.phone.trim() !== '');
  } else if (state.activeFilter === 'website') {
    list = list.filter(l => l.website && l.website.trim() !== '');
  }

  state.filteredLeads = list;
  renderTableRows(list);
}

function renderLeads() {
  elements.countAllFilter.textContent = state.leads.length;
  applyTableFilters();
}

function renderTableRows(leads) {
  elements.leadsTableBody.innerHTML = '';

  if (leads.length === 0) {
    elements.emptyStateContainer.style.display = 'flex';
    elements.tableShowingCount.textContent = `Showing 0 of ${state.leads.length} leads`;
    return;
  }

  elements.emptyStateContainer.style.display = 'none';
  elements.tableShowingCount.textContent = `Showing ${leads.length} of ${state.leads.length} leads`;

  const frag = document.createDocumentFragment();

  leads.forEach((lead, idx) => {
    const tr = document.createElement('tr');

    // Phone & Email layout
    let contactHtml = '';
    if (lead.phone) {
      contactHtml += `
        <div class="contact-row">
          <i class="fa-solid fa-phone contact-icon icon-phone"></i>
          <span class="contact-val">${escapeHtml(lead.phone)}</span>
          <button class="copy-mini-btn" title="Copy Phone" onclick="copyToClipboard('${escapeHtml(lead.phone)}')">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
      `;
    }
    if (lead.email) {
      contactHtml += `
        <div class="contact-row">
          <i class="fa-solid fa-envelope contact-icon icon-mail"></i>
          <a href="mailto:${escapeHtml(lead.email)}" class="contact-val email-val" title="${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>
          <button class="copy-mini-btn" title="Copy Email" onclick="copyToClipboard('${escapeHtml(lead.email)}')">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
      `;
    }
    if (!contactHtml) {
      contactHtml = '<span style="color:var(--text-dim);font-size:0.75rem;">Not listed</span>';
    }

    // Website Link
    let webHtml = '<span style="color:var(--text-dim);font-size:0.75rem;">—</span>';
    if (lead.website) {
      const cleanUrl = lead.website.replace(/^https?:\/\//i, '').replace(/\/$/, '');
      webHtml = `<a href="${lead.website}" target="_blank" rel="noopener noreferrer" class="website-link" title="${lead.website}">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> ${escapeHtml(cleanUrl)}
      </a>`;
    }

    // Rating
    let ratingHtml = '<span style="color:var(--text-dim);font-size:0.75rem;">N/A</span>';
    if (lead.rating && lead.rating !== 'N/A') {
      ratingHtml = `
        <div class="rating-pill">
          <i class="fa-solid fa-star star-icon"></i>
          <span>${lead.rating}</span>
          <span class="reviews-cnt">(${lead.reviews || 0})</span>
        </div>
      `;
    }

    // Maps link
    let mapsHtml = '<span style="color:var(--text-dim);font-size:0.75rem;">—</span>';
    if (lead.google_maps_url) {
      mapsHtml = `
        <a href="${lead.google_maps_url}" target="_blank" rel="noopener noreferrer" class="maps-icon-link" title="Open in Google Maps">
          <i class="fa-solid fa-location-arrow"></i>
        </a>
      `;
    }

    tr.innerHTML = `
      <td class="lead-idx">${idx + 1}</td>
      <td class="lead-name-cell">
        <div style="cursor:pointer;" onclick="openLeadModal(${idx})">${escapeHtml(lead.company_name)}</div>
      </td>
      <td>
        <span class="lead-cat-badge">${escapeHtml(lead.category || 'Business')}</span>
      </td>
      <td class="contact-cell">${contactHtml}</td>
      <td>${webHtml}</td>
      <td class="addr-cell" title="${escapeHtml(lead.address || '')}">
        ${escapeHtml(lead.address ? lead.address.substring(0, 75) + (lead.address.length > 75 ? '...' : '') : '—')}
      </td>
      <td>${ratingHtml}</td>
      <td>${mapsHtml}</td>
    `;

    frag.appendChild(tr);
  });

  elements.leadsTableBody.appendChild(frag);
}

/* ==========================================================================
   TERMINAL LOGGING
   ========================================================================== */
function appendLogLine(timestamp, level, message) {
  let tagClass = 'tag-info';
  let tagText = 'INFO';

  if (level === 'success') {
    tagClass = 'tag-succ';
    tagText = 'FOUND';
  } else if (level === 'warn') {
    tagClass = 'tag-warn';
    tagText = 'WARN';
  } else if (level === 'error') {
    tagClass = 'tag-err';
    tagText = 'ERROR';
  }

  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `
    <span class="log-ts">[${timestamp}]</span>
    <span class="log-tag ${tagClass}">${tagText}</span>
    <span class="log-msg">${escapeHtml(message)}</span>
  `;

  elements.terminalLogsContainer.appendChild(line);

  // Update counter
  const cnt = elements.terminalLogsContainer.children.length;
  elements.logCounterBadge.textContent = cnt;

  if (elements.autoscrollCheck.checked) {
    elements.terminalLogsContainer.scrollTop = elements.terminalLogsContainer.scrollHeight;
  }
}

/* ==========================================================================
   ARCHIVE & EXPORT FILES
   ========================================================================== */
async function fetchArchiveFiles() {
  const dir = elements.inputOutputDir.value || state.defaultDir;
  try {
    const url = getApiUrl(`/api/exports${dir ? '?dir_path=' + encodeURIComponent(dir) : ''}`);
    const res = await fetch(url);
    const data = await res.json();
    renderArchiveTable(data.exports || []);
  } catch (e) {
    console.error('[Archive] Fetch error:', e);
  }
}

function renderArchiveTable(files) {
  elements.archiveTableBody.innerHTML = '';
  if (files.length === 0) {
    elements.emptyArchiveMessage.style.display = 'block';
    return;
  }

  elements.emptyArchiveMessage.style.display = 'none';
  const frag = document.createDocumentFragment();

  files.forEach(f => {
    const tr = document.createElement('tr');
    const badgeClass = f.format === 'Excel' ? 'badge-excel' : 'badge-csv';
    const downloadUrl = `${getApiUrl('/api/download')}?filepath=${encodeURIComponent(f.filepath)}`;

    tr.innerHTML = `
      <td class="archive-filename">
        <i class="fa-regular fa-file-${f.format === 'Excel' ? 'excel excel-color' : 'csv csv-color'}" style="margin-right:8px;"></i>
        ${escapeHtml(f.filename)}
      </td>
      <td><span class="archive-format-badge ${badgeClass}">${f.format}</span></td>
      <td style="font-family:var(--font-mono);font-size:0.8rem;">${f.size_display}</td>
      <td style="color:var(--text-muted);font-size:0.8rem;">${f.modified}</td>
      <td>
        <a href="${downloadUrl}" class="btn-action" style="display:inline-flex;padding:5px 10px;font-size:0.75rem;" download>
          <i class="fa-solid fa-download"></i> Download
        </a>
      </td>
    `;
    frag.appendChild(tr);
  });

  elements.archiveTableBody.appendChild(frag);
}

/* ==========================================================================
   BROWSER CLIENT EXPORT (DIRECT FROM CURRENT TABLE)
   ========================================================================== */
function triggerBrowserExport(format) {
  if (state.leads.length === 0) {
    showToast('No leads available to export.', 'warning');
    return;
  }

  if (format === 'csv') {
    exportToCsv(state.leads);
  } else {
    // For excel, trigger server or csv fallback
    exportToCsv(state.leads);
    showToast('Generated CSV export from current table view.', 'info');
  }
}

function exportToCsv(leads) {
  const headers = ['Company Name', 'Industry / Category', 'Phone Number', 'Email ID', 'Website URL', 'Address', 'Rating', 'Reviews Count', 'Google Maps Link'];
  const rows = leads.map(l => [
    `"${(l.company_name || '').replace(/"/g, '""')}"`,
    `"${(l.category || '').replace(/"/g, '""')}"`,
    `"${(l.phone || '').replace(/"/g, '""')}"`,
    `"${(l.email || '').replace(/"/g, '""')}"`,
    `"${(l.website || '').replace(/"/g, '""')}"`,
    `"${(l.address || '').replace(/"/g, '""')}"`,
    `"${l.rating || ''}"`,
    `"${l.reviews || ''}"`,
    `"${(l.google_maps_url || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RION_Leads_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Downloaded CSV spreadsheet!', 'success');
}

/* ==========================================================================
   MODAL & DETAIL VIEW
   ========================================================================== */
window.openLeadModal = function(idx) {
  const lead = state.filteredLeads[idx] || state.leads[idx];
  if (!lead) return;

  elements.modalCompanyName.textContent = lead.company_name;
  elements.modalBodyContent.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <span style="font-size:0.75rem;color:var(--text-muted);display:block;">Industry / Category</span>
        <strong style="color:var(--primary-cyan);">${escapeHtml(lead.category || 'Business')}</strong>
      </div>
      <div>
        <span style="font-size:0.75rem;color:var(--text-muted);display:block;">Direct Phone Number</span>
        <strong style="font-family:var(--font-mono);">${escapeHtml(lead.phone || 'Not available')}</strong>
      </div>
      <div>
        <span style="font-size:0.75rem;color:var(--text-muted);display:block;">Verified Email ID</span>
        <strong style="color:#c4b5fd;font-family:var(--font-mono);">${escapeHtml(lead.email || 'Not available')}</strong>
      </div>
      <div>
        <span style="font-size:0.75rem;color:var(--text-muted);display:block;">Website URL</span>
        ${lead.website ? `<a href="${lead.website}" target="_blank" style="color:var(--primary-cyan);">${lead.website}</a>` : 'Not available'}
      </div>
      <div>
        <span style="font-size:0.75rem;color:var(--text-muted);display:block;">Physical Address</span>
        <p style="font-size:0.85rem;color:var(--text-main);margin-top:2px;">${escapeHtml(lead.address || 'Not specified')}</p>
      </div>
      <div style="display:flex;gap:20px;">
        <div>
          <span style="font-size:0.75rem;color:var(--text-muted);display:block;">Rating</span>
          <strong>⭐ ${lead.rating || 'N/A'} (${lead.reviews || 0} reviews)</strong>
        </div>
      </div>
      ${lead.google_maps_url ? `
        <div style="margin-top:10px;">
          <a href="${lead.google_maps_url}" target="_blank" class="btn-primary-glow" style="display:inline-flex;padding:10px 18px;font-size:0.85rem;text-decoration:none;">
            <i class="fa-solid fa-map-location-dot"></i> View on Google Maps
          </a>
        </div>
      ` : ''}
    </div>
  `;

  elements.leadModalOverlay.classList.add('show');
};

/* ==========================================================================
   HELPERS & UTILITIES
   ========================================================================== */
window.copyToClipboard = function(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copied to clipboard: ${text}`, 'success');
  });
};

function animateStatTick(element, targetVal) {
  const current = parseInt(element.textContent, 10) || 0;
  if (current === targetVal) return;
  element.textContent = targetVal;
  element.style.transform = 'scale(1.2)';
  element.style.color = '#38bdf8';
  setTimeout(() => {
    element.style.transform = 'scale(1)';
    element.style.color = '#fff';
  }, 250);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-triangle-exclamation';
  if (type === 'warning') icon = 'fa-bell';

  toast.innerHTML = `
    <i class="fa-solid ${icon}" style="font-size:1.1rem;"></i>
    <span style="flex:1;">${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

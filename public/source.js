<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Game Recorder</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/styles/github-dark.min.css">
<script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/highlight.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1a1a2e; color: #e0e0e0;
    height: 100vh; display: flex; flex-direction: column; overflow: hidden;
  }
  .toolbar {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 16px; background: #16213e;
    border-bottom: 1px solid #0f3460; flex-shrink: 0;
  }
  .toolbar input[type="text"] {
    flex: 1; padding: 8px 12px; border: 1px solid #0f3460;
    border-radius: 6px; background: #1a1a2e; color: #e0e0e0;
    font-size: 14px; outline: none;
  }
  .toolbar input[type="text"]:focus { border-color: #e94560; }
  .btn {
    padding: 8px 18px; border: none; border-radius: 6px;
    font-size: 14px; font-weight: 600; cursor: pointer;
    transition: opacity .2s; white-space: nowrap;
  }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .btn-load   { background: #0f3460; color: #e0e0e0; }
  .btn-record { background: #e94560; color: #fff; }
  .btn-stop   { background: #ff6b6b; color: #fff; }
  .rec-indicator { display: none; align-items: center; gap: 6px; font-size: 13px; color: #ff6b6b; font-weight: 600; }
  .rec-indicator.active { display: flex; }
  .rec-dot { width: 10px; height: 10px; background: #ff0000; border-radius: 50%; animation: blink 1s infinite; }
  @keyframes blink { 50% { opacity: .3; } }
  .main { flex: 1; display: flex; overflow: hidden; position: relative; }
  .res-select {
    padding: 7px 10px; border: 1px solid #0f3460; border-radius: 6px;
    background: #1a1a2e; color: #e0e0e0; font-size: 13px; outline: none; cursor: pointer;
  }
  .res-select:focus { border-color: #e94560; }
  .res-label { font-size: 12px; color: #888; white-space: nowrap; }
  .game-panel {
    flex: 1; display: flex; align-items: center; justify-content: center;
    background: #0d0d1a; position: relative; overflow: auto;
  }
  .game-panel iframe { border: none; flex-shrink: 0; }
  .game-placeholder { color: #555; font-size: 18px; text-align: center; line-height: 1.6; }
  .side-panel {
    width: 320px; min-width: 200px; max-width: 600px; background: #16213e; border-left: 1px solid #0f3460;
    display: flex; flex-direction: column; flex-shrink: 0; position: relative;
    transition: width 0.3s, min-width 0.3s, border 0.3s, opacity 0.3s;
  }
  .side-panel.collapsed { width: 0 !important; min-width: 0 !important; overflow: hidden; border-left: none; }
  .resize-handle {
    position: absolute; left: -4px; top: 0; bottom: 0; width: 8px;
    cursor: col-resize; z-index: 10;
  }
  .resize-handle:hover, .resize-handle.active { background: rgba(233,69,96,.3); }
  .panel-toggle {
    background: #16213e; border: 1px solid #0f3460; border-right: none;
    color: #888; cursor: pointer; font-size: 16px; padding: 8px 4px;
    position: absolute; right: 0; top: 50%; transform: translate(0, -50%);
    border-radius: 4px 0 0 4px; z-index: 11; line-height: 1;
    transition: right 0.3s;
  }
  .panel-toggle:hover { color: #e0e0e0; background: #1e2a47; }
  .side-tabs { display: flex; border-bottom: 1px solid #0f3460; }
  .side-tab {
    flex: 1; padding: 10px; text-align: center; font-size: 13px;
    color: #888; cursor: pointer; border: none; background: none;
    border-bottom: 2px solid transparent; font-weight: 600;
  }
  .side-tab.active { color: #e94560; border-bottom-color: #e94560; }
  .side-tab:hover { color: #e0e0e0; }
  .tab-content { flex: 1; overflow-y: auto; display: none; flex-direction: column; }
  .tab-content.active { display: flex; }
  .recordings-list { flex: 1; overflow-y: auto; padding: 8px; }
  .rec-item { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; border-radius: 4px; cursor: pointer; }
  .rec-item:hover { background: #0f3460; }
  .rec-item.selected { background: #0f3460; border-left: 3px solid #e94560; }
  .rec-info { flex: 1; padding: 6px 8px; min-width: 0; }
  .rec-title { font-size: 13px; color: #e0e0e0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rec-status { font-size: 11px; color: #666; margin-top: 2px; }
  .rec-status.analyzing { color: #f0a500; }
  .rec-status.ready { color: #4ecdc4; }
  .rec-status.error { color: #e94560; }
  .rec-actions { display: flex; gap: 2px; flex-shrink: 0; padding-right: 4px; }
  .recordings-list .empty { color: #555; font-size: 13px; padding: 10px; }
  .btn-icon {
    background: none; border: none; color: #666; cursor: pointer;
    font-size: 13px; padding: 4px 5px; border-radius: 4px; flex-shrink: 0;
    text-decoration: none;
  }
  .btn-icon:hover { color: #e0e0e0; background: rgba(255,255,255,.1); }
  .btn-icon.del:hover { color: #e94560; background: rgba(233,69,96,.15); }
  .detail-panel { display: flex; flex-direction: column; height: 100%; }
  .detail-header { padding: 10px 12px; border-bottom: 1px solid #0f3460; }
  .detail-title {
    font-size: 14px; font-weight: 600; color: #e0e0e0;
    cursor: pointer; padding: 2px 4px; border-radius: 4px;
  }
  .detail-title:hover { background: rgba(255,255,255,.05); }
  .detail-summary { font-size: 12px; color: #999; margin-top: 6px; line-height: 1.5; }
  .detail-meta { font-size: 11px; color: #666; margin-top: 6px; }
  .detail-actions { display: flex; gap: 6px; margin-top: 8px; }
  .btn-sm {
    padding: 4px 10px; border: 1px solid #0f3460; border-radius: 4px;
    background: none; color: #aaa; font-size: 11px; cursor: pointer; text-decoration: none;
  }
  .btn-sm:hover { background: #0f3460; color: #e0e0e0; }
  .chat-messages {
    flex: 1; overflow-y: auto; padding: 8px 12px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .chat-msg { font-size: 13px; line-height: 1.5; padding: 6px 10px; border-radius: 8px; max-width: 95%; word-wrap: break-word; position: relative; }
  .chat-msg.user { background: #0f3460; align-self: flex-end; color: #e0e0e0; white-space: pre-wrap; }
  .chat-msg.assistant { background: #1e2a47; align-self: flex-start; color: #ccc; }
  .chat-msg.streaming { border-left: 2px solid #e94560; }
  .chat-msg .copy-btn {
    position: absolute; top: 4px; right: 4px; background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.15); border-radius: 4px; color: #888;
    font-size: 11px; cursor: pointer; padding: 2px 6px; opacity: 0; transition: opacity .2s;
  }
  .chat-msg:hover .copy-btn { opacity: 1; }
  .chat-msg .copy-btn:hover { color: #e0e0e0; background: rgba(255,255,255,.15); }
  .chat-msg .md-content p { margin: 0.4em 0; }
  .chat-msg .md-content p:first-child { margin-top: 0; }
  .chat-msg .md-content p:last-child { margin-bottom: 0; }
  .chat-msg .md-content pre { background: #0d0d1a; border-radius: 6px; padding: 8px 10px; overflow-x: auto; margin: 6px 0; position: relative; }
  .chat-msg .md-content code { font-family: 'Consolas', 'Monaco', monospace; font-size: 12px; }
  .chat-msg .md-content :not(pre) > code { background: rgba(255,255,255,.08); padding: 1px 4px; border-radius: 3px; }
  .chat-msg .md-content pre .code-copy {
    position: absolute; top: 4px; right: 4px; background: rgba(255,255,255,.1);
    border: 1px solid rgba(255,255,255,.15); border-radius: 4px; color: #888;
    font-size: 11px; cursor: pointer; padding: 2px 6px; opacity: 0; transition: opacity .2s;
  }
  .chat-msg .md-content pre:hover .code-copy { opacity: 1; }
  .chat-msg .md-content pre .code-copy:hover { color: #e0e0e0; background: rgba(255,255,255,.15); }
  .chat-msg .md-content ul, .chat-msg .md-content ol { margin: 4px 0; padding-left: 20px; }
  .chat-msg .md-content blockquote { border-left: 3px solid #e94560; margin: 4px 0; padding: 2px 8px; color: #999; }
  .chat-msg .md-content table { border-collapse: collapse; margin: 6px 0; font-size: 12px; }
  .chat-msg .md-content th, .chat-msg .md-content td { border: 1px solid #333; padding: 4px 8px; }
  .chat-msg .md-content th { background: #0f3460; }
  .chat-msg .md-content h1,.chat-msg .md-content h2,.chat-msg .md-content h3 { margin: 6px 0 4px; font-size: 14px; color: #e0e0e0; }
  .chat-msg .md-content hr { border: none; border-top: 1px solid #333; margin: 6px 0; }
  .thinking-block {
    margin-bottom: 4px; border: 1px solid #2a2a4a; border-radius: 6px; overflow: hidden;
  }
  .thinking-toggle {
    display: flex; align-items: center; gap: 6px; padding: 4px 8px;
    background: #1a1a35; cursor: pointer; font-size: 11px; color: #888; user-select: none;
  }
  .thinking-toggle:hover { color: #bbb; background: #1e1e3a; }
  .thinking-toggle .arrow { transition: transform .2s; display: inline-block; }
  .thinking-toggle .arrow.open { transform: rotate(90deg); }
  .thinking-content {
    display: none; padding: 6px 8px; font-size: 11px; color: #777;
    line-height: 1.5; white-space: pre-wrap; border-top: 1px solid #2a2a4a;
    max-height: 200px; overflow-y: auto; background: #151530;
  }
  .thinking-content.open { display: block; }
  .chat-input-area {
    border-top: 1px solid #0f3460; flex-shrink: 0; padding: 8px 10px;
  }
  .chat-attachments {
    display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px;
  }
  .chat-attachments:empty { display: none; }
  .chat-attachment {
    display: flex; align-items: center; gap: 4px; padding: 3px 8px;
    background: #0f3460; border-radius: 12px; font-size: 11px; color: #ccc; max-width: 180px;
  }
  .chat-attachment .att-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chat-attachment .att-remove {
    background: none; border: none; color: #888; cursor: pointer; font-size: 13px; padding: 0 2px; line-height: 1;
  }
  .chat-attachment .att-remove:hover { color: #e94560; }
  .chat-input-row {
    display: flex; gap: 6px; align-items: flex-end;
  }
  .chat-input {
    flex: 1; padding: 8px 10px; border: 1px solid #0f3460; border-radius: 6px;
    background: #1a1a2e; color: #e0e0e0; font-size: 13px; outline: none;
    resize: none; min-height: 38px; max-height: 150px; overflow-y: auto;
    font-family: inherit; line-height: 1.5;
  }
  .chat-input:focus { border-color: #e94560; }
  .chat-btn-group { display: flex; flex-direction: column; gap: 4px; }
  .btn-attach {
    padding: 6px 8px; background: none; border: 1px solid #0f3460; border-radius: 6px;
    color: #888; font-size: 16px; cursor: pointer; line-height: 1;
  }
  .btn-attach:hover { color: #e0e0e0; border-color: #e94560; }
  .btn-send {
    padding: 8px 14px; background: #e94560; color: #fff; border: none;
    border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
  }
  .btn-send:disabled { opacity: .4; cursor: not-allowed; }
  .no-selection { color: #555; font-size: 13px; padding: 20px; text-align: center; }
  /* Settings popup */
  .settings-overlay {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 200;
  }
  .settings-overlay.active { display: flex; align-items: center; justify-content: center; }
  .settings-popup {
    background: #16213e; border: 1px solid #0f3460; border-radius: 10px;
    padding: 20px; width: 400px; max-width: 90vw; max-height: 80vh; overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0,0,0,.5);
  }
  .settings-popup h3 {
    font-size: 16px; color: #e0e0e0; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;
  }
  .settings-popup h3 button {
    background: none; border: none; color: #888; font-size: 20px; cursor: pointer; padding: 0 4px;
  }
  .settings-popup h3 button:hover { color: #e94560; }
  .settings-panel { display: flex; flex-direction: column; gap: 14px; }
  .setting-group { display: flex; flex-direction: column; gap: 4px; }
  .setting-label { font-size: 12px; color: #aaa; font-weight: 600; }
  .setting-row { display: flex; align-items: center; gap: 8px; }
  .setting-input {
    flex: 1; padding: 6px 10px; border: 1px solid #0f3460; border-radius: 6px;
    background: #1a1a2e; color: #e0e0e0; font-size: 13px; outline: none;
  }
  .setting-input:focus { border-color: #e94560; }
  .toggle-switch { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
  .toggle-switch input { opacity: 0; width: 0; height: 0; }
  .toggle-slider {
    position: absolute; inset: 0; background: #333; border-radius: 11px;
    cursor: pointer; transition: background .2s;
  }
  .toggle-slider::before {
    content: ''; position: absolute; left: 3px; top: 3px;
    width: 16px; height: 16px; background: #888; border-radius: 50%; transition: .2s;
  }
  .toggle-switch input:checked + .toggle-slider { background: #e94560; }
  .toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); background: #fff; }
  .setting-hint { font-size: 11px; color: #666; line-height: 1.4; }
  .setting-select {
    padding: 6px 10px; border: 1px solid #0f3460; border-radius: 6px;
    background: #1a1a2e; color: #e0e0e0; font-size: 13px; outline: none; cursor: pointer;
  }
  .setting-select:focus { border-color: #e94560; }
  .btn-settings {
    background: none; border: 1px solid #0f3460; border-radius: 6px;
    color: #888; font-size: 18px; cursor: pointer; padding: 5px 8px; line-height: 1;
  }
  .btn-settings:hover { color: #e0e0e0; border-color: #e94560; }
  .status-bar {
    padding: 6px 16px; background: #16213e; border-top: 1px solid #0f3460;
    font-size: 12px; color: #888; flex-shrink: 0;
  }
  .overlay {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,.7);
    z-index: 100; align-items: center; justify-content: center;
    flex-direction: column; gap: 16px;
  }
  .overlay.active { display: flex; }
  .overlay .spinner {
    width: 40px; height: 40px; border: 4px solid #333;
    border-top-color: #e94560; border-radius: 50%; animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .overlay p { font-size: 16px; color: #ccc; }
</style>
</head>
<body>

<div class="toolbar">
  <input type="text" id="urlInput" placeholder="Enter game URL (e.g. https://example.com/game)" spellcheck="false">
  <button class="btn btn-load" onclick="loadGame()">Load</button>
  <div style="width:1px;height:24px;background:#0f3460"></div>
  <span class="res-label">Size:</span>
  <select class="res-select" id="resSelect" onchange="applyResolution()"></select>
  <div style="width:1px;height:24px;background:#0f3460"></div>
  <button class="btn btn-record" id="recordBtn" onclick="startRecording()" disabled>Record</button>
  <button class="btn btn-stop" id="stopBtn" onclick="stopRecording()" disabled>Stop</button>
  <div class="rec-indicator" id="recIndicator">
    <div class="rec-dot"></div>
    <span id="recTimer">00:00</span>
  </div>
  <div style="flex:1"></div>
  <div id="autopilotIndicator" class="rec-indicator" style="display:none;color:#4ecdc4">
    <div class="rec-dot" style="background:#4ecdc4"></div>
    <span>Autopilot</span>
  </div>
  <button class="btn-settings" onclick="toggleSettings()" title="Settings">&#9881;</button>
</div>

<div class="main">
  <div class="game-panel" id="gamePanel">
    <div class="game-placeholder" id="placeholder">
      Enter a game URL above and click <strong>Load</strong><br>
      Then click <strong>Record</strong> to start capturing
    </div>
  </div>
  <button class="panel-toggle" id="panelToggle" onclick="toggleSidePanel()" title="Toggle panel">&#9654;</button>
  <div class="side-panel" id="sidePanel">
    <div class="resize-handle" id="resizeHandle"></div>
    <div class="side-tabs">
      <button class="side-tab active" onclick="switchTab('list')">Recordings</button>
      <button class="side-tab" onclick="switchTab('detail')">Detail / Chat</button>
    </div>
    <div class="tab-content active" id="tabList">
      <div class="recordings-list" id="recordingsList">
        <div class="empty">No recordings yet</div>
      </div>
    </div>
    <div class="tab-content" id="tabDetail">
      <div id="detailContent">
        <div class="no-selection">Click a recording to view details and chat</div>
      </div>
    </div>
  </div>
</div>

<!-- Settings popup -->
<div class="settings-overlay" id="settingsOverlay" onclick="if(event.target===this)toggleSettings()">
  <div class="settings-popup">
    <h3>Settings <button onclick="toggleSettings()">&times;</button></h3>
    <div class="settings-panel">
      <div class="setting-group">
        <span class="setting-label">Autopilot</span>
        <div class="setting-row">
          <label class="toggle-switch">
            <input type="checkbox" id="settingAutopilot" onchange="saveSetting('autopilot', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span style="font-size:12px;color:#999" id="autopilotLabel">Off</span>
        </div>
        <span class="setting-hint">Automatically start recording when a game URL is loaded</span>
      </div>
      <div class="setting-group">
        <span class="setting-label">Language / Ngôn ngữ</span>
        <select class="setting-select" id="settingLang" onchange="saveSetting('language', this.value)">
          <option value="en">English</option>
          <option value="vi">Tiếng Việt</option>
        </select>
        <span class="setting-hint">System prompt & analysis language</span>
      </div>
      <div class="setting-group">
        <span class="setting-label">Enable Thinking</span>
        <div class="setting-row">
          <label class="toggle-switch">
            <input type="checkbox" id="settingThinking" onchange="saveSetting('enable_thinking', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span style="font-size:12px;color:#999" id="thinkingLabel">Off</span>
        </div>
        <span class="setting-hint">Let the model reason step-by-step before answering (slower but more accurate)</span>
      </div>
      <div class="setting-group">
        <span class="setting-label">Max Tokens (Chat)</span>
        <div class="setting-row">
          <input type="range" class="setting-input" id="settingMaxChat" min="64" max="8192" step="64"
            oninput="document.getElementById('maxChatVal').textContent=this.value"
            onchange="saveSetting('max_tokens_chat', parseInt(this.value))">
          <span style="font-size:12px;color:#999;min-width:40px" id="maxChatVal">2048</span>
        </div>
        <span class="setting-hint">Maximum response length for chat (64–8192)</span>
      </div>
      <div class="setting-group">
        <span class="setting-label">Max Tokens (Analyze)</span>
        <div class="setting-row">
          <input type="range" class="setting-input" id="settingMaxAnalyze" min="64" max="4096" step="64"
            oninput="document.getElementById('maxAnalyzeVal').textContent=this.value"
            onchange="saveSetting('max_tokens_analyze', parseInt(this.value))">
          <span style="font-size:12px;color:#999;min-width:40px" id="maxAnalyzeVal">1024</span>
        </div>
        <span class="setting-hint">Maximum response length for auto-analysis (64–4096)</span>
      </div>
    </div>
  </div>
</div>

<div class="status-bar" id="statusBar">Ready</div>

<div class="overlay" id="overlay">
  <div class="spinner"></div>
  <p id="overlayMsg">Converting to MP4...</p>
</div>

<script>
  const PRESETS = [
    { name: 'Desktop',  width: 1200, height: 675, type: 'desktop' },
    { name: 'Laptop',   width: 1024, height: 576, type: 'desktop' },
    { name: 'Popout L', width: 800,  height: 450, type: 'desktop' },
    { name: 'Popout S', width: 400,  height: 225, type: 'desktop' },
    { name: 'Mobile L', width: 425,  height: 812, type: 'mobile'  },
    { name: 'Mobile M', width: 375,  height: 667, type: 'mobile'  },
    { name: 'Mobile S', width: 320,  height: 568, type: 'mobile'  },
  ];
  const resSelect = document.getElementById('resSelect');
  PRESETS.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${p.name} (${p.width}\u00d7${p.height})`;
    resSelect.appendChild(opt);
  });

  let mediaRecorder = null, recordedChunks = [], mediaStream = null;
  let timerInterval = null, startTime = 0, gameLoaded = false;
  let selectedVideo = null, pollTimer = null;
  let autopilotEnabled = false;

  const recordBtn = document.getElementById('recordBtn');
  const stopBtn = document.getElementById('stopBtn');
  const recIndicator = document.getElementById('recIndicator');
  const recTimer = document.getElementById('recTimer');
  const gamePanel = document.getElementById('gamePanel');
  const placeholder = document.getElementById('placeholder');
  const statusBar = document.getElementById('statusBar');
  const overlay = document.getElementById('overlay');
  const overlayMsg = document.getElementById('overlayMsg');
  const recordingsList = document.getElementById('recordingsList');
  const detailContent = document.getElementById('detailContent');

  document.getElementById('urlInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') loadGame();
  });

  const sidePanel = document.getElementById('sidePanel');
  const panelToggle = document.getElementById('panelToggle');
  let sidePanelCollapsed = false;
  let sidePanelWidth = 320;

  function toggleSidePanel(forceState) {
    if (forceState !== undefined) sidePanelCollapsed = !forceState;
    sidePanelCollapsed = !sidePanelCollapsed;
    sidePanel.classList.toggle('collapsed', sidePanelCollapsed);
    panelToggle.innerHTML = sidePanelCollapsed ? '&#9664;' : '&#9654;';
    // Set position immediately for collapsed (0), or use stored width for expanded
    panelToggle.style.right = sidePanelCollapsed ? '0px' : sidePanelWidth + 'px';
  }

  function updateTogglePosition() {
    panelToggle.style.right = sidePanelCollapsed ? '0px' : sidePanelWidth + 'px';
  }
  updateTogglePosition();

  // Resize handle logic
  (function() {
    const handle = document.getElementById('resizeHandle');
    let dragging = false, startX, startW;
    handle.addEventListener('mousedown', e => {
      dragging = true; startX = e.clientX; startW = sidePanel.offsetWidth;
      handle.classList.add('active');
      sidePanel.style.transition = 'none';
      panelToggle.style.transition = 'none';
      document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const newW = startW - (e.clientX - startX);
      if (newW >= 200 && newW <= 600) { sidePanel.style.width = newW + 'px'; sidePanelWidth = newW; updateTogglePosition(); }
    });
    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false; handle.classList.remove('active');
        sidePanel.style.transition = '';
        panelToggle.style.transition = '';
        document.body.style.cursor = ''; document.body.style.userSelect = '';
      }
    });
  })();

  function switchTab(tab) {
    document.querySelectorAll('.side-tab').forEach((t, i) => {
      t.classList.toggle('active', (tab === 'list' && i === 0) || (tab === 'detail' && i === 1));
    });
    document.getElementById('tabList').classList.toggle('active', tab === 'list');
    document.getElementById('tabDetail').classList.toggle('active', tab === 'detail');
    // Auto-expand if collapsed
    if (sidePanelCollapsed) toggleSidePanel(true);
  }

  function toggleSettings() {
    const ov = document.getElementById('settingsOverlay');
    ov.classList.toggle('active');
  }

  function loadGame() {
    let url = document.getElementById('urlInput').value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    document.getElementById('urlInput').value = url;
    const old = gamePanel.querySelector('iframe');
    if (old) old.remove();
    placeholder.style.display = 'none';
    const iframe = document.createElement('iframe');
    iframe.id = 'gameIframe';
    iframe.src = url;
    iframe.allow = 'display-capture; autoplay; fullscreen; microphone; camera';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-top-navigation');
    gamePanel.appendChild(iframe);
    applyResolution();
    gameLoaded = true;
    recordBtn.disabled = false;
    setStatus('Game loaded: ' + url);
    if (autopilotEnabled) {
      setStatus('Game loaded: ' + url + ' — Autopilot starting recording...');
      setTimeout(() => startRecording(), 500);
    }
  }

  async function startRecording() {
    try {
      const opts = {
        video: { displaySurface: 'browser', frameRate: { ideal: 30 } },
        audio: true,
        preferCurrentTab: true,
      };
      try { opts.systemAudio = 'include'; } catch (_) {}
      mediaStream = await navigator.mediaDevices.getDisplayMedia(opts);
      const iframe = document.getElementById('gameIframe');
      let cropped = false;
      if (iframe && typeof CropTarget !== 'undefined') {
        try {
          const ct = await CropTarget.fromElement(iframe);
          await mediaStream.getVideoTracks()[0].cropTo(ct);
          cropped = true;
        } catch (_) {}
      }
      const hasAudio = mediaStream.getAudioTracks().length > 0;
      setStatus(`Recording ${cropped ? 'iframe' : 'tab'}${hasAudio ? ' with audio' : ' (no audio)'}...`);

      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus'))
        mimeType = 'video/webm;codecs=vp9,opus';
      else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus'))
        mimeType = 'video/webm;codecs=vp8,opus';

      recordedChunks = [];
      mediaRecorder = new MediaRecorder(mediaStream, { mimeType, videoBitsPerSecond: 5000000 });
      mediaRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };
      mediaRecorder.onstop = () => onRecordingStopped();
      mediaStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      };
      mediaRecorder.start(1000);
      recordBtn.disabled = true;
      stopBtn.disabled = false;
      recIndicator.classList.add('active');
      startTime = Date.now();
      timerInterval = setInterval(updateTimer, 500);
      // Auto-collapse side panel while recording
      if (!sidePanelCollapsed) toggleSidePanel(false);
    } catch (err) {
      setStatus(err.name === 'NotAllowedError' ? 'Recording cancelled.' : 'Error: ' + err.message);
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  }

  async function onRecordingStopped() {
    clearInterval(timerInterval);
    recIndicator.classList.remove('active');
    recTimer.textContent = '00:00';
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    // Auto-expand side panel when done
    if (sidePanelCollapsed) toggleSidePanel(true);
    if (!recordedChunks.length) { setStatus('No data recorded.'); return; }
    const blob = new Blob(recordedChunks, { type: recordedChunks[0].type || 'video/webm' });
    const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
    setStatus(`Converting (${sizeMB} MB)...`);
    overlay.classList.add('active');
    overlayMsg.textContent = `Converting to MP4 (${sizeMB} MB)...`;
    try {
      const fd = new FormData();
      fd.append('video', blob, 'recording.webm');
      const resp = await fetch('/convert', { method: 'POST', body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Conversion failed');
      setStatus(`Saved: ${data.filename} - AI analyzing...`);
      loadRecordings();
    } catch (err) {
      setStatus('Error: ' + err.message);
    } finally {
      overlay.classList.remove('active');
    }
  }

  function updateTimer() {
    const s = Math.floor((Date.now() - startTime) / 1000);
    recTimer.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function applyResolution() {
    const iframe = document.getElementById('gameIframe');
    if (!iframe) return;
    const p = PRESETS[resSelect.value];
    iframe.style.width = p.width + 'px';
    iframe.style.height = p.height + 'px';
  }

  function setStatus(msg) { statusBar.textContent = msg; }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  }

  // Configure marked for markdown rendering
  marked.setOptions({
    highlight: function(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try { return hljs.highlight(code, { language: lang }).value; } catch (_) {}
      }
      return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true,
  });

  function renderMarkdown(text) {
    try {
      let html = marked.parse(text);
      // Add copy button to each code block
      html = html.replace(/<pre><code/g, '<pre><button class="code-copy" onclick="copyCode(this)">Copy</button><code');
      return html;
    } catch (_) {
      return escapeHtml(text);
    }
  }

  function makeChatMsg(role, content) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = function() { copyMsgText(this); };
    div.appendChild(copyBtn);
    if (role === 'assistant') {
      const md = document.createElement('div');
      md.className = 'md-content';
      md.innerHTML = renderMarkdown(content);
      div.appendChild(md);
    } else {
      div.appendChild(document.createTextNode(content));
    }
    return div;
  }

  function copyMsgText(btn) {
    const msg = btn.closest('.chat-msg');
    const md = msg.querySelector('.md-content');
    const text = md ? md.innerText : msg.innerText;
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  }

  function copyCode(btn) {
    const code = btn.nextElementSibling;
    navigator.clipboard.writeText(code.innerText).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  }

  /* ===== Chat attachments ===== */
  let chatAttachments = [];

  function handleFileAttach(inputEl) {
    for (const file of inputEl.files) {
      chatAttachments.push({ name: file.name, file });
      renderAttachments();
    }
    inputEl.value = '';
  }

  function renderAttachments() {
    const el = document.getElementById('chatAttachments');
    if (!el) return;
    el.innerHTML = chatAttachments.map((a, i) =>
      `<div class="chat-attachment"><span class="att-name" title="${a.name}">${a.name}</span><button class="att-remove" onclick="removeAttachment(${i})">&times;</button></div>`
    ).join('');
  }

  function removeAttachment(idx) {
    chatAttachments.splice(idx, 1);
    renderAttachments();
  }

  function autoGrowTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  }

  /* ===== Recordings list ===== */
  async function loadRecordings() {
    try {
      const resp = await fetch('/recordings');
      const items = await resp.json();
      if (!items.length) {
        recordingsList.innerHTML = '<div class="empty">No recordings yet</div>';
        return;
      }
      let hasAnalyzing = false;
      recordingsList.innerHTML = items.map(v => {
        const sel = selectedVideo === v.filename ? ' selected' : '';
        const statusCls = v.status === 'analyzing' ? ' analyzing' : v.status === 'ready' ? ' ready' : v.status === 'error' ? ' error' : '';
        if (v.status === 'analyzing') hasAnalyzing = true;
        let statusText = 'New';
        if (v.status === 'analyzing') statusText = '\u23f3 Analyzing...';
        else if (v.status === 'ready') statusText = v.summary ? v.summary.substring(0, 60) + (v.summary.length > 60 ? '...' : '') : 'Ready';
        else if (v.status === 'error') statusText = '\u26a0 Error';
        const esc = v.filename.replace(/'/g, "\\'");
        return `<div class="rec-item${sel}" onclick="selectVideo('${esc}')">
          <div class="rec-info">
            <div class="rec-title" title="${v.filename}">${v.title || v.filename}</div>
            <div class="rec-status${statusCls}">${statusText}</div>
          </div>
          <div class="rec-actions">
            <a href="/recordings/${encodeURIComponent(v.filename)}" download class="btn-icon" title="Download" onclick="event.stopPropagation()">\u2b07</a>
            <button class="btn-icon" onclick="event.stopPropagation();renameRecording('${esc}')" title="Rename">\u270e</button>
            <button class="btn-icon del" onclick="event.stopPropagation();deleteRecording('${esc}')" title="Delete">\u00d7</button>
          </div>
        </div>`;
      }).join('');

      if (hasAnalyzing && !pollTimer) {
        pollTimer = setInterval(loadRecordings, 3000)
      } else if (!hasAnalyzing && pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null;
        if (selectedVideo) showDetail(selectedVideo);
      }
    } catch (_) {}
  }

  /* ===== Video detail + chat ===== */
  async function selectVideo(filename) {
    selectedVideo = filename;
    document.querySelectorAll('.rec-item').forEach(el => {
      const titleEl = el.querySelector('.rec-title');
      el.classList.toggle('selected', titleEl && titleEl.title === filename);
    });
    switchTab('detail');
    await showDetail(filename);
  }

  async function showDetail(filename) {
    detailContent.innerHTML = '<div class="no-selection">Loading...</div>';
    try {
      const [infoResp, chatResp] = await Promise.all([
        fetch('/api/video/' + encodeURIComponent(filename)),
        fetch('/api/video/' + encodeURIComponent(filename) + '/chat'),
      ]);
      const info = await infoResp.json();
      const chatHistory = await chatResp.json();
      const v = info.video || {};
      const dur = v.duration ? v.duration.toFixed(1) + 's' : '?';
      const res = v.width ? `${v.width}\u00d7${v.height}` : '?';
      const esc = filename.replace(/'/g, "\\'");

      detailContent.innerHTML = `<div class="detail-panel">
        <div class="detail-header">
          <div class="detail-title" onclick="editTitle('${esc}')" title="Click to edit title">${info.title || filename}</div>
          <div class="detail-summary">${info.summary || (info.status === 'analyzing' ? '\u23f3 AI is analyzing...' : 'No summary yet')}</div>
          <div class="detail-meta">${res} \u00b7 ${dur} \u00b7 ${info.status}</div>
          <div class="detail-actions">
            <button class="btn-sm" onclick="reanalyze('${esc}')">\ud83d\udd04 Re-analyze</button>
            <button class="btn-sm" onclick="clearChat('${esc}')">\ud83d\uddd1 Clear chat</button>
            <a href="/recordings/${encodeURIComponent(filename)}" download class="btn-sm">\u2b07 Download</a>
          </div>
        </div>
        <div class="chat-messages" id="chatMessages"></div>
        <div class="chat-input-area">
          <div class="chat-attachments" id="chatAttachments"></div>
          <div class="chat-input-row">
            <textarea class="chat-input" id="chatInput" rows="2" placeholder="Ask about this video... (Shift+Enter for new line)"
              onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChat();}"
              oninput="autoGrowTextarea(this)"></textarea>
            <div class="chat-btn-group">
              <button class="btn-attach" onclick="document.getElementById('chatFileInput').click()" title="Attach file">&#128206;</button>
              <button class="btn-send" id="chatSendBtn" onclick="sendChat()">Send</button>
            </div>
          </div>
          <input type="file" id="chatFileInput" multiple accept="image/*,video/*,.txt,.md,.json,.csv,.log,.py,.js,.html,.css" style="display:none" onchange="handleFileAttach(this)">
        </div>
      </div>`;

      const chatEl = document.getElementById('chatMessages');
      if (chatHistory.length) {
        chatEl.innerHTML = '';
        chatHistory.forEach(m => chatEl.appendChild(makeChatMsg(m.role, m.content)));
        chatEl.scrollTop = chatEl.scrollHeight;
      }
    } catch (err) {
      detailContent.innerHTML = `<div class="no-selection">Error: ${err.message}</div>`;
    }
  }

  async function sendChat() {
    if (!selectedVideo) return;
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('chatSendBtn');
    const msg = input.value.trim();
    if (!msg && !chatAttachments.length) return;
    input.value = '';
    input.style.height = '';
    btn.disabled = true;
    const chatEl = document.getElementById('chatMessages');

    // Build display text for user message
    let displayParts = [];
    if (chatAttachments.length) {
      displayParts.push(chatAttachments.map(a => '\ud83d\udcce ' + a.name).join(', '));
    }
    if (msg) displayParts.push(msg);
    chatEl.appendChild(makeChatMsg('user', displayParts.join('\n')));

    // Prepare request (FormData if attachments, JSON otherwise)
    let fetchOpts;
    if (chatAttachments.length) {
      const fd = new FormData();
      fd.append('message', msg);
      chatAttachments.forEach(a => fd.append('files', a.file));
      fetchOpts = { method: 'POST', body: fd };
    } else {
      fetchOpts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      };
    }
    // Clear attachments
    chatAttachments = [];
    document.getElementById('chatAttachments').innerHTML = '';

    // Create thinking block (hidden initially, shown if thinking data arrives)
    let thinkingBlock = null;
    let thinkingContent = null;
    let answerSpan = null;
    let rawAnswer = '';

    const aiMsg = document.createElement('div');
    aiMsg.className = 'chat-msg assistant streaming';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = function() { copyMsgText(this); };
    aiMsg.appendChild(copyBtn);
    chatEl.appendChild(aiMsg);
    chatEl.scrollTop = chatEl.scrollHeight;
    try {
      const resp = await fetch('/api/video/' + encodeURIComponent(selectedVideo) + '/chat', fetchOpts);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.thinking) {
              if (!thinkingBlock) {
                thinkingBlock = document.createElement('div');
                thinkingBlock.className = 'thinking-block';
                thinkingBlock.innerHTML = '<div class="thinking-toggle" onclick="this.querySelector(\'.arrow\').classList.toggle(\'open\');this.nextElementSibling.classList.toggle(\'open\')"><span class="arrow">▶</span> Thinking...</div><div class="thinking-content"></div>';
                aiMsg.appendChild(thinkingBlock);
                thinkingContent = thinkingBlock.querySelector('.thinking-content');
              }
              thinkingContent.textContent += data.thinking;
              chatEl.scrollTop = chatEl.scrollHeight;
            }
            if (data.token) {
              if (!answerSpan) { answerSpan = document.createElement('span'); answerSpan.className = 'md-content'; aiMsg.appendChild(answerSpan); }
              rawAnswer += data.token;
              answerSpan.innerHTML = renderMarkdown(rawAnswer);
              chatEl.scrollTop = chatEl.scrollHeight;
            }
            if (data.done) aiMsg.classList.remove('streaming');
            if (data.error) {
              if (!answerSpan) { answerSpan = document.createElement('span'); aiMsg.appendChild(answerSpan); }
              answerSpan.innerHTML += '<br><em style="color:#e94560">Error: ' + escapeHtml(data.error) + '</em>';
              aiMsg.classList.remove('streaming');
            }
          } catch (_) {}
        }
      }
      aiMsg.classList.remove('streaming');
    } catch (err) {
      if (!answerSpan) { answerSpan = document.createElement('span'); aiMsg.appendChild(answerSpan); }
      answerSpan.innerHTML += '<br><em style="color:#e94560">Error: ' + escapeHtml(err.message) + '</em>';
      aiMsg.classList.remove('streaming');
    }
    btn.disabled = false;
    input.focus();
  }

  async function clearChat(filename) {
    if (!confirm('Clear all chat history for this video?')) return;
    await fetch('/api/video/' + encodeURIComponent(filename) + '/chat', { method: 'DELETE' });
    if (selectedVideo === filename) showDetail(filename);
  }

  async function reanalyze(filename) {
    await fetch('/api/video/' + encodeURIComponent(filename) + '/analyze', { method: 'POST' });
    setStatus('Re-analyzing ' + filename + '...');
    loadRecordings();
    if (selectedVideo === filename) showDetail(filename);
  }

  async function editTitle(filename) {
    const current = document.querySelector('.detail-title') ? document.querySelector('.detail-title').textContent : filename;
    const newTitle = prompt('Edit title:', current);
    if (!newTitle || newTitle === current) return;
    await fetch('/api/video/' + encodeURIComponent(filename) + '/title', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    loadRecordings();
    showDetail(filename);
  }

  async function renameRecording(filename) {
    const baseName = filename.replace(/\.mp4$/i, '');
    const newBase = prompt('Rename recording:', baseName);
    if (!newBase || newBase === baseName) return;
    const newName = newBase.endsWith('.mp4') ? newBase : newBase + '.mp4';
    try {
      const resp = await fetch('/recordings/' + encodeURIComponent(filename), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Rename failed');
      if (selectedVideo === filename) selectedVideo = data.filename;
      setStatus('Renamed to: ' + data.filename);
      loadRecordings();
      if (selectedVideo === data.filename) showDetail(data.filename);
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  }

  async function deleteRecording(filename) {
    if (!confirm('Delete ' + filename + '?')) return;
    try {
      const resp = await fetch('/recordings/' + encodeURIComponent(filename), { method: 'DELETE' });
      if (!resp.ok) { const d = await resp.json(); throw new Error(d.error); }
      if (selectedVideo === filename) {
        selectedVideo = null;
        detailContent.innerHTML = '<div class="no-selection">Click a recording to view details and chat</div>';
      }
      setStatus('Deleted: ' + filename);
      loadRecordings();
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  }

  // Load on startup
  loadRecordings();
  loadSettings();

  async function loadSettings() {
    try {
      const resp = await fetch('/api/settings');
      const s = await resp.json();
      document.getElementById('settingLang').value = s.language || 'en';
      document.getElementById('settingThinking').checked = !!s.enable_thinking;
      document.getElementById('thinkingLabel').textContent = s.enable_thinking ? 'On' : 'Off';
      document.getElementById('settingMaxChat').value = s.max_tokens_chat || 2048;
      document.getElementById('maxChatVal').textContent = s.max_tokens_chat || 2048;
      document.getElementById('settingMaxAnalyze').value = s.max_tokens_analyze || 1024;
      document.getElementById('maxAnalyzeVal').textContent = s.max_tokens_analyze || 1024;
      autopilotEnabled = !!s.autopilot;
      document.getElementById('settingAutopilot').checked = autopilotEnabled;
      document.getElementById('autopilotLabel').textContent = autopilotEnabled ? 'On' : 'Off';
      document.getElementById('autopilotIndicator').style.display = autopilotEnabled ? 'flex' : 'none';
    } catch (_) {}
  }

  async function saveSetting(key, value) {
    try {
      const resp = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      const s = await resp.json();
      document.getElementById('thinkingLabel').textContent = s.enable_thinking ? 'On' : 'Off';
      autopilotEnabled = !!s.autopilot;
      document.getElementById('autopilotLabel').textContent = autopilotEnabled ? 'On' : 'Off';
      document.getElementById('autopilotIndicator').style.display = autopilotEnabled ? 'flex' : 'none';
      setStatus(`Setting updated: ${key} = ${JSON.stringify(value)}`);
    } catch (err) {
      setStatus('Error saving setting: ' + err.message);
    }
  }
</script>
</body>
</html>
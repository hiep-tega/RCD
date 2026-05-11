"use client";

import { use, useEffect, useState } from "react";

const PRESETS = [
    { name: 'Desktop',  width: 1200, height: 675, type: 'desktop' },
    { name: 'Laptop',   width: 1024, height: 576, type: 'desktop' },
    { name: 'Popout L', width: 800,  height: 450, type: 'desktop' },
    { name: 'Popout S', width: 400,  height: 225, type: 'desktop' },
    { name: 'Mobile L', width: 425,  height: 812, type: 'mobile'  },
    { name: 'Mobile M', width: 375,  height: 667, type: 'mobile'  },
    { name: 'Mobile S', width: 320,  height: 568, type: 'mobile'  },
  ];
  let mediaRecorder = null, recordedChunks = [], mediaStream = null;
  let timerInterval = null, startTime = 0, gameLoaded = false;
  let selectedVideo = null, pollTimer = null;
  let autopilotEnabled = false;


  const RecordAnalyzer = () => {
  const sidePanel = document.getElementById('sidePanel');
  const panelToggle = document.getElementById('panelToggle');
  let sidePanelCollapsed = false;
  let sidePanelWidth = 320;
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
  const [status, setStatus] = useState('');

  const loadGame = () => {
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
    iframe.style.width = '100%';
    iframe.style.height = '100%';
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
  const toggleSettings = () => {
    const ov = document.getElementById('settingsOverlay');
    ov.classList.toggle('active');
  }
   const toggleSidePanel = (forceState) => {
    if (forceState !== undefined) sidePanelCollapsed = !forceState;
    sidePanelCollapsed = !sidePanelCollapsed;
    sidePanel.classList.toggle('collapsed', sidePanelCollapsed);
    panelToggle.innerHTML = sidePanelCollapsed ? '&#9664;' : '&#9654;';
    // Set position immediately for collapsed (0), or use stored width for expanded
    panelToggle.style.right = sidePanelCollapsed ? '0px' : sidePanelWidth + 'px';
  }
  
function applyResolution() {
  const iframe = document.getElementById('gameIframe');
    if (!iframe) return;
  if (!resSelect.current) return;

  const selected = resSelect.current.value;

  const p = PRESETS.find(x => x.name === selected);

  if (!p) {
    console.error('Preset not found:', selected);
    return;
  }

  iframe.style.width = `${p.width}px`;
  iframe.style.height = `${p.height}px`;
}
   const startRecording = async () => {
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
  
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  }

  const onRecordingStopped = async () => {
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
      
      // 404 fetch
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
  };
    const switchTab = (tab) => {
    document.querySelectorAll('.side-tab').forEach((t, i) => {
      t.classList.toggle('active', (tab === 'list' && i === 0) || (tab === 'detail' && i === 1));
    });
    document.getElementById('tabList').classList.toggle('active', tab === 'list');
    document.getElementById('tabDetail').classList.toggle('active', tab === 'detail');
    // Auto-expand if collapsed
    if (sidePanelCollapsed) toggleSidePanel(true);
  }
  
  
  const updateTogglePosition = () => {
    panelToggle.style.right = sidePanelCollapsed ? '0px' : sidePanelWidth + 'px';
  }
  // updateTogglePosition();
  const settings = useEffect(() => {
    applyResolution();
    }, []);
    return (
    <> 

<div className="toolbar">
  <input type="text" id="urlInput" placeholder="Enter game URL (e.g. https://example.com/game)" spellCheck="false" />
  <button className="btn btn-load" onClick={loadGame}>Load</button>
  <div style={{width: '1px', height: '24px', background: '#0f3460'}}></div>
  <span className="res-label">Size:</span>
  <select className="res-select" id="resSelect" onChange={applyResolution}></select>
  <div style={{width: '1px', height: '24px', background: '#0f3460'}}></div>
  <button className="btn btn-record" id="recordBtn" onClick={startRecording} >Record</button>
  <button className="btn btn-stop" id="stopBtn" onClick={stopRecording} >Stop</button>
  <div className="rec-indicator" id="recIndicator">
    <div className="rec-dot"></div>
    <span id="recTimer">00:00</span>
  </div>
  <div style={{flex: 1}}></div>
  <div id="autopilotIndicator" className="rec-indicator" style={{display: 'none', color: '#4ecdc4'}}>
    <div className="rec-dot" style={{background: '#4ecdc4'}}></div>
    <span>Autopilot</span>
  </div>
  <button className="btn-settings" onClick={toggleSettings} title="Settings">&#9881;</button>
</div>

<div className="main">
  <div className="game-panel" id="gamePanel">
    <div className="game-placeholder" id="placeholder">
      Enter a game URL above and click <strong>Load</strong><br />
      Then click <strong>Record</strong> to start capturing
    </div>
  </div>
  <button className="panel-toggle" id="panelToggle" onClick={toggleSidePanel} title="Toggle panel">&#9654;</button>
  <div className="side-panel" id="sidePanel">
    <div className="resize-handle" id="resizeHandle"></div>
    <div className="side-tabs">
      <button className="side-tab active" onClick={() => switchTab('list')}>Recordings</button>
      <button className="side-tab" onClick={() => switchTab('detail')}>Detail / Chat</button>
    </div>
    <div className="tab-content active" id="tabList">
      <div className="recordings-list" id="recordingsList">
        <div className="empty">No recordings yet</div>
      </div>
    </div>
    <div className="tab-content" id="tabDetail">
      <div id="detailContent">
        <div className="no-selection">Click a recording to view details and chat</div>
      </div>
    </div>
  </div>
</div>

{/* <!-- Settings popup --> */}
<div className="settings-overlay" id="settingsOverlay" onClick={e => { if (e.target === e.currentTarget) toggleSettings(); }}>
  <div className="settings-popup">
    <h3>Settings <button onClick={toggleSettings}>&times;</button></h3>
    <div className="settings-panel">
      <div className="setting-group">
        <span className="setting-label">Autopilot</span>
        <div className="setting-row">
          <label className="toggle-switch">
            <input type="checkbox" id="settingAutopilot" onChange={e => saveSetting('autopilot', e.target.checked)} />
            <span className="toggle-slider"></span>
          </label>
          <span style={{fontSize: '12px', color: '#999'}} id="autopilotLabel">Off</span>
        </div>
        <span className="setting-hint">Automatically start recording when a game URL is loaded</span>
      </div>
      <div className="setting-group">
        <span className="setting-label">Language / Ngôn ngữ</span>
        <select className="setting-select" id="settingLang" onChange={e => saveSetting('language', e.target.value)}>
          <option value="en">English</option>
          <option value="vi">Tiếng Việt</option>
        </select>
        <span className="setting-hint">System prompt & analysis language</span>
      </div>
      <div className="setting-group">
        <span className="setting-label">Enable Thinking</span>
        <div className="setting-row">
          <label className="toggle-switch">
            <input type="checkbox" id="settingThinking" onChange={e => saveSetting('enable_thinking', e.target.checked)}/>
            <span className="toggle-slider"></span>
          </label>
          <span style={{fontSize: '12px', color: '#999'}} id="thinkingLabel">Off</span>
        </div>
        <span className="setting-hint">Let the model reason step-by-step before answering (slower but more accurate)</span>
      </div>
      <div className="setting-group">
        <span className="setting-label">Max Tokens (Chat)</span>
        <div className="setting-row">
          <input type="range" className="setting-input" id="settingMaxChat" min="64" max="8192" step="64"
            onInput={e => document.getElementById('maxChatVal').textContent = e.target.value}
            onChange={e => saveSetting('max_tokens_chat', parseInt(e.target.value))}/>
          <span style={{fontSize: '12px', color: '#999', minWidth: '40px'}} id="maxChatVal">2048</span>
        </div>
        <span className="setting-hint">Maximum response length for chat (64–8192)</span>
      </div>
      <div className="setting-group">
        <span className="setting-label">Max Tokens (Analyze)</span>
        <div className="setting-row">
          <input type="range" className="setting-input" id="settingMaxAnalyze" min="64" max="4096" step="64"
            onInput={e => document.getElementById('maxAnalyzeVal').textContent = e.target.value}
            onChange={e => saveSetting('max_tokens_analyze', parseInt(e.target.value))}/>
          <span style={{fontSize: '12px', color: '#999', minWidth: '40px'}} id="maxAnalyzeVal">1024</span>
        </div>
        <span className="setting-hint">Maximum response length for auto-analysis (64–4096)</span>
      </div>
    </div>
  </div>
</div>

<div className="status-bar" id="statusBar">Ready</div>

<div className="overlay" id="overlay">
  <div className="spinner"></div>
  <p id="overlayMsg">Converting to MP4...</p>
</div>

    </>
  )
}

export default RecordAnalyzer
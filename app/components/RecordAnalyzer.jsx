"use client";
import {useCallback, useEffect, useState } from "react";
import RecordItem from "./RecordItem";
import DetailItem from "./DetailItem";
import "../utils/save_reponse_v1";

const BASE_API = process.env.NEXT_PUBLIC_BASE_API || "/api";
const DATA_JSON = process.env.DATA_JSON;
const UPLOAD_DIR = process.env.UPLOAD_DIR;
import JSONCapture from "../..//utils/JSONCapture";

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
let sidePanelCollapsed = false;
let sidePanelWidth = 320;

const RecordAnalyzer = () => {

  const [collapsed, setCollapsed] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [detailVideo, setDetailVideo] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  // const [status, setStatus] = useState('');

  const loadResolution = () => {
    PRESETS.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${p.name} (${p.width}\u00d7${p.height})`;
      resSelect.appendChild(opt);
    });
  }

  const startCrawler = async () => {
  const url = document.getElementById('urlInput').value;

  await fetch('/api/crawl/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });
};

  const loadGame = () => {
    let url = document.getElementById('urlInput').value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    document.getElementById('urlInput').value = url;
    const old = gamePanel.querySelector('iframe');
    if (old) old.remove();
    placeholder.style.display = 'none';
    const iframe = document.createElement('iframe');
    //
    iframe.id = 'gameIframe';
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.allow = 'display-capture; autoplay; fullscreen; microphone; camera';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-top-navigation');
    gamePanel.appendChild(iframe);

    /// decompostite
    //startCrawler();

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
  const updateTimer = () => {
   const s = Math.floor((Date.now() - startTime) / 1000);
   recTimer.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  const toggleSidePanel = (forceState) => {
    if (forceState !== undefined) sidePanelCollapsed = !forceState;
    setCollapsed(prev => !prev);
    updateTogglePosition();
  }
  
const applyResolution = () => {
 const iframe = document.getElementById('gameIframe');
    if (!iframe) return;
    const p = PRESETS[resSelect.value];
    iframe.style.width = p.width + 'px';
    iframe.style.height = p.height + 'px';
    
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
    console.log('Recording stopped, chunks:', recordedChunks);
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
      
      const resp = await fetch(`${BASE_API}/convert`, { method: 'POST', body: fd });
      
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
  
const loadRecordings = useCallback(async () => {
  try {
    const resp = await fetch(`${BASE_API}/recordings`);
    const items = await resp.json();

    setRecordings(items);

    if (items.some(v => v.status === "analyzing") && !pollTimer) {
      pollTimer = setInterval(loadRecordings, 3000);
    } else if (!items.some(v => v.status === "analyzing") && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;

      if (selectedVideo) showDetail(selectedVideo);
    }
    return 
  } catch (e) {}
}, []);
    const selectVideo = async (filename) => {
    selectedVideo = filename;
    document.querySelectorAll('.rec-item').forEach(el => {
      const titleEl = el.querySelector('.rec-title');
      el.classList.toggle('selected', titleEl && titleEl.title === filename);
    });
    switchTab('detail');
    await showDetail(filename);
  }
    const switchTab = (tab) => {
    document.querySelectorAll('.side-tab').forEach((t, i) => {
      t.classList.toggle('active', (tab === 'list' && i === 0) || (tab === 'detail' && i === 1));
    });
    document.getElementById('tabList').classList.toggle('active', tab === 'list');
    document.getElementById('tabDetail').classList.toggle('active', tab === 'detail');
    // Auto-expand if collapsed
    if (sidePanelCollapsed) toggleSidePanel(true);
  }
  const deleteRecording = async (filename) => {
    if (!confirm('Delete ' + filename + '?')) return;
    try {
      const resp = await fetch(`${BASE_API}/video/` + encodeURIComponent(filename), { method: 'DELETE' });
      if (!resp.ok) { const d = await resp.json(); throw new Error(d.error); }
      if (selectedVideo === filename) {
        selectedVideo = null;
        setDetailVideo(null);
        setDetailError("");
        setDetailLoading(false);
      }
      setStatus('Deleted: ' + filename);
      loadRecordings();
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  }
  const renameRecording = async (filename) => {
    const baseName = filename.replace(/\.webm$/i, '');
    const newBase = prompt('Rename recording:', baseName);
    if (!newBase || newBase === baseName) return;
    const newName = newBase.endsWith('.webm') ? newBase : newBase + '.webm';
    try {
      const resp = await fetch(`${BASE_API}/video/` + encodeURIComponent(filename), {
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
  
  const showDetail = async (filename) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      const infoResp = await fetch(`${BASE_API}/video/` + encodeURIComponent(filename));
      if (!infoResp.ok) {
        const errData = await infoResp.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load video detail');
      }

      const info = await infoResp.json();
      setDetailVideo(info.video || null);
    } catch (err) {
      setDetailVideo(null);
      setDetailError(err.message || "Failed to load video detail");
    } finally {
      setDetailLoading(false);
    }
  }

  const handlePost = async (e) => {
    if (e.data?.type === 'recording_saved') {
      setStatus(`Saved: ${e.data.filename} - AI analyzing...`);
      loadRecordings();
    }
  }
  
  const updateTogglePosition = () => {
    const sidePanel = document.getElementById('sidePanel');
    panelToggle.style.right = collapsed ? sidePanel.offsetWidth + 'px' :'0px' ;
  }
  const setStatus = (msg) => { statusBar.textContent = msg; }
  
  const escapeHtml = (text) => {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  }
  
  const initResizeHandle = () => {
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
  };


  useEffect(() => {
    const sidePanel = document.getElementById('sidePanel');
    const panelToggle = document.getElementById('panelToggle');
    
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
    
    const resSelect = document.getElementById('resSelect');
    
    applyResolution();
    loadRecordings();
    initResizeHandle();
    loadResolution();

    fetch(`${BASE_API}/watch-api`, { method: "POST" })
      .then(r => r.json())
      .then(data => {
        if (!data?.success) {
          setStatus(`Watcher error: ${data?.error || "unknown"}`);
        }
      })
      .catch((e) => {
        setStatus(`Watcher error: ${e?.message || "cannot connect to Chrome 9222"}`);
      });

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
  <button
  style={{right: collapsed ? '0px' : sidePanelWidth + 'px'}}
   className="panel-toggle" id="panelToggle" onClick={toggleSidePanel} title="Toggle panel">&#9654;</button>
  <div className={`side-panel ${collapsed ? "collapsed" : ""}`} id="sidePanel">
    <div className="resize-handle" id="resizeHandle"></div>
    <div className="side-tabs">
      <button className="side-tab active" onClick={() => switchTab('list')}>Recordings</button>
      <button className="side-tab" onClick={() => switchTab('detail')}>Detail / Chat</button>
    </div>
    <div className="tab-content active" id="tabList">
      <div className="recordings-list" id="recordingsList">
        <div className="recordings-list">
  {recordings.length === 0 ? (
    <div className="empty">No recordings yet</div>
  ) : (
    recordings.map(v => {
      const sel = selectedVideo === v.filename ? " selected" : "";

      const statusCls =
        v.status === "analyzing"
          ? " analyzing"
          : v.status === "ready"
          ? " ready"
          : v.status === "error"
          ? " error"
          : "";

      let statusText = "New";
      if (v.status === "analyzing") statusText = "⏳ Analyzing...";
      else if (v.status === "ready")
        statusText =
          v.summary?.substring(0, 60) +
          (v.summary?.length > 60 ? "..." : "") || "Ready";
      else if (v.status === "error") statusText = "⚠ Error";

      return (
        <RecordItem
          key={v.filename}
          sel={sel}
          v={v}
          statusCls={statusCls}
          statusText={statusText}
          selectVideo={selectVideo}
          deleteRecording={deleteRecording}
          renameRecording={renameRecording}
          stopPropagation={e => e.stopPropagation()}
        />
      );
    })
  )}
</div>
      </div>
    </div>
    <div className="tab-content" id="tabDetail">
      <div id="detailContent">
        {detailLoading ? (
          <div className="no-selection">Loading...</div>
        ) : detailError ? (
          <div className="no-selection">Error: {detailError}</div>
        ) : detailVideo ? (
          <DetailItem video={detailVideo} />
        ) : (
          <div className="no-selection">Click a recording to view details and chat</div>
        )}
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
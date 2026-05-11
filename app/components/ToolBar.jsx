const ToolBar = () => {
    return (
        <>
        <div class="toolbar">
            <input type="text" id="urlInput" placeholder="Enter game URL (e.g. https://example.com/game)" spellcheck="false"/>
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
        </>
        )
}
export default ToolBar;
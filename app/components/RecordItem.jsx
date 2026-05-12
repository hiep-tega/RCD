"use client";

const RecordItem = ({ sel, esc, v, statusCls, statusText, 
  selectVideo, renameRecording, deleteRecording, stopPropagation, 
 }) => {
  const fileName = v.filename;
  const fileUrl = v.url || `/uploads/${encodeURIComponent(fileName)}`;

  return (<>    
  <div className={`rec-item${sel}`} onClick={() => selectVideo(fileName)}>
    <div className="rec-info">
      <div className="rec-title" title={fileName}>{v.title || fileName}</div>
      <div className={`rec-status${statusCls}`}>{statusText}</div>
    </div>
    <br />
    <div className="rec-actions">
      <a href={fileUrl} download className="btn-icon" title="Download" onClick={(e) => e.stopPropagation()}>{'\u2b07'}</a>
      <button className="btn-icon" onClick={(e) => { e.stopPropagation(); renameRecording(fileName); }} title="Rename">{'\u270e'}</button>
      <button className="btn-icon del" onClick={(e) => { e.stopPropagation(); deleteRecording(fileName); }} title="Delete">{'\u00d7'}</button>
    </div>
  </div>
  </>)
}

export default RecordItem;
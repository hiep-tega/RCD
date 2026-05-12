"use client";

const DetailItem = ({ video }) => {
  const fileName = video?.filename || "Unknown";
  const status = video?.status || "unknown";
  const createdAt = video?.createdAt
    ? new Date(video.createdAt).toLocaleString()
    : "Unknown";
  const fileUrl = video?.url || (video?.filename ? `/uploads/${encodeURIComponent(video.filename)}` : "");

  return (
    <div className="detail-panel">
      <div className="detail-header">
          <div className="detail-title" onClick={() => editTitle(fileName)} title="Click to edit title">{fileName}</div>
          {/* <div className="detail-title" onClick="editTitle('${esc}')" title="Click to edit title">${info?.title || filename}</div>
          <div className="detail-summary">${info?.summary || (info?.status === 'analyzing' ? '\u23f3 AI is analyzing...' : 'No summary yet')}</div>
          <div className="detail-meta">${res} \u00b7 ${dur} \u00b7 ${info?.status}</div> */}
          <div className="detail-meta">Status: {status}</div>
          <div className="detail-meta">Created: {createdAt}</div>
          <div className="detail-actions">
            <button className="btn-sm" >{'\ud83d'} {'\udd04'} Re-analyze</button>
            <button className="btn-sm" >{'\ud83d'} {'\uddd1'} Clear chat</button>
            {/* <button className="btn-sm" onClick="reanalyze('${esc}')">{'\ud83d'} {'\udd04'} Re-analyze</button>
            <button className="btn-sm" onClick="clearChat('${esc}')">{'\ud83d'} {'\uddd1'} Clear chat</button> */}
            <a href="/recordings/${encodeURIComponent(filename)}" download className="btn-sm">{'\u2b07'} Download</a>
          </div>

        {fileUrl ? (
          <div className="detail-meta">
            URL: <a href={fileUrl} target="_blank" rel="noreferrer">{fileUrl}</a>
          </div>
        ) : null}
      </div>
      {fileUrl ? (
        <div className="detail-preview">
          <video className="detail-video" controls src={fileUrl}>
            Your browser does not support the video tag.
          </video>
        </div>
      ) : (
        <div className="no-selection">Video URL not available.</div>
      )}
    </div>
  );
};

export default DetailItem
const JSONCapture = () => {
  const logs = [];

  // -----------------------------
  // FETCH INTERCEPT
  // -----------------------------
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const clone = response.clone();

      let body;

      try {
        body = await clone.json();
      } catch {
        body = await clone.text();
      }

      const entry = {
        type: 'fetch',
        url: args[0],
        method: (args[1] && args[1].method) || 'GET',
        time: new Date().toISOString(),
        status: response.status,
        requestBody: args[1]?.body || null,
        response: body,
      };

      logs.push(entry);

      console.log('FETCH CAPTURED', entry);
    } catch (e) {
      console.error(e);
    }

    return response;
  };

  // -----------------------------
  // XHR INTERCEPT
  // -----------------------------
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url;
    this._method = method;

    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    this._requestBody = body;

    this.addEventListener('load', function () {
      try {
        let response;

        try {
          response = JSON.parse(this.responseText);
        } catch {
          response = this.responseText;
        }

        const entry = {
          type: 'xhr',
          url: this._url,
          method: this._method,
          time: new Date().toISOString(),
          status: this.status,
          requestBody: this._requestBody || null,
          response,
        };

        logs.push(entry);

        console.log('XHR CAPTURED', entry);
      } catch (e) {
        console.error(e);
      }
    });

    return originalSend.apply(this, arguments);
  };

  // -----------------------------
  // DOWNLOAD JSON FILE
  // -----------------------------
  window.saveCapturedResponses = () => {
    const blob = new Blob(
      [JSON.stringify(logs, null, 2)],
      { type: 'application/json' }
    );

    const a = document.createElement('a');

    a.href = URL.createObjectURL(blob);
    a.download = 'captured_responses.json';
    a.click();

    URL.revokeObjectURL(a.href);
  };

  console.log('Network interceptor installed');
}

module.exports = JSONCapture;
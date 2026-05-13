if (typeof window !== "undefined" && !window.__saveResponseHookInstalled) {
  window.__saveResponseHookInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    try {
      const url = args[0]?.toString();
      const options = args[1] || {};
      const method = (options.method || "GET").toUpperCase();

      if (
        method === "POST" &&
        url.includes(
          "swiftplay.slotgen.com/api/slotadventurer/v1"
        )
      ) {
        const cloned = response.clone();

        let data;
        try {
          data = await cloned.json();
        } catch {
          data = await cloned.text();
        }

        console.log("TARGET RESPONSE:", data);

        // save JSON
        await originalFetch("/api/saved-json", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            timestamp: Date.now(),
            endpoint: url,
            data,
          }),
        });
      }
    } catch (err) {
      console.error(err);
    }

    return response;
  };
}
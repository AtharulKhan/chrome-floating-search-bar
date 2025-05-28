chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SEARCH_BAR" });
});

// Handle search requests from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SEARCH_BOOKMARKS") {
    chrome.bookmarks.search(msg.query, (results) => sendResponse(results));
    return true;
  }
  if (msg.type === "SEARCH_TABS") {
    chrome.tabs.query({}, (tabs) => {
      const lower = msg.query.toLowerCase();
      const filtered = tabs.filter(
        (tab) =>
          (tab.title && tab.title.toLowerCase().includes(lower)) ||
          (tab.url && tab.url.toLowerCase().includes(lower))
      );
      sendResponse(filtered);
    });
    return true;
  }
  if (msg.type === "SEARCH_HISTORY") {
    const startTime = Date.now() - 1000 * 60 * 60 * 24 * 30;
    chrome.history.search(
      { text: msg.query, startTime, maxResults: 30 },
      (results) => sendResponse(results)
    );
    return true;
  }
});

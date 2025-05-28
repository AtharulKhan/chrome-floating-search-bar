let searchBarOverlay = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "TOGGLE_SEARCH_BAR") {
    if (searchBarOverlay && document.body.contains(searchBarOverlay)) {
      searchBarOverlay.remove();
      searchBarOverlay = null;
    } else {
      injectSearchBar();
    }
  }
});

function injectSearchBar() {
  if (searchBarOverlay) return;

  // Create overlay
  searchBarOverlay = document.createElement("div");
  searchBarOverlay.id = "floating-search-bar-overlay";
  searchBarOverlay.innerHTML = `
    <div id="floating-bar">
      <div id="options">
        <label class="option">
          <input type="checkbox" id="opt-bookmarks" checked />
          <span>Favourites</span>
        </label>
        <label class="option">
          <input type="checkbox" id="opt-tabs" checked />
          <span>Tabs</span>
        </label>
        <label class="option">
          <input type="checkbox" id="opt-history" checked />
          <span>History</span>
        </label>
        <label class="option" style="margin-left:18px;">
          <input type="checkbox" id="opt-regex" />
          <span>Regex search</span>
        </label>
      </div>
      <input
        type="text"
        id="search-input"
        placeholder="Search bookmarks, tabs, or history..."
        autocomplete="off"
        autofocus
      />
      <ul id="results"></ul>
    </div>
  `;

  // Overlay styles
  Object.assign(searchBarOverlay.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 2147483647,
    background: "rgba(30,34,50,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(2px)",
  });

  // Prevent scrolling when overlay is open
  document.body.style.overflow = "hidden";
  searchBarOverlay.addEventListener("click", (e) => {
    if (e.target === searchBarOverlay) {
      removeOverlay();
    }
  });

  document.body.appendChild(searchBarOverlay);

  // Inject styles
  injectSearchBarStyles();

  // Focus input
  const searchInput = searchBarOverlay.querySelector("#search-input");
  if (searchInput) searchInput.focus();

  // Logic
  setupSearchBarLogic(searchBarOverlay);
}

function removeOverlay() {
  if (searchBarOverlay) {
    searchBarOverlay.remove();
    searchBarOverlay = null;
    document.body.style.overflow = "";
  }
}

// Inject CSS for the floating bar
function injectSearchBarStyles() {
  if (document.getElementById("floating-search-bar-style")) return;
  const style = document.createElement("style");
  style.id = "floating-search-bar-style";
  style.textContent = `
  #floating-search-bar-overlay {
    animation: overlay-fade-in 0.22s cubic-bezier(.4,0,.2,1);
  }
  @keyframes overlay-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  #floating-bar {
    background: rgba(255,255,255,0.82);
    border-radius: 22px;
    box-shadow: 0 8px 32px rgba(60, 60, 90, 0.18), 0 1.5px 6px rgba(0,0,0,0.07);
    max-width: 720px;
    min-width: 420px;
    width: 100%;
    padding: 18px 38px 16px 38px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    backdrop-filter: blur(14px);
    border: 1.5px solid rgba(180, 185, 210, 0.18);
    position: relative;
    z-index: 10;
    opacity: 0;
    transform: translateY(24px) scale(0.98);
    animation: bar-fade-in 0.32s cubic-bezier(.4,0,.2,1) forwards;
  }
  @keyframes bar-fade-in {
    from {
      opacity: 0;
      transform: translateY(32px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  #results li {
    opacity: 0;
    transform: translateY(12px);
    animation: result-fade-in 0.28s cubic-bezier(.4,0,.2,1) forwards;
    animation-delay: 0.08s;
  }
  #results li:nth-child(1) { animation-delay: 0.08s; }
  #results li:nth-child(2) { animation-delay: 0.12s; }
  #results li:nth-child(3) { animation-delay: 0.16s; }
  #results li:nth-child(4) { animation-delay: 0.20s; }
  #results li:nth-child(5) { animation-delay: 0.24s; }
  @keyframes result-fade-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .result-meta {
    font-size: 12px;
    color: #a0a4b0;
    margin-left: 6px;
    margin-top: 2px;
    word-break: break-all;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .popup-btn {
    display: none;
    position: absolute;
    right: 18px;
    top: 50%;
    transform: translateY(-50%);
    background: #f5f6fa;
    color: #5a6cff;
    border: none;
    border-radius: 7px;
    font-size: 13px;
    padding: 4px 12px;
    box-shadow: 0 1px 4px rgba(60,60,90,0.07);
    cursor: pointer;
    opacity: 0.92;
    transition: opacity 0.13s, background 0.13s;
    z-index: 2;
  }
  #results li:hover .popup-btn,
  #results li:focus .popup-btn {
    display: block;
    opacity: 1;
  }
  #results li {
    position: relative;
  }
  .result-domain {
    color: #b0b4c0;
    font-size: 12px;
    margin-right: 8px;
  }
  .result-folder {
    color: #b0b4c0;
    font-size: 12px;
    margin-right: 8px;
    font-style: italic;
  }
  .result-url {
    color: #b0b4c0;
    font-size: 11px;
    margin-right: 8px;
    opacity: 0.7;
  }
  .result-badge {
    background: #e6e8f0;
    color: #7a7e8c;
    font-size: 11px;
    border-radius: 6px;
    padding: 2px 8px;
    margin-left: 4px;
    font-weight: 500;
    letter-spacing: 0.02em;
    display: inline-block;
  }
  #options {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    justify-content: center;
  }
  .option {
    display: flex;
    align-items: center;
    font-size: 15px;
    color: #222;
    background: #f5f6fa;
    border-radius: 8px;
    padding: 4px 10px;
    cursor: pointer;
    transition: background 0.15s;
    user-select: none;
  }
  .option:hover,
  .option input:focus + span {
    background: #e6e8f0;
  }
  .option input[type="checkbox"] {
    accent-color: #5a6cff;
    margin-right: 6px;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: none;
    outline: none;
  }
  #search-input {
    font-size: 18px;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1.5px solid #e0e3ea;
    background: #f8fafd;
    outline: none;
    margin-bottom: 14px;
    transition: border 0.15s, box-shadow 0.15s;
    box-shadow: 0 1px 2px rgba(60,60,90,0.04);
  }
  #search-input:focus {
    border: 1.5px solid #5a6cff;
    box-shadow: 0 2px 8px rgba(90,108,255,0.07);
  }
  #results {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 260px;
    overflow-y: auto;
  }
  #results li {
    padding: 10px 12px;
    border-radius: 8px;
    margin-bottom: 4px;
    font-size: 15px;
    color: #222;
    background: #f5f6fa;
    cursor: pointer;
    transition: background 0.13s;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  #results li:hover,
  #results li:focus {
    background: #e6e8f0;
  }
  #results .result-type {
    font-size: 12px;
    color: #7a7e8c;
    background: #e0e3ea;
    border-radius: 6px;
    padding: 2px 7px;
    margin-right: 6px;
    font-weight: 500;
    letter-spacing: 0.03em;
  }
  `;
  document.head.appendChild(style);
}

// Search bar logic (same as popup.js, adapted for content script)
function setupSearchBarLogic(root) {
  const options = {
    bookmarks: root.querySelector("#opt-bookmarks"),
    tabs: root.querySelector("#opt-tabs"),
    history: root.querySelector("#opt-history"),
  };
  const searchInput = root.querySelector("#search-input");
  const resultsList = root.querySelector("#results");

  // Load saved options from chrome.storage
  chrome.storage.sync.get(["searchOptions"], ({ searchOptions }) => {
    if (searchOptions) {
      options.bookmarks.checked = !!searchOptions.bookmarks;
      options.tabs.checked = !!searchOptions.tabs;
      options.history.checked = !!searchOptions.history;
    } else {
      // Default: all checked
      options.bookmarks.checked = true;
      options.tabs.checked = true;
      options.history.checked = true;
    }
    // Ensure search runs after checkboxes are set
    triggerSearch();
  });

  // Save options to chrome.storage when changed
  Object.values(options).forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      chrome.storage.sync.set({
        searchOptions: {
          bookmarks: options.bookmarks.checked,
          tabs: options.tabs.checked,
          history: options.history.checked,
        },
      });
      triggerSearch();
    });
  });

  // Debounce search input
  let debounceTimer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(triggerSearch, 120);
  });

  // Initial search on load
  setTimeout(triggerSearch, 0);

  // Keyboard: Escape closes overlay
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      removeOverlay();
    }
  });

  // Focus trap: keep focus in input
  root.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      searchInput.focus();
    }
  });

  async function triggerSearch() {
    const query = searchInput.value.trim();
    const selected = {
      bookmarks: options.bookmarks.checked,
      tabs: options.tabs.checked,
      history: options.history.checked,
    };
    const regexMode = document.getElementById("opt-regex")?.checked;

    if (!query) {
      resultsList.innerHTML = "";
      return;
    }

    // Precedence: bookmarks > tabs > history
    let results = [];

    // Helper for case-insensitive substring match
    const matches = (str, q) =>
      str && q && str.toLowerCase().includes(q.toLowerCase());

    // Helper for regex match (title only)
    let regex = null;
    if (regexMode) {
      try {
        regex = new RegExp(query, "i");
      } catch {
        // Invalid regex, show no results
        renderResults([]);
        return;
      }
    }

    // Search bookmarks
    if (selected.bookmarks) {
      const bookmarks = await searchBookmarks(query);
      results = results.concat(
        bookmarks
          .filter((b) =>
            regexMode
              ? regex && (regex.test(b.title || "") || regex.test(b.url || ""))
              : matches(b.title, query) || matches(b.url, query)
          )
          .map((b) => ({
            type: "FAV",
            title: b.title,
            url: b.url,
            id: b.id,
          }))
      );
    }
    // Search tabs
    if (selected.tabs) {
      const tabs = await searchTabs(query);
      results = results.concat(
        tabs
          .filter((t) =>
            regexMode
              ? regex && (regex.test(t.title || "") || regex.test(t.url || ""))
              : matches(t.title, query) || matches(t.url, query)
          )
          .map((t) => ({
            type: "TAB",
            title: t.title,
            url: t.url,
            lastAccessed: t.lastAccessed,
          }))
      );
    }
    // Search history (only if query is at least 2 characters, per Chrome API)
    if (selected.history && query.length >= 2) {
      const history = await searchHistory(query);
      results = results.concat(
        history
          .filter(
            (h) =>
              h.url &&
              (regexMode
                ? regex &&
                  (regex.test(h.title || "") || regex.test(h.url || ""))
                : matches(h.title, query) || matches(h.url, query))
          )
          .map((h) => ({
            type: "HIST",
            title: h.title,
            url: h.url,
            lastVisitTime: h.lastVisitTime,
          }))
      );
    }

    // Remove duplicates by URL, keep first occurrence (by precedence)
    const seen = new Set();
    const deduped = results.filter((item) => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    renderResults(deduped);
  }

  function renderResults(items) {
    resultsList.innerHTML = "";
    if (!items.length) {
      resultsList.innerHTML =
        '<li style="color:#888;text-align:center;">No results found</li>';
      return;
    }
    for (const item of items) {
      const li = document.createElement("li");
      li.tabIndex = 0;

      // Extract domain and url
      let domain = "";
      let url = item.url || "";
      try {
        if (url) domain = new URL(url).hostname.replace(/^www\./, "");
      } catch {}

      // Folder path (for bookmarks)
      let folderPath = "";
      let popupBtnHTML = `<button class="popup-btn" tabindex="-1" title="Open in popup window">Open in popup window</button>`;

      if (item.type === "FAV" && item.id) {
        // Async fetch, so show placeholder and update later
        li.innerHTML =
          renderResultHTML(item, domain, url, folderPath, null) + popupBtnHTML;
        getBookmarkFolderPath(item.id).then((path) => {
          li.querySelector(".result-folder").textContent = path
            ? path + " /"
            : "";
        });
        // Fetch last visit time from history for this bookmark's URL
        if (url) {
          chrome.runtime.sendMessage(
            { type: "SEARCH_HISTORY", query: url },
            (results) => {
              let lastVisit = null;
              if (results && results.length) {
                // Find the most recent visit time for this URL
                lastVisit = results
                  .filter((h) => h.url === url && h.lastVisitTime)
                  .map((h) => h.lastVisitTime)
                  .sort((a, b) => b - a)[0];
              }
              if (lastVisit) {
                const badge = li.querySelector(".result-badge");
                if (badge) {
                  badge.textContent = formatDateBadge(lastVisit);
                } else {
                  // Insert badge if not present
                  const meta = li.querySelector(".result-meta");
                  if (meta) {
                    meta.insertAdjacentHTML(
                      "beforeend",
                      `<span class="result-badge">${formatDateBadge(
                        lastVisit
                      )}</span>`
                    );
                  }
                }
              }
            }
          );
        }
      } else {
        // Last opened badge (for tabs/history)
        let lastOpened = null;
        if (item.type === "TAB" && item.lastAccessed) {
          lastOpened = formatDateBadge(item.lastAccessed);
        }
        if (item.type === "HIST" && item.lastVisitTime) {
          lastOpened = formatDateBadge(item.lastVisitTime);
        }
        li.innerHTML =
          renderResultHTML(item, domain, url, folderPath, lastOpened) +
          popupBtnHTML;
      }

      li.addEventListener("click", () => {
        if (item.url) window.open(item.url, "_blank");
      });
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && item.url) window.open(item.url, "_blank");
      });

      // Popup button logic
      const popupBtn = li.querySelector(".popup-btn");
      if (popupBtn) {
        popupBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (item.url) {
            // Center the popup window
            const w = 900,
              h = 700;
            const dualScreenLeft =
              window.screenLeft !== undefined
                ? window.screenLeft
                : window.screenX;
            const dualScreenTop =
              window.screenTop !== undefined
                ? window.screenTop
                : window.screenY;
            const width = window.innerWidth
              ? window.innerWidth
              : document.documentElement.clientWidth
              ? document.documentElement.clientWidth
              : screen.width;
            const height = window.innerHeight
              ? window.innerHeight
              : document.documentElement.clientHeight
              ? document.documentElement.clientHeight
              : screen.height;
            const left = dualScreenLeft + Math.max(0, (width - w) / 2);
            const top = dualScreenTop + Math.max(0, (height - h) / 2);
            window.open(
              item.url,
              "_blank",
              `popup,width=${w},height=${h},left=${left},top=${top},noopener,noreferrer`
            );
          }
        });
      }

      resultsList.appendChild(li);
    }
  }

  // Helper to render result HTML with metadata
  function renderResultHTML(item, domain, url, folderPath, lastOpened) {
    return `
      <span class="result-type">${item.type}</span>
      <span class="result-title" style="flex:1;">${escapeHTML(
        item.title || url || ""
      )}</span>
      <svg width="16" height="16" style="margin-left:4px;opacity:0.5;" viewBox="0 0 20 20"><path fill="currentColor" d="M7.05 4.05a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 1 1-1.06-1.06L11.19 10 7.05 5.86a.75.75 0 0 1 0-1.06z"/></svg>
      <div class="result-meta">
        ${
          folderPath
            ? `<span class="result-folder">${escapeHTML(folderPath)} /</span>`
            : ""
        }
        ${
          domain
            ? `<span class="result-domain">${escapeHTML(domain)}</span>`
            : ""
        }
        ${url ? `<span class="result-url">${escapeHTML(url)}</span>` : ""}
        ${lastOpened ? `<span class="result-badge">${lastOpened}</span>` : ""}
      </div>
    `;
  }

  // Helper to get bookmark folder path by id
  function getBookmarkFolderPath(bookmarkId) {
    return new Promise((resolve) => {
      chrome.bookmarks.get(bookmarkId, (nodes) => {
        if (!nodes || !nodes.length) return resolve("");
        let node = nodes[0];
        let path = [];
        function traverseParent(id) {
          chrome.bookmarks.get(id, (parents) => {
            if (
              parents &&
              parents[0] &&
              parents[0].parentId &&
              parents[0].title
            ) {
              if (parents[0].parentId !== "0") {
                path.unshift(parents[0].title);
                traverseParent(parents[0].parentId);
              } else {
                resolve(path.join(" / "));
              }
            } else {
              resolve(path.join(" / "));
            }
          });
        }
        if (node.parentId && node.parentId !== "0") {
          traverseParent(node.parentId);
        } else {
          resolve("");
        }
      });
    });
  }

  // Helper to format last opened date as badge
  function formatDateBadge(ts) {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return Math.floor(diff / 60000) + " min ago";
    if (diff < 86400000) return Math.floor(diff / 3600000) + " hr ago";
    return d.toLocaleDateString();
  }

  // Search helpers
  function searchBookmarks(query) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "SEARCH_BOOKMARKS", query },
        (results) => {
          resolve((results || []).filter((b) => b.url));
        }
      );
    });
  }

  function searchTabs(query) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "SEARCH_TABS", query }, (results) => {
        resolve(results || []);
      });
    });
  }

  function searchHistory(query) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "SEARCH_HISTORY", query },
        (results) => {
          resolve((results || []).filter((h) => h.url));
        }
      );
    });
  }

  // Escape HTML for safe rendering
  function escapeHTML(str) {
    let s = str;
    s = s.replace(/&/g, "\u0026amp;");
    s = s.replace(/</g, "\u0026lt;");
    s = s.replace(/>/g, "\u0026gt;");
    s = s.replace(/"/g, "\u0026quot;");
    return s;
  }
}

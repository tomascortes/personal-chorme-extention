// ═══════════════════════════════════
//  personal extention: Favicon Replacer
// ═══════════════════════════════════
(() => {
  if (window.__personalFaviconLoaded) return;
  window.__personalFaviconLoaded = true;

  const LINK_ATTR = "data-personal-favicon";
  const ALL_KEYS = ["favicon_enabled", "favicon_overrides"];

  let _enabled = true;
  let _url = "";
  let _observer = null;
  let _applying = false;

  function getHost() {
    return location.hostname || "";
  }

  function isUsableUrl(url) {
    try {
      const parsed = new URL(url);
      return ["http:", "https:", "data:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  function ensureHead(callback) {
    if (document.head) {
      callback();
      return;
    }
    requestAnimationFrame(() => ensureHead(callback));
  }

  function removeIcon() {
    if (!document.head) return;
    document.querySelectorAll(`link[${LINK_ATTR}]`).forEach((link) => link.remove());
  }

  function applyIcon() {
    if (_applying || !document.head) return;
    const shouldResumeObserver = !!_observer;
    if (_observer) {
      _observer.disconnect();
      _observer = null;
    }

    _applying = true;

    removeIcon();

    if (_enabled && _url && isUsableUrl(_url)) {
      const icon = document.createElement("link");
      icon.setAttribute(LINK_ATTR, "true");
      icon.rel = "icon";
      icon.type = _url.startsWith("data:image/svg") || _url.endsWith(".svg") ? "image/svg+xml" : "image/png";
      icon.href = _url;
      document.head.appendChild(icon);
    }

    _applying = false;
    if (shouldResumeObserver) startObserver();
  }

  function startObserver() {
    if (_observer || !document.head) return;
    _observer = new MutationObserver(() => {
      if (_applying || !_enabled || !_url) return;
      applyIcon();
    });
    _observer.observe(document.head, { childList: true, subtree: true });
  }

  function setState(enabled, url) {
    _enabled = enabled !== false;
    _url = url || "";
    ensureHead(() => {
      applyIcon();
      startObserver();
    });
  }

  function loadState() {
    const host = getHost();
    if (!host) return;

    chrome.storage.local.get(ALL_KEYS, (data) => {
      const overrides = data.favicon_overrides || {};
      setState(data.favicon_enabled !== false, overrides[host] || "");
    });
  }

  loadState();

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== "favicon_update") return;
    setState(msg.enabled, msg.url);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!changes.favicon_enabled && !changes.favicon_overrides) return;
    loadState();
  });
})();

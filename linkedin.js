// ═══════════════════════════════════
//  superlevels: LinkedIn Suggestion Filter
// ═══════════════════════════════════
(() => {
  if (window.__slLinkedInFilterLoaded) return;
  window.__slLinkedInFilterLoaded = true;

  const STYLE_ID = "sl-linkedin";
  const HIDDEN_ATTR = "data-sl-linkedin-hidden";
  const OBSERVER_DELAY_MS = 100;

  const SUGGESTION_LABELS = new Set([
    "sugerencias",
    "suggested",
    "suggestions",
  ]);

  const FEED_HEADING_LABELS = new Set([
    "publicacion en el feed",
    "feed post",
  ]);

  const ALL_KEYS = ["linkedin_enabled", "linkedin_suggestions"];

  let _enabled = true;
  let _features = { suggestions: true };
  let _observer = null;
  let _scanTimer = 0;
  let _lastUrl = location.href;
  let _pendingScanRoot = null;

  function normalizeText(text) {
    return (text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      [${HIDDEN_ATTR}="suggestion"] {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function removeStyle() {
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  }

  function removeHiddenPosts() {
    document.querySelectorAll(`[${HIDDEN_ATTR}]`).forEach((el) => {
      el.removeAttribute(HIDDEN_ATTR);
    });
  }

  function getElements(el, selector) {
    const elements = [];
    if (el.matches && el.matches(selector)) elements.push(el);
    elements.push(...el.querySelectorAll(selector));
    return elements;
  }

  function hasFeedHeading(el) {
    return getElements(el, "h2").some((heading) =>
      FEED_HEADING_LABELS.has(normalizeText(heading.textContent))
    );
  }

  function hasHideButton(el) {
    return getElements(el, "button[aria-label]").some((button) => {
      const label = normalizeText(button.getAttribute("aria-label"));
      return label.startsWith("ocultar la publicacion") ||
        label.startsWith("hide post") ||
        label.startsWith("hide the post");
    });
  }

  function hasFeedActions(el) {
    const text = normalizeText(el.textContent);
    return (
      text.includes("recomendar") ||
      text.includes("comentar") ||
      text.includes("compartir") ||
      text.includes("like") ||
      text.includes("comment") ||
      text.includes("repost") ||
      text.includes("share")
    );
  }

  function isLikelyFeedPost(el, labelEl) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (!el.contains(labelEl)) return false;
    return hasFeedHeading(el) && hasHideButton(el) && hasFeedActions(el);
  }

  function findFeedPost(labelEl) {
    let current = labelEl;
    let fallback = null;

    for (let depth = 0; current && depth < 20; depth++) {
      if (current.nodeType !== Node.ELEMENT_NODE) {
        current = current.parentElement;
        continue;
      }

      if (!fallback && hasFeedHeading(current) && hasHideButton(current)) {
        fallback = current;
      }

      if (isLikelyFeedPost(current, labelEl)) return current;
      current = current.parentElement;
    }

    return fallback;
  }

  function isSuggestionLabel(el) {
    if (!el || el.children.length > 1) return false;
    return SUGGESTION_LABELS.has(normalizeText(el.textContent));
  }

  function scan(root) {
    if (!_enabled || !_features.suggestions || !root) return;
    ensureStyle();

    const scope = root.nodeType === Node.ELEMENT_NODE ? root : document.body;
    const candidates = [];
    if (isSuggestionLabel(scope)) candidates.push(scope);
    candidates.push(...scope.querySelectorAll("span, p, h2, div"));

    for (const el of candidates) {
      if (!isSuggestionLabel(el)) continue;
      const post = findFeedPost(el);
      if (post) post.setAttribute(HIDDEN_ATTR, "suggestion");
    }
  }

  function getScanRoot(root) {
    if (!root || root === document.body || root === document.documentElement) return document.body;
    const el = root.nodeType === Node.ELEMENT_NODE ? root : root.parentElement;
    if (!el) return document.body;
    return el.closest("main") || document.body;
  }

  function queueScan(root = document.body) {
    const scanRoot = getScanRoot(root);
    _pendingScanRoot = _pendingScanRoot === document.body ? document.body : scanRoot;
    if (_scanTimer) clearTimeout(_scanTimer);
    _scanTimer = setTimeout(() => {
      _scanTimer = 0;
      const rootToScan = _pendingScanRoot || document.body;
      _pendingScanRoot = null;
      scan(rootToScan);
    }, OBSERVER_DELAY_MS);
  }

  function startObserver() {
    if (_observer || !document.body) return;
    _observer = new MutationObserver((mutations) => {
      if (location.href !== _lastUrl) {
        _lastUrl = location.href;
        queueScan(document.body);
        return;
      }

      for (const mutation of mutations) {
        if (mutation.type !== "childList" || !mutation.addedNodes.length) continue;
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            queueScan(document.body);
            return;
          }
        }
      }
    });
    _observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (_observer) {
      _observer.disconnect();
      _observer = null;
    }
    if (_scanTimer) {
      clearTimeout(_scanTimer);
      _scanTimer = 0;
    }
    _pendingScanRoot = null;
  }

  function applyState() {
    if (!_enabled || !_features.suggestions) {
      stopObserver();
      removeStyle();
      removeHiddenPosts();
      return;
    }

    ensureStyle();
    if (document.body) {
      startObserver();
      queueScan(document.body);
      for (const ms of [500, 1500, 3000, 6000]) {
        setTimeout(() => {
          if (_enabled && _features.suggestions) queueScan(document.body);
        }, ms);
      }
    }
  }

  function initWhenReady() {
    if (document.body) {
      applyState();
      return;
    }
    requestAnimationFrame(initWhenReady);
  }

  chrome.storage.local.get(ALL_KEYS, (data) => {
    _enabled = data.linkedin_enabled !== false;
    _features = { suggestions: data.linkedin_suggestions !== false };
    initWhenReady();
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== "linkedin_update") return;
    _enabled = msg.enabled !== false;
    _features = {
      suggestions: !msg.features || msg.features.suggestions !== false,
    };
    applyState();
  });
})();

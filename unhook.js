// ═══════════════════════════════════
//  superlevels: YouTube Unhook
//  Based on remove-youtube-suggestions
// ═══════════════════════════════════
(() => {
  const STYLE_ID = "sl-unhook";

  const CSS_HOMEPAGE = `
    ytd-browse[page-subtype="home"] #contents.ytd-rich-grid-renderer,
    ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
    ytd-browse[page-subtype="home"] #primary > ytd-rich-grid-renderer,
    ytd-browse[page-subtype="home"] ytd-rich-section-list-renderer,
    ytd-browse[page-subtype="home"] #header,
    ytd-browse[page-subtype="home"] .ytd-browse-chips-wrapper {
      display: none !important;
    }
    ytd-browse[page-subtype="home"] #primary {
      display: flex !important;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
    }
    ytd-browse[page-subtype="home"] #primary::before {
      content: 'Focus Mode — Use the search bar';
      font-size: 20px;
      color: #444;
      font-family: 'YouTube Sans', 'Roboto', sans-serif;
      font-weight: 500;
    }
    ytd-browse[page-subtype="trending"] #contents {
      display: none !important;
    }
    #chips-wrapper.ytd-feed-filter-chip-bar-renderer,
    ytd-feed-filter-chip-bar-renderer {
      display: none !important;
    }
  `;

  const CSS_SIDEBAR = `
    #secondary.ytd-watch-flexy,
    ytd-watch-next-secondary-results-renderer,
    #related {
      display: none !important;
    }
  `;

  const CSS_WIDER = `
    ytd-watch-flexy[flexy][is-two-columns_] #primary.ytd-watch-flexy {
      max-width: 100% !important;
    }
  `;

  const CSS_ENDSCREEN = `
    .ytp-ce-element,
    .ytp-endscreen-content,
    .ytp-suggestion-set,
    .ytp-cards-teaser,
    .ytp-ce-covering-overlay,
    .ytp-ce-element-show {
      display: none !important;
    }
  `;

  const CSS_SHORTS = `
    ytd-rich-shelf-renderer[is-shorts],
    ytd-reel-shelf-renderer {
      display: none !important;
    }
    ytd-rich-shelf-renderer {
      display: none !important;
    }
  `;

  const FEATURE_CSS = { homepage: CSS_HOMEPAGE, sidebar: CSS_SIDEBAR, wider: CSS_WIDER, endscreen: CSS_ENDSCREEN, shorts: CSS_SHORTS };

  function applyFeatures(features) {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
    const css = Object.entries(FEATURE_CSS)
      .filter(([key]) => features[key] !== false)
      .map(([, css]) => css)
      .join("\n");
    if (!css.trim()) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function removeAll() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  const ALL_KEYS = ["unhook_enabled", "unhook_homepage", "unhook_sidebar", "unhook_endscreen", "unhook_shorts", "unhook_wider"];

  chrome.storage.local.get(ALL_KEYS, (data) => {
    if (data.unhook_enabled === false) return;
    applyFeatures({
      homepage: data.unhook_homepage !== false,
      sidebar: data.unhook_sidebar !== false,
      endscreen: data.unhook_endscreen !== false,
      shorts: data.unhook_shorts !== false,
      wider: data.unhook_wider !== false,
    });
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "unhook_update") {
      if (!msg.enabled) removeAll();
      else applyFeatures(msg.features);
    } else if (msg.type === "unhook_toggle") {
      if (msg.enabled) {
        chrome.storage.local.get(ALL_KEYS, (data) => {
          applyFeatures({
            homepage: data.unhook_homepage !== false,
            sidebar: data.unhook_sidebar !== false,
            endscreen: data.unhook_endscreen !== false,
            shorts: data.unhook_shorts !== false,
            wider: data.unhook_wider !== false,
          });
        });
      } else {
        removeAll();
      }
    }
  });
})();

// ==UserScript==
// @name         Custom Planner Background 2.12.0
// @namespace    https://tampermonkey.net/
// @version      2.12.0
// @description  Planner background + bucket filter panel + checklist search panel (updated for new Planner UI 2025)
// @match        https://tasks.office.com/*
// @match        https://planner.microsoft.com/*
// @match        https://planner.cloud.microsoft/*
// @match        https://*.office.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const version = "2.12.0";

  /* USER CAN CHANGE THESE LINKS LIST TO ANY GOOGLE DRIVE IMAGE LINKS, REMEMBER TO CHANGE THE PERMISSION TO "ANYONE WITH THE LINK"
  ========================================================================================================================================
  */
  const ggDriveBGList = [
    "https://drive.google.com/file/d/12IPXWnj7pgw0yvmyNY9LQz1FUxBq3RcX/view",
    "https://drive.google.com/file/d/1dAY5Rol6ZcPK_rG7dJe4kDyzelnKDP_M/view",
    "https://drive.google.com/file/d/1AfyaojSBjuIevqwPMtqmSvl3frueV8qq/view",
    "https://drive.google.com/file/d/1UDOH-MwL_UKJvBIR-kZTAV7Dgf4Pl0Mz/view",
    "https://drive.google.com/file/d/1tcVIBGh9FQZdPM7KFjet6cMTpmw50k4o/view",
    "https://drive.google.com/file/d/1vfW_E9cGJLX-UDkAoEa0UnUI0L5EIeC_/view",
    "https://drive.google.com/file/d/1T_XnDBLuilq2oPwu1dfUUsVdh1v34Uw4/view",
    "https://drive.google.com/file/d/1t_1q4XWS9k2Ac4XazTOn86PBFupc16IF/view",
    "https://drive.google.com/file/d/1YI5NaPoH35-fcVartvP74L4nm-WCkJyi/view",
    "https://drive.google.com/file/d/17b9ZhHd2mW4xuqOQOkxPUepHSaumy5g9/view",
    "https://drive.google.com/file/d/1GlMXB86YFkrWpk8vP9t853AKfHREtWma/view",
    "https://drive.google.com/file/d/1LMasn9L2ZvrZKM-48_QvKibhfkGbjht_/view",
    "https://drive.google.com/file/d/16y361WcdyF1mkfe-sPUEdcF2ktrEMHfo/view",
  ];
  /* END OF USER CONFIGURABLE LINKS, DONT TOUCH ANYTHING BELOW THIS LINE
  ========================================================================================================================================
  */

  function extractFileId(url) {
    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }

  function pickRandomBgUrl() {
    const raw = ggDriveBGList[Math.floor(Math.random() * ggDriveBGList.length)];
    const id = extractFileId(raw);
    return id ? `https://lh3.googleusercontent.com/u/0/d/${id}` : null;
  }

  let currentBgUrl = pickRandomBgUrl();

  /* ===============================
     CSS
  =============================== */
  const baseCSS = `
    /* ── Background targets (new UI uses id="basicPlanView") ── */
    #basicPlanView,
    [id="basicPlanView"],
    div[data-landmark="true"],
    .ms-Fabric,
    #root,
    .appContent,
    .basicPlanView,
    .taskBoardView {
      background-size: cover !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
    }

    /* ── Transparent containers ── */
    ul[data-testid="taskBoardView"],
    .columnsList,
    .container {
      background-color: transparent !important;
    }

    /* ── Column cards: new UI uses li[data-dnd-role="column"] ── */
    li[data-dnd-role="column"] {
      background-color: rgba(255,255,255,0.25) !important;
      border-radius: 8px !important;
    }

    /* ── Task cards ── */
    .planner-draggable-task-card {
      background-color: rgba(255,255,255,0.75) !important;
      border-radius: 6px !important;
    }

    /* ── Top nav / header ── */
    #plannerSuiteNavContainer,
    .header,
    .filterPivotRow {
      background-color: rgba(255,255,255,0.5) !important;
    }

    /* ── Completed section toggle button ── */
    button[data-testid="taskBoardColumnGroupSectionToggleButton"] {
      background-color: rgba(255,255,255,0.875) !important;
    }

    /* ── Left nav ── */
    #left-nav-content {
      background-color: rgba(255,255,255,0.75) !important;
    }

    /* ─────────────── BUCKET FILTER PANEL ─────────────── */
    #bucket-filter-panel {
      position: fixed;
      left: 32px;
      top: 384px;
      z-index: 2147483647;
      background-color: #fb923c;
      border: 2px solid #000;
      border-radius: 0.5rem;
      padding: 8px 10px;
      font-size: 12px;
      min-width: 180px;
      cursor: move;
      user-select: none;
      box-shadow: 2px 2px 0 rgba(0,0,0,0.25);
    }

    #bucket-filter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      cursor: move;
    }

    #bucket-filter-toggle {
      cursor: pointer;
      font-size: 14px;
      padding: 0 4px;
    }

    #filter-list {
      max-height: 160px;
      overflow-y: auto;
      margin-top: 6px;
      padding-right: 4px;
    }

    /* ─────────────── CHECKLIST SEARCH PANEL ─────────────── */
    #checklist-search-panel {
      position: fixed;
      left: 32px;
      top: 288px;
      z-index: 2147483647;
      background-color: #fb923c;
      border: 2px solid #000;
      border-radius: 0.5rem;
      padding: 8px 10px;
      font-size: 12px;
      min-width: 200px;
      cursor: move;
      user-select: none;
      box-shadow: 2px 2px 0 rgba(0,0,0,0.25);
    }

    #search-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      cursor: move;
      margin-bottom: 6px;
    }

    /* ─────────────── SHARED BUTTON STYLE ─────────────── */
    #randomBG, .bnsfh2button {
      background-color: #FF8C00;
      color: #FFFF00;
      font-family: "Clarendon", "Clarendon Bold", "Georgia", "Times New Roman", serif;
      font-weight: 700;
      font-size: 16px;
      line-height: 1.1;
      padding: 8px 16px;
      cursor: pointer;
      border: 2px solid #000;
      box-shadow: inset 0 0 0 2px #FFFF00, 2px 2px 0 rgba(0,0,0,0.5);
      border-radius: 8px;
      text-shadow:
        -1px -1px 0 #384841,  1px -1px 0 #384841,
        -1px  1px 0 #384841,  1px  1px 0 #384841,
         0px  2px 0 #384841;
      letter-spacing: 0.75px;
      transition: transform 0.05s ease, box-shadow 0.05s ease;
    }
    #randomBG:hover, .bnsfh2button:hover {
      transform: translate(-1px, -1px);
      box-shadow: inset 0 0 0 2px #F7B512, 3px 3px 0 rgba(0,0,0,0.6);
    }
    #randomBG:active, .bnsfh2button:active {
      transform: translate(1px, 1px);
      box-shadow: inset 0 0 0 2px #F7B512, 1px 1px 0 rgba(0,0,0,0.6);
    }

    /* ─────────────── UTILITY ─────────────── */
    .filter-item { display:flex; gap:6px; align-items:center; margin-bottom:4px; }
    .row-between { display:flex; flex-direction:row; justify-content:space-between; }
    .row-center  { display:flex; flex-direction:row; justify-content:center; }
    .flex-col    { display:flex; flex-direction:column; }
    .text-center { text-align:center; }
    .text-xs  { font-size:0.75rem;  line-height:1rem; }
    .text-sm  { font-size:0.875rem; line-height:1.25rem; }
    .text-base{ font-size:1rem;     line-height:1.5rem; }
    .px-1 { padding-left:0.25rem; padding-right:0.25rem; }
  `;

  /* ===============================
     APPLY / CHANGE THEME
  =============================== */
  function buildStyleContent() {
    return `
      #basicPlanView,
      [id="basicPlanView"],
      div[data-landmark="true"],
      .ms-Fabric,
      #root,
      .appContent,
      .basicPlanView,
      .taskBoardView {
        background-image: url('${currentBgUrl}') !important;
      }
      ${baseCSS}
    `;
  }

  function applyTheme() {
    if (document.getElementById("planner-style")) return;
    const s = document.createElement("style");
    s.id = "planner-style";
    s.textContent = buildStyleContent();
    document.head.appendChild(s);
  }

  function changeBackground() {
    currentBgUrl = pickRandomBgUrl();
    const s = document.getElementById("planner-style");
    if (s) s.textContent = buildStyleContent();
  }

  /* ===============================
     DRAG HELPER
  =============================== */
  function makeDraggable(panel, handle) {
    handle = handle || panel;
    let dragging = false,
      ox = 0,
      oy = 0;
    handle.addEventListener("mousedown", (e) => {
      dragging = true;
      ox = e.clientX - panel.offsetLeft;
      oy = e.clientY - panel.offsetTop;
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      panel.style.left = e.clientX - ox + "px";
      panel.style.top = e.clientY - oy + "px";
    });
    document.addEventListener("mouseup", () => (dragging = false));
  }

  /* ===============================
     PANEL A — BUCKET FILTER
  =============================== */
  function createBucketPanel() {
    if (document.getElementById("bucket-filter-panel")) return;

    const panel = document.createElement("div");
    panel.id = "bucket-filter-panel";
    panel.innerHTML = `
      <div style="margin-bottom:6px; text-align:center;">
        <button id="randomBG">Random Background</button>
      </div>
      <div id="bucket-filter-header">
        <span class="text-center text-base">Bucket Filter v${version}</span>
        <span id="bucket-filter-toggle" style="border:1px solid #000; padding:0 3px;">–</span>
      </div>
      <div id="bucket-filter-body">
        <div style="margin-top:4px;" class="row-center">
          <button id="refreshBuckets" class="bnsfh2button">Refresh buckets</button>
        </div>
        <div class="flex-col">
          <h2 class="text-sm" id="bucket-count">Total buckets: 0</h2>
          <div class="row-between">
            <button id="hide-all" class="bnsfh2button text-xs">Hide all</button>
            <button id="show-all" class="bnsfh2button text-xs">Show all</button>
          </div>
        </div>
        <div id="filter-list"></div>
      </div>
    `;

    document.body.appendChild(panel);

    const filterBody = panel.querySelector("#bucket-filter-body");
    const filterToggle = panel.querySelector("#bucket-filter-toggle");
    let filterOpen = true;

    filterToggle.addEventListener("mousedown", (e) => e.stopPropagation());
    filterToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      filterOpen = !filterOpen;
      filterBody.style.display = filterOpen ? "block" : "none";
      filterToggle.textContent = filterOpen ? "–" : "+";
    });

    makeDraggable(panel, panel.querySelector("#bucket-filter-header"));
  }

  /* ===============================
     PANEL B — CHECKLIST SEARCH
  =============================== */
  function createSearchPanel() {
    if (document.getElementById("checklist-search-panel")) return;

    const panel = document.createElement("div");
    panel.id = "checklist-search-panel";
    panel.innerHTML = `
      <div>
        <div id="search-panel-header">
          <span>Checklist Search</span>
        </div>
        <div class="px-1 row-center">
          <input
            id="checklistKeyword"
            type="text"
            placeholder="Search checklist keyword"
            style="width:100%; padding:4px; font-size:12px;"
          />
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    makeDraggable(panel, panel.querySelector("#search-panel-header"));
  }

  /* ===============================
     BUCKET / COLUMN SELECTORS
     New UI: li[data-dnd-role="column"][data-index]
             aria-label="Column <name>, Use Ctrl..."
  =============================== */
  const bucketMap = new Map();
  let checklistKeyword = "";

  /**
   * Get the bucket title from a column <li>.
   * New UI stores it in the h3 inside the draggable header div,
   * or falls back to aria-label parsing.
   */
  function getBucketTitle(col) {
    const h3 = col.querySelector("h3");
    if (h3) return h3.innerText.trim();

    // Fallback: aria-label is "Column <name>, Use Ctrl+Alt..."
    const label = col.getAttribute("aria-label") || "";
    const match = label.match(/^Column\s+(.+?),\s+Use /i);
    return match ? match[1].trim() : label;
  }

  function syncBuckets() {
    let added = false;

    // New UI selector — columns are li elements with data-dnd-role="column"
    document
      .querySelectorAll('li[data-dnd-role="column"][data-index]')
      .forEach((col) => {
        const idx = Number(col.dataset.index);
        if (bucketMap.has(idx)) return;

        bucketMap.set(idx, {
          index: idx,
          title: getBucketTitle(col),
          id: col.id,
          hidden: false,
        });
        added = true;
      });

    if (added) {
      renderBucketList();
      updateBucketCount();
    }

    applyChecklistFilter();
  }

  function renderBucketList() {
    const list = document.getElementById("filter-list");
    if (!list) return;
    list.innerHTML = "";

    [...bucketMap.values()]
      .sort((a, b) => a.index - b.index)
      .forEach((b) => {
        const row = document.createElement("div");
        row.className = "filter-item";

        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.checked = b.hidden;
        chk.onchange = () => {
          b.hidden = chk.checked;
          const col = document.getElementById(b.id);
          if (col) col.style.display = b.hidden ? "none" : "";
          applyChecklistFilter();
        };

        const lbl = document.createElement("label");
        lbl.textContent = `(${b.index + 1}) ${b.title}`;

        row.append(chk, lbl);
        list.appendChild(row);

        const col = document.getElementById(b.id);
        if (col) col.style.display = b.hidden ? "none" : "";
      });
  }

  function updateBucketCount() {
    const el = document.getElementById("bucket-count");
    if (el) el.textContent = `Total buckets: ${bucketMap.size}`;
  }

  /* ===============================
     CHECKLIST FILTER
     New UI: checklist items appear in the card as
     aria-label text on checklist-indicator buttons,
     or as text inside the checklistPreview divs.
  =============================== */
  function getCardChecklistText(card) {
    // Try the checklist preview items (visible sub-task text in the card)
    const previewItems = card.querySelectorAll(
      '[data-testid="checklistPreview"] span',
    );
    if (previewItems.length) {
      return [...previewItems].map((e) => e.innerText).join(" ");
    }

    // Fallback: checklist-indicator aria-label contains "X of Y checklist items"
    // Not useful for keyword matching, so also try the full card text
    return card.innerText || "";
  }

  function applyChecklistFilter() {
    const keyword = checklistKeyword.trim().toLowerCase();

    document
      .querySelectorAll('li[data-dnd-role="column"][data-index]')
      .forEach((col) => {
        const idx = Number(col.dataset.index);
        const bucket = bucketMap.get(idx);
        if (!bucket) return;

        // Bucket hidden always wins
        if (bucket.hidden) {
          col.style.display = "none";
          return;
        }
        col.style.display = "";

        // Filter individual cards
        // New UI: cards are div[data-dnd-role="card"]
        col.querySelectorAll('div[data-dnd-role="card"]').forEach((card) => {
          if (!keyword) {
            card.style.display = "";
            return;
          }
          const text = getCardChecklistText(card).toLowerCase();
          card.style.display = text.includes(keyword) ? "" : "none";
        });
      });
  }

  /* ===============================
     FORCE RENDER — scroll board to
     trigger lazy-loaded columns
  =============================== */
  function forceRenderOnce() {
    // New UI board container
    const board =
      document.querySelector('ul[data-testid="taskBoardView"]') ||
      document.querySelector(".columnsList");
    if (!board) return;

    const max = board.scrollWidth - board.clientWidth;
    const step = board.clientWidth * 0.9;
    let pos = 0;

    function scroll() {
      pos += step;
      board.scrollLeft = pos;
      if (pos < max) {
        setTimeout(scroll, 300);
      } else {
        setTimeout(() => (board.scrollLeft = 0), 400);
      }
    }
    scroll();
  }

  function forceRenderMultiple(times = 3, delay = 1300) {
    let count = 0;
    const t = setInterval(() => {
      forceRenderOnce();
      syncBuckets();
      if (++count >= times) clearInterval(t);
    }, delay);
  }

  /* ===============================
     EVENTS
  =============================== */
  document.addEventListener("input", (e) => {
    if (e.target.id === "checklistKeyword") {
      checklistKeyword = e.target.value;
      applyChecklistFilter();
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.id === "randomBG") {
      changeBackground();
    }
    if (e.target.id === "refreshBuckets") {
      bucketMap.clear();
      forceRenderMultiple(3, 1300);
    }
    if (e.target.id === "hide-all") {
      bucketMap.forEach((b) => (b.hidden = true));
      renderBucketList();
      applyChecklistFilter();
    }
    if (e.target.id === "show-all") {
      bucketMap.forEach((b) => (b.hidden = false));
      renderBucketList();
      applyChecklistFilter();
    }
  });

  /* ===============================
     INIT — wait for board to render
  =============================== */
  const init = setInterval(() => {
    // New UI: board is ul[data-testid="taskBoardView"]
    const board =
      document.querySelector('ul[data-testid="taskBoardView"]') ||
      document.querySelector(".taskBoardView");
    if (!board) return;

    clearInterval(init);

    applyTheme();
    createBucketPanel();
    createSearchPanel();

    syncBuckets();
    forceRenderMultiple(3, 1300);
    setInterval(syncBuckets, 1000);
  }, 500);
})();

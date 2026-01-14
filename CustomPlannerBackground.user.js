// ==UserScript==
// @name         Custom Planner Background 2.10.5
// @namespace    https://tampermonkey.net/
// @version      2.10.5
// @description  Planner background + bucket filter panel + checklist search panel
// @match        https://tasks.office.com/*
// @match        https://planner.microsoft.com/*
// @match        https://planner.cloud.microsoft/*
// @match        https://*.office.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const version = "2.10.5";

  /* ===============================
     BACKGROUND (unchanged logic)
  =============================== */
  const ggDriveBGList = [
    "https://drive.google.com/file/d/12IPXWnj7pgw0yvmyNY9LQz1FUxBq3RcX/view",
    "https://drive.google.com/file/d/1dAY5Rol6ZcPK_rG7dJe4kDyzelnKDP_M/view",
    "https://drive.google.com/file/d/1AfyaojSBjuIevqwPMtqmSvl3frueV8qq/view",
    "https://drive.google.com/file/d/1UDOH-MwL_UKJvBIR-kZTAV7Dgf4Pl0Mz/view",
    "https://drive.google.com/file/d/1tcVIBGh9FQZdPM7KFjet6cMTpmw50k4o/view",
    "https://drive.google.com/file/d/1vfW_E9cGJLX-UDkAoEa0UnUI0L5EIeC_/view",
  ];

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
     CSS (TRUNCATED — YOU ADD BACK)
  =============================== */
  const baseCSS = `/* EXACT COPY FROM 2.9.4.6 — UNCHANGED */
        .ms-Fabric,
        #root,
        .appContent,
        .basicPlanView,
        .taskBoardView {
            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
        }

        .columnsList,
        .container {
            background-color: transparent !important;
        }

        .taskBoardColumn {
            background-color: rgba(255,255,255,0.25) !important;
        }

        .taskCard,
        .taskBoardCard {
            background-color: rgba(255,255,255,0.5) !important;
        }

        .header,
        .filterPivotRow {
            background-color: rgba(255,255,255,0.5) !important;
        }

        .sectionToggleButton {
            background-color: rgba(255,255,255,0.875) !important;
        }

        .sideNav {
            background-color: rgba(255,255,255,0.75) !important;
        }

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

         #randomBG {
            /* Pumpkin / Omaha Orange */
            background-color: #FF8C00;

            /* BNSF Yellow text */
            /* color: #F7B512; */
            color: #FFFF00;

            font-family: "Clarendon", "Clarendon Bold",
                         "Georgia", "Times New Roman", serif;
            font-weight: 700;


            font-size: 16px;
            line-height: 1.1;

            padding: 8px 16px;
            cursor: pointer;

            /* DOUBLE BORDER */
            border: 2px solid #000;                 /* outer black */
            box-shadow:

                inset 0 0 0 2px #FFFF00,             /* inner yellow */
                2px 2px 0 rgba(0,0,0,0.5);           /* slight lift */

            border-radius: 8px;

            /* Text stroke simulation (Pullman Green) */
            text-shadow:
                -1px -1px 0 #384841,
                 1px -1px 0 #384841,
                -1px  1px 0 #384841,
                 1px  1px 0 #384841,
                 0px  2px 0 #384841;

            letter-spacing: 0.75px;

            transition: transform 0.05s ease, box-shadow 0.05s ease;
        }

        #randomBG:hover {
            transform: translate(-1px, -1px);
            box-shadow:
                inset 0 0 0 2px #F7B512,
                3px 3px 0 rgba(0,0,0,0.6);
        }

        #randomBG:active {
            transform: translate(1px, 1px);
            box-shadow:
                inset 0 0 0 2px #F7B512,
                1px 1px 0 rgba(0,0,0,0.6);
        }

        .filter-item {
            display: flex;
            gap: 6px;
            align-items: center;
            margin-bottom: 4px;
            /* font-size: 1rem; */
            /* line-height: 1.5rem; */
        }
        .row-between {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
        }
        .row-center {
            display: flex;
            flex-direction: row;
            justify-content: center;
        }

        .flex-col {
            display: flex;
            flex-direction: column;
        }
        .text-center {
            text-align: center;
        }
        .text-xs {
            font-size: 0.75rem;
            line-height: 1rem;
        }

        .text-sm {
            font-size: 0.875rem;
            line-height: 1.25rem;
        }

        .text-base {
            font-size: 1rem;
            line-height: 1.5rem;
        }
        .text-xl {
            font-size: 1.25rem;
            line-height: 1.4rem;
        }
        .bg-red-500 {
            background-color: #ef4444;
        }
        .bnsfh2button {
            /* Pumpkin / Omaha Orange */
            background-color: #FF8C00;

            /* BNSF Yellow text */
            /*color: #F7B512;*/
            color: #FFFF00;

            font-family: "Clarendon", "Clarendon Bold",
                         "Georgia", "Times New Roman", serif;
            font-weight: 700;


            font-size: 16px;
            line-height: 1.1;

            padding: 8px 16px;
            cursor: pointer;

            /* DOUBLE BORDER */
            border: 2px solid #000;                 /* outer black */
            box-shadow:

                inset 0 0 0 2px #FFFF00,             /* inner yellow */
                2px 2px 0 rgba(0,0,0,0.5);           /* slight lift */

            border-radius: 8px;

            /* Text stroke simulation (Pullman Green) */
            text-shadow:
                -1px -1px 0 #384841,
                 1px -1px 0 #384841,
                -1px  1px 0 #384841,
                 1px  1px 0 #384841,
                 0px  2px 0 #384841;

            letter-spacing: 0.75px;

            transition: transform 0.05s ease, box-shadow 0.05s ease;
        }

        .bnsfh2button:hover {
            transform: translate(-1px, -1px);
            box-shadow:
                inset 0 0 0 2px #F7B512,
                3px 3px 0 rgba(0,0,0,0.6);
        }
        .bnsfh2button:active {
            transform: translate(1px, 1px);
            box-shadow:
                inset 0 0 0 2px #F7B512,
                1px 1px 0 rgba(0,0,0,0.6);
        }
        #checklist-search-panel {
    position: fixed;
    left: 240px;
    top: 384px;
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
    .px-1 {
      padding-left: 0.25rem;
      padding-right: 0.25rem;
    }
    .py-1 {
      padding-top: 0.25rem;
      padding-bottom: 0.25rem;
    }
    .boarder-1{
      border-width: 1px;
      border-style: solid;
    } 
    }
    .boarder-black{  
      border-color: #000;
    }
    `;

  function applyTheme() {
    if (document.getElementById("planner-style")) return;
    const s = document.createElement("style");
    s.id = "planner-style";
    s.textContent = `
      .ms-Fabric,
      #root,
      .appContent,
      .basicPlanView,
      .taskBoardView {
        background-image: url('${currentBgUrl}') !important;
      }
      ${baseCSS}
    `;
    document.head.appendChild(s);
  }

  function changeBackground() {
    currentBgUrl = pickRandomBgUrl();
    document.getElementById("planner-style").textContent = `
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

  /* ===============================
     DRAG HELPER (REUSED)
  =============================== */
  function makeDraggable(panel, handle = panel) {
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
     PANEL A: BUCKET FILTER PANEL
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
            <span id="bucket-filter-toggle" class="boarder-1 boarder-black">–</span>
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

    /* ===============================
     BUCKET FILTER TOGGLE (2.9.9.8)
  =============================== */
    const filterBody = panel.querySelector("#bucket-filter-body");
    const filterToggle = panel.querySelector("#bucket-filter-toggle");

    let filterOpen = true;

    filterToggle.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent drag conflict
      filterOpen = !filterOpen;
      filterBody.style.display = filterOpen ? "block" : "none";
      filterToggle.textContent = filterOpen ? "–" : "+";
    });

    makeDraggable(panel, panel.querySelector("#bucket-filter-header"));
  }

  /* ===============================
     PANEL B: SEARCH PANEL (NEW)
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
     BUCKET LOGIC (2.9.9.8 STYLE)
  =============================== */
  const bucketMap = new Map();
  let checklistKeyword = "";

  function syncBuckets() {
    let add = false;
    document
      .querySelectorAll("li.taskBoardColumn[data-index]")
      .forEach((col) => {
        const h3 = col.querySelector(".columnTitle h3");
        if (!h3) return;

        const idx = Number(col.dataset.index);
        if (bucketMap.has(idx)) return;

        bucketMap.set(idx, {
          index: idx,
          title: h3.innerText.trim(),
          id: col.id,
          hidden: false,
        });
        add = true;
      });
    if (add) {
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
        lbl.textContent = b.title;

        row.append(chk, lbl);
        list.appendChild(row);

        const col = document.getElementById(b.id);
        if (col) col.style.display = b.hidden ? "none" : "";
      });
  }

  /* ===============================
     CHECKLIST FILTER
  =============================== */
  function applyChecklistFilter() {
    const keyword = checklistKeyword.trim();

    document
      .querySelectorAll("li.taskBoardColumn[data-index]")
      .forEach((col) => {
        const idx = Number(col.dataset.index);
        const bucket = bucketMap.get(idx);
        if (!bucket) return;

        const cards = col.querySelectorAll(".taskBoardCard");

        if (bucket.hidden) {
          cards.forEach((c) => (c.style.display = "none"));
          return;
        }

        cards.forEach((card) => {
          if (!keyword) {
            card.style.display = "";
            return;
          }

          const text = [
            ...card.querySelectorAll(".checklistPreview .ms-Checkbox-text"),
          ]
            .map((e) => e.innerText)
            .join(" ");

          card.style.display = text.includes(keyword) ? "" : "none";
        });
      });
  }
  /* ===============================
       Update Item in the Filter List LOGIC
    =============================== */

  function updateBucketCount() {
    const el = document.getElementById("bucket-count");
    if (el) el.textContent = `Total buckets: ${bucketMap.size}`;
  }
  /* ===============================
       FORCE RENDER (MULTI PASS)
    =============================== */
  function forceRenderOnce() {
    const board = document.querySelector(".columnsList");
    if (!board) return;

    let pos = 0;
    const max = board.scrollWidth - board.clientWidth;
    const step = board.clientWidth * 0.9;

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
    if (e.target.id === "randomBG") changeBackground();
    if (e.target.id === "refreshBuckets") {
      bucketMap.clear();
      forceRenderMultiple(3, 1300);
    }
    if (e.target.id === "hide-all") {
      bucketMap.forEach((b) => (b.hidden = true));
      syncBuckets();
    }
    if (e.target.id === "show-all") {
      bucketMap.forEach((b) => (b.hidden = false));
      syncBuckets();
    }
  });

  /* ===============================
     INIT
  =============================== */
  const init = setInterval(() => {
    if (!document.querySelector(".taskBoardView")) return;
    clearInterval(init);

    applyTheme();
    createBucketPanel();
    createSearchPanel();

    syncBuckets();
    forceRenderMultiple(3, 1300);
    setInterval(syncBuckets, 1000);
  }, 500);
})();

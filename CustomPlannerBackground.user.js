// ==UserScript==
// @name         Custom Planner Background 2.9.9.3
// @namespace    https://tampermonkey.net/
// @version      2.9.9.3
// @description  Planner background with random Google Drive images + bucket filter (multi-pass, data-index ordered)
// @match        https://tasks.office.com/*
// @match        https://planner.microsoft.com/*
// @match        https://planner.cloud.microsoft/*
// @match        https://*.office.com/*
// @updateURL    https://raw.githubusercontent.com/6430003421-koraphat-nickname-is-nine/Custom-Planner-Background/main/CustomPlannerBackground.user.js
// @downloadURL  https://raw.githubusercontent.com/6430003421-koraphat-nickname-is-nine/Custom-Planner-Background/main/CustomPlannerBackground.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const version = "2.9.9.3";

  /* ===============================
       GOOGLE DRIVE BACKGROUNDS
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
       BASE CSS (UNCHANGED)
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
            font-size: 1rem;
            line-height: 1.5rem;
        }
        .row-between {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
        } 
        .text-base {
            font-size: 1rem;
            line-height: 1.5rem;
        }
        .text-xl {
            font-size: 1.25rem;
            line-height: 1.4rem;
        }

        .bnsfh2button {
            /* Pumpkin / Omaha Orange */
            background-color: #FF8C00;

            /* BNSF Yellow text */
            //color: #F7B512;
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
       FILTER PANEL UI
    =============================== */
  const panel = document.createElement("div");
  panel.id = "bucket-filter-panel";
  panel.innerHTML = `
        <div style="margin-bottom:6px; text-align:center;">
            <button id="randomBG">Random Background</button>
            <div style="margin-top:4px;">
                <button id="refreshBuckets">Refresh buckets</button>
            </div>
        </div>
        <div id="bucket-filter-header">
            <span>Bucket Filter v${version}</span>
            <span id="bucket-filter-toggle">–</span>
        </div>
        <div id="bucket-filter-body">
            // <div style="font-size:11px; opacity:0.8;">Check to hide</div>
            <div class="row-between">

                <h2 class="text-base" id="bucket-count">Total buckets: 0</h2>

                <div>
                    <button id="hide-all" class="bnsfh2button text-base">Hide all</button>
                    <button id="show-all" class="bnsfh2button text-base">Show all</button>
                </div>
            </div>
            <div id="filter-list"></div>
        </div>
    `;
  document.body.appendChild(panel);

  /* ===============================
       DRAG (UNCHANGED)
    =============================== */
  let dragging = false,
    ox = 0,
    oy = 0;
  panel.addEventListener("mousedown", (e) => {
    dragging = true;
    ox = e.clientX - panel.offsetLeft;
    oy = e.clientY - panel.offsetTop;
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    panel.style.left = e.clientX - ox + "px";
    panel.style.top = e.clientY - oy + "px";
  });
  document.addEventListener("mouseup", () => (dragging = false));

  /* ===============================
       Update Item in the Filter List LOGIC
    =============================== */

  function updateBucketCount() {
    const el = document.getElementById("bucket-count");
    if (el) el.textContent = `Total buckets: ${bucketMap.size}`;
  }

  /* ===============================
       BUCKET LOGIC (STREAM + SORT)
    =============================== */
  const bucketMap = new Map();

  function syncBuckets() {
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
        });
      });

    renderBucketList();
  }

  function renderBucketList() {
    const list = document.getElementById("filter-list");
    list.innerHTML = "";

    [...bucketMap.values()]
      .sort((a, b) => a.index - b.index)
      .forEach((b) => {
        const item = document.createElement("div");
        item.className = "filter-item";

        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.onchange = () => {
          const col = document.getElementById(b.id);
          if (col) col.style.display = chk.checked ? "none" : "";
        };

        const lbl = document.createElement("label");
        lbl.textContent = b.title;

        item.append(chk, lbl);
        list.appendChild(item);
      });
    updateBucketCount();
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
    const runner = setInterval(() => {
      forceRenderOnce();
      syncBuckets();
      count++;
      if (count >= times) clearInterval(runner);
    }, delay);
  }

  /* ===============================
       EVENTS
    =============================== */
  document.addEventListener("click", (e) => {
    if (e.target.id === "randomBG") changeBackground();

    if (e.target.id === "refreshBuckets") {
      bucketMap.clear();
      document.getElementById("filter-list").innerHTML = "";
      forceRenderMultiple(3, 1300);
    }

    if (e.target.id === "hide-all") {
      bucketMap.forEach((b) => {
        const c = document.getElementById(b.id);
        if (c) c.style.display = "none";
      });
      document
        .querySelectorAll("#filter-list input")
        .forEach((c) => (c.checked = true));
    }

    if (e.target.id === "show-all") {
      bucketMap.forEach((b) => {
        const c = document.getElementById(b.id);
        if (c) c.style.display = "";
      });
      document
        .querySelectorAll("#filter-list input")
        .forEach((c) => (c.checked = false));
    }
  });

  /* ===============================
       INIT
    =============================== */
  const init = setInterval(() => {
    if (!document.querySelector(".taskBoardView")) return;
    clearInterval(init);

    applyTheme();
    syncBuckets();
    forceRenderMultiple(3, 1300);
    setInterval(syncBuckets, 1000); // safety net
  }, 500);
})();

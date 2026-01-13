// ==UserScript==
// @name         Custom Planner Background 2.9.7.3
// @namespace    https://tampermonkey.net/
// @version      2.9.7.3
// @description  Planner background with random Google Drive images + ordered bucket filter (data-index)
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

  /* ===============================
       VERSION
    =============================== */
  const version = "2.9.7.3";

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
       THEME (BASECSS — UNCHANGED)
    =============================== */
  const baseCSS = `
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
            background-color: #FF8C00;
            color: #F7B512;
            font-family: "Clarendon", "Georgia", serif;
            font-weight: 700;
            font-size: 16px;
            padding: 8px 16px;
            border: 2px solid #000;
            box-shadow: inset 0 0 0 2px #F7B512;
            border-radius: 8px;
            cursor: pointer;
        }

        .filter-item {
            display: flex;
            gap: 6px;
            align-items: center;
            margin-bottom: 4px;
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
            <div style="font-size:11px; opacity:0.8;">Check to hide</div>
            <div>
                <button id="hide-all">Hide all</button>
                <button id="show-all">Show all</button>
            </div>
            <div id="filter-list"></div>
        </div>
    `;
  document.body.appendChild(panel);

  /* ===============================
       DRAGGABLE LOGIC (UNCHANGED)
    =============================== */
  let dragging = false,
    ox = 0,
    oy = 0;

  panel.addEventListener("mousedown", (e) => {
    if (e.target.closest("button")) return;
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
       BUCKET LOGIC (FORCE RENDER + SORT)
    =============================== */
  let bucketList = [];

  function forceRenderAllBucketsMulti(passes = 3, done) {
    const board = document.querySelector(".columnsList");
    if (!board) return done?.();

    let pass = 0;

    function runPass() {
      let pos = 0;
      const max = board.scrollWidth - board.clientWidth;
      const step = board.clientWidth * 0.9;

      function scroll() {
        pos += step;
        board.scrollLeft = pos;
        if (pos < max) {
          setTimeout(scroll, 200);
        } else {
          board.scrollLeft = 0;
          pass++;

          if (pass < passes) {
            // allow React to settle before next pass
            setTimeout(runPass, 400);
          } else {
            setTimeout(() => done?.(), 500);
          }
        }
      }

      scroll();
    }

    runPass();
  }

  function collectBuckets() {
    const cols = document.querySelectorAll("li.taskBoardColumn[data-index]");
    bucketList = [...cols]
      .map((col) => {
        const h3 = col.querySelector(".columnTitle h3");
        if (!h3) return null;
        return {
          index: Number(col.dataset.index),
          title: h3.innerText.trim(),
          id: col.id,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.index - b.index);
  }

  function renderBucketList() {
    const list = document.getElementById("filter-list");
    list.innerHTML = "";

    bucketList.forEach((b) => {
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
  }

  /* ===============================
       EVENTS
    =============================== */
  document.addEventListener("click", (e) => {
    if (e.target.id === "randomBG") changeBackground();

    if (e.target.id === "refreshBuckets") {
      forceRenderAllBucketsMulti(3, () => {
        collectBuckets();
        renderBucketList();
      });
    }

    if (e.target.id === "hide-all") {
      bucketList.forEach((b) => {
        const c = document.getElementById(b.id);
        if (c) c.style.display = "none";
      });
      document
        .querySelectorAll("#filter-list input")
        .forEach((c) => (c.checked = true));
    }

    if (e.target.id === "show-all") {
      bucketList.forEach((b) => {
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
    forceRenderAllBucketsMulti(3, () => {
      collectBuckets();
      renderBucketList();
    });
  }, 500);
})();

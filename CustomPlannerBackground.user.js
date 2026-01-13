// ==UserScript==
// @name         Custom Planner Background 2.9.4.3
// @namespace    https://tampermonkey.net/
// @version      2.9.4.3
// @description  Planner background with random Google Drive images + bucket filter (stable & complete)
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
    'use strict';

    /* ===============================
       VERSION
    =============================== */
    const version = '2.9.4.3';

    /* ===============================
       GOOGLE DRIVE BACKGROUNDS
    =============================== */
    const ggDriveBGList = [
        "https://drive.google.com/file/d/12IPXWnj7pgw0yvmyNY9LQz1FUxBq3RcX/view",
        "https://drive.google.com/file/d/1dAY5Rol6ZcPK_rG7dJe4kDyzelnKDP_M/view",
        "https://drive.google.com/file/d/1AfyaojSBjuIevqwPMtqmSvl3frueV8qq/view",
        "https://drive.google.com/file/d/1UDOH-MwL_UKJvBIR-kZTAV7Dgf4Pl0Mz/view",
        "https://drive.google.com/file/d/1tcVIBGh9FQZdPM7KFjet6cMTpmw50k4o/view",
        "https://drive.google.com/file/d/1vfW_E9cGJLX-UDkAoEa0UnUI0L5EIeC_/view"
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
       THEME CSS
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
            min-width: 200px;
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

        #bucket-filter-panel button:not(#randomBG) {
            background: #fff;
            border: 1px solid #000;
            border-radius: 4px;
            color: #000;
            font-size: 12px;
            padding: 2px 6px;
            cursor: pointer;
        }

        #bucket-filter-panel button:not(#randomBG):hover {
            background: #f3f3f3;
        }

        #randomBG {
            background-color: #FF8C00;
            color: #FFFF00;
            font-family: "Clarendon", "Georgia", serif;
            font-weight: 700;
            font-size: 16px;
            padding: 8px 16px;
            cursor: pointer;
            border: 2px solid #000;
            box-shadow:
                inset 0 0 0 2px #FFFF00,
                2px 2px 0 rgba(0,0,0,0.5);
            border-radius: 8px;
            text-shadow:
                -1px -1px 0 #384841,
                 1px -1px 0 #384841,
                -1px  1px 0 #384841,
                 1px  1px 0 #384841;
        }

        .filter-controls {
            display: flex;
            gap: 6px;
            margin-bottom: 6px;
        }

        .filter-item {
            display: flex;
            gap: 6px;
            align-items: center;
            margin-bottom: 4px;
        }
    `;

    function applyTheme() {
        if (document.getElementById('planner-style')) return;
        const s = document.createElement('style');
        s.id = 'planner-style';
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
        const s = document.getElementById('planner-style');
        if (!s) return;
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
    }

    /* ===============================
       FORCE RENDER BUCKETS (SAFE)
    =============================== */
    function forceRenderAllBucketsSlow() {
        const board = document.querySelector('.columnsList');
        if (!board) return;

        let pos = 0;
        const max = board.scrollWidth - board.clientWidth;
        const step = board.clientWidth * 0.8;

        function scroll() {
            pos += step;
            board.scrollLeft = pos;
            if (pos < max) {
                setTimeout(scroll, 350);
            } else {
                setTimeout(() => board.scrollLeft = 0, 600);
            }
        }
        scroll();
    }

    /* ===============================
       FILTER PANEL UI
    =============================== */
    const panel = document.createElement('div');
    panel.id = 'bucket-filter-panel';
    panel.innerHTML = `
        <div style="margin-bottom:6px; text-align:center;">
            <button id="randomBG">Random Background</button>
        </div>
        <div id="bucket-filter-header">
            <span>Bucket Filter v${version}</span>
            <span id="bucket-filter-toggle">+</span>
        </div>
        <div id="bucket-filter-body" style="display:none;">
            <div style="font-size:11px; opacity:0.8;">Check to hide</div>
            <div class="filter-controls">
                <button id="hide-all">Hide all</button>
                <button id="show-all">Show all</button>
            </div>
            <div id="filter-list"></div>
        </div>
    `;
    document.body.appendChild(panel);

    const body = panel.querySelector('#bucket-filter-body');
    const toggle = panel.querySelector('#bucket-filter-toggle');

    toggle.onclick = () => {
        body.style.display = body.style.display === 'block' ? 'none' : 'block';
        toggle.textContent = body.style.display === 'block' ? '–' : '+';
    };

    /* ===============================
       BUCKET DETECTION (ROBUST)
    =============================== */
    const seenBuckets = new Set();

    function syncBuckets() {
        document.querySelectorAll('.taskBoardColumn').forEach(col => {
            const titleEl = col.querySelector('.columnTitle h3');
            if (!titleEl) return;

            const title = titleEl.innerText.trim();
            if (seenBuckets.has(title)) return;

            seenBuckets.add(title);

            const list = document.getElementById('filter-list');
            const id = title.replace(/\s+/g, '-');

            const item = document.createElement('div');
            item.className = 'filter-item';

            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.id = `chk-${id}`;

            chk.onchange = () => {
                const target = [...document.querySelectorAll('.taskBoardColumn')]
                    .find(c => c.querySelector('.columnTitle h3')?.innerText.trim() === title);
                if (target) target.style.display = chk.checked ? 'none' : '';
            };

            const lbl = document.createElement('label');
            lbl.htmlFor = chk.id;
            lbl.textContent = title;

            item.append(chk, lbl);
            list.appendChild(item);
        });
    }

    function observeBuckets() {
        const board = document.querySelector('.columnsList');
        if (!board) return;

        const obs = new MutationObserver(syncBuckets);
        obs.observe(board, { childList: true, subtree: true });
    }

    /* ===============================
       EVENTS
    =============================== */
    document.addEventListener('click', e => {
        if (e.target.id === 'randomBG') changeBackground();
        if (e.target.id === 'hide-all') {
            document.querySelectorAll('.taskBoardColumn').forEach(c => c.style.display = 'none');
            document.querySelectorAll('#filter-list input').forEach(c => c.checked = true);
        }
        if (e.target.id === 'show-all') {
            document.querySelectorAll('.taskBoardColumn').forEach(c => c.style.display = '');
            document.querySelectorAll('#filter-list input').forEach(c => c.checked = false);
        }
    });

    /* ===============================
       DRAGGABLE PANEL
    =============================== */
    (function makeDraggable(el) {
        let drag = false, sx, sy, sl, st;

        el.addEventListener('mousedown', e => {
            if (e.target.closest('button') || e.target.tagName === 'INPUT') return;
            drag = true;
            const r = el.getBoundingClientRect();
            sx = e.clientX; sy = e.clientY;
            sl = r.left; st = r.top;
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', e => {
            if (!drag) return;
            el.style.left = sl + (e.clientX - sx) + 'px';
            el.style.top = st + (e.clientY - sy) + 'px';
        });

        document.addEventListener('mouseup', () => {
            drag = false;
            document.body.style.userSelect = '';
        });
    })(panel);

    /* ===============================
       INIT
    =============================== */
    const init = setInterval(() => {
        if (!document.querySelector('.taskBoardView')) return;
        clearInterval(init);

        applyTheme();
        observeBuckets();
        syncBuckets();
        setTimeout(forceRenderAllBucketsSlow, 800);
    }, 500);

})();

// ==UserScript==
// @name         Custom Planner Background 2.9.4
// @namespace    https://tampermonkey.net/
// @version      2.9.4
// @description  Planner background with random Google Drive images + bucket filter (stable bucket detection)
// @match        https://tasks.office.com/*
// @match        https://planner.microsoft.com/*
// @match        https://planner.cloud.microsoft/*
// @match        https://*.office.com/*
// @updateURL    https://raw.githubusercontent.com/6430003421-koraphat-nickname-is-nine/Custom-Planner-Background/main/PlannerBackground.user.js
// @downloadURL  https://raw.githubusercontent.com/6430003421-koraphat-nickname-is-nine/Custom-Planner-Background/main/PlannerBackground.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

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
       THEME
    =============================== */

    const baseCSS = `/* unchanged – same as 2.9.2 */`;

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
       FORCE RENDER BUCKETS (SLOW & SAFE)
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
                setTimeout(() => board.scrollLeft = 0, 500);
            }
        }

        scroll();
    }

    /* ===============================
       FILTER PANEL UI (unchanged)
    =============================== */

    const panel = document.createElement('div');
    panel.id = 'bucket-filter-panel';
    panel.innerHTML = `
        <div style="margin-bottom:6px; text-align:center;">
            <button id="randomBG">Random Background</button>
        </div>
        <div id="bucket-filter-header">
            <span>Bucket Filter</span>
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
       BUCKET DETECTION (FIXED)
    =============================== */

    const seenBuckets = new Set();

    function addBucketsFromDOM() {
        document.querySelectorAll('.taskBoardColumn').forEach(col => {
            const titleEl = col.querySelector('.columnTitle h3');
            if (!titleEl) return;

            const title = titleEl.innerText.trim();
            if (seenBuckets.has(title)) return;

            seenBuckets.add(title);

            const id = title.replace(/\s+/g, '-');
            const list = document.getElementById('filter-list');

            const item = document.createElement('div');
            item.className = 'filter-item';

            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.id = `chk-${id}`;
            chk.onchange = () => {
                col.style.display = chk.checked ? 'none' : '';
            };

            const lbl = document.createElement('label');
            lbl.htmlFor = chk.id;
            lbl.textContent = title;

            item.append(chk, lbl);
            list.appendChild(item);
        });
    }

    /* ===============================
       MUTATION OBSERVER (KEY FIX)
    =============================== */

    function observeBuckets() {
        const board = document.querySelector('.columnsList');
        if (!board) return;

        const obs = new MutationObserver(addBucketsFromDOM);
        obs.observe(board, {
            childList: true,
            subtree: true
        });
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
       INIT
    =============================== */

    const init = setInterval(() => {
        if (!document.querySelector('.taskBoardView')) return;
        clearInterval(init);

        applyTheme();
        observeBuckets();
        addBucketsFromDOM();

        setTimeout(forceRenderAllBucketsSlow, 800);
    }, 500);

})();

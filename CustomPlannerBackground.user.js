// ==UserScript==
// @name         Custom Planner Background 2.9.5
// @namespace    https://tampermonkey.net/
// @version      2.9.5
// @description  Planner background with random Google Drive images + ordered bucket filter
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
    const version = '2.9.5';

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
       THEME (UNCHANGED)
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
       FILTER PANEL UI
    =============================== */
    const panel = document.createElement('div');
    panel.id = 'bucket-filter-panel';
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
            <div class="filter-controls">
                <button id="hide-all">Hide all</button>
                <button id="show-all">Show all</button>
            </div>
            <div id="filter-list"></div>
        </div>
    `;
    document.body.appendChild(panel);

    /* ===============================
       DRAGGABLE PANEL
    =============================== */
    let dragging = false, ox = 0, oy = 0;
    panel.addEventListener('mousedown', e => {
        if (e.target.closest('button')) return;
        dragging = true;
        ox = e.clientX - panel.offsetLeft;
        oy = e.clientY - panel.offsetTop;
    });
    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        panel.style.left = (e.clientX - ox) + 'px';
        panel.style.top = (e.clientY - oy) + 'px';
    });
    document.addEventListener('mouseup', () => dragging = false);

    /* ===============================
       BUCKET COLLECTION (ORDERED)
    =============================== */

    let bucketArray = [];

    function collectBucketsInOrder() {
        const cols = document.querySelectorAll('.taskBoardColumn');
        const result = [];

        cols.forEach(col => {
            const titleEl = col.querySelector('.columnTitle h3');
            if (!titleEl) return;

            const title = titleEl.innerText.trim();
            result.push({ title, col });
        });

        return result;
    }

    function renderBucketList() {
        const list = document.getElementById('filter-list');
        list.innerHTML = '';

        bucketArray.forEach(({ title, col }) => {
            const item = document.createElement('div');
            item.className = 'filter-item';

            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.onchange = () => {
                col.style.display = chk.checked ? 'none' : '';
            };

            const lbl = document.createElement('label');
            lbl.textContent = title;

            item.append(chk, lbl);
            list.appendChild(item);
        });
    }

    /* ===============================
       FORCE RENDER (3 PASSES)
    =============================== */
    function forceRenderOnce() {
        const board = document.querySelector('.columnsList');
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
                setTimeout(() => board.scrollLeft = 0, 400);
            }
        }
        scroll();
    }

    function fullBucketRescan() {
        let pass = 0;

        const runner = setInterval(() => {
            forceRenderOnce();
            pass++;

            if (pass === 3) {
                clearInterval(runner);
                setTimeout(() => {
                    bucketArray = collectBucketsInOrder();
                    renderBucketList();
                }, 600);
            }
        }, 1200);
    }

    /* ===============================
       EVENTS
    =============================== */
    document.addEventListener('click', e => {
        if (e.target.id === 'randomBG') changeBackground();
        if (e.target.id === 'refreshBuckets') fullBucketRescan();

        if (e.target.id === 'hide-all') {
            bucketArray.forEach(b => b.col.style.display = 'none');
            document.querySelectorAll('#filter-list input').forEach(c => c.checked = true);
        }

        if (e.target.id === 'show-all') {
            bucketArray.forEach(b => b.col.style.display = '');
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
        fullBucketRescan();
    }, 500);

})();

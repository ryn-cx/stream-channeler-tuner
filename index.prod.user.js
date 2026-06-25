// ==UserScript==
// @name          Stream Channeler Remote
// @namespace     https://streamchanneler.com/
// @version       0.0.1
// @author        ryn.cx
// @description   Companion for Stream Channeler that controls media playback and assists in channel creation.
// @match         https://streamchanneler.com/channels
// @match         https://streamchanneler.com/channels/*
// @match         http://localhost:5173/*
// @match         https://www.crunchyroll.com/watch/*
// @match         https://play.hbomax.com/video/watch/*
// @match         https://play.hbomax.com/show/*
// @match         https://www.netflix.com/*
// @match         https://www3.nhk.or.jp/nhkworld/en/shows/*
// @match         https://www.youtube.com/watch*
// @match         https://www.crunchyroll.com/series/*
// @match         https://www.justwatch.com/*/tv-show/*
// @match         https://www.justwatch.com/*/movie/*
// @match         https://www.youtube.com/@*
// @match         https://www.youtube.com/channel/*
// @match         https://www.youtube.com/c/*
// @match         https://www.youtube.com/user/*
// @source        https://github.com/ryn-cx/stream-channeler-tuner
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_addValueChangeListener
// @grant         GM_deleteValue
// @run-at        document-end
// ==/UserScript==

/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/manage.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Ad: () => (/* binding */ initManage),
/* harmony export */   Bj: () => (/* binding */ getLastChannelId),
/* harmony export */   Nf: () => (/* binding */ setLastChannelId),
/* harmony export */   YG: () => (/* binding */ getChannelQueues),
/* harmony export */   k2: () => (/* binding */ setChannelQueues)
/* harmony export */ });
// TODO: Validate
const LOG = "[Stream Channeler Remote]";
// https://lucide.dev/icons/radio-tower
const LOAD_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-radio-tower"><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><path d="M16.2 4.7a6.14 6.14 0 0 1 .8 7.5"/><path d="M19.1 1.9a10.14 10.14 0 0 1 0 14.2"/><path d="M9.56 14l-2.35 8.68"/><path d="M14.44 14l2.35 8.68"/><circle cx="12" cy="12" r="2"/></svg>`;
// https://lucide.dev/icons/antenna
const INSERT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-antenna-icon lucide-antenna"><path d="M2 12 7 2"/><path d="m7 12 5-10"/><path d="m12 12 5-10"/><path d="m17 12 5-10"/><path d="M4.5 7h15"/><path d="M12 16v6"/></svg>`;
function getChannelQueues() {
    return GM_getValue("antennaChannels", {});
}
function setChannelQueues(channels) {
    GM_setValue("antennaChannels", channels);
}
function getLastChannelId() {
    return GM_getValue("antennaLastChannelId", null);
}
function setLastChannelId(channelId) {
    GM_setValue("antennaLastChannelId", channelId);
}
async function fetchChannelShowUrls(channelId) {
    const token = localStorage.getItem("access_token");
    if (!token)
        throw new Error(`${LOG} No access_token in localStorage — log in to streamchanneler.com first`);
    const response = await fetch(`https://api.streamchanneler.com/api/v1/channels/${channelId}/shows`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok)
        throw new Error(`${LOG} Failed to fetch shows for channel ${channelId}: ${response.status}`);
    const data = (await response.json());
    return data.shows.map((s) => s.url);
}
async function loadBlankChannels() {
    const existing = getChannelQueues();
    const hasExisting = Object.keys(existing).length > 0 &&
        Object.values(existing).some((ch) => ch.urls.length > 0);
    // Have a popup warning the user that loading this data will overwrite existing
    // data. Overwriting data is intentional so this allows the user to clear urls after
    // they have been imported.
    if (hasExisting) {
        const confirmed = confirm("This will replace all existing channel data (including queued URLs). Continue?");
        if (!confirmed)
            return;
    }
    // Get all of the channels from the page's html.
    const channels = {};
    const links = document.querySelectorAll('a[href*="/channels/"]');
    for (const link of links) {
        const match = link.getAttribute("href")?.match(/\/channels\/([a-f0-9-]+)/);
        if (!match)
            continue;
        channels[match[1]] = {
            name: link.textContent.trim(),
            urls: [],
            showUrls: [],
        };
    }
    // Fetch the shows already attached to each channel so plugins can detect when
    // the current page URL is already present on a channel.
    const ids = Object.keys(channels);
    const showUrlLists = await Promise.all(ids.map(fetchChannelShowUrls));
    let totalShows = 0;
    ids.forEach((id, i) => {
        channels[id].showUrls = showUrlLists[i];
        totalShows += showUrlLists[i].length;
    });
    setChannelQueues(channels);
    alert(`Loaded ${ids.length} channels (${totalShows} shows) into Stream Channeler Remote.`);
}
function pasteQueue() {
    const textarea = document.querySelector('[data-slot="dialog-content"] textarea');
    if (!textarea)
        throw new Error(`${LOG} Textarea not found in bulk import modal`);
    const channels = getChannelQueues();
    const output = {};
    for (const [id, channel] of Object.entries(channels)) {
        if (channel.urls.length > 0) {
            output[id] = channel.urls;
        }
    }
    textarea.value = JSON.stringify(output, null, 2);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    console.log(`${LOG} Inserted URLs for ${Object.keys(output).length} channels`);
}
function addButtonsToModal(dialog) {
    const modalFooter = dialog.querySelector('[data-slot="dialog-footer"]');
    if (!modalFooter)
        return;
    if (modalFooter.querySelector("#manage-load-btn"))
        return;
    const existingBtn = modalFooter.querySelector("button");
    if (!existingBtn)
        throw new Error(`${LOG} No button found in dialog footer`);
    const btnClass = existingBtn.className;
    const loadBtn = document.createElement("button");
    loadBtn.id = "manage-load-btn";
    loadBtn.className = btnClass;
    loadBtn.setAttribute("data-slot", "button");
    loadBtn.innerHTML = `${INSERT_ICON_SVG}Load Channels`;
    loadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        void loadBlankChannels();
    });
    const insertBtn = document.createElement("button");
    insertBtn.id = "manage-insert-btn";
    insertBtn.className = btnClass;
    insertBtn.setAttribute("data-slot", "button");
    insertBtn.innerHTML = `${LOAD_ICON_SVG}Insert URLs`;
    insertBtn.addEventListener("click", (e) => {
        e.preventDefault();
        pasteQueue();
    });
    modalFooter.insertBefore(insertBtn, modalFooter.firstChild);
    modalFooter.insertBefore(loadBtn, modalFooter.firstChild);
}
function initManage() {
    if (location.pathname !== "/channels")
        return;
    console.log(`${LOG} Watching for bulk import modal`);
    new MutationObserver(() => {
        const dialog = document.querySelector('[data-slot="dialog-content"]');
        if (!dialog)
            return;
        const title = dialog.querySelector('[data-slot="dialog-title"]');
        if (title?.textContent?.trim() === "Bulk Import") {
            addButtonsToModal(dialog);
        }
    }).observe(document.body, { childList: true, subtree: true });
}


/***/ },

/***/ "./src/manage/crunchyroll/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/crunchyroll/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// Crunchyroll series URLs look like /series/GT00375170/the-food-diary-of-miss-maid.
// Match by series ID so the highlight survives slug or trailing-slash differences
// between the page URL and the URL stored against a channel.
const SERIES_ID_RE = /\/series\/([A-Z0-9]+)/;
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "Crunchyroll",
        buttonColor: "#000000",
        urlRegex: /\/series\/[A-Z0-9]+/,
        waitSelector: "h1",
        getCurrentUrl: () => location.href,
        getMatchKey: (url) => url.match(SERIES_ID_RE)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/manage/justwatch/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/justwatch/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "JustWatch",
        buttonColor: "#fbc500",
        textColor: "#060d17",
        // JustWatch title pages look like /us/tv-show/<slug> or /us/movie/<slug>.
        urlRegex: /\/(tv-show|movie)\//,
        waitSelector: ".title-detail-hero__details",
        getCurrentUrl: () => location.href,
        getMatchKey: (url) => url,
        showSourceInput: true,
    });
}


/***/ },

/***/ "./src/manage/nhkworld/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/nhkworld/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// NHK World show pages look like /nhkworld/en/shows/100years-midosuji/ where the
// trailing segment is a slug, while individual episode/video pages use an
// all-numeric id (e.g. /nhkworld/en/shows/2019439/). Only show pages should get
// the "Add to Channel" button, so require a non-numeric trailing segment.
const SHOW_PATH_RE = /^\/nhkworld\/en\/shows\/(?!\d+\/?$)[^/]+\/?$/;
// Match by the show slug so the highlight survives trailing-slash differences
// between the page URL and the URL stored against a channel.
const SLUG_RE = /\/shows\/([^/]+)\/?$/;
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "NHK World",
        buttonColor: "#00a0c6",
        urlRegex: SHOW_PATH_RE,
        waitSelector: ".pProgramHero__main",
        getCurrentUrl: () => location.href,
        getMatchKey: (url) => url.match(SLUG_RE)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/manage/youtube/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _manage_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/manage/youtube/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// YouTube channels are reachable via several URL forms (/@handle, /channel/UC…,
// /c/…, /user/…) but the Stream Channeler API stores them as /channel/UC…, so
// match by the channel's UC… id pulled from page metadata.
const CHANNEL_ID_RE = /\/channel\/(UC[\w-]+)/;
function extractChannelId(url) {
    return url.match(CHANNEL_ID_RE)?.[1] ?? null;
}
function getCurrentChannelId() {
    // The /@handle URL doesn't contain the UC… id. YouTube renders a canonical
    // <link> and several meta tags pointing at the /channel/UC… form — read those.
    const canonical = document.querySelector('link[rel="canonical"]');
    const fromCanonical = canonical ? extractChannelId(canonical.href) : null;
    if (fromCanonical)
        return fromCanonical;
    const meta = document.querySelector('meta[itemprop="identifier"], meta[itemprop="channelId"]');
    if (meta?.content?.startsWith("UC"))
        return meta.content;
    return extractChannelId(location.href);
}
function init() {
    (0,_manage_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initManagePlugin */ .v)({
        website_name: "YouTube",
        buttonColor: "#ff0000",
        urlRegex: /^\/(@|channel\/|c\/|user\/)/,
        // YouTube's channel-page DOM rotates between Polymer rebuilds, so don't
        // depend on a specific anchor — the footer floats over the page anyway.
        waitSelector: "body",
        getCurrentUrl: () => {
            const id = getCurrentChannelId();
            return id ? `https://www.youtube.com/channel/${id}` : location.href;
        },
        getMatchKey: extractChannelId,
    });
}


/***/ },

/***/ "./src/manage_plugin.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   v: () => (/* binding */ initManagePlugin)
/* harmony export */ });
/* harmony import */ var _manage__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/manage.ts");
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/shared.ts");
// TODO: Validate


// Every site renders the same compact widget pinned to the bottom-right corner
// so the UI looks consistent regardless of the host page's layout.
const FOOTER_STYLE = "position:fixed;bottom:16px;right:16px;z-index:2147483647;display:flex;gap:8px;align-items:center;padding:8px 10px;background:rgba(15,15,15,0.92);border:1px solid #303030;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.5);font-family:system-ui,sans-serif;font-size:13px;";
const SELECT_STYLE = "min-width:180px;padding:6px 10px;border-radius:4px;border:1px solid #3a4a5c;background:#1c252f;color:#fff;font-size:13px;";
const INPUT_STYLE = "width:130px;padding:6px 10px;border-radius:4px;border:1px solid #3a4a5c;background:#1c252f;color:#fff;font-size:13px;";
function initManagePlugin(config) {
    const LOG = `[Stream Channeler Remote] [${config.website_name}]`;
    const containerId = `manage-${config.website_name.toLowerCase()}-container`;
    const textColor = config.textColor ?? "#fff";
    // Tracks the user dismissing the footer. Intentionally not persisted — the
    // footer reappears on the next page load and whenever the page changes.
    let closed = false;
    // The resolved URL the footer was last built for. Survives a manual close so
    // that dismissing the footer keeps it hidden on the *same* page but navigating
    // to a new page brings it back. Comparing the *resolved* URL (not
    // location.href) lets derived metadata like YouTube's canonical <link> settle
    // before rebuilding, avoiding a flash of stale highlight state.
    let lastSeenUrl = null;
    function createUI() {
        if (document.getElementById(containerId))
            return;
        const channelEntries = Object.entries((0,_manage__WEBPACK_IMPORTED_MODULE_0__/* .getChannelQueues */ .YG)());
        const initialUrl = config.getCurrentUrl();
        lastSeenUrl = initialUrl;
        const currentKey = config.getMatchKey(initialUrl);
        console.log(`${LOG} currentUrl=${initialUrl} currentKey=${currentKey}`);
        if (!currentKey) {
            console.warn(`${LOG} Could not extract a match key from the current page — highlight will be skipped`);
        }
        const isOnChannel = (channelName, showUrls) => {
            if (!currentKey)
                return false;
            const urls = showUrls ?? [];
            if (urls.length === 0) {
                console.log(`${LOG} Channel "${channelName}" has no showUrls loaded (run "Load Channels" on /channels to populate)`);
                return false;
            }
            const showKeys = urls.map(config.getMatchKey);
            const match = showKeys.includes(currentKey);
            console.log(`${LOG} Channel "${channelName}": ${urls.length} shows, keys=${JSON.stringify(showKeys)}, match=${match}`);
            return match;
        };
        const optionTextFor = (channel) => {
            const marker = isOnChannel(channel.name, channel.showUrls) ? "★ " : "";
            return `${marker}${channel.name} (${channel.urls.length} queued)`;
        };
        const container = document.createElement("div");
        container.id = containerId;
        container.style.cssText = FOOTER_STYLE;
        const title = document.createElement("span");
        title.id = "manage-title";
        title.textContent = "Stream Channeler Remote";
        title.style.cssText = "color:#fff;font-weight:600;white-space:nowrap;";
        const select = document.createElement("select");
        select.id = "manage-channel-select";
        select.style.cssText = SELECT_STYLE;
        for (const [id, channel] of channelEntries) {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = optionTextFor(channel);
            if (isOnChannel(channel.name, channel.showUrls))
                option.style.color = config.buttonColor;
            select.appendChild(option);
        }
        // Restore the channel the user last selected (on any site) so the choice
        // persists across pages, then keep it up to date as they change it.
        const lastChannelId = (0,_manage__WEBPACK_IMPORTED_MODULE_0__/* .getLastChannelId */ .Bj)();
        if (lastChannelId && channelEntries.some(([id]) => id === lastChannelId)) {
            select.value = lastChannelId;
        }
        select.addEventListener("change", () => {
            if (select.value)
                (0,_manage__WEBPACK_IMPORTED_MODULE_0__/* .setLastChannelId */ .Nf)(select.value);
        });
        let sourceInput = null;
        if (config.showSourceInput) {
            sourceInput = document.createElement("input");
            sourceInput.id = "manage-source-input";
            sourceInput.type = "text";
            sourceInput.placeholder = "Source (optional)";
            sourceInput.style.cssText = INPUT_STYLE;
        }
        const btn = document.createElement("button");
        btn.id = "manage-add-btn";
        btn.textContent = "Add to Channel";
        btn.style.cssText = `padding:6px 16px;border-radius:4px;border:1px solid #3a4a5c;background:${config.buttonColor};color:${textColor};font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;`;
        btn.addEventListener("click", () => {
            const channelId = select.value;
            if (!channelId)
                return;
            (0,_manage__WEBPACK_IMPORTED_MODULE_0__/* .setLastChannelId */ .Nf)(channelId);
            // Re-read the URL on every click in case the SPA navigated without
            // tearing down the UI.
            const urlToQueue = config.getCurrentUrl();
            const source = sourceInput?.value.trim() ?? "";
            const fullUrl = source ? `${source} ${urlToQueue}` : urlToQueue;
            const allChannels = (0,_manage__WEBPACK_IMPORTED_MODULE_0__/* .getChannelQueues */ .YG)();
            const channel = allChannels[channelId];
            if (!channel)
                return;
            if (channel.urls.includes(fullUrl)) {
                console.log(`${LOG} URL already queued for channel "${channel.name}"`);
                btn.textContent = "Already Added";
                setTimeout(() => {
                    btn.textContent = "Add to Channel";
                }, 2000);
                return;
            }
            channel.urls.push(fullUrl);
            (0,_manage__WEBPACK_IMPORTED_MODULE_0__/* .setChannelQueues */ .k2)(allChannels);
            console.log(`${LOG} Added "${fullUrl}" to channel "${channel.name}" (${channel.urls.length} total)`);
            const option = select.querySelector(`option[value="${channelId}"]`);
            if (option)
                option.textContent = optionTextFor(channel);
            btn.textContent = "Added!";
            setTimeout(() => {
                btn.textContent = "Add to Channel";
            }, 2000);
        });
        const closeBtn = document.createElement("button");
        closeBtn.id = "manage-close-btn";
        closeBtn.textContent = "×";
        closeBtn.title = "Hide";
        closeBtn.setAttribute("aria-label", "Hide");
        closeBtn.style.cssText =
            "background:transparent;border:none;color:#aaa;font-size:18px;line-height:1;cursor:pointer;padding:0 2px;";
        closeBtn.addEventListener("click", () => {
            closed = true;
            removeUI();
        });
        container.appendChild(title);
        container.appendChild(select);
        if (sourceInput)
            container.appendChild(sourceInput);
        container.appendChild(btn);
        container.appendChild(closeBtn);
        document.body.appendChild(container);
        console.log(`${LOG} UI inserted with ${channelEntries.length} channels`);
    }
    function removeUI() {
        document.getElementById(containerId)?.remove();
    }
    function isValidPage() {
        return !config.urlRegex || config.urlRegex.test(location.pathname);
    }
    function ensureUI() {
        if (closed)
            return;
        if (!isValidPage()) {
            removeUI();
            return;
        }
        if (document.getElementById(containerId))
            return;
        createUI();
    }
    function onMutation() {
        // SPA sites (e.g. YouTube) navigate by pushing a new URL without reloading,
        // which would otherwise leave a stale footer in place. When the resolved
        // URL changes, re-show a dismissed footer and rebuild it for the new page.
        if (lastSeenUrl !== null && config.getCurrentUrl() !== lastSeenUrl) {
            lastSeenUrl = config.getCurrentUrl();
            closed = false;
            removeUI();
        }
        ensureUI();
    }
    console.log(`${LOG} Initializing on ${location.href}`);
    (0,_shared__WEBPACK_IMPORTED_MODULE_1__/* .waitForElement */ .xk)(config.waitSelector)
        .then(() => {
        ensureUI();
        new MutationObserver(onMutation).observe(document.body, {
            childList: true,
            subtree: true,
        });
    })
        .catch(() => {
        console.log(`${LOG} Could not find anchor element`);
    });
}


/***/ },

/***/ "./src/playback/crunchyroll/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/crunchyroll/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


const LOG = `${_shared__WEBPACK_IMPORTED_MODULE_0__/* .REMOTE_LOG */ .og} [Crunchyroll]`;
// Crunchyroll uses a native Bitmovin player: a <video id="bitmovinplayer-video-*">
// inside the ".video-player-wrapper" (which also holds Crunchyroll's controls).
const VIDEO_SELECTOR = 'video[id^="bitmovinplayer-video"]';
async function init() {
    // Only run the script if the tab was opened by Stream Channeler Remote.
    const loading = GM_getValue("loadingTab", false);
    if (!loading)
        return;
    GM_setValue("loadingTab", false);
    // Mount the overlay controls (stop + fullscreen toggle) once the player exists,
    // and auto-expand. Fake-fullscreen the Bitmovin container so its own controls
    // come along; fall back to the video's parent if the container class differs.
    try {
        const video = await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)(VIDEO_SELECTOR);
        // Fullscreen the whole player wrapper (which holds Crunchyroll's controls),
        // not just the video container — otherwise the controls are left behind.
        const player = video.closest(".video-player-wrapper") ??
            video.closest("#player-container") ??
            video.closest(".bitmovinplayer-container") ??
            video.parentElement ??
            video;
        console.log(`${LOG} Fullscreen target: <${player.tagName.toLowerCase()} class="${player.className}">`);
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .mountPlayerControls */ .Fy)({
            log: LOG,
            isExpanded: () => player.classList.contains(_shared__WEBPACK_IMPORTED_MODULE_0__/* .FAKE_FULLSCREEN_CLASS */ .HK),
            toggleExpand: () => (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .setFakeFullscreen */ .t7)(player, !player.classList.contains(_shared__WEBPACK_IMPORTED_MODULE_0__/* .FAKE_FULLSCREEN_CLASS */ .HK)),
            expandObserveTarget: player,
        });
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .setFakeFullscreen */ .t7)(player, true);
    }
    catch (error) {
        console.warn(`${LOG} Player not found; controls not mounted:`, error);
    }
    // Crunchyroll auto-advances by navigating, so detect the URL change.
    (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .watchUrlChange */ .Jm)(LOG);
}


/***/ },

/***/ "./src/playback/hbomax/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/hbomax/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


const LOG = `${_shared__WEBPACK_IMPORTED_MODULE_0__/* .REMOTE_LOG */ .og} [HBO Max]`;
// TODO: This code is completely untested it might work.
async function startVideo() {
    const season = GM_getValue("seasonNumber", null);
    const episode = GM_getValue("episodeNumber", null);
    if (season === null || episode === null) {
        throw new Error(`${LOG} Missing season/episode info (season=${season}, episode=${episode}). Card may not have valid episode data.`);
    }
    const dropdownButton = document.querySelector('[data-testid="generic-show-page-rail-episodes-tabbed-content_dropdown"] button');
    // Only select a season if there's a dropdown (multi-season show)
    if (dropdownButton) {
        const currentSeasonText = dropdownButton.textContent?.trim() ?? "";
        if (currentSeasonText !== `Season ${season}`) {
            dropdownButton.click();
            await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)('[role="option"], [role="menuitem"]');
            const options = document.querySelectorAll('[role="option"], [role="menuitem"]');
            const match = Array.from(options).find((option) => option.textContent === `Season ${season}`);
            if (!match)
                throw new Error(`${LOG} Could not find Season ${season} in dropdown`);
            match.click();
        }
    }
    // Wait for the episodes for the chosen season to load then click the correct one.
    const tileSelector = `a[data-sonic-type="video"][aria-label*="Season ${season}, Episode ${episode}:"]`;
    const targetTile = await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)(tileSelector);
    targetTile.click();
    // Wait for HBO to navigate to the watch page after clicking the episode
    await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
            if (location.pathname.includes("/video/watch/")) {
                observer.disconnect();
                resolve();
            }
        });
        observer.observe(document.querySelector("title") ?? document.head, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    });
    GM_setValue("loadingTab", true);
    (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initUrlChangePlugin */ .F5)("HBO Max");
}
function init() {
    // Only run the script if the tab was opened by Stream Channeler Remote.
    const loading = GM_getValue("loadingTab", false);
    if (!loading)
        return;
    GM_setValue("loadingTab", false);
    // On a watch page, use the standard URL change detection
    if (location.pathname.includes("/video/watch/")) {
        GM_setValue("loadingTab", true);
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initUrlChangePlugin */ .F5)("HBO Max");
        return;
    }
    // Sometimes JustWatch uses a URL that just links to the show instead of the specific
    // episodes so the episode needs to be started manually.
    startVideo();
}


/***/ },

/***/ "./src/playback/netflix/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/netflix/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


const LOG = `${_shared__WEBPACK_IMPORTED_MODULE_0__/* .REMOTE_LOG */ .og} [Netflix]`;
// JustWatch never has direct episode links for Netflix.
// TODO: This probably does not work.
// TODO: This definately does not handle choosing an account.
async function init() {
    const loading = GM_getValue("loadingTab", false);
    if (!loading)
        return;
    GM_setValue("loadingTab", false);
    const season = GM_getValue("seasonNumber", null);
    const episode = GM_getValue("episodeNumber", null);
    if (season === null || episode === null) {
        throw new Error(`${LOG} Missing season/episode info (season=${season}, episode=${episode})`);
    }
    // Season selection — only if dropdown exists (multi-season show)
    const dropdownButton = document.querySelector("button.dropdown-toggle");
    if (dropdownButton) {
        const currentSeasonText = dropdownButton.textContent?.trim() ?? "";
        if (currentSeasonText !== `Season ${season}`) {
            dropdownButton.click();
            await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)('[role="option"], .dropdown-menu a, .dropdown-menu li');
            const options = document.querySelectorAll('[role="option"], .dropdown-menu a, .dropdown-menu li');
            const match = Array.from(options).find((o) => o.textContent?.trim() === `Season ${season}`);
            if (!match)
                throw new Error(`${LOG} Could not find Season ${season} in dropdown`);
            match.click();
        }
    }
    // Wait for the correct season's episodes to load by polling the season label
    await new Promise((resolve) => {
        const check = () => {
            const label = document.querySelector(".allEpisodeSelector-season-label");
            if (label?.textContent?.trim() === `Season ${season}:`) {
                resolve();
                return;
            }
            setTimeout(check, 200);
        };
        check();
    });
    // Expand the episode list if it's collapsed
    const expandButton = document.querySelector('.section-divider.collapsed button[data-uia="section-expand"]');
    if (expandButton) {
        expandButton.click();
        await new Promise((resolve) => {
            const observer = new MutationObserver(() => {
                if (!document.querySelector(".section-divider.collapsed")) {
                    observer.disconnect();
                    resolve();
                }
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
            });
        });
    }
    await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)(".titleCardList--container.episode-item");
    const episodeItems = document.querySelectorAll(".titleCardList--container.episode-item");
    const targetEpisode = episodeItems[episode - 1] ?? null;
    if (!targetEpisode) {
        throw new Error(`${LOG} Could not find Episode ${episode} (index ${episode - 1}) in ${episodeItems.length} episodes`);
    }
    targetEpisode.click();
    // Wait for Netflix to navigate to the watch page
    await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
            if (location.pathname.startsWith("/watch/")) {
                observer.disconnect();
                resolve();
            }
        });
        observer.observe(document.querySelector("title") ?? document.head, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    });
    GM_setValue("loadingTab", true);
    (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initUrlChangePlugin */ .F5)("Netflix");
}


/***/ },

/***/ "./src/playback/nhkworld/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/nhkworld/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


const LOG = `${_shared__WEBPACK_IMPORTED_MODULE_0__/* .REMOTE_LOG */ .og} [NHK World]`;
function getPlayerDocument() {
    const iframe = document.querySelector('iframe[src*="world-player"]');
    return iframe?.contentDocument ?? null;
}
// Like waitForElement, but searches inside the player iframe's document. The
// iframe element and its document are re-read on every poll because the document
// is replaced as the iframe navigates to the player.
async function waitForPlayerElement(selector, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const element = getPlayerDocument()?.querySelector(selector) ?? null;
        if (element)
            return element;
        await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .sleep */ .yy)(250);
    }
    throw new Error(`${LOG} Timed out waiting for "${selector}" in player iframe`);
}
// The play/pause control's text and title flip to "Replay" once the video
// finishes, which is how we detect completion.
function isReplay(button) {
    if (button.getAttribute("title") === "Replay")
        return true;
    const text = button.querySelector(".vjs-control-text")?.textContent?.trim();
    return text === "Replay";
}
// Whether the video has started playing. NHK removes the "Watch Now" overlay
// (.tVideoEpisodePlayer__watchNow, which holds the WATCH NOW button) from the
// top page once playback begins, leaving just the playing iframe. That overlay's
// disappearance is the most reliable signal because it lives in the top
// document, unlike the player's <video> which is buried in the iframe.
function isPlaying() {
    const overlay = document.querySelector(".tVideoEpisodePlayer__watchNow");
    if (overlay === null || overlay.offsetParent === null)
        return true;
    // Fallback: the <video> inside the iframe reports active playback.
    const video = getPlayerDocument()?.querySelector("video.vjs-tech");
    return (video != null && !video.paused && !video.ended && video.readyState >= 2);
}
// NHK World does not autoplay — the video.js player is only mounted once the
// user clicks "Watch Now". The button lives in the top-level show page (not the
// iframe), and the click can land before the player is ready, so keep nudging
// whichever start control is available until playback actually begins.
async function startVideo() {
    const watchNow = await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)(".tVideoEpisodePlayer__watchNowBtn");
    console.log(`${LOG} Watch Now button found, starting playback`);
    watchNow.click();
    let attempt = 0;
    while (!isPlaying()) {
        await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .sleep */ .yy)(1000);
        if (isPlaying())
            break;
        attempt++;
        // The "Watch Now" button lives in the top page; once the player is mounted
        // it exposes its own big play button inside the iframe. Click whichever is
        // currently available to retry.
        const trigger = document.querySelector(".tVideoEpisodePlayer__watchNowBtn") ??
            getPlayerDocument()?.querySelector(".vjs-big-play-button") ??
            null;
        if (trigger) {
            console.log(`${LOG} Not playing yet, retrying start (attempt ${attempt})`);
            trigger.click();
        }
        else {
            console.log(`${LOG} Not playing yet, no start control available (attempt ${attempt})`);
        }
    }
    console.log(`${LOG} Playback confirmed`);
}
// Real fullscreen needs a user gesture, which an automated tab doesn't have.
// Instead, fake it: NHK's own stylesheet pins
// ".world-player-iframe.world-player-fullscreen" to cover the whole viewport
// (position:fixed, 100vw/100dvh, z-index:9999) and hides body overflow, so just
// add that class to the player iframe. No Fullscreen API, no gesture needed.
async function fullscreenVideo() {
    const iframe = await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)(".world-player-iframe");
    iframe.classList.add("world-player-fullscreen");
    console.log(`${LOG} Player expanded to cover the page`);
}
// Watch the play control inside the iframe for the "Replay" state, which signals
// completion.
async function watchForCompletion() {
    const button = await waitForPlayerElement(".vjs-play-control");
    console.log(`${LOG} Play control found, watching for completion`);
    if (isReplay(button)) {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .signalEpisodeEnded */ .e$)();
        return;
    }
    const observer = new MutationObserver(() => {
        if (isReplay(button)) {
            observer.disconnect();
            (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .signalEpisodeEnded */ .e$)();
        }
    });
    observer.observe(button, {
        attributes: true,
        attributeFilter: ["title", "class"],
        childList: true,
        subtree: true,
        characterData: true,
    });
}
// Add the overlay controls, wiring NHK's fake fullscreen (a class on the player
// iframe element, which lives in the top page) into the shared component.
async function mountControls() {
    const iframe = await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)(".world-player-iframe");
    (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .mountPlayerControls */ .Fy)({
        log: LOG,
        isExpanded: () => iframe.classList.contains("world-player-fullscreen"),
        toggleExpand: () => {
            iframe.classList.toggle("world-player-fullscreen");
        },
        expandObserveTarget: iframe,
    });
}
async function init() {
    // Only run the script if the tab was opened by Stream Channeler Remote.
    const loading = GM_getValue("loadingTab", false);
    if (!loading)
        return;
    GM_setValue("loadingTab", false);
    await startVideo();
    await fullscreenVideo();
    await mountControls();
    await watchForCompletion();
}


/***/ },

/***/ "./src/playback/youtube/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/playback/youtube/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate

const LOG = `${_shared__WEBPACK_IMPORTED_MODULE_0__/* .REMOTE_LOG */ .og} [YouTube]`;

// #movie_player holds the video and YouTube's own controls. The shared helper
// fake-fullscreens it in place and lifts its ancestors' stacking so the player
// (which YouTube's transformed layout would otherwise trap under the page)
// floats on top.
function mountControls(player) {
    (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .mountPlayerControls */ .Fy)({
        log: LOG,
        isExpanded: () => player.classList.contains(_shared__WEBPACK_IMPORTED_MODULE_0__/* .FAKE_FULLSCREEN_CLASS */ .HK),
        toggleExpand: () => (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .setFakeFullscreen */ .t7)(player, !player.classList.contains(_shared__WEBPACK_IMPORTED_MODULE_0__/* .FAKE_FULLSCREEN_CLASS */ .HK)),
        expandObserveTarget: player,
    });
}
// The player gains the "ended-mode" class once the video finishes, which is
// how we detect completion.
function watchForCompletion(player) {
    const observer = new MutationObserver(() => {
        if (player.classList.contains("ended-mode")) {
            observer.disconnect();
            (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .signalEpisodeEnded */ .e$)();
        }
    });
    observer.observe(player, { attributes: true, attributeFilter: ["class"] });
}
async function init() {
    // Only run the script if the tab was opened by Stream Channeler Remote.
    const loading = GM_getValue("loadingTab", false);
    if (!loading)
        return;
    GM_setValue("loadingTab", false);
    console.log(`${LOG} Tab opened by Stream Channeler Remote, initializing`);
    // YouTube is a Polymer SPA — the player is created asynchronously and may not
    // exist yet at document-end, so wait for it instead of grabbing it eagerly.
    const player = await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)("#movie_player");
    console.log(`${LOG} Player found`);
    // Run each step independently so a failure in one doesn't block the others.
    try {
        mountControls(player);
        console.log(`${LOG} Controls mounted`);
    }
    catch (error) {
        console.error(`${LOG} mountControls failed:`, error);
    }
    // YouTube keeps restyling #movie_player while it lays the player out after load
    // (it has player-resize-delay/transition experiments); applying our fullscreen
    // styles during that window gets overwritten. Wait until it stops restyling the
    // player so the fake fullscreen sticks.
    await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForQuiet */ .PL)(player);
    try {
        (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .setFakeFullscreen */ .t7)(player, true);
        console.log(`${LOG} Fullscreen applied`);
    }
    catch (error) {
        console.error(`${LOG} setFakeFullscreen failed:`, error);
    }
    watchForCompletion(player);
    console.log(`${LOG} Watching for end`);
}


/***/ },

/***/ "./src/shared.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   F5: () => (/* binding */ initUrlChangePlugin),
/* harmony export */   Fy: () => (/* binding */ mountPlayerControls),
/* harmony export */   HK: () => (/* binding */ FAKE_FULLSCREEN_CLASS),
/* harmony export */   Jm: () => (/* binding */ watchUrlChange),
/* harmony export */   PL: () => (/* binding */ waitForQuiet),
/* harmony export */   e$: () => (/* binding */ signalEpisodeEnded),
/* harmony export */   og: () => (/* binding */ REMOTE_LOG),
/* harmony export */   t7: () => (/* binding */ setFakeFullscreen),
/* harmony export */   xk: () => (/* binding */ waitForElement),
/* harmony export */   yy: () => (/* binding */ sleep)
/* harmony export */ });
/* unused harmony exports stopAutoControl, createStopButton */
// TODO: Validate
const REMOTE_LOG = "[Stream Channeler Remote]";
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function waitForElement(selector, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(selector);
        if (existing) {
            resolve(existing);
            return;
        }
        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                clearTimeout(timeout);
                resolve(el);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        const timeout = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`${REMOTE_LOG} Timed out waiting for "${selector}"`));
        }, timeoutMs);
    });
}
/**
 * Resolve once `element`'s own `style` attribute has been quiet (no changes) for
 * `quietMs`, or after `maxMs` as a hard stop. Used to wait for a busy SPA player
 * to finish laying itself out before we restyle it — adaptive, unlike a fixed
 * delay. Only the element's own attributes are watched (not the subtree) so
 * normal playback (progress bar, etc.) doesn't keep it from settling.
 */
function waitForQuiet(element, quietMs = 1200, maxMs = 10000) {
    return new Promise((resolve) => {
        let quietTimer = window.setTimeout(finish, quietMs);
        const hardTimer = window.setTimeout(finish, maxMs);
        const observer = new MutationObserver(() => {
            clearTimeout(quietTimer);
            quietTimer = window.setTimeout(finish, quietMs);
        });
        observer.observe(element, { attributes: true, attributeFilter: ["style"] });
        function finish() {
            clearTimeout(quietTimer);
            clearTimeout(hardTimer);
            observer.disconnect();
            resolve();
        }
    });
}
// When the user stops automatic control on a video tab, the page should stay
// open and never advance the channel. Gating signalEpisodeEnded() is enough
// because it is the single choke point that signals completion and closes the
// tab, regardless of which plugin detected the end.
let autoControlStopped = false;
// Mark automatic control as stopped so signalEpisodeEnded() stops advancing the
// channel and the current tab stays open. Exposed so plugins can wire it up to
// their own stop control (e.g. NHK embeds one in the player's control bar).
function stopAutoControl() {
    autoControlStopped = true;
    console.log(`${REMOTE_LOG} Automatic control stopped by user`);
    // Tell the controller on the channels page to stop too, so its Start/Stop
    // Remote button updates. A fresh timestamp guarantees a value change.
    GM_setValue("remoteStopRequested", Date.now());
}
// A small button pinned to the bottom-left that lets the user cancel automatic
// control of the current video. Styled to match the Manage "Add to Channel"
// widget. Hidden by default and revealed when the user moves the cursor (like a
// video player's controls), then auto-hides after a short idle period.
const STOP_BUTTON_HIDE_DELAY_MS = 3000;
function createStopButton() {
    if (document.getElementById("stream-channeler-stop-btn"))
        return;
    let stopped = false;
    const button = document.createElement("button");
    button.id = "stream-channeler-stop-btn";
    button.textContent = "Stop Auto Control";
    button.style.cssText =
        "position:fixed;bottom:16px;left:16px;z-index:2147483647;padding:6px 16px;border-radius:4px;border:1px solid #3a4a5c;background:#c0392b;color:#fff;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.5);opacity:0;pointer-events:none;transition:opacity 0.2s ease;";
    button.addEventListener("click", () => {
        stopped = true;
        stopAutoControl();
        button.textContent = "Auto Control Stopped";
        button.disabled = true;
        button.style.opacity = "0.6";
        button.style.cursor = "default";
    });
    // Reveal on cursor movement, then fade back out once the cursor is idle.
    let hideTimer;
    document.addEventListener("mousemove", () => {
        if (stopped)
            return;
        button.style.opacity = "1";
        button.style.pointerEvents = "auto";
        clearTimeout(hideTimer);
        hideTimer = window.setTimeout(() => {
            button.style.opacity = "0";
            button.style.pointerEvents = "none";
        }, STOP_BUTTON_HIDE_DELAY_MS);
    });
    document.body.appendChild(button);
}
// Icons as structured data (root svg attrs + child shapes). Built via
// createElementNS rather than from a markup string because YouTube's strict CSP
// (Trusted Types) blocks both innerHTML and DOMParser string sinks.
const SVG_NS = "http://www.w3.org/2000/svg";
const STROKE_ATTRS = {
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
};
const STOP_ICON = {
    attrs: {
        viewBox: "0 0 24 24",
        width: "16",
        height: "16",
        fill: "currentColor",
        "aria-hidden": "true",
    },
    shapes: [
        {
            tag: "rect",
            attrs: { x: "6", y: "6", width: "12", height: "12", rx: "1" },
        },
    ],
};
const RESTORE_ICON = {
    attrs: STROKE_ATTRS,
    shapes: [
        { tag: "path", attrs: { d: "M8 3v3a2 2 0 0 1-2 2H3" } },
        { tag: "path", attrs: { d: "M21 8h-3a2 2 0 0 1-2-2V3" } },
        { tag: "path", attrs: { d: "M3 16h3a2 2 0 0 1 2 2v3" } },
        { tag: "path", attrs: { d: "M16 21v-3a2 2 0 0 1 2-2h3" } },
    ],
};
const EXPAND_ICON = {
    attrs: STROKE_ATTRS,
    shapes: [
        { tag: "path", attrs: { d: "M8 3H5a2 2 0 0 0-2 2v3" } },
        { tag: "path", attrs: { d: "M21 8V5a2 2 0 0 0-2-2h-3" } },
        { tag: "path", attrs: { d: "M3 16v3a2 2 0 0 0 2 2h3" } },
        { tag: "path", attrs: { d: "M16 21h3a2 2 0 0 0 2-2v-3" } },
    ],
};
// Build an icon's SVG element with DOM APIs (no string parsing — CSP-safe).
function buildIcon(doc, spec) {
    const svg = doc.createElementNS(SVG_NS, "svg");
    for (const [k, v] of Object.entries(spec.attrs))
        svg.setAttribute(k, v);
    for (const shape of spec.shapes) {
        const el = doc.createElementNS(SVG_NS, shape.tag);
        for (const [k, v] of Object.entries(shape.attrs))
            el.setAttribute(k, v);
        svg.appendChild(el);
    }
    return svg;
}
// Set a button's content to an icon + visible label without using innerHTML.
function setButtonContent(doc, button, icon, label) {
    button.replaceChildren();
    button.appendChild(buildIcon(doc, icon));
    const span = doc.createElement("span");
    span.textContent = label;
    button.appendChild(span);
}
// Build a labelled overlay button (icon + visible title).
function createOverlayButton(doc, id, label, icon, onClick) {
    const button = doc.createElement("button");
    button.id = id;
    button.type = "button";
    button.title = label;
    button.style.cssText =
        "display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid rgba(255,255,255,0.35);border-radius:4px;background:rgba(0,0,0,0.6);color:#fff;font-family:system-ui,sans-serif;font-size:13px;font-weight:600;line-height:1;cursor:pointer;white-space:nowrap;";
    setButtonContent(doc, button, icon, label);
    button.addEventListener("click", (event) => {
        // Don't let the click reach the player (which toggles play/pause).
        event.stopPropagation();
        onClick();
    });
    return button;
}
// Fake fullscreen by covering the viewport with fixed inline styles, applied in
// place (the element never moves, so there's no reload and restore is exact).
// Styles are inline via CSSOM (not an injected <style>) so a strict CSP can't
// block them. Pass the player *wrapper* that contains the site's own controls so
// they come along into fullscreen.
const FAKE_FULLSCREEN_CLASS = "scr-fake-fullscreen";
const FAKE_FULLSCREEN_STYLES = {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    "z-index": "2147483646",
    background: "#000",
};
// While expanded, ancestors whose inline style we overrode (to lift the player
// to the top of the stacking order); their original inline style is restored on
// exit. Only one player per tab, so module-level state is fine.
let liftedAncestors = [];
function setFakeFullscreen(target, on) {
    if (on === target.classList.contains(FAKE_FULLSCREEN_CLASS))
        return;
    if (on) {
        for (const [prop, value] of Object.entries(FAKE_FULLSCREEN_STYLES)) {
            target.style.setProperty(prop, value, "important");
        }
        // A fixed player can be trapped inside a transformed ancestor's stacking
        // context, so other page elements paint over it. Lift every ancestor to the
        // top of its parent's stacking order so the whole chain (and the player)
        // floats above the page. z-index only changes paint order (no reflow); any
        // shift from positioning a static ancestor is hidden behind the player and
        // reverted on exit.
        liftedAncestors = [];
        for (let el = target.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
            liftedAncestors.push({ el, cssText: el.style.cssText });
            el.style.setProperty("z-index", "2147483646", "important");
            if (getComputedStyle(el).position === "static") {
                el.style.setProperty("position", "relative", "important");
            }
        }
        document.documentElement.style.overflow = "hidden";
        target.classList.add(FAKE_FULLSCREEN_CLASS);
    }
    else {
        for (const prop of Object.keys(FAKE_FULLSCREEN_STYLES)) {
            target.style.removeProperty(prop);
        }
        for (const { el, cssText } of liftedAncestors)
            el.style.cssText = cssText;
        liftedAncestors = [];
        document.documentElement.style.overflow = "";
        target.classList.remove(FAKE_FULLSCREEN_CLASS);
        // The player may have sized its <video> to fill the full-viewport area; clear
        // that inline size so it refits the restored player instead of overflowing.
        const video = target.querySelector("video");
        if (video) {
            for (const prop of ["width", "height", "left", "top", "transform"]) {
                video.style.removeProperty(prop);
            }
        }
        // Nudge a recompute (immediate + delayed, once layout settles).
        window.dispatchEvent(new Event("resize"));
        setTimeout(() => window.dispatchEvent(new Event("resize")), 300);
    }
}
// Add a generic controls overlay (Stop Auto Control + an expand/restore toggle)
// to every controller-opened tab. It's always pinned to the same spot — fixed in
// the top-left of the top page, above any fake-fullscreen player — independent of
// the site's own player. It rests faint and becomes solid on hover, so it stays
// discoverable without permanently covering the video. Site-specific behaviour
// (how fullscreen is faked) is supplied via `config`.
const CONTROLS_RESTING_OPACITY = "0.25";
function mountPlayerControls(config) {
    const log = config.log ?? REMOTE_LOG;
    if (document.getElementById("stream-channeler-controls"))
        return;
    const container = document.createElement("div");
    container.id = "stream-channeler-controls";
    container.style.cssText = `position:fixed;top:12px;left:12px;z-index:2147483647;display:flex;gap:8px;opacity:${CONTROLS_RESTING_OPACITY};transition:opacity 0.2s ease;`;
    container.addEventListener("mouseenter", () => {
        container.style.opacity = "1";
    });
    container.addEventListener("mouseleave", () => {
        container.style.opacity = CONTROLS_RESTING_OPACITY;
    });
    const stopButton = createOverlayButton(document, "stream-channeler-stop-btn", "Stop Auto Control", STOP_ICON, () => {
        stopAutoControl();
        stopButton.style.opacity = "0.5";
        stopButton.title = "Auto Control Stopped";
        const span = stopButton.querySelector("span");
        if (span)
            span.textContent = "Auto Control Stopped";
    });
    // Toggle the fake fullscreen; the icon/label flip to reflect the next action.
    const restoreLabel = config.restoreLabel ?? "Restore Original Size";
    let toggleButton;
    const updateToggle = () => {
        const expanded = config.isExpanded();
        const label = expanded ? restoreLabel : "Expand Video";
        toggleButton.title = label;
        setButtonContent(document, toggleButton, expanded ? RESTORE_ICON : EXPAND_ICON, label);
    };
    toggleButton = createOverlayButton(document, "stream-channeler-restore-btn", restoreLabel, RESTORE_ICON, () => {
        config.toggleExpand();
        updateToggle();
    });
    // Keep the toggle in sync when the expand state changes elsewhere (e.g. the
    // initial auto-expand done right after these controls mount).
    if (config.expandObserveTarget) {
        new MutationObserver(updateToggle).observe(config.expandObserveTarget, {
            attributes: true,
            attributeFilter: ["class", "style"],
        });
    }
    updateToggle();
    container.append(stopButton, toggleButton);
    document.body.appendChild(container);
    console.log(`${log} Player controls overlay added`);
}
function signalEpisodeEnded() {
    if (autoControlStopped) {
        console.log(`${REMOTE_LOG} Episode ended but automatic control is stopped — staying on tab`);
        return;
    }
    console.log(`${REMOTE_LOG} Episode ended, closing tab`);
    const now = Date.now();
    const current = GM_getValue("videoEnded", 0);
    console.log(`${REMOTE_LOG} Current videoEnded=${current}, now=${now}`);
    // Only signal if the current value is older (stop sets it to far future)
    if (now > current) {
        console.log(`${REMOTE_LOG} Signaling episode ended (setting videoEnded=${now})`);
        GM_setValue("videoEnded", now);
    }
    else {
        console.log(`${REMOTE_LOG} Skipping signal — current value is newer (stop was triggered?)`);
    }
    console.log(`${REMOTE_LOG} Closing tab`);
    window.close();
}
/**
 * Detect episode end via URL change: after a settle period (to avoid false
 * positives from redirects on load), watch for the page URL to change and signal
 * completion. Used by sites whose player auto-advances by navigating.
 */
function watchUrlChange(log) {
    // Sites may redirect the URL immediately on load, so wait before
    // capturing the URL to avoid a false positive.
    const SETTLE_DELAY_MS = 5000;
    console.log(`${log} Waiting ${SETTLE_DELAY_MS}ms for URL to settle`);
    setTimeout(() => {
        const initialUrl = location.href;
        console.log(`${log} Settle complete, watching for URL change from: ${initialUrl}`);
        function onEpisodeEnded() {
            console.log(`${log} URL changed to: ${location.href}`);
            console.log(`${log} Episode ended, cleaning up observers`);
            observer.disconnect();
            clearInterval(poll);
            signalEpisodeEnded();
        }
        function checkUrlChanged() {
            if (location.href !== initialUrl) {
                onEpisodeEnded();
            }
        }
        // Watch for URL changes via History API pushState/replaceState (SPA navigation)
        const observeTarget = document.querySelector("title") ?? document.head;
        console.log(`${log} Observing element for mutations: <${observeTarget.tagName.toLowerCase()}>`);
        const observer = new MutationObserver(checkUrlChanged);
        observer.observe(observeTarget, {
            childList: true,
            subtree: true,
            characterData: true,
        });
        // Fallback polling in case MutationObserver misses the navigation
        const poll = window.setInterval(checkUrlChanged, 2000);
        console.log(`${log} Polling every 2000ms as fallback`);
        // Also catch popstate events
        window.addEventListener("popstate", checkUrlChanged);
        console.log(`${log} Listening for popstate events`);
    }, SETTLE_DELAY_MS);
}
/**
 * Generic plugin for sites where episode end is detected by URL change, with the
 * floating stop button.
 */
function initUrlChangePlugin(name) {
    const LOG = `${REMOTE_LOG} [${name}]`;
    // Only run the script if the tab was opened by Stream Channeler Remote.
    const loading = GM_getValue("loadingTab", false);
    if (!loading)
        return;
    GM_setValue("loadingTab", false);
    createStopButton();
    watchUrlChange(LOG);
}


/***/ },

/***/ "./src/manage sync recursive \\/index\\.ts$"
(module, __unused_webpack_exports, __webpack_require__) {

var map = {
	"./crunchyroll/index.ts": "./src/manage/crunchyroll/index.ts",
	"./justwatch/index.ts": "./src/manage/justwatch/index.ts",
	"./nhkworld/index.ts": "./src/manage/nhkworld/index.ts",
	"./youtube/index.ts": "./src/manage/youtube/index.ts"
};


function webpackContext(req) {
	var id = webpackContextResolve(req);
	return __webpack_require__(id);
}
function webpackContextResolve(req) {
	if(!__webpack_require__.o(map, req)) {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return map[req];
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = "./src/manage sync recursive \\/index\\.ts$";

/***/ },

/***/ "./src/playback sync recursive \\/index\\.ts$"
(module, __unused_webpack_exports, __webpack_require__) {

var map = {
	"./crunchyroll/index.ts": "./src/playback/crunchyroll/index.ts",
	"./hbomax/index.ts": "./src/playback/hbomax/index.ts",
	"./netflix/index.ts": "./src/playback/netflix/index.ts",
	"./nhkworld/index.ts": "./src/playback/nhkworld/index.ts",
	"./youtube/index.ts": "./src/playback/youtube/index.ts"
};


function webpackContext(req) {
	var id = webpackContextResolve(req);
	return __webpack_require__(id);
}
function webpackContextResolve(req) {
	if(!__webpack_require__.o(map, req)) {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return map[req];
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = "./src/playback sync recursive \\/index\\.ts$";

/***/ },

/***/ "./src/manage/crunchyroll/matches.cjs"
(module) {

module.exports = {
  hostnames: ["crunchyroll.com"],
  matches: ["https://www.crunchyroll.com/series/*"],
};


/***/ },

/***/ "./src/manage/justwatch/matches.cjs"
(module) {

module.exports = {
  hostnames: ["justwatch.com"],
  matches: [
    "https://www.justwatch.com/*/tv-show/*",
    "https://www.justwatch.com/*/movie/*",
  ],
};


/***/ },

/***/ "./src/manage/nhkworld/matches.cjs"
(module) {

module.exports = {
  hostnames: ["nhk.or.jp"],
  matches: ["https://www3.nhk.or.jp/nhkworld/en/shows/*"],
};


/***/ },

/***/ "./src/manage/youtube/matches.cjs"
(module) {

module.exports = {
  hostnames: ["youtube.com"],
  matches: [
    "https://www.youtube.com/@*",
    "https://www.youtube.com/channel/*",
    "https://www.youtube.com/c/*",
    "https://www.youtube.com/user/*",
  ],
};


/***/ },

/***/ "./src/playback/crunchyroll/matches.cjs"
(module) {

module.exports = {
  hostnames: ["crunchyroll.com"],
  matches: ["https://www.crunchyroll.com/watch/*"],
};


/***/ },

/***/ "./src/playback/hbomax/matches.cjs"
(module) {

module.exports = {
  hostnames: ["hbomax.com"],
  matches: [
    "https://play.hbomax.com/video/watch/*",
    "https://play.hbomax.com/show/*",
  ],
};


/***/ },

/***/ "./src/playback/netflix/matches.cjs"
(module) {

module.exports = {
  hostnames: ["netflix.com"],
  matches: ["https://www.netflix.com/*"],
};


/***/ },

/***/ "./src/playback/nhkworld/matches.cjs"
(module) {

module.exports = {
  hostnames: ["nhk.or.jp"],
  matches: ["https://www3.nhk.or.jp/nhkworld/en/shows/*"],
};


/***/ },

/***/ "./src/playback/youtube/matches.cjs"
(module) {

module.exports = {
  hostnames: ["youtube.com"],
  matches: ["https://www.youtube.com/watch*"],
};


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";

;// ./src/playback.ts
// TODO: Validate
const CHANNEL_PATH_RE = /^\/channels\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i;
// https://lucide.dev/icons/monitor-play
const PLAY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-play-icon lucide-monitor-play"><path d="M15.033 9.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56V7.648a.645.645 0 0 1 .967-.56z"/><path d="M12 17v4"/><path d="M8 21h8"/><rect x="2" y="3" width="20" height="14" rx="2"/></svg>`;
// https://lucide.dev/icons/monitor-x
const STOP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-x-icon lucide-monitor-x"><path d="m14.5 12.5-5-5"/><path d="m9.5 12.5 5-5"/><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>`;
let cards = [];
let currentIndex = 0;
let running = false;
let listenerRegistered = false;
function promptSetCurrentIndex() {
    const input = window.prompt(`Set current episode (1-${cards.length}):`, String(currentIndex + 1));
    if (input === null)
        return;
    const parsed = parseInt(input, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > cards.length)
        return;
    currentIndex = parsed - 1;
    updateButton();
}
function handleButtonClick(event) {
    const target = event.target;
    if (target.closest("#remote-control-counter")) {
        event.preventDefault();
        promptSetCurrentIndex();
        return;
    }
    toggleRemote();
}
function updateButton() {
    let button = document.getElementById("remote-control-btn");
    if (!CHANNEL_PATH_RE.test(location.pathname)) {
        button?.remove();
        return;
    }
    if (!button) {
        const buttons = document.querySelectorAll("button");
        const lastButton = buttons[buttons.length - 1];
        if (!lastButton?.parentElement)
            return;
        button = document.createElement("button");
        button.id = "remote-control-btn";
        button.className = lastButton.className;
        button.setAttribute("data-slot", "button");
        button.addEventListener("click", handleButtonClick);
        lastButton.parentElement.appendChild(button);
    }
    const icon = running ? STOP_ICON_SVG : PLAY_ICON_SVG;
    const action = running ? "Stop Remote" : "Start Remote";
    const displayed = running ? currentIndex + 1 : currentIndex;
    const counter = `<span id="remote-control-counter" style="cursor:pointer;text-decoration:underline">${displayed}/${cards.length}</span>`;
    button.innerHTML = `${icon}${action} (${counter})`;
}
function extractEpisodeInfo(card) {
    const text = card.textContent ?? "";
    const epMatch = text.match(/Episode(?:\s*:)?\s*(\d+)/i);
    GM_setValue("episodeNumber", epMatch ? parseInt(epMatch[1], 10) : null);
    const seasonMatch = text.match(/Season(?:\s*:)?\s*(\d+)/i);
    GM_setValue("seasonNumber", seasonMatch ? parseInt(seasonMatch[1], 10) : null);
}
function clickCurrentCard() {
    // If all videos have been played stop remote.
    if (currentIndex >= cards.length) {
        stopRemote();
        return;
    }
    // Extract season/episode info from the card and store as GM values
    // so plugins on show pages can select the correct episode.
    extractEpisodeInfo(cards[currentIndex]);
    // loadingTab is used to make sure the script only activates on the specific tabs
    // that it opens.
    // TODO: This isn't a perfectly safe way of tracking this because the user could
    // trigger a race condition if they open a tab to a video at the same time as the
    // script opens a video.
    GM_setValue("loadingTab", true);
    cards[currentIndex].click();
    updateButton();
}
function stopRemote() {
    running = false;
    updateButton();
}
function startRemote() {
    if (cards.length === 0) {
        cards = Array.from(document.querySelectorAll('[data-slot="card"]'));
        currentIndex = 0;
    }
    console.log(`[Stream Channeler Remote] Starting at ${currentIndex}/${cards.length}`);
    running = true;
    // Listener to detect for when a video is completed.
    if (!listenerRegistered) {
        listenerRegistered = true;
        GM_addValueChangeListener("videoEnded", (_name, _oldValue, newValue) => {
            // Only automatically load the next channel if Stream Channeler Remote is in
            // an active state.
            if (!running)
                return;
            if (typeof newValue !== "number")
                throw new Error(`[Stream Channeler Remote] videoEnded value is not a number: ${newValue}`);
            currentIndex++;
            clickCurrentCard();
        });
    }
    clickCurrentCard();
}
function toggleRemote() {
    if (running) {
        stopRemote();
    }
    else {
        startRemote();
    }
}
function initPlayback() {
    // A video tab's "Stop Auto Control" button sets this; stop the remote so the
    // Start/Stop Remote button reflects it.
    GM_addValueChangeListener("remoteStopRequested", () => {
        if (running)
            stopRemote();
    });
    function syncState() {
        const newCards = Array.from(document.querySelectorAll('[data-slot="card"]'));
        // The user can remove cards (by verifying a watch) or changing card order (by
        // clicking the "Next Episode" button) so these changes need to be managed.
        if (newCards.length !== cards.length ||
            !newCards.every((c, i) => c === cards[i])) {
            const activeCard = cards[currentIndex];
            cards = newCards;
            if (activeCard) {
                const newIndex = cards.indexOf(activeCard);
                currentIndex = newIndex >= 0 ? newIndex : 0;
                // No activeCard can probably occur when the user verifies a watch on the last
                // episode of a
                // channel probably.
            }
            else {
                currentIndex = 0;
            }
        }
        updateButton();
    }
    let debounceTimer;
    new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(syncState, 200);
    }).observe(document.body, { childList: true, subtree: true });
    // Clean up just in case when tab is closed to avoid the script from activating on a
    // tab that is opened later on.
    window.addEventListener("beforeunload", () => {
        if (cards.length > 0) {
            GM_setValue("loadingTab", false);
        }
    });
}

// EXTERNAL MODULE: ./src/manage.ts
var manage = __webpack_require__("./src/manage.ts");
;// ./src/index.ts


function loadPlugins(ctx) {
    return ctx.keys().map((key) => ctx(key));
}
const playbackPlugins = loadPlugins(__webpack_require__("./src/playback sync recursive \\/index\\.ts$"));
const managePlugins = loadPlugins(__webpack_require__("./src/manage sync recursive \\/index\\.ts$"));
const playbackPlugin = playbackPlugins.find((p) => p.hostnames.some((h) => location.hostname.includes(h)));
const managePlugin = managePlugins.find((p) => p.hostnames.some((h) => location.hostname.includes(h)));
if (playbackPlugin)
    playbackPlugin.init();
if (managePlugin)
    managePlugin.init();
if (!playbackPlugin && !managePlugin) {
    if (location.hostname.includes("streamchanneler.com")) {
        initPlayback();
        (0,manage/* initManage */.Ad)();
    }
}

})();

/******/ })()
;
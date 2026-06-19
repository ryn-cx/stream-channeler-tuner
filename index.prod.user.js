// ==UserScript==
// @name          Stream Channeler Tuner
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

/***/ "./src/antenna.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Bj: () => (/* binding */ getLastChannelId),
/* harmony export */   EQ: () => (/* binding */ initAntenna),
/* harmony export */   Nf: () => (/* binding */ setLastChannelId),
/* harmony export */   YG: () => (/* binding */ getChannelQueues),
/* harmony export */   k2: () => (/* binding */ setChannelQueues)
/* harmony export */ });
// TODO: Validate
const LOG = "[Stream Channeler Antenna]";
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
        const confirmed = confirm("This will replace all existing antenna channel data (including queued URLs). Continue?");
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
    alert(`Loaded ${ids.length} channels (${totalShows} shows) into stream channeler antenna.`);
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
    if (modalFooter.querySelector("#antenna-load-btn"))
        return;
    const existingBtn = modalFooter.querySelector("button");
    if (!existingBtn)
        throw new Error(`${LOG} No button found in dialog footer`);
    const btnClass = existingBtn.className;
    const loadBtn = document.createElement("button");
    loadBtn.id = "antenna-load-btn";
    loadBtn.className = btnClass;
    loadBtn.setAttribute("data-slot", "button");
    loadBtn.innerHTML = `${INSERT_ICON_SVG}Load Channels`;
    loadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        void loadBlankChannels();
    });
    const insertBtn = document.createElement("button");
    insertBtn.id = "antenna-insert-btn";
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
function initAntenna() {
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

/***/ "./src/antenna/crunchyroll/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _antenna_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/antenna_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/antenna/crunchyroll/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


// Crunchyroll series URLs look like /series/GT00375170/the-food-diary-of-miss-maid.
// Match by series ID so the highlight survives slug or trailing-slash differences
// between the page URL and the URL stored against a channel.
const SERIES_ID_RE = /\/series\/([A-Z0-9]+)/;
function init() {
    (0,_antenna_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initAntennaPlugin */ .x)({
        website_name: "Crunchyroll",
        buttonColor: "#000000",
        urlRegex: /\/series\/[A-Z0-9]+/,
        waitSelector: "h1",
        getCurrentUrl: () => location.href,
        getMatchKey: (url) => url.match(SERIES_ID_RE)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/antenna/justwatch/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _antenna_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/antenna_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/antenna/justwatch/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


function init() {
    (0,_antenna_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initAntennaPlugin */ .x)({
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

/***/ "./src/antenna/nhkworld/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _antenna_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/antenna_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/antenna/nhkworld/matches.cjs");
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
    (0,_antenna_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initAntennaPlugin */ .x)({
        website_name: "NHK World",
        buttonColor: "#00a0c6",
        urlRegex: SHOW_PATH_RE,
        waitSelector: ".pProgramHero__main",
        getCurrentUrl: () => location.href,
        getMatchKey: (url) => url.match(SLUG_RE)?.[1] ?? null,
    });
}


/***/ },

/***/ "./src/antenna/youtube/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _antenna_plugin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/antenna_plugin.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/antenna/youtube/matches.cjs");
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
    (0,_antenna_plugin__WEBPACK_IMPORTED_MODULE_0__/* .initAntennaPlugin */ .x)({
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

/***/ "./src/antenna_plugin.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   x: () => (/* binding */ initAntennaPlugin)
/* harmony export */ });
/* harmony import */ var _antenna__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/antenna.ts");
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/shared.ts");
// TODO: Validate


// Every site renders the same compact widget pinned to the bottom-right corner
// so the UI looks consistent regardless of the host page's layout.
const FOOTER_STYLE = "position:fixed;bottom:16px;right:16px;z-index:2147483647;display:flex;gap:8px;align-items:center;padding:8px 10px;background:rgba(15,15,15,0.92);border:1px solid #303030;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.5);font-family:system-ui,sans-serif;font-size:13px;";
const SELECT_STYLE = "min-width:180px;padding:6px 10px;border-radius:4px;border:1px solid #3a4a5c;background:#1c252f;color:#fff;font-size:13px;";
const INPUT_STYLE = "width:130px;padding:6px 10px;border-radius:4px;border:1px solid #3a4a5c;background:#1c252f;color:#fff;font-size:13px;";
function initAntennaPlugin(config) {
    const LOG = `[Stream Channeler Antenna] [${config.website_name}]`;
    const containerId = `antenna-${config.website_name.toLowerCase()}-container`;
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
        const channelEntries = Object.entries((0,_antenna__WEBPACK_IMPORTED_MODULE_0__/* .getChannelQueues */ .YG)());
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
        title.id = "antenna-title";
        title.textContent = "Stream Channeler Antenna";
        title.style.cssText = "color:#fff;font-weight:600;white-space:nowrap;";
        const select = document.createElement("select");
        select.id = "antenna-channel-select";
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
        const lastChannelId = (0,_antenna__WEBPACK_IMPORTED_MODULE_0__/* .getLastChannelId */ .Bj)();
        if (lastChannelId && channelEntries.some(([id]) => id === lastChannelId)) {
            select.value = lastChannelId;
        }
        select.addEventListener("change", () => {
            if (select.value)
                (0,_antenna__WEBPACK_IMPORTED_MODULE_0__/* .setLastChannelId */ .Nf)(select.value);
        });
        let sourceInput = null;
        if (config.showSourceInput) {
            sourceInput = document.createElement("input");
            sourceInput.id = "antenna-source-input";
            sourceInput.type = "text";
            sourceInput.placeholder = "Source (optional)";
            sourceInput.style.cssText = INPUT_STYLE;
        }
        const btn = document.createElement("button");
        btn.id = "antenna-add-btn";
        btn.textContent = "Add to Channel";
        btn.style.cssText = `padding:6px 16px;border-radius:4px;border:1px solid #3a4a5c;background:${config.buttonColor};color:${textColor};font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;`;
        btn.addEventListener("click", () => {
            const channelId = select.value;
            if (!channelId)
                return;
            (0,_antenna__WEBPACK_IMPORTED_MODULE_0__/* .setLastChannelId */ .Nf)(channelId);
            // Re-read the URL on every click in case the SPA navigated without
            // tearing down the UI.
            const urlToQueue = config.getCurrentUrl();
            const source = sourceInput?.value.trim() ?? "";
            const fullUrl = source ? `${source} ${urlToQueue}` : urlToQueue;
            const allChannels = (0,_antenna__WEBPACK_IMPORTED_MODULE_0__/* .getChannelQueues */ .YG)();
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
            (0,_antenna__WEBPACK_IMPORTED_MODULE_0__/* .setChannelQueues */ .k2)(allChannels);
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
        closeBtn.id = "antenna-close-btn";
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

/***/ "./src/controller/crunchyroll/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/controller/crunchyroll/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


function init() {
    (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .initUrlChangePlugin */ .F5)("Crunchyroll");
}


/***/ },

/***/ "./src/controller/hbomax/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/controller/hbomax/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


const LOG = `${_shared__WEBPACK_IMPORTED_MODULE_0__/* .CONTROLLER_LOG */ .c9} [HBO Max]`;
// TODO: This code is completely untested it might work.
async function startEpisode() {
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
    // Only run the script if the tab was opened by Stream Channeler Controller.
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
    startEpisode();
}


/***/ },

/***/ "./src/controller/netflix/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/controller/netflix/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


const LOG = `${_shared__WEBPACK_IMPORTED_MODULE_0__/* .CONTROLLER_LOG */ .c9} [Netflix]`;
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

/***/ "./src/controller/nhkworld/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/controller/nhkworld/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate


const LOG = `${_shared__WEBPACK_IMPORTED_MODULE_0__/* .CONTROLLER_LOG */ .c9} [NHK World]`;
// NHK World embeds a video.js player. The play/pause control's text and title
// flip to "Replay" once the video finishes, which is how we detect completion.
function isReplay(button) {
    if (button.getAttribute("title") === "Replay")
        return true;
    const text = button.querySelector(".vjs-control-text")?.textContent?.trim();
    return text === "Replay";
}
async function init() {
    // Only run the script if the tab was opened by Stream Channeler Controller.
    const loading = GM_getValue("loadingTab", false);
    if (!loading)
        return;
    GM_setValue("loadingTab", false);
    // The play control is injected by video.js after the page loads, so wait for
    // it before watching for the "Replay" state.
    const button = await (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .waitForElement */ .xk)(".vjs-play-control");
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


/***/ },

/***/ "./src/controller/youtube/index.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hostnames: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.hostnames),
/* harmony export */   init: () => (/* binding */ init),
/* harmony export */   matches: () => (/* reexport safe */ _matches_cjs__WEBPACK_IMPORTED_MODULE_1__.matches)
/* harmony export */ });
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/shared.ts");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/controller/youtube/matches.cjs");
/* harmony import */ var _matches_cjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_matches_cjs__WEBPACK_IMPORTED_MODULE_1__);
// TODO: Validate

const LOG = `${_shared__WEBPACK_IMPORTED_MODULE_0__/* .CONTROLLER_LOG */ .c9} [YouTube]`;

function init() {
    // Only run the script if the tab was opened by Stream Channeler Controller.
    const loading = GM_getValue("loadingTab", false);
    if (!loading)
        return;
    GM_setValue("loadingTab", false);
    const player = document.getElementById("movie_player");
    if (!player)
        throw new Error(`${LOG} movie_player element not found on YouTube watch page`);
    let started = false;
    const observer = new MutationObserver(() => {
        if (!started && player.classList.contains("playing-mode")) {
            started = true;
            // TODO: This doesn't work.
            document.dispatchEvent(new KeyboardEvent("keydown", {
                key: "f",
                code: "KeyF",
                keyCode: 70,
                which: 70,
                bubbles: true,
                cancelable: true,
            }));
        }
        else if (started && player.classList.contains("ended-mode")) {
            observer.disconnect();
            (0,_shared__WEBPACK_IMPORTED_MODULE_0__/* .signalEpisodeEnded */ .e$)();
        }
    });
    observer.observe(player, { attributes: true, attributeFilter: ["class"] });
}


/***/ },

/***/ "./src/shared.ts"
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   F5: () => (/* binding */ initUrlChangePlugin),
/* harmony export */   c9: () => (/* binding */ CONTROLLER_LOG),
/* harmony export */   e$: () => (/* binding */ signalEpisodeEnded),
/* harmony export */   xk: () => (/* binding */ waitForElement)
/* harmony export */ });
/* unused harmony export sleep */
// TODO: Validate
const CONTROLLER_LOG = "[Stream Channeler Controller]";
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
            reject(new Error(`${CONTROLLER_LOG} Timed out waiting for "${selector}"`));
        }, timeoutMs);
    });
}
function signalEpisodeEnded() {
    console.log(`${CONTROLLER_LOG} Episode ended, closing tab`);
    const now = Date.now();
    const current = GM_getValue("videoEnded", 0);
    console.log(`${CONTROLLER_LOG} Current videoEnded=${current}, now=${now}`);
    // Only signal if the current value is older (stop sets it to far future)
    if (now > current) {
        console.log(`${CONTROLLER_LOG} Signaling episode ended (setting videoEnded=${now})`);
        GM_setValue("videoEnded", now);
    }
    else {
        console.log(`${CONTROLLER_LOG} Skipping signal — current value is newer (stop was triggered?)`);
    }
    console.log(`${CONTROLLER_LOG} Closing tab`);
    window.close();
}
/**
 * Generic plugin for sites where episode end is detected by URL change.
 * Waits for a settle period (to avoid false positives from redirects),
 * then watches for the URL to change.
 */
function initUrlChangePlugin(name) {
    const LOG = `${CONTROLLER_LOG} [${name}]`;
    // Only run the script if the tab was opened by Stream Channeler Controller.
    const loading = GM_getValue("loadingTab", false);
    if (!loading)
        return;
    GM_setValue("loadingTab", false);
    // Sites may redirect the URL immediately on load, so wait before
    // capturing the URL to avoid a false positive.
    const SETTLE_DELAY_MS = 5000;
    console.log(`${LOG} Waiting ${SETTLE_DELAY_MS}ms for URL to settle`);
    setTimeout(() => {
        const initialUrl = location.href;
        console.log(`${LOG} Settle complete, watching for URL change from: ${initialUrl}`);
        function onEpisodeEnded() {
            console.log(`${LOG} URL changed to: ${location.href}`);
            console.log(`${LOG} Episode ended, cleaning up observers`);
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
        console.log(`${LOG} Observing element for mutations: <${observeTarget.tagName.toLowerCase()}>`);
        const observer = new MutationObserver(checkUrlChanged);
        observer.observe(observeTarget, {
            childList: true,
            subtree: true,
            characterData: true,
        });
        // Fallback polling in case MutationObserver misses the navigation
        const poll = window.setInterval(checkUrlChanged, 2000);
        console.log(`${LOG} Polling every 2000ms as fallback`);
        // Also catch popstate events
        window.addEventListener("popstate", checkUrlChanged);
        console.log(`${LOG} Listening for popstate events`);
    }, SETTLE_DELAY_MS);
}


/***/ },

/***/ "./src/antenna sync recursive \\/index\\.ts$"
(module, __unused_webpack_exports, __webpack_require__) {

var map = {
	"./crunchyroll/index.ts": "./src/antenna/crunchyroll/index.ts",
	"./justwatch/index.ts": "./src/antenna/justwatch/index.ts",
	"./nhkworld/index.ts": "./src/antenna/nhkworld/index.ts",
	"./youtube/index.ts": "./src/antenna/youtube/index.ts"
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
webpackContext.id = "./src/antenna sync recursive \\/index\\.ts$";

/***/ },

/***/ "./src/controller sync recursive \\/index\\.ts$"
(module, __unused_webpack_exports, __webpack_require__) {

var map = {
	"./crunchyroll/index.ts": "./src/controller/crunchyroll/index.ts",
	"./hbomax/index.ts": "./src/controller/hbomax/index.ts",
	"./netflix/index.ts": "./src/controller/netflix/index.ts",
	"./nhkworld/index.ts": "./src/controller/nhkworld/index.ts",
	"./youtube/index.ts": "./src/controller/youtube/index.ts"
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
webpackContext.id = "./src/controller sync recursive \\/index\\.ts$";

/***/ },

/***/ "./src/antenna/crunchyroll/matches.cjs"
(module) {

module.exports = {
  hostnames: ["crunchyroll.com"],
  matches: ["https://www.crunchyroll.com/series/*"],
};


/***/ },

/***/ "./src/antenna/justwatch/matches.cjs"
(module) {

module.exports = {
  hostnames: ["justwatch.com"],
  matches: [
    "https://www.justwatch.com/*/tv-show/*",
    "https://www.justwatch.com/*/movie/*",
  ],
};


/***/ },

/***/ "./src/antenna/nhkworld/matches.cjs"
(module) {

module.exports = {
  hostnames: ["nhk.or.jp"],
  matches: ["https://www3.nhk.or.jp/nhkworld/en/shows/*"],
};


/***/ },

/***/ "./src/antenna/youtube/matches.cjs"
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

/***/ "./src/controller/crunchyroll/matches.cjs"
(module) {

module.exports = {
  hostnames: ["crunchyroll.com"],
  matches: ["https://www.crunchyroll.com/watch/*"],
};


/***/ },

/***/ "./src/controller/hbomax/matches.cjs"
(module) {

module.exports = {
  hostnames: ["hbomax.com"],
  matches: [
    "https://play.hbomax.com/video/watch/*",
    "https://play.hbomax.com/show/*",
  ],
};


/***/ },

/***/ "./src/controller/netflix/matches.cjs"
(module) {

module.exports = {
  hostnames: ["netflix.com"],
  matches: ["https://www.netflix.com/*"],
};


/***/ },

/***/ "./src/controller/nhkworld/matches.cjs"
(module) {

module.exports = {
  hostnames: ["nhk.or.jp"],
  matches: ["https://www3.nhk.or.jp/nhkworld/en/shows/*"],
};


/***/ },

/***/ "./src/controller/youtube/matches.cjs"
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

;// ./src/controller.ts
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
    toggleRemoteController();
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
    const action = running ? "Stop Remote Controller" : "Start Remote Controller";
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
    // If all videos have been played stop remote controller.
    if (currentIndex >= cards.length) {
        stopRemoteController();
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
function stopRemoteController() {
    running = false;
    updateButton();
}
function startRemoteController() {
    if (cards.length === 0) {
        cards = Array.from(document.querySelectorAll('[data-slot="card"]'));
        currentIndex = 0;
    }
    console.log(`[Stream Channeler Controller] Starting at ${currentIndex}/${cards.length}`);
    running = true;
    // Listener to detect for when a video is completed.
    if (!listenerRegistered) {
        listenerRegistered = true;
        GM_addValueChangeListener("videoEnded", (_name, _oldValue, newValue) => {
            // Only automatically load the next channel if stream channeler controller is in
            // an active state.
            if (!running)
                return;
            if (typeof newValue !== "number")
                throw new Error(`[Stream Channeler Controller] videoEnded value is not a number: ${newValue}`);
            currentIndex++;
            clickCurrentCard();
        });
    }
    clickCurrentCard();
}
function toggleRemoteController() {
    if (running) {
        stopRemoteController();
    }
    else {
        startRemoteController();
    }
}
function initController() {
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

// EXTERNAL MODULE: ./src/antenna.ts
var antenna = __webpack_require__("./src/antenna.ts");
;// ./src/index.ts


function loadPlugins(ctx) {
    return ctx.keys().map((key) => ctx(key));
}
const controllerPlugins = loadPlugins(__webpack_require__("./src/controller sync recursive \\/index\\.ts$"));
const antennaPlugins = loadPlugins(__webpack_require__("./src/antenna sync recursive \\/index\\.ts$"));
const controllerPlugin = controllerPlugins.find((p) => p.hostnames.some((h) => location.hostname.includes(h)));
const antennaPlugin = antennaPlugins.find((p) => p.hostnames.some((h) => location.hostname.includes(h)));
if (controllerPlugin)
    controllerPlugin.init();
if (antennaPlugin)
    antennaPlugin.init();
if (!controllerPlugin && !antennaPlugin) {
    if (location.hostname.includes("streamchanneler.com")) {
        initController();
        (0,antenna/* initAntenna */.EQ)();
    }
}

})();

/******/ })()
;
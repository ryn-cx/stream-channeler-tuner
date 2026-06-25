// TODO: Validate
import {
  getChannelQueues,
  getLastChannelId,
  setChannelQueues,
  setLastChannelId,
} from "./manage";
import { waitForElement } from "./shared";

export interface ManagePluginConfig {
  website_name: string;
  buttonColor: string;
  textColor?: string;
  urlRegex?: RegExp;
  /** A selector to wait for before trying to insert the UI. */
  waitSelector: string;
  /** Returns the URL to queue when the user clicks "Add to Channel". */
  getCurrentUrl: () => string;
  /** Extracts the comparable identity from a URL (channel id, series id, or just the URL itself). */
  getMatchKey: (url: string) => string | null;
  /** When true, render a "Source (optional)" text input that prefixes the queued URL. */
  showSourceInput?: boolean;
}

// Every site renders the same compact widget pinned to the bottom-right corner
// so the UI looks consistent regardless of the host page's layout.
const FOOTER_STYLE =
  "position:fixed;bottom:16px;right:16px;z-index:2147483647;display:flex;gap:8px;align-items:center;padding:8px 10px;background:rgba(15,15,15,0.92);border:1px solid #303030;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.5);font-family:system-ui,sans-serif;font-size:13px;";

const SELECT_STYLE =
  "min-width:180px;padding:6px 10px;border-radius:4px;border:1px solid #3a4a5c;background:#1c252f;color:#fff;font-size:13px;";
const INPUT_STYLE =
  "width:130px;padding:6px 10px;border-radius:4px;border:1px solid #3a4a5c;background:#1c252f;color:#fff;font-size:13px;";

export function initManagePlugin(config: ManagePluginConfig): void {
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
  let lastSeenUrl: string | null = null;

  function createUI(): void {
    if (document.getElementById(containerId)) return;

    const channelEntries = Object.entries(getChannelQueues());
    const initialUrl = config.getCurrentUrl();
    lastSeenUrl = initialUrl;
    const currentKey = config.getMatchKey(initialUrl);
    console.log(`${LOG} currentUrl=${initialUrl} currentKey=${currentKey}`);
    if (!currentKey) {
      console.warn(
        `${LOG} Could not extract a match key from the current page — highlight will be skipped`,
      );
    }

    const isOnChannel = (
      channelName: string,
      showUrls: string[] | undefined,
    ): boolean => {
      if (!currentKey) return false;
      const urls = showUrls ?? [];
      if (urls.length === 0) {
        console.log(
          `${LOG} Channel "${channelName}" has no showUrls loaded (run "Load Channels" on /channels to populate)`,
        );
        return false;
      }
      const showKeys = urls.map(config.getMatchKey);
      const match = showKeys.includes(currentKey);
      console.log(
        `${LOG} Channel "${channelName}": ${urls.length} shows, keys=${JSON.stringify(showKeys)}, match=${match}`,
      );
      return match;
    };

    const optionTextFor = (channel: {
      name: string;
      urls: string[];
      showUrls: string[];
    }): string => {
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
    const lastChannelId = getLastChannelId();
    if (lastChannelId && channelEntries.some(([id]) => id === lastChannelId)) {
      select.value = lastChannelId;
    }
    select.addEventListener("change", () => {
      if (select.value) setLastChannelId(select.value);
    });

    let sourceInput: HTMLInputElement | null = null;
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
      if (!channelId) return;
      setLastChannelId(channelId);

      // Re-read the URL on every click in case the SPA navigated without
      // tearing down the UI.
      const urlToQueue = config.getCurrentUrl();
      const source = sourceInput?.value.trim() ?? "";
      const fullUrl = source ? `${source} ${urlToQueue}` : urlToQueue;

      const allChannels = getChannelQueues();
      const channel = allChannels[channelId];
      if (!channel) return;

      if (channel.urls.includes(fullUrl)) {
        console.log(`${LOG} URL already queued for channel "${channel.name}"`);
        btn.textContent = "Already Added";
        setTimeout(() => {
          btn.textContent = "Add to Channel";
        }, 2000);
        return;
      }

      channel.urls.push(fullUrl);
      setChannelQueues(allChannels);
      console.log(
        `${LOG} Added "${fullUrl}" to channel "${channel.name}" (${channel.urls.length} total)`,
      );

      const option = select.querySelector<HTMLOptionElement>(
        `option[value="${channelId}"]`,
      );
      if (option) option.textContent = optionTextFor(channel);

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
    if (sourceInput) container.appendChild(sourceInput);
    container.appendChild(btn);
    container.appendChild(closeBtn);

    document.body.appendChild(container);
    console.log(`${LOG} UI inserted with ${channelEntries.length} channels`);
  }

  function removeUI(): void {
    document.getElementById(containerId)?.remove();
  }

  function isValidPage(): boolean {
    return !config.urlRegex || config.urlRegex.test(location.pathname);
  }

  function ensureUI(): void {
    if (closed) return;
    if (!isValidPage()) {
      removeUI();
      return;
    }
    if (document.getElementById(containerId)) return;
    createUI();
  }

  function onMutation(): void {
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

  waitForElement<HTMLElement>(config.waitSelector)
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

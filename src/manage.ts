// TODO: Validate
const LOG = "[Stream Channeler Remote]";

// https://lucide.dev/icons/radio-tower
const LOAD_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-radio-tower"><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><path d="M16.2 4.7a6.14 6.14 0 0 1 .8 7.5"/><path d="M19.1 1.9a10.14 10.14 0 0 1 0 14.2"/><path d="M9.56 14l-2.35 8.68"/><path d="M14.44 14l2.35 8.68"/><circle cx="12" cy="12" r="2"/></svg>`;

// https://lucide.dev/icons/antenna
const INSERT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-antenna-icon lucide-antenna"><path d="M2 12 7 2"/><path d="m7 12 5-10"/><path d="m12 12 5-10"/><path d="m17 12 5-10"/><path d="M4.5 7h15"/><path d="M12 16v6"/></svg>`;

export interface ManagedChannels {
  [channelId: string]: { name: string; urls: string[]; showUrls: string[] };
}

interface ChannelShowsResponse {
  shows: { url: string }[];
}

export function getChannelQueues(): ManagedChannels {
  return GM_getValue("antennaChannels", {}) as ManagedChannels;
}

export function setChannelQueues(channels: ManagedChannels): void {
  GM_setValue("antennaChannels", channels);
}

export function getLastChannelId(): string | null {
  return GM_getValue("antennaLastChannelId", null) as string | null;
}

export function setLastChannelId(channelId: string): void {
  GM_setValue("antennaLastChannelId", channelId);
}

async function fetchChannelShowUrls(channelId: string): Promise<string[]> {
  const token = localStorage.getItem("access_token");
  if (!token)
    throw new Error(
      `${LOG} No access_token in localStorage — log in to streamchanneler.com first`,
    );
  const response = await fetch(
    `https://api.streamchanneler.com/api/v1/channels/${channelId}/shows`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok)
    throw new Error(
      `${LOG} Failed to fetch shows for channel ${channelId}: ${response.status}`,
    );
  const data = (await response.json()) as ChannelShowsResponse;
  return data.shows.map((s) => s.url);
}

async function loadBlankChannels(): Promise<void> {
  const existing = getChannelQueues();
  const hasExisting =
    Object.keys(existing).length > 0 &&
    Object.values(existing).some((ch) => ch.urls.length > 0);

  // Have a popup warning the user that loading this data will overwrite existing
  // data. Overwriting data is intentional so this allows the user to clear urls after
  // they have been imported.
  if (hasExisting) {
    const confirmed = confirm(
      "This will replace all existing channel data (including queued URLs). Continue?",
    );
    if (!confirmed) return;
  }

  // Get all of the channels from the page's html.
  const channels: ManagedChannels = {};
  const links = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/channels/"]',
  );
  for (const link of links) {
    const match = link.getAttribute("href")?.match(/\/channels\/([a-f0-9-]+)/);
    if (!match) continue;
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
  alert(
    `Loaded ${ids.length} channels (${totalShows} shows) into Stream Channeler Remote.`,
  );
}

function pasteQueue(): void {
  const textarea = document.querySelector<HTMLTextAreaElement>(
    '[data-slot="dialog-content"] textarea',
  );
  if (!textarea)
    throw new Error(`${LOG} Textarea not found in bulk import modal`);

  const channels = getChannelQueues();
  const output: Record<string, string[]> = {};
  for (const [id, channel] of Object.entries(channels)) {
    if (channel.urls.length > 0) {
      output[id] = channel.urls;
    }
  }

  textarea.value = JSON.stringify(output, null, 2);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  console.log(
    `${LOG} Inserted URLs for ${Object.keys(output).length} channels`,
  );
}

function addButtonsToModal(dialog: Element): void {
  const modalFooter = dialog.querySelector('[data-slot="dialog-footer"]');
  if (!modalFooter) return;
  if (modalFooter.querySelector("#manage-load-btn")) return;

  const existingBtn = modalFooter.querySelector("button");
  if (!existingBtn) throw new Error(`${LOG} No button found in dialog footer`);
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

export function initManage(): void {
  if (location.pathname !== "/channels") return;

  console.log(`${LOG} Watching for bulk import modal`);

  new MutationObserver(() => {
    const dialog = document.querySelector('[data-slot="dialog-content"]');
    if (!dialog) return;

    const title = dialog.querySelector('[data-slot="dialog-title"]');
    if (title?.textContent?.trim() === "Bulk Import") {
      addButtonsToModal(dialog);
    }
  }).observe(document.body, { childList: true, subtree: true });
}

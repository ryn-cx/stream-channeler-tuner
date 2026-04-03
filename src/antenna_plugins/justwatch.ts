// TODO: Validate
import { getChannelQueues, setChannelQueues } from "../antenna";
import { waitForElement } from "../shared";

export { hostnames, matches } from "./justwatch.matches.cjs";

const LOG = "[Stream Channeler Antenna] [JustWatch]";

function createUI(anchor: Element): void {
  if (document.getElementById("antenna-justwatch-container")) return;

  const channels = getChannelQueues();
  const channelEntries = Object.entries(channels);

  const container = document.createElement("div");
  container.id = "antenna-justwatch-container";
  container.style.cssText =
    "display:flex;gap:8px;align-items:center;padding:12px 0;";

  const select = document.createElement("select");
  select.id = "antenna-channel-select";
  select.style.cssText =
    "flex:1;padding:6px 10px;border-radius:4px;border:1px solid #3a4a5c;background:#1c252f;color:#fff;font-size:14px;";

  for (const [id, ch] of channelEntries) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = `${ch.name} (${ch.urls.length} queued)`;
    select.appendChild(option);
  }

  const sourceInput = document.createElement("input");
  sourceInput.id = "antenna-source-input";
  sourceInput.type = "text";
  sourceInput.placeholder = "Source (optional)";
  sourceInput.style.cssText =
    "width:150px;padding:6px 10px;border-radius:4px;border:1px solid #3a4a5c;background:#1c252f;color:#fff;font-size:14px;";

  const btn = document.createElement("button");
  btn.id = "antenna-add-btn";
  btn.textContent = "Add to Channel";
  btn.style.cssText =
    "padding:6px 16px;border-radius:4px;border:1px solid #3a4a5c;background:#fbc500;color:#060d17;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;";

  btn.addEventListener("click", () => {
    const channelId = select.value;
    if (!channelId) return;

    const source = sourceInput.value.trim();
    const rawUrl = location.href;
    const fullUrl = source ? `${source} ${rawUrl}` : rawUrl;

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

    // Update the select option text to reflect new count
    const option = select.querySelector<HTMLOptionElement>(
      `option[value="${channelId}"]`,
    );
    if (option)
      option.textContent = `${channel.name} (${channel.urls.length} queued)`;

    btn.textContent = "Added!";
    setTimeout(() => {
      btn.textContent = "Add to Channel";
    }, 2000);
  });

  container.appendChild(select);
  container.appendChild(sourceInput);
  container.appendChild(btn);

  anchor.appendChild(container);
  console.log(`${LOG} UI inserted with ${channelEntries.length} channels`);
}

function ensureUI(): void {
  if (document.getElementById("antenna-justwatch-container")) return;
  const details = document.querySelector<HTMLElement>(
    ".title-detail-hero__details",
  );
  if (details) createUI(details);
}

export function init(): void {
  console.log(`${LOG} Initializing on ${location.href}`);

  // Insert at the bottom of the hero details section, and re-insert if Vue re-renders
  waitForElement<HTMLElement>(".title-detail-hero__details")
    .then((details) => {
      createUI(details);
      new MutationObserver(ensureUI).observe(document.body, {
        childList: true,
        subtree: true,
      });
    })
    .catch(() => {
      console.log(`${LOG} Could not find title-detail-hero__details element`);
    });
}

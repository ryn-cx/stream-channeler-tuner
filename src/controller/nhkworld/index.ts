// TODO: Validate
import {
  CONTROLLER_LOG,
  createStopButton,
  requestFullscreenOnDoubleClick,
  signalEpisodeEnded,
  sleep,
  waitForElement,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

const LOG = `${CONTROLLER_LOG} [NHK World]`;

// NHK World renders the actual video.js player inside a same-origin iframe, so
// the player controls (.vjs-*) live in the iframe's document rather than the
// top-level show page.
const PLAYER_IFRAME_SELECTOR = 'iframe[src*="world-player"]';

function getPlayerDocument(): Document | null {
  const iframe = document.querySelector<HTMLIFrameElement>(
    PLAYER_IFRAME_SELECTOR,
  );
  return iframe?.contentDocument ?? null;
}

// Like waitForElement, but searches inside the player iframe's document. The
// iframe element and its document are re-read on every poll because the document
// is replaced as the iframe navigates to the player.
async function waitForPlayerElement<T extends Element>(
  selector: string,
  timeoutMs = 15_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const element = getPlayerDocument()?.querySelector<T>(selector) ?? null;
    if (element) return element;
    await sleep(250);
  }
  throw new Error(
    `${LOG} Timed out waiting for "${selector}" in player iframe`,
  );
}

// The play/pause control's text and title flip to "Replay" once the video
// finishes, which is how we detect completion.
function isReplay(button: Element): boolean {
  if (button.getAttribute("title") === "Replay") return true;
  const text = button.querySelector(".vjs-control-text")?.textContent?.trim();
  return text === "Replay";
}

// Whether the video has started playing. NHK removes the "Watch Now" overlay
// (.tVideoEpisodePlayer__watchNow, which holds the WATCH NOW button) from the
// top page once playback begins, leaving just the playing iframe. That overlay's
// disappearance is the most reliable signal because it lives in the top
// document, unlike the player's <video> which is buried in the iframe.
function isPlaying(): boolean {
  const overlay = document.querySelector<HTMLElement>(
    ".tVideoEpisodePlayer__watchNow",
  );
  if (overlay === null || overlay.offsetParent === null) return true;

  // Fallback: the <video> inside the iframe reports active playback.
  const video =
    getPlayerDocument()?.querySelector<HTMLVideoElement>("video.vjs-tech");
  return (
    video != null && !video.paused && !video.ended && video.readyState >= 2
  );
}

// NHK World does not autoplay — the video.js player is only mounted once the
// user clicks "Watch Now". The button lives in the top-level show page (not the
// iframe), and the click can land before the player is ready, so keep nudging
// whichever start control is available until playback actually begins.
async function startVideo(): Promise<void> {
  const watchNow = await waitForElement<HTMLElement>(
    ".tVideoEpisodePlayer__watchNowBtn",
  );
  console.log(`${LOG} Watch Now button found, starting playback`);
  watchNow.click();

  let attempt = 0;
  while (!isPlaying()) {
    await sleep(1000);
    if (isPlaying()) break;

    attempt++;
    // The "Watch Now" button lives in the top page; once the player is mounted
    // it exposes its own big play button inside the iframe. Click whichever is
    // currently available to retry.
    const trigger =
      document.querySelector<HTMLElement>(
        ".tVideoEpisodePlayer__watchNowBtn",
      ) ??
      getPlayerDocument()?.querySelector<HTMLElement>(".vjs-big-play-button") ??
      null;
    if (trigger) {
      console.log(
        `${LOG} Not playing yet, retrying start (attempt ${attempt})`,
      );
      trigger.click();
    } else {
      console.log(
        `${LOG} Not playing yet, no start control available (attempt ${attempt})`,
      );
    }
  }
  console.log(`${LOG} Playback confirmed`);
}

// Detect whether the player is fullscreen. When the iframe enters fullscreen the
// top document exposes it via document.fullscreenElement, and video.js adds the
// "vjs-fullscreen" class inside the iframe.
function isFullscreen(): boolean {
  if (document.fullscreenElement !== null) return true;
  return getPlayerDocument()?.querySelector(".video-js.vjs-fullscreen") != null;
}

// Wait for the player to mount, then let the user double-click to enter
// fullscreen. The fullscreen control lives inside the same-origin player iframe,
// so the iframe's document is added as a gesture target (a click on the video
// itself counts) and the button is re-queried from it on each gesture.
async function fullscreenVideo(): Promise<void> {
  await waitForPlayerElement<HTMLElement>(".vjs-fullscreen-control");
  requestFullscreenOnDoubleClick({
    log: LOG,
    isFullscreen,
    getButton: () =>
      getPlayerDocument()?.querySelector<HTMLElement>(
        ".vjs-fullscreen-control",
      ) ?? null,
    gestureTargets: () => {
      const doc = getPlayerDocument();
      return doc ? [doc] : [];
    },
  });
}

// Watch the play control inside the iframe for the "Replay" state, which signals
// completion.
async function watchForCompletion(): Promise<void> {
  const button = await waitForPlayerElement<HTMLElement>(".vjs-play-control");
  console.log(`${LOG} Play control found, watching for completion`);

  if (isReplay(button)) {
    signalEpisodeEnded();
    return;
  }

  const observer = new MutationObserver(() => {
    if (isReplay(button)) {
      observer.disconnect();
      signalEpisodeEnded();
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

export async function init(): Promise<void> {
  // Only run the script if the tab was opened by Stream Channeler Controller.
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  createStopButton();

  await startVideo();
  await fullscreenVideo();
  await watchForCompletion();
}

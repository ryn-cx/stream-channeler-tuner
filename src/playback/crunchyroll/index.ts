// TODO: Validate
import {
  FAKE_FULLSCREEN_CLASS,
  REMOTE_LOG,
  mountPlayerControls,
  setFakeFullscreen,
  waitForElement,
  watchUrlChange,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

const LOG = `${REMOTE_LOG} [Crunchyroll]`;

// Crunchyroll uses a native Bitmovin player: a <video id="bitmovinplayer-video-*">
// inside the ".video-player-wrapper" (which also holds Crunchyroll's controls).
const VIDEO_SELECTOR = 'video[id^="bitmovinplayer-video"]';

export async function init(): Promise<void> {
  // Only run the script if the tab was opened by Stream Channeler Remote.
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  // Mount the overlay controls (stop + fullscreen toggle) once the player exists,
  // and auto-expand. Fake-fullscreen the Bitmovin container so its own controls
  // come along; fall back to the video's parent if the container class differs.
  try {
    const video = await waitForElement<HTMLElement>(VIDEO_SELECTOR);
    // Fullscreen the whole player wrapper (which holds Crunchyroll's controls),
    // not just the video container — otherwise the controls are left behind.
    const player =
      video.closest<HTMLElement>(".video-player-wrapper") ??
      video.closest<HTMLElement>("#player-container") ??
      video.closest<HTMLElement>(".bitmovinplayer-container") ??
      video.parentElement ??
      video;
    console.log(
      `${LOG} Fullscreen target: <${player.tagName.toLowerCase()} class="${player.className}">`,
    );
    mountPlayerControls({
      log: LOG,
      isExpanded: () => player.classList.contains(FAKE_FULLSCREEN_CLASS),
      toggleExpand: () =>
        setFakeFullscreen(
          player,
          !player.classList.contains(FAKE_FULLSCREEN_CLASS),
        ),
      expandObserveTarget: player,
    });
    setFakeFullscreen(player, true);
  } catch (error) {
    console.warn(`${LOG} Player not found; controls not mounted:`, error);
  }

  // Crunchyroll auto-advances by navigating, so detect the URL change.
  watchUrlChange(LOG);
}

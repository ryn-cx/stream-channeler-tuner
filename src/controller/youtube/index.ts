// TODO: Validate
import {
  CONTROLLER_LOG,
  createStopButton,
  requestFullscreenOnDoubleClick,
  signalEpisodeEnded,
} from "../../shared";

const LOG = `${CONTROLLER_LOG} [YouTube]`;

export { hostnames, matches } from "./matches.cjs";

// YouTube autoplays, so just let the user double-click to enter fullscreen.
function fullscreenVideo(): void {
  requestFullscreenOnDoubleClick({
    log: LOG,
    isFullscreen: () => document.fullscreenElement !== null,
    getButton: () =>
      document.querySelector<HTMLElement>(".ytp-fullscreen-button"),
  });
}

// The player gains the "ended-mode" class once the video finishes, which is
// how we detect completion.
function watchForCompletion(player: HTMLElement): void {
  const observer = new MutationObserver(() => {
    if (player.classList.contains("ended-mode")) {
      observer.disconnect();
      signalEpisodeEnded();
    }
  });
  observer.observe(player, { attributes: true, attributeFilter: ["class"] });
}

export function init(): void {
  // Only run the script if the tab was opened by Stream Channeler Controller.
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  createStopButton();

  const player = document.getElementById("movie_player");
  if (!player)
    throw new Error(
      `${LOG} movie_player element not found on YouTube watch page`,
    );

  fullscreenVideo();
  watchForCompletion(player);
}

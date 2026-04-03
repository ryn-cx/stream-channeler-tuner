import { CONTROLLER_LOG, signalEpisodeEnded } from "../shared";

const LOG = `${CONTROLLER_LOG} [YouTube]`;

export { hostnames, matches } from "./youtube.matches.cjs";

export function init(): void {
  // Only run the script if the tab was opened by Stream Channeler Controller.
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  const player = document.getElementById("movie_player");
  if (!player)
    throw new Error(
      `${LOG} movie_player element not found on YouTube watch page`,
    );

  let started = false;
  const observer = new MutationObserver(() => {
    if (!started && player.classList.contains("playing-mode")) {
      started = true;
      // TODO: This doesn't work.
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "f",
          code: "KeyF",
          keyCode: 70,
          which: 70,
          bubbles: true,
          cancelable: true,
        }),
      );
    } else if (started && player.classList.contains("ended-mode")) {
      observer.disconnect();
      signalEpisodeEnded();
    }
  });
  observer.observe(player, { attributes: true, attributeFilter: ["class"] });
}

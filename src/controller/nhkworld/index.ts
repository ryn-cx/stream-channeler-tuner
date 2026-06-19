// TODO: Validate
import {
  CONTROLLER_LOG,
  signalEpisodeEnded,
  waitForElement,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

const LOG = `${CONTROLLER_LOG} [NHK World]`;

// NHK World embeds a video.js player. The play/pause control's text and title
// flip to "Replay" once the video finishes, which is how we detect completion.
function isReplay(button: Element): boolean {
  if (button.getAttribute("title") === "Replay") return true;
  const text = button.querySelector(".vjs-control-text")?.textContent?.trim();
  return text === "Replay";
}

export async function init(): Promise<void> {
  // Only run the script if the tab was opened by Stream Channeler Controller.
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  // The play control is injected by video.js after the page loads, so wait for
  // it before watching for the "Replay" state.
  const button = await waitForElement<HTMLElement>(".vjs-play-control");
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

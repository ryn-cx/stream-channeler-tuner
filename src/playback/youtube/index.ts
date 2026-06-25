// TODO: Validate
import {
  FAKE_FULLSCREEN_CLASS,
  REMOTE_LOG,
  mountPlayerControls,
  setFakeFullscreen,
  signalEpisodeEnded,
  waitForElement,
  waitForQuiet,
} from "../../shared";

const LOG = `${REMOTE_LOG} [YouTube]`;

export { hostnames, matches } from "./matches.cjs";

// #movie_player holds the video and YouTube's own controls. The shared helper
// fake-fullscreens it in place and lifts its ancestors' stacking so the player
// (which YouTube's transformed layout would otherwise trap under the page)
// floats on top.
function mountControls(player: HTMLElement): void {
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

export async function init(): Promise<void> {
  // Only run the script if the tab was opened by Stream Channeler Remote.
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  console.log(`${LOG} Tab opened by Stream Channeler Remote, initializing`);

  // YouTube is a Polymer SPA — the player is created asynchronously and may not
  // exist yet at document-end, so wait for it instead of grabbing it eagerly.
  const player = await waitForElement<HTMLElement>("#movie_player");
  console.log(`${LOG} Player found`);

  // Run each step independently so a failure in one doesn't block the others.
  try {
    mountControls(player);
    console.log(`${LOG} Controls mounted`);
  } catch (error) {
    console.error(`${LOG} mountControls failed:`, error);
  }

  // YouTube keeps restyling #movie_player while it lays the player out after load
  // (it has player-resize-delay/transition experiments); applying our fullscreen
  // styles during that window gets overwritten. Wait until it stops restyling the
  // player so the fake fullscreen sticks.
  await waitForQuiet(player);

  try {
    setFakeFullscreen(player, true);
    console.log(`${LOG} Fullscreen applied`);
  } catch (error) {
    console.error(`${LOG} setFakeFullscreen failed:`, error);
  }

  watchForCompletion(player);
  console.log(`${LOG} Watching for end`);
}

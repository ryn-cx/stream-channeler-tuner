import { CONTROLLER_LOG, initUrlChangePlugin, waitForElement } from "../shared";

export { hostnames, matches } from "./hbomax.matches.cjs";

const LOG = `${CONTROLLER_LOG} [HBO Max]`;

// TODO: This code is completely untested it might work.
async function startEpisode(): Promise<void> {
  const season = GM_getValue("seasonNumber", null) as number | null;
  const episode = GM_getValue("episodeNumber", null) as number | null;
  if (season === null || episode === null) {
    throw new Error(
      `${LOG} Missing season/episode info (season=${season}, episode=${episode}). Card may not have valid episode data.`,
    );
  }

  const dropdownButton = document.querySelector<HTMLButtonElement>(
    '[data-testid="generic-show-page-rail-episodes-tabbed-content_dropdown"] button',
  );

  // Only select a season if there's a dropdown (multi-season show)
  if (dropdownButton) {
    const currentSeasonText = dropdownButton.textContent?.trim() ?? "";
    if (currentSeasonText !== `Season ${season}`) {
      dropdownButton.click();

      await waitForElement<HTMLElement>('[role="option"], [role="menuitem"]');
      const options = document.querySelectorAll<HTMLElement>(
        '[role="option"], [role="menuitem"]',
      );
      const match = Array.from(options).find(
        (option) => option.textContent === `Season ${season}`,
      );
      if (!match)
        throw new Error(`${LOG} Could not find Season ${season} in dropdown`);
      match.click();
    }
  }

  // Wait for the episodes for the chosen season to load then click the correct one.
  const tileSelector = `a[data-sonic-type="video"][aria-label*="Season ${season}, Episode ${episode}:"]`;
  const targetTile = await waitForElement<HTMLAnchorElement>(tileSelector);
  targetTile.click();

  // Wait for HBO to navigate to the watch page after clicking the episode
  await new Promise<void>((resolve) => {
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
  initUrlChangePlugin("HBO Max");
}

export function init(): void {
  // Only run the script if the tab was opened by Stream Channeler Controller.
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  // On a watch page, use the standard URL change detection
  if (location.pathname.includes("/video/watch/")) {
    GM_setValue("loadingTab", true);
    initUrlChangePlugin("HBO Max");
    return;
  }

  // Sometimes JustWatch uses a URL that just links to the show instead of the specific
  // episodes so the episode needs to be started manually.
  startEpisode();
}

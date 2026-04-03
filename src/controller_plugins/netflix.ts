import { CONTROLLER_LOG, initUrlChangePlugin, waitForElement } from "../shared";

export { hostnames, matches } from "./netflix.matches.cjs";

const LOG = `${CONTROLLER_LOG} [Netflix]`;

// JustWatch never has direct episode links for Netflix.
// TODO: This probably does not work.
// TODO: This definately does not handle choosing an account.
export async function init(): Promise<void> {
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  const season = GM_getValue("seasonNumber", null) as number | null;
  const episode = GM_getValue("episodeNumber", null) as number | null;
  if (season === null || episode === null) {
    throw new Error(
      `${LOG} Missing season/episode info (season=${season}, episode=${episode})`,
    );
  }

  // Season selection — only if dropdown exists (multi-season show)
  const dropdownButton = document.querySelector<HTMLButtonElement>(
    "button.dropdown-toggle",
  );
  if (dropdownButton) {
    const currentSeasonText = dropdownButton.textContent?.trim() ?? "";
    if (currentSeasonText !== `Season ${season}`) {
      dropdownButton.click();

      await waitForElement<HTMLElement>(
        '[role="option"], .dropdown-menu a, .dropdown-menu li',
      );
      const options = document.querySelectorAll<HTMLElement>(
        '[role="option"], .dropdown-menu a, .dropdown-menu li',
      );
      const match = Array.from(options).find(
        (o) => o.textContent?.trim() === `Season ${season}`,
      );
      if (!match)
        throw new Error(`${LOG} Could not find Season ${season} in dropdown`);
      match.click();
    }
  }

  // Wait for the correct season's episodes to load by polling the season label
  await new Promise<void>((resolve) => {
    const check = (): void => {
      const label = document.querySelector<HTMLElement>(
        ".allEpisodeSelector-season-label",
      );
      if (label?.textContent?.trim() === `Season ${season}:`) {
        resolve();
        return;
      }
      setTimeout(check, 200);
    };
    check();
  });

  // Expand the episode list if it's collapsed
  const expandButton = document.querySelector<HTMLButtonElement>(
    '.section-divider.collapsed button[data-uia="section-expand"]',
  );
  if (expandButton) {
    expandButton.click();
    await new Promise<void>((resolve) => {
      const observer = new MutationObserver(() => {
        if (!document.querySelector(".section-divider.collapsed")) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    });
  }

  await waitForElement<HTMLElement>(".titleCardList--container.episode-item");
  const episodeItems = document.querySelectorAll<HTMLElement>(
    ".titleCardList--container.episode-item",
  );
  const targetEpisode = episodeItems[episode - 1] ?? null;

  if (!targetEpisode) {
    throw new Error(
      `${LOG} Could not find Episode ${episode} (index ${episode - 1}) in ${episodeItems.length} episodes`,
    );
  }

  targetEpisode.click();

  // Wait for Netflix to navigate to the watch page
  await new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (location.pathname.startsWith("/watch/")) {
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
  initUrlChangePlugin("Netflix");
}

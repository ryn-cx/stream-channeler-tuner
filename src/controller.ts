// https://lucide.dev/icons/monitor-play
const PLAY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-play-icon lucide-monitor-play"><path d="M15.033 9.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56V7.648a.645.645 0 0 1 .967-.56z"/><path d="M12 17v4"/><path d="M8 21h8"/><rect x="2" y="3" width="20" height="14" rx="2"/></svg>`;

// https://lucide.dev/icons/monitor-x
const STOP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-x-icon lucide-monitor-x"><path d="m14.5 12.5-5-5"/><path d="m9.5 12.5 5-5"/><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>`;

let cards: HTMLElement[] = [];
let currentIndex = 0;
let running = false;
let listenerRegistered = false;

function updateButton(): void {
  let button = document.getElementById("remote-control-btn");

  if (!button) {
    const buttons = document.querySelectorAll<HTMLButtonElement>("button");
    const lastButton = buttons[buttons.length - 1];
    if (!lastButton?.parentElement) return;

    button = document.createElement("button");
    button.id = "remote-control-btn";
    button.className = lastButton.className;
    button.setAttribute("data-slot", "button");
    button.addEventListener("click", toggleRemoteController);
    lastButton.parentElement.appendChild(button);
  }

  const icon = running ? STOP_ICON_SVG : PLAY_ICON_SVG;
  const label = running
    ? `Stop Remote Controller (${currentIndex + 1}/${cards.length})`
    : `Start Remote Controller (${currentIndex}/${cards.length})`;
  button.innerHTML = `${icon}${label}`;
}

function extractEpisodeInfo(card: HTMLElement): void {
  const text = card.textContent ?? "";

  const epMatch = text.match(/Episode(?:\s*:)?\s*(\d+)/i);
  GM_setValue("episodeNumber", epMatch ? parseInt(epMatch[1], 10) : null);

  const seasonMatch = text.match(/Season(?:\s*:)?\s*(\d+)/i);
  GM_setValue(
    "seasonNumber",
    seasonMatch ? parseInt(seasonMatch[1], 10) : null,
  );
}

function clickCurrentCard(): void {
  // If all videos have been played stop remote controller.
  if (currentIndex >= cards.length) {
    stopRemoteController();
    return;
  }

  // Extract season/episode info from the card and store as GM values
  // so plugins on show pages can select the correct episode.
  extractEpisodeInfo(cards[currentIndex]);

  // loadingTab is used to make sure the script only activates on the specific tabs
  // that it opens.
  // TODO: This isn't a perfectly safe way of tracking this because the user could
  // trigger a race condition if they open a tab to a video at the same time as the
  // script opens a video.
  GM_setValue("loadingTab", true);
  cards[currentIndex].click();
  updateButton();
}

function stopRemoteController(): void {
  running = false;
  updateButton();
}

function startRemoteController(): void {
  if (cards.length === 0) {
    cards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="card"]'),
    );
    currentIndex = 0;
  }
  console.log(
    `[Stream Channeler Controller] Starting at ${currentIndex}/${cards.length}`,
  );
  running = true;

  // Listener to detect for when a video is completed.
  if (!listenerRegistered) {
    listenerRegistered = true;
    GM_addValueChangeListener(
      "videoEnded",
      (_name: string, _oldValue: unknown, newValue: unknown) => {
        // Only automatically load the next channel if stream channeler controller is in
        // an active state.
        if (!running) return;
        if (typeof newValue !== "number")
          throw new Error(
            `[Stream Channeler Controller] videoEnded value is not a number: ${newValue}`,
          );
        currentIndex++;
        clickCurrentCard();
      },
    );
  }

  clickCurrentCard();
}

function toggleRemoteController(): void {
  if (running) {
    stopRemoteController();
  } else {
    startRemoteController();
  }
}

export function initController(): void {
  function syncState(): void {
    const newCards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="card"]'),
    );
    // The user can remove cards (by verifying a watch) or changing card order (by
    // clicking the "Next Episode" button) so these changes need to be managed.
    if (
      newCards.length !== cards.length ||
      !newCards.every((c, i) => c === cards[i])
    ) {
      const activeCard = cards[currentIndex];
      cards = newCards;

      if (activeCard) {
        const newIndex = cards.indexOf(activeCard);
        currentIndex = newIndex >= 0 ? newIndex : 0;
        // No activeCard can probably occur when the user verifies a watch on the last
        // episode of a
        // channel probably.
      } else {
        currentIndex = 0;
      }
    }

    updateButton();
  }

  let debounceTimer: number;
  new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(syncState, 200);
  }).observe(document.body, { childList: true, subtree: true });

  // Clean up just in case when tab is closed to avoid the script from activating on a
  // tab that is opened later on.
  window.addEventListener("beforeunload", () => {
    if (cards.length > 0) {
      GM_setValue("loadingTab", false);
    }
  });
}

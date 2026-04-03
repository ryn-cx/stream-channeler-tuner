// TODO: Validate
export const CONTROLLER_LOG = "[Stream Channeler Controller]";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function waitForElement<T extends Element>(
  selector: string,
  timeoutMs = 15_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<T>(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector<T>(selector);
      if (el) {
        observer.disconnect();
        clearTimeout(timeout);
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(
        new Error(`${CONTROLLER_LOG} Timed out waiting for "${selector}"`),
      );
    }, timeoutMs);
  });
}

export function signalEpisodeEnded(): void {
  console.log(`${CONTROLLER_LOG} Episode ended, closing tab`);
  const now = Date.now();
  const current = GM_getValue("videoEnded", 0) as number;
  console.log(`${CONTROLLER_LOG} Current videoEnded=${current}, now=${now}`);
  // Only signal if the current value is older (stop sets it to far future)
  if (now > current) {
    console.log(
      `${CONTROLLER_LOG} Signaling episode ended (setting videoEnded=${now})`,
    );
    GM_setValue("videoEnded", now);
  } else {
    console.log(
      `${CONTROLLER_LOG} Skipping signal — current value is newer (stop was triggered?)`,
    );
  }
  console.log(`${CONTROLLER_LOG} Closing tab`);
  window.close();
}

/**
 * Generic plugin for sites where episode end is detected by URL change.
 * Waits for a settle period (to avoid false positives from redirects),
 * then watches for the URL to change.
 */
export function initUrlChangePlugin(name: string): void {
  const LOG = `${CONTROLLER_LOG} [${name}]`;
  // Only run the script if the tab was opened by Stream Channeler Controller.
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  // Sites may redirect the URL immediately on load, so wait before
  // capturing the URL to avoid a false positive.
  const SETTLE_DELAY_MS = 5000;
  console.log(`${LOG} Waiting ${SETTLE_DELAY_MS}ms for URL to settle`);

  setTimeout(() => {
    const initialUrl = location.href;
    console.log(
      `${LOG} Settle complete, watching for URL change from: ${initialUrl}`,
    );

    function onEpisodeEnded(): void {
      console.log(`${LOG} URL changed to: ${location.href}`);
      console.log(`${LOG} Episode ended, cleaning up observers`);
      observer.disconnect();
      clearInterval(poll);
      signalEpisodeEnded();
    }

    function checkUrlChanged(): void {
      if (location.href !== initialUrl) {
        onEpisodeEnded();
      }
    }

    // Watch for URL changes via History API pushState/replaceState (SPA navigation)
    const observeTarget = document.querySelector("title") ?? document.head;
    console.log(
      `${LOG} Observing element for mutations: <${observeTarget.tagName.toLowerCase()}>`,
    );
    const observer = new MutationObserver(checkUrlChanged);
    observer.observe(observeTarget, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Fallback polling in case MutationObserver misses the navigation
    const poll = window.setInterval(checkUrlChanged, 2000);
    console.log(`${LOG} Polling every 2000ms as fallback`);

    // Also catch popstate events
    window.addEventListener("popstate", checkUrlChanged);
    console.log(`${LOG} Listening for popstate events`);
  }, SETTLE_DELAY_MS);
}

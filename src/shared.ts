// TODO: Validate
export const REMOTE_LOG = "[Stream Channeler Remote]";

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
      reject(new Error(`${REMOTE_LOG} Timed out waiting for "${selector}"`));
    }, timeoutMs);
  });
}

// When the user stops automatic control on a video tab, the page should stay
// open and never advance the channel. Gating signalEpisodeEnded() is enough
// because it is the single choke point that signals completion and closes the
// tab, regardless of which plugin detected the end.
let autoControlStopped = false;

// A small button pinned to a corner of every remote-opened tab so the user can
// cancel automatic control of the current video. Styled to match the Manage
// "Add to Channel" widget. Placed bottom-left to avoid overlapping the Manage
// footer, which sits bottom-right.
export function createStopButton(): void {
  if (document.getElementById("stream-channeler-stop-btn")) return;

  const button = document.createElement("button");
  button.id = "stream-channeler-stop-btn";
  button.textContent = "Stop Auto Control";
  button.style.cssText =
    "position:fixed;bottom:16px;left:16px;z-index:2147483647;padding:6px 16px;border-radius:4px;border:1px solid #3a4a5c;background:#c0392b;color:#fff;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.5);";

  button.addEventListener("click", () => {
    autoControlStopped = true;
    console.log(`${REMOTE_LOG} Automatic control stopped by user`);
    button.textContent = "Auto Control Stopped";
    button.disabled = true;
    button.style.opacity = "0.6";
    button.style.cursor = "default";
  });

  document.body.appendChild(button);
}

// A big, bright banner prompting the user to double-click so a plugin can enter
// fullscreen. Spans the top of the screen and absorbs pointer events so
// double-clicking it can't reach (and accidentally activate) the controls
// behind it. Returns a function that removes it.
function showFullscreenPrompt(): () => void {
  const banner = document.createElement("div");
  banner.id = "stream-channeler-fullscreen-prompt";
  banner.textContent = "Double-click here to fullscreen the video";
  banner.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:24px 16px;background:#e60019;color:#fff;font-family:system-ui,sans-serif;font-size:28px;font-weight:800;text-align:center;letter-spacing:0.5px;box-shadow:0 4px 16px rgba(0,0,0,0.5);cursor:pointer;";
  document.body.appendChild(banner);
  return () => banner.remove();
}

/**
 * Enter fullscreen by clicking a player's fullscreen control. Browsers only
 * allow requestFullscreen() during a transient user activation, so a scripted
 * click is silently refused — fullscreen can only be triggered from the user's
 * own gesture. This shows a prompt and, on the next double-click anywhere,
 * clicks the fullscreen button synchronously inside the gesture handler (which
 * carries the activation), then cleans up once fullscreen engages.
 *
 * @param config.isFullscreen Whether the player is currently fullscreen.
 * @param config.getButton Returns the fullscreen control to click (re-queried
 *   on each gesture so it survives DOM churn). Return null if not yet present.
 * @param config.gestureTargets Extra documents to listen on besides the top
 *   document — e.g. a same-origin player iframe whose own clicks must count.
 * @param config.log Log prefix for diagnostics.
 */
export function requestFullscreenOnDoubleClick(config: {
  isFullscreen: () => boolean;
  getButton: () => HTMLElement | null;
  gestureTargets?: () => Document[];
  log?: string;
}): void {
  if (config.isFullscreen()) return;
  const log = config.log ?? REMOTE_LOG;
  console.log(
    `${log} Fullscreen requires a user gesture — double-click to enter fullscreen`,
  );

  const removePrompt = showFullscreenPrompt();
  const options = { capture: true } as const;
  const targets = [document, ...(config.gestureTargets?.() ?? [])];

  const onGesture = (): void => {
    if (config.isFullscreen()) return;
    const button = config.getButton();
    if (button) {
      console.log(`${log} Double-click detected, requesting fullscreen`);
      button.click();
    }
  };

  const cleanup = (): void => {
    if (!config.isFullscreen()) return;
    console.log(`${log} Fullscreen confirmed, removing prompt and listeners`);
    removePrompt();
    for (const target of targets) {
      target.removeEventListener("dblclick", onGesture, options);
    }
    document.removeEventListener("fullscreenchange", cleanup);
  };

  for (const target of targets) {
    target.addEventListener("dblclick", onGesture, options);
  }
  document.addEventListener("fullscreenchange", cleanup);
}

export function signalEpisodeEnded(): void {
  if (autoControlStopped) {
    console.log(
      `${REMOTE_LOG} Episode ended but automatic control is stopped — staying on tab`,
    );
    return;
  }

  console.log(`${REMOTE_LOG} Episode ended, closing tab`);
  const now = Date.now();
  const current = GM_getValue("videoEnded", 0) as number;
  console.log(`${REMOTE_LOG} Current videoEnded=${current}, now=${now}`);
  // Only signal if the current value is older (stop sets it to far future)
  if (now > current) {
    console.log(
      `${REMOTE_LOG} Signaling episode ended (setting videoEnded=${now})`,
    );
    GM_setValue("videoEnded", now);
  } else {
    console.log(
      `${REMOTE_LOG} Skipping signal — current value is newer (stop was triggered?)`,
    );
  }
  console.log(`${REMOTE_LOG} Closing tab`);
  window.close();
}

/**
 * Generic plugin for sites where episode end is detected by URL change.
 * Waits for a settle period (to avoid false positives from redirects),
 * then watches for the URL to change.
 */
export function initUrlChangePlugin(name: string): void {
  const LOG = `${REMOTE_LOG} [${name}]`;
  // Only run the script if the tab was opened by Stream Channeler Remote.
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  createStopButton();

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

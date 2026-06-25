# Stream Channeler Remote

A companion UserScript for [Stream Channeler](https://streamchanneler.com) that adds two features:

- **Playback** - Automatically plays through episodes in a channel sequentially, detecting when each episode ends and advancing to the next one. Supports YouTube, NHK World, Crunchyroll, HBO Max, and Netflix.
- **Manage** - Assists in building channels by letting you queue shows from JustWatch, Crunchyroll, NHK World, and YouTube, then bulk import them into Stream Channeler.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or a similar userscript manager.
2. Install [Stream Channeler Remote](https://ryn-cx.github.io/stream-channeler-tuner/index.prod.user.js).

## Supported Sites

**Autoplay** and **Fullscreen** are Playback features (auto-play through episodes); **Add to Channel** is the Manage feature (queue shows for bulk import).

| Site | Autoplay | Fullscreen | Add to Channel |
|------|----------|------------|----------------|
| YouTube | ✅ | ✅ | ✅ |
| NHK World | ✅ | ✅ | ✅ |
| Crunchyroll | ✅ | ❌ | ✅ |
| HBO Max | ✅ | ❌ | ❌ |
| Netflix | ✅ | ❌ | ❌ |
| JustWatch | N/A | N/A | ✅ |

> **Fullscreen requires a double-click on the page.** Web browsers only allow a page to enter fullscreen in response to a real user interaction, so it cannot be triggered automatically for security reasons. On supported sites the script shows a banner prompting you to **double-click to fullscreen the video**, and enters fullscreen from that click.

## Usage

### Playback

1. Go to a channel on [streamchanneler.com](https://streamchanneler.com)
2. Click **Start Remote**
3. Episodes will open, play, and advance automatically

### Manage

1. Go to the [channels page](https://streamchanneler.com/channels) and open the **Bulk Import** modal
2. Click **Load Channels** to load your channel list
3. Browse shows on [JustWatch](https://www.justwatch.com) and use the **Add to Channel** button to queue them
4. Return to the Bulk Import modal and click **Insert URLs** to populate the import field

## Development

```bash
npm install
npm run build
```

## Adding Plugins

Plugins are auto-discovered from `src/playback/` and `src/manage/`. Each plugin lives in its own per-site folder containing an `index.ts` and a `matches.cjs`.

### Playback Plugin (auto-play episodes)

A playback plugin detects when an episode ends on a streaming site and signals back to Stream Channeler.

**`src/playback/example/matches.cjs`**
```js
module.exports = {
  hostnames: ["example.com"],
  matches: ["https://www.example.com/watch/*"],
};
```

**`src/playback/example/index.ts`**
```ts
import { initUrlChangePlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  // For sites where episode end is detected by URL change, use the shared helper:
  initUrlChangePlugin("Example");

  // For custom detection, use signalEpisodeEnded() from "../../shared" when the episode ends.
}
```

### Manage Plugin (queue shows)

A manage plugin adds an "Add to Channel" button on a content discovery site.

**`src/manage/example/matches.cjs`**
```js
module.exports = {
  hostnames: ["example.com"],
  matches: ["https://www.example.com/*/show/*"],
};
```

**`src/manage/example/index.ts`**
```ts
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  // Render the "Add to Channel" footer that lets the user pick a channel
  // and queue the current page's URL.
  initManagePlugin({
    website_name: "Example",
    buttonColor: "#000000",
    waitSelector: "h1",
    getCurrentUrl: () => location.href,
    getMatchKey: (url) => url,
  });
}
```

### Notes

- The `matches.cjs` file defines which URLs the script runs on. It is shared between the TypeScript plugin (runtime) and the build config (metadata generation).
- No changes to `index.ts` or `metadata.cjs` are needed — new plugins are picked up automatically.
- Playback plugins should check `GM_getValue("loadingTab", false)` and exit early if false, to avoid running on tabs not opened by Stream Channeler.
- Use `signalEpisodeEnded()` from `shared.ts` to notify Stream Channeler that an episode has finished.

For more details, check out the existing plugins: [YouTube (playback)](src/playback/youtube/index.ts) and [JustWatch (manage)](src/manage/justwatch/index.ts).

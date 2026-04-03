# Stream Channeler Tuner

A companion UserScript for [Stream Channeler](https://streamchanneler.com) that adds two features:

- **Controller** - Automatically plays through episodes in a channel sequentially, detecting when each episode ends and advancing to the next one. Supports YouTube, Crunchyroll, HBO Max, and Netflix.
- **Antenna** - Assists in building channels by letting you queue shows from [JustWatch](https://www.justwatch.com) and bulk import them into Stream Channeler.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or a similar userscript manager.
2. Install [Stream Channeler Tuner](https://ryn-cx.github.io/stream-channeler-tuner/index.prod.user.js).

## Supported Sites

### Controller (auto-play episodes)

| Site | Detection Method |
|------|-----------------|
| YouTube | Class change on player element |
| Crunchyroll | URL change |
| HBO Max | URL change |
| Netflix | URL change |

### Antenna (queue shows)

| Site | Action |
|------|--------|
| JustWatch | Add to Channel button on show pages |

## Usage

### Controller

1. Go to a channel on [streamchanneler.com](https://streamchanneler.com)
2. Click **Start Remote Controller**
3. Episodes will open, play, and advance automatically

### Antenna

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

Plugins are auto-discovered from `src/controller_plugins/` and `src/antenna_plugins/`. To add support for a new site, create two files:

### Controller Plugin (auto-play episodes)

A controller plugin detects when an episode ends on a streaming site and signals back to Stream Channeler.

**`src/controller_plugins/example.matches.cjs`**
```js
module.exports = {
  hostnames: ["example.com"],
  matches: ["https://www.example.com/watch/*"],
};
```

**`src/controller_plugins/example.ts`**
```ts
import { initUrlChangePlugin } from "../shared";

export { hostnames, matches } from "./example.matches.cjs";

export function init(): void {
  const loading = GM_getValue("loadingTab", false);
  if (!loading) return;
  GM_setValue("loadingTab", false);

  // For sites where episode end is detected by URL change, use the shared helper:
  initUrlChangePlugin("Example");

  // For custom detection, use signalEpisodeEnded() from "../shared" when the episode ends.
}
```

### Antenna Plugin (queue shows)

An antenna plugin adds an "Add to Channel" button on a content discovery site.

**`src/antenna_plugins/example.matches.cjs`**
```js
module.exports = {
  hostnames: ["example.com"],
  matches: ["https://www.example.com/*/show/*"],
};
```

**`src/antenna_plugins/example.ts`**
```ts
import { getChannelQueues, setChannelQueues } from "../antenna";

export { hostnames, matches } from "./example.matches.cjs";

export function init(): void {
  // Add UI elements to the page that let the user select a channel
  // and queue the current URL using getChannelQueues/setChannelQueues.
}
```

### Notes

- The `.matches.cjs` file defines which URLs the script runs on. It is shared between the TypeScript plugin (runtime) and the build config (metadata generation).
- No changes to `index.ts` or `metadata.cjs` are needed — new plugins are picked up automatically.
- Controller plugins should check `GM_getValue("loadingTab", false)` and exit early if false, to avoid running on tabs not opened by Stream Channeler.
- Use `signalEpisodeEnded()` from `shared.ts` to notify the controller that an episode has finished.

For more details, check out the existing plugins: [YouTube (controller)](src/controller_plugins/youtube.ts) and [JustWatch (antenna)](src/antenna_plugins/justwatch.ts).

// TODO: Validate
import { initAntennaPlugin } from "../../antenna_plugin";

export { hostnames, matches } from "./matches.cjs";

// Crunchyroll series URLs look like /series/GT00375170/the-food-diary-of-miss-maid.
// Match by series ID so the highlight survives slug or trailing-slash differences
// between the page URL and the URL stored against a channel.
const SERIES_ID_RE = /\/series\/([A-Z0-9]+)/;

export function init(): void {
  initAntennaPlugin({
    website_name: "Crunchyroll",
    buttonColor: "#000000",
    urlRegex: /\/series\/[A-Z0-9]+/,
    waitSelector: "h1",
    getCurrentUrl: () => location.href,
    getMatchKey: (url) => url.match(SERIES_ID_RE)?.[1] ?? null,
  });
}

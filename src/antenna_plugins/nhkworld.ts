// TODO: Validate
import { initAntennaPlugin } from "../antenna_plugin";

export { hostnames, matches } from "./nhkworld.matches.cjs";

// NHK World show pages look like /nhkworld/en/shows/100years-midosuji/ where the
// trailing segment is a slug, while individual episode/video pages use an
// all-numeric id (e.g. /nhkworld/en/shows/2019439/). Only show pages should get
// the "Add to Channel" button, so require a non-numeric trailing segment.
const SHOW_PATH_RE = /^\/nhkworld\/en\/shows\/(?!\d+\/?$)[^/]+\/?$/;

// Match by the show slug so the highlight survives trailing-slash differences
// between the page URL and the URL stored against a channel.
const SLUG_RE = /\/shows\/([^/]+)\/?$/;

export function init(): void {
  initAntennaPlugin({
    name: "NHK World",
    brandColor: "#00a0c6",
    pathFilter: SHOW_PATH_RE,
    waitSelector: ".pProgramHero__main",
    findAnchor: () =>
      document.querySelector<HTMLElement>(".pProgramHero__main"),
    getCurrentUrl: () => location.href,
    getMatchKey: (url) => url.match(SLUG_RE)?.[1] ?? null,
  });
}

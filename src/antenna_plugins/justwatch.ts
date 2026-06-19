// TODO: Validate
import { initAntennaPlugin } from "../antenna_plugin";

export { hostnames, matches } from "./justwatch.matches.cjs";

export function init(): void {
  initAntennaPlugin({
    name: "JustWatch",
    brandColor: "#fbc500",
    buttonTextColor: "#060d17",
    waitSelector: ".title-detail-hero__details",
    findAnchor: () =>
      document.querySelector<HTMLElement>(".title-detail-hero__details"),
    getCurrentUrl: () => location.href,
    getMatchKey: (url) => url,
    showSourceInput: true,
  });
}

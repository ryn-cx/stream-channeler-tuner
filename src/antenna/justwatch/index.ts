// TODO: Validate
import { initAntennaPlugin } from "../../antenna_plugin";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  initAntennaPlugin({
    website_name: "JustWatch",
    buttonColor: "#fbc500",
    textColor: "#060d17",
    // JustWatch title pages look like /us/tv-show/<slug> or /us/movie/<slug>.
    urlRegex: /\/(tv-show|movie)\//,
    waitSelector: ".title-detail-hero__details",
    getCurrentUrl: () => location.href,
    getMatchKey: (url) => url,
    showSourceInput: true,
  });
}

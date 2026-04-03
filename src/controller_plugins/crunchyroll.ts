import { initUrlChangePlugin } from "../shared";

export { hostnames, matches } from "./crunchyroll.matches.cjs";

export function init(): void {
  initUrlChangePlugin("Crunchyroll");
}

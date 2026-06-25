// TODO: Validate
import { initUrlChangePlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  initUrlChangePlugin("Crunchyroll");
}

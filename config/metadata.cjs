const fs = require("node:fs");
const path = require("node:path");
const { author, version, repository, description } = require("../package.json");

// Dynamically load all of the plugins and get the domains they support. Plugins
// live in per-website folders (e.g. src/antenna/youtube/matches.cjs), so walk
// the tree to collect every matches.cjs.
function readMatches(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return readMatches(full);
    if (entry.name.endsWith("matches.cjs")) return require(full).matches;
    return [];
  });
}
const pluginMatches = [...new Set([
  ...readMatches(path.resolve(__dirname, "../src/controller")),
  ...readMatches(path.resolve(__dirname, "../src/antenna")),
])];

module.exports = {
  name: "Stream Channeler Tuner",
  namespace: "https://streamchanneler.com/",
  version: version,
  author: author,
  description: description,
  match: [
    "https://streamchanneler.com/channels",
    "https://streamchanneler.com/channels/*",
    "http://localhost:5173/*", // TODO: Remove this for the first production release.
    ...pluginMatches,
  ],
  source: repository.url,
  grant: [
    "GM_setValue",
    "GM_getValue",
    "GM_addValueChangeListener",
    "GM_deleteValue",
  ],
  "run-at": "document-end",
};

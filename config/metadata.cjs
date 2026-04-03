const fs = require("node:fs");
const path = require("node:path");
const { author, version, repository, description } = require("../package.json");

// Dynamically load all of the plugins and get the domains they support
function readMatches(dir) {
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".matches.cjs"))
    .flatMap((f) => require(path.join(dir, f)).matches);
}
const pluginMatches = [...new Set([
  ...readMatches(path.resolve(__dirname, "../src/controller_plugins")),
  ...readMatches(path.resolve(__dirname, "../src/antenna_plugins")),
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

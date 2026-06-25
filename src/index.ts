import { initPlayback } from "./playback";
import { initManage } from "./manage";

interface Plugin {
  hostnames: string[];
  matches: string[];
  init: () => void;
}

function loadPlugins(ctx: __WebpackModuleApi.RequireContext): Plugin[] {
  return ctx.keys().map((key) => ctx(key) as Plugin);
}

const playbackPlugins = loadPlugins(
  require.context("./playback", true, /\/index\.ts$/),
);
const managePlugins = loadPlugins(
  require.context("./manage", true, /\/index\.ts$/),
);

const playbackPlugin = playbackPlugins.find((p) =>
  p.hostnames.some((h) => location.hostname.includes(h)),
);
const managePlugin = managePlugins.find((p) =>
  p.hostnames.some((h) => location.hostname.includes(h)),
);

if (playbackPlugin) playbackPlugin.init();
if (managePlugin) managePlugin.init();

if (!playbackPlugin && !managePlugin) {
  if (location.hostname.includes("streamchanneler.com")) {
    initPlayback();
    initManage();
  }
}

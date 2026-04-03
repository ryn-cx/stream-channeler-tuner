import { initController } from "./controller";
import { initAntenna } from "./antenna";

interface Plugin {
  hostnames: string[];
  matches: string[];
  init: () => void;
}

function loadPlugins(ctx: __WebpackModuleApi.RequireContext): Plugin[] {
  return ctx.keys().map((key) => ctx(key) as Plugin);
}

const controllerPlugins = loadPlugins(
  require.context("./controller_plugins", false, /\.ts$/),
);
const antennaPlugins = loadPlugins(
  require.context("./antenna_plugins", false, /\.ts$/),
);

const controllerPlugin = controllerPlugins.find((p) =>
  p.hostnames.some((h) => location.hostname.includes(h)),
);
const antennaPlugin = antennaPlugins.find((p) =>
  p.hostnames.some((h) => location.hostname.includes(h)),
);

if (controllerPlugin) controllerPlugin.init();
if (antennaPlugin) antennaPlugin.init();

if (!controllerPlugin && !antennaPlugin) {
  if (location.hostname.includes("streamchanneler.com")) {
    initController();
    initAntenna();
  }
}

// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

// YouTube channels are reachable via several URL forms (/@handle, /channel/UC…,
// /c/…, /user/…) but the Stream Channeler API stores them as /channel/UC…, so
// match by the channel's UC… id pulled from page metadata.
const CHANNEL_ID_RE = /\/channel\/(UC[\w-]+)/;

function extractChannelId(url: string): string | null {
  return url.match(CHANNEL_ID_RE)?.[1] ?? null;
}

function getCurrentChannelId(): string | null {
  // The /@handle URL doesn't contain the UC… id. YouTube renders a canonical
  // <link> and several meta tags pointing at the /channel/UC… form — read those.
  const canonical = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  const fromCanonical = canonical ? extractChannelId(canonical.href) : null;
  if (fromCanonical) return fromCanonical;

  const meta = document.querySelector<HTMLMetaElement>(
    'meta[itemprop="identifier"], meta[itemprop="channelId"]',
  );
  if (meta?.content?.startsWith("UC")) return meta.content;

  return extractChannelId(location.href);
}

export function init(): void {
  initManagePlugin({
    website_name: "YouTube",
    buttonColor: "#ff0000",
    urlRegex: /^\/(@|channel\/|c\/|user\/)/,
    // YouTube's channel-page DOM rotates between Polymer rebuilds, so don't
    // depend on a specific anchor — the footer floats over the page anyway.
    waitSelector: "body",
    getCurrentUrl: () => {
      const id = getCurrentChannelId();
      return id ? `https://www.youtube.com/channel/${id}` : location.href;
    },
    getMatchKey: extractChannelId,
  });
}

// Expo's default Metro config, plus one exclusion: `.cache/` holds the mutation tool's scratch
// copies of src (scripts/mutation-check.mjs) and the web export cache. Metro must not crawl
// them, or a running dev server rebuilds for every copy and treats copied files as routes.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const blockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(blockList) ? blockList : blockList === undefined ? [] : [blockList]),
  /[/\\]\.cache[/\\].*/,
];
if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

module.exports = config;

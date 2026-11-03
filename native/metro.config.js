const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Business rules (pricing, order status, distances) are shared with the website
// by importing ../src/lib directly, so both apps always use the same logic.
config.watchFolders = [path.resolve(__dirname, "../src/lib")];
// The shared files import no packages, so the website's ../node_modules is never used.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

module.exports = config;

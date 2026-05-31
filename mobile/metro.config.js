const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Transform ALL node_modules through Babel.
// Many packages use private class fields (#field) that Hermes in Expo Go
// cannot parse natively. An empty array means every imported file goes through
// Babel, which compiles private fields away before Hermes sees them.
config.transformIgnorePatterns = [];

// Add DOMException polyfill to getPolyfills so it runs BEFORE the module
// system is even set up — guaranteed to execute before InitializeCore.js.
const originalGetPolyfills = config.serializer.getPolyfills;
config.serializer.getPolyfills = (ctx) => {
  const existing = originalGetPolyfills ? originalGetPolyfills(ctx) : [];
  return [
    ...existing,
    path.resolve(__dirname, "polyfills/dom-exception.js"),
  ];
};

module.exports = config;

const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("node:path");
const { withUniwindConfig } = require("uniwind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);
const authSource = path.resolve(__dirname, "../../packages/auth/src");
const isDevelopment = process.env.APP_ENV === "development";

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (isDevelopment && moduleName === "@ponti-studios/auth") {
    moduleName = path.join(authSource, "index.ts");
  } else if (isDevelopment && moduleName.startsWith("@ponti-studios/auth/")) {
    moduleName = path.join(authSource, moduleName.slice("@ponti-studios/auth/".length));
  }

  if (moduleName.endsWith(".js")) {
    try {
      return context.resolveRequest(context, moduleName, platform);
    } catch {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
});

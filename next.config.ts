import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

const path = require("path");
module.exports = {
  webpack(
    config: import("webpack").Configuration,
  ): import("webpack").Configuration {
    (config.resolve!.alias as Record<string, string | false | string[]>)[
      "phaser"
    ] = path.resolve(__dirname, "node_modules/phaser/dist/phaser.js");
    return config;
  },
};

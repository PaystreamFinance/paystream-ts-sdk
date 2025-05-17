const json = require("@rollup/plugin-json");
const typescript = require("@rollup/plugin-typescript");
const pkg = require("./package.json");

module.exports = {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.js",
      format: "cjs",
    },
    {
      file: "dist/index.es.js",
      format: "es",
    },
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ],
  plugins: [
    json(),
    typescript(),
  ],
};

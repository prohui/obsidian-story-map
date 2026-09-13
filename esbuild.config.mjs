import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "node:module";

const production = process.argv[2] === "production";
const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  alias: { "resize-observer-polyfill": "./src/native-resize-observer.ts" },
  external: ["obsidian", "electron", ...builtinModules, ...builtinModules.map(name => `node:${name}`)],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  define: { "process.env.NODE_ENV": JSON.stringify(production ? "production" : "development") },
  outfile: "main.js"
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}

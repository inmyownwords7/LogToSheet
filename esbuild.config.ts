import esbuild from "esbuild";

esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/Code.gs",
  format: "iife",
  target: "es2019",
  platform: "browser",
  sourcemap: false,
  minify: false,
});
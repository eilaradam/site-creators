// Renderiza os 10 slides em PNG (1080x1350) na pasta out/
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";

const browserExecutable = process.env.REMOTION_CHROME || undefined;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const comps = await getCompositions(serveUrl, { browserExecutable });
fs.mkdirSync("out", { recursive: true });
for (const composition of comps) {
  const output = `out/${composition.id}.png`;
  await renderStill({ composition, serveUrl, output, browserExecutable });
  console.log("ok", output);
}

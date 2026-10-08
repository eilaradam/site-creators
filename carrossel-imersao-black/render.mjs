// Renderiza em PNG na pasta out/. Uso: node render.mjs [filtro], ex.: node render.mjs chat
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";

const filter = process.argv[2] ?? "";
const browserExecutable = process.env.REMOTION_CHROME || undefined;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const comps = (await getCompositions(serveUrl, { browserExecutable })).filter((c) => c.id.includes(filter));
fs.mkdirSync("out", { recursive: true });
for (const composition of comps) {
  const output = `out/${composition.id}.png`;
  await renderStill({ composition, serveUrl, output, browserExecutable, imageFormat: "png" });
  console.log("ok", output);
}

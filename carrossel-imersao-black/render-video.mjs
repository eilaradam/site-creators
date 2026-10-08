// Renderiza as animações (MP4) na pasta out/. Uso: node render-video.mjs [filtro]
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";

const filter = process.argv[2] ?? "termometro";
const browserExecutable = process.env.REMOTION_CHROME || undefined;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const comps = (await getCompositions(serveUrl, { browserExecutable })).filter((c) => c.durationInFrames > 1 && c.id.includes(filter));
for (const composition of comps) {
  const outputLocation = `out/termometro/${composition.id}.mp4`;
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation, browserExecutable, crf: 18 });
  console.log("ok", outputLocation);
}

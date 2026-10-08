# Junta 3+ recortes PNG/WebP transparentes num GIF (fundo branco), GIF transparente e WebM com alfa.
# Uso: python3 make-gif.py <saida-sem-extensao> img1 img2 img3 ...
import os, subprocess, sys, tempfile
from PIL import Image

out, srcs = sys.argv[1], sys.argv[2:]
W, H, TH, TOP, MS = 1080, 1350, 930, 210, 600
MATTE = (200, 68, 26, 255)  # laranja da marca: borda do cabelo no GIF transparente

frames = []
for s in srcs:
    im = Image.open(s).convert("RGBA")
    head = im.crop(im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox())
    head = head.resize((round(head.width * TH / head.height), TH), Image.LANCZOS)
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    c.alpha_composite(head, ((W - head.width) // 2, TOP))
    frames.append(c)

white = [Image.alpha_composite(Image.new("RGBA", (W, H), (255, 255, 255, 255)), f).convert("RGB").quantize(256, Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG) for f in frames]
white[0].save(f"{out}.gif", save_all=True, append_images=white[1:], duration=MS, loop=0, optimize=True)

trans = []
for f in frames:
    q = Image.alpha_composite(Image.new("RGBA", (W, H), MATTE), f).convert("RGB").quantize(255, Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
    q.putpalette(q.getpalette()[:765] + [0, 0, 0])
    q.paste(255, mask=f.getchannel("A").point(lambda v: 0 if v >= 110 else 255))
    trans.append(q)
trans[0].save(f"{out}-transparente.gif", save_all=True, append_images=trans[1:], duration=MS, loop=0, transparency=255, disposal=2)

with tempfile.TemporaryDirectory() as tmp:
    for i, f in enumerate(frames):
        f.save(f"{tmp}/f{i:03d}.png")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-stream_loop", "3", "-framerate", str(1000 / MS), "-i", f"{tmp}/f%03d.png",
                    "-r", "30", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "28", "-auto-alt-ref", "0", f"{out}-transparente.webm"], check=True)

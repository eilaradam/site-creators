# Remove o xadrez "falso" (fundo cinza/branco desenhado na imagem) e gera PNG com alfa real.
import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
src, dst = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert("RGB")).astype(np.int16)
mn, mx = im.min(2), im.max(2)
lum = im.mean(2)
cand = (mn >= 196) & ((mx - mn) <= 16)
lab, n = nd.label(cand)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(edge))
bg = nd.binary_closing(bg, iterations=2) | bg
fg = nd.binary_fill_holes(~bg)
fg = nd.binary_opening(fg, iterations=2)
# keep largest component
lab2, n2 = nd.label(fg)
sizes = nd.sum(fg, lab2, range(1, n2 + 1)); fg = lab2 == (np.argmax(sizes) + 1)
fg = nd.binary_erosion(fg, iterations=2)
# borda: alfa pela luminância (cabelo escuro sobre fundo claro), num anel de 4px
dist_in = nd.distance_transform_edt(fg)
band = fg & (dist_in <= 4)
a = fg.astype(np.float32)
est = np.clip((215 - lum) / (215 - 80), 0, 1)
a[band] = est[band] ** 1.3
alpha = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
# descontaminar cor na borda: puxa a cor da vizinhança interna
rgb = Image.fromarray(im.astype(np.uint8))
inner = Image.fromarray(np.where(fg[..., None] & (dist_in[..., None] > 4), im, 0).astype(np.uint8))
out = rgb.copy(); 
idx = nd.distance_transform_edt(~(fg & (dist_in > 4)), return_distances=False, return_indices=True)
fix = im[idx[0], idx[1]]
arr = np.where(band[..., None], fix, im).astype(np.uint8)
o = Image.fromarray(arr).convert("RGBA"); o.putalpha(alpha); o.save(dst)

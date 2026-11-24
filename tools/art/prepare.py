"""Canva AI görsellerini oyuna hazırlar.

Kullanım:
    python3 tools/art/prepare.py <menu-bg.jpg> <logo-ekrani.jpg>

- Menü arka planı (Canva MAHb3WLMCug, 2720×1536): 1920 genişliğe küçültülür, ortadan 1080 yüksekliğe kırpılır.
- Logo (Canva MAHb3eS2Td4): logonun bulunduğu bölge kesilir, altındaki boş kurdele atılır, zemin GrabCut ile ayrılır.
Çıktılar apps/game/public/art/ altına WebP olarak yazılır. Gereken paketler: Pillow, opencv-python-headless, numpy.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[2] / 'apps' / 'game' / 'public' / 'art'

# Logonun 2720×1536 kaynak görseldeki yeri ve kurdelenin başladığı satır (bu kutuya göre).
LOGO_BOX = (560, 0, 2290, 640)
RIBBON_TOP = 575
LOGO_WIDTH = 1200


def background(src: Path) -> None:
    im = Image.open(src).convert('RGB')
    h = round(im.height * 1920 / im.width)
    im = im.resize((1920, h), Image.LANCZOS)
    top = (h - 1080) // 2
    im.crop((0, top, 1920, top + 1080)).save(OUT / 'menu-bg.webp', quality=90, method=6)


def logo(src: Path) -> None:
    img = cv2.imread(str(src))[LOGO_BOX[1]:LOGO_BOX[3], LOGO_BOX[0]:LOGO_BOX[2]]
    h, w = img.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, (40, 20, w - 80, h - 60), bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
    keep = np.where((mask == 1) | (mask == 3), 255, 0).astype('uint8')
    keep[RIBBON_TOP:, :] = 0
    n, lab, stats, _ = cv2.connectedComponentsWithStats(keep)
    alpha = np.zeros_like(keep)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > 20000:
            alpha[lab == i] = 255
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2RGBA)
    rgba[:, :, 3] = alpha
    out = Image.fromarray(rgba)
    out = out.crop(out.getbbox())
    out = out.resize((LOGO_WIDTH, round(out.height * LOGO_WIDTH / out.width)), Image.LANCZOS)
    out.save(OUT / 'logo.webp', quality=92, method=6)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    background(Path(sys.argv[1]))
    logo(Path(sys.argv[2]))
    print('yazıldı:', *(p.name for p in sorted(OUT.glob('*.webp'))))

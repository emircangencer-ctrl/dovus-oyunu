"""SysKO arayüz kiti üreticisi — kale teması (turnuva görseli MAHb3UFPgNE'den).

Çerçeveler, süs taşları ve ikonlar piksel piksel çizilir ve 9 dilimli SVG veri adreslerine dönüşür.
Renkler apps/game/src/ui/tokens.json'dan okunur. 960×540 taban: 1 SVG birimi = 1 taban pikseli = 1920 çerçevede 2 CSS pikseli.

Kullanım:
    python3 tools/ui-kit/kit.py                 # apps/game/src/ui/kit.css yazar
    python3 tools/ui-kit/kit.py --design DIZIN  # ayrıca ekran tasarımı yardımcılarını (helpers.css) yazar
"""
import json
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
TOKENS = json.loads((ROOT / 'apps/game/src/ui/tokens.json').read_text())
THEME = TOKENS['color']['themes'][0]['id']


def _resolve(value):
    v = value if isinstance(value, str) else value[THEME]
    if v.startswith('{') and v.endswith('}'):
        return C[v[1:-1]]
    return v


C = {}
for _t in TOKENS['color']['tokens']:
    C[_t['name']] = None
for _t in TOKENS['color']['tokens']:
    C[_t['name']] = _resolve(_t['value'])


# ---------------------------------------------------------------- piksel çizim

def shape(w, h, cut=0, tips=0):
    """w×h dolu maske. cut: köşelerde k piksellik çentik. tips: sol ve sağ uçta dışa sivri kurdele ucu derinliği."""
    m = [[1] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            for cx, cy in ((x, y), (w - 1 - x, y), (x, h - 1 - y), (w - 1 - x, h - 1 - y)):
                if cx + cy < cut:
                    m[y][x] = 0
            if tips:
                inset = round(tips * abs(y - (h - 1) / 2) / ((h - 1) / 2))
                if x < inset or x > w - 1 - inset:
                    m[y][x] = 0
    return m


def erode(m):
    h, w = len(m), len(m[0])
    return [[1 if m[y][x] and all(0 <= x + dx < w and 0 <= y + dy < h and m[y + dy][x + dx]
                                  for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) else 0
             for x in range(w)] for y in range(h)]


def paint_frame(w, h, rings, fill, cut=0, tips=0):
    """rings: dıştan içe 1 piksellik halkalar; her biri renk adı ya da (ışık, gölge) çifti.
    Işık: halkanın üst ve sol yüzü; gölge: alt ve sağ yüzü. Dönen ızgara renk kodları tutar."""
    g = [[None] * w for _ in range(h)]
    cur = shape(w, h, cut, tips)
    for ring in rings:
        nxt = erode(cur)
        hi, lo = (ring, ring) if isinstance(ring, str) else ring
        for y in range(h):
            for x in range(w):
                if cur[y][x] and not nxt[y][x]:
                    top_left = (y == 0 or not cur[y - 1][x]) or (x == 0 or not cur[y][x - 1])
                    g[y][x] = C[hi] if top_left else C[lo]
        cur = nxt
    for y in range(h):
        for x in range(w):
            if cur[y][x]:
                g[y][x] = C[fill]
    return g


def put(g, pts, color):
    for x, y in pts:
        g[y][x] = C[color]


def svg(g):
    h, w = len(g), len(g[0])
    rects = []
    for y in range(h):
        x = 0
        while x < w:
            c = g[y][x]
            if c is None:
                x += 1
                continue
            x0 = x
            while x < w and g[y][x] == c:
                x += 1
            rects.append(f'<rect x="{x0}" y="{y}" width="{x - x0}" height="1" fill="{c}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
            f'shape-rendering="crispEdges">{"".join(rects)}</svg>')


def uri(s):
    return 'url("data:image/svg+xml,' + quote(s, safe=" =:/,'") + '")'


def mask_icon(rows):
    g = [[C['ink-950'] if ch == '#' else None for ch in r] for r in rows]
    return svg(g)


# ---------------------------------------------------------------- çerçeveler

def riveted(g, n, at, size):
    """Köşe plakası ve perçin: (at, at) köşesinden size×size bronz plaka, ortasında 2×2 çelik perçin."""
    w = h = n
    for cx, cy, fx, fy in ((at, at, 1, 1), (w - 1 - at, at, -1, 1), (at, h - 1 - at, 1, -1), (w - 1 - at, h - 1 - at, -1, -1)):
        for i in range(size):
            for j in range(size):
                x, y = cx + fx * i, cy + fy * j
                edge_lo = (fx > 0 and i == size - 1) or (fy > 0 and j == size - 1) or (fx < 0 and i == 0) or (fy < 0 and j == 0)
                g[y][x] = C['bronze-700'] if edge_lo else C['bronze-300'] if (i == 0 or j == 0) else C['bronze-500']
        rx, ry = cx + fx * (size // 2 - 1), cy + fy * (size // 2 - 1)
        xs = sorted((rx, rx + fx)); ys = sorted((ry, ry + fy))
        g[ys[0]][xs[0]] = C['steel-100']; g[ys[0]][xs[1]] = C['steel-300']
        g[ys[1]][xs[0]] = C['steel-300']; g[ys[1]][xs[1]] = C['steel-700']


def btn(rim, hi, mid, lo, steel=(('steel-100', 'steel-500'), ('steel-300', 'steel-700'), ('steel-300', 'steel-700'))):
    """Çelik çerçeveli cam buton: dış çizgi, 3 halka çelik, koyu ayrım, cam kenarı; camın üst 2 sırası ışık, alt 2 sırası gölge."""
    n = 24
    g = paint_frame(n, n, ['ink-950', *steel, 'ink-950', rim], mid, cut=2)
    for x in range(6, n - 6):
        g[6][x] = C[hi]
        g[n - 7][x] = C[lo]
        g[n - 8][x] = C[lo]
    put(g, [(2, 2), (n - 3, 2), (2, n - 3), (n - 3, n - 3)], 'steel-100')
    return g


def build_frames():
    F = {}
    bronze = ['ink-950', ('bronze-300', 'bronze-700'), ('bronze-300', 'bronze-700'), ('bronze-500', 'bronze-700'), ('bronze-500', 'bronze-700'), ('bronze-700', 'bronze-500'), 'bronze-900']
    p = paint_frame(24, 24, bronze + [('navy-700', 'navy-950')], 'navy-900', cut=2)
    riveted(p, 24, 1, 8)
    F['panel'] = (p, 9)
    pr = paint_frame(24, 24, bronze + [('navy-600', 'navy-900')], 'navy-800', cut=2)
    riveted(pr, 24, 1, 8)
    F['panel-raised'] = (pr, 9)
    F['plate'] = (paint_frame(20, 20, ['ink-950', ('steel-100', 'steel-500'), ('steel-300', 'steel-700'), ('steel-300', 'steel-700'), 'steel-900', 'cyan-400', 'cyan-600'], 'navy-950', cut=2), 7)
    F['plate-sm'] = (paint_frame(12, 12, ['ink-950', ('steel-100', 'steel-500'), ('steel-300', 'steel-700'), 'steel-900', 'cyan-600'], 'navy-950', cut=1), 5)
    F['ribbon'] = (paint_frame(24, 24, ['ink-950', ('gold-300', 'gold-600'), 'gold-600', 'ink-950'], 'navy-950', tips=8), (4, 11))
    F['btn'] = (btn('blue-500', 'blue-500', 'blue-700', 'blue-900'), 8)
    F['btn-focus'] = (btn('cyan-400', 'blue-300', 'blue-500', 'blue-700', (('steel-100', 'steel-300'), ('steel-100', 'steel-500'), ('steel-300', 'steel-500'))), 8)
    F['btn-go'] = (btn('go-500', 'go-500', 'go-700', 'go-900'), 8)
    F['btn-go-focus'] = (btn('go-300', 'go-300', 'go-600', 'go-700', (('steel-100', 'steel-300'), ('steel-100', 'steel-500'), ('steel-300', 'steel-500'))), 8)
    F['btn-stop'] = (btn('stop-500', 'stop-500', 'stop-700', 'stop-900'), 8)
    F['btn-stop-focus'] = (btn('stop-300', 'stop-300', 'stop-600', 'stop-700', (('steel-100', 'steel-300'), ('steel-100', 'steel-500'), ('steel-300', 'steel-500'))), 8)
    F['btn-off'] = (btn('steel-700', 'steel-700', 'navy-800', 'navy-950', (('steel-500', 'steel-700'), ('steel-700', 'steel-900'), ('steel-700', 'steel-900'))), 8)
    F['match'] = (paint_frame(12, 12, ['ink-950', ('steel-500', 'steel-700')], 'navy-800', cut=1), 3)
    F['match-focus'] = (paint_frame(12, 12, ['ink-950', 'cyan-400', 'cyan-600'], 'navy-800', cut=1), 3)
    F['field'] = (paint_frame(12, 12, ['ink-950', ('steel-500', 'steel-700')], 'navy-950', cut=1), 3)
    F['field-focus'] = (paint_frame(12, 12, ['ink-950', 'cyan-400', 'cyan-600'], 'navy-950', cut=1), 3)
    F['key'] = (paint_frame(12, 12, ['ink-950', ('steel-300', 'steel-700'), ('navy-600', 'navy-950')], 'navy-800', cut=1), 3)
    F['chip'] = (paint_frame(10, 10, ['ink-950', ('bronze-300', 'bronze-700')], 'navy-900', cut=1), 3)
    F['chip-focus'] = (paint_frame(10, 10, ['ink-950', 'cyan-400', 'cyan-600'], 'navy-800', cut=1), 3)
    F['tab'] = (paint_frame(12, 12, ['ink-950', ('steel-300', 'steel-700')], 'navy-800', cut=1), 3)
    F['tab-on'] = (paint_frame(12, 12, ['ink-950', ('steel-100', 'steel-500'), 'cyan-400'], 'blue-700', cut=1), 3)
    F['hints'] = (paint_frame(12, 12, ['ink-950', ('steel-500', 'steel-700'), 'steel-900'], 'navy-950', cut=1), 4)
    F['hp'] = (paint_frame(10, 10, ['ink-950', ('steel-300', 'steel-700'), 'ink-950'], 'hp-track'), 3)
    F['pw'] = (paint_frame(10, 10, ['ink-950', ('steel-300', 'steel-700'), 'ink-950'], 'power-track'), 3)
    for name, line in (('p1', 'ember-500'), ('p2', 'volt-500'), ('focus', 'gold-400'), ('off', 'steel-700')):
        F[f'portrait-{name}'] = (paint_frame(20, 20, ['ink-950', ('steel-100', 'steel-500'), ('steel-300', 'steel-700'), line, line], 'navy-800', cut=2), 6)
    for name, col in (('bronz', 'tier-bronz'), ('gumus', 'tier-gumus'), ('altin', 'gold-400'), ('elmas', 'tier-elmas'), ('sampiyon', 'ember-500')):
        F[f'tier-{name}'] = (paint_frame(12, 12, ['ink-950', col], col, cut=1), 3)
    return F


def gem_svg():
    rows = ['....###....', '...#bbb#...', '..#bwgg#...', '.#bwggggb#.', '#bwgggggdb#', '#bggggggdb#', '#bgggggddb#', '.#bggggdb#.', '..#bgddb#..', '...#bbb#...', '....###....']
    col = {'#': 'ink-950', 'b': 'steel-300', 'w': 'gem-300', 'g': 'gem-500', 'd': 'gem-700'}
    return svg([[C[col[ch]] if ch in col else None for ch in r] for r in rows])


ICONS = {
    'cursor': ['#....', '##...', '###..', '####.', '###..', '##...', '#....'],
    'up': ['...#...', '..###..', '.#####.', '#######', '..###..', '..###..', '..###..'],
    'down': ['..###..', '..###..', '..###..', '#######', '.#####.', '..###..', '...#...'],
    'left': ['...#...', '..##...', '.######', '#######', '.######', '..##...', '...#...'],
    'right': ['...#...', '...##..', '######.', '#######', '######.', '...##..', '...#...'],
    'downright': ['#......', '.#.....', '..#...#', '...#..#', '....#.#', '.....##', '..#####'],
    'dot': ['.###.', '#####', '#####', '#####', '.###.'],
    'mark': ['..###..', '.#####.', '#######', '#######', '#######', '.#####.', '..###..'],
    'tri-up': ['...#...', '..###..', '.#####.', '#######'],
    'tri-down': ['#######', '.#####.', '..###..', '...#...'],
    'dia': ['..#..', '.###.', '#####', '.###.', '..#..'],
    'back': ['..#....', '.##....', '#######', '.##...#', '..#...#', '......#', '.#####.'],
    'pad': ['..###..', '..#.#..', '###.###', '#.....#', '###.###', '..#.#..', '..###..'],
}


# ---------------------------------------------------------------- CSS

S1, S2, S3, S4, S5 = '37.333px', '74.667px', '112px', '149.333px', '186.667px'
OUTLINE = ('2px 0 0 var(--ink-950), -2px 0 0 var(--ink-950), 0 2px 0 var(--ink-950), 0 -2px 0 var(--ink-950), '
           '2px 2px 0 var(--ink-950), -2px 2px 0 var(--ink-950), 2px -2px 0 var(--ink-950), -2px -2px 0 var(--ink-950), 0 4px 0 var(--ink-950)')


def glow(color):
    """Basamaklı piksel parıltı: bulanıklık yok, 3 halka gittikçe saydam."""
    return (f'0 0 0 2px color-mix(in srgb, var(--{color}) 70%, transparent), '
            f'0 0 0 4px color-mix(in srgb, var(--{color}) 38%, transparent), '
            f'0 0 0 6px color-mix(in srgb, var(--{color}) 16%, transparent)')


def css():
    frames = build_frames()
    FU = {k: uri(svg(g)) for k, (g, _) in frames.items()}
    SL = {k: s for k, (_, s) in frames.items()}
    IU = {k: uri(mask_icon(v)) for k, v in ICONS.items()}
    F = {k: f'var(--pf-{k})' for k in FU}
    I = {k: f'var(--pi-{k})' for k in IU}

    def bi(k):
        s = SL[k]
        if isinstance(s, tuple):
            v, h = s
            return (f'border-style: solid; border-color: transparent; border-width: {v * 2}px {h * 2}px; '
                    f'border-image: {F[k]} {v} {h} fill / {v * 2}px {h * 2}px stretch;')
        return f'border: {s * 2}px solid transparent; border-image: {F[k]} {s} fill / {s * 2}px stretch;'

    root = (':root {\n' + ''.join(f'  --pf-{k}: {v};\n' for k, v in FU.items())
            + ''.join(f'  --pi-{k}: {v};\n' for k, v in IU.items())
            + f'  --pg-gem: {uri(gem_svg())};\n}}\n')
    mask = lambda k: f'-webkit-mask: {I[k]} center / contain no-repeat; mask: {I[k]} center / contain no-repeat;'

    body = f"""
/* SysKO arayüz kiti — kale teması. tools/ui-kit/kit.py üretir; elle değiştirme.
   1920 çerçevede 1 taban pikseli = 2 CSS pikseli. Çerçeveler 9 dilimli piksel SVG; parıltılar bulanıklıksız basamaklı halkalar. */

.ds-stage, .scr, .oyun-ui {{ font-family: var(--font-pixel); font-synthesis: none; -webkit-font-smoothing: none; text-rendering: optimizeSpeed; }}
.ds-stage {{ background: var(--navy-900); color: var(--text-primary); padding: var(--space-4); display: flex; flex-wrap: wrap; gap: var(--space-6); align-items: flex-start; }}
.ds-stage--col {{ flex-direction: column; }}
.ds-label {{ font: 400 {S1}/1.25 var(--font-pixel); color: var(--text-muted); margin: 0 0 var(--space-1); }}
.ds-outline {{ text-shadow: {OUTLINE}; }}
.ds-cut {{ clip-path: polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px); }}

/* ---------- İkonlar (piksel maske; renk = currentColor) ---------- */
.ico {{ display: inline-block; flex: none; width: 14px; height: 14px; background: currentColor; vertical-align: middle; -webkit-mask: var(--m) center / contain no-repeat; mask: var(--m) center / contain no-repeat; }}
.ico-up {{ --m: {I['up']}; }} .ico-down {{ --m: {I['down']}; }} .ico-left {{ --m: {I['left']}; }} .ico-right {{ --m: {I['right']}; }}
.ico-downright {{ --m: {I['downright']}; }} .ico-tri-up {{ --m: {I['tri-up']}; height: 8px; }} .ico-tri-down {{ --m: {I['tri-down']}; height: 8px; }}
.ico-cursor {{ --m: {I['cursor']}; width: 10px; height: 14px; }} .ico-dot {{ --m: {I['dot']}; width: 10px; height: 10px; }}
.ico-dia {{ --m: {I['dia']}; width: 10px; height: 10px; }} .ico-back {{ --m: {I['back']}; }} .ico-pad {{ --m: {I['pad']}; }}
.ico--x2 {{ width: 28px; height: 28px; }}
.gem {{ display: inline-block; width: 22px; height: 22px; background: var(--pg-gem) center / contain no-repeat; image-rendering: pixelated; }}

/* ---------- Button: çelik çerçeve + renkli cam ---------- */
.ds-btn, .ds-button {{ position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 16px; min-width: 320px; padding: 2px 24px 6px; {bi('btn')}
  font: 400 {S1}/1.25 var(--font-pixel); color: var(--text-primary); text-shadow: {OUTLINE}; background: none; cursor: pointer; white-space: nowrap; }}
.ds-btn .ico {{ color: var(--cyan-300); }}
.ds-btn--go, .ds-button:not(.ds-button--secondary) {{ border-image-source: {F['btn-go']}; }}
.ds-btn--stop {{ border-image-source: {F['btn-stop']}; }}
.ds-btn--big {{ font-size: {S2}; line-height: 1.1; min-width: 560px; padding: 0 40px 8px; }}
.ds-btn--wide {{ display: flex; width: 100%; }}
.ds-btn:focus-visible, .ds-btn.is-focused, .ds-button:focus-visible, .ds-button.is-focused {{ outline: none; border-image-source: {F['btn-focus']}; box-shadow: {glow('cyan-400')}; }}
.ds-btn--go:focus-visible, .ds-btn--go.is-focused, .ds-button:not(.ds-button--secondary):focus-visible, .ds-button:not(.ds-button--secondary).is-focused {{ border-image-source: {F['btn-go-focus']}; box-shadow: {glow('go-500')}; }}
.ds-btn--stop:focus-visible, .ds-btn--stop.is-focused {{ border-image-source: {F['btn-stop-focus']}; box-shadow: {glow('stop-500')}; }}
.ds-btn:active, .ds-btn.is-pressed, .ds-button:active, .ds-button.is-pressed {{ transform: translateY(4px); box-shadow: none; }}
.ds-btn:disabled, .ds-btn.is-disabled, .ds-button:disabled, .ds-button.is-disabled {{ border-image-source: {F['btn-off']}; color: var(--text-disabled); cursor: not-allowed; box-shadow: none; }}
.ds-btn__soon {{ font: 400 {S1}/1 var(--font-pixel); color: var(--gold-300); }}

/* ---------- MenuItem (panel içi liste) ---------- */
.ds-menu {{ display: flex; flex-direction: column; gap: 4px; min-width: 640px; }}
.ds-menu-item {{ position: relative; display: flex; align-items: center; gap: 16px; padding: 8px 24px 8px 56px; font: 400 {S1}/1.25 var(--font-pixel); color: var(--text-secondary); }}
.ds-menu-item::before {{ content: ""; position: absolute; left: 24px; top: 50%; width: 10px; height: 14px; margin-top: -7px; background: var(--cyan-400); {mask('cursor')} opacity: 0; }}
.ds-menu-item.is-focused {{ color: var(--text-primary); background: var(--navy-700); box-shadow: inset 4px 0 0 var(--cyan-400), inset 0 2px 0 var(--navy-600), inset 0 -2px 0 var(--navy-950); text-shadow: {OUTLINE}; }}
.ds-menu-item.is-focused::before {{ opacity: 1; }}
.ds-menu-item.is-disabled {{ color: var(--text-disabled); }}
.ds-menu--big .ds-menu-item {{ font-size: {S2}; line-height: 1.1; padding-left: 72px; }}
.ds-menu--big .ds-menu-item::before {{ left: 28px; width: 20px; height: 28px; margin-top: -14px; }}
.ds-tag {{ font: 400 {S1}/1 var(--font-pixel); padding: 0 6px; {bi('chip')} color: var(--gold-300); text-shadow: none; }}

/* ---------- Panel: perçinli bronz çerçeve ---------- */
.ds-panel {{ position: relative; {bi('panel')} padding: 16px; min-width: 560px; }}
.ds-panel--raised {{ border-image-source: {F['panel-raised']}; }}
.ds-panel--ribbon {{ padding-top: 44px; }}
.ds-panel--ribbon > .ds-ribbon {{ position: absolute; top: -42px; left: 50%; transform: translateX(-50%); }}
.ds-panel__title {{ font: 400 {S1}/1.25 var(--font-pixel); color: var(--gold-300); margin: 0 0 var(--space-2); display: flex; align-items: center; gap: var(--space-2); text-shadow: 0 2px 0 var(--ink-950); }}
.ds-panel__title::after {{ content: ""; flex: 1; height: 2px; background: repeating-linear-gradient(90deg, var(--cyan-600) 0 4px, transparent 4px 8px); }}
.ds-panel__body {{ font: 400 {S1}/1.3 var(--font-pixel); color: var(--text-secondary); margin: 0; }}

/* ---------- Plate: çelik plaka, camgöbeği iç çizgi, isteğe bağlı süs taşları ---------- */
.ds-plate {{ position: relative; {bi('plate-sm')} padding: 0 8px; }}
.ds-plate--big {{ {bi('plate')} padding: 8px 32px; }}
.ds-plate--gems::before, .ds-plate--gems::after {{ content: ""; position: absolute; top: 50%; width: 22px; height: 22px; margin-top: -11px; background: var(--pg-gem) center / contain no-repeat; }}
.ds-plate--gems::before {{ left: -24px; }}
.ds-plate--gems::after {{ right: -24px; }}

/* ---------- Ribbon: altın kenarlı kurdele başlık ---------- */
.ds-ribbon {{ display: inline-flex; align-items: center; justify-content: center; gap: 16px; height: 48px; padding: 0 12px; {bi('ribbon')}
  font: 400 {S1}/1 var(--font-pixel); color: var(--gold-300); text-shadow: 0 2px 0 var(--ink-950); white-space: nowrap; }}
.ds-ribbon::before, .ds-ribbon::after {{ content: ""; width: 10px; height: 10px; background: var(--gold-400); {mask('dia')} }}

/* ---------- Toast ---------- */
.ds-toast {{ display: flex; align-items: center; gap: var(--space-2); min-width: 640px; padding: 4px 12px; {bi('plate')} font: 400 {S1}/1.25 var(--font-pixel); color: var(--text-primary); }}
.ds-toast__dot {{ width: 10px; height: 10px; flex: none; background: var(--cyan-300); {mask('dia')} }}
.ds-toast__kind {{ color: var(--cyan-300); }}
.ds-toast--success .ds-toast__dot {{ background: var(--success-500); }} .ds-toast--success .ds-toast__kind {{ color: var(--success-500); }}
.ds-toast--danger .ds-toast__dot {{ background: var(--danger-500); }} .ds-toast--danger .ds-toast__kind {{ color: var(--danger-500); }}
.ds-toast--soon .ds-toast__kind {{ color: var(--gold-300); }} .ds-toast--soon .ds-toast__dot {{ background: var(--gold-400); }}

/* ---------- Table: altın başlık, iki tonlu lacivert satırlar ---------- */
.ds-table {{ border-collapse: collapse; font: 400 {S1}/1.25 var(--font-pixel); color: var(--text-primary); }}
.ds-table th {{ color: var(--gold-400); font-weight: 400; text-align: left; padding: 8px 20px; background: var(--navy-800); box-shadow: inset 0 -2px 0 var(--steel-700); text-shadow: 0 2px 0 var(--ink-950); }}
.ds-table td {{ padding: 8px 20px; }}
.ds-table tbody tr:nth-child(odd) {{ background: var(--navy-900); }}
.ds-table tbody tr:nth-child(even) {{ background: var(--navy-800); }}
.ds-table th + th, .ds-table td + td {{ box-shadow: inset 2px 0 0 var(--steel-900); }}
.ds-table th + th {{ box-shadow: inset 2px 0 0 var(--steel-900), inset 0 -2px 0 var(--steel-700); }}
.ds-table tr.is-focused {{ background: var(--navy-700); box-shadow: inset 4px 0 0 var(--cyan-400); }}
.ds-table tr.is-me td {{ color: var(--cyan-300); }}
.ds-table .num {{ text-align: right; }}

/* ---------- Hints: alt ipucu şeridi ---------- */
.ds-hints {{ display: flex; align-items: center; gap: 40px; padding: 4px 24px; {bi('hints')} font: 400 {S1}/1 var(--font-pixel); color: var(--steel-300); }}
.ds-hints .sp {{ flex: 1; }}
.key {{ display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-width: 52px; height: 52px; padding: 0 4px 2px; margin-right: 12px; {bi('key')}
  font: 400 {S1}/1 var(--font-pixel); color: var(--cyan-300); vertical-align: middle; }}

/* ---------- HUD ---------- */
.ds-hud {{ font-family: var(--font-pixel); color: var(--hud-text); }}
.ds-health {{ display: flex; flex-direction: column; gap: var(--space-1); width: 712px; }}
.ds-health__name {{ font: 400 {S1}/1.25 var(--font-pixel); align-self: flex-start; }}
.ds-health__bar {{ position: relative; align-self: stretch; height: 44px; {bi('hp')} }}
.ds-health__trail, .ds-health__fill {{ position: absolute; top: 0; bottom: 0; left: 0; box-shadow: inset 0 4px 0 rgba(255, 255, 255, 0.35), inset 0 -4px 0 rgba(0, 0, 0, 0.3); }}
.ds-health__trail {{ background: var(--hp-trail); }}
.ds-health__fill {{ background: var(--hp-fill); }}
.ds-health__bar::after {{ content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent 0 60px, rgba(6, 10, 23, 0.55) 60px 64px); pointer-events: none; }}
.ds-health.is-low .ds-health__fill {{ background: var(--hp-low); }}
.ds-health--p2 {{ align-items: flex-end; }}
.ds-health--p2 .ds-health__name {{ align-self: flex-end; color: var(--volt-400); }}
.ds-health--p2 .ds-health__trail, .ds-health--p2 .ds-health__fill {{ left: auto; right: 0; }}
.ds-health--p2 .ds-health__bar::after {{ background: repeating-linear-gradient(270deg, transparent 0 60px, rgba(6, 10, 23, 0.55) 60px 64px); }}
.ds-health--p1 .ds-health__name {{ color: var(--ember-400); }}
.ds-power {{ display: flex; align-items: center; gap: var(--space-2); }}
.ds-power__level {{ font: 400 {S2}/1 var(--font-pixel); width: 48px; text-align: center; color: var(--power-fill); text-shadow: 0 4px 0 var(--ink-950); }}
.ds-power__stocks {{ display: flex; gap: 4px; }}
.ds-power__stock {{ position: relative; width: 140px; height: 28px; {bi('pw')} }}
.ds-power__stock > i {{ position: absolute; top: 0; bottom: 0; left: 0; background: var(--power-fill); box-shadow: inset 0 4px 0 rgba(255, 255, 255, 0.35); }}
.ds-power__stock.is-full > i {{ right: 0; }}
.ds-power.is-max .ds-power__stock > i {{ background: var(--power-max); }}
.ds-power.is-max .ds-power__level {{ color: var(--power-max); }}
.ds-power__max {{ font: 400 {S1}/1 var(--font-pixel); color: var(--power-max); }}
.ds-timer {{ display: inline-grid; place-items: center; min-width: 156px; padding: 0 12px; {bi('plate')} font: 400 {S3}/1 var(--font-pixel); color: var(--hud-text); text-shadow: 0 4px 0 var(--ink-950); }}
.ds-timer.is-low {{ color: var(--hp-low); }}
.ds-timer__label {{ font: 400 {S1}/1 var(--font-pixel); color: var(--cyan-300); padding-bottom: 6px; text-shadow: none; }}
.ds-marks {{ display: flex; gap: var(--space-1); }}
.ds-mark {{ width: 28px; height: 28px; background: var(--steel-700); {mask('mark')} }}
.ds-mark.is-won {{ background: var(--gold-400); }}
.ds-portrait {{ display: inline-flex; flex-direction: column; gap: var(--space-1); }}
.ds-portrait__frame {{ width: 240px; height: 240px; {bi('portrait-p1')} display: grid; place-items: end center; overflow: hidden; }}
.ds-portrait__frame > img {{ display: block; width: 100%; height: auto; image-rendering: pixelated; }}
.ds-portrait--p2 .ds-portrait__frame {{ border-image-source: {F['portrait-p2']}; }}
.ds-portrait.is-focused .ds-portrait__frame {{ border-image-source: {F['portrait-focus']}; box-shadow: {glow('gold-400')}; }}
.ds-portrait.is-locked .ds-portrait__frame {{ border-image-source: {F['portrait-off']}; }}
.ds-portrait__name {{ font: 400 {S1}/1.25 var(--font-pixel); color: var(--hud-text); text-shadow: 0 2px 0 var(--ink-950); }}
.ds-portrait.is-locked .ds-portrait__name {{ color: var(--text-disabled); }}
.ds-combo {{ display: inline-flex; flex-direction: column; font-family: var(--font-pixel); }}
.ds-combo__row {{ display: flex; align-items: baseline; gap: var(--space-1); }}
.ds-combo__count {{ font-size: {S3}; line-height: 1; color: var(--gold-400); text-shadow: {OUTLINE}; }}
.ds-combo__word {{ font-size: {S2}; line-height: 1; color: var(--hud-text); text-shadow: {OUTLINE}; }}
.ds-combo__damage {{ font: 400 {S1}/1.25 var(--font-pixel); color: var(--cyan-300); text-shadow: 0 2px 0 var(--ink-950); }}

/* ---------- Turnuva ağacı ---------- */
.ds-match {{ width: 480px; {bi('match')} }}
.ds-match.is-focused {{ border-image-source: {F['match-focus']}; box-shadow: {glow('cyan-400')}; }}
.ds-match__head {{ display: flex; justify-content: space-between; padding: 0 12px; font: 400 {S1}/1.25 var(--font-pixel); color: var(--steel-300); background: var(--navy-950); }}
.ds-match__live {{ color: var(--stop-500); display: inline-flex; align-items: center; gap: 8px; }}
.ds-match__live::before {{ content: ""; width: 10px; height: 10px; background: currentColor; {mask('dot')} }}
.ds-match__row {{ display: flex; justify-content: space-between; align-items: center; padding: 2px 12px; font: 400 {S1}/1.25 var(--font-pixel); color: var(--text-secondary); }}
.ds-match__row + .ds-match__row {{ box-shadow: inset 0 2px 0 var(--navy-600); }}
.ds-match__score {{ font: 400 {S1}/1.25 var(--font-pixel); color: var(--text-primary); }}
.ds-match__row.is-winner {{ color: var(--text-primary); background-color: var(--navy-700); }}
.ds-match__row.is-winner .ds-match__score {{ color: var(--gold-400); }}
.ds-link {{ position: absolute; background: var(--cyan-400); box-shadow: 0 0 0 2px color-mix(in srgb, var(--cyan-400) 25%, transparent); }}
.ds-node {{ position: absolute; width: 16px; height: 16px; margin: -8px 0 0 -8px; background: var(--gold-400); {mask('mark')} }}

/* ---------- Tier ---------- */
.ds-tier {{ display: inline-flex; align-items: center; gap: var(--space-1); padding: 0 6px; {bi('tier-bronz')} font: 400 {S1}/1 var(--font-pixel); color: var(--text-on-accent); }}
.ds-tier__rating {{ font: 400 {S1}/1 var(--font-pixel); }}
.ds-tier--bronz {{ border-image-source: {F['tier-bronz']}; }} .ds-tier--gumus {{ border-image-source: {F['tier-gumus']}; }}
.ds-tier--altin {{ border-image-source: {F['tier-altin']}; }} .ds-tier--elmas {{ border-image-source: {F['tier-elmas']}; }}
.ds-tier--sampiyon {{ border-image-source: {F['tier-sampiyon']}; }}

@media (prefers-reduced-motion: reduce) {{ * {{ transition: none !important; animation: none !important; }} }}
"""
    return root + body, F, I, bi, mask


def tokens_css():
    def val(v):
        v = v if isinstance(v, str) else v[THEME]
        return f'var(--{v[1:-1]})' if v.startswith('{') else v
    out = [f'--{t["name"]}: {val(t["value"])}' for t in TOKENS['color']['tokens']]
    for fam in ('spacing', 'radius', 'shadow', 'pixel'):
        out += [f'--{t["name"]}: {t["value"]}' for t in TOKENS[fam]['tokens']]
    out += [f'--font-{k}: {v}' for k, v in TOKENS['type']['families'].items()]
    return ':root {\n' + ''.join(f'  {x};\n' for x in out) + '}\n'


def helpers(F, I, bi, mask):
    return f"""
/* ---------- Ekran tasarımı yardımcıları (yalnız tasarım tuvali) ---------- */
.scr {{ position: relative; width: 1920px; height: 1080px; overflow: hidden; background: var(--sky-900); color: var(--text-primary); box-sizing: border-box; }}
.scr *, .scr *::before, .scr *::after {{ box-sizing: border-box; }}
.scr h1, .scr h2, .scr h3, .scr p {{ margin: 0; font-weight: 400; }}
:where(.scr button) {{ appearance: none; border: 0; background: none; padding: 0; margin: 0; font: inherit; color: inherit; text-align: inherit; cursor: pointer; }}
:where(.scr input) {{ font: inherit; color: inherit; }}
button.ds-menu-item, button.row {{ width: 100%; text-align: left; }}
.scr img {{ image-rendering: pixelated; }}
.scr-bg {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; image-rendering: auto !important; }}
.scr-dim {{ position: absolute; inset: 0; background: color-mix(in srgb, var(--sky-950) 45%, transparent); }}
.scr-dim--deep {{ background: color-mix(in srgb, var(--sky-950) 70%, transparent); }}
.scr-title {{ position: absolute; left: 64px; top: 48px; display: flex; align-items: center; gap: 24px; {bi('plate')} padding: 0 28px 4px; color: var(--gold-300); text-shadow: 0 4px 0 var(--ink-950); }}
.scr-sub {{ font: 400 {S1}/1.25 var(--font-pixel); color: var(--steel-300); text-shadow: 0 2px 0 var(--ink-950); }}
.hints {{ position: absolute; left: 48px; right: 48px; bottom: 24px; display: flex; gap: 40px; align-items: center; padding: 4px 24px; {bi('hints')} font: 400 {S1}/1 var(--font-pixel); color: var(--steel-300); }}
.hints .sp {{ flex: 1; }}
.chip {{ display: inline-flex; align-items: center; gap: 10px; padding: 0 8px; {bi('chip')} font: 400 {S1}/1.25 var(--font-pixel); color: var(--text-secondary); }}
.chip.is-on {{ border-image-source: {F['chip-focus']}; color: var(--text-primary); }}
.dot {{ width: 10px; height: 10px; display: inline-block; flex: none; background: var(--steel-500); {mask('dot')} }}
.dot--ok {{ background: var(--success-500); }} .dot--mid {{ background: var(--gold-400); }} .dot--bad {{ background: var(--danger-500); }} .dot--off {{ background: var(--steel-700); }}
.tabs {{ display: flex; gap: 8px; }}
.tab {{ padding: 0 16px 2px; {bi('tab')} font: 400 {S1}/1.25 var(--font-pixel); color: var(--steel-300); }}
.tab.is-on {{ border-image-source: {F['tab-on']}; color: var(--text-primary); text-shadow: 0 2px 0 var(--ink-950); }}
.row {{ display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 10px 24px; font: 400 {S1}/1.25 var(--font-pixel); color: var(--text-secondary); }}
.row:nth-child(even) {{ background: color-mix(in srgb, var(--navy-800) 70%, transparent); }}
.row.is-focused {{ background-color: var(--navy-700); color: var(--text-primary); box-shadow: inset 4px 0 0 var(--cyan-400); }}
.val {{ display: flex; align-items: center; gap: 16px; font: 400 {S1}/1 var(--font-pixel); color: var(--text-primary); }}
.val .arr {{ color: var(--steel-500); }}
.row.is-focused .val .arr {{ color: var(--cyan-400); }}
.toggle {{ display: inline-flex; width: 88px; height: 40px; padding: 4px; background: var(--navy-950); box-shadow: inset 0 0 0 2px var(--steel-700); }}
.toggle > i {{ width: 40px; height: 32px; background: var(--steel-300); box-shadow: inset 0 -4px 0 var(--steel-700); }}
.toggle.is-on {{ justify-content: flex-end; background: var(--go-700); box-shadow: inset 0 0 0 2px var(--go-500); }}
.toggle.is-on > i {{ background: var(--steel-100); }}
.safe {{ position: absolute; inset: 32px; border: 4px dashed var(--cyan-400); pointer-events: none; }}
.safe > span {{ position: absolute; right: 12px; bottom: 8px; font: 400 {S1}/1 var(--font-pixel); color: var(--cyan-300); background: var(--navy-950); padding: 4px 8px; }}
.note {{ font: 400 {S1}/1.3 var(--font-pixel); color: var(--text-muted); }}
.num {{ font-family: var(--font-pixel); }}
.ember {{ color: var(--ember-400); }} .volt {{ color: var(--volt-400); }} .gold {{ color: var(--gold-400); }} .ok {{ color: var(--success-500); }} .bad {{ color: var(--danger-500); }} .muted {{ color: var(--text-muted); }} .sec {{ color: var(--text-secondary); }} .cyan {{ color: var(--cyan-300); }}
.field {{ display: flex; flex-direction: column; gap: 12px; }}
.field label {{ font: 400 {S1}/1 var(--font-pixel); color: var(--steel-300); }}
.field input {{ height: 72px; padding: 0 16px; {bi('field')} font: 400 {S1}/1 var(--font-pixel); color: var(--text-primary); }}
.field input.is-focused {{ border-image-source: {F['field-focus']}; box-shadow: {glow('cyan-400')}; }}
.swatch {{ width: 56px; height: 56px; border: 0; box-shadow: inset 0 0 0 4px var(--ink-950); }}
.swatch.is-picked {{ box-shadow: inset 0 0 0 4px var(--ink-950), 0 0 0 4px var(--cyan-400); }}
.box-hit {{ position: absolute; border: 4px solid var(--danger-500); background: rgba(255, 107, 94, 0.2); }}
.box-hurt {{ position: absolute; border: 4px solid var(--volt-400); background: rgba(121, 166, 255, 0.16); }}
.box-push {{ position: absolute; border: 4px dashed var(--text-secondary); }}
.pad {{ position: relative; width: 600px; height: 300px; margin: 16px auto 0; }}
.pad__body {{ position: absolute; inset: 40px 0 40px 0; background: var(--navy-800); box-shadow: inset 0 0 0 4px var(--steel-500); }}
.pad__grip {{ position: absolute; bottom: 0; width: 160px; height: 120px; background: var(--navy-800); box-shadow: inset 0 0 0 4px var(--steel-500); }}
.pad__dpad {{ position: absolute; background: var(--steel-700); }}
.pad__btn {{ position: absolute; width: 48px; height: 48px; display: grid; place-items: center; font: 400 {S1}/1 var(--font-pixel); color: var(--text-primary); }}
.pad__btn::before {{ content: ""; position: absolute; inset: 0; background: var(--steel-700); {mask('mark')} }}
.pad__btn > span {{ position: relative; }}
.pad__btn.is-on::before {{ background: var(--cyan-600); }}
.pad__btn.is-on {{ color: var(--text-primary); }}
"""


if __name__ == '__main__':
    kit, F, I, bi, mask = css()
    out = ROOT / 'apps/game/src/ui/kit.css'
    out.write_text('/* Token değişkenleri (tokens.json) */\n' + tokens_css() + kit)
    print('yazıldı:', out.relative_to(ROOT), len(kit))
    if '--design' in sys.argv:
        d = Path(sys.argv[sys.argv.index('--design') + 1])
        d.mkdir(parents=True, exist_ok=True)
        (d / 'bundle.css').write_text(kit)
        (d / 'helpers.css').write_text(helpers(F, I, bi, mask))
        (d / 'tokens.css').write_text(tokens_css())
        print('tasarım dosyaları:', d)

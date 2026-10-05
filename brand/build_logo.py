from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import cairosvg, re, os

RED, GREEN, INK = '#d42027', '#239a46', '#1a1714'

def text_path(font, text, cap_px, tracking=0.0, hscale=1.0):
    """Texto a contornos SVG, escalado para que las mayúsculas midan cap_px."""
    upem = font['head'].unitsPerEm; cap = font['OS/2'].sCapHeight or upem*0.7; scale = cap_px/cap
    gs = font.getGlyphSet(); cmap = font.getBestCmap(); hmtx = font['hmtx']
    x = 0; d = []; minx = 1e9; maxx = -1e9
    for ch in text:
        if ch == ' ': x += hmtx[cmap[32]][0]*scale*hscale + tracking; continue
        g = cmap[ord(ch)]; pen = SVGPathPen(gs); gs[g].draw(TransformPen(pen, (scale*hscale, 0, 0, -scale, x, 0))); d.append(pen.getCommands())
        bp = BoundsPen(gs); gs[g].draw(bp)
        if bp.bounds: minx = min(minx, x + bp.bounds[0]*scale*hscale); maxx = max(maxx, x + bp.bounds[2]*scale*hscale)
        x += hmtx[g][0]*scale*hscale + tracking
    return ' '.join(d), minx, maxx

jost = TTFont('Jost.ttf'); bold = instantiateVariableFont(jost, {'wght': 700}, inplace=False); quest = TTFont('Questrial.ttf')
_paths = re.findall(r'<path[^>]*/>', open('drawing3.svg').read())
drawing = '<g>' + ''.join(_paths) + '</g>'
_nums = [float(x) for d in re.findall(r'd="([^"]+)"', open('drawing3.svg').read()) for x in re.findall(r'-?\d+\.?\d*', d)]
DX0, DX1, DY0, DY1 = min(_nums[0::2]), max(_nums[0::2]), min(_nums[1::2]), max(_nums[1::2])
dw, dh = DX1-DX0, DY1-DY0

def words(cap_p, cap_c, tr_p, tr_c):
    dp, pa, pb = text_path(bold, 'PIMENTONES', cap_p, tracking=tr_p, hscale=1.06)
    dc, ca, cb = text_path(quest, 'LA CAJITA', cap_c, tracking=tr_c)
    return (dp, pa, pb-pa), (dc, ca, cb-ca)

def svg_wrap(W, H, body): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" width="{W:.0f}" height="{H:.0f}">\n<title>Pimentones La Cajita</title>\n{body}\n</svg>'

def vertical():
    (dp, pa, wp), (dc, ca, wc) = words(86, 150, 3, 2)
    W = wc + 100; sc = (0.60*wc)/dw; dwid, dhei = dw*sc, dh*sc; cx = W/2
    g_draw = f'<g transform="translate({cx - dwid/2 - DX0*sc:.2f},{50 - DY0*sc:.2f}) scale({sc:.4f})">{drawing}</g>'
    y_pim = 50 + dhei + 40 + 86; y_caj = y_pim + 30 + 150
    g_pim = f'<g fill="{GREEN}" transform="translate({cx - wp/2 - pa:.2f},{y_pim:.2f})"><path d="{dp}"/></g>'
    g_caj = f'<g fill="{RED}" transform="translate({cx - wc/2 - ca:.2f},{y_caj:.2f})"><path d="{dc}"/></g>'
    return svg_wrap(W, y_caj + 40 + 50, g_draw + '\n' + g_pim + '\n' + g_caj)

def horizontal():
    (dp, pa, wp), (dc, ca, wc) = words(68, 120, 2, 1)
    sc = 300/dh; dwid = dw*sc; tx = 50 + dwid + 60
    g_draw = f'<g transform="translate({50 - DX0*sc:.2f},{50 - DY0*sc:.2f}) scale({sc:.4f})">{drawing}</g>'
    y_pim = 50 + 95; y_caj = y_pim + 36 + 120
    g_pim = f'<g fill="{GREEN}" transform="translate({tx - pa:.2f},{y_pim:.2f})"><path d="{dp}"/></g>'
    g_caj = f'<g fill="{RED}" transform="translate({tx - ca:.2f},{y_caj:.2f})"><path d="{dc}"/></g>'
    return svg_wrap(tx + wc + 50, 400, g_draw + '\n' + g_pim + '\n' + g_caj)

os.makedirs('out', exist_ok=True)
for name, svg in [('vertical', vertical()), ('horizontal', horizontal())]:
    open(f'out/logo-{name}.svg', 'w').write(svg)
    open(f'out/logo-{name}-blanco.svg', 'w').write(svg.replace(RED, '#ffffff').replace(GREEN, '#ffffff'))
    open(f'out/logo-{name}-negro.svg', 'w').write(svg.replace(RED, INK).replace(GREEN, INK))
    for w in ([1024, 2048, 4096] if name == 'vertical' else [2048, 4096]):
        cairosvg.svg2png(bytestring=svg.encode(), write_to=f'out/logo-{name}-{w}.png', output_width=w)
    cairosvg.svg2png(bytestring=svg.encode(), write_to=f'out/logo-{name}-2048-fondo-blanco.png', output_width=2048, background_color='white')
    cairosvg.svg2png(bytestring=svg.replace(RED, '#ffffff').replace(GREEN, '#ffffff').encode(), write_to=f'out/logo-{name}-blanco-2048.png', output_width=2048)
iso = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{DX0-40} {DY0-40} {dw+80} {dh+80}">{drawing}</svg>'
open('out/isotipo.svg', 'w').write(iso)
for w in [1024, 512, 192, 64, 32]: cairosvg.svg2png(bytestring=iso.encode(), write_to=f'out/isotipo-{w}.png', output_width=w, output_height=w)
cairosvg.svg2png(bytestring=open('out/logo-vertical.svg').read().encode(), write_to='/tmp/prev_v.png', output_width=700, background_color='white')
cairosvg.svg2png(bytestring=open('out/logo-horizontal.svg').read().encode(), write_to='/tmp/prev_h.png', output_width=900, background_color='white')
print(len(os.listdir('out')), 'archivos')

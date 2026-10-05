"""Trazos de 'pincel': una línea central (curvas Bézier) se convierte en una forma rellena cuyo grosor varía a lo largo del trazo."""
import math

def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return (u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0], u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1])

def sample(segments, n=40):
    """segments: lista de (p0,p1,p2,p3). Devuelve puntos y tangentes (longitud de arco aproximada)."""
    pts = []
    for (p0, p1, p2, p3) in segments:
        for i in range(n + 1):
            if pts and i == 0: continue
            pts.append(bez(p0, p1, p2, p3, i / n))
    tans = []
    for i, p in enumerate(pts):
        a = pts[max(0, i - 1)]; b = pts[min(len(pts) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1
        tans.append((dx / L, dy / L))
    return pts, tans

def arclen_params(pts):
    d = [0.0]
    for i in range(1, len(pts)): d.append(d[-1] + math.hypot(pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]))
    total = d[-1] or 1
    return [x / total for x in d]

def stroke(segments, width, closed=False, n=40, caps=True):
    """width: función t->grosor. Devuelve 'd' de un path relleno."""
    pts, tans = sample(segments, n)
    ts = arclen_params(pts)
    left, right = [], []
    for p, (tx, ty), t in zip(pts, tans, ts):
        w = width(t) / 2; nx, ny = -ty, tx
        left.append((p[0] + nx * w, p[1] + ny * w)); right.append((p[0] - nx * w, p[1] - ny * w))
    def fmt(seq): return ' '.join(f'{x:.1f} {y:.1f}' for x, y in seq)
    if closed:
        return f'M {fmt(left)} Z M {fmt(right[::-1])} Z'   # anillo: orientaciones opuestas (nonzero)
    # tapa redonda al final e inicio
    def cap(center, tan, w, sign):
        cx, cy = center; ang0 = math.atan2(-tan[0], tan[1])  # normal izquierda
        out = []
        for k in range(1, 8):
            a = ang0 + sign * math.pi * k / 8
            out.append((cx + math.cos(a) * w, cy + math.sin(a) * w))
        return out
    end_cap = cap(pts[-1], tans[-1], width(1) / 2, -1)
    start_cap = cap(pts[0], (-tans[0][0], -tans[0][1]), width(0) / 2, -1)
    poly = left + end_cap + right[::-1] + start_cap
    return 'M ' + fmt(poly) + ' Z'

def taper(base, start=0.55, mid=1.0, end=0.55):
    """Grosor que crece hacia el centro del trazo (pincel) y afina en los extremos."""
    def w(t):
        if t <= 0.5: return base * (start + (mid - start) * math.sin(math.pi * t))
        return base * (end + (mid - end) * math.sin(math.pi * (1 - t)))
    return w

def ramp(w0, w1): return lambda t: w0 + (w1 - w0) * t

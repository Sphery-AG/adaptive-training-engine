#!/usr/bin/env python3
"""Render ERD sheets in the notation Michel uses on the Miro board.

His conventions, copied deliberately:
  - rounded box per table, four fills by role
  - table name, then pk / fk / unique lines, then a blank line, then fields
    as "name: type, // comment"
  - relationship phrased on the connector: "one-to-many (each X has zero or
    multiple Y)"
  - two-line heading above the cluster
"""
import base64, glob, os, sys

F = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')
def b64(p): return base64.b64encode(open(os.path.join(F, p), 'rb').read()).decode()
SANS = b64('0c89a48fa5027cee-s.p.2cyn07wtgehh0.woff2')   # Geist
MONO = b64('797e433ab948586e-s.p.0r6juujl39pe6.woff2')   # Geist Mono

FILL = {  # Michel's four, same meanings
    'y': ('#FFDC4A', '#C9A400'),   # identity / users
    'b': ('#C6DCFF', '#6E9BE0'),   # the "parent" record
    'g': ('#ADF0C7', '#4FB57E'),   # the logs
    'o': ('#FE9F4D', '#C86F1E'),   # groups / aggregates / state
}

BW, LH, HEAD, PAD = 520, 27, 46, 18


def box_height(t):
    n = len(t['keys']) + len(t['fields']) + (1 if t['keys'] and t['fields'] else 0)
    return HEAD + PAD + n * LH + PAD


def render(sheet, path):
    W, H = sheet['w'], sheet['h']
    out = [f"""<style>
@font-face{{font-family:'S';src:url(data:font/woff2;base64,{SANS}) format('woff2');}}
@font-face{{font-family:'M';src:url(data:font/woff2;base64,{MONO}) format('woff2');}}
html,body{{margin:0;padding:0;background:#fff;}} svg{{display:block;}}
.h1{{font:600 46px S;fill:#16202B;}}
.h2{{font:400 26px S;fill:#5C6874;}}
.tn{{font:600 22px M;fill:#16202B;}}
.k {{font:400 17px M;fill:#4A5560;}}
.f {{font:400 17px M;fill:#2B3640;}}
.c {{font:400 17px M;fill:#8A939C;}}
.rel{{font:400 15px S;fill:#5C6874;}}
.note{{font:400 19px S;fill:#5C6874;}}
</style>
<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">
<defs><marker id="a" viewBox="0 0 9 9" refX="8" refY="4.5" markerWidth="7" markerHeight="7" orient="auto">
<path d="M0,0 L9,4.5 L0,9 z" fill="#98A199"/></marker></defs>
<rect width="{W}" height="{H}" fill="#FFFFFF"/>"""]

    out.append(f'<text x="70" y="72" class="h1">{sheet["title"]}</text>')
    out.append(f'<text x="70" y="112" class="h2">{sheet["sub"]}</text>')

    pos = {}
    for t in sheet['tables']:
        x, y = t['x'], t['y']
        h = box_height(t)
        pos[t['name']] = (x, y, BW, h)
        fill, stroke = FILL[t['c']]
        out.append(f'<rect x="{x}" y="{y}" width="{BW}" height="{h}" rx="10" fill="{fill}" '
                   f'fill-opacity="0.30" stroke="{stroke}" stroke-width="2"/>')
        out.append(f'<rect x="{x}" y="{y}" width="{BW}" height="{HEAD}" rx="10" fill="{fill}"/>')
        out.append(f'<rect x="{x}" y="{y+HEAD-10}" width="{BW}" height="10" fill="{fill}"/>')
        out.append(f'<text x="{x+16}" y="{y+31}" class="tn">{t["name"]}</text>')
        ly = y + HEAD + PAD + 14
        for k in t['keys']:
            out.append(f'<text x="{x+16}" y="{ly}" class="k">{k}</text>'); ly += LH
        if t['keys'] and t['fields']:
            ly += 0
            out.append(f'<line x1="{x+16}" y1="{ly-16}" x2="{x+BW-16}" y2="{ly-16}" '
                       f'stroke="{stroke}" stroke-opacity="0.45" stroke-width="1"/>')
            ly += LH - 10
        for f in t['fields']:
            if '//' in f:
                a, b = f.split('//', 1)
                out.append(f'<text x="{x+16}" y="{ly}" class="f">{a.strip()} <tspan class="c">// {b.strip()}</tspan></text>')
            else:
                out.append(f'<text x="{x+16}" y="{ly}" class="f">{f}</text>')
            ly += LH

    for rel in sheet['rels']:
        a, b, label, side = rel[:4]
        dy = rel[4] if len(rel) > 4 else 0   # separate connectors leaving one table
        ax, ay, aw, ah = pos[a]
        bx, by, bw, bh = pos[b]
        if side == 'r':
            x1, y1 = ax + aw, ay + 40 + dy
            x2, y2 = bx, by + 40
            mx = (x1 + x2) / 2
            d = f"M{x1},{y1} L{mx},{y1} L{mx},{y2} L{x2-6},{y2}"
            lx, ly_ = mx, min(y1, y2) - 30
        else:
            x1, y1 = ax + aw / 2 + dy, ay + ah
            x2, y2 = bx + bw / 2 + dy, by
            my = (y1 + y2) / 2
            d = f"M{x1},{y1} L{x1},{my} L{x2},{my} L{x2},{y2-6}"
            lx, ly_ = (x1 + x2) / 2, my - 12
        out.append(f'<path d="{d}" fill="none" stroke="#98A199" stroke-width="1.8" marker-end="url(#a)"/>')
        # wrap to <=32 chars per line, white halo behind each so the text never
        # fights a box edge or a connector
        words, lines, cur = label.split(), [], ''
        for w in words:
            if len(cur) + len(w) + 1 <= 32:
                cur = (cur + ' ' + w).strip()
            else:
                lines.append(cur); cur = w
        if cur: lines.append(cur)
        for i, ln in enumerate(lines):
            yy = ly_ + i * 21 - (len(lines) - 1) * 21
            out.append(f'<rect x="{lx - len(ln)*3.9 - 6}" y="{yy-15}" width="{len(ln)*7.8 + 12}" '
                       f'height="20" rx="3" fill="#FFFFFF" fill-opacity="0.94"/>')
            out.append(f'<text x="{lx}" y="{yy}" class="rel" text-anchor="middle">{ln}</text>')

    for nx, ny, txt in sheet.get('notes', []):
        out.append(f'<text x="{nx}" y="{ny}" class="note">{txt}</text>')

    out.append('</svg>')
    open(path, 'w').write("".join(out))
    return W, H

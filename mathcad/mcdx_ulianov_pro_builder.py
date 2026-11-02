# -*- coding: utf-8 -*-
"""
MÓDULO BIFURCACIÓN PRO: Generador de Formato Único Ulianov con DCL Dual
Inyecta en Mathcad Prime 11:
- Image2.png: Esquema Físico (Viga con apoyos y cotas)
- Image3.png: Diagrama de Cuerpo Libre (DCL) con flechas explícitas de reacción Ay, By
  y fuerzas resultantes equivalentes R = q*L en el centroide con brazos de palanca
- Image12.png: Esquema de Secciones de Corte
No modifica el generador base mcdx_ulianov_builder.py.
"""
import os, sys, zipfile, io
from PIL import Image, ImageDraw, ImageFont
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')

ML_NS = "http://schemas.mathsoft.com/math50"
WS_NS = "http://schemas.mathsoft.com/worksheet50"
P_NS = "http://schemas.microsoft.com/winfx/2006/xaml/presentation"
C_NS = "clr-namespace:Ptc.Wpf;assembly=Ptc.Core"

ET.register_namespace('ml', ML_NS)
ET.register_namespace('ws', WS_NS)
ET.register_namespace('p', P_NS)
ET.register_namespace('c', C_NS)

def mk_id(name, subscript=None, labels="VARIABLE", is_contextual=True):
    el = ET.Element(f"{{{ML_NS}}}id", {"labels": labels, "{http://www.w3.org/XML/1998/namespace}space": "preserve"})
    if is_contextual:
        el.set("label-is-contextual", "true")
    if subscript is not None:
        span = ET.SubElement(el, f"{{{P_NS}}}Span")
        span.text = name
        sub = ET.SubElement(span, f"{{{C_NS}}}Subscript")
        sub.text = str(subscript)
    else:
        el.text = name
    return el

def mk_real(val):
    el = ET.Element(f"{{{ML_NS}}}real")
    num = float(val)
    if num == int(num):
        el.text = str(int(num))
    else:
        el.text = f"{num:.4f}".rstrip('0').rstrip('.')
    return el

def mk_parens(child):
    el = ET.Element(f"{{{ML_NS}}}parens")
    el.append(child)
    return el

def mk_apply(op_name, *args):
    el = ET.Element(f"{{{ML_NS}}}apply")
    op = ET.SubElement(el, f"{{{ML_NS}}}{op_name}")
    for a in args:
        el.append(a)
    return el

def build_chain(terms):
    acc = None
    for sign, el in terms:
        if acc is None:
            if sign == '+':
                acc = el
            else:
                acc = mk_apply('minus', el)
        else:
            op = 'plus' if sign == '+' else 'minus'
            acc = mk_apply(op, acc, el)
    return acc if acc is not None else mk_real(0)

def render_physical_beam_png(spans, dist_loads, point_loads, applied_moments, sup_indices, width=900, height=280):
    im = Image.new("RGB", (width, height), color="#090e17")
    draw = ImageDraw.Draw(im)
    N = len(spans)
    coords = [0.0]
    for s in spans: coords.append(coords[-1] + s)
    Ltot = coords[-1]
    if Ltot <= 0: return im

    padX = 70
    beamY = 150
    beamLen = width - padX * 2
    scaleX = beamLen / Ltot

    def to_x(xv): return padX + xv * scaleX

    # Cortes formales
    for i in range(N):
        cxCut = to_x(coords[i] + spans[i] / 2.0)
        for y in range(40, beamY + 40, 8):
            draw.line([(cxCut, y), (cxCut, y + 4)], fill="#f59e0b", width=1)
        draw.text((cxCut - 22, 22), f"Corte {i+1}-{i+1}", fill="#fef08a")

    # Cargas distribuidas
    for i in range(N):
        qv = dist_loads[i] if i < len(dist_loads) else 0.0
        if qv > 0:
            x1 = to_x(coords[i])
            x2 = to_x(coords[i+1])
            topY = beamY - 35
            draw.rectangle([x1, topY, x2, beamY], fill="#1c1917", outline="#fbbf24", width=2)
            num_arr = max(2, int((x2 - x1) / 22))
            for a in range(num_arr + 1):
                ax = x1 + a * ((x2 - x1) / num_arr)
                draw.line([(ax, topY), (ax, beamY)], fill="#fbbf24", width=1)
                draw.polygon([(ax, beamY), (ax-3, beamY-6), (ax+3, beamY-6)], fill="#fbbf24")
            draw.text(((x1+x2)/2 - 30, topY - 14), f"q{i+1}={qv:.0f} kg/m", fill="#fef08a")

    # Viga
    draw.line([(to_x(0), beamY), (to_x(Ltot), beamY)], fill="#38bdf8", width=7)
    draw.line([(to_x(0), beamY), (to_x(Ltot), beamY)], fill="#ffffff", width=2)

    # Apoyos
    for i in range(N + 1):
        nx = to_x(coords[i])
        if i == sup_indices[0]:
            draw.polygon([(nx, beamY), (nx - 10, beamY + 18), (nx + 10, beamY + 18)], fill="#0284c7", outline="#38bdf8")
            draw.line([(nx - 12, beamY + 20), (nx + 12, beamY + 20)], fill="#64748b", width=2)
        elif i == sup_indices[1]:
            draw.polygon([(nx, beamY), (nx - 10, beamY + 15), (nx + 10, beamY + 15)], fill="#0284c7", outline="#38bdf8")
            draw.ellipse([nx - 4, beamY + 16, nx + 4, beamY + 24], fill="#38bdf8")
            draw.line([(nx - 12, beamY + 26), (nx + 12, beamY + 26)], fill="#64748b", width=2)

        draw.ellipse([nx - 4, beamY - 4, nx + 4, beamY + 4], fill="#0ea5e9", outline="#ffffff")
        draw.text((nx - 4, beamY + 36), chr(65 + i), fill="#94a3b8")

    # Cargas puntuales
    for i in range(N + 1):
        pval = point_loads[i] if i < len(point_loads) else 0.0
        if pval > 0:
            px = to_x(coords[i])
            draw.line([(px, beamY - 50), (px, beamY)], fill="#f43f5e", width=3)
            draw.polygon([(px, beamY), (px - 5, beamY - 10), (px + 5, beamY - 10)], fill="#f43f5e")
            draw.text((px - 25, beamY - 65), f"P{i}={pval:.0f} kg", fill="#fecdd3")

    # Momentos
    for i in range(N + 1):
        mval = applied_moments[i] if i < len(applied_moments) else 0.0
        if mval != 0:
            mx = to_x(coords[i])
            draw.arc([mx - 22, beamY - 22, mx + 22, beamY + 22], start=0, end=180, fill="#c084fc", width=2)
            draw.text((mx - 25, beamY - 36), f"M{i}={mval:.0f} kg·m", fill="#e9d5ff")

    # Cotas
    dimY = beamY + 62
    for i in range(N):
        x1 = to_x(coords[i])
        x2 = to_x(coords[i+1])
        draw.line([(x1, dimY), (x2, dimY)], fill="#64748b", width=1)
        draw.line([(x1, dimY - 4), (x1, dimY + 4)], fill="#64748b", width=1)
        draw.line([(x2, dimY - 4), (x2, dimY + 4)], fill="#64748b", width=1)
        draw.text(((x1 + x2)/2 - 12, dimY - 12), f"L{i+1}={spans[i]:.0f}m", fill="#cbd5e1")

    # Cota total
    totDimY = beamY + 84
    draw.line([(to_x(0), totDimY), (to_x(Ltot), totDimY)], fill="#0284c7", width=1)
    draw.line([(to_x(0), totDimY - 4), (to_x(0), totDimY + 4)], fill="#0284c7", width=1)
    draw.line([(to_x(Ltot), totDimY - 4), (to_x(Ltot), totDimY + 4)], fill="#0284c7", width=1)
    draw.text(((to_x(0) + to_x(Ltot))/2 - 35, totDimY - 12), f"Ltot = {Ltot:.2f} m", fill="#38bdf8")

    return im

def render_dcl_beam_png(spans, dist_loads, point_loads, applied_moments, sup_indices, Ay, By, width=900, height=280):
    im = Image.new("RGB", (width, height), color="#090e17")
    draw = ImageDraw.Draw(im)
    N = len(spans)
    coords = [0.0]
    for s in spans: coords.append(coords[-1] + s)
    Ltot = coords[-1]
    if Ltot <= 0: return im

    padX = 70
    beamY = 150
    beamLen = width - padX * 2
    scaleX = beamLen / Ltot

    def to_x(xv): return padX + xv * scaleX

    idxA, idxB = sup_indices
    xA = coords[idxA]
    xB = coords[idxB]

    # Badge DCL
    draw.rectangle([padX, 10, padX + 310, 32], fill="#1e293b", outline="#059669", width=1)
    draw.text((padX + 8, 14), "DCL - EQUILIBRIO ESTÁTICO (REACCIONES Y RESULTANTES)", fill="#34d399")

    # Viga
    draw.line([(to_x(0), beamY), (to_x(Ltot), beamY)], fill="#38bdf8", width=7)
    draw.line([(to_x(0), beamY), (to_x(Ltot), beamY)], fill="#ffffff", width=2)

    # Bloques y resultantes concentradas
    blocks = []
    cur_q = None
    for i in range(N):
        qv = dist_loads[i] if i < len(dist_loads) else 0.0
        if qv > 0:
            if cur_q == qv and len(blocks) > 0:
                blocks[-1]['len'] += spans[i]
                blocks[-1]['xe'] = coords[i+1]
            else:
                blocks.append({'q': qv, 'xs': coords[i], 'len': spans[i], 'xe': coords[i+1]})
                cur_q = qv
        else:
            cur_q = None

    for idx, b in enumerate(blocks, 1):
        x1 = to_x(b['xs'])
        x2 = to_x(b['xe'])
        topY = beamY - 30
        draw.rectangle([x1, topY, x2, beamY], fill="#172554", outline="#3b82f6", width=1)
        xcg = b['xs'] + b['len'] / 2.0
        cxg = to_x(xcg)
        R_val = b['q'] * b['len']
        distToA = xcg - xA

        draw.line([(cxg, beamY - 70), (cxg, beamY)], fill="#eab308", width=3)
        draw.polygon([(cxg, beamY), (cxg - 5, beamY - 10), (cxg + 5, beamY - 10)], fill="#eab308")
        draw.text((cxg - 35, beamY - 85), f"R{idx}={R_val:.0f} kg", fill="#fef08a")
        draw.text((cxg - 28, beamY - 50), f"d={abs(distToA):.1f}m", fill="#fde047")

    # Cargas puntuales
    for i in range(N + 1):
        pval = point_loads[i] if i < len(point_loads) else 0.0
        if pval > 0:
            px = to_x(coords[i])
            draw.line([(px, beamY - 55), (px, beamY)], fill="#f43f5e", width=3)
            draw.polygon([(px, beamY), (px - 5, beamY - 10), (px + 5, beamY - 10)], fill="#f43f5e")
            draw.text((px - 25, beamY - 70), f"P{i}={pval:.0f} kg", fill="#fecdd3")

    # Momentos
    for i in range(N + 1):
        mval = applied_moments[i] if i < len(applied_moments) else 0.0
        if mval != 0:
            mx = to_x(coords[i])
            draw.arc([mx - 22, beamY - 22, mx + 22, beamY + 22], start=0, end=180, fill="#c084fc", width=2)
            draw.text((mx - 25, beamY - 36), f"M{i}={mval:.0f} kg·m", fill="#e9d5ff")

    # REACCIONES (Vectores gruesos hacia arriba)
    cxA = to_x(xA)
    draw.line([(cxA, beamY + 65), (cxA, beamY)], fill="#10b981", width=4)
    draw.polygon([(cxA, beamY), (cxA - 6, beamY + 12), (cxA + 6, beamY + 12)], fill="#10b981")
    draw.text((cxA - 42, beamY + 70), f"Ay = {Ay:.1f} kg", fill="#6ee7b7")

    cxB = to_x(xB)
    draw.line([(cxB, beamY + 65), (cxB, beamY)], fill="#06b6d4", width=4)
    draw.polygon([(cxB, beamY), (cxB - 6, beamY + 12), (cxB + 6, beamY + 12)], fill="#06b6d4")
    draw.text((cxB - 42, beamY + 70), f"By = {By:.1f} kg", fill="#67e8f9")

    draw.ellipse([cxA - 4, beamY - 4, cxA + 4, beamY + 4], fill="#10b981", outline="#ffffff")
    draw.ellipse([cxB - 4, beamY - 4, cxB + 4, beamY + 4], fill="#06b6d4", outline="#ffffff")

    return im

def generate_ulianov_pro_mcdx(template_path, out_path, spans, dist_loads, point_loads, applied_moments, sup_indices):
    """
    Genera el archivo .mcdx PRO con DCL explícito sin tocar el template original.
    """
    N = len(spans)
    coords = [0.0]
    for s in spans: coords.append(coords[-1] + s)
    Ltot = coords[-1]

    idxA, idxB = sup_indices
    xA = coords[idxA]
    xB = coords[idxB]
    dAB = xB - xA

    blocks_q = []
    cur_q = None
    for i in range(N):
        qv = dist_loads[i] if i < len(dist_loads) else 0.0
        xe = coords[i+1]
        if qv != 0:
            if cur_q == qv and len(blocks_q) > 0:
                blocks_q[-1]['len'] += spans[i]
                blocks_q[-1]['xe'] = xe
            else:
                blocks_q.append({'q': qv, 'xs': coords[i], 'len': spans[i], 'xe': xe})
                cur_q = qv
        else:
            cur_q = None

    moment_terms_val = 0.0
    moment_eq_ast_terms = []

    for b in blocks_q:
        total_F = b['q'] * b['len']
        xcg = b['xs'] + b['len'] / 2.0
        dist_to_A = xcg - xA
        moment_terms_val += total_F * dist_to_A
        sign = '-' if dist_to_A >= 0 else '+'
        abs_d = abs(dist_to_A)
        term_ast = mk_apply('mult', mk_apply('mult', mk_real(-b['q'] if sign == '-' else b['q']), mk_parens(mk_real(b['len']))), mk_parens(mk_real(abs_d)))
        moment_eq_ast_terms.append(('+', term_ast))

    for i in range(N + 1):
        pval = point_loads[i] if i < len(point_loads) else 0.0
        if pval != 0:
            xp = coords[i]
            dist_to_A = xp - xA
            moment_terms_val += pval * dist_to_A
            sign = '-' if dist_to_A >= 0 else '+'
            abs_d = abs(dist_to_A)
            term_ast = mk_apply('mult', mk_real(-pval if sign == '-' else pval), mk_parens(mk_real(abs_d)))
            moment_eq_ast_terms.append(('+', term_ast))

    term_by_ast = mk_apply('mult', mk_id('B', 'y', is_contextual=False), mk_real(dAB))
    moment_eq_ast_terms.append(('+', term_by_ast))

    for i in range(N + 1):
        mval = applied_moments[i] if i < len(applied_moments) else 0.0
        if mval != 0:
            moment_terms_val += mval
            moment_eq_ast_terms.append(('+', mk_real(-mval)))

    By_val = moment_terms_val / dAB if dAB != 0 else 0.0
    total_down_loads = sum(b['q'] * b['len'] for b in blocks_q) + sum(point_loads[:N+1])
    Ay_val = total_down_loads - By_val

    # Sumatoria de fuerzas Fy
    fy_eq_ast_terms = []
    for b in blocks_q:
        fy_eq_ast_terms.append(('+', mk_apply('mult', mk_real(-b['q']), mk_parens(mk_real(b['len'])))))
    fy_eq_ast_terms.append(('+', mk_id('A', 'y', is_contextual=False)))
    for i in range(N + 1):
        pval = point_loads[i] if i < len(point_loads) else 0.0
        if pval != 0: fy_eq_ast_terms.append(('+', mk_real(-pval)))
        if i == idxB: fy_eq_ast_terms.append(('+', mk_parens(mk_id('B', 'y', is_contextual=True))))

    # Cortante V(x) y Momento M(x)
    terms_V = []
    terms_M = []
    for b in blocks_q:
        if b['xs'] == 0:
            terms_V.append(('+', mk_apply('mult', mk_real(-b['q']), mk_id('x'))))
            terms_M.append(('+', mk_apply('mult', mk_real(-b['q']), mk_parens(mk_apply('div', mk_apply('pow', mk_id('x'), mk_real(2)), mk_real(2))))))
        else:
            cond_xs = mk_parens(mk_apply('greaterOrEqual', mk_id('x'), mk_real(b['xs'])))
            dx_xs = mk_parens(mk_apply('minus', mk_id('x'), mk_real(b['xs'])))
            terms_V.append(('+', mk_apply('mult', mk_apply('mult', mk_real(-b['q']), dx_xs), cond_xs)))
            terms_M.append(('+', mk_apply('mult', mk_apply('mult', mk_real(-b['q']), mk_apply('div', mk_apply('pow', dx_xs, mk_real(2)), mk_real(2))), cond_xs)))

        if b['xe'] < Ltot:
            cond_xe = mk_parens(mk_apply('greaterOrEqual', mk_id('x'), mk_real(b['xe'])))
            dx_xe = mk_parens(mk_apply('minus', mk_id('x'), mk_real(b['xe'])))
            terms_V.append(('+', mk_apply('mult', mk_apply('mult', mk_real(b['q']), dx_xe), cond_xe)))
            terms_M.append(('+', mk_apply('mult', mk_apply('mult', mk_real(b['q']), mk_apply('div', mk_apply('pow', dx_xe, mk_real(2)), mk_real(2))), cond_xe)))

    cond_xA = mk_parens(mk_apply('greaterOrEqual', mk_id('x'), mk_real(xA)))
    terms_V.append(('+', mk_apply('mult', mk_id('A', 'y'), cond_xA)))
    dx_xA = mk_parens(mk_apply('minus', mk_id('x'), mk_real(xA)))
    terms_M.append(('+', mk_apply('mult', mk_apply('mult', mk_id('A', 'y'), dx_xA), cond_xA)))

    cond_xB = mk_parens(mk_apply('greaterOrEqual', mk_id('x'), mk_real(xB)))
    terms_V.append(('+', mk_apply('mult', mk_id('B', 'y'), cond_xB)))
    dx_xB = mk_parens(mk_apply('minus', mk_id('x'), mk_real(xB)))
    terms_M.append(('+', mk_apply('mult', mk_apply('mult', mk_id('B', 'y'), dx_xB), cond_xB)))

    for i in range(N + 1):
        pval = point_loads[i] if i < len(point_loads) else 0.0
        if pval != 0:
            xp = coords[i]
            cond_xp = mk_parens(mk_apply('greaterOrEqual', mk_id('x'), mk_real(xp)))
            terms_V.append(('-', mk_apply('mult', mk_real(pval), cond_xp)))
            dx_xp = mk_parens(mk_apply('minus', mk_id('x'), mk_real(xp)))
            terms_M.append(('-', mk_apply('mult', mk_apply('mult', mk_real(pval), dx_xp), cond_xp)))

    for i in range(N + 1):
        mval = applied_moments[i] if i < len(applied_moments) else 0.0
        if mval != 0:
            xm = coords[i]
            if abs(xm - Ltot) < 1e-9:
                terms_M.append(('+', mk_real(mval)))
            else:
                cond_xm = mk_parens(mk_apply('greaterOrEqual', mk_id('x'), mk_real(xm)))
                terms_M.append(('+', mk_apply('mult', mk_real(mval), cond_xm)))

    # Renderizar imágenes
    im_phys = render_physical_beam_png(spans, dist_loads, point_loads, applied_moments, sup_indices)
    b_phys = io.BytesIO()
    im_phys.save(b_phys, format="PNG")
    bytes_phys = b_phys.getvalue()

    im_dcl = render_dcl_beam_png(spans, dist_loads, point_loads, applied_moments, sup_indices, Ay_val, By_val)
    b_dcl = io.BytesIO()
    im_dcl.save(b_dcl, format="PNG")
    bytes_dcl = b_dcl.getvalue()

    # Inyectar en zip
    with zipfile.ZipFile(template_path, 'r') as zin, zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            content = zin.read(item.filename)
            if item.filename == "mathcad/media/Image2.png":
                zout.writestr(item, bytes_phys)
            elif item.filename == "mathcad/media/Image3.png":
                zout.writestr(item, bytes_dcl)
            elif item.filename == "mathcad/media/Image12.png":
                zout.writestr(item, bytes_phys)
            elif item.filename == "mathcad/worksheet.xml":
                root = ET.fromstring(content)
                # Region 7 (By)
                r7 = root.find(".//*[@region-id='7']")
                if r7 is not None:
                    p = r7.find(".//{http://schemas.mathsoft.com/math50}symEval/{http://schemas.mathsoft.com/math50}apply")
                    if p is not None and len(p) >= 2:
                        p.remove(p[1])
                        p.append(build_chain(moment_eq_ast_terms))
                    res = r7.find(".//{http://schemas.mathsoft.com/math50}symResult/{http://schemas.mathsoft.com/math50}real")
                    if res is not None: res.text = f"{By_val:.1f}"

                # Region 8 (Ay)
                r8 = root.find(".//*[@region-id='8']")
                if r8 is not None:
                    p = r8.find(".//{http://schemas.mathsoft.com/math50}symEval/{http://schemas.mathsoft.com/math50}apply")
                    if p is not None and len(p) >= 2:
                        p.remove(p[1])
                        p.append(build_chain(fy_eq_ast_terms))
                    res = r8.find(".//{http://schemas.mathsoft.com/math50}symResult/{http://schemas.mathsoft.com/math50}real")
                    if res is not None: res.text = f"{Ay_val:.1f}"

                # Region 13 (V)
                r13 = root.find(".//*[@region-id='13']")
                if r13 is not None:
                    defn = r13.find(".//{http://schemas.mathsoft.com/math50}define")
                    if defn is not None and len(defn) >= 2:
                        defn.remove(defn[1])
                        defn.append(build_chain(terms_V))

                # Region 14 (M)
                r14 = root.find(".//*[@region-id='14']")
                if r14 is not None:
                    defn = r14.find(".//{http://schemas.mathsoft.com/math50}define")
                    if defn is not None and len(defn) >= 2:
                        defn.remove(defn[1])
                        defn.append(build_chain(terms_M))

                # Region 16 (range)
                r16 = root.find(".//*[@region-id='16']")
                if r16 is not None:
                    rng = r16.find(".//{http://schemas.mathsoft.com/math50}range")
                    if rng is not None and len(rng) >= 2:
                        rng.remove(rng[1])
                        rng.append(mk_real(Ltot))

                # Regions 17 & 18 (plots)
                x_end_val = str(int(Ltot + 1.0))
                for rid in ['17', '18']:
                    rp = root.find(f".//*[@region-id='{rid}']")
                    if rp is not None:
                        xaxis = rp.find(".//{http://schemas.mathsoft.com/worksheet50}xAxis")
                        if xaxis is not None:
                            xaxis.set('start', '0')
                            xaxis.set('end', x_end_val)
                            aline = xaxis.find(".//{http://schemas.mathsoft.com/worksheet50}axisLine")
                            if aline is not None:
                                aline.set('positionticmark', str(int(Ltot / 3.0)))

                xml_out = ET.tostring(root, encoding='utf-8')
                zout.writestr(item, xml_out)
            else:
                zout.writestr(item, content)

    print(f"[PRO OK] Generado {out_path} con DCL explícito")

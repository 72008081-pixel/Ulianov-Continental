# -*- coding: utf-8 -*-
"""
MCDX DYNAMIC BUILDER - GENERADOR EXACTO DE N TRAMOS
Construye un archivo .mcdx limpio conteniendo ÚNICAMENTE los N tramos y cortes
especificados por el usuario, sin variables parásitas ni términos sobrantes.
Cumple con la sintaxis exacta del docente Alain Alanoca y el esquema XSD de Mathcad Prime 11.
"""
import os
import sys
import zipfile
import re
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')

WS_NS = 'http://schemas.mathsoft.com/worksheet50'
ML_NS = 'http://schemas.mathsoft.com/math50'
P_NS = 'http://schemas.microsoft.com/winfx/2006/xaml/presentation'
C_NS = 'clr-namespace:Ptc.Wpf;assembly=Ptc.Core'

ET.register_namespace('', WS_NS)
ET.register_namespace('ml', ML_NS)
ET.register_namespace('p', P_NS)
ET.register_namespace('c', C_NS)

def tag_ws(t): return f'{{{WS_NS}}}{t}'
def tag_ml(t): return f'{{{ML_NS}}}{t}'
def tag_p(t): return f'{{{P_NS}}}{t}'
def tag_c(t): return f'{{{C_NS}}}{t}'

def make_id(name, labels="VARIABLE", is_contextual=True, subscript=None):
    el = ET.Element(tag_ml('id'), {'labels': labels})
    if is_contextual:
        el.attrib['label-is-contextual'] = 'true'
    el.attrib['{http://www.w3.org/XML/1998/namespace}space'] = 'preserve'
    if subscript is not None:
        span = ET.SubElement(el, tag_p('Span'))
        span.text = name
        sub = ET.SubElement(span, tag_c('Subscript'))
        sub.text = str(subscript)
    else:
        el.text = name
    return el

def make_real(val):
    el = ET.Element(tag_ml('real'))
    el.text = f"{val:g}"
    return el

def make_parens(child):
    el = ET.Element(tag_ml('parens'))
    el.append(child)
    return el

def make_apply(op_name, *args):
    el = ET.Element(tag_ml('apply'))
    ET.SubElement(el, tag_ml(op_name))
    for a in args:
        el.append(a)
    return el

def build_additive_chain(terms):
    acc = None
    for sign, el in terms:
        if acc is None:
            if sign == '+': acc = el
            else:
                acc = ET.Element(tag_ml('apply'))
                ET.SubElement(acc, tag_ml('minus'))
                acc.append(el)
        else:
            new_acc = ET.Element(tag_ml('apply'))
            op = 'plus' if sign == '+' else 'minus'
            ET.SubElement(new_acc, tag_ml(op))
            new_acc.append(acc)
            new_acc.append(el)
            acc = new_acc
    return acc if acc is not None else make_real(0)

def generate_custom_beam_mcdx(base_template_path, out_mcdx_path, spans, dist_loads=None, point_loads=None, applied_moments=None, sup_indices=(0, None)):
    """
    Genera un archivo .mcdx con exactamente N tramos:
    - spans: lista de longitudes [L1, L2, ..., LN] (N entre 1 y 10)
    - dist_loads: lista de cargas [q1, q2, ..., qN]
    - point_loads: lista de cargas puntuales en nudos [P0, P1, ..., PN]
    - applied_moments: lista de momentos en nudos [M0, M1, ..., MN]
    - sup_indices: tupla (indice_apoyo_A, indice_apoyo_B). Por defecto (0, N).
    """
    N = len(spans)
    assert 1 <= N <= 10, "El número de tramos debe estar entre 1 y 10"
    
    if dist_loads is None: dist_loads = [0.0] * N
    if point_loads is None: point_loads = [0.0] * (N + 1)
    if applied_moments is None: applied_moments = [0.0] * (N + 1)
    
    idx_A = sup_indices[0] if sup_indices[0] is not None else 0
    idx_B = sup_indices[1] if sup_indices[1] is not None else N
    
    files = {}
    with zipfile.ZipFile(base_template_path, 'r') as z:
        for name in z.namelist():
            files[name] = z.read(name)

    # Limpiar Typography.Variants de todos los xml
    for name in list(files.keys()):
        if name.endswith('.xml'):
            txt = files[name].decode('utf-8', errors='ignore')
            txt = re.sub(r'\s*Typography\.[a-zA-Z0-9]+="[^"]*"', '', txt)
            files[name] = txt.encode('utf-8')

    root = ET.fromstring(files['mathcad/worksheet.xml'])
    regs = root[0]

    # Eliminar regiones parásitas
    for r in list(regs):
        rid = r.attrib.get('region-id')
        if rid in ['0', '1', '57', '60', '63', '65']:
            regs.remove(r)

    # 1. Modificar valores de longitudes L1..LN y eliminar LN+1..L10
    for i in range(10):
        rid = str(2 + i)
        r = regs.find(f".//*[@region-id='{rid}']")
        if r is not None:
            if i < N:
                real_el = r.find(f".//{{{ML_NS}}}real")
                if real_el is not None: real_el.text = f"{spans[i]:g}"
            else:
                regs.remove(r)

    # 2. Modificar x0..xN y eliminar xN+1..x10
    # Regiones 12..22 (x0 es 12, x1 es 13, ..., x10 es 22)
    for i in range(11):
        rid = str(12 + i)
        r = regs.find(f".//*[@region-id='{rid}']")
        if r is not None:
            if i > N:
                regs.remove(r)

    # 3. Modificar Ltot (Region 23): vincular a x_N
    r23 = regs.find(".//*[@region-id='23']")
    if r23 is not None:
        def_el = r23.find(f".//{{{ML_NS}}}define")
        if def_el is not None and len(def_el) >= 2:
            def_el[1] = make_id("x", subscript=N)

    # 4. Modificar cargas distribuidas q1..qN y eliminar qN+1..q10
    for i in range(10):
        rid = str(25 + i)
        r = regs.find(f".//*[@region-id='{rid}']")
        if r is not None:
            if i < N:
                real_el = r.find(f".//{{{ML_NS}}}real")
                if real_el is not None: real_el.text = f"{dist_loads[i]:g}"
            else:
                regs.remove(r)

    # 5. Modificar cargas puntuales P0..PN y eliminar PN+1..P10
    for i in range(11):
        rid = str(35 + i)
        r = regs.find(f".//*[@region-id='{rid}']")
        if r is not None:
            if i <= N:
                real_el = r.find(f".//{{{ML_NS}}}real")
                if real_el is not None: real_el.text = f"{point_loads[i]:g}"
            else:
                regs.remove(r)

    # 6. Modificar momentos M0..MN y eliminar MN+1..M10
    for i in range(11):
        rid = str(46 + i)
        r = regs.find(f".//*[@region-id='{rid}']")
        if r is not None:
            if i <= N:
                real_el = r.find(f".//{{{ML_NS}}}real")
                if real_el is not None: real_el.text = f"{applied_moments[i]:g}"
            else:
                regs.remove(r)

    # 7. Reacciones estáticas aproximadas (para renderizado inicial en Mathcad)
    # Cálculo de estática de vigas
    # Sumatoria de cargas verticales
    tot_q = sum(dist_loads[i] * spans[i] for i in range(N))
    tot_p = sum(point_loads[i] for i in range(N + 1))
    # Coordenadas acumuladas
    x_coords = [0.0]
    for s in spans: x_coords.append(x_coords[-1] + s)
    Ltot_val = x_coords[-1]
    
    # Momentos respecto a apoyo A (xA)
    xA = x_coords[idx_A]
    xB = x_coords[idx_B]
    L_span_AB = xB - xA if xB != xA else Ltot_val
    
    moment_about_A = 0.0
    for i in range(N):
        q = dist_loads[i]
        if q != 0:
            L_k = spans[i]
            cg = x_coords[i] + L_k / 2.0
            moment_about_A += (q * L_k) * (cg - xA)
    for i in range(N + 1):
        p = point_loads[i]
        if p != 0:
            moment_about_A += p * (x_coords[i] - xA)
    for i in range(N + 1):
        m = applied_moments[i]
        if m != 0:
            moment_about_A += m

    VD_val = moment_about_A / L_span_AB if L_span_AB != 0 else 0.0
    VA_val = (tot_q + tot_p) - VD_val

    # Actualizar VA (r59) y VD (r58)
    r59 = regs.find(".//*[@region-id='59']")
    if r59 is not None:
        real_el = r59.find(f".//{{{ML_NS}}}real")
        if real_el is not None: real_el.text = f"{VA_val:g}"
    r58 = regs.find(".//*[@region-id='58']")
    if r58 is not None:
        real_el = r58.find(f".//{{{ML_NS}}}real")
        if real_el is not None: real_el.text = f"{VD_val:g}"

    # 8. Construir términos de V(x) y M(x) ÚNICAMENTE para los N tramos y apoyos
    terms_v = []
    terms_m = []

    # Reacción A
    if idx_A == 0:
        terms_v.append(('+', make_id("V", subscript="A")))
        terms_m.append(('+', make_apply('mult', make_id("V", subscript="A"), make_id("x"))))
    else:
        cond_va = make_parens(make_apply('greaterOrEqual', make_id("x"), make_id("x", subscript=idx_A)))
        arm_va = make_parens(make_apply('minus', make_id("x"), make_id("x", subscript=idx_A)))
        terms_v.append(('+', make_apply('mult', cond_va, make_id("V", subscript="A"))))
        terms_m.append(('+', make_apply('mult', make_apply('mult', cond_va, make_id("V", subscript="A")), arm_va)))

    # Reacción B (VD)
    cond_vb = make_parens(make_apply('greaterOrEqual', make_id("x"), make_id("x", subscript=idx_B)))
    arm_vb = make_parens(make_apply('minus', make_id("x"), make_id("x", subscript=idx_B)))
    terms_v.append(('+', make_apply('mult', cond_vb, make_id("V", subscript="D"))))
    terms_m.append(('+', make_apply('mult', make_apply('mult', cond_vb, make_id("V", subscript="D")), arm_vb)))

    # Tramos 1..N
    for k in range(1, N + 1):
        # Condición dentro del tramo: (x_{k-1} < x < x_k)
        cond_in = make_parens(make_apply('lessThan',
            make_apply('lessThan', make_id("x", subscript=k-1), make_id("x")),
            make_id("x", subscript=k)))
        arm_diff = make_parens(make_apply('minus', make_id("x"), make_id("x", subscript=k-1)))
        load_in = make_parens(make_apply('mult', make_id("q", subscript=k), arm_diff))
        arm_in = make_parens(make_apply('div', arm_diff, make_real(2)))

        # Condición tramo superado: (x >= x_k)
        cond_sup = make_parens(make_apply('greaterOrEqual', make_id("x"), make_id("x", subscript=k)))
        load_sup = make_parens(make_apply('mult', make_id("q", subscript=k), make_id("L", subscript=k)))
        cg_pos = make_parens(make_apply('plus', make_id("x", subscript=k-1), make_apply('div', make_id("L", subscript=k), make_real(2))))
        arm_cg = make_parens(make_apply('minus', make_id("x"), cg_pos))

        # En V(x): Intervalo primero * Carga
        terms_v.append(('-', make_apply('mult', cond_in, load_in)))
        terms_v.append(('-', make_apply('mult', cond_sup, load_sup)))

        # En M(x): Intervalo primero * Carga * Brazo explícito
        terms_m.append(('-', make_apply('mult', make_apply('mult', cond_in, load_in), arm_in)))
        terms_m.append(('-', make_apply('mult', make_apply('mult', cond_sup, load_sup), arm_cg)))

        # Carga puntual P_k (solo si P_k != 0)
        if point_loads[k] != 0:
            cond_pk = make_parens(make_apply('greaterOrEqual', make_id("x"), make_id("x", subscript=k)))
            terms_v.append(('-', make_apply('mult', cond_pk, make_id("P", subscript=k))))
            terms_m.append(('-', make_apply('mult', make_apply('mult', cond_pk, make_id("P", subscript=k)),
                                            make_parens(make_apply('minus', make_id("x"), make_id("x", subscript=k))))))

        # Momento concentrado M_k (solo si M_k != 0)
        if applied_moments[k] != 0:
            cond_mk = make_parens(make_apply('greaterOrEqual', make_id("x"), make_id("x", subscript=k)))
            terms_m.append(('+', make_apply('mult', cond_mk, make_id("M", subscript=k))))

    # P0 y M0 en x=0 solo si existen y son no nulos
    if point_loads[0] != 0:
        cond_p0 = make_parens(make_apply('greaterOrEqual', make_id("x"), make_id("x", subscript=0)))
        terms_v.append(('-', make_apply('mult', cond_p0, make_id("P", subscript=0))))
        terms_m.append(('-', make_apply('mult', make_apply('mult', cond_p0, make_id("P", subscript=0)), make_id("x"))))
    if applied_moments[0] != 0:
        cond_m0 = make_parens(make_apply('greaterOrEqual', make_id("x"), make_id("x", subscript=0)))
        terms_m.append(('+', make_apply('mult', cond_m0, make_id("M", subscript=0))))

    # 9. Asignar funciones y Rango x
    r_x, r_v, r_m, p_v, p_m = None, None, None, None, None
    for r in regs:
        for f in r.findall(f'.//{{{ML_NS}}}function'):
            fid = f.find(f'{{{ML_NS}}}id')
            if fid is not None and fid.text in ['Q', 'V']: r_v = r
            elif fid is not None and fid.text == 'M': r_m = r
        for d in r.findall(f'.//{{{ML_NS}}}define'):
            did = d.find(f'{{{ML_NS}}}id')
            drange = d.find(f'{{{ML_NS}}}range')
            if did is not None and did.text == 'x' and drange is not None: r_x = r
        p = r.find(f'.//{{{WS_NS}}}plot')
        if p is not None:
            y_eqs = [e.text for e in p.findall(f'.//{{{WS_NS}}}yAxis//{{{ML_NS}}}id')]
            if 'Q' in y_eqs or 'V' in y_eqs: p_v = r
            elif 'M' in y_eqs: p_m = r

    if r_x is not None:
        r_x.attrib['top'] = '690.0'
        r_x.attrib['left'] = '37.8'

    if r_v is not None:
        r_v.attrib['top'] = '730.0'
        r_v.attrib['left'] = '37.8'
        def_el = r_v.find(f'.//{{{ML_NS}}}define')
        if def_el is not None:
            fn_el = def_el.find(f'{{{ML_NS}}}function')
            if fn_el is not None:
                fn_id = fn_el.find(f'{{{ML_NS}}}id')
                if fn_id is not None: fn_id.text = 'V'
            def_el[1] = build_additive_chain(terms_v)

    if r_m is not None:
        r_m.attrib['top'] = '785.0'
        r_m.attrib['left'] = '37.8'
        def_el = r_m.find(f'.//{{{ML_NS}}}define')
        if def_el is not None:
            def_el[1] = build_additive_chain(terms_m)

    # 10. Formatear Gráficos con secuencia XSD estricta
    def fix_axis(ax, max_val):
        for nf in list(ax.findall(f'{{{WS_NS}}}numberFormat')): ax.remove(nf)
        nf = ET.Element(tag_ws('numberFormat'))
        ET.SubElement(nf, tag_ws('decimal'), {'precision': '3', 'show-trailing-zeros': 'false', 'radix': 'dec', 'imaginary-value': 'i'})
        idx = None
        for i, child in enumerate(ax):
            if child.tag.endswith('plotEquations'):
                idx = i
                break
        if idx is not None: ax.insert(idx, nf)
        else: ax.append(nf)
        
        aline = ax.find(f'.//{{{WS_NS}}}axisLine')
        if aline is not None:
            aline.attrib['positionticmark'] = str(int(round(max_val)))

    if p_v is not None:
        p_v.attrib['top'] = '860.0'
        p_v.attrib['left'] = '37.8'
        p_v.attrib['width'] = '680'
        p_v.attrib['height'] = '230'
        plot = p_v.find(tag_ws('plot'))
        if plot is not None:
            for peq in plot.findall(f'.//{{{WS_NS}}}yAxis//{{{WS_NS}}}plotEquation'):
                for el in peq.findall(f'.//{{{ML_NS}}}id'):
                    if el.text == 'Q': el.text = 'V'
            xax = plot.find(f'.//{{{WS_NS}}}xAxis')
            if xax is not None: fix_axis(xax, Ltot_val)
            yax = plot.find(f'.//{{{WS_NS}}}yAxis')
            if yax is not None: fix_axis(yax, 0)

    if p_m is not None:
        p_m.attrib['top'] = '1130.0'
        p_m.attrib['left'] = '37.8'
        p_m.attrib['width'] = '680'
        p_m.attrib['height'] = '230'
        plot = p_m.find(tag_ws('plot'))
        if plot is not None:
            xax = plot.find(f'.//{{{WS_NS}}}xAxis')
            if xax is not None: fix_axis(xax, Ltot_val)
            yax = plot.find(f'.//{{{WS_NS}}}yAxis')
            if yax is not None: fix_axis(yax, 0)

    # Sanitizar marcas de tics
    for aline in root.iter(tag_ws('axisLine')):
        ptm = aline.attrib.get('positionticmark')
        if ptm is not None:
            try:
                val = float(ptm)
                aline.attrib['positionticmark'] = str(int(round(val)))
            except: pass

    files['mathcad/worksheet.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)

    with zipfile.ZipFile(out_mcdx_path, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for name, content in files.items():
            z.writestr(name, content)
            
    return True

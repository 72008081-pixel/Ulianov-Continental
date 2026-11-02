# -*- coding: utf-8 -*-
"""
MCDX ULIANOV BUILDER - GENERADOR DE PLANTILLA FORMATO ÚNICO
Basado en: 'EJERCICIO ULIANOV SABATH CUBA V - FORMATO UNICO.mcdx'
Genera documentos .mcdx con:
- Título en amarillo: EJERCICIO 01_ ULIANOV SABATH CUBA VALENCIA
- 01. DIAGRAMA DE CUERPO LIBRE DCL (con imagen del canvas/esquema)
- 02. CALCULO DE REACCIONES (sumatoria de momentos respecto a A con solve, By y sumatoria de Fy con solve, Ay)
- 03. GRAFICAS DE CORTANTE Y MOMENTO (funciones Macaulay puras V(x) y M(x), intervalo x, gráficos 2D)
Compatible al 100% con PTC Mathcad Prime 11 sin advertencias de esquema ni incompatibilidades.
"""
import os, sys, zipfile, math, re
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

def mk_id(name, subscript=None, labels="VARIABLE", is_contextual=True):
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

def mk_real(val):
    el = ET.Element(tag_ml('real'))
    if isinstance(val, float):
        # Evitar notación científica si es posible, formatear limpio
        if val == int(val):
            el.text = str(int(val))
        else:
            el.text = f"{val:.4f}".rstrip('0').rstrip('.')
    else:
        el.text = str(val)
    return el

def mk_parens(child):
    el = ET.Element(tag_ml('parens'))
    el.append(child)
    return el

def mk_apply(op_name, *args):
    el = ET.Element(tag_ml('apply'))
    ET.SubElement(el, tag_ml(op_name))
    for a in args:
        el.append(a)
    return el

def build_chain(terms):
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
    return acc if acc is not None else mk_real(0)

def generate_ulianov_mcdx(master_template_path, out_mcdx_path, spans, dist_loads, point_loads, applied_moments, sup_indices=(1, 4), canvas_png_bytes=None, exercise_title="EJERCICIO 01_ ULIANOV SABATH CUBA VALENCIA"):
    """
    Construye un archivo .mcdx con el formato exacto del estudiante Ulianov Sabath Cuba Valencia:
    - spans: lista de longitudes [L1, ..., LN]
    - dist_loads: lista de cargas [q1, ..., qN] en kg/m
    - point_loads: lista de cargas [P0, ..., PN] en kg
    - applied_moments: lista de momentos [M0, ..., MN] en kg.m
    - sup_indices: (nodo_apoyo_A, nodo_apoyo_B)
    - canvas_png_bytes: bytes opcionales del canvas generado para actualizar imágenes
    """
    N = len(spans)
    x_nodes = [0.0]
    for L in spans:
        x_nodes.append(x_nodes[-1] + L)
    Ltot = x_nodes[-1]

    idx_A, idx_B = sup_indices
    xA = x_nodes[idx_A]
    xB = x_nodes[idx_B]
    dAB = xB - xA

    # 1. Resolver estática de la viga (Sum M_A = 0 y Sum Fy = 0)
    # Cargas distribuidas consolidadas
    # Agrupar tramos continuos con la misma carga para una formulación más concisa
    blocks_q = []
    curr_q = None
    start_x = 0.0
    for i in range(N):
        q_val = dist_loads[i] if i < len(dist_loads) else 0.0
        x_start_i = x_nodes[i]
        x_end_i = x_nodes[i+1]
        if q_val != 0:
            if curr_q == q_val and abs(start_x + sum(b[2] for b in blocks_q if b[0] == curr_q) - x_start_i) < 1e-9:
                # Extender bloque actual
                last = blocks_q[-1]
                blocks_q[-1] = (last[0], last[1], last[2] + spans[i], x_end_i)
            else:
                blocks_q.append((q_val, x_start_i, spans[i], x_end_i))
                curr_q = q_val
        else:
            curr_q = None

    # Cálculo analítico de reacciones
    # Sum M_A = 0:
    # Momentos de cargas respecto a A
    moment_terms_val = 0.0
    moment_eq_ast_terms = []

    # Bloques de carga distribuida
    for q_val, xs, length, xe in blocks_q:
        total_f = q_val * length
        xcg = xs + length / 2.0
        dist_to_A = xcg - xA
        
        # En la ecuación de momentos:
        # Si xcg > xA, fuerza hacia abajo produce momento horario (-)
        # Si xcg < xA, fuerza hacia abajo produce momento antihorario (+)
        moment_val = total_f * dist_to_A
        moment_terms_val += moment_val
        
        # AST de Mathcad: - q * (L) * (dist) o + q * (L) * (dist)
        # En el ejemplo del usuario: -700 * (7) * (0.5)
        sign = '-' if dist_to_A >= 0 else '+'
        abs_d = abs(dist_to_A)
        term_ast = mk_apply('mult', mk_apply('mult', mk_real(-q_val if sign == '-' else q_val), mk_parens(mk_real(length))), mk_parens(mk_real(abs_d)))
        moment_eq_ast_terms.append(('+', term_ast))

    # Cargas puntuales
    for i in range(len(point_loads)):
        pval = point_loads[i]
        if pval != 0:
            xp = x_nodes[i]
            dist_to_A = xp - xA
            moment_terms_val += pval * dist_to_A
            sign = '-' if dist_to_A >= 0 else '+'
            abs_d = abs(dist_to_A)
            # - P * (dist)
            term_ast = mk_apply('mult', mk_real(-pval if sign == '-' else pval), mk_parens(mk_real(abs_d)))
            moment_eq_ast_terms.append(('+', term_ast))

    # Término de By en la ecuación de momentos: + By * dAB
    term_By_ast = mk_apply('mult', mk_id('B', 'y', labels="VARIABLE", is_contextual=False), mk_real(dAB))
    moment_eq_ast_terms.append(('+', term_By_ast))

    # Momentos concentrados externos
    for i in range(len(applied_moments)):
        mval = applied_moments[i]
        if mval != 0:
            # Momento horario es - en la ecuación de equilibrio
            moment_terms_val += mval
            term_ast = mk_real(-mval)
            moment_eq_ast_terms.append(('+', term_ast))

    # By * dAB = moment_terms_val => By = moment_terms_val / dAB
    By_val = moment_terms_val / dAB if dAB != 0 else 0.0

    # Sum Fy = 0 => Ay + By - Total_Loads = 0 => Ay = Total_Loads - By
    total_down_loads = sum(b[0] * b[2] for b in blocks_q) + sum(point_loads)
    Ay_val = total_down_loads - By_val

    # AST para ecuación de Fy:
    # En el ejemplo del usuario: -700 * (7) + Ay - 6000 + (By) - 3000 = 0
    fy_eq_ast_terms = []
    for q_val, xs, length, xe in blocks_q:
        term_q = mk_apply('mult', mk_real(-q_val), mk_parens(mk_real(length)))
        fy_eq_ast_terms.append(('+', term_q))
    
    fy_eq_ast_terms.append(('+', mk_id('A', 'y', labels="VARIABLE", is_contextual=False)))

    for i in range(len(point_loads)):
        pval = point_loads[i]
        if pval != 0:
            fy_eq_ast_terms.append(('+', mk_real(-pval)))
        if i == idx_B:
            # Añadir By en su posición
            fy_eq_ast_terms.append(('+', mk_parens(mk_id('B', 'y', labels="VARIABLE", is_contextual=True))))

    # 2. Construir términos Macaulay para V(x) y M(x)
    # V(x) y M(x)
    terms_v = []
    terms_m = []

    # Cargas distribuidas (Macaulay)
    for q_val, xs, length, xe in blocks_q:
        if xs == 0:
            # -q * x
            terms_v.append(('+', mk_apply('mult', mk_real(-q_val), mk_id('x'))))
            # -q * (x^2 / 2)
            terms_m.append(('+', mk_apply('mult', mk_real(-q_val), mk_parens(mk_apply('div', mk_apply('pow', mk_id('x'), mk_real(2)), mk_real(2))))))
        else:
            # -q * (x - xs) * (x >= xs)
            cond_xs = mk_parens(mk_apply('greaterOrEqual', mk_id('x'), mk_real(xs)))
            dx_xs = mk_parens(mk_apply('minus', mk_id('x'), mk_real(xs)))
            terms_v.append(('+', mk_apply('mult', mk_apply('mult', mk_real(-q_val), dx_xs), cond_xs)))
            terms_m.append(('+', mk_apply('mult', mk_apply('mult', mk_real(-q_val), mk_apply('div', mk_apply('pow', dx_xs, mk_real(2)), mk_real(2))), cond_xs)))

        if xe < Ltot:
            # +q * (x - xe) * (x >= xe)
            cond_xe = mk_parens(mk_apply('greaterOrEqual', mk_id('x'), mk_real(xe)))
            dx_xe = mk_parens(mk_apply('minus', mk_id('x'), mk_real(xe)))
            terms_v.append(('+', mk_apply('mult', mk_apply('mult', mk_real(q_val), dx_xe), cond_xe)))
            # +q * ((x - xe)^2 / 2) * (x >= xe)
            terms_m.append(('+', mk_apply('mult', mk_apply('mult', mk_real(q_val), mk_apply('div', mk_apply('pow', dx_xe, mk_real(2)), mk_real(2))), cond_xe)))

    # Reacción Ay en xA
    cond_xA = mk_parens(mk_apply('greaterOrEqual', mk_id('x'), mk_real(xA)))
    terms_v.append(('+', mk_apply('mult', mk_id('A', 'y'), cond_xA)))
    dx_xA = mk_parens(mk_apply('minus', mk_id('x'), mk_real(xA)))
    terms_m.append(('+', mk_apply('mult', mk_apply('mult', mk_id('A', 'y'), dx_xA), cond_xA)))

    # Reacción By en xB
    cond_xB = mk_parens(mk_apply('greaterOrEqual', mk_id('x'), mk_real(xB)))
    terms_v.append(('+', mk_apply('mult', mk_id('B', 'y'), cond_xB)))
    dx_xB = mk_parens(mk_apply('minus', mk_id('x'), mk_real(xB)))
    terms_m.append(('+', mk_apply('mult', mk_apply('mult', mk_id('B', 'y'), dx_xB), cond_xB)))

    # Cargas puntuales
    for i in range(len(point_loads)):
        pval = point_loads[i]
        if pval != 0:
            xp = x_nodes[i]
            cond_xp = mk_parens(mk_apply('greaterOrEqual', mk_id('x'), mk_real(xp)))
            terms_v.append(('-', mk_apply('mult', mk_real(pval), cond_xp)))
            dx_xp = mk_parens(mk_apply('minus', mk_id('x'), mk_real(xp)))
            terms_m.append(('-', mk_apply('mult', mk_apply('mult', mk_real(pval), dx_xp), cond_xp)))

    # Momentos concentrados
    for i in range(len(applied_moments)):
        mval = applied_moments[i]
        if mval != 0:
            xm = x_nodes[i]
            if abs(xm - Ltot) < 1e-9:
                # En el extremo derecho, en la ecuación del usuario se suma directamente
                terms_m.append(('+', mk_real(mval)))
            else:
                cond_xm = mk_parens(mk_apply('greaterOrEqual', mk_id('x'), mk_real(xm)))
                terms_m.append(('+', mk_apply('mult', mk_real(mval), cond_xm)))

    # 3. Leer la plantilla maestra sin modificarla
    files = {}
    with zipfile.ZipFile(master_template_path, 'r') as z:
        for name in z.namelist():
            files[name] = z.read(name)

    # Actualizar XML de worksheet
    ws_root = ET.fromstring(files['mathcad/worksheet.xml'].decode('utf-8'))
    
    # 4. Modificar Region 7: By := sum M_a = 0 solve, By -> By_val
    r7 = ws_root.find(f".//{{{WS_NS}}}region[@region-id='7']")
    if r7 is not None:
        eq_el = r7.find(f".//{{{ML_NS}}}equal")
        if eq_el is not None:
            # Reemplazar el LHS de equal con build_chain(moment_eq_ast_terms)
            parent = r7.find(f".//{{{ML_NS}}}apply")
            parent.remove(parent[1])
            parent.insert(1, build_chain(moment_eq_ast_terms))
        # Actualizar symResult
        sym_res = r7.find(f".//{{{ML_NS}}}symResult//{{{ML_NS}}}real")
        if sym_res is not None:
            sym_res.text = f"{By_val:.1f}"

    # 5. Modificar Region 8: Ay := sum Fy = 0 solve, Ay -> Ay_val
    r8 = ws_root.find(f".//{{{WS_NS}}}region[@region-id='8']")
    if r8 is not None:
        parent = r8.find(f".//{{{ML_NS}}}apply")
        if parent is not None and len(parent) >= 2:
            parent.remove(parent[1])
            parent.insert(1, build_chain(fy_eq_ast_terms))
        sym_res = r8.find(f".//{{{ML_NS}}}symResult//{{{ML_NS}}}real")
        if sym_res is not None:
            sym_res.text = f"{Ay_val:.1f}"

    # 6. Modificar Region 13: V(x) := ...
    r13 = ws_root.find(f".//{{{WS_NS}}}region[@region-id='13']")
    if r13 is not None:
        def_el = r13.find(f".//{{{ML_NS}}}define")
        if def_el is not None and len(def_el) >= 2:
            def_el[1] = build_chain(terms_v)

    # 7. Modificar Region 14: M(x) := ...
    r14 = ws_root.find(f".//{{{WS_NS}}}region[@region-id='14']")
    if r14 is not None:
        def_el = r14.find(f".//{{{ML_NS}}}define")
        if def_el is not None and len(def_el) >= 2:
            def_el[1] = build_chain(terms_m)

    # 8. Modificar Region 16: x := 0, 0.01 .. Ltot
    r16 = ws_root.find(f".//{{{WS_NS}}}region[@region-id='16']")
    if r16 is not None:
        range_el = r16.find(f".//{{{ML_NS}}}range")
        if range_el is not None and len(range_el) >= 2:
            range_el[1] = mk_real(Ltot)

    # 9. Modificar ejes X de los gráficos 2D (Region 17 y 18)
    x_end_val = math.ceil(Ltot + 1.0)
    for rid in ['17', '18']:
        r_plot = ws_root.find(f".//{{{WS_NS}}}region[@region-id='{rid}']")
        if r_plot is not None:
            x_axis = r_plot.find(f".//{{{WS_NS}}}xAxis")
            if x_axis is not None:
                x_axis.attrib['start'] = '0'
                x_axis.attrib['end'] = str(x_end_val)
                line = x_axis.find(f".//{{{WS_NS}}}axisLine")
                if line is not None:
                    line.attrib['positionticmark'] = str(int(math.ceil(Ltot / 3.0)))

    # Guardar worksheet.xml modificado
    files['mathcad/worksheet.xml'] = ET.tostring(ws_root, encoding='utf-8')

    # 10. Actualizar imágenes con el canvas PNG si fue provisto
    if canvas_png_bytes is not None:
        for img_name in ['mathcad/media/Image2.png', 'mathcad/media/Image3.png', 'mathcad/media/Image12.png']:
            if img_name in files:
                files[img_name] = canvas_png_bytes

    # 11. Escribir archivo final .mcdx
    os.makedirs(os.path.dirname(out_mcdx_path), exist_ok=True)
    with zipfile.ZipFile(out_mcdx_path, 'w', compression=zipfile.ZIP_DEFLATED) as z_out:
        for name, data in files.items():
            z_out.writestr(name, data)

    print(f"[OK] Archivo generado: {out_mcdx_path} ({os.path.getsize(out_mcdx_path)} bytes)")
    return out_mcdx_path

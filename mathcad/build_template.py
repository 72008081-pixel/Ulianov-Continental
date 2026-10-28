import os
import sys
import zipfile
import io
import shutil
import xml.etree.ElementTree as ET

# Base directories
WORK_DIR = r"D:\ANTIGRAVITY CUBA V\01. Análisis Estructural II\01. PLANTILLAS FINALES EXAMENES\03. MATHCAD"
SRC_MCDX = os.path.join(WORK_DIR, "EJERCICIO-01.mcdx")
OUT_MCDX = os.path.join(WORK_DIR, "PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx")

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

def make_id(name, labels="VARIABLE", is_contextual=False, subscript=None):
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
    el.text = str(val)
    return el

def make_scaled(val, unit_str):
    apply_el = ET.Element(tag_ml('apply'))
    ET.SubElement(apply_el, tag_ml('scale'))
    apply_el.append(make_real(val))
    if '/' in unit_str:
        num, den = unit_str.split('/')
        div_el = ET.SubElement(apply_el, tag_ml('apply'))
        ET.SubElement(div_el, tag_ml('div'))
        div_el.append(make_id(num, labels='UNIT', is_contextual=True))
        div_el.append(make_id(den, labels='UNIT', is_contextual=True))
    elif '*' in unit_str:
        p1, p2 = unit_str.split('*')
        mult_el = ET.SubElement(apply_el, tag_ml('apply'))
        ET.SubElement(mult_el, tag_ml('mult'))
        mult_el.append(make_id(p1, labels='UNIT', is_contextual=True))
        mult_el.append(make_id(p2, labels='UNIT', is_contextual=True))
    else:
        apply_el.append(make_id(unit_str, labels='UNIT', is_contextual=True))
    return apply_el

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

def make_define(target, expr):
    el = ET.Element(tag_ml('define'))
    el.append(target)
    el.append(expr)
    return el

def make_region_math(reg_id, top, left, math_child):
    reg = ET.Element(tag_ws('region'), {
        'region-id': str(reg_id),
        'top': f'{top:.1f}',
        'left': f'{left:.1f}'
    })
    m = ET.SubElement(reg, tag_ws('math'))
    m.append(math_child)
    return reg

def make_xaml_package(text, font_size=16, is_bold=True, bg_color='#FFFFF200'):
    bold_str = 'FontWeight="Bold"' if is_bold else ''
    xaml = f'<Section xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xml:space="preserve" TextAlignment="Left" LineHeight="Auto" IsHyphenationEnabled="False" xml:lang="es-pe" FlowDirection="LeftToRight" FontFamily="Segoe UI" FontSize="{font_size}" {bold_str} Foreground="#FF000000"><Paragraph><Run Background="{bg_color}">{text}</Run></Paragraph></Section>'
    
    rels = '<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" />'
    ct = '<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" /><Default Extension="xaml" ContentType="application/xaml+xml" /></Types>'
    
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr('Xaml/Document.xaml', xaml.encode('utf-8'))
        z.writestr('_rels/.rels', rels.encode('utf-8'))
        z.writestr('[Content_Types].xml', ct.encode('utf-8'))
    return buf.getvalue()

def build_template():
    print("Reading base archive from:", SRC_MCDX)
    files = {}
    with zipfile.ZipFile(SRC_MCDX, 'r') as z:
        for name in z.namelist():
            if not name.startswith('mathcad/media/'):
                files[name] = z.read(name)

    # Base worksheet
    ws_root = ET.fromstring(files['mathcad/worksheet.xml'])
    regions_parent = ws_root[0]
    
    # Keep original plot regions
    plot_q_orig = None
    plot_m_orig = None
    for r in regions_parent:
        if r.attrib.get('region-id') == '29':
            plot_q_orig = r
        elif r.attrib.get('region-id') == '30':
            plot_m_orig = r

    # Clear all existing regions
    regions_parent.clear()

    reg_id_counter = 0

    sections = [
        ("PLANTILLA MAESTRA DE VIGAS (10 TRAMOS) - ANALISIS ESTRUCTURAL II", 18, True, "#FFFFF200"),
        ("1. GEOMETRIA Y DISCRETIZACION DE TRAMOS (L1 a L10):", 14, True, "#FFE0E0E0"),
        ("2. CARGAS APLICADAS (DISTRIBUIDAS q, PUNTUALES P, MOMENTOS M):", 14, True, "#FFE0E0E0"),
        ("3. CALCULO DE REACCIONES DE APOYO:", 14, True, "#FFE0E0E0"),
        ("4. FUNCIONES DE SECCION: MOMENTO M(x) Y CORTANTE Q(x):", 14, True, "#FFE0E0E0"),
        ("5. RANGO DE EVALUACION CONTINUO MILIMETRICO:", 14, True, "#FFE0E0E0"),
        ("6. DIAGRAMAS DE FUERZA CORTANTE Y MOMENTO FLECTOR:", 14, True, "#FFE0E0E0")
    ]

    # Build XAML packages and rels
    rels_xml = '<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    for idx, (sec_text, fsize, is_bold, bg) in enumerate(sections):
        pkg_path = f"mathcad/xaml/FlowDocument{idx}.XamlPackage"
        files[pkg_path] = make_xaml_package(sec_text, fsize, is_bold, bg)
        rels_xml += f'<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/flowDocument" Target="/{pkg_path}" Id="RelFlowDoc{idx}" />'
    rels_xml += '</Relationships>'
    files['mathcad/_rels/worksheet.xml.rels'] = rels_xml.encode('utf-8')

    cur_top = 20.0
    left_margin = 37.8

    def add_text_reg(sec_idx, top_offset=30.0):
        nonlocal reg_id_counter, cur_top
        cur_top += top_offset
        r = ET.Element(tag_ws('region'), {
            'region-id': str(reg_id_counter),
            'top': f'{cur_top:.1f}',
            'left': f'{left_margin:.1f}'
        })
        t = ET.SubElement(r, tag_ws('text'), {'item-idref': f'RelFlowDoc{sec_idx}'})
        regions_parent.append(r)
        reg_id_counter += 1

    def add_math(math_child, top=None, left=None):
        nonlocal reg_id_counter, cur_top
        if top is None:
            top = cur_top
        if left is None:
            left = left_margin
        r = make_region_math(reg_id_counter, top, left, math_child)
        regions_parent.append(r)
        reg_id_counter += 1

    # Header
    add_text_reg(0, top_offset=10.0)

    # Section 1: Geometria
    add_text_reg(1, top_offset=35.0)

    # Longitudes de 10 tramos
    # Fila 1: L1 a L5
    cur_top += 30.0
    lens = [2.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    for i in range(5):
        def_L = make_define(make_id("L", subscript=i+1), make_scaled(lens[i], "m"))
        add_math(def_L, top=cur_top, left=left_margin + i * 115.0)

    # Fila 2: L6 a L10
    cur_top += 30.0
    for i in range(5, 10):
        def_L = make_define(make_id("L", subscript=i+1), make_scaled(lens[i], "m"))
        add_math(def_L, top=cur_top, left=left_margin + (i - 5) * 115.0)

    # Longitud acumulada de nodos x0 a x10
    cur_top += 35.0
    # x0 := 0 m
    def_x0 = make_define(make_id("x", subscript=0), make_scaled(0.0, "m"))
    add_math(def_x0, top=cur_top, left=left_margin)

    # x1 := L1
    def_x1 = make_define(make_id("x", subscript=1), make_id("L", is_contextual=True, subscript=1))
    add_math(def_x1, top=cur_top, left=left_margin + 120.0)

    # x2 := x1 + L2
    def_x2 = make_define(make_id("x", subscript=2), make_apply('plus', make_id("x", is_contextual=True, subscript=1), make_id("L", is_contextual=True, subscript=2)))
    add_math(def_x2, top=cur_top, left=left_margin + 240.0)

    # x3 := x2 + L3
    def_x3 = make_define(make_id("x", subscript=3), make_apply('plus', make_id("x", is_contextual=True, subscript=2), make_id("L", is_contextual=True, subscript=3)))
    add_math(def_x3, top=cur_top, left=left_margin + 360.0)

    # x4 := x3 + L4
    def_x4 = make_define(make_id("x", subscript=4), make_apply('plus', make_id("x", is_contextual=True, subscript=3), make_id("L", is_contextual=True, subscript=4)))
    add_math(def_x4, top=cur_top, left=left_margin + 480.0)

    # Fila 2 de nodos acumulados (x5 a x10)
    cur_top += 30.0
    for i in range(5, 11):
        def_xi = make_define(make_id("x", subscript=i), make_apply('plus', make_id("x", is_contextual=True, subscript=i-1), make_id("L", is_contextual=True, subscript=i)))
        add_math(def_xi, top=cur_top, left=left_margin + (i - 5) * 120.0)

    # Longitud Total Ltot := x10
    cur_top += 35.0
    def_ltot = make_define(make_id("L", subscript="tot"), make_id("x", is_contextual=True, subscript=10))
    add_math(def_ltot, top=cur_top, left=left_margin)

    # Section 2: Cargas aplicadas
    add_text_reg(2, top_offset=35.0)

    # Cargas distribuidas q1 a q5
    cur_top += 30.0
    qs = [15.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    for i in range(5):
        def_q = make_define(make_id("q", subscript=i+1), make_scaled(qs[i], "kg/m"))
        add_math(def_q, top=cur_top, left=left_margin + i * 115.0)

    # Cargas distribuidas q6 a q10
    cur_top += 30.0
    for i in range(5, 10):
        def_q = make_define(make_id("q", subscript=i+1), make_scaled(qs[i], "kg/m"))
        add_math(def_q, top=cur_top, left=left_margin + (i - 5) * 115.0)

    # Cargas puntuales P0 a P5
    cur_top += 35.0
    ps = [0.0, 0.0, 20.0, 0.0, 8.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    for i in range(6):
        def_p = make_define(make_id("P", subscript=i), make_scaled(ps[i], "kg"))
        add_math(def_p, top=cur_top, left=left_margin + i * 115.0)

    # Cargas puntuales P6 a P10
    cur_top += 30.0
    for i in range(6, 11):
        def_p = make_define(make_id("P", subscript=i), make_scaled(ps[i], "kg"))
        add_math(def_p, top=cur_top, left=left_margin + (i - 6) * 115.0)

    # Momentos aplicados M0 a M5
    cur_top += 35.0
    ms = [0.0, 10.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    for i in range(6):
        def_m = make_define(make_id("M", subscript=i), make_scaled(ms[i], "kg*m"))
        add_math(def_m, top=cur_top, left=left_margin + i * 115.0)

    # Momentos aplicados M6 a M10
    cur_top += 30.0
    for i in range(6, 11):
        def_m = make_define(make_id("M", subscript=i), make_scaled(ms[i], "kg*m"))
        add_math(def_m, top=cur_top, left=left_margin + (i - 6) * 115.0)

    # Section 3: Reacciones
    add_text_reg(3, top_offset=35.0)

    cur_top += 30.0
    # VD := 35 kg
    def_vd = make_define(make_id("V", subscript="D"), make_scaled(35.0, "kg"))
    add_math(def_vd, top=cur_top, left=left_margin)

    # VA := 23 kg
    def_va = make_define(make_id("V", subscript="A"), make_scaled(23.0, "kg"))
    add_math(def_va, top=cur_top, left=left_margin + 200.0)

    # Section 4: Funciones de Secciones M(x) y Q(x)
    add_text_reg(4, top_offset=35.0)

    # Funcion M(x)
    cur_top += 30.0
    fn_m_target = ET.Element(tag_ml('function'))
    fn_m_target.append(make_id("M"))
    bvars_m = ET.SubElement(fn_m_target, tag_ml('boundVars'))
    bvars_m.append(make_id("x"))

    # VA * x
    m_expr = make_apply('mult', make_id("V", is_contextual=True, subscript="A"), make_id("x", is_contextual=True))

    # Carga distribuida tramo 1 activa: - (x1 > x > x0) * q1 * (x^2 / 2)
    cond_q1_act = make_parens(make_apply('greaterThan', make_apply('greaterThan', make_id("x", is_contextual=True, subscript=1), make_id("x", is_contextual=True)), make_id("x", is_contextual=True, subscript=0)))
    term_q1_act = make_apply('mult', make_apply('mult', cond_q1_act, make_id("q", is_contextual=True, subscript=1)), make_apply('div', make_apply('pow', make_id("x", is_contextual=True), make_real(2)), make_real(2)))
    m_expr = make_apply('minus', m_expr, term_q1_act)

    # Carga distribuida tramo 1 superada: - (x >= x1) * q1 * L1 * (x - L1/2)
    cond_q1_sup = make_parens(make_apply('greaterOrEqual', make_id("x", is_contextual=True), make_id("x", is_contextual=True, subscript=1)))
    arm_q1_sup = make_parens(make_apply('minus', make_id("x", is_contextual=True), make_apply('div', make_id("L", is_contextual=True, subscript=1), make_real(2))))
    term_q1_sup = make_apply('mult', make_apply('mult', make_apply('mult', cond_q1_sup, make_id("q", is_contextual=True, subscript=1)), make_id("L", is_contextual=True, subscript=1)), arm_q1_sup)
    m_expr = make_apply('minus', m_expr, term_q1_sup)

    # Momento nodo 1: + (x >= x1) * M1
    cond_m1 = make_parens(make_apply('greaterOrEqual', make_id("x", is_contextual=True), make_id("x", is_contextual=True, subscript=1)))
    term_m1 = make_apply('mult', cond_m1, make_id("M", is_contextual=True, subscript=1))
    m_expr = make_apply('plus', m_expr, term_m1)

    # Carga puntual nodo 2: - (x >= x2) * P2 * (x - x2)
    cond_p2 = make_parens(make_apply('greaterOrEqual', make_id("x", is_contextual=True), make_id("x", is_contextual=True, subscript=2)))
    arm_p2 = make_parens(make_apply('minus', make_id("x", is_contextual=True), make_id("x", is_contextual=True, subscript=2)))
    term_p2 = make_apply('mult', make_apply('mult', cond_p2, make_id("P", is_contextual=True, subscript=2)), arm_p2)
    m_expr = make_apply('minus', m_expr, term_p2)

    # Reaccion apoyo D (nodo 3): + (x >= x3) * VD * (x - x3)
    cond_vd = make_parens(make_apply('greaterOrEqual', make_id("x", is_contextual=True), make_id("x", is_contextual=True, subscript=3)))
    arm_vd = make_parens(make_apply('minus', make_id("x", is_contextual=True), make_id("x", is_contextual=True, subscript=3)))
    term_vd = make_apply('mult', make_apply('mult', cond_vd, make_id("V", is_contextual=True, subscript="D")), arm_vd)
    m_expr = make_apply('plus', m_expr, term_vd)

    def_fn_m = make_define(fn_m_target, m_expr)
    add_math(def_fn_m, top=cur_top, left=left_margin)

    # Funcion Q(x)
    cur_top += 55.0
    fn_q_target = ET.Element(tag_ml('function'))
    fn_q_target.append(make_id("Q"))
    bvars_q = ET.SubElement(fn_q_target, tag_ml('boundVars'))
    bvars_q.append(make_id("x"))

    q_expr = make_id("V", is_contextual=True, subscript="A")

    # - (x1 > x > x0) * q1 * (x - x0)
    term_q1_act_v = make_apply('mult', make_apply('mult', cond_q1_act, make_id("q", is_contextual=True, subscript=1)), make_id("x", is_contextual=True))
    q_expr = make_apply('minus', q_expr, term_q1_act_v)

    # - (x >= x1) * q1 * L1
    term_q1_sup_v = make_apply('mult', make_apply('mult', cond_q1_sup, make_id("q", is_contextual=True, subscript=1)), make_id("L", is_contextual=True, subscript=1))
    q_expr = make_apply('minus', q_expr, term_q1_sup_v)

    # - (x >= x2) * P2
    term_p2_v = make_apply('mult', cond_p2, make_id("P", is_contextual=True, subscript=2))
    q_expr = make_apply('minus', q_expr, term_p2_v)

    # + (x >= x3) * VD
    term_vd_v = make_apply('mult', cond_vd, make_id("V", is_contextual=True, subscript="D"))
    q_expr = make_apply('plus', q_expr, term_vd_v)

    # - (x >= x4) * P4
    cond_p4 = make_parens(make_apply('greaterOrEqual', make_id("x", is_contextual=True), make_id("x", is_contextual=True, subscript=4)))
    term_p4_v = make_apply('mult', cond_p4, make_id("P", is_contextual=True, subscript=4))
    q_expr = make_apply('minus', q_expr, term_p4_v)

    def_fn_q = make_define(fn_q_target, q_expr)
    add_math(def_fn_q, top=cur_top, left=left_margin)

    # Section 5: Rango x
    add_text_reg(5, top_offset=45.0)

    cur_top += 30.0
    # x := 0 m, 0.001 m .. Ltot
    def_x_range = ET.Element(tag_ml('define'))
    def_x_range.append(make_id("x"))
    range_el = ET.SubElement(def_x_range, tag_ml('range'))
    seq_el = ET.SubElement(range_el, tag_ml('sequence'))
    seq_el.append(make_scaled(0.0, "m"))
    seq_el.append(make_scaled(0.001, "m"))
    range_el.append(make_id("L", is_contextual=True, subscript="tot"))
    add_math(def_x_range, top=cur_top, left=left_margin)

    # Section 6: Diagramas DFC y DMF
    add_text_reg(6, top_offset=35.0)

    # Plot Q(x)
    cur_top += 30.0
    plot_q_orig.attrib['region-id'] = str(reg_id_counter)
    plot_q_orig.attrib['top'] = f'{cur_top:.1f}'
    plot_q_orig.attrib['left'] = f'{left_margin:.1f}'
    regions_parent.append(plot_q_orig)
    reg_id_counter += 1

    # Plot M(x)
    cur_top += 250.0
    plot_m_orig.attrib['region-id'] = str(reg_id_counter)
    plot_m_orig.attrib['top'] = f'{cur_top:.1f}'
    plot_m_orig.attrib['left'] = f'{left_margin:.1f}'
    regions_parent.append(plot_m_orig)
    reg_id_counter += 1

    # Write modified worksheet.xml
    files['mathcad/worksheet.xml'] = ET.tostring(ws_root, encoding='utf-8', xml_declaration=True)

    # Save to OUT_MCDX
    print("Writing package to:", OUT_MCDX)
    with zipfile.ZipFile(OUT_MCDX, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for name, content in files.items():
            z.writestr(name, content)

    print("Package written successfully! File size:", os.path.getsize(OUT_MCDX), "bytes")

if __name__ == '__main__':
    build_template()

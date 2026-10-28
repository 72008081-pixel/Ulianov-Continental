"""
=============================================================================
MCDX GENERATOR - CONSTRUCTOR DINÁMICO UNIVERSAL PARA MATHCAD PRIME 11
=============================================================================
Genera archivos nativos .mcdx completamente compatibles con PTC Mathcad Prime 11
utilizando la estructura base validada de 10 tramos y funciones de Macaulay.
Incrusta el esquema vectorial de la viga, cotas, cargas, apoyos y cortes,
escalando dinámicamente los límites de los ejes de los diagramas DFC y DMF.
"""

import os
import sys
import io
import math
import zipfile
import xml.etree.ElementTree as ET
from PIL import Image

from beam_engine import BeamModel, render_beam_diagram

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
    """Crea un nodo identificador de variable con o sin subíndice."""
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
    """Construye un árbol binario MathML izquierdo para suma y resta algebraica."""
    acc = None
    for sign, el in terms:
        if acc is None:
            if sign == '+':
                acc = el
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


def generate_mcdx_for_beam(beam: BeamModel, output_mcdx_path: str, base_template_path: str = None) -> str:
    """
    Construye un archivo .mcdx dinámico compatible al 100% con Mathcad Prime 11.
    Toma la plantilla maestra certificada de 10 tramos y actualiza parámetros,
    diagrama de la viga, funciones de singularidad Macaulay para M(x) y Q(x),
    y los límites de visualización de los gráficos 2D.
    """
    if base_template_path is None or not os.path.exists(base_template_path):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        base_template_path = os.path.join(base_dir, "PLANTILLA_MAESTRA_10_TRAMOS_CORREGIDA.mcdx")

    files = {}
    with zipfile.ZipFile(base_template_path, 'r') as z:
        for name in z.namelist():
            files[name] = z.read(name)

    # 1. Renderizar e incrustar diagrama gráfico vectorial de la viga
    img_beam = render_beam_diagram(beam, width=1400, height=420, show_cuts=True)
    buf_beam = io.BytesIO()
    img_beam.save(buf_beam, format="PNG")
    files['mathcad/media/Image0.png'] = buf_beam.getvalue()

    # 2. Cargar XML del worksheet
    ws_root = ET.fromstring(files['mathcad/worksheet.xml'])
    regions_parent = ws_root[0]

    # Eliminar imágenes repetidas/parásitas (R0, R1, R57, R60, R63, R65)
    unwanted_ids = {'0', '1', '57', '60', '63', '65'}
    for r in list(regions_parent):
        if r.attrib.get('region-id') in unwanted_ids:
            regions_parent.remove(r)

    # Indexar TODAS las regiones por su 'region-id' estricto
    regs_dict = {r.attrib.get('region-id'): r for r in regions_parent.findall(tag_ws('region'))}

    # A) Actualizar Longitudes L1 a L10 (Regiones 2 a 11)
    spans_10 = beam.spans + [0.0] * (10 - len(beam.spans))
    for i in range(10):
        rid = str(2 + i)
        if rid in regs_dict:
            for r_el in regs_dict[rid].iter(tag_ml('real')):
                r_el.text = f"{spans_10[i]:g}"

    # B) Actualizar Cargas Distribuidas q1 a q10 (Regiones 25 a 34)
    for i in range(10):
        rid = str(25 + i)
        q_val = beam.distributed_loads.get(i, 0.0)
        if rid in regs_dict:
            for r_el in regs_dict[rid].iter(tag_ml('real')):
                r_el.text = f"{q_val:g}"

    # C) Actualizar Cargas Puntuales P0 a P10 (Regiones 35 a 45)
    for i in range(11):
        rid = str(35 + i)
        p_val = beam.point_loads.get(i, 0.0)
        if rid in regs_dict:
            for r_el in regs_dict[rid].iter(tag_ml('real')):
                r_el.text = f"{p_val:g}"

    # D) Actualizar Momentos Aplicados M0 a M10 (Regiones 46 a 56)
    for i in range(11):
        rid = str(46 + i)
        m_val = beam.applied_moments.get(i, 0.0)
        if rid in regs_dict:
            for r_el in regs_dict[rid].iter(tag_ml('real')):
                r_el.text = f"{m_val:g}"

    # E) Calcular Reacciones y actualizar variables de apoyo
    reactions = beam.calculate_reactions()
    sup_nodes = sorted(beam.supports.keys())
    
    val_va = reactions.get("VA", 0.0)
    val_vd = reactions.get("VD", reactions.get("MA", 0.0))

    # Región 58: VD
    if '58' in regs_dict:
        for r_el in regs_dict['58'].iter(tag_ml('real')):
            r_el.text = f"{val_vd:.4f}" if isinstance(val_vd, float) else str(val_vd)

    # Región 59: VA
    if '59' in regs_dict:
        for r_el in regs_dict['59'].iter(tag_ml('real')):
            r_el.text = f"{val_va:.4f}" if isinstance(val_va, float) else str(val_va)

    # F) Construcción Dinámica de Expresiones Macaulay para M(x) y Q(x)
    terms_m = []
    terms_q = []

    # 1. Apoyos y Reacciones
    if len(sup_nodes) >= 2:
        n_a, n_b = sup_nodes[0], sup_nodes[1]
        
        # Apoyo A
        if n_a == 0:
            terms_m.append(('+', make_apply('mult', make_id("V", subscript="A"), make_id("x"))))
            terms_q.append(('+', make_id("V", subscript="A")))
        else:
            cond_va = make_parens(make_apply('greaterOrEqual', make_id("x"), make_id("x", subscript=n_a)))
            arm_va = make_parens(make_apply('minus', make_id("x"), make_id("x", subscript=n_a)))
            terms_m.append(('+', make_apply('mult', make_apply('mult', cond_va, make_id("V", subscript="A")), arm_va)))
            terms_q.append(('+', make_apply('mult', cond_va, make_id("V", subscript="A"))))

        # Apoyo B
        cond_vb = make_parens(make_apply('greaterOrEqual', make_id("x"), make_id("x", subscript=n_b)))
        arm_vb = make_parens(make_apply('minus', make_id("x"), make_id("x", subscript=n_b)))
        terms_m.append(('+', make_apply('mult', make_apply('mult', cond_vb, make_id("V", subscript="D")), arm_vb)))
        terms_q.append(('+', make_apply('mult', cond_vb, make_id("V", subscript="D"))))

    elif len(sup_nodes) == 1 and beam.supports[sup_nodes[0]] == 'fixed':
        n_fix = sup_nodes[0]
        if n_fix == 0:
            terms_m.append(('+', make_id("V", subscript="D")))  # VD actúa como MA
            terms_m.append(('+', make_apply('mult', make_id("V", subscript="A"), make_id("x"))))
            terms_q.append(('+', make_id("V", subscript="A")))
        else:
            cond_fix = make_parens(make_apply('greaterOrEqual', make_id("x"), make_id("x", subscript=n_fix)))
            arm_fix = make_parens(make_apply('minus', make_id("x"), make_id("x", subscript=n_fix)))
            terms_m.append(('+', make_apply('mult', cond_fix, make_id("V", subscript="D"))))
            terms_m.append(('+', make_apply('mult', make_apply('mult', cond_fix, make_id("V", subscript="A")), arm_fix)))
            terms_q.append(('+', make_apply('mult', cond_fix, make_id("V", subscript="A"))))
    else:
        terms_m.append(('+', make_apply('mult', make_id("V", subscript="A"), make_id("x"))))
        terms_q.append(('+', make_id("V", subscript="A")))

    # 2. Cargas Distribuidas
    for k in range(len(beam.spans)):
        q_val = beam.distributed_loads.get(k, 0.0)
        if q_val != 0:
            cond_act = make_parens(make_apply('greaterThan',
                make_apply('greaterThan', make_id("x", subscript=k+1), make_id("x")),
                make_id("x", subscript=k)))
            
            if k == 0:
                arm_sq = make_apply('div', make_apply('pow', make_id("x"), make_real(2)), make_real(2))
                arm_v = make_id("x")
            else:
                arm_diff = make_parens(make_apply('minus', make_id("x"), make_id("x", subscript=k)))
                arm_sq = make_apply('div', make_apply('pow', arm_diff, make_real(2)), make_real(2))
                arm_v = arm_diff
                
            term_m_act = make_apply('mult', make_apply('mult', cond_act, make_id("q", subscript=k+1)), arm_sq)
            term_q_act = make_apply('mult', make_apply('mult', cond_act, make_id("q", subscript=k+1)), arm_v)
            terms_m.append(('-', term_m_act))
            terms_q.append(('-', term_q_act))

            # Condición de tramo superado: x >= x_(k+1)
            cond_sup = make_parens(make_apply('greaterOrEqual', make_id("x"), make_id("x", subscript=k+1)))
            if k == 0:
                arm_cg = make_parens(make_apply('minus', make_id("x"), make_apply('div', make_id("L", subscript=1), make_real(2))))
            else:
                cg_pos = make_parens(make_apply('plus', make_id("x", subscript=k), make_apply('div', make_id("L", subscript=k+1), make_real(2))))
                arm_cg = make_parens(make_apply('minus', make_id("x"), cg_pos))
                
            term_m_sup = make_apply('mult', make_apply('mult', make_apply('mult', cond_sup, make_id("q", subscript=k+1)), make_id("L", subscript=k+1)), arm_cg)
            term_q_sup = make_apply('mult', make_apply('mult', cond_sup, make_id("q", subscript=k+1)), make_id("L", subscript=k+1))
            terms_m.append(('-', term_m_sup))
            terms_q.append(('-', term_q_sup))

    # 3. Momentos Aplicados
    for i in range(len(beam.spans) + 1):
        m_val = beam.applied_moments.get(i, 0.0)
        if m_val != 0:
            if i == 0:
                terms_m.append(('+', make_id("M", subscript=0)))
            else:
                cond_m = make_parens(make_apply('greaterOrEqual', make_id("x"), make_id("x", subscript=i)))
                terms_m.append(('+', make_apply('mult', cond_m, make_id("M", subscript=i))))

    # 4. Cargas Puntuales
    for i in range(len(beam.spans) + 1):
        p_val = beam.point_loads.get(i, 0.0)
        if p_val != 0:
            if i == 0:
                terms_m.append(('-', make_apply('mult', make_id("P", subscript=0), make_id("x"))))
                terms_q.append(('-', make_id("P", subscript=0)))
            else:
                cond_p = make_parens(make_apply('greaterOrEqual', make_id("x"), make_id("x", subscript=i)))
                arm_p = make_parens(make_apply('minus', make_id("x"), make_id("x", subscript=i)))
                term_p_m = make_apply('mult', make_apply('mult', cond_p, make_id("P", subscript=i)), arm_p)
                term_p_q = make_apply('mult', cond_p, make_id("P", subscript=i))
                terms_m.append(('-', term_p_m))
                terms_q.append(('-', term_p_q))

    # Reemplazar definición de M(x) en Región 61
    if '61' in regs_dict:
        reg_61_math = regs_dict['61'].find(tag_ws('math'))
        if reg_61_math is not None:
            reg_61_def = reg_61_math.find(tag_ml('define'))
            if reg_61_def is not None:
                reg_61_def[1] = build_additive_chain(terms_m)

    # Reemplazar definición de Q(x) en Región 62
    if '62' in regs_dict:
        reg_62_math = regs_dict['62'].find(tag_ws('math'))
        if reg_62_math is not None:
            reg_62_def = reg_62_math.find(tag_ml('define'))
            if reg_62_def is not None:
                reg_62_def[1] = build_additive_chain(terms_q)

    # G) Escalamiento dinámico de límites de visualización de gráficos 2D (Regiones 66 y 67)
    total_l = beam.total_length if beam.total_length > 0 else 1.0
    q_min, q_max, m_min, m_max = beam.compute_internal_force_extrema()
    
    q_span = max(abs(q_max - q_min), 10.0)
    q_lim_min = q_min - 0.15 * q_span
    q_lim_max = q_max + 0.15 * q_span

    m_span = max(abs(m_max - m_min), 10.0)
    m_lim_min = m_min - 0.15 * m_span
    m_lim_max = m_max + 0.15 * m_span

    # Actualizar Ejes en Gráfico Q(x) (Región 66)
    if '66' in regs_dict:
        p66 = regs_dict['66'].find(tag_ws('plot'))
        if p66 is not None:
            x_ax = p66.find(f".//{tag_ws('xAxis')}")
            if x_ax is not None:
                x_ax.attrib['start'] = "0"
                x_ax.attrib['end'] = f"{total_l:g}"
                aline = x_ax.find(tag_ws('axisLine'))
                if aline is not None:
                    aline.attrib['positionticmark'] = str(int(round(total_l)))
            y_ax = p66.find(f".//{tag_ws('yAxis')}")
            if y_ax is not None:
                y_ax.attrib['start'] = f"{q_lim_min:.1f}"
                y_ax.attrib['end'] = f"{q_lim_max:.1f}"
                aline = y_ax.find(tag_ws('axisLine'))
                if aline is not None:
                    aline.attrib['positionticmark'] = "0"

    # Actualizar Ejes en Gráfico M(x) (Región 67)
    if '67' in regs_dict:
        p67 = regs_dict['67'].find(tag_ws('plot'))
        if p67 is not None:
            x_ax = p67.find(f".//{tag_ws('xAxis')}")
            if x_ax is not None:
                x_ax.attrib['start'] = "0"
                x_ax.attrib['end'] = f"{total_l:g}"
                aline = x_ax.find(tag_ws('axisLine'))
                if aline is not None:
                    aline.attrib['positionticmark'] = str(int(round(total_l)))
            y_ax = p67.find(f".//{tag_ws('yAxis')}")
            if y_ax is not None:
                y_ax.attrib['start'] = f"{m_lim_min:.1f}"
                y_ax.attrib['end'] = f"{m_lim_max:.1f}"
                aline = y_ax.find(tag_ws('axisLine'))
                if aline is not None:
                    aline.attrib['positionticmark'] = "0"

    # H) Reorganización geométrica anti-colisión estricta
    def set_pos(rid, top, left, w=None, h=None):
        if rid in regs_dict:
            regs_dict[rid].attrib['top'] = f"{top:.1f}"
            regs_dict[rid].attrib['left'] = f"{left:.1f}"
            if w is not None: regs_dict[rid].attrib['width'] = str(w)
            if h is not None: regs_dict[rid].attrib['height'] = str(h)

    # Longitudes L1..L10
    set_pos('2', 35.0, 37.8);  set_pos('3', 35.0, 170.0); set_pos('4', 35.0, 305.0); set_pos('5', 35.0, 440.0); set_pos('6', 35.0, 575.0)
    set_pos('7', 68.0, 37.8);  set_pos('8', 68.0, 170.0); set_pos('9', 68.0, 305.0); set_pos('10', 68.0, 440.0); set_pos('11', 68.0, 575.0)

    # Coordenadas x0..x10 y Ltot
    set_pos('12', 105.0, 37.8); set_pos('13', 105.0, 170.0); set_pos('14', 105.0, 305.0); set_pos('15', 105.0, 440.0); set_pos('16', 105.0, 575.0)
    set_pos('17', 140.0, 37.8); set_pos('18', 140.0, 150.0); set_pos('19', 140.0, 265.0); set_pos('20', 140.0, 380.0); set_pos('21', 140.0, 495.0); set_pos('22', 140.0, 610.0)
    set_pos('23', 175.0, 37.8)

    # Única imagen del esquema de la viga (Región 24, aislada en top=210 a 360)
    if '24' in regs_dict:
        r24 = regs_dict['24']
        r24.attrib['top'] = '210.0'
        r24.attrib['left'] = '37.8'
        r24.attrib['width'] = '700'
        r24.attrib['height'] = '145'
        png_el = r24.find(f"{tag_ws('picture')}/{tag_ws('png')}")
        if png_el is not None:
            png_el.attrib['display-width'] = '700'
            png_el.attrib['display-height'] = '145'

    # Cargas distribuidas q1..q10 (DEBAJO de la imagen, top: 380)
    set_pos('25', 380.0, 37.8);  set_pos('26', 380.0, 170.0); set_pos('27', 380.0, 305.0); set_pos('28', 380.0, 440.0); set_pos('29', 380.0, 575.0)
    set_pos('30', 418.0, 37.8);  set_pos('31', 418.0, 170.0); set_pos('32', 418.0, 305.0); set_pos('33', 418.0, 440.0); set_pos('34', 418.0, 575.0)

    # Cargas puntuales P0..P10
    set_pos('35', 458.0, 37.8);  set_pos('36', 458.0, 150.0); set_pos('37', 458.0, 265.0); set_pos('38', 458.0, 380.0); set_pos('39', 458.0, 495.0); set_pos('40', 458.0, 610.0)
    set_pos('41', 495.0, 37.8);  set_pos('42', 495.0, 150.0); set_pos('43', 495.0, 265.0); set_pos('44', 495.0, 380.0); set_pos('45', 495.0, 495.0)

    # Momentos M0..M10
    set_pos('46', 535.0, 37.8);  set_pos('47', 535.0, 205.0); set_pos('48', 535.0, 375.0); set_pos('49', 535.0, 545.0)
    set_pos('50', 570.0, 37.8);  set_pos('51', 570.0, 205.0); set_pos('52', 570.0, 375.0); set_pos('53', 570.0, 545.0)
    set_pos('54', 605.0, 37.8);  set_pos('55', 605.0, 205.0); set_pos('56', 605.0, 375.0)

    # Reacciones
    set_pos('58', 650.0, 37.8)
    set_pos('59', 650.0, 230.0)

    # Ecuaciones M(x), Q(x) y Rango
    set_pos('61', 695.0, 37.8)
    set_pos('62', 760.0, 37.8)
    set_pos('64', 820.0, 37.8)

    # Diagramas DFC y DMF
    set_pos('66', 865.0, 37.8, w=650, h=230)
    set_pos('67', 1135.0, 37.8, w=650, h=230)

    # I) ESCUDO SANITIZADOR UNIVERSAL (Garantía de Esquema Mathcad Prime 11)
    # 1. positionticmark estrictamente entero (xs:integer)
    for aline in ws_root.iter(tag_ws('axisLine')):
        ptm = aline.attrib.get('positionticmark')
        if ptm is not None:
            try:
                val = float(ptm)
                aline.attrib['positionticmark'] = str(int(round(val)))
            except ValueError:
                aline.attrib['positionticmark'] = '0'

    # 2. Sanitizar elementos apply incompletos si los hubiera
    binary_ops = {'mult', 'div', 'pow', 'greaterThan', 'greaterOrEqual'}
    for parent in ws_root.iter():
        for child in list(parent):
            if child.tag == tag_ml('apply'):
                if len(child) == 0:
                    parent.remove(child)
                else:
                    op_tag = child[0].tag.split('}')[-1]
                    num_args = len(child) - 1
                    if op_tag in binary_ops and num_args == 1:
                        # Reemplazar apply incompleto por su único operando
                        arg = child[1]
                        idx = list(parent).index(child)
                        parent.insert(idx, arg)
                        parent.remove(child)

    # 3. Guardar el archivo XML modificado en el paquete .mcdx
    files['mathcad/worksheet.xml'] = ET.tostring(ws_root, encoding='utf-8', xml_declaration=True)

    output_dir = os.path.dirname(os.path.abspath(output_mcdx_path))
    os.makedirs(output_dir, exist_ok=True)

    with zipfile.ZipFile(output_mcdx_path, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for name, content in files.items():
            z.writestr(name, content)

    return output_mcdx_path

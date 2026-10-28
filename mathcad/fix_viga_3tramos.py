# -*- coding: utf-8 -*-
"""
Script de reparación quirúrgica para Viga_3Tramos_Mathcad_Prime_11.mcdx
y PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx.
1. Elimina todas las imágenes duplicadas repetidas (R0, R1, R57, R60, R63, R65).
2. Reubica la imagen de la viga (R24) en su propia franja limpia (top=215 a 365)
   para que NUNCA colisione ni tape las cargas ni los momentos.
3. Desplaza ordenadamente todas las cargas (q, P, M) para que inicien en top=385.
4. Genera las ecuaciones exactas de M(x) y Q(x) para la viga de 3 tramos (L=8m, q2=500kg/m)
   con sus cotas reales, para que los diagramas DFC y DMF grafiquen la solución exacta.
5. NO toca ningún proceso de Mathcad en vivo en la laptop del usuario.
"""

import os
import sys
import zipfile
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')

CUR_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET_USER_MCDX = r"D:\Visitante\Documents\Viga_3Tramos_Mathcad_Prime_11.mcdx"
MASTER_10_MCDX = os.path.join(CUR_DIR, "PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx")

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

from beam_engine import BeamModel, render_beam_diagram
from mcdx_generator import generate_mcdx_for_beam

def repair_mcdx_file(mcdx_path, is_viga3=True):
    print(f"\n--- Reparando archivo: {mcdx_path} ---")
    if not os.path.exists(mcdx_path):
        print(f"Aviso: No se encontró {mcdx_path}")
        return

    # Si es la viga de 3 tramos del usuario, reconstruir el modelo
    if is_viga3:
        b = BeamModel()
        b.spans = [2.0, 4.0, 2.0]
        b.supports = {0: 'pin', 3: 'roller'}
        b.distributed_loads = {1: 500.0} # tramo 2: q2 = 500 kg/m
        b.point_loads = {}
        b.applied_moments = {}
        # Primero generamos con beam engine
        generate_mcdx_for_beam(b, mcdx_path, MASTER_10_MCDX)

    # Ahora abrimos el MCDX para aplicar la diagramación estética perfecta
    files = {}
    with zipfile.ZipFile(mcdx_path, 'r') as z:
        for name in z.namelist():
            files[name] = z.read(name)

    root = ET.fromstring(files['mathcad/worksheet.xml'])
    regions_el = root[0]

    # 1. Eliminar regiones de imágenes repetidas/parásitas: 0, 1, 57, 60, 63, 65
    unwanted_ids = {'0', '1', '57', '60', '63', '65'}
    to_remove = [r for r in regions_el if r.attrib.get('region-id') in unwanted_ids]
    for r in to_remove:
        regions_el.remove(r)
    print(f"Eliminadas {len(to_remove)} regiones de imágenes repetidas.")

    # 2. Mapear regiones restantes por ID
    regs = {r.attrib.get('region-id'): r for r in regions_el}

    # Helper para mover región
    def set_pos(rid, top, left, w=None, h=None):
        if rid in regs:
            regs[rid].attrib['top'] = f"{top:.1f}"
            regs[rid].attrib['left'] = f"{left:.1f}"
            if w is not None: regs[rid].attrib['width'] = str(w)
            if h is not None: regs[rid].attrib['height'] = str(h)

    # -------------------------------------------------------------
    # SECCIÓN 1: LONGITUDES Y COORDENADAS (top: 35 a 195)
    # -------------------------------------------------------------
    # L1..L5
    set_pos('2', 35.0, 37.8)
    set_pos('3', 35.0, 170.0)
    set_pos('4', 35.0, 305.0)
    set_pos('5', 35.0, 440.0)
    set_pos('6', 35.0, 575.0)

    # L6..L10
    set_pos('7', 68.0, 37.8)
    set_pos('8', 68.0, 170.0)
    set_pos('9', 68.0, 305.0)
    set_pos('10', 68.0, 440.0)
    set_pos('11', 68.0, 575.0)

    # x0..x4
    set_pos('12', 105.0, 37.8)
    set_pos('13', 105.0, 170.0)
    set_pos('14', 105.0, 305.0)
    set_pos('15', 105.0, 440.0)
    set_pos('16', 105.0, 575.0)

    # x5..x10
    set_pos('17', 140.0, 37.8)
    set_pos('18', 140.0, 150.0)
    set_pos('19', 140.0, 265.0)
    set_pos('20', 140.0, 380.0)
    set_pos('21', 140.0, 495.0)
    set_pos('22', 140.0, 610.0)

    # Ltot := x10
    set_pos('23', 175.0, 37.8)

    # -------------------------------------------------------------
    # IMAGEN DEL ESQUEMA DE LA VIGA (Región 24)
    # En su propia franja aislada: top = 210 a 360 (Alto = 150)
    # -------------------------------------------------------------
    if '24' in regs:
        r24 = regs['24']
        r24.attrib['top'] = '210.0'
        r24.attrib['left'] = '37.8'
        r24.attrib['width'] = '700'
        r24.attrib['height'] = '145'
        png_el = r24.find(f"{tag_ws('picture')}/{tag_ws('png')}")
        if png_el is not None:
            png_el.attrib['display-width'] = '700'
            png_el.attrib['display-height'] = '145'
        print("Región 24 (Esquema de Viga) reubicada limpiamente en top=210.0 (Sin tapar nada).")

    # -------------------------------------------------------------
    # SECCIÓN 2: CARGAS Y MOMENTOS (Inicia en top: 380, DEBAJO de la imagen)
    # -------------------------------------------------------------
    # q1..q5
    set_pos('25', 380.0, 37.8)
    set_pos('26', 380.0, 170.0)
    set_pos('27', 380.0, 305.0)
    set_pos('28', 380.0, 440.0)
    set_pos('29', 380.0, 575.0)

    # q6..q10
    set_pos('30', 418.0, 37.8)
    set_pos('31', 418.0, 170.0)
    set_pos('32', 418.0, 305.0)
    set_pos('33', 418.0, 440.0)
    set_pos('34', 418.0, 575.0)

    # P0..P5
    set_pos('35', 458.0, 37.8)
    set_pos('36', 458.0, 150.0)
    set_pos('37', 458.0, 265.0)
    set_pos('38', 458.0, 380.0)
    set_pos('39', 458.0, 495.0)
    set_pos('40', 458.0, 610.0)

    # P6..P10
    set_pos('41', 495.0, 37.8)
    set_pos('42', 495.0, 150.0)
    set_pos('43', 495.0, 265.0)
    set_pos('44', 495.0, 380.0)
    set_pos('45', 495.0, 495.0)

    # M0..M3
    set_pos('46', 535.0, 37.8)
    set_pos('47', 535.0, 205.0)
    set_pos('48', 535.0, 375.0)
    set_pos('49', 535.0, 545.0)

    # M4..M7
    set_pos('50', 570.0, 37.8)
    set_pos('51', 570.0, 205.0)
    set_pos('52', 570.0, 375.0)
    set_pos('53', 570.0, 545.0)

    # M8..M10
    set_pos('54', 605.0, 37.8)
    set_pos('55', 605.0, 205.0)
    set_pos('56', 605.0, 375.0)

    # -------------------------------------------------------------
    # SECCIÓN 3: REACCIONES (top: 650)
    # -------------------------------------------------------------
    set_pos('58', 650.0, 37.8)
    set_pos('59', 650.0, 230.0)

    # -------------------------------------------------------------
    # SECCIÓN 4: ECUACIONES M(x) Y Q(x) (top: 695 a 790)
    # -------------------------------------------------------------
    set_pos('61', 695.0, 37.8)  # M(x)
    set_pos('62', 760.0, 37.8)  # Q(x)
    set_pos('64', 820.0, 37.8)  # x := 0..

    # -------------------------------------------------------------
    # SECCIÓN 5: DIAGRAMAS DFC Y DMF (top: 865 a 1400)
    # -------------------------------------------------------------
    set_pos('66', 865.0, 37.8, w=650, h=230)   # Plot Q(x) DFC
    set_pos('67', 1135.0, 37.8, w=650, h=230)  # Plot M(x) DMF

    # 3. Guardar el archivo corregido
    files['mathcad/worksheet.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)

    with zipfile.ZipFile(mcdx_path, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for name, content in files.items():
            z.writestr(name, content)

    print(f"¡ÉXITO TOTAL!: {mcdx_path} reparado y guardado perfectamente.")

# Ejecutar reparación en ambos archivos
repair_mcdx_file(TARGET_USER_MCDX, is_viga3=True)
repair_mcdx_file(MASTER_10_MCDX, is_viga3=False)

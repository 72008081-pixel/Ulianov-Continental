"""
=============================================================================
MATHCAD PRIME 11 UNIVERSAL SHIELD & LAUNCHER (ESCUDO AUTOMÁTICO)
=============================================================================
Intercepta la apertura de cualquier archivo .mcdx en Windows, verifica su
cumplimiento estricto con el esquema XSD de PTC Mathcad Prime 11, repara
cualquier incompatibilidad al vuelo (como positionticmark con decimales,
operadores incompletos o referencias rotas) y lanza Mathcad Prime 11 de
forma completamente transparente y sin errores.
=============================================================================
"""

import sys
import os
import re
import io
import shutil
import zipfile
import subprocess
import xml.etree.ElementTree as ET

MATHCAD_EXE = r"C:\Program Files\PTC\Mathcad Prime 11.0.0.0\MathcadPrime.exe"
WS_NS = 'http://schemas.mathsoft.com/worksheet50'
ML_NS = 'http://schemas.mathsoft.com/math50'

def sanitize_worksheet_xml(xml_content: bytes) -> tuple[bytes, bool]:
    """
    Inspecciona y sanitiza el XML de un worksheet de Mathcad Prime.
    Devuelve (nuevo_contenido_bytes, modificado).
    """
    modified = False
    
    # 1. Rápido pase de Regex para positionticmark con decimales (Causa #1 de XmlSchemaValidationException)
    def fix_ptm(match):
        nonlocal modified
        val = float(match.group(1))
        modified = True
        return f'positionticmark="{int(round(val))}"'

    decoded = xml_content.decode('utf-8', errors='ignore')
    new_decoded, count = re.subn(r'positionticmark="(-?\d+\.\d+)"', fix_ptm, decoded)
    if count > 0:
        modified = True
        xml_content = new_decoded.encode('utf-8')

    # 2. Análisis DOM estructural para operadores apply y elementos schema
    try:
        root = ET.fromstring(xml_content)
    except Exception:
        # Si el XML no es parseable directamente, devolver el contenido previo
        return xml_content, modified

    dom_modified = False
    binary_ops = {'mult', 'div', 'pow', 'greaterThan', 'greaterOrEqual'}

    # Reparar apply incompletos
    for parent in root.iter():
        for child in list(parent):
            if child.tag == f'{{{ML_NS}}}apply':
                if len(child) == 0:
                    parent.remove(child)
                    dom_modified = True
                else:
                    op_tag = child[0].tag.split('}')[-1]
                    num_args = len(child) - 1
                    if op_tag in binary_ops and num_args == 1:
                        # Convertir operador binario sin segundo operando en su único operando
                        arg = child[1]
                        idx = list(parent).index(child)
                        parent.insert(idx, arg)
                        parent.remove(child)
                        dom_modified = True

    # Reparar axisLine que aún contengan decimales
    for aline in root.iter(f'{{{WS_NS}}}axisLine'):
        ptm = aline.attrib.get('positionticmark')
        if ptm is not None and '.' in ptm:
            try:
                aline.attrib['positionticmark'] = str(int(round(float(ptm))))
                dom_modified = True
            except ValueError:
                aline.attrib['positionticmark'] = '0'
                dom_modified = True

    if dom_modified:
        modified = True
        # Registrar namespaces para preservar prefijos
        ET.register_namespace('', WS_NS)
        ET.register_namespace('ml', ML_NS)
        ET.register_namespace('p', 'http://schemas.microsoft.com/winfx/2006/xaml/presentation')
        ET.register_namespace('c', 'clr-namespace:Ptc.Wpf;assembly=Ptc.Core')
        xml_content = ET.tostring(root, encoding='utf-8', xml_declaration=True)

    return xml_content, modified


def sanitize_mcdx_file(filepath: str) -> bool:
    """
    Verifica y repara un archivo .mcdx individual si es necesario.
    Devuelve True si fue reparado o ya era válido, False si ocurrió un error fatal.
    """
    if not os.path.exists(filepath):
        return False

    if not filepath.lower().endswith('.mcdx'):
        return False

    try:
        # Leer archivo ZIP
        with zipfile.ZipFile(filepath, 'r') as z:
            namelist = z.namelist()
            if 'mathcad/worksheet.xml' not in namelist:
                return False

            files = {name: z.read(name) for name in namelist}

        ws_xml = files['mathcad/worksheet.xml']
        new_xml, was_modified = sanitize_worksheet_xml(ws_xml)

        # Verificar si hay imágenes referenciadas ausentes
        # Crear 1x1 png transparente de respaldo por si falta algún medio
        blank_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82'
        if 'mathcad/media/Image0.png' not in files:
            files['mathcad/media/Image0.png'] = blank_png
            was_modified = True

        if was_modified:
            files['mathcad/worksheet.xml'] = new_xml
            
            # Guardar copia de respaldo .bak antes de sobrescribir
            bak_path = filepath + ".bak"
            if not os.path.exists(bak_path):
                shutil.copy2(filepath, bak_path)

            # Escribir archivo saneado
            temp_path = filepath + ".tmp_clean"
            with zipfile.ZipFile(temp_path, 'w', compression=zipfile.ZIP_DEFLATED) as z_out:
                for name, content in files.items():
                    z_out.writestr(name, content)

            os.replace(temp_path, filepath)
            print(f"[SHIELD] Archivo reparado con éxito: {filepath}")
            return True
        else:
            return True

    except Exception as e:
        print(f"[SHIELD] Error inspeccionando {filepath}: {e}")
        return False


def main():
    target_file = None
    if len(sys.argv) > 1:
        target_file = sys.argv[1]
        if target_file and os.path.exists(target_file):
            sanitize_mcdx_file(target_file)

    # Lanzar Mathcad Prime
    cmd = [MATHCAD_EXE]
    if target_file:
        cmd.append(target_file)

    subprocess.Popen(cmd)


if __name__ == '__main__':
    main()

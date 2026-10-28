import os
import sys
import zipfile
import xml.etree.ElementTree as ET

sys.path.insert(0, r"D:\ANTIGRAVITY CUBA V\01. Análisis Estructural II\01. PLANTILLAS FINALES EXAMENES\03. MATHCAD")
from mcdx_shield import sanitize_worksheet_xml, sanitize_mcdx_file
from validate_mcdx_schema import validate_mcdx

def test_shield_sanitizer():
    print("=== TEST DE ESCUDO SANITIZADOR ===")
    
    # 1. Crear XML corrupto con positionticmark="10.00" y apply incompleto
    bad_xml = b'''<?xml version="1.0" encoding="utf-8"?>
    <ws:worksheet xmlns:ws="http://schemas.mathsoft.com/worksheet50" xmlns:ml="http://schemas.mathsoft.com/math50">
        <ws:regions>
            <ws:region region-id="1">
                <ws:plot>
                    <ws:xyPlot>
                        <ws:xAxis start="0" end="10.00">
                            <ws:axisLine positionticmark="10.00" />
                        </ws:xAxis>
                    </ws:xyPlot>
                </ws:plot>
            </ws:region>
            <ws:region region-id="2">
                <ws:math>
                    <ml:define>
                        <ml:id labels="VARIABLE">test</ml:id>
                        <ml:apply>
                            <ml:mult />
                            <ml:id labels="VARIABLE">VD</ml:id>
                        </ml:apply>
                    </ml:define>
                </ws:math>
            </ws:region>
        </ws:regions>
    </ws:worksheet>'''

    clean_xml, was_mod = sanitize_worksheet_xml(bad_xml)
    print("Fue modificado:", was_mod)
    assert was_mod == True, "Debería haber sido modificado"
    
    clean_str = clean_xml.decode('utf-8')
    print("Contenido resultante:")
    print(clean_str)
    
    assert 'positionticmark="10"' in clean_str, "positionticmark debería ser entero '10'"
    assert '<ml:apply><ml:mult />' not in clean_str, "Apply incompleto debió ser reemplazado por VD"
    print("✅ TEST 1: Sanitización de XML sintético SUPERADA CON ÉXITO")

    # 2. Crear un archivo .mcdx corrupto en disco y repararlo con sanitize_mcdx_file
    test_mcdx = r"D:\ANTIGRAVITY CUBA V\01. Análisis Estructural II\01. PLANTILLAS FINALES EXAMENES\03. MATHCAD\test_outputs\CORRUPT_TEST.mcdx"
    os.makedirs(os.path.dirname(test_mcdx), exist_ok=True)
    
    with zipfile.ZipFile(test_mcdx, 'w') as z:
        z.writestr('mathcad/worksheet.xml', bad_xml)
    
    print("\nValidando archivo corrupto antes de reparar...")
    v_before, errs_before = validate_mcdx(test_mcdx)
    assert not v_before, "El archivo corrupto debe dar error en la validación inicial"
    print(f"Errores detectados correctamente: {len(errs_before)}")
    
    print("\nAplicando sanitize_mcdx_file...")
    ok = sanitize_mcdx_file(test_mcdx)
    assert ok == True
    
    print("\nValidando archivo reparado...")
    v_after, errs_after = validate_mcdx(test_mcdx)
    assert v_after == True, f"El archivo reparado debe ser válido pero dio: {errs_after}"
    print("✅ TEST 2: Archivo .mcdx reparado y 100% conforme a Mathcad Prime 11!")

if __name__ == '__main__':
    test_shield_sanitizer()

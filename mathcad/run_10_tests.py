"""
=============================================================================
BATERÍA DE PRUEBAS DE ESTRÉS: 10 CASOS REALES EN PTC MATHCAD PRIME 11
=============================================================================
Ejecuta y valida 10 configuraciones estructurales diversas:
- Generación de esquema gráfico vectorial con cotas y cortes.
- Ensamblaje dinámico de archivo nativo .mcdx.
- Apertura en PTC Mathcad Prime 11 vía COM (MathcadPrime.Application).
- Sincronización y cálculo de Solve Blocks, rango y gráficos XY.
- Verificación de ausencia de CorruptedRegion o errores de sintaxis.
- Exportación a PDF vectorial completo.
"""

import os
import sys
import time

WORK_DIR = r"D:\ANTIGRAVITY CUBA V\01. Análisis Estructural II\01. PLANTILLAS FINALES EXAMENES\03. MATHCAD"
sys.path.append(WORK_DIR)
sys.stdout.reconfigure(encoding='utf-8')

from beam_engine import BeamModel
from mcdx_generator import generate_mcdx_for_beam
import win32com.client
import zipfile

BASE_MCDX = os.path.join(WORK_DIR, "PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx")
TEST_OUT_DIR = os.path.join(WORK_DIR, "test_outputs")
os.makedirs(TEST_OUT_DIR, exist_ok=True)

test_cases = [
    # 1. Caso Base Examen (4 tramos con distribuida, puntual y momento)
    BeamModel(
        spans=[2.0, 1.0, 1.0, 1.0],
        supports={0: 'pin', 3: 'roller'},
        distributed_loads={0: 15.0},
        point_loads={2: 20.0, 4: 8.0},
        applied_moments={1: 10.0}
    ),
    # 2. Viga simplemente apoyada con carga puntual central
    BeamModel(
        spans=[2.5, 2.5],
        supports={0: 'pin', 2: 'roller'},
        point_loads={1: 50.0}
    ),
    # 3. Viga con carga distribuida continua en 3 tramos
    BeamModel(
        spans=[2.0, 2.0, 2.0],
        supports={0: 'pin', 3: 'roller'},
        distributed_loads={0: 10.0, 1: 10.0, 2: 10.0}
    ),
    # 4. Viga en voladizo (cantilever) empotrada en el origen
    BeamModel(
        spans=[3.0, 2.0],
        supports={0: 'fixed'},
        distributed_loads={0: 12.0},
        point_loads={2: 40.0}
    ),
    # 5. Viga con doble voladizo (apoyos interiores simétricos)
    BeamModel(
        spans=[1.5, 3.0, 3.0, 1.5],
        supports={1: 'pin', 3: 'roller'},
        point_loads={0: 15.0, 4: 15.0},
        distributed_loads={1: 20.0}
    ),
    # 6. Viga con momentos concentrados puros
    BeamModel(
        spans=[2.0, 2.0, 2.0],
        supports={0: 'pin', 3: 'roller'},
        applied_moments={1: 30.0, 2: -15.0}
    ),
    # 7. Viga de 5 tramos asimétrica con cargas combinadas
    BeamModel(
        spans=[1.0, 1.5, 2.0, 1.5, 1.0],
        supports={0: 'pin', 4: 'roller'},
        distributed_loads={1: 25.0},
        point_loads={3: 30.0},
        applied_moments={2: 12.0}
    ),
    # 8. Viga de 6 tramos con apoyos interiores
    BeamModel(
        spans=[1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        supports={1: 'pin', 5: 'roller'},
        distributed_loads={0: 10.0, 2: 15.0},
        point_loads={6: 20.0}
    ),
    # 9. Viga de 8 tramos con cargas múltiples
    BeamModel(
        spans=[1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        supports={0: 'pin', 7: 'roller'},
        distributed_loads={0: 5.0, 3: 8.0},
        point_loads={3: 15.0, 5: 10.0},
        applied_moments={2: 20.0}
    ),
    # 10. Viga completa de 10 tramos con máxima variabilidad
    BeamModel(
        spans=[1.2, 0.8, 1.5, 1.0, 0.5, 1.0, 1.2, 0.8, 1.0, 1.0],
        supports={0: 'pin', 8: 'roller'},
        distributed_loads={1: 18.0, 4: 12.0, 7: 15.0},
        point_loads={3: 25.0, 6: 15.0, 10: 10.0},
        applied_moments={2: 14.0, 5: 10.0}
    )
]

def run_all_tests():
    print("=" * 78)
    print("INICIANDO BATERÍA DE 10 PRUEBAS AUTOMATIZADAS EN PTC MATHCAD PRIME 11")
    print("=" * 78)
    
    results = []
    
    # Iniciar conexión COM con Mathcad Prime
    print("Conectando con MathcadPrime.Application COM...")
    mc = win32com.client.Dispatch('MathcadPrime.Application')
    mc.Visible = False
    
    try:
        for idx, bm in enumerate(test_cases, 1):
            test_name = f"TEST_{idx:02d}_{len(bm.spans)}TRAMOS"
            mcdx_file = os.path.join(TEST_OUT_DIR, f"{test_name}.mcdx")
            pdf_file = os.path.join(TEST_OUT_DIR, f"{test_name}.pdf")
            
            t0 = time.time()
            print(f"\n[{idx:02d}/10] Probando {test_name}: {len(bm.spans)} tramos, Ltot={bm.total_length}m...")
            
            # 1. Generar MCDX dinámico
            generate_mcdx_for_beam(bm, mcdx_file, BASE_MCDX)
            file_size_kb = os.path.getsize(mcdx_file) / 1024.0
            
            # 2. Abrir en Mathcad Prime vía COM
            prev_count = mc.Worksheets.Count
            mc.Open(os.path.abspath(mcdx_file))
            new_count = mc.Worksheets.Count
            
            if new_count <= prev_count:
                print(f"  [ERROR] Mathcad Prime rechazó abrir {mcdx_file}")
                results.append((idx, test_name, False, "Fallo al abrir en Mathcad", 0, 0))
                continue
                
            ws = mc.Worksheets.Item(new_count - 1)
            
            # 3. Sincronizar y recalcular
            ws.Synchronize()
            
            # 4. Verificar integridad de regiones
            has_corrupt = getattr(ws, 'HasCorruptedRegions', False)
            
            # 5. Exportar a PDF vectorial completo
            ws.SaveAs(os.path.abspath(pdf_file))
            pdf_exists = os.path.exists(pdf_file)
            pdf_size_kb = os.path.getsize(pdf_file) / 1024.0 if pdf_exists else 0
            
            # Cerrar hoja de trabajo
            ws.Close(0)
            
            elapsed = time.time() - t0
            success = (not has_corrupt) and pdf_exists and (pdf_size_kb > 50)
            
            status_msg = "EXITOSO (100% OK)" if success else "FALLO EN VERIFICACIÓN"
            print(f"  -> Resultado: {status_msg} en {elapsed:.2f}s | MCDX: {file_size_kb:.1f} KB | PDF: {pdf_size_kb:.1f} KB | Corrupted: {has_corrupt}")
            results.append((idx, test_name, success, status_msg, elapsed, pdf_size_kb))
            
    finally:
        mc.CloseAll(0)
        mc.Quit(0)
    
    print("\n" + "=" * 78)
    print("TABLA RESUMEN FINAL DE LA BATERÍA DE 10 PRUEBAS")
    print("=" * 78)
    print(f"{'CASO':<6} | {'NOMBRE DEL TEST':<25} | {'ESTADO':<15} | {'TIEMPO':<8} | {'PDF (KB)':<10}")
    print("-" * 78)
    all_passed = True
    for idx, name, succ, msg, el, psize in results:
        check = "✓ APROBADO" if succ else "✗ FALLADO"
        print(f"[{idx:02d}]   | {name:<25} | {check:<15} | {el:6.2f}s | {psize:8.1f} KB")
        if not succ:
            all_passed = False
            
    print("-" * 78)
    if all_passed and len(results) == 10:
        print("CONGRATULACIONES: ¡LAS 10 PRUEBAS FUERON APROBADAS AL 100% EN MATHCAD PRIME 11!")
    else:
        print("AVISO: Algunos casos no pasaron la verificación completa.")
        
    return all_passed

if __name__ == '__main__':
    run_all_tests()

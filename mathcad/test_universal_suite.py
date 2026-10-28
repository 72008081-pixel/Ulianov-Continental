"""
=============================================================================
SUITE DE VERIFICACIÓN UNIVERSAL Y ESTRÉS: MATHCAD PRIME 11 (10+ ESCENARIOS)
=============================================================================
Verifica 10 modelos estructurales continuos y articulados, cantilever y
voladizos con diferentes combinaciones de cargas puntuales, distribuidas
y momentos, asegurando 0 errores de esquema y compatibilidad total.
=============================================================================
"""

import os
import sys
import time

sys.path.insert(0, r"D:\ANTIGRAVITY CUBA V\01. Análisis Estructural II\01. PLANTILLAS FINALES EXAMENES\03. MATHCAD")
from beam_engine import BeamModel
from mcdx_generator import generate_mcdx_for_beam
from validate_mcdx_schema import validate_mcdx

OUTPUT_DIR = r"D:\ANTIGRAVITY CUBA V\01. Análisis Estructural II\01. PLANTILLAS FINALES EXAMENES\03. MATHCAD\test_outputs\stress_suite"
os.makedirs(OUTPUT_DIR, exist_ok=True)

SCENARIOS = [
    {
        "name": "01_Cantilever_Empotrado_1Tramo",
        "spans": [5.0],
        "supports": {0: "fixed"},
        "dist_loads": {0: 1200.0},
        "point_loads": {1: 500.0},
        "applied_moments": {1: 250.0}
    },
    {
        "name": "02_SimplementeApoyada_1Tramo",
        "spans": [6.0],
        "supports": {0: "pin", 1: "roller"},
        "dist_loads": {0: 800.0},
        "point_loads": {1: 0.0},
        "applied_moments": {}
    },
    {
        "name": "03_DosTramos_Desiguales",
        "spans": [4.0, 7.5],
        "supports": {0: "pin", 1: "roller", 2: "roller"},
        "dist_loads": {0: 1500.0, 1: 900.0},
        "point_loads": {1: 400.0},
        "applied_moments": {2: 150.0}
    },
    {
        "name": "04_TresTramos_DobleVoladizo",
        "spans": [2.5, 6.0, 2.0],
        "supports": {1: "pin", 2: "roller"},
        "dist_loads": {0: 600.0, 1: 1200.0, 2: 600.0},
        "point_loads": {0: 300.0, 3: 350.0},
        "applied_moments": {}
    },
    {
        "name": "05_CuatroTramos_ExamenOficial",
        "spans": [2.0, 4.0, 3.0, 1.0],
        "supports": {0: "pin", 3: "roller"},
        "dist_loads": {1: 800.0, 2: 800.0},
        "point_loads": {2: 400.0},
        "applied_moments": {1: 200.0, 4: 150.0}
    },
    {
        "name": "06_CincoTramos_Alternados",
        "spans": [3.0, 4.0, 5.0, 4.0, 3.0],
        "supports": {0: "pin", 2: "roller", 5: "roller"},
        "dist_loads": {0: 1000.0, 2: 1200.0, 4: 800.0},
        "point_loads": {1: 500.0, 3: 600.0},
        "applied_moments": {0: 100.0}
    },
    {
        "name": "07_SeisTramos_CargasPuntualesPuras",
        "spans": [3.0, 3.0, 3.0, 3.0, 3.0, 3.0],
        "supports": {0: "pin", 3: "roller", 6: "roller"},
        "dist_loads": {},
        "point_loads": {1: 500.0, 2: 700.0, 4: 800.0, 5: 400.0},
        "applied_moments": {}
    },
    {
        "name": "08_OchoTramos_GrandesLuces",
        "spans": [8.0, 10.0, 12.0, 8.0, 6.0, 8.0, 10.0, 7.0],
        "supports": {0: "pin", 4: "roller", 8: "roller"},
        "dist_loads": {1: 2500.0, 3: 1800.0, 6: 2200.0},
        "point_loads": {2: 1500.0, 5: 2000.0},
        "applied_moments": {4: 500.0}
    },
    {
        "name": "09_DiezTramos_CapacidadMaxima",
        "spans": [3.0, 4.0, 3.5, 4.5, 3.0, 4.0, 3.5, 4.5, 3.0, 4.0],
        "supports": {0: "pin", 5: "roller", 10: "roller"},
        "dist_loads": {i: 750.0 for i in range(10)},
        "point_loads": {i: 200.0 for i in range(1, 10, 2)},
        "applied_moments": {0: 50.0, 10: 50.0}
    },
    {
        "name": "10_SinCargas_CeroAbsoluto",
        "spans": [4.0, 5.0, 4.0],
        "supports": {0: "pin", 2: "roller"},
        "dist_loads": {},
        "point_loads": {},
        "applied_moments": {}
    }
]

def run_stress_test():
    print(f"=== INICIANDO BATERÍA DE 10 PRUEBAS ESTRUCTURALES Y DE ESQUEMA ===")
    results = []
    
    for i, s in enumerate(SCENARIOS, 1):
        print(f"\n--- Caso {i:02d}: {s['name']} ---")
        beam = BeamModel(
            spans=s["spans"],
            supports=s["supports"],
            distributed_loads=s.get("dist_loads", {}),
            point_loads=s.get("point_loads", {}),
            applied_moments=s.get("applied_moments", {})
        )
        out_file = os.path.join(OUTPUT_DIR, f"{s['name']}.mcdx")
        
        try:
            generate_mcdx_for_beam(beam, out_file)
            print(f"  [1/2] Archivo .mcdx generado ({os.path.getsize(out_file):,} bytes)")
            
            is_valid, errs = validate_mcdx(out_file)
            if is_valid:
                print(f"  [2/2] ✅ Esquema Mathcad Prime 11: 100% VÁLIDO (0 errores)")
                results.append((s['name'], True, "100% Válido"))
            else:
                print(f"  [2/2] ❌ Error de validación: {errs}")
                results.append((s['name'], False, str(errs)))
        except Exception as e:
            print(f"  ❌ Excepción: {e}")
            results.append((s['name'], False, str(e)))

    print("\n" + "="*70)
    print("RESUMEN DE PRUEBAS DE ESTRÉS:")
    print("="*70)
    all_passed = True
    for name, ok, msg in results:
        status_sym = "✅ PASÓ" if ok else "❌ FALLÓ"
        print(f"{name:<38} | {status_sym} | {msg}")
        if not ok:
            all_passed = False

    print("="*70)
    if all_passed:
        print("🏆 TODAS LAS 10 PRUEBAS PASARON AL 100% SIN NINGÚN ERROR DE ESQUEMA")
    else:
        print("⚠️ SE DETECTARON FALLOS EN LA SUITE")
    print("="*70)

if __name__ == '__main__':
    run_stress_test()

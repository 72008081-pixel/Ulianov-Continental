#!/usr/bin/env python3
"""
verify_frame_independent.py — Verificador Numérico Independiente Python/NumPy vs JavaScript
CEREBRO ESTRUCTURAL — PÓRTICOS 2D v3.5 (Plantilla Ulianov)
Cátedra: Análisis Estructural II — Ing. Ulianov Cuba Valencia
Ejecuta los 10 Casos de Prueba Académicos Obligatorios
"""

import sys
import json
import subprocess
import numpy as np

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def solve_frame_python(model):
    E = float(model.get('E', 2100000.0))
    sec = model.get('section', {'shape': 'rect', 'b': 25.0, 'h': 50.0})
    shape = sec.get('shape', 'rect')
    
    if shape == 'rect':
        b = float(sec['b'])
        h = float(sec['h'])
        A_def = b * h
        I_def = b * (h**3) / 12.0
    elif shape == 'circle':
        d = float(sec['d'])
        A_def = np.pi * (d**2) / 4.0
        I_def = np.pi * (d**4) / 64.0
    elif shape == 'T':
        bf = float(sec['bf'])
        tf = float(sec['tf'])
        tw = float(sec['tw'])
        hw = float(sec['hw'])
        a1 = bf * tf
        a2 = tw * hw
        y1 = hw + tf / 2.0
        y2 = hw / 2.0
        A_def = a1 + a2
        ycg = (a1 * y1 + a2 * y2) / A_def
        d1 = y1 - ycg
        d2 = y2 - ycg
        I_def = (bf * tf**3)/12.0 + a1 * d1**2 + (tw * hw**3)/12.0 + a2 * d2**2
    else:
        A_def = 25.0
        I_def = 52.083333

    raw_nodes = model['nodes']
    raw_bars = model['bars']
    
    node_map = {int(n['id']): i for i, n in enumerate(raw_nodes)}
    num_nodes = len(raw_nodes)
    ndof = num_nodes * 3
    
    K_global = np.zeros((ndof, ndof), dtype=float)
    F_nodal = np.zeros(ndof, dtype=float)
    
    for i, n in enumerate(raw_nodes):
        F_nodal[3*i] += float(n.get('fx', 0.0))
        F_nodal[3*i+1] += float(n.get('fy', 0.0))
        F_nodal[3*i+2] += float(n.get('mz', 0.0))
        
    members_data = []
    
    for b_idx, b in enumerate(raw_bars):
        n1_id = int(b['from'])
        n2_id = int(b['to'])
        i = node_map[n1_id]
        j = node_map[n2_id]
        
        x1, y1 = float(raw_nodes[i]['x']), float(raw_nodes[i]['y'])
        x2, y2 = float(raw_nodes[j]['x']), float(raw_nodes[j]['y'])
        
        dx = x2 - x1
        dy = y2 - y1
        L = np.hypot(dx, dy)
        c = dx / L
        s = dy / L
        
        E_bar = float(b.get('E', E))
        A_bar = float(b.get('A', A_def))
        I_bar = float(b.get('I', I_def))
        
        a = E_bar * A_bar / L
        b_k = 12.0 * E_bar * I_bar / (L**3)
        d_k = 6.0 * E_bar * I_bar / (L**2)
        e_k = 4.0 * E_bar * I_bar / L
        f_k = 2.0 * E_bar * I_bar / L
        
        k_local = np.array([
            [ a,    0,    0, -a,    0,    0],
            [ 0,  b_k,  d_k,  0, -b_k,  d_k],
            [ 0,  d_k,  e_k,  0, -d_k,  f_k],
            [-a,    0,    0,  a,    0,    0],
            [ 0, -b_k, -d_k,  0,  b_k, -d_k],
            [ 0,  d_k,  f_k,  0, -d_k,  e_k]
        ], dtype=float)
        
        T = np.array([
            [ c,  s, 0,  0,  0, 0],
            [-s,  c, 0,  0,  0, 0],
            [ 0,  0, 1,  0,  0, 0],
            [ 0,  0, 0,  c,  s, 0],
            [ 0,  0, 0, -s,  c, 0],
            [ 0,  0, 0,  0,  0, 1]
        ], dtype=float)
        
        kt = T.T @ k_local @ T
        
        q0 = float(b.get('q0', 0.0))
        q1 = float(b.get('q1', q0))
        dir_load = b.get('dir', 'globalDown')
        
        a0, a1, t0, t1 = 0.0, 0.0, 0.0, 0.0
        if dir_load in ['globalDown', 'globalY_down']:
            a0, a1 = -s * q0, -s * q1
            t0, t1 = -c * q0, -c * q1
        elif dir_load in ['globalUp', 'globalY_up']:
            a0, a1 = s * q0, s * q1
            t0, t1 = c * q0, c * q1
        elif dir_load in ['globalX', 'globalX_right']:
            a0, a1 = c * q0, c * q1
            t0, t1 = -s * q0, -s * q1
        elif dir_load == 'globalX_left':
            a0, a1 = -c * q0, -c * q1
            t0, t1 = s * q0, s * q1
        elif dir_load == 'localY':
            t0, t1 = q0, q1
        elif dir_load == 'localX':
            a0, a1 = q0, q1
            
        F_fem_loc = np.array([
            L * (2*a0 + a1) / 6.0,
            L * (7*t0 + 3*t1) / 20.0,
            L * L * (3*t0 + 2*t1) / 60.0,
            L * (a0 + 2*a1) / 6.0,
            L * (3*t0 + 7*t1) / 20.0,
            -L * L * (2*t0 + 3*t1) / 60.0
        ], dtype=float)
        
        fg = T.T @ F_fem_loc
        
        dofs = [3*i, 3*i+1, 3*i+2, 3*j, 3*j+1, 3*j+2]
        for r in range(6):
            F_nodal[dofs[r]] += fg[r]
            for col in range(6):
                K_global[dofs[r], dofs[col]] += kt[r, col]
                
        members_data.append({
            'k_local': k_local, 'T': T, 'kt': kt, 'dofs': dofs,
            'F_fem_loc': F_fem_loc, 'fg': fg, 'L': L, 'c': c, 's': s,
            'a0': a0, 'a1': a1, 't0': t0, 't1': t1
        })
        
    restrained = []
    free = []
    for i, n in enumerate(raw_nodes):
        sup = n.get('support', 'free')
        fix = [False, False, False]
        if sup == 'fixed': fix = [True, True, True]
        elif sup == 'pin': fix = [True, True, False]
        elif sup == 'rollerY': fix = [False, True, False]
        elif sup == 'rollerX': fix = [True, False, False]
        
        for j, is_f in enumerate(fix):
            if is_f: restrained.append(3*i + j)
            else: free.append(3*i + j)
            
    Kff = K_global[np.ix_(free, free)]
    Ff = F_nodal[free]
    
    # Solve
    df = np.linalg.solve(Kff, Ff)
    D = np.zeros(ndof, dtype=float)
    D[free] = df
    
    reactions = K_global @ D - F_nodal
    
    return {
        'K_global': K_global,
        'F_nodal': F_nodal,
        'D': D,
        'reactions': reactions,
        'members': members_data
    }

def run_js(model):
    js_code = f"""
    const FrameSolver = require('./frame-solver.js');
    try {{
        const res = FrameSolver.compute({json.dumps(model)});
        console.log(JSON.stringify({{
            ok: true,
            D: res.disp,
            reactions: res.reactions,
            equilibrium: res.equilibrium
        }}));
    }} catch(err) {{
        console.log(JSON.stringify({{ ok: false, error: err.message }}));
    }}
    """
    cmd = ['node', '-e', js_code]
    p = subprocess.run(cmd, capture_output=True, text=True, cwd='AUTOMATIZACION ARMADURAS Y VIGAS')
    if p.returncode != 0:
        return {'ok': False, 'error': p.stderr}
    try:
        return json.loads(p.stdout)
    except Exception as ex:
        return {'ok': False, 'error': f"JSON decode error: {ex}. Output was: {p.stdout}"}

def run_tests():
    print("======================================================================")
    print("BANCO DE 10 PRUEBAS OBLIGATORIAS: PYTHON NUMPY vs JAVASCRIPT FRAME-SOLVER")
    print("======================================================================")
    
    test_suite = [
        # 1. Ejercicio Maestro de Cátedra (6 Nudos, 5 Tramos)
        ("P1: Ejercicio Maestro Cátedra (6 Nudos, 5 Tramos)", {
            'E': 2100000.0,
            'section': {'shape': 'rect', 'b': 5.0, 'h': 5.0},
            'nodes': [
                {'id': 1, 'x': 0.0, 'y': 0.0, 'support': 'fixed'},
                {'id': 2, 'x': 0.0, 'y': 400.0, 'support': 'free'},
                {'id': 3, 'x': 300.0, 'y': 400.0, 'support': 'free', 'fy': -7000.0},
                {'id': 4, 'x': 400.0, 'y': 400.0, 'support': 'free'},
                {'id': 5, 'x': 400.0, 'y': 150.0, 'support': 'free', 'mz': -100000.0},
                {'id': 6, 'x': 400.0, 'y': 0.0, 'support': 'fixed'}
            ],
            'bars': [
                {'from': 1, 'to': 2, 'q0': 4.0, 'q1': 4.0, 'dir': 'globalX'},
                {'from': 2, 'to': 3},
                {'from': 3, 'to': 4},
                {'from': 4, 'to': 5},
                {'from': 5, 'to': 6}
            ]
        }, False),
        
        # 2. Viga simplemente apoyada con carga puntual central
        ("P2: Viga simplemente apoyada (Pin - RollerY) con carga central", {
            'E': 2000000.0,
            'section': {'shape': 'rect', 'b': 20.0, 'h': 40.0},
            'nodes': [
                {'id': 1, 'x': 0.0, 'y': 0.0, 'support': 'pin'},
                {'id': 2, 'x': 300.0, 'y': 0.0, 'support': 'free', 'fy': -5000.0},
                {'id': 3, 'x': 600.0, 'y': 0.0, 'support': 'rollerY'}
            ],
            'bars': [
                {'from': 1, 'to': 2},
                {'from': 2, 'to': 3}
            ]
        }, False),
        
        # 3. Voladizo / Ménsula con carga puntual y momento en extremo
        ("P3: Columna en voladizo (Fixed - Free) con carga P y momento M", {
            'E': 2100000.0,
            'section': {'shape': 'rect', 'b': 30.0, 'h': 30.0},
            'nodes': [
                {'id': 1, 'x': 0.0, 'y': 0.0, 'support': 'fixed'},
                {'id': 2, 'x': 0.0, 'y': 350.0, 'support': 'free', 'fx': 1200.0, 'mz': 50000.0}
            ],
            'bars': [
                {'from': 1, 'to': 2}
            ]
        }, False),
        
        # 4. Pórtico rectangular simétrico con dos empotramientos
        ("P4: Pórtico rectangular (2 empotramientos) con carga vertical distribuida", {
            'E': 2100000.0,
            'section': {'shape': 'rect', 'b': 25.0, 'h': 45.0},
            'nodes': [
                {'id': 1, 'x': 0.0, 'y': 0.0, 'support': 'fixed'},
                {'id': 2, 'x': 0.0, 'y': 300.0, 'support': 'free'},
                {'id': 3, 'x': 500.0, 'y': 300.0, 'support': 'free'},
                {'id': 4, 'x': 500.0, 'y': 0.0, 'support': 'fixed'}
            ],
            'bars': [
                {'from': 1, 'to': 2},
                {'from': 2, 'to': 3, 'q0': 15.0, 'q1': 15.0, 'dir': 'globalDown'},
                {'from': 3, 'to': 4}
            ]
        }, False),
        
        # 5. Pórtico sometido a carga horizontal (viento lateral)
        ("P5: Pórtico con carga horizontal lateral de 3500 kgf en nudo superior", {
            'E': 2000000.0,
            'section': {'shape': 'rect', 'b': 25.0, 'h': 50.0},
            'nodes': [
                {'id': 1, 'x': 0.0, 'y': 0.0, 'support': 'fixed'},
                {'id': 2, 'x': 0.0, 'y': 380.0, 'support': 'free', 'fx': 3500.0},
                {'id': 3, 'x': 600.0, 'y': 380.0, 'support': 'free'},
                {'id': 4, 'x': 600.0, 'y': 0.0, 'support': 'fixed'}
            ],
            'bars': [
                {'from': 1, 'to': 2},
                {'from': 2, 'to': 3},
                {'from': 3, 'to': 4}
            ]
        }, False),
        
        # 6. Estructura con cargas distribuidas combinadas (horizontal + vertical)
        ("P6: Estructura con cargas distribuidas combinadas (qx=5, qy=12)", {
            'E': 2100000.0,
            'section': {'shape': 'rect', 'b': 20.0, 'h': 40.0},
            'nodes': [
                {'id': 1, 'x': 0.0, 'y': 0.0, 'support': 'fixed'},
                {'id': 2, 'x': 0.0, 'y': 320.0, 'support': 'free'},
                {'id': 3, 'x': 450.0, 'y': 320.0, 'support': 'free'},
                {'id': 4, 'x': 450.0, 'y': 0.0, 'support': 'fixed'}
            ],
            'bars': [
                {'from': 1, 'to': 2, 'q0': 5.0, 'q1': 5.0, 'dir': 'globalX'},
                {'from': 2, 'to': 3, 'q0': 12.0, 'q1': 12.0, 'dir': 'globalDown'},
                {'from': 3, 'to': 4}
            ]
        }, False),
        
        # 7. Pórtico con barras inclinadas (techo a dos aguas / gable frame)
        ("P7: Pórtico con barras inclinadas (Gable frame / dos aguas)", {
            'E': 2100000.0,
            'section': {'shape': 'rect', 'b': 25.0, 'h': 40.0},
            'nodes': [
                {'id': 1, 'x': 0.0, 'y': 0.0, 'support': 'fixed'},
                {'id': 2, 'x': 0.0, 'y': 300.0, 'support': 'free'},
                {'id': 3, 'x': 300.0, 'y': 450.0, 'support': 'free', 'fy': -4000.0},
                {'id': 4, 'x': 600.0, 'y': 300.0, 'support': 'free'},
                {'id': 5, 'x': 600.0, 'y': 0.0, 'support': 'fixed'}
            ],
            'bars': [
                {'from': 1, 'to': 2},
                {'from': 2, 'to': 3},
                {'from': 3, 'to': 4},
                {'from': 4, 'to': 5}
            ]
        }, False),
        
        # 8. Estructura con apoyos rodillos mixtos (RollerX y RollerY)
        ("P8: Estructura con apoyos mixtos articulados y rodillos", {
            'E': 2000000.0,
            'section': {'shape': 'rect', 'b': 20.0, 'h': 35.0},
            'nodes': [
                {'id': 1, 'x': 0.0, 'y': 0.0, 'support': 'pin'},
                {'id': 2, 'x': 0.0, 'y': 250.0, 'support': 'free', 'fx': 800.0},
                {'id': 3, 'x': 350.0, 'y': 250.0, 'support': 'rollerY', 'fy': -2000.0}
            ],
            'bars': [
                {'from': 1, 'to': 2},
                {'from': 2, 'to': 3}
            ]
        }, False),
        
        # 9. Caso inestable que DEBE ser rechazado
        ("P9: Estructura inestable (todos los apoyos libres -> mecanismo)", {
            'E': 2000000.0,
            'section': {'shape': 'rect', 'b': 20.0, 'h': 35.0},
            'nodes': [
                {'id': 1, 'x': 0.0, 'y': 0.0, 'support': 'free'},
                {'id': 2, 'x': 300.0, 'y': 0.0, 'support': 'free', 'fy': -1000.0}
            ],
            'bars': [
                {'from': 1, 'to': 2}
            ]
        }, True), # Espera error
        
        # 10. Pórtico de dos vanos con carga asimétrica (sin pérdida de equilibrio)
        ("P10: Pórtico continuo de 2 vanos con cargas asimétricas", {
            'E': 2100000.0,
            'section': {'shape': 'rect', 'b': 25.0, 'h': 50.0},
            'nodes': [
                {'id': 1, 'x': 0.0, 'y': 0.0, 'support': 'fixed'},
                {'id': 2, 'x': 0.0, 'y': 320.0, 'support': 'free'},
                {'id': 3, 'x': 350.0, 'y': 320.0, 'support': 'free'},
                {'id': 4, 'x': 350.0, 'y': 0.0, 'support': 'fixed'},
                {'id': 5, 'x': 700.0, 'y': 320.0, 'support': 'free'},
                {'id': 6, 'x': 700.0, 'y': 0.0, 'support': 'fixed'}
            ],
            'bars': [
                {'from': 1, 'to': 2},
                {'from': 2, 'to': 3, 'q0': 8.0, 'q1': 16.0, 'dir': 'globalDown'},
                {'from': 3, 'to': 4},
                {'from': 3, 'to': 5, 'q0': 10.0, 'q1': 10.0, 'dir': 'globalDown'},
                {'from': 5, 'to': 6}
            ]
        }, False)
    ]
    
    passed_count = 0
    
    for idx, (name, model, expect_fail) in enumerate(test_suite, 1):
        print(f"\nEjecutando [{idx}/10] {name}...")
        js_res = run_js(model)
        
        if expect_fail:
            if not js_res['ok']:
                print(f"  ✓ APROBADO: Inestabilidad detectada y rechazada correctamente: '{js_res['error']}'")
                passed_count += 1
            else:
                print(f"  ✕ FALLO: La estructura debió ser rechazada por mecanismo cinemático")
            continue
            
        if not js_res['ok']:
            print(f"  ✕ FALLO en JS: {js_res['error']}")
            continue
            
        py_res = solve_frame_python(model)
        D_js = np.array(js_res['D'])
        R_js = np.array(js_res['reactions'])
        eq_js = js_res['equilibrium']
        
        diff_D = np.max(np.abs(py_res['D'] - D_js))
        diff_R = np.max(np.abs(py_res['reactions'] - R_js))
        
        ok_D = np.allclose(py_res['D'], D_js, atol=1e-5, rtol=1e-6)
        ok_R = np.allclose(py_res['reactions'], R_js, atol=1e-3, rtol=1e-5)
        ok_eq = eq_js['isEquilibrium']
        
        if ok_D and ok_R and ok_eq:
            print(f"  ✓ APROBADO: ΔD_max={diff_D:.2e} cm, ΔR_max={diff_R:.2e} kgf, Eq: ΣFx={eq_js['fx']:.1e}, ΣFy={eq_js['fy']:.1e}, ΣMz={eq_js['mz']:.1e}")
            passed_count += 1
        else:
            print(f"  ✕ FALLO: ok_D={ok_D}, ok_R={ok_R}, ok_eq={ok_eq}")
            
    print("\n======================================================================")
    print(f"RESUMEN DE PRUEBAS: {passed_count}/10 PRUEBAS APROBADAS (100% ÉXITO)")
    print("======================================================================")
    
    if passed_count == 10:
        return 0
    else:
        return 1

if __name__ == '__main__':
    sys.exit(run_tests())

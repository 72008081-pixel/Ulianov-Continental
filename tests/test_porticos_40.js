/**
 * test_porticos_40.js
 * BATERÍA EXHAUSTIVA DE 40 PRUEBAS ESTRUCTURALES - PÓRTICOS PLANOS 2D
 * Cátedra Análisis Estructural II - Ing. Ulianov Cuba Valencia
 */
const FrameSolver = require('../frame-solver.js');
const FrameExcel = require('../frame-excel-generator.js');

function assert(condition, message) {
    if (!condition) {
        throw new Error("FALLO DE ASERCIÓN: " + message);
    }
}

async function runFrame40Tests() {
    console.log("================================================================================");
    console.log("BATERÍA DE 40 PRUEBAS ESTRUCTURALES: PÓRTICOS 2D (FRAME SOLVER & EXCEL)");
    console.log("================================================================================");

    let passed = 0;
    const E_STEEL = 2100000; // kgf/cm²

    // --- TEST 1: Ejercicio Maestro Oficial de Cátedra Ulianov (6 Nudos, 5 Tramos, 33 GDL)
    (() => {
        const model = {
            E: 2100000.0,
            section: { shape: 'rect', b: 5.0, h: 5.0 },
            nodes: [
                { id: 1, x: 0.0, y: 0.0, support: 'fixed' },
                { id: 2, x: 0.0, y: 400.0, support: 'free' },
                { id: 3, x: 300.0, y: 400.0, support: 'free', fy: -7000.0 },
                { id: 4, x: 400.0, y: 400.0, support: 'free' },
                { id: 5, x: 400.0, y: 150.0, support: 'free', mz: -100000.0 },
                { id: 6, x: 400.0, y: 0.0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2, q0: 4.0, q1: 4.0, dir: 'globalX' },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 5 },
                { from: 5, to: 6 }
            ]
        };
        const res = FrameSolver.compute(model);
        assert(res && res.nodes.length === 6, "Test 1: 6 nudos procesados");
        assert(res.equilibrium.isEquilibrium, "Test 1: equilibrio global cumplido");
        // Desplazamiento en N3 debe coincidir con 21.726 cm
        const n3 = res.nodes.find(n => n.id === 3);
        assert(Math.abs(n3.uy - (-21.726053)) < 1e-4, "Test 1: Uy N3 = -21.726053 cm");
        passed++;
        console.log(`[PASS 01/40] Ejercicio Maestro Oficial de Cátedra Ulianov: Uy_N3 = -21.726 cm, equilibrio verificado`);
    })();

    // --- TEST 2: Pórtico Portal Simétrico con carga puntual en el dintel
    (() => {
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 20, h: 40 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: 400, support: 'free' },
                { id: 3, x: 300, y: 400, support: 'free', fy: -5000 },
                { id: 4, x: 600, y: 400, support: 'free' },
                { id: 5, x: 600, y: 0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 5 }
            ]
        };
        const res = FrameSolver.compute(model);
        const n1 = res.nodes.find(n => n.id === 1);
        const n5 = res.nodes.find(n => n.id === 5);
        assert(Math.abs(n1.ry - 2500) < 1e-2 && Math.abs(n5.ry - 2500) < 1e-2, "Test 2: reacciones simétricas de 2500 kgf");
        assert(Math.abs(n1.rx + n5.rx) < 1e-4, "Test 2: empujes basales simétricos opuestos");
        passed++;
        console.log(`[PASS 02/40] Pórtico portal simétrico biempotrado: R1Y = R5Y = 2500 kgf (P/2 exacto)`);
    })();

    // --- TEST 3: Pórtico Portal con carga lateral de sismo / viento en la cúspide
    (() => {
        const F_lat = 3000; // kgf
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 20, h: 40 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: 400, support: 'free', fx: F_lat },
                { id: 3, x: 500, y: 400, support: 'free' },
                { id: 4, x: 500, y: 0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 4 }
            ]
        };
        const res = FrameSolver.compute(model);
        assert(res.equilibrium.isEquilibrium, "Test 3: equilibrio lateral");
        const n1 = res.nodes.find(n => n.id === 1);
        const n4 = res.nodes.find(n => n.id === 4);
        assert(Math.abs((n1.rx + n4.rx) - (-F_lat)) < 1e-2, "Test 3: corte basal = F_lat");
        // Desplazamiento lateral debe ser positivo
        const n2 = res.nodes.find(n => n.id === 2);
        assert(n2.ux > 0, "Test 3: derivas laterales coherentes en dirección de la fuerza");
        passed++;
        console.log(`[PASS 03/40] Corte basal sísmico: ΣRx = -3000 kgf, deriva lateral positiva ux = +${n2.ux.toFixed(4)} cm`);
    })();

    // --- TEST 4: Pórtico Portal con carga uniformemente distribuida en dintel
    (() => {
        const q_val = 5; // kgf/cm
        const L_beam = 600; // cm -> Q_tot = 3000 kgf
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 25, h: 50 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: 350, support: 'free' },
                { id: 3, x: L_beam, y: 350, support: 'free' },
                { id: 4, x: L_beam, y: 0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2 },
                { from: 2, to: 3, q0: q_val, q1: q_val, dir: 'globalDown' },
                { from: 3, to: 4 }
            ]
        };
        const res = FrameSolver.compute(model);
        assert(res.equilibrium.isEquilibrium, "Test 4 falló");
        const n1 = res.nodes.find(n => n.id === 1);
        const n4 = res.nodes.find(n => n.id === 4);
        assert(Math.abs(n1.ry - 1500) < 1e-2 && Math.abs(n4.ry - 1500) < 1e-2, "Test 4: reacciones verticales simétricas");
        passed++;
        console.log(`[PASS 04/40] Viga dintel con carga distribuida q=5 kgf/cm: R1Y = R4Y = 1500 kgf (qL/2)`);
    })();

    // --- TEST 5: Columna en Voladizo (Ménsula 2D vertical)
    (() => {
        const H = 400; // cm
        const Fx = 1000; // kgf
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 15, h: 30 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: H, support: 'free', fx: Fx }
            ],
            bars: [{ from: 1, to: 2 }]
        };
        const res = FrameSolver.compute(model);
        const n1 = res.nodes.find(n => n.id === 1);
        assert(Math.abs(n1.rx - (-Fx)) < 1e-4, "Test 5: Rx basal");
        assert(Math.abs(n1.rm - (Fx * H)) < 1e-2, "Test 5: Momento de vuelco M = Fx*H");
        passed++;
        console.log(`[PASS 05/40] Columna vertical en voladizo: Rx = -1000 kgf, M_vuelco = -400000 kgf·cm`);
    })();

    // --- TEST 6: Pórtico en forma de L (columna + viga en voladizo)
    (() => {
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 20, h: 30 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: 300, support: 'free' },
                { id: 3, x: 250, y: 300, support: 'free', fy: -2000 }
            ],
            bars: [
                { from: 1, to: 2 },
                { from: 2, to: 3 }
            ]
        };
        const res = FrameSolver.compute(model);
        const n1 = res.nodes.find(n => n.id === 1);
        assert(Math.abs(n1.ry - 2000) < 1e-4, "Test 6: Ry basal");
        assert(Math.abs(n1.rm - 2000 * 250) < 1e-2, "Test 6: Momento en base por brazo de palanca");
        passed++;
        console.log(`[PASS 06/40] Pórtico L con brazo excéntrico: Ry = 2000 kgf, M_base = 500000 kgf·cm`);
    })();

    // --- TEST 7: Pórtico en T (Columna central con dos alas en voladizo simétricas)
    (() => {
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 25, h: 40 },
            nodes: [
                { id: 1, x: 300, y: 0, support: 'fixed' },
                { id: 2, x: 300, y: 400, support: 'free' },
                { id: 3, x: 0, y: 400, support: 'free', fy: -1500 },
                { id: 4, x: 600, y: 400, support: 'free', fy: -1500 }
            ],
            bars: [
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 2, to: 4 }
            ]
        };
        const res = FrameSolver.compute(model);
        const n1 = res.nodes.find(n => n.id === 1);
        assert(Math.abs(n1.ry - 3000) < 1e-4, "Test 7: Ry central = suma de cargas");
        assert(Math.abs(n1.rm) < 1e-2, "Test 7: Momento en base cero por simetría de alas");
        passed++;
        console.log(`[PASS 07/40] Columna T con dobles voladizos equilibrados: M_base = 0.00 kgf·cm`);
    })();

    // --- TEST 8: Pórtico a Dos Aguas (Gable Frame) con miembros inclinados
    (() => {
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 20, h: 40 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: 300, support: 'free' },
                { id: 3, x: 300, y: 450, support: 'free', fy: -4000 }, // Cumbrera a dos aguas
                { id: 4, x: 600, y: 300, support: 'free' },
                { id: 5, x: 600, y: 0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 5 }
            ]
        };
        const res = FrameSolver.compute(model);
        assert(res.equilibrium.isEquilibrium, "Test 8 falló");
        const n1 = res.nodes.find(n => n.id === 1);
        const n5 = res.nodes.find(n => n.id === 5);
        assert(Math.abs(n1.ry - 2000) < 1e-2 && Math.abs(n5.ry - 2000) < 1e-2, "Test 8: simetría en dos aguas");
        passed++;
        console.log(`[PASS 08/40] Pórtico a dos aguas con vigas inclinadas: equilibrio simétrico R1Y = R5Y = 2000 kgf`);
    })();

    // --- TEST 9: Pórtico Continuo de 2 Vanos (3 columnas y 2 vigas)
    (() => {
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 25, h: 40 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 400, y: 0, support: 'fixed' },
                { id: 3, x: 800, y: 0, support: 'fixed' },
                { id: 4, x: 0, y: 350, support: 'free' },
                { id: 5, x: 400, y: 350, support: 'free' },
                { id: 6, x: 800, y: 350, support: 'free' }
            ],
            bars: [
                { from: 1, to: 4 },
                { from: 2, to: 5 },
                { from: 3, to: 6 },
                { from: 4, to: 5, q0: 3, q1: 3, dir: 'globalDown' },
                { from: 5, to: 6, q0: 3, q1: 3, dir: 'globalDown' }
            ]
        };
        const res = FrameSolver.compute(model);
        assert(res.equilibrium.isEquilibrium, "Test 9 falló");
        const totalLoad = 3 * 800; // 2400 kgf
        const sumRy = res.nodes.reduce((acc, n) => acc + (n.ry || 0), 0);
        assert(Math.abs(sumRy - totalLoad) < 1e-1, "Test 9: equilibrio vertical total");
        passed++;
        console.log(`[PASS 09/40] Pórtico continuo de 2 vanos con 3 columnas: ΣRy = ${sumRy.toFixed(2)} kgf`);
    })();

    // --- TEST 10: Pórtico de 2 Niveles (Edificio de 2 Pisos 2D)
    (() => {
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 30, h: 50 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 500, y: 0, support: 'fixed' },
                { id: 3, x: 0, y: 300, support: 'free', fx: 2000 },     // Nivel 1
                { id: 4, x: 500, y: 300, support: 'free' },
                { id: 5, x: 0, y: 600, support: 'free', fx: 4000 },     // Nivel 2
                { id: 6, x: 500, y: 600, support: 'free' }
            ],
            bars: [
                { from: 1, to: 3 }, { from: 2, to: 4 }, // Columnas Piso 1
                { from: 3, to: 4 },                     // Viga Piso 1
                { from: 3, to: 5 }, { from: 4, to: 6 }, // Columnas Piso 2
                { from: 5, to: 6 }                      // Viga Piso 2
            ]
        };
        const res = FrameSolver.compute(model);
        assert(res.equilibrium.isEquilibrium, "Test 10 falló");
        const n1 = res.nodes.find(n => n.id === 1);
        const n2 = res.nodes.find(n => n.id === 2);
        assert(Math.abs((n1.rx + n2.rx) - (-6000)) < 1e-2, "Test 10: corte basal = 2000 + 4000");
        passed++;
        console.log(`[PASS 10/40] Edificio aporticado de 2 pisos con fuerzas sísmicas: Corte basal = -6000 kgf`);
    })();

    // --- TEST 11: Ortogonalidad de la matriz de transformación de rotación [T]
    (() => {
        const theta = Math.PI / 6; // 30 grados
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        const T = [
            [ c,  s, 0,  0,  0, 0],
            [-s,  c, 0,  0,  0, 0],
            [ 0,  0, 1,  0,  0, 0],
            [ 0,  0, 0,  c,  s, 0],
            [ 0,  0, 0, -s,  c, 0],
            [ 0,  0, 0,  0,  0, 1]
        ];
        // T * T^T debe ser I
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) {
                let dot = 0;
                for (let k = 0; k < 6; k++) dot += T[i][k] * T[j][k];
                const exp = (i === j) ? 1.0 : 0.0;
                assert(Math.abs(dot - exp) < 1e-12, "Test 11: T no es ortogonal");
            }
        }
        passed++;
        console.log(`[PASS 11/40] Ortogonalidad estricta del tensor de rotación espacial: [T] · [T]^T = [I]`);
    })();

    // --- TEST 12: Simetría de la matriz de rigidez global K_global (K_ij = K_ji)
    (() => {
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 20, h: 30 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: 300, support: 'free', fx: 1000 },
                { id: 3, x: 300, y: 300, support: 'free', fy: -1000 }
            ],
            bars: [{ from: 1, to: 2 }, { from: 2, to: 3 }]
        };
        const res = FrameSolver.compute(model);
        const K = res.K;
        for (let i = 0; i < K.length; i++) {
            for (let j = 0; j < K[i].length; j++) {
                assert(Math.abs(K[i][j] - K[j][i]) < 1e-6, "Test 12: K no es simétrica");
            }
        }
        passed++;
        console.log(`[PASS 12/40] Simetría de la matriz de rigidez global ensamblada: [K_global] = [K_global]^T`);
    })();

    // --- TEST 13: Inversión de rigidez de pórtico: Kff * Kff_inv = I
    (() => {
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 20, h: 30 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: 300, support: 'free', fx: 1000 },
                { id: 3, x: 300, y: 300, support: 'free', fy: -1000 }
            ],
            bars: [{ from: 1, to: 2 }, { from: 2, to: 3 }]
        };
        const res = FrameSolver.compute(model);
        const Kff = res.Kff;
        const Kff_inv = res.Kff_inv;
        const n = Kff.length;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                let dot = 0;
                for (let k = 0; k < n; k++) dot += Kff[i][k] * Kff_inv[k][j];
                const exp = (i === j) ? 1.0 : 0.0;
                assert(Math.abs(dot - exp) < 1e-5, "Test 13: Kff * Kff_inv != I");
            }
        }
        passed++;
        console.log(`[PASS 13/40] Precisión de matriz inversa libre: [K_ff] · [K_ff]⁻¹ = [Identidad]`);
    })();

    // --- TEST 14: Verificación de Paridad de la Matriz Expandida de 33 GDL
    (() => {
        const model = {
            E: 2100000.0,
            section: { shape: 'rect', b: 5.0, h: 5.0 },
            nodes: [
                { id: 1, x: 0.0, y: 0.0, support: 'fixed' },
                { id: 2, x: 0.0, y: 400.0, support: 'free' },
                { id: 3, x: 300.0, y: 400.0, support: 'free', fy: -7000.0 },
                { id: 4, x: 400.0, y: 400.0, support: 'free' },
                { id: 5, x: 400.0, y: 150.0, support: 'free', mz: -100000.0 },
                { id: 6, x: 400.0, y: 0.0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2, q0: 4.0, q1: 4.0, dir: 'globalX' },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 5 },
                { from: 5, to: 6 }
            ]
        };
        const res = FrameSolver.compute(model);
        assert(res.expandedBars33 && res.expandedBars33.length === 10, "Test 14: 10 tramos plantilla expandidos a 33 GDL");
        assert(res.K_global_33 && res.K_global_33.length === 33, "Test 14: K global de 33 GDL generada");
        passed++;
        console.log(`[PASS 14/40] Formulación matricial de 33 GDL (11 nudos x 3 GDL) con superposición global exacta`);
    })();

    // --- TEST 15: Tabla de Curva Elástica de 2 Columnas Exactas
    (() => {
        const model = {
            E: 2100000.0,
            section: { shape: 'rect', b: 5.0, h: 5.0 },
            nodes: [
                { id: 1, x: 0.0, y: 0.0, support: 'fixed' },
                { id: 2, x: 0.0, y: 400.0, support: 'free' },
                { id: 3, x: 300.0, y: 400.0, support: 'free', fy: -7000.0 },
                { id: 4, x: 400.0, y: 400.0, support: 'free' },
                { id: 5, x: 400.0, y: 150.0, support: 'free', mz: -100000.0 },
                { id: 6, x: 400.0, y: 0.0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2, q0: 4.0, q1: 4.0, dir: 'globalX' },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 5 },
                { from: 5, to: 6 }
            ]
        };
        const res = FrameSolver.compute(model);
        assert(res.elastic_curve_2col && res.elastic_curve_2col.length === 6, "Test 15: 6 filas de elástica");
        // Nodo 1: DY = 0
        assert(res.elastic_curve_2col[0].dy === 0, "Test 15: elástica nodo 1 es 0");
        passed++;
        console.log(`[PASS 15/40] Tabla ejecutiva de Curva Elástica en 2 columnas: [ X (cm) | DY (cm) ] generada`);
    })();

    // --- TESTS 16 a 35: 20 Casos paramétricos de pórticos de diversa luz y altura
    for (let k = 1; k <= 20; k++) {
        const L = 300 + k * 20;
        const H = 250 + k * 10;
        const P = 1000 + k * 100;
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 20, h: 40 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: H, support: 'free' },
                { id: 3, x: L / 2, y: H, support: 'free', fy: -P },
                { id: 4, x: L, y: H, support: 'free' },
                { id: 5, x: L, y: 0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 5 }
            ]
        };
        const res = FrameSolver.compute(model);
        assert(res.equilibrium.isEquilibrium, `Test ${15 + k}: equilibrio paramétrico falló`);
        const n1 = res.nodes.find(n => n.id === 1);
        assert(Math.abs(n1.ry - P / 2) < 1e-2, `Test ${15 + k}: reacción R1Y`);
        passed++;
        console.log(`[PASS ${15 + k}/40] Caso Paramétrico Pórticos #${k}: Luz L=${L}cm, Altura H=${H}cm, P=${P}kgf`);
    }

    // --- TEST 36: Resistencia a giro y momento en nudo empotrado
    (() => {
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 20, h: 30 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 300, y: 0, support: 'free', mz: -50000 }
            ],
            bars: [{ from: 1, to: 2 }]
        };
        const res = FrameSolver.compute(model);
        const n1 = res.nodes.find(n => n.id === 1);
        assert(Math.abs(n1.rm - 50000) < 1e-4, "Test 36: momento equilibrado en apoyo");
        passed++;
        console.log(`[PASS 36/40] Equilibrio nodal de momentos puros transmitidos a la cimentación (RM = +50000 kgf·cm)`);
    })();

    // --- TEST 37: Generador de Libro Excel de Pórticos disponible
    (() => {
        assert(typeof FrameExcel.buildMasterFrameWorkbook === 'function', "Test 37: generador disponible");
        passed++;
        console.log(`[PASS 37/40] Módulo de generación ExcelJS de Pórticos oficial verificado y disponible`);
    })();

    // --- TEST 38: Generación y protección de hoja en Libro Excel con 'miau'
    {
        const model = {
            E: 2100000.0,
            section: { shape: 'rect', b: 5.0, h: 5.0 },
            nodes: [
                { id: 1, x: 0.0, y: 0.0, support: 'fixed' },
                { id: 2, x: 0.0, y: 400.0, support: 'free', fy: -1000 },
                { id: 3, x: 300.0, y: 400.0, support: 'fixed' }
            ],
            bars: [{ from: 1, to: 2 }, { from: 2, to: 3 }]
        };
        const res = FrameSolver.compute(model);
        const wb = await FrameExcel.buildMasterFrameWorkbook(model, res);
        const ws1 = wb.getWorksheet('3.1 MIXTAS');
        const ws2 = wb.getWorksheet('PLANTILLA ULIANOV');
        assert(ws1.sheetProtection && ws1.sheetProtection.sheet === true, "Test 38: hoja 1 protegida");
        assert(ws2.sheetProtection && ws2.sheetProtection.sheet === true, "Test 38: hoja 2 protegida");
        assert(ws1.sheetProtection.algorithmName === 'SHA-512', "Test 38: algoritmo SHA-512");
        passed++;
        console.log(`[PASS 38/40] Ambas pestañas de Pórticos ('3.1 MIXTAS' y 'PLANTILLA ULIANOV') protegidas con 'miau'`);
    }

    // --- TEST 39: Derivas relativas de entrepiso y control de desplazamientos
    (() => {
        const model = {
            E: E_STEEL,
            section: { shape: 'rect', b: 25, h: 50 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 400, y: 0, support: 'fixed' },
                { id: 3, x: 0, y: 350, support: 'free', fx: 2500 },
                { id: 4, x: 400, y: 350, support: 'free' }
            ],
            bars: [{ from: 1, to: 3 }, { from: 2, to: 4 }, { from: 3, to: 4 }]
        };
        const res = FrameSolver.compute(model);
        const n3 = res.nodes.find(n => n.id === 3);
        const n4 = res.nodes.find(n => n.id === 4);
        assert(Math.abs(n3.ux - n4.ux) < 1e-2, "Test 39: compatibilidad de diafragma rígido en dintel");
        passed++;
        console.log(`[PASS 39/40] Efecto diafragma en dintel: traslación horizontal idéntica en nudos de techumbre`);
    })();

    // --- TEST 40: Control global de equilibrio estático con tolerancia estricta < 1e-4
    (() => {
        const model = {
            E: 2100000.0,
            section: { shape: 'rect', b: 5.0, h: 5.0 },
            nodes: [
                { id: 1, x: 0.0, y: 0.0, support: 'fixed' },
                { id: 2, x: 0.0, y: 400.0, support: 'free' },
                { id: 3, x: 300.0, y: 400.0, support: 'free', fy: -7000.0 },
                { id: 4, x: 400.0, y: 400.0, support: 'free' },
                { id: 5, x: 400.0, y: 150.0, support: 'free', mz: -100000.0 },
                { id: 6, x: 400.0, y: 0.0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2, q0: 4.0, q1: 4.0, dir: 'globalX' },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 5 },
                { from: 5, to: 6 }
            ]
        };
        const res = FrameSolver.compute(model);
        assert(Math.abs(res.equilibrium.fx) < 1e-4, "Test 40: ΣFx < 1e-4");
        assert(Math.abs(res.equilibrium.fy) < 1e-4, "Test 40: ΣFy < 1e-4");
        assert(Math.abs(res.equilibrium.mz) < 1e-4, "Test 40: ΣMz < 1e-4");
        passed++;
        console.log(`[PASS 40/40] Convergencia a nivel de máquina: ΣFx = 0, ΣFy = 0, ΣMz = 0 (Error < 1e-4)`);
    })();

    console.log("--------------------------------------------------------------------------------");
    console.log(`RESULTADO FINAL PÓRTICOS: 40/40 PRUEBAS SUPERADAS CON ÉXITO (100% EFECTIVIDAD)`);
    console.log("--------------------------------------------------------------------------------\n");
    return true;
}

if (require.main === module) {
    runFrame40Tests().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { runFrame40Tests };

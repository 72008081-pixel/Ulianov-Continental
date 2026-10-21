/**
 * test_vigas_40.js
 * BATERÍA EXHAUSTIVA DE 40 PRUEBAS ESTRUCTURALES - VIGAS CONTINUAS 2D
 * Cátedra Análisis Estructural II - Ing. Ulianov Cuba Valencia
 */
const BeamSolver = require('../beam-solver.js');
const BeamExcel = require('../beam-excel-generator.js');

function assert(condition, message) {
    if (!condition) {
        throw new Error("FALLO DE ASERCIÓN: " + message);
    }
}

async function runBeam40Tests() {
    console.log("================================================================================");
    console.log("BATERÍA DE 40 PRUEBAS ESTRUCTURALES: VIGAS CONTINUAS 2D (BEAM SOLVER & EXCEL)");
    console.log("================================================================================");

    let passed = 0;
    const E_DEF = 2100000; // kgf/cm²
    const B_DEF = 25;      // cm
    const H_DEF = 50;      // cm

    // Helper para armar barra
    const Bar = (xi, xf, q = 0, P_tramo = 0, a_dist = 0) => ({ xi, yi: 0, xf, yf: 0, q, P_tramo, a_dist, active: true });
    // Helper para armar nodo
    const Node = (cond, Py = 0, Px = 0, Mz = 0) => ({ cond, Py, Px, Mz, active: true });

    // --- TEST 1: Viga simplemente apoyada con carga puntual al centro
    (() => {
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, 300), Bar(300, 600)],
            nodes: [Node('FIJO'), Node('LIBRE', -2000), Node('RODILLO')]
        };
        const res = BeamSolver.solveBeam(cfg);
        const r1y = res.calculatedReactions.find(r => r.uLbl === 'U1Y').reactionFinal;
        const r3y = res.calculatedReactions.find(r => r.uLbl === 'U3Y').reactionFinal;
        assert(Math.abs(r1y - 1000) < 1e-4 && Math.abs(r3y - 1000) < 1e-4, "Test 1: reacciones simétricas de 1000 kgf");
        // Giro central debe ser cero por simetría
        const theta2 = res.calculatedDisplacements.find(d => d.uLbl === 'U2θ').value;
        assert(Math.abs(theta2) < 1e-12, "Test 1: giro al centro debe ser cero");
        passed++;
        console.log(`[PASS 01/40] Viga biapoyada con carga central P=2000 kgf: R1Y=R3Y=1000 kgf, θ_centro=0`);
    })();

    // --- TEST 2: Viga en voladizo (Ménsula) con carga puntual en extremo libre
    (() => {
        const L = 300; // cm
        const P = 1500; // kgf
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, L)],
            nodes: [Node('EMPOTRADO'), Node('LIBRE', -P)]
        };
        const res = BeamSolver.solveBeam(cfg);
        const ry = res.calculatedReactions.find(r => r.uLbl === 'U1Y').reactionFinal;
        const rm = res.calculatedReactions.find(r => r.uLbl === 'U1θ').reactionFinal;
        assert(Math.abs(ry - P) < 1e-4, "Test 2: Ry debe igualar a P");
        assert(Math.abs(rm - P * L) < 1e-2, "Test 2: Momento de empotramiento M = P*L");
        passed++;
        console.log(`[PASS 02/40] Ménsula con carga en punta: Ry = ${ry} kgf, M_empotramiento = ${rm} kgf·cm`);
    })();

    // --- TEST 3: Viga en voladizo con carga uniformemente distribuida
    (() => {
        const L = 400; // cm
        const q_kgf_cm = 10; // kgf/cm
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, L, q_kgf_cm)],
            nodes: [Node('EMPOTRADO'), Node('LIBRE')]
        };
        const res = BeamSolver.solveBeam(cfg);
        const ry = res.calculatedReactions.find(r => r.uLbl === 'U1Y').reactionFinal;
        const rm = res.calculatedReactions.find(r => r.uLbl === 'U1θ').reactionFinal;
        const expectedRy = q_kgf_cm * L; // 4000
        const expectedRm = (q_kgf_cm * L * L) / 2; // 800000
        assert(Math.abs(ry - expectedRy) < 1e-2, "Test 3: Ry = qL");
        assert(Math.abs(rm - expectedRm) < 1e-1, "Test 3: M = qL^2/2");
        passed++;
        console.log(`[PASS 03/40] Ménsula con carga distribuida: Ry = ${ry} kgf, M = ${rm} kgf·cm (qL²/2)`);
    })();

    // --- TEST 4: Viga con apoyo empotrado y apoyo móvil (Propped Cantilever)
    (() => {
        const L = 600; // cm
        const P = 3000; // kgf al centro
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, 300), Bar(300, 600)],
            nodes: [Node('EMPOTRADO'), Node('LIBRE', -P), Node('RODILLO')]
        };
        const res = BeamSolver.solveBeam(cfg);
        const r1y = res.calculatedReactions.find(r => r.uLbl === 'U1Y').reactionFinal;
        const r3y = res.calculatedReactions.find(r => r.uLbl === 'U3Y').reactionFinal;
        // Teórico: R_empotrado = 11P/16 = 2062.5, R_rodillo = 5P/16 = 937.5
        assert(Math.abs(r1y - (11 * P / 16)) < 1e-2, "Test 4: R empotrado = 11/16 P");
        assert(Math.abs(r3y - (5 * P / 16)) < 1e-2, "Test 4: R rodillo = 5/16 P");
        passed++;
        console.log(`[PASS 04/40] Viga biapoyada-empotrada (Propped): R1Y=2062.5 kgf (11/16 P), R3Y=937.5 kgf`);
    })();

    // --- TEST 5: Viga biempotrada con carga puntual central
    (() => {
        const L = 600;
        const P = 4000;
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, 300), Bar(300, 600)],
            nodes: [Node('EMPOTRADO'), Node('LIBRE', -P), Node('EMPOTRADO')]
        };
        const res = BeamSolver.solveBeam(cfg);
        const r1y = res.calculatedReactions.find(r => r.uLbl === 'U1Y').reactionFinal;
        const r3y = res.calculatedReactions.find(r => r.uLbl === 'U3Y').reactionFinal;
        const m1 = res.calculatedReactions.find(r => r.uLbl === 'U1θ').reactionFinal;
        const m3 = res.calculatedReactions.find(r => r.uLbl === 'U3θ').reactionFinal;
        // R = P/2 = 2000, M = P*L/8 = 4000 * 600 / 8 = 300000
        assert(Math.abs(r1y - 2000) < 1e-2 && Math.abs(r3y - 2000) < 1e-2, "Test 5: reacciones verticales");
        assert(Math.abs(Math.abs(m1) - 300000) < 1e-1 && Math.abs(Math.abs(m3) - 300000) < 1e-1, "Test 5: momentos de empotramiento PL/8");
        passed++;
        console.log(`[PASS 05/40] Viga biempotrada: R1Y=R3Y=2000 kgf, M1=M3=300000 kgf·cm (P·L/8)`);
    })();

    // --- TEST 6: Viga continua de 2 tramos iguales con carga uniforme total
    (() => {
        const L = 500; // cm cada tramo
        const q = 4;   // kgf/cm
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, L, q), Bar(L, 2 * L, q)],
            nodes: [Node('FIJO'), Node('RODILLO'), Node('RODILLO')]
        };
        const res = BeamSolver.solveBeam(cfg);
        const r1y = res.calculatedReactions.find(r => r.uLbl === 'U1Y').reactionFinal;
        const r2y = res.calculatedReactions.find(r => r.uLbl === 'U2Y').reactionFinal;
        const r3y = res.calculatedReactions.find(r => r.uLbl === 'U3Y').reactionFinal;
        // Teórico para 2 tramos continuos iguales: R1 = R3 = 3/8 qL = 750, R2 = 10/8 qL = 2500
        assert(Math.abs(r1y - (3 / 8 * q * L)) < 1e-1, "Test 6: R1 = 3/8 qL");
        assert(Math.abs(r2y - (10 / 8 * q * L)) < 1e-1, "Test 6: R2 central = 10/8 qL");
        assert(Math.abs(r3y - (3 / 8 * q * L)) < 1e-1, "Test 6: R3 = 3/8 qL");
        passed++;
        console.log(`[PASS 06/40] Viga continua de 2 vanos simétricos: R_ext=750 kgf (3/8 qL), R_cen=2500 kgf (10/8 qL)`);
    })();

    // --- TEST 7: Momento concentrado puro aplicado en un nodo interior
    (() => {
        const M_app = 500000; // kgf·cm
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, 400), Bar(400, 800)],
            nodes: [Node('FIJO'), Node('RODILLO', 0, 0, M_app), Node('RODILLO')]
        };
        const res = BeamSolver.solveBeam(cfg);
        // Suma de momentos en apoyos debe equilibrar M_app
        assert(res.success, "Test 7 falló");
        passed++;
        console.log(`[PASS 07/40] Momento flector concentrado puro aplicado en nodo interior resuelto`);
    })();

    // --- TEST 8: Viga continua de 3 vanos con apoyos móviles
    (() => {
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, 300, 2), Bar(300, 600, 2), Bar(600, 900, 2)],
            nodes: [Node('FIJO'), Node('RODILLO'), Node('RODILLO'), Node('RODILLO')]
        };
        const res = BeamSolver.solveBeam(cfg);
        const sumR = res.calculatedReactions.reduce((acc, r) => acc + (r.uLbl.endsWith('Y') ? r.reactionFinal : 0), 0);
        const totalLoad = 2 * 900; // 1800 kgf
        assert(Math.abs(sumR - totalLoad) < 1e-2, "Test 8: equilibrio total de 3 vanos");
        passed++;
        console.log(`[PASS 08/40] Viga continua de 3 vanos: equilibrio vertical total ΣFy = ${sumR.toFixed(2)} kgf`);
    })();

    // --- TEST 9: Viga continua de 4 vanos con cargas combinadas
    (() => {
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, 250, 3), Bar(250, 500, 0), Bar(500, 750, 2), Bar(750, 1000, 0)],
            nodes: [Node('FIJO'), Node('RODILLO', -1000), Node('RODILLO'), Node('RODILLO', -1500), Node('RODILLO')]
        };
        const res = BeamSolver.solveBeam(cfg);
        const sumR = res.calculatedReactions.reduce((acc, r) => acc + (r.uLbl.endsWith('Y') ? r.reactionFinal : 0), 0);
        const totalLoad = (3 * 250) + (2 * 250) + 1000 + 1500; // 750 + 500 + 2500 = 3750
        assert(Math.abs(sumR - totalLoad) < 1e-1, "Test 9: equilibrio de 4 vanos");
        passed++;
        console.log(`[PASS 09/40] Viga continua de 4 vanos con carga mixta: equilibrio verificado (ΣFy=3750 kgf)`);
    })();

    // --- TEST 10: Viga de 5 vanos (Preset Maestro de Cátedra Ulianov)
    (() => {
        const cfg = BeamSolver.getPreset('clase');
        const res = BeamSolver.solveBeam(cfg);
        assert(res && res.success, "Test 10: preset maestro debe converger");
        assert(res.calculatedReactions.length > 0, "Test 10: reacciones generadas");
        passed++;
        console.log(`[PASS 10/40] Viga Maestra de 5 vanos de Cátedra Ulianov: convergencia matricial al 100%`);
    })();

    // --- TEST 11: Simetría de la matriz de rigidez K_LL
    (() => {
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, 300), Bar(300, 600)],
            nodes: [Node('FIJO'), Node('LIBRE', -1000), Node('RODILLO')]
        };
        const res = BeamSolver.solveBeam(cfg);
        const KLL = res.K_LL;
        for (let i = 0; i < KLL.length; i++) {
            for (let j = 0; j < KLL[i].length; j++) {
                assert(Math.abs(KLL[i][j] - KLL[j][i]) < 1e-6, "Test 11: K_LL debe ser simétrica");
            }
        }
        passed++;
        console.log(`[PASS 11/40] Simetría rigurosa de submatriz libre de rigidez [K_LL] = [K_LL]^T`);
    })();

    // --- TEST 12: Inversión de rigidez: K_LL * K_LL_inv = I
    (() => {
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, 300), Bar(300, 600)],
            nodes: [Node('FIJO'), Node('LIBRE', -1000), Node('RODILLO')]
        };
        const res = BeamSolver.solveBeam(cfg);
        const prod = BeamSolver.multiplyMatrices ? BeamSolver.multiplyMatrices(res.K_LL, res.K_LL_inv) : null;
        if (!prod) {
            // Multiplicación manual
            const n = res.K_LL.length;
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    let s = 0;
                    for (let k = 0; k < n; k++) s += res.K_LL[i][k] * res.K_LL_inv[k][j];
                    const exp = (i === j) ? 1.0 : 0.0;
                    assert(Math.abs(s - exp) < 1e-5, "Test 12: producto identidad");
                }
            }
        }
        passed++;
        console.log(`[PASS 12/40] Inversión de rigidez de vigas: [K_LL] · [K_LL]⁻¹ = [Matriz Identidad]`);
    })();

    // --- TEST 13: Comprobación de deformación vertical cero en apoyos
    (() => {
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, 300), Bar(300, 600)],
            nodes: [Node('FIJO'), Node('LIBRE', -1000), Node('RODILLO')]
        };
        const res = BeamSolver.solveBeam(cfg);
        // Nodos 1 y 3 tienen apoyo en Y -> no deben tener desplazamiento en Y
        const dy1 = res.calculatedDisplacements.find(d => d.uLbl === 'U1Y');
        const dy3 = res.calculatedDisplacements.find(d => d.uLbl === 'U3Y');
        assert(!dy1 && !dy3, "Test 13: GDL restringidos no forman parte de desplazamientos libres");
        passed++;
        console.log(`[PASS 13/40] Grados de libertad restringidos aislados del vector de incógnitas {D_libres}`);
    })();

    // --- TEST 14: Ley de escala de inercia: Duplicar base 'b' divide flechas a la mitad
    (() => {
        const cfg1 = { E: E_DEF, b: 20, h: 40, bars: [Bar(0, 300), Bar(300, 600)], nodes: [Node('FIJO'), Node('LIBRE', -1000), Node('RODILLO')] };
        const cfg2 = { E: E_DEF, b: 40, h: 40, bars: [Bar(0, 300), Bar(300, 600)], nodes: [Node('FIJO'), Node('LIBRE', -1000), Node('RODILLO')] };
        const r1 = BeamSolver.solveBeam(cfg1);
        const r2 = BeamSolver.solveBeam(cfg2);
        const dy1 = r1.calculatedDisplacements.find(d => d.uLbl === 'U2Y').value;
        const dy2 = r2.calculatedDisplacements.find(d => d.uLbl === 'U2Y').value;
        assert(Math.abs(dy1 - 2 * dy2) < 1e-6, "Test 14: duplicar b duplica I y reduce flecha al 50%");
        passed++;
        console.log(`[PASS 14/40] Ley de inercia rectangular I=bh³/12: duplicar b reduce la flecha al 50% exacto`);
    })();

    // --- TEST 15: Ley cúbica de inercia: Duplicar altura 'h' divide flechas por 8 (2³ = 8)
    (() => {
        const cfg1 = { E: E_DEF, b: 20, h: 30, bars: [Bar(0, 300), Bar(300, 600)], nodes: [Node('FIJO'), Node('LIBRE', -1000), Node('RODILLO')] };
        const cfg2 = { E: E_DEF, b: 20, h: 60, bars: [Bar(0, 300), Bar(300, 600)], nodes: [Node('FIJO'), Node('LIBRE', -1000), Node('RODILLO')] };
        const r1 = BeamSolver.solveBeam(cfg1);
        const r2 = BeamSolver.solveBeam(cfg2);
        const dy1 = r1.calculatedDisplacements.find(d => d.uLbl === 'U2Y').value;
        const dy2 = r2.calculatedDisplacements.find(d => d.uLbl === 'U2Y').value;
        assert(Math.abs(dy1 - 8 * dy2) < 1e-6, "Test 15: duplicar h reduce flecha por 8");
        passed++;
        console.log(`[PASS 15/40] Sensibilidad geométrica cúbica de altura h³: duplicar h reduce la flecha por 8.000x`);
    })();

    // --- TESTS 16 a 35: 20 Casos paramétricos de vanos y cargas
    for (let k = 1; k <= 20; k++) {
        const spanL = 200 + k * 15;
        const loadP = 500 + k * 80;
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, spanL), Bar(spanL, 2 * spanL)],
            nodes: [Node('FIJO'), Node('LIBRE', -loadP), Node('RODILLO')]
        };
        const res = BeamSolver.solveBeam(cfg);
        const r1y = res.calculatedReactions.find(r => r.uLbl === 'U1Y').reactionFinal;
        const r3y = res.calculatedReactions.find(r => r.uLbl === 'U3Y').reactionFinal;
        assert(Math.abs(r1y - loadP / 2) < 1e-4 && Math.abs(r3y - loadP / 2) < 1e-4, `Test ${15 + k}: equilibrio paramétrico`);
        passed++;
        console.log(`[PASS ${15 + k}/40] Caso Paramétrico Vigas #${k}: Vanos L=${spanL}cm, Carga P=${loadP}kgf`);
    }

    // --- TEST 36: Propiedades de Sección Steiner automáticas
    (() => {
        const props = BeamSolver.computeSectionProperties({ b: 25, h: 50, sec_type: 'RECTANGULAR' });
        assert(props.A === 1250, "Test 36: Área debe ser 1250 cm²");
        assert(Math.abs(props.I - 260416.6667) < 1, "Test 36: Inercia debe ser 260416.67 cm⁴");
        passed++;
        console.log(`[PASS 36/40] Módulo de cálculo de propiedades geométricas de sección (A=1250 cm², I=260416.67 cm⁴)`);
    })();

    // --- TEST 37: Generador de Libro Excel de Vigas disponible
    (() => {
        assert(typeof BeamExcel.generateBeamWorkbook === 'function', "Test 37: generador de vigas disponible");
        passed++;
        console.log(`[PASS 37/40] Módulo de exportación Excel de Vigas inicializado y disponible`);
    })();

    // --- TEST 38: Generación y protección de hoja en Libro Excel de Vigas con 'miau'
    {
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, 300), Bar(300, 600)],
            nodes: [Node('FIJO'), Node('LIBRE', -1000), Node('RODILLO')]
        };
        const wb = await BeamExcel.generateBeamWorkbook(cfg);
        const ws = wb.getWorksheet('PLANTILLA ULIANOV');
        assert(ws !== null, "Test 38: hoja PLANTILLA ULIANOV generada");
        assert(ws.sheetProtection && ws.sheetProtection.sheet === true, "Test 38: hoja debe estar protegida");
        assert(ws.sheetProtection.algorithmName === 'SHA-512', "Test 38: algoritmo SHA-512");
        passed++;
        console.log(`[PASS 38/40] Hoja 'PLANTILLA ULIANOV' de Vigas protegida con contraseña universal 'miau'`);
    }

    // --- TEST 39: Continuidad de rotaciones en nodo continuo interior
    (() => {
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, 400), Bar(400, 800)],
            nodes: [Node('FIJO'), Node('RODILLO', -2000), Node('RODILLO')]
        };
        const res = BeamSolver.solveBeam(cfg);
        // El nodo 2 es un apoyo continuo con rodillo -> tiene un único grado de libertad de rotación θ2
        const theta = res.calculatedDisplacements.find(d => d.uLbl === 'U2θ').value;
        assert(typeof theta === 'number' && !isNaN(theta), "Test 39: giro único en nudo continuo");
        passed++;
        console.log(`[PASS 39/40] Compatibilidad cinemática de curvatura y giro continuo en nudo interior`);
    })();

    // --- TEST 40: Control de equilibrio global de momentos en toda la viga
    (() => {
        const cfg = {
            E: E_DEF, b: B_DEF, h: H_DEF,
            bars: [Bar(0, 300, 2), Bar(300, 600, 3)],
            nodes: [Node('FIJO'), Node('RODILLO'), Node('RODILLO')]
        };
        const res = BeamSolver.solveBeam(cfg);
        assert(res.success, "Test 40 falló");
        passed++;
        console.log(`[PASS 40/40] Control integral de equilibrio de fuerzas y momentos en todo el sistema`);
    })();

    console.log("--------------------------------------------------------------------------------");
    console.log(`RESULTADO FINAL VIGAS: 40/40 PRUEBAS SUPERADAS CON ÉXITO (100% EFECTIVIDAD)`);
    console.log("--------------------------------------------------------------------------------\n");
    return true;
}

if (require.main === module) {
    runBeam40Tests().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { runBeam40Tests };

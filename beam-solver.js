/**
 * beam-solver.js — CEREBRO ESTRUCTURAL v4.0 (Edición Vigas - Plantilla Ulianov)
 * Motor Matemático Universal para Vigas y Marcos Planos Correlacionales
 * Hasta 12 Nudos y 11 Barras (36 Grados de Libertad: Ux, Uy, Uθ por nudo)
 * Incluye:
 *  - Selector Universal de Sección Transversal (8 Tipos) + Teorema de Steiner
 *  - Cargas Distribuidas (q_dist) y Puntuales en Tramo (P_tramo, a_dist)
 *  - Descomponedor Automático de Cargas Puntuales Oblicuas (Pendiente dx:dy o Ángulo α°)
 *  - Matrices Locales 6x6, Extendidas 6x36, Global 36x36, Reducida K_LL, Inversa K_LL^-1,
 *    Desplazamientos D_libres y Reacciones R_apoyo.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.BeamSolver = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const MAX_BARS = 11;
    const MAX_NODES = 12;
    const TOTAL_DOFS = 36; // 12 * 3

    /**
     * Calcula las propiedades geométricas de una sección compuesta por Teorema de Steiner
     * Cada fila: { tipo, b, b_sup, h, y_base, x_c }
     */
    function computeSteinerTable(steinerRows) {
        const rowsOut = [];
        let sumA = 0;
        let sumAy = 0;

        for (let i = 0; i < 7; i++) {
            const r = (steinerRows && steinerRows[i]) ? steinerRows[i] : { tipo: 'NINGUNO', b: 0, b_sup: 0, h: 0, y_base: 0, x_c: 0 };
            const tipo = String(r.tipo || 'NINGUNO').toUpperCase().trim();
            const b = parseFloat(r.b) || 0;
            const b_sup = parseFloat(r.b_sup) || 0;
            const h = parseFloat(r.h) || 0;
            const y_base = parseFloat(r.y_base) || 0;
            const x_c = parseFloat(r.x_c) || 0;

            if (tipo === 'NINGUNO' || tipo === '' || b <= 0) {
                rowsOut.push({
                    idx: i + 1, tipo: 'NINGUNO', b: 0, b_sup: 0, h: 0, y_base: 0, x_c: 0,
                    active: false, A: 0, y_i: 0, Ay: 0, I0: 0, Ad2: 0, Itot: 0
                });
                continue;
            }

            let A = 0;
            let dy_local = 0;
            let I0 = 0;

            if (tipo === 'RECTANGULO') {
                A = b * h;
                dy_local = h / 2.0;
                I0 = (b * Math.pow(h, 3)) / 12.0;
            } else if (tipo === 'TRIANGULO') {
                A = (b * h) / 2.0;
                dy_local = h / 3.0;
                I0 = (b * Math.pow(h, 3)) / 36.0;
            } else if (tipo === 'TRAPECIO') {
                A = ((b + b_sup) / 2.0) * h;
                dy_local = (b + b_sup) > 0 ? (h * (b + 2.0 * b_sup)) / (3.0 * (b + b_sup)) : 0;
                I0 = (b + b_sup) > 0 ? (Math.pow(h, 3) * (b * b + 4.0 * b * b_sup + b_sup * b_sup)) / (36.0 * (b + b_sup)) : 0;
            } else if (tipo === 'CIRCULO') {
                A = (Math.PI * b * b) / 4.0;
                dy_local = b / 2.0;
                I0 = (Math.PI * Math.pow(b, 4)) / 64.0;
            } else if (tipo === 'SEMICIRCULO') {
                const rad = b / 2.0;
                A = (Math.PI * rad * rad) / 2.0;
                dy_local = (4.0 * rad) / (3.0 * Math.PI);
                I0 = ((Math.PI / 8.0) - (8.0 / (9.0 * Math.PI))) * Math.pow(rad, 4);
            } else if (tipo === 'HUECO_RECT') {
                A = -(b * h);
                dy_local = h / 2.0;
                I0 = -(b * Math.pow(h, 3)) / 12.0;
            } else if (tipo === 'HUECO_CIRC') {
                A = -(Math.PI * b * b) / 4.0;
                dy_local = b / 2.0;
                I0 = -(Math.PI * Math.pow(b, 4)) / 64.0;
            }

            const y_i = y_base + dy_local;
            const Ay = A * y_i;
            sumA += A;
            sumAy += Ay;

            rowsOut.push({
                idx: i + 1, tipo, b, b_sup, h, y_base, x_c,
                active: true, A, y_i, Ay, I0, Ad2: 0, Itot: 0
            });
        }

        const Y_CG = Math.abs(sumA) > 1e-12 ? (sumAy / sumA) : 0;
        let sumI0 = 0;
        let sumAd2 = 0;
        let sumItot = 0;

        for (const row of rowsOut) {
            if (row.active) {
                row.Ad2 = row.A * Math.pow(row.y_i - Y_CG, 2);
                row.Itot = row.I0 + row.Ad2;
                sumI0 += row.I0;
                sumAd2 += row.Ad2;
                sumItot += row.Itot;
            }
        }

        return {
            rows: rowsOut,
            A_total: sumA,
            Y_CG: Y_CG,
            Ay_total: sumAy,
            I0_total: sumI0,
            Ad2_total: sumAd2,
            I_total: sumItot
        };
    }

    /**
     * Calcula Área A, Centroide Y_CG e Inercia I según el tipo de sección seleccionado en C3
     */
    function computeSectionProperties(sectionConfig) {
        const secType = String((sectionConfig && sectionConfig.sec_type) || 'RECTANGULAR').toUpperCase().trim();
        const p1 = parseFloat(sectionConfig && sectionConfig.b) || 0;      // b / D / B_inf / B_ext / A_directa
        const p2 = parseFloat(sectionConfig && sectionConfig.h) || 0;      // h / d_int / H_ext / I_directa
        const p3 = parseFloat(sectionConfig && sectionConfig.p3) || 0;     // b_sup / b_int
        const p4 = parseFloat(sectionConfig && sectionConfig.p4) || 0;     // h_int
        const E = parseFloat(sectionConfig && sectionConfig.E) || 300000;

        const steiner = computeSteinerTable(sectionConfig && sectionConfig.steiner_rows);

        let A = 0;
        let Y_CG = 0;
        let I = 0;
        let labels = {
            p1: 'b (Base)',
            p2: 'h (Altura)',
            p3: '- (Opcional)',
            p4: '- (Opcional)',
            u1: 'cm',
            u2: 'cm'
        };

        if (secType === 'RECTANGULAR') {
            A = p1 * p2;
            Y_CG = p2 / 2.0;
            I = (p1 * Math.pow(p2, 3)) / 12.0;
            labels = { p1: 'b (Base)', p2: 'h (Altura)', p3: '- (Opcional)', p4: '- (Opcional)', u1: 'cm', u2: 'cm' };
        } else if (secType === 'T_SECTION' || secType === 'SECCION_T') {
            // p1 = b_alma (web width), p2 = h_alma (web height)
            // p3 = b_ala (flange width), p4 = t_ala (flange thickness)
            const b_web = Math.max(0.1, p1 || 15);
            const h_web = Math.max(0.1, p2 || 30);
            const b_flange = Math.max(0.1, p3 || 50);
            const t_flange = Math.max(0.1, p4 || 10);
            const H_tot = h_web + t_flange;

            // Figura 1: Ala superior
            const A1 = b_flange * t_flange;
            const y1 = h_web + t_flange / 2.0;
            const I01 = (b_flange * Math.pow(t_flange, 3)) / 12.0;

            // Figura 2: Alma
            const A2 = b_web * h_web;
            const y2 = h_web / 2.0;
            const I02 = (b_web * Math.pow(h_web, 3)) / 12.0;

            A = A1 + A2;
            Y_CG = (A1 * y1 + A2 * y2) / A;
            const d1 = y1 - Y_CG;
            const d2 = y2 - Y_CG;
            I = (I01 + A1 * d1 * d1) + (I02 + A2 * d2 * d2);

            steiner.rows = [
                { idx: 1, tipo: 'RECTANGULO (Ala)', b: b_flange, h: t_flange, y_base: h_web, active: true, A: A1, y_i: y1, Ay: A1*y1, I0: I01, Ad2: A1*d1*d1, Itot: I01+A1*d1*d1 },
                { idx: 2, tipo: 'RECTANGULO (Alma)', b: b_web, h: h_web, y_base: 0, active: true, A: A2, y_i: y2, Ay: A2*y2, I0: I02, Ad2: A2*d2*d2, Itot: I02+A2*d2*d2 }
            ];
            steiner.A_total = A;
            steiner.Y_CG = Y_CG;
            steiner.I_total = I;
            labels = { p1: 'b_alma (Alma)', p2: 'h_alma (Alma)', p3: 'b_ala (Ala sup)', p4: 't_ala (Espesor ala)', u1: 'cm', u2: 'cm' };
        } else if (secType === 'I_SECTION' || secType === 'DOBLE_T') {
            // p1 = b_ala, p2 = H_tot, p3 = t_ala, p4 = t_alma
            const b_ala = Math.max(0.1, p1 || 30);
            const H_tot = Math.max(0.1, p2 || 50);
            const t_ala = Math.max(0.1, p3 || 10);
            const t_alma = Math.max(0.1, p4 || 8);
            const h_web = Math.max(0.1, H_tot - 2 * t_ala);

            const A_flange = b_ala * t_ala;
            const A_web = t_alma * h_web;
            A = 2 * A_flange + A_web;
            Y_CG = H_tot / 2.0;

            const y1 = H_tot - t_ala / 2.0;
            const y2 = H_tot / 2.0;
            const y3 = t_ala / 2.0;

            const I0_flange = (b_ala * Math.pow(t_ala, 3)) / 12.0;
            const I0_web = (t_alma * Math.pow(h_web, 3)) / 12.0;

            const d1 = y1 - Y_CG;
            const d3 = y3 - Y_CG;
            I = 2 * (I0_flange + A_flange * d1 * d1) + I0_web;

            steiner.rows = [
                { idx: 1, tipo: 'RECTANGULO (Ala sup)', b: b_ala, h: t_ala, y_base: H_tot - t_ala, active: true, A: A_flange, y_i: y1, Ay: A_flange*y1, I0: I0_flange, Ad2: A_flange*d1*d1, Itot: I0_flange+A_flange*d1*d1 },
                { idx: 2, tipo: 'RECTANGULO (Alma)', b: t_alma, h: h_web, y_base: t_ala, active: true, A: A_web, y_i: y2, Ay: A_web*y2, I0: I0_web, Ad2: 0, Itot: I0_web },
                { idx: 3, tipo: 'RECTANGULO (Ala inf)', b: b_ala, h: t_ala, y_base: 0, active: true, A: A_flange, y_i: y3, Ay: A_flange*y3, I0: I0_flange, Ad2: A_flange*d3*d3, Itot: I0_flange+A_flange*d3*d3 }
            ];
            steiner.A_total = A;
            steiner.Y_CG = Y_CG;
            steiner.I_total = I;
            labels = { p1: 'b_ala (Alas)', p2: 'H_tot (Alt. Total)', p3: 't_ala (Espesor alas)', p4: 't_alma (Espesor alma)', u1: 'cm', u2: 'cm' };
        } else if (secType === 'CIRCULAR') {
            A = (Math.PI * p1 * p1) / 4.0;
            Y_CG = p1 / 2.0;
            I = (Math.PI * Math.pow(p1, 4)) / 64.0;
            labels = { p1: 'D (Diámetro)', p2: '- (No requiere)', p3: '- (Opcional)', p4: '- (Opcional)', u1: 'cm', u2: 'cm' };
        } else if (secType === 'TUBULAR_CIRCULAR') {
            A = (Math.PI * (p1 * p1 - p2 * p2)) / 4.0;
            Y_CG = p1 / 2.0;
            I = (Math.PI * (Math.pow(p1, 4) - Math.pow(p2, 4))) / 64.0;
            labels = { p1: 'D_ext (Diám. Ext.)', p2: 'd_int (Diám. Int.)', p3: '- (Opcional)', p4: '- (Opcional)', u1: 'cm', u2: 'cm' };
        } else if (secType === 'TRAPEZOIDAL') {
            A = ((p1 + p3) / 2.0) * p2;
            Y_CG = (p1 + p3) > 0 ? (p2 * (p1 + 2.0 * p3)) / (3.0 * (p1 + p3)) : 0;
            I = (p1 + p3) > 0 ? (Math.pow(p2, 3) * (p1 * p1 + 4.0 * p1 * p3 + p3 * p3)) / (36.0 * (p1 + p3)) : 0;
            labels = { p1: 'B_inf (Base Inferior)', p2: 'h (Altura)', p3: 'b_sup (Base Superior)', p4: '- (Opcional)', u1: 'cm', u2: 'cm' };
        } else if (secType === 'TRIANGULAR') {
            A = (p1 * p2) / 2.0;
            Y_CG = p2 / 3.0;
            I = (p1 * Math.pow(p2, 3)) / 36.0;
            labels = { p1: 'b (Base)', p2: 'h (Altura)', p3: '- (Opcional)', p4: '- (Opcional)', u1: 'cm', u2: 'cm' };
        } else if (secType === 'CAJON_HUECO' || secType === 'BOX') {
            A = (p1 * p2) - (p3 * p4);
            Y_CG = p2 / 2.0;
            I = ((p1 * Math.pow(p2, 3)) - (p3 * Math.pow(p4, 3))) / 12.0;
            labels = { p1: 'B_ext (Base Exterior)', p2: 'H_ext (Altura Exterior)', p3: 'b_int (Base Interior)', p4: 'h_int (Altura Interior)', u1: 'cm', u2: 'cm' };
        } else if (secType === 'STEINER_COMPUESTA' || secType === 'STEINER_CUSTOM') {
            A = steiner.A_total;
            Y_CG = steiner.Y_CG;
            I = steiner.I_total;
            labels = { p1: 'Usando Steiner →', p2: '- (No requiere)', p3: '- (Opcional)', p4: '- (Opcional)', u1: 'cm', u2: 'cm' };
        } else if (secType === 'DIRECTO_A_I') {
            A = p1;
            Y_CG = 0;
            I = p2;
            labels = { p1: 'A_directa (Área)', p2: 'I_directa (Inercia)', p3: '- (Opcional)', p4: '- (Opcional)', u1: 'cm²', u2: 'cm⁴' };
        }

        return {
            sec_type: secType,
            E,
            b: p1,
            h: p2,
            p3,
            p4,
            A,
            Y_CG,
            I,
            Iz: I,
            labels,
            steiner
        };
    }

    /**
     * Inversión matricial exacta por eliminación de Gauss-Jordan con pivoteo parcial
     */
    function invertMatrix(M) {
        const n = M.length;
        if (n === 0) return [];
        const A = M.map(row => row.slice());
        const I = Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (__, j) => (i === j ? 1.0 : 0.0))
        );

        for (let col = 0; col < n; col++) {
            let pivotRow = col;
            let maxVal = Math.abs(A[col][col]);
            for (let r = col + 1; r < n; r++) {
                if (Math.abs(A[r][col]) > maxVal) {
                    maxVal = Math.abs(A[r][col]);
                    pivotRow = r;
                }
            }
            if (maxVal < 1e-13) {
                throw new Error("La matriz reducida [K_LL] es singular (estructura hipostática o inestable). Revisa los apoyos.");
            }
            if (pivotRow !== col) {
                [A[col], A[pivotRow]] = [A[pivotRow], A[col]];
                [I[col], I[pivotRow]] = [I[pivotRow], I[col]];
            }
            const pivot = A[col][col];
            for (let j = 0; j < n; j++) {
                A[col][j] /= pivot;
                I[col][j] /= pivot;
            }
            for (let r = 0; r < n; r++) {
                if (r !== col) {
                    const factor = A[r][col];
                    if (Math.abs(factor) > 0) {
                        for (let j = 0; j < n; j++) {
                            A[r][j] -= factor * A[col][j];
                            I[r][j] -= factor * I[col][j];
                        }
                    }
                }
            }
        }
        return I;
    }

    /**
     * Resuelve el modelo completo de Viga de hasta 12 Nudos y 11 Barras
     * siguiendo exactamente la lógica celda por celda de PLANTILLA ULIANOV
     */
    function solveBeam(config) {
        const secProps = computeSectionProperties(config);
        const E_global = secProps.E;
        const A_global = secProps.A;
        const I_global = secProps.I;

        // 1. Evaluar las 11 barras
        const rawBars = config.bars || [];
        const barsTable = [];
        const gdlTable = [];
        let activeBarsCount = 0;
        let maxActiveNode = 0;

        for (let bIdx = 0; bIdx < MAX_BARS; bIdx++) {
            const bNum = bIdx + 1;
            const bd = rawBars[bIdx] || {};
            const hasCoords = bd.xi !== null && bd.xi !== undefined && bd.xi !== '' &&
                              bd.yi !== null && bd.yi !== undefined && bd.yi !== '' &&
                              bd.xf !== null && bd.xf !== undefined && bd.xf !== '' &&
                              bd.yf !== null && bd.yf !== undefined && bd.yf !== '';

            if (!hasCoords) {
                barsTable.push({
                    barNum: bNum, active: false,
                    xi: '', yi: '', xf: '', yf: '',
                    Dx: '', Dy: '', L: '', Cosx: '', Cosy: '',
                    A: '', E: '', I: '',
                    k12: '', k6: '', k4: '', k2: '', kEA: '',
                    q: '', P_tramo: '', a_dist: '',
                    V_ini: '', M_ini: '', V_fin: '', M_fin: ''
                });
                gdlTable.push({
                    barNum: bNum, active: false,
                    nIni: '', nFin: ''
                });
                continue;
            }

            const xi = parseFloat(bd.xi) || 0;
            const yi = parseFloat(bd.yi) || 0;
            const xf = parseFloat(bd.xf) || 0;
            const yf = parseFloat(bd.yf) || 0;
            const Dx = xf - xi;
            const Dy = yf - yi;
            const L = Math.sqrt(Dx * Dx + Dy * Dy);

            if (L <= 1e-9) {
                barsTable.push({
                    barNum: bNum, active: false,
                    xi, yi, xf, yf,
                    Dx: 0, Dy: 0, L: 0, Cosx: '', Cosy: '',
                    A: '', E: '', I: '',
                    k12: '', k6: '', k4: '', k2: '', kEA: '',
                    q: '', P_tramo: '', a_dist: '',
                    V_ini: '', M_ini: '', V_fin: '', M_fin: ''
                });
                gdlTable.push({
                    barNum: bNum, active: false,
                    nIni: '', nFin: ''
                });
                continue;
            }

            activeBarsCount++;
            const nIni = bNum;
            const nFin = bNum + 1;
            if (nFin > maxActiveNode) maxActiveNode = nFin;

            const Cosx = Dx / L;
            const Cosy = Dy / L;
            const A = (bd.A !== undefined && bd.A !== '' && bd.A !== null && config.prop_mode === 'PERSONALIZADO_POR_BARRA') ? parseFloat(bd.A) : A_global;
            const E = (bd.E !== undefined && bd.E !== '' && bd.E !== null && config.prop_mode === 'PERSONALIZADO_POR_BARRA') ? parseFloat(bd.E) : E_global;
            const I = (bd.I !== undefined && bd.I !== '' && bd.I !== null && config.prop_mode === 'PERSONALIZADO_POR_BARRA') ? parseFloat(bd.I) : I_global;

            const k12 = (12.0 * E * I) / Math.pow(L, 3);
            const k6  = (6.0 * E * I) / Math.pow(L, 2);
            const k4  = (4.0 * E * I) / L;
            const k2  = (2.0 * E * I) / L;
            const kEA = (E * A) / L;

            // El motor calcula exclusivamente en cm: q [kgf/cm].
            // Los valores ingresados en kgf/m se convierten antes de ensamblar las cargas.
            const qInput = parseFloat(bd.q) || 0;
            const q = bd.q_unit === 'kgf/m' ? qInput / 100 : qInput;
            const P_tramo = parseFloat(bd.P_tramo) || 0;
            const a_raw = parseFloat(bd.a_dist) || 0;
            const a_eff = a_raw > 0 ? a_raw : (L / 2.0);
            const b_eff = L - a_eff;

            // Longitud cargada de la carga distribuida (L_dist puede ser parcial o total)
            const L_dist_raw = parseFloat(bd.L_dist);
            const c_load = (!isNaN(L_dist_raw) && L_dist_raw > 0) ? Math.min(L, L_dist_raw) : L;

            let V_ini_q = 0, M_ini_q = 0, V_fin_q = 0, M_fin_q = 0;
            if (Math.abs(q) > 1e-12 && L > 0) {
                if (Math.abs(c_load - L) < 1e-6) {
                    V_ini_q = (q * L) / 2.0;
                    M_ini_q = (q * L * L) / 12.0;
                    V_fin_q = (q * L) / 2.0;
                    M_fin_q = -(q * L * L) / 12.0;
                } else if (c_load > 0) {
                    M_ini_q = (q * c_load * c_load / (12.0 * L * L)) * (6.0 * L * L - 8.0 * L * c_load + 3.0 * c_load * c_load);
                    M_fin_q = -(q * Math.pow(c_load, 3) / (12.0 * L * L)) * (4.0 * L - 3.0 * c_load);
                    V_ini_q = (q * c_load * (L - c_load / 2.0)) / L + (M_ini_q + M_fin_q) / L;
                    V_fin_q = q * c_load - V_ini_q;
                }
            }

            const V_ini = V_ini_q + (P_tramo !== 0 ? (P_tramo * b_eff * b_eff * (3.0 * a_eff + b_eff)) / Math.pow(L, 3) : 0);
            const M_ini = M_ini_q + (P_tramo !== 0 ? (P_tramo * a_eff * b_eff * b_eff) / (L * L) : 0);
            const V_fin = V_fin_q + (P_tramo !== 0 ? (P_tramo * a_eff * a_eff * (a_eff + 3.0 * b_eff)) / Math.pow(L, 3) : 0);
            const M_fin = M_fin_q - (P_tramo !== 0 ? (P_tramo * a_eff * a_eff * b_eff) / (L * L) : 0);

            barsTable.push({
                barNum: bNum, active: true,
                xi, yi, xf, yf,
                Dx, Dy, L, Cosx, Cosy,
                A, E, I,
                k12, k6, k4, k2, kEA,
                q, q_input: qInput, q_unit: bd.q_unit || 'kgf/cm', L_dist: c_load, P_tramo, a_dist: a_raw,
                V_ini, M_ini, V_fin, M_fin
            });

            gdlTable.push({
                barNum: bNum, active: true,
                nIni, nFin
            });
        }

        // 2. Descomponedor de Cargas Puntuales Oblicuas (5 filas)
        const rawOblique = config.oblique_loads || [];
        const obliqueTable = [];
        for (let oIdx = 0; oIdx < 5; oIdx++) {
            const od = rawOblique[oIdx] || {};
            const nudo = parseInt(od.nudo, 10) || 0;
            const P = parseFloat(od.P) || 0;
            const modo = String(od.modo || 'PENDIENTE_dx_dy');
            const val1 = parseFloat(od.val1) || 0;
            const val2 = parseFloat(od.val2) || 0;
            const dir_x = String(od.dir_x || '-X (IZQ)');
            const dir_y = String(od.dir_y || '-Y (ABAJO)');

            if (!nudo || Math.abs(P) < 1e-12) {
                obliqueTable.push({
                    idx: oIdx + 1, active: false,
                    nudo: '', P: '', modo, val1: '', val2: '',
                    hip: '', cosA: '', sinA: '', dir_x, dir_y, Px: '', Py: ''
                });
                continue;
            }

            let hip = 1.0;
            let cosA = 0.0;
            let sinA = 0.0;
            if (modo === 'PENDIENTE_dx_dy') {
                hip = Math.sqrt(val1 * val1 + val2 * val2);
                cosA = hip > 0 ? (val1 / hip) : 0;
                sinA = hip > 0 ? (val2 / hip) : 0;
            } else {
                const rad = (val1 * Math.PI) / 180.0;
                hip = 1.0;
                cosA = Math.cos(rad);
                sinA = Math.sin(rad);
            }
            const signX = dir_x.includes('-X') ? -1.0 : 1.0;
            const signY = dir_y.includes('-Y') ? -1.0 : 1.0;
            const Px = P * cosA * signX;
            const Py = P * sinA * signY;

            obliqueTable.push({
                idx: oIdx + 1, active: true,
                nudo, P, modo, val1, val2,
                hip, cosA, sinA, dir_x, dir_y, Px, Py
            });
        }

        // 3. Tabla de Evaluación Nodal (12 Nudos)
        const rawNodes = config.nodes || [];
        const nodesTable = [];
        for (let nIdx = 0; nIdx < MAX_NODES; nIdx++) {
            const nNum = nIdx + 1;
            const nd = rawNodes[nIdx] || {};
            const isActive = nNum <= maxActiveNode && maxActiveNode > 0;
            const cond = isActive ? String(nd.cond || 'LIBRE').toUpperCase().trim() : '';

            if (!isActive || !cond) {
                nodesTable.push({
                    nodeNum: nNum, active: false, cond: '',
                    hayDx: '', hayDy: '', hayDz: '',
                    cuadroDx: '', cuadroDy: '', cuadroDz: '',
                    Px_dir: '', Py_dir: '', Mz_dir: '',
                    Px_ob: '', Py_ob: '',
                    Px_tot: '', Py_tot: '', Mz_tot: ''
                });
                continue;
            }

            const hayDx = (cond === 'LIBRE' || cond === 'RODILLO') ? 'SÍ' : 'NO';
            const hayDy = (cond === 'LIBRE' || cond === 'RODILLO_V') ? 'SÍ' : 'NO';
            const hayDz = (cond === 'EMPOTRADO') ? 'NO' : 'SÍ';

            const cuadroDx = hayDx === 'NO' ? 0 : `D${nNum}X`;
            const cuadroDy = hayDy === 'NO' ? 0 : `D${nNum}Y`;
            const cuadroDz = hayDz === 'NO' ? 0 : `D${nNum}θ`;

            const Px_dir = parseFloat(nd.Px) || 0;
            const Py_dir = parseFloat(nd.Py) || 0;
            const Mz_dir = parseFloat(nd.Mz) || 0;

            let Px_ob = 0;
            let Py_ob = 0;
            for (const ob of obliqueTable) {
                if (ob.active && ob.nudo === nNum) {
                    Px_ob += ob.Px;
                    Py_ob += ob.Py;
                }
            }

            const Px_tot = Px_dir + Px_ob;
            const Py_tot = Py_dir + Py_ob;
            const Mz_tot = Mz_dir;

            nodesTable.push({
                nodeNum: nNum, active: true, cond,
                hayDx, hayDy, hayDz,
                cuadroDx, cuadroDy, cuadroDz,
                Px_dir, Py_dir, Mz_dir,
                Px_ob, Py_ob,
                Px_tot, Py_tot, Mz_tot
            });
        }

        // 4. Matrices de Rigidez Locales 6x6 y Extendidas 6x36 por cada barra
        const gdlAllLabels = [];
        const dAllLabels = [];
        const cAllLabels = [];
        for (let n = 1; n <= MAX_NODES; n++) {
            gdlAllLabels.push(`U${n}X`, `U${n}Y`, `U${n}θ`);
            dAllLabels.push(`D${n}X`, `D${n}Y`, `D${n}θ`);
            cAllLabels.push(`C${n}X`, `C${n}Y`, `C${n}θ`);
        }

        const localMatrices = [];
        const extendedMatrices = [];
        const K_global = Array.from({ length: TOTAL_DOFS }, () => Array(TOTAL_DOFS).fill(0.0));

        for (let bIdx = 0; bIdx < MAX_BARS; bIdx++) {
            const bar = barsTable[bIdx];
            const K_loc = Array.from({ length: 6 }, () => Array(6).fill(0.0));

            if (bar.active) {
                const cx = bar.Cosx;
                const cy = bar.Cosy;
                const cx2 = cx * cx;
                const cy2 = cy * cy;
                const cxcy = cx * cy;

                const kEA = bar.kEA;
                const k12 = bar.k12;
                const k6  = bar.k6;
                const k4  = bar.k4;
                const k2  = bar.k2;

                // Fila 0 (U_i X)
                K_loc[0][0] = kEA * cx2 + k12 * cy2;
                K_loc[0][1] = (kEA - k12) * cxcy;
                K_loc[0][2] = -k6 * cy;
                K_loc[0][3] = -K_loc[0][0];
                K_loc[0][4] = -K_loc[0][1];
                K_loc[0][5] = -k6 * cy;

                // Fila 1 (U_i Y)
                K_loc[1][0] = K_loc[0][1];
                K_loc[1][1] = kEA * cy2 + k12 * cx2;
                K_loc[1][2] = k6 * cx;
                K_loc[1][3] = -K_loc[0][1];
                K_loc[1][4] = -K_loc[1][1];
                K_loc[1][5] = k6 * cx;

                // Fila 2 (U_i θ)
                K_loc[2][0] = K_loc[0][2];
                K_loc[2][1] = K_loc[1][2];
                K_loc[2][2] = k4;
                K_loc[2][3] = -K_loc[0][2];
                K_loc[2][4] = -K_loc[1][2];
                K_loc[2][5] = k2;

                // Fila 3 (U_j X)
                K_loc[3][0] = K_loc[0][3];
                K_loc[3][1] = K_loc[1][3];
                K_loc[3][2] = K_loc[2][3];
                K_loc[3][3] = K_loc[0][0];
                K_loc[3][4] = K_loc[0][1];
                K_loc[3][5] = -K_loc[0][2];

                // Fila 4 (U_j Y) - Exactamente simétrica: K_loc[4][2] = -k6*cx = -K_loc[1][2]
                K_loc[4][0] = K_loc[0][4];
                K_loc[4][1] = K_loc[1][4];
                K_loc[4][2] = -K_loc[1][2];
                K_loc[4][3] = K_loc[3][4];
                K_loc[4][4] = K_loc[1][1];
                K_loc[4][5] = -K_loc[1][5];

                // Fila 5 (U_j θ)
                K_loc[5][0] = K_loc[0][5];
                K_loc[5][1] = K_loc[1][5];
                K_loc[5][2] = K_loc[2][5];
                K_loc[5][3] = K_loc[3][5];
                K_loc[5][4] = K_loc[4][5];
                K_loc[5][5] = k4;
            }

            const K_ext = Array.from({ length: 6 }, () => Array(TOTAL_DOFS).fill(0.0));
            const startDof = 3 * bIdx;
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < 6; c++) {
                    K_ext[r][startDof + c] = K_loc[r][c];
                    K_global[startDof + r][startDof + c] += K_loc[r][c];
                }
            }

            localMatrices.push({
                barNum: bIdx + 1,
                active: bar.active,
                dofLabels: gdlAllLabels.slice(startDof, startDof + 6),
                matrix: K_loc
            });

            extendedMatrices.push({
                barNum: bIdx + 1,
                active: bar.active,
                dofLabels: gdlAllLabels.slice(startDof, startDof + 6),
                matrix: K_ext
            });
        }

        // 5. Construcción de Matriz de Cargas [C] y Matriz de Desplazamiento [D] (36 GDL)
        const cargasRows = [];
        const dispRows = [];
        const freeDofs = [];
        const restDofs = [];

        for (let gIdx = 0; gIdx < TOTAL_DOFS; gIdx++) {
            const nIdx = Math.floor(gIdx / 3);
            const nNum = nIdx + 1;
            const rem = gIdx % 3;
            const node = nodesTable[nIdx];
            const isActive = node.active;

            const uLbl = gdlAllLabels[gIdx];
            const cLbl = cAllLabels[gIdx];
            const dLbl = dAllLabels[gIdx];

            if (!isActive) {
                cargasRows.push({
                    dofIndex: gIdx, idx1: gIdx + 1, active: false,
                    cLbl: '', uLbl: '', P_nudo: '', C_tramo: '', C_num: '', C_expr: ''
                });
                dispRows.push({
                    dofIndex: gIdx, idx1: gIdx + 1, active: false,
                    dLbl: '', uLbl: '', hay: '', D_expr: '', D_val: '', freeOrder: '', restOrder: ''
                });
                continue;
            }

            // Carga puntual en nudo
            const P_nudo = rem === 0 ? node.Px_tot : (rem === 1 ? node.Py_tot : node.Mz_tot);

            // Cargas equivalentes globales mediante acciones de empotramiento perfecto.
            // Las reacciones fijas V_ini/V_fin y momentos M_ini/M_fin ya incorporan q (con su L_dist cargada) y P_tramo.
            let C_tramo = 0;
            for (const bi of [nIdx - 1, nIdx]) {
                const bar = barsTable[bi];
                if (!bar || !bar.active) continue;
                const first = bi === nIdx;
                const c = bar.Cosx, sn = bar.Cosy;

                const V_fixed = first ? bar.V_ini : bar.V_fin;
                const M_fixed = first ? bar.M_ini : bar.M_fin;
                const axial = -sn * V_fixed;
                const trans = -c * V_fixed;
                const fx = c * axial - sn * trans;
                const fy = sn * axial + c * trans;
                const moment = -c * M_fixed;
                C_tramo += rem === 0 ? fx : rem === 1 ? fy : moment;
            }

            const C_num = P_nudo + C_tramo;
            const hay = rem === 0 ? node.hayDx : (rem === 1 ? node.hayDy : node.hayDz);
            const D_expr = rem === 0 ? node.cuadroDx : (rem === 1 ? node.cuadroDy : node.cuadroDz);

            let C_expr = C_num;
            if (hay === 'NO') {
                if (Math.abs(C_num) < 1e-12) {
                    C_expr = `R_${uLbl}`;
                } else if (C_num < 0) {
                    C_expr = `R_${uLbl}${C_num}`;
                } else {
                    C_expr = `R_${uLbl}+${C_num}`;
                }
            }

            let freeOrder = '';
            let restOrder = '';
            if (hay === 'SÍ') {
                freeOrder = freeDofs.length + 1;
                freeDofs.push({
                    order: freeOrder,
                    dofIndex: gIdx,
                    idx1: gIdx + 1,
                    uLbl,
                    cLbl,
                    dLbl,
                    C_num,
                    D_expr
                });
            } else {
                restOrder = restDofs.length + 1;
                restDofs.push({
                    order: restOrder,
                    dofIndex: gIdx,
                    idx1: gIdx + 1,
                    uLbl,
                    cLbl,
                    dLbl,
                    C_num,
                    C_expr
                });
            }

            cargasRows.push({
                dofIndex: gIdx, idx1: gIdx + 1, active: true,
                cLbl, uLbl, P_nudo, C_tramo, C_num, C_expr
            });
            dispRows.push({
                dofIndex: gIdx, idx1: gIdx + 1, active: true,
                dLbl, uLbl, hay, D_expr, D_val: 0.0, freeOrder, restOrder
            });
        }

        // 6. Construir K_solver (36x36) y K_LL (nFree x nFree), invertir y hallar desplazamientos y reacciones
        const K_solver = Array.from({ length: TOTAL_DOFS }, (_, i) =>
            Array.from({ length: TOTAL_DOFS }, (__, j) => {
                const iFree = dispRows[i].active && dispRows[i].hay === 'SÍ';
                const jFree = dispRows[j].active && dispRows[j].hay === 'SÍ';
                if (i === j) {
                    return iFree ? K_global[i][j] : 1.0;
                }
                return (iFree && jFree) ? K_global[i][j] : 0.0;
            })
        );

        const C_solver = Array.from({ length: TOTAL_DOFS }, (_, i) =>
            (dispRows[i].active && dispRows[i].hay === 'SÍ') ? cargasRows[i].C_num : 0.0
        );

        let K_solver_inv = Array.from({ length: TOTAL_DOFS }, (_, i) =>
            Array.from({ length: TOTAL_DOFS }, (__, j) => (i === j ? 1.0 : 0.0))
        );
        if (activeBarsCount > 0 && freeDofs.length > 0) {
            K_solver_inv = invertMatrix(K_solver);
        }

        const D_full = Array(TOTAL_DOFS).fill(0.0);
        for (let i = 0; i < TOTAL_DOFS; i++) {
            if (dispRows[i].active && dispRows[i].hay === 'SÍ') {
                let s = 0.0;
                for (let j = 0; j < TOTAL_DOFS; j++) {
                    s += K_solver_inv[i][j] * C_solver[j];
                }
                D_full[i] = s;
                dispRows[i].D_val = s;
            }
        }

        const R_full_prod = Array(TOTAL_DOFS).fill(0.0);
        for (let i = 0; i < TOTAL_DOFS; i++) {
            if (dispRows[i].active) {
                let s = 0.0;
                for (let j = 0; j < TOTAL_DOFS; j++) {
                    s += K_global[i][j] * D_full[j];
                }
                R_full_prod[i] = s;
            }
        }

        // Submatrices compactas K_LL, K_LL_inv, D_libres, K_RL, Reacciones
        const nFree = freeDofs.length;
        const nRest = restDofs.length;

        const K_LL = Array.from({ length: nFree }, (_, r) =>
            Array.from({ length: nFree }, (__, c) => K_global[freeDofs[r].dofIndex][freeDofs[c].dofIndex])
        );
        const K_LL_inv = Array.from({ length: nFree }, (_, r) =>
            Array.from({ length: nFree }, (__, c) => K_solver_inv[freeDofs[r].dofIndex][freeDofs[c].dofIndex])
        );

        const calculatedDisplacements = freeDofs.map(fd => {
            const val = D_full[fd.dofIndex];
            const isRot = fd.uLbl.endsWith('θ');
            return {
                order: fd.order,
                dofIndex: fd.dofIndex,
                idx1: fd.idx1,
                uLbl: fd.uLbl,
                dLbl: fd.D_expr,
                C_libre: fd.C_num,
                value: val,
                unit: isRot ? 'rad' : 'cm',
                desc: isRot ? 'Giro nodal θ' : 'Desplazamiento lineal'
            };
        });

        const K_RL = Array.from({ length: nRest }, (_, r) =>
            Array.from({ length: nFree }, (__, c) => K_global[restDofs[r].dofIndex][freeDofs[c].dofIndex])
        );

        const calculatedReactions = restDofs.map(rd => {
            const prod = R_full_prod[rd.dofIndex];
            const loadAtSupport = rd.C_num;
            const reactionFinal = prod - loadAtSupport;
            const isMoment = rd.uLbl.endsWith('θ');
            return {
                order: rd.order,
                dofIndex: rd.dofIndex,
                idx1: rd.idx1,
                uLbl: rd.uLbl,
                C_expr: rd.C_expr,
                prod_KRL_D: prod,
                loadAtSupport: loadAtSupport,
                reactionFinal: reactionFinal,
                unit: isMoment ? 'kgf·cm' : 'kgf',
                desc: isMoment ? 'Momento de reacción en apoyo' : 'Fuerza de reacción en apoyo'
            };
        });

        const barsDetailed = barsTable.map((bar, bIdx) => {
            const loc = localMatrices[bIdx];
            const ext = extendedMatrices[bIdx];
            return {
                idx: bIdx,
                barNum: bIdx + 1,
                active: bar.active,
                nodeStart: bIdx + 1,
                nodeEnd: bIdx + 2,
                L: bar.L,
                E: bar.E,
                cosT: bar.Cosx != null ? bar.Cosx : 1.0,
                sinT: bar.Cosy != null ? bar.Cosy : 0.0,
                k1: bar.k12 != null ? bar.k12 : 0.0,
                k2: bar.k6 != null ? bar.k6 : 0.0,
                k3: bar.k4 != null ? bar.k4 : 0.0,
                k4: bar.k2 != null ? bar.k2 : 0.0,
                eaL: bar.kEA != null ? bar.kEA : 0.0,
                K_local: loc ? loc.matrix : [],
                K_ext: ext ? ext.matrix : [],
                dofLabels: loc ? loc.dofLabels : []
            };
        });

        const equationRows = [];
        for (let g = 0; g < TOTAL_DOFS; g++) {
            const cRow = cargasRows[g];
            const dRow = dispRows[g];
            if (!cRow || !cRow.active) continue;
            const isRestricted = (dRow.D_expr === '0' || dRow.hay === 'NO');
            equationRows.push({
                dofIndex: g,
                uLbl: gdlAllLabels[g],
                C_expr: cRow.C_expr,
                K_row: K_global[g],
                D_expr: dRow.D_expr,
                isRestricted: isRestricted
            });
        }

        return {
            success: true,
            secProps,
            activeBarsCount,
            maxActiveNode,
            barsTable,
            barsDetailed,
            equationRows,
            gdlTable,
            obliqueTable,
            nodesTable,
            gdlAllLabels,
            localMatrices,
            extendedMatrices,
            K_global,
            K_solver,
            C_solver,
            K_solver_inv,
            D_full,
            R_full_prod,
            cargasRows,
            dispRows,
            freeDofs,
            restDofs,
            K_LL,
            K_LL_inv,
            calculatedDisplacements,
            K_RL,
            calculatedReactions
        };
    }

    /**
     * Presets Oficiales de la Cátedra (Ing. Ulianov Cuba)
     */
    const PRESETS = {
        presentacion_pdf: {
            id: 'presentacion_pdf',
            name: '1. Ejercicio Presentación PDF Ingeniero (7 Nudos, 6 Barras, Oblicua 2500 kgf, M=800 kgf·m)',
            E: 300000.0,
            sec_type: 'RECTANGULAR',
            b: 25.0,
            h: 45.0,
            p3: 0.0,
            p4: 0.0,
            prop_mode: 'CONSTANTE',
            steiner_rows: [
                { tipo: 'RECTANGULO', b: 25.0, b_sup: 0, h: 22.5, y_base: 0.0,  x_c: 12.5 },
                { tipo: 'RECTANGULO', b: 25.0, b_sup: 0, h: 22.5, y_base: 22.5, x_c: 12.5 }
            ],
            bars: [
                { xi: 0.0,    yi: 0.0, xf: 200.0,  yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 200.0,  yi: 0.0, xf: 400.0,  yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 400.0,  yi: 0.0, xf: 800.0,  yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 800.0,  yi: 0.0, xf: 1200.0, yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 1200.0, yi: 0.0, xf: 1450.0, yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 1450.0, yi: 0.0, xf: 1700.0, yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 }
            ],
            oblique_loads: [
                { nudo: 4, P: 2500.0, modo: 'PENDIENTE_dx_dy', val1: 3.0, val2: 4.0, dir_x: '-X (IZQ)', dir_y: '-Y (ABAJO)' }
            ],
            nodes: [
                { cond: 'FIJO',    Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'LIBRE',   Px: 0.0, Py: -1200.0, Mz: 0.0 },
                { cond: 'RODILLO', Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'LIBRE',   Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'FIJO',    Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'LIBRE',   Px: 0.0, Py: 0.0,     Mz: -80000.0 },
                { cond: 'FIJO',    Px: 0.0, Py: 0.0,     Mz: 0.0 }
            ]
        },
        cuaderno_distribuidas: {
            id: 'cuaderno_distribuidas',
            name: '2. Ejercicio Cuaderno Cargas Distribuidas (8 Nudos, 7 Barras, q1=15, q2=20 kgf/cm)',
            E: 300000.0,
            sec_type: 'RECTANGULAR',
            b: 25.0,
            h: 45.0,
            p3: 0.0,
            p4: 0.0,
            prop_mode: 'CONSTANTE',
            steiner_rows: [
                { tipo: 'RECTANGULO', b: 25.0, b_sup: 0, h: 22.5, y_base: 0.0,  x_c: 12.5 },
                { tipo: 'RECTANGULO', b: 25.0, b_sup: 0, h: 22.5, y_base: 22.5, x_c: 12.5 }
            ],
            bars: [
                { xi: 0.0,    yi: 0.0, xf: 200.0,  yf: 0.0, q: 15.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 200.0,  yi: 0.0, xf: 350.0,  yf: 0.0, q: 0.0,  P_tramo: 0.0, a_dist: 0.0 },
                { xi: 350.0,  yi: 0.0, xf: 550.0,  yf: 0.0, q: 0.0,  P_tramo: 0.0, a_dist: 0.0 },
                { xi: 550.0,  yi: 0.0, xf: 750.0,  yf: 0.0, q: 0.0,  P_tramo: 0.0, a_dist: 0.0 },
                { xi: 750.0,  yi: 0.0, xf: 900.0,  yf: 0.0, q: 0.0,  P_tramo: 0.0, a_dist: 0.0 },
                { xi: 900.0,  yi: 0.0, xf: 1150.0, yf: 0.0, q: 20.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 1150.0, yi: 0.0, xf: 1300.0, yf: 0.0, q: 0.0,  P_tramo: 0.0, a_dist: 0.0 }
            ],
            oblique_loads: [],
            nodes: [
                { cond: 'EMPOTRADO', Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'LIBRE',     Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'FIJO',      Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'LIBRE',     Px: 0.0, Py: -3000.0, Mz: 0.0 },
                { cond: 'RODILLO',   Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'LIBRE',     Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'LIBRE',     Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'FIJO',      Px: 0.0, Py: 0.0,     Mz: 0.0 }
            ]
        },
        ejemplos_ingeniero: {
            id: 'ejemplos_ingeniero',
            name: '3. Ejercicio 1 Carpeta EJEMPLOS.xlsx del Ingeniero (7 Nudos, 6 Barras)',
            E: 120000.0,
            sec_type: 'RECTANGULAR',
            b: 30.0,
            h: 60.0,
            p3: 0.0,
            p4: 0.0,
            prop_mode: 'CONSTANTE',
            steiner_rows: [
                { tipo: 'RECTANGULO', b: 30.0, b_sup: 0, h: 30.0, y_base: 0.0,  x_c: 15.0 },
                { tipo: 'RECTANGULO', b: 30.0, b_sup: 0, h: 30.0, y_base: 30.0, x_c: 15.0 }
            ],
            bars: [
                { xi: 0.0,   yi: 0.0, xf: 100.0, yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 100.0, yi: 0.0, xf: 300.0, yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 300.0, yi: 0.0, xf: 500.0, yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 500.0, yi: 0.0, xf: 600.0, yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 600.0, yi: 0.0, xf: 700.0, yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 700.0, yi: 0.0, xf: 800.0, yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 }
            ],
            oblique_loads: [],
            nodes: [
                { cond: 'RODILLO',   Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'LIBRE',     Px: 0.0, Py: -600.0,  Mz: 20000.0 },
                { cond: 'FIJO',      Px: 0.0, Py: -3700.0, Mz: 0.0 },
                { cond: 'LIBRE',     Px: 0.0, Py: -1200.0, Mz: 10000.0 },
                { cond: 'LIBRE',     Px: 0.0, Py: -600.0,  Mz: 10000.0 },
                { cond: 'LIBRE',     Px: 0.0, Py: -5500.0, Mz: 0.0 },
                { cond: 'EMPOTRADO', Px: 0.0, Py: 0.0,     Mz: 0.0 }
            ]
        },
        viga_steiner_t: {
            id: 'viga_steiner_t',
            name: '4. Viga con Sección Compuesta T por Teorema de Steiner (5 Nudos, 4 Barras)',
            E: 250000.0,
            sec_type: 'STEINER_COMPUESTA',
            b: 20.0,
            h: 50.0,
            p3: 0.0,
            p4: 0.0,
            prop_mode: 'CONSTANTE',
            steiner_rows: [
                { tipo: 'RECTANGULO', b: 20.0, b_sup: 0, h: 40.0, y_base: 0.0,  x_c: 30.0 },
                { tipo: 'RECTANGULO', b: 60.0, b_sup: 0, h: 10.0, y_base: 40.0, x_c: 30.0 }
            ],
            bars: [
                { xi: 0.0,   yi: 0.0, xf: 300.0,  yf: 0.0, q: 12.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 300.0, yi: 0.0, xf: 600.0,  yf: 0.0, q: 0.0,  P_tramo: 0.0, a_dist: 0.0 },
                { xi: 600.0, yi: 0.0, xf: 900.0,  yf: 0.0, q: 0.0,  P_tramo: 0.0, a_dist: 0.0 },
                { xi: 900.0, yi: 0.0, xf: 1200.0, yf: 0.0, q: 18.0, P_tramo: 0.0, a_dist: 0.0 }
            ],
            oblique_loads: [
                { nudo: 3, P: 2000.0, modo: 'PENDIENTE_dx_dy', val1: 3.0, val2: 4.0, dir_x: '+X (DER)', dir_y: '-Y (ABAJO)' }
            ],
            nodes: [
                { cond: 'EMPOTRADO', Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'RODILLO',   Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'LIBRE',     Px: 0.0, Py: -1500.0, Mz: 0.0 },
                { cond: 'RODILLO',   Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'FIJO',      Px: 0.0, Py: 0.0,     Mz: 0.0 }
            ]
        },
        ejemplo_5_pizarra: {
            id: 'ejemplo_5_pizarra',
            name: '5. Viga Continua 5 Tramos (11 m) con Cargas Mixtas (Pizarra del Ingeniero)',
            E: 2100000.0,
            sec_type: 'RECTANGULAR',
            b: 25.0,
            h: 50.0,
            p3: 0.0,
            p4: 0.0,
            prop_mode: 'CONSTANTE',
            steiner_rows: [
                { tipo: 'RECTANGULO', b: 25.0, b_sup: 0, h: 50.0, y_base: 0.0, x_c: 12.5 }
            ],
            bars: [
                { xi: 0.0,    yi: 0.0, xf: 200.0,  yf: 0.0, q: 400.0, q_unit: 'kgf/m', q_input: 400.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 200.0,  yi: 0.0, xf: 500.0,  yf: 0.0, q: 400.0, q_unit: 'kgf/m', q_input: 400.0, P_tramo: 0.0, a_dist: 0.0 },
                { xi: 500.0,  yi: 0.0, xf: 600.0,  yf: 0.0, q: 0.0, q_unit: 'kgf/m', q_input: 0.0,   P_tramo: 0.0, a_dist: 0.0 },
                { xi: 600.0,  yi: 0.0, xf: 800.0,  yf: 0.0, q: 0.0, q_unit: 'kgf/m', q_input: 0.0,   P_tramo: 0.0, a_dist: 0.0 },
                { xi: 800.0,  yi: 0.0, xf: 1100.0, yf: 0.0, q: 0.0, q_unit: 'kgf/m', q_input: 0.0,   P_tramo: 0.0, a_dist: 0.0 }
            ],
            oblique_loads: [],
            nodes: [
                { cond: 'FIJO',    Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'LIBRE',   Px: 0.0, Py: -1000.0, Mz: 0.0 },
                { cond: 'RODILLO', Px: 0.0, Py: 0.0,     Mz: 0.0 },
                { cond: 'LIBRE',   Px: 0.0, Py: -2000.0, Mz: 0.0 },
                { cond: 'LIBRE',   Px: 0.0, Py: -3000.0, Mz: 0.0 },
                { cond: 'RODILLO', Px: 0.0, Py: 0.0,     Mz: 0.0 }
            ]
        }
    };

    function getPreset(id) {
        const p = PRESETS[id] || PRESETS.presentacion_pdf;
        return JSON.parse(JSON.stringify(p));
    }

    return {
        MAX_BARS,
        MAX_NODES,
        TOTAL_DOFS,
        computeSteinerTable,
        computeSectionProperties,
        solveBeam,
        solve: solveBeam,
        PRESETS,
        getPreset
    };
}));


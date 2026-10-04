/**
 * truss-solver.js
 * Motor de Cálculo Matricial de Rigidez Directa para Armaduras Planas 2D
 * Cátedra: Ing. Ulianov Cuba Valencia - Análisis Estructural II
 * Soporta hasta 6 Nodos (12 GDL) y hasta 8 Barras.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TrussSolver = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Paleta oficial de 8 colores pastel para trazabilidad visual de barras
    const BAR_PALETTE = [
        { id: 1, name: "Azul Cielo",  bg: "#E0F2FE", border: "#0284C7", text: "#0369A1", fillHex: "E0F2FE" },
        { id: 2, name: "Menta Suave", bg: "#DCFCE7", border: "#16A34A", text: "#15803D", fillHex: "DCFCE7" },
        { id: 3, name: "Rosa Coral",  bg: "#FEE2E2", border: "#DC2626", text: "#B91C1C", fillHex: "FEE2E2" },
        { id: 4, name: "Melocotón",   bg: "#FEF3C7", border: "#D97706", text: "#B45309", fillHex: "FEF3C7" },
        { id: 5, name: "Lavanda",     bg: "#F3E8FF", border: "#9333EA", text: "#7E22CE", fillHex: "F3E8FF" },
        { id: 6, name: "Turquesa",    bg: "#CCFBF1", border: "#0D9488", text: "#0F766E", fillHex: "CCFBF1" },
        { id: 7, name: "Mantequilla", bg: "#FEF9C3", border: "#CA8A04", text: "#A16207", fillHex: "FEF9C3" },
        { id: 8, name: "Lila Pastel", bg: "#EDE7F6", border: "#7C3AED", text: "#6D28D9", fillHex: "EDE7F6" }
    ];

    /**
     * Resuelve un sistema lineal A * x = b usando eliminación gaussiana con pivoteo parcial.
     */
    function solveLinearSystem(A, b) {
        const n = A.length;
        // Clonar matriz aumentada
        const M = A.map((row, i) => [...row, b[i]]);

        for (let i = 0; i < n; i++) {
            // Pivoteo parcial
            let maxRow = i;
            let maxVal = Math.abs(M[i][i]);
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(M[k][i]) > maxVal) {
                    maxVal = Math.abs(M[k][i]);
                    maxRow = k;
                }
            }

            if (maxVal < 1e-12) {
                return null; // Matriz singular o estructura cinemáticamente inestable
            }

            // Intercambiar fila i con maxRow
            if (maxRow !== i) {
                const temp = M[i];
                M[i] = M[maxRow];
                M[maxRow] = temp;
            }

            // Normalizar pivote
            const pivot = M[i][i];
            for (let j = i; j <= n; j++) {
                M[i][j] /= pivot;
            }

            // Eliminar hacia arriba y hacia abajo (Gauss-Jordan)
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = M[k][i];
                    for (let j = i; j <= n; j++) {
                        M[k][j] -= factor * M[i][j];
                    }
                }
            }
        }

        const x = new Array(n);
        for (let i = 0; i < n; i++) {
            x[i] = M[i][n];
        }
        return x;
    }

    /**
     * Calcula la inversa de una matriz nxn mediante eliminación Gauss-Jordan.
     */
    function invertMatrix(A) {
        const n = A.length;
        const M = A.map((row, i) => {
            const ext = new Array(n).fill(0);
            ext[i] = 1;
            return [...row, ...ext];
        });

        for (let i = 0; i < n; i++) {
            let maxRow = i;
            let maxVal = Math.abs(M[i][i]);
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(M[k][i]) > maxVal) {
                    maxVal = Math.abs(M[k][i]);
                    maxRow = k;
                }
            }

            if (maxVal < 1e-12) {
                return null; // Singular
            }

            if (maxRow !== i) {
                const temp = M[i];
                M[i] = M[maxRow];
                M[maxRow] = temp;
            }

            const pivot = M[i][i];
            for (let j = 0; j < 2 * n; j++) {
                M[i][j] /= pivot;
            }

            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = M[k][i];
                    for (let j = 0; j < 2 * n; j++) {
                        M[k][j] -= factor * M[i][j];
                    }
                }
            }
        }

        const inv = [];
        for (let i = 0; i < n; i++) {
            inv.push(M[i].slice(n, 2 * n));
        }
        return inv;
    }

    /**
     * Multiplicación de Matrices A (n x m) y B (m x p)
     */
    function multiplyMatrices(A, B) {
        const rowsA = A.length;
        const colsA = A[0].length;
        const colsB = B[0].length;
        const C = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));

        for (let i = 0; i < rowsA; i++) {
            for (let j = 0; j < colsB; j++) {
                let sum = 0;
                for (let k = 0; k < colsA; k++) {
                    sum += A[i][k] * B[k][j];
                }
                C[i][j] = sum;
            }
        }
        return C;
    }

    /**
     * Multiplica Matriz A (n x m) por Vector v (m)
     */
    function matrixVectorMultiply(A, v) {
        const rows = A.length;
        const cols = A[0].length;
        const res = new Array(rows).fill(0);
        for (let i = 0; i < rows; i++) {
            let sum = 0;
            for (let j = 0; j < cols; j++) {
                sum += A[i][j] * v[j];
            }
            res[i] = sum;
        }
        return res;
    }

    /**
     * Normaliza un tipo de apoyo a un formato estándar.
     * Retorna objeto { rx: 0/1, ry: 0/1, code: 'LIBRE'|'FIJO'|'MOVIL_X'|'MOVIL_Y' }
     */
    function parseSupportType(supportStr) {
        if (!supportStr) return { rx: 0, ry: 0, code: 'LIBRE', label: 'Libre (Rx=0, Ry=0)' };
        const s = String(supportStr).trim().toUpperCase();

        if (s.startsWith('FIJO') || s.startsWith('PIN') || s === 'ARTICULADO') {
            return { rx: 1, ry: 1, code: 'FIJO', label: 'Fijo (Rx=1, Ry=1)' };
        }
        // Convención Cátedra Ing. Ulianov Cuba Valencia:
        // "Móvil Y" o "Rodillo Y": Restringe el eje Y (Ry=1, Rx=0)
        if (s.includes('MOVIL Y') || s.includes('MÓVIL Y') || s.includes('RODILLO Y') || s === 'MOVIL' || s === 'MÓVIL') {
            return { rx: 0, ry: 1, code: 'MOVIL_Y', label: 'Móvil Y (Apoyo en Y: Ry=1, Libre en X: Rx=0)' };
        }
        // "Móvil X" o "Rodillo X": Restringe el eje X (Rx=1, Ry=0)
        if (s.includes('MOVIL X') || s.includes('MÓVIL X') || s.includes('RODILLO X')) {
            return { rx: 1, ry: 0, code: 'MOVIL_X', label: 'Móvil X (Apoyo en X: Rx=1, Libre en Y: Ry=0)' };
        }
        return { rx: 0, ry: 0, code: 'LIBRE', label: 'Libre (Rx=0, Ry=0)' };
    }

    /**
     * Resuelve el análisis estructural completo por Rigidez Directa.
     *
     * @param {Array} rawNodes Lista de hasta 6 nodos: [{ id: 1, x: 0, y: 0, support: 'Fijo', px: 0, py: 0 }, ...]
     * @param {Array} rawBars Lista de hasta 8 barras: [{ id: 1, start: 1, end: 2, a: 10, e: 2100000 }, ...]
     * @returns {Object} Objeto con todos los resultados numéricos y paso a paso matricial.
     */
    function solveTruss(rawNodes, rawBars) {
        const MAX_NODES = 6;
        const MAX_BARS = 8;
        const TOTAL_DOFS = 2 * MAX_NODES; // 12 DOFs

        // 1. Filtrar y validar nodos activos
        const nodesMap = new Map();
        const activeNodes = [];
        for (let i = 0; i < rawNodes.length; i++) {
            const nd = rawNodes[i];
            if (nd && nd.id && nd.x !== null && nd.x !== undefined && nd.x !== "" &&
                          nd.y !== null && nd.y !== undefined && nd.y !== "") {
                const xVal = parseFloat(nd.x);
                const yVal = parseFloat(nd.y);
                const pxVal = parseFloat(nd.px) || 0;
                const pyVal = parseFloat(nd.py) || 0;
                const supp = parseSupportType(nd.support);

                const nodeObj = {
                    id: parseInt(nd.id),
                    x: xVal,
                    y: yVal,
                    support: supp.code,
                    supportLabel: supp.label,
                    rx: supp.rx,
                    ry: supp.ry,
                    px: pxVal,
                    py: pyVal,
                    dofX: (parseInt(nd.id) - 1) * 2,
                    dofY: (parseInt(nd.id) - 1) * 2 + 1,
                    dofLabelX: `U${nd.id}X`,
                    dofLabelY: `U${nd.id}Y`
                };
                nodesMap.set(nodeObj.id, nodeObj);
                activeNodes.push(nodeObj);
            }
        }

        if (activeNodes.length < 2) {
            return {
                success: false,
                error: "Se requieren al menos 2 nodos con coordenadas válidas para analizar la estructura."
            };
        }

        // 2. Filtrar y validar barras activas
        const activeBars = [];
        for (let m = 0; m < rawBars.length; m++) {
            const br = rawBars[m];
            if (br && br.start && br.end && nodesMap.has(parseInt(br.start)) && nodesMap.has(parseInt(br.end))) {
                const sNode = nodesMap.get(parseInt(br.start));
                const eNode = nodesMap.get(parseInt(br.end));
                const barId = br.id || (m + 1);

                const dx = eNode.x - sNode.x;
                const dy = eNode.y - sNode.y;
                const L = Math.hypot(dx, dy);

                if (L < 1e-6) {
                    return {
                        success: false,
                        error: `La barra #${barId} tiene longitud nula (nodos ${sNode.id} y ${eNode.id} están en el mismo punto).`
                    };
                }

                const cx = dx / L;
                const cy = dy / L;
                const a = parseFloat(br.a) > 0 ? parseFloat(br.a) : 10.0;
                const e = parseFloat(br.e) > 0 ? parseFloat(br.e) : 2100000.0;
                const ael = (a * e) / L;

                const colorInfo = BAR_PALETTE[(barId - 1) % BAR_PALETTE.length];

                // Grados de libertad globales correspondientes (0-indexed)
                const dofs = [sNode.dofX, sNode.dofY, eNode.dofX, eNode.dofY];
                const dofLabels = [sNode.dofLabelX, sNode.dofLabelY, eNode.dofLabelX, eNode.dofLabelY];

                // Matriz local 4x4 k_m
                const km = [
                    [ ael * cx * cx,  ael * cx * cy, -ael * cx * cx, -ael * cx * cy],
                    [ ael * cx * cy,  ael * cy * cy, -ael * cx * cy, -ael * cy * cy],
                    [-ael * cx * cx, -ael * cx * cy,  ael * cx * cx,  ael * cx * cy],
                    [-ael * cx * cy, -ael * cy * cy,  ael * cx * cy,  ael * cy * cy]
                ];

                activeBars.push({
                    id: barId,
                    start: sNode.id,
                    end: eNode.id,
                    sNode,
                    eNode,
                    dx,
                    dy,
                    L,
                    cx,
                    cy,
                    a,
                    e,
                    ael,
                    color: colorInfo,
                    dofs,
                    dofLabels,
                    km
                });
            }
        }

        if (activeBars.length < 1) {
            return {
                success: false,
                error: "Se requiere al menos 1 barra conectando los nodos."
            };
        }

        // 3. Crear listado completo de los 12 GDL (U1X..U6Y)
        const allDofLabels = [];
        for (let i = 1; i <= MAX_NODES; i++) {
            allDofLabels.push(`U${i}X`);
            allDofLabels.push(`U${i}Y`);
        }

        // 4. Asignar vector global de cargas y restricciones para los 12 GDL
        const dofRestraints = new Array(TOTAL_DOFS).fill(0); // 1 = restringido (apoyo), 0 = libre
        const appliedForces = new Array(TOTAL_DOFS).fill(0); // Px, Py
        const isDofActiveNode = new Array(TOTAL_DOFS).fill(false); // ¿Pertenece a un nodo existente?

        for (const nd of activeNodes) {
            const idxX = nd.dofX;
            const idxY = nd.dofY;
            isDofActiveNode[idxX] = true;
            isDofActiveNode[idxY] = true;

            dofRestraints[idxX] = nd.rx;
            dofRestraints[idxY] = nd.ry;

            appliedForces[idxX] = nd.px;
            appliedForces[idxY] = nd.py;
        }

        // 5. Ensamblar matrices expandidas Km (12x12) y Karmadura global (12x12)
        const Karmadura = Array.from({ length: TOTAL_DOFS }, () => new Array(TOTAL_DOFS).fill(0));
        const expandedMatrices = [];

        for (const bar of activeBars) {
            const Kexp = Array.from({ length: TOTAL_DOFS }, () => new Array(TOTAL_DOFS).fill(0));
            const dofs = bar.dofs;

            for (let r = 0; r < 4; r++) {
                const globalRow = dofs[r];
                for (let c = 0; c < 4; c++) {
                    const globalCol = dofs[c];
                    const val = bar.km[r][c];
                    Kexp[globalRow][globalCol] += val;
                    Karmadura[globalRow][globalCol] += val;
                }
            }
            expandedMatrices.push({
                barId: bar.id,
                matrix: Kexp,
                color: bar.color
            });
        }

        // 6. Identificar Grados de Libertad Libres y Restringidos de los nodos ACTIVOS
        const freeDofIndices = [];
        const restDofIndices = [];

        for (let i = 0; i < TOTAL_DOFS; i++) {
            if (isDofActiveNode[i]) {
                if (dofRestraints[i] === 0) {
                    freeDofIndices.push(i);
                } else {
                    restDofIndices.push(i);
                }
            }
        }

        const numFree = freeDofIndices.length;
        const numRest = restDofIndices.length;

        if (numRest < 3) {
            return {
                success: false,
                error: `La estructura tiene solo ${numRest} reacciones en apoyos. Para estabilidad 2D se requieren al menos 3 restricciones independientes (Estructura Hipostática / Mecanismo).`
            };
        }

        if (numFree === 0) {
            return {
                success: false,
                error: "Todos los nodos están totalmente empotrados/apoyados, no hay grados de libertad para calcular desplazamientos."
            };
        }

        // 7. Extraer Submatriz K11 (numFree x numFree) y Vector de Cargas C_libres (numFree)
        const K11 = Array.from({ length: numFree }, () => new Array(numFree).fill(0));
        const C_libres = new Array(numFree).fill(0);
        const freeLabels = [];

        for (let i = 0; i < numFree; i++) {
            const gi = freeDofIndices[i];
            const nodeNum = Math.floor(gi / 2) + 1;
            const dir = (gi % 2 === 0) ? 'X' : 'Y';
            freeLabels.push(`D${nodeNum}${dir}`);
            C_libres[i] = appliedForces[gi];

            for (let j = 0; j < numFree; j++) {
                const gj = freeDofIndices[j];
                K11[i][j] = Karmadura[gi][gj];
            }
        }

        // 8. Invertir K11 y Resolver Desplazamientos D_libres = [K11]^-1 * C_libres
        const K11_inv = invertMatrix(K11);
        if (!K11_inv) {
            return {
                success: false,
                error: "La matriz K11 es singular (determinante cero). La armadura contiene un mecanismo interno o no tiene suficiente rigidez en alguna dirección."
            };
        }

        const D_libres = matrixVectorMultiply(K11_inv, C_libres);

        // Vector total de desplazamientos (12 GDL)
        const totalDisplacements = new Array(TOTAL_DOFS).fill(0);
        for (let i = 0; i < numFree; i++) {
            const gi = freeDofIndices[i];
            totalDisplacements[gi] = D_libres[i];
        }

        // 9. Extraer Submatriz K21 (numRest x numFree) y calcular Reacciones R = [K21] * D_libres
        const K21 = Array.from({ length: numRest }, () => new Array(numFree).fill(0));
        const restLabels = [];

        for (let i = 0; i < numRest; i++) {
            const gi = restDofIndices[i];
            const nodeNum = Math.floor(gi / 2) + 1;
            const dir = (gi % 2 === 0) ? 'X' : 'Y';
            restLabels.push(`R${nodeNum}${dir}`);

            for (let j = 0; j < numFree; j++) {
                const gj = freeDofIndices[j];
                K21[i][j] = Karmadura[gi][gj];
            }
        }

        // Reacciones: R = K21 * D_libres - P_apoyos (generalmente P_apoyos = 0 en apoyos)
        const rawReactions = matrixVectorMultiply(K21, D_libres);
        const reactions = [];
        for (let i = 0; i < numRest; i++) {
            const gi = restDofIndices[i];
            const nodeNum = Math.floor(gi / 2) + 1;
            const dir = (gi % 2 === 0) ? 'X' : 'Y';
            const reacVal = rawReactions[i] - appliedForces[gi];

            reactions.push({
                index: i + 1,
                dofIndex: gi,
                label: `R${nodeNum}${dir}`,
                nodeId: nodeNum,
                direction: dir,
                value: reacVal
            });
        }

        // 10. Verificación de Equilibrio Estático Global: Sum(Fx) y Sum(Fy)
        let sumAppliedFx = 0;
        let sumAppliedFy = 0;
        let sumReacFx = 0;
        let sumReacFy = 0;

        for (const nd of activeNodes) {
            sumAppliedFx += nd.px;
            sumAppliedFy += nd.py;
        }

        for (const r of reactions) {
            if (r.direction === 'X') sumReacFx += r.value;
            if (r.direction === 'Y') sumReacFy += r.value;
        }

        const eqErrorX = Math.abs(sumAppliedFx + sumReacFx);
        const eqErrorY = Math.abs(sumAppliedFy + sumReacFy);
        const isEquilibriumValid = eqErrorX < 1e-2 && eqErrorY < 1e-2;

        // 11. Cálculo de Fuerzas Axiales en cada Barra
        // F_m = (AE/L) * [-cx, -cy, cx, cy] * { D_iX, D_iY, D_jX, D_jY }
        const memberForces = [];
        for (const bar of activeBars) {
            const dofs = bar.dofs;
            const dVec = [
                totalDisplacements[dofs[0]],
                totalDisplacements[dofs[1]],
                totalDisplacements[dofs[2]],
                totalDisplacements[dofs[3]]
            ];

            const strainTerms = -bar.cx * dVec[0] - bar.cy * dVec[1] + bar.cx * dVec[2] + bar.cy * dVec[3];
            const axialForce = bar.ael * strainTerms; // (+) Tracción, (-) Compresión
            const stress = axialForce / bar.a;

            let state = "FUERZA NULA";
            let stateClass = "state-zero";
            let stateColor = "#64748B"; // slate
            if (axialForce > 0.001) {
                state = "BARRA A TRACCIÓN (+)";
                stateClass = "state-tension";
                stateColor = "#0284C7"; // azul/cyan
            } else if (axialForce < -0.001) {
                state = "BARRA A COMPRESIÓN (-)";
                stateClass = "state-compression";
                stateColor = "#DC2626"; // rojo coral
            }

            memberForces.push({
                barId: bar.id,
                start: bar.start,
                end: bar.end,
                L: bar.L,
                a: bar.a,
                e: bar.e,
                ael: bar.ael,
                cx: bar.cx,
                cy: bar.cy,
                dVec,
                strainTerms,
                axialForce,
                stress,
                state,
                stateClass,
                stateColor,
                color: bar.color
            });
        }

        // Grado de Hiperestaticidad: GH = b + r - 2*n
        const b = activeBars.length;
        const rCount = numRest;
        const nCount = activeNodes.length;
        const gh = (b + rCount) - 2 * nCount;

        let structuralType = "Isostática (GH = 0)";
        if (gh > 0) structuralType = `Hiperestática de Grado ${gh}`;
        else if (gh < 0) structuralType = `Hipostática / Inestable (GH = ${gh})`;

        return {
            success: true,
            MAX_NODES,
            MAX_BARS,
            TOTAL_DOFS,
            allDofLabels,
            activeNodes,
            activeBars,
            gh,
            structuralType,
            dofRestraints,
            appliedForces,
            Karmadura,
            expandedMatrices,
            freeDofIndices,
            restDofIndices,
            freeLabels,
            restLabels,
            K11,
            K11_inv,
            C_libres,
            D_libres,
            K21,
            reactions,
            totalDisplacements,
            memberForces,
            equilibrium: {
                sumAppliedFx,
                sumAppliedFy,
                sumReacFx,
                sumReacFy,
                eqErrorX,
                eqErrorY,
                isValid: isEquilibriumValid
            }
        };
    }

    return {
        BAR_PALETTE,
        solveTruss,
        parseSupportType,
        invertMatrix,
        multiplyMatrices,
        matrixVectorMultiply,
        solveLinearSystem
    };
}));

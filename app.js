/**
 * app.js
 * Controlador Principal y Enlace Reactivo para la Aplicación Web
 * Cátedra: Ing. Ulianov Cuba Valencia - Análisis Estructural II
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // 1. Presets Oficiales de la Cátedra
    const PRESETS = {
        isostatic_3n: {
            name: "Caso 1: Isostático (3 Nodos, 3 Barras - Cátedra Ulianov)",
            description: "Armadura triangular isostática con apoyo móvil en nudo 1 y fijo en nudo 2. Carga puntual de 4000 Kgf en X y -5000 Kgf en Y en el nudo 3.",
            nodes: [
                { id: 1, x: 0,    y: 0,   support: "Móvil Y", px: 0,    py: 0 },
                { id: 2, x: -700, y: 0,   support: "Fijo",    px: 0,    py: 0 },
                { id: 3, x: -400, y: 500, support: "Libre",   px: 4000, py: -5000 },
                { id: 4, x: null, y: null, support: "Libre",  px: null, py: null },
                { id: 5, x: null, y: null, support: "Libre",  px: null, py: null },
                { id: 6, x: null, y: null, support: "Libre",  px: null, py: null }
            ],
            bars: [
                { id: 1, start: 1, end: 3, a: 10, e: 2100000 },
                { id: 2, start: 2, end: 3, a: 10, e: 2100000 },
                { id: 3, start: 2, end: 1, a: 10, e: 2100000 },
                { id: 4, start: null, end: null, a: 10, e: 2100000 },
                { id: 5, start: null, end: null, a: 10, e: 2100000 },
                { id: 6, start: null, end: null, a: 10, e: 2100000 },
                { id: 7, start: null, end: null, a: 10, e: 2100000 },
                { id: 8, start: null, end: null, a: 10, e: 2100000 }
            ]
        },
        hyperstatic_4n: {
            name: "Caso 2: Hiperestático San Andrés (4 Nodos, 6 Barras - GH = 2)",
            description: "Malla rectangular arriostrada en cruz (San Andrés). Dos apoyos fijos inferiores y cargas de 3500 Kgf en nudos superiores.",
            nodes: [
                { id: 1, x: 0,   y: 0,   support: "Fijo",  px: 0,    py: 0 },
                { id: 2, x: 400, y: 0,   support: "Fijo",  px: 0,    py: 0 },
                { id: 3, x: 400, y: 300, support: "Libre", px: 3500, py: -5000 },
                { id: 4, x: 0,   y: 300, support: "Libre", px: 3500, py: 0 },
                { id: 5, x: null, y: null, support: "Libre", px: null, py: null },
                { id: 6, x: null, y: null, support: "Libre", px: null, py: null }
            ],
            bars: [
                { id: 1, start: 1, end: 2, a: 12, e: 2100000 },
                { id: 2, start: 2, end: 3, a: 12, e: 2100000 },
                { id: 3, start: 3, end: 4, a: 12, e: 2100000 },
                { id: 4, start: 4, end: 1, a: 12, e: 2100000 },
                { id: 5, start: 1, end: 3, a: 12, e: 2100000 },
                { id: 6, start: 2, end: 4, a: 12, e: 2100000 },
                { id: 7, start: null, end: null, a: 12, e: 2100000 },
                { id: 8, start: null, end: null, a: 12, e: 2100000 }
            ]
        },
        warren_5n: {
            name: "Caso 3: Armadura Warren (5 Nodos, 7 Barras)",
            description: "Armadura tipo Warren de 2 tramos simétricos con apoyos en los extremos inferiores y carga nodal central en el nudo superior.",
            nodes: [
                { id: 1, x: 0,   y: 0,   support: "Fijo",    px: 0, py: 0 },
                { id: 2, x: 300, y: 250, support: "Libre",   px: 0, py: -6000 },
                { id: 3, x: 600, y: 0,   support: "Móvil Y", px: 0, py: 0 },
                { id: 4, x: 150, y: 125, support: "Libre",   px: 0, py: 0 },
                { id: 5, x: 450, y: 125, support: "Libre",   px: 0, py: 0 },
                { id: 6, x: null, y: null, support: "Libre", px: null, py: null }
            ],
            bars: [
                { id: 1, start: 1, end: 4, a: 15, e: 2100000 },
                { id: 2, start: 4, end: 2, a: 15, e: 2100000 },
                { id: 3, start: 2, end: 5, a: 15, e: 2100000 },
                { id: 4, start: 5, end: 3, a: 15, e: 2100000 },
                { id: 5, start: 1, end: 3, a: 15, e: 2100000 },
                { id: 6, start: 4, end: 5, a: 15, e: 2100000 },
                { id: 7, start: 1, end: 2, a: 15, e: 2100000 },
                { id: 8, start: null, end: null, a: 15, e: 2100000 }
            ]
        },
        roof_5n: {
            name: "Caso 4: Armadura Tipo Techo Howe (5 Nodos, 7 Barras)",
            description: "Armadura simétrica a dos aguas con tirante inferior y montante central. Apoyos fijo y móvil en los extremos inferiores.",
            nodes: [
                { id: 1, x: 0,   y: 0,   support: "Fijo",    px: 0, py: 0 },
                { id: 2, x: 300, y: 0,   support: "Libre",   px: 0, py: 0 },
                { id: 3, x: 600, y: 0,   support: "Móvil Y", px: 0, py: 0 },
                { id: 4, x: 150, y: 150, support: "Libre",   px: 0, py: 0 },
                { id: 5, x: 300, y: 220, support: "Libre",   px: 0, py: -5000 },
                { id: 6, x: null, y: null, support: "Libre", px: null, py: null }
            ],
            bars: [
                { id: 1, start: 1, end: 2, a: 10, e: 2100000 },
                { id: 2, start: 2, end: 3, a: 10, e: 2100000 },
                { id: 3, start: 1, end: 4, a: 10, e: 2100000 },
                { id: 4, start: 4, end: 5, a: 10, e: 2100000 },
                { id: 5, start: 5, end: 3, a: 10, e: 2100000 },
                { id: 6, start: 4, end: 2, a: 10, e: 2100000 },
                { id: 7, start: 5, end: 2, a: 10, e: 2100000 },
                { id: 8, start: null, end: null, a: 10, e: 2100000 }
            ]
        },
        blank: {
            name: "Modelo en Blanco (Personalizado)",
            description: "Armadura limpia para ingresar nodos y barras desde cero.",
            nodes: [
                { id: 1, x: 0, y: 0, support: "Fijo", px: 0, py: 0 },
                { id: 2, x: null, y: null, support: "Libre", px: null, py: null },
                { id: 3, x: null, y: null, support: "Libre", px: null, py: null },
                { id: 4, x: null, y: null, support: "Libre", px: null, py: null },
                { id: 5, x: null, y: null, support: "Libre", px: null, py: null },
                { id: 6, x: null, y: null, support: "Libre", px: null, py: null }
            ],
            bars: [
                { id: 1, start: null, end: null, a: 10, e: 2100000 },
                { id: 2, start: null, end: null, a: 10, e: 2100000 },
                { id: 3, start: null, end: null, a: 10, e: 2100000 },
                { id: 4, start: null, end: null, a: 10, e: 2100000 },
                { id: 5, start: null, end: null, a: 10, e: 2100000 },
                { id: 6, start: null, end: null, a: 10, e: 2100000 },
                { id: 7, start: null, end: null, a: 10, e: 2100000 },
                { id: 8, start: null, end: null, a: 10, e: 2100000 }
            ]
        }
    };

    // 2. Estado de la Aplicación
    const state = {
        currentPresetKey: 'isostatic_3n',
        nodes: JSON.parse(JSON.stringify(PRESETS.isostatic_3n.nodes)),
        bars: JSON.parse(JSON.stringify(PRESETS.isostatic_3n.bars)),
        solution: null,
        activeTab: 'tab-results'
    };

    // 3. Inicializar Canvas 2D
    const canvasElement = document.getElementById('trussCanvas');
    const renderer = new TrussCanvas(canvasElement);

    // Redimensionar Canvas al cambiar tamaño de ventana
    window.addEventListener('resize', () => {
        renderer.resize();
        renderer.fitView();
    });

    // 4. Renderizado Dinámico de Tablas de Entrada
    const nodesTbody = document.getElementById('nodesTableBody');
    const barsTbody = document.getElementById('barsTableBody');

    function renderTables() {
        // A. Tabla de Nodos
        nodesTbody.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const nd = state.nodes[i] || { id: i + 1, x: null, y: null, support: 'Libre', px: null, py: null };
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-800/50 transition-colors border-b border-slate-700/50 text-xs";

            tr.innerHTML = `
                <td class="p-2 text-center font-bold text-sky-400 bg-slate-900/60">${i + 1}</td>
                <td class="p-1">
                    <input type="number" step="any" data-type="node" data-idx="${i}" data-field="x"
                        class="w-full bg-slate-800/80 border border-slate-600 rounded px-2 py-1 text-right text-slate-100 font-mono focus:outline-none focus:border-sky-400"
                        placeholder="cm" value="${nd.x !== null && nd.x !== undefined ? nd.x : ''}">
                </td>
                <td class="p-1">
                    <input type="number" step="any" data-type="node" data-idx="${i}" data-field="y"
                        class="w-full bg-slate-800/80 border border-slate-600 rounded px-2 py-1 text-right text-slate-100 font-mono focus:outline-none focus:border-sky-400"
                        placeholder="cm" value="${nd.y !== null && nd.y !== undefined ? nd.y : ''}">
                </td>
                <td class="p-1">
                    <select data-type="node" data-idx="${i}" data-field="support"
                        class="w-full bg-slate-800/80 border border-slate-600 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-sky-400">
                        <option value="Libre" ${nd.support === 'Libre' ? 'selected' : ''}>Libre</option>
                        <option value="Fijo" ${nd.support === 'Fijo' ? 'selected' : ''}>Fijo (Rx, Ry)</option>
                        <option value="Móvil Y" ${nd.support === 'Móvil Y' ? 'selected' : ''}>Móvil Y (Apoyo Ry)</option>
                        <option value="Móvil X" ${nd.support === 'Móvil X' ? 'selected' : ''}>Móvil X (Apoyo Rx)</option>
                    </select>
                </td>
                <td class="p-1">
                    <input type="number" step="any" data-type="node" data-idx="${i}" data-field="px"
                        class="w-full bg-slate-800/80 border border-slate-600 rounded px-2 py-1 text-right text-orange-300 font-mono focus:outline-none focus:border-orange-400"
                        placeholder="0" value="${nd.px !== null && nd.px !== undefined ? nd.px : ''}">
                </td>
                <td class="p-1">
                    <input type="number" step="any" data-type="node" data-idx="${i}" data-field="py"
                        class="w-full bg-slate-800/80 border border-slate-600 rounded px-2 py-1 text-right text-orange-300 font-mono focus:outline-none focus:border-orange-400"
                        placeholder="0" value="${nd.py !== null && nd.py !== undefined ? nd.py : ''}">
                </td>
            `;
            nodesTbody.appendChild(tr);
        }

        // B. Tabla de Barras
        barsTbody.innerHTML = '';
        const BAR_PALETTE = TrussSolver.BAR_PALETTE;

        for (let m = 0; m < 8; m++) {
            const br = state.bars[m] || { id: m + 1, start: null, end: null, a: 10, e: 2100000 };
            const pal = BAR_PALETTE[m % BAR_PALETTE.length];
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-800/50 transition-colors border-b border-slate-700/50 text-xs";

            // Opciones de nodos 1..6
            let optStart = `<option value="">-</option>`;
            let optEnd = `<option value="">-</option>`;
            for (let n = 1; n <= 6; n++) {
                optStart += `<option value="${n}" ${br.start === n ? 'selected' : ''}>N${n}</option>`;
                optEnd += `<option value="${n}" ${br.end === n ? 'selected' : ''}>N${n}</option>`;
            }

            tr.innerHTML = `
                <td class="p-2 text-center font-bold" style="background-color: ${pal.bg}; color: ${pal.text};">
                    ${m + 1}
                </td>
                <td class="p-1">
                    <select data-type="bar" data-idx="${m}" data-field="start"
                        class="w-full bg-slate-800/80 border border-slate-600 rounded px-2 py-1 text-slate-100 font-semibold focus:outline-none focus:border-sky-400">
                        ${optStart}
                    </select>
                </td>
                <td class="p-1">
                    <select data-type="bar" data-idx="${m}" data-field="end"
                        class="w-full bg-slate-800/80 border border-slate-600 rounded px-2 py-1 text-slate-100 font-semibold focus:outline-none focus:border-sky-400">
                        ${optEnd}
                    </select>
                </td>
                <td class="p-1">
                    <input type="number" step="any" data-type="bar" data-idx="${m}" data-field="a"
                        class="w-full bg-slate-800/80 border border-slate-600 rounded px-2 py-1 text-right text-slate-100 font-mono focus:outline-none focus:border-sky-400"
                        placeholder="10" value="${br.a || 10}">
                </td>
                <td class="p-1">
                    <input type="number" step="any" data-type="bar" data-idx="${m}" data-field="e"
                        class="w-full bg-slate-800/80 border border-slate-600 rounded px-2 py-1 text-right text-slate-100 font-mono focus:outline-none focus:border-sky-400"
                        placeholder="2100000" value="${br.e || 2100000}">
                </td>
                <td class="p-1 text-right font-mono text-slate-400 bar-calc-l" id="bar-len-${m}">-</td>
                <td class="p-1 text-right font-mono text-slate-400 bar-calc-ael" id="bar-ael-${m}">-</td>
            `;
            barsTbody.appendChild(tr);
        }
    }

    // 5. Escuchar cambios de entrada en vivo
    function handleInputChange(e) {
        const target = e.target;
        const type = target.dataset.type;
        const idx = parseInt(target.dataset.idx);
        const field = target.dataset.field;

        if (type === 'node') {
            let val = target.value.trim();
            if (field === 'x' || field === 'y' || field === 'px' || field === 'py') {
                state.nodes[idx][field] = val === '' ? null : parseFloat(val);
            } else {
                state.nodes[idx][field] = val;
            }
        } else if (type === 'bar') {
            let val = target.value.trim();
            if (field === 'start' || field === 'end') {
                state.bars[idx][field] = val === '' ? null : parseInt(val);
            } else if (field === 'a' || field === 'e') {
                state.bars[idx][field] = val === '' ? 10 : parseFloat(val);
            }
        }

        recalculateAndRender(false);
    }

    document.getElementById('inputTablesContainer').addEventListener('input', handleInputChange);
    document.getElementById('inputTablesContainer').addEventListener('change', handleInputChange);

    // 6. Recalcular y Actualizar Todo el Dashboard
    function recalculateAndRender(autoFit = false) {
        // Resolver mediante TrussSolver
        const solution = TrussSolver.solveTruss(state.nodes, state.bars);
        state.solution = solution;

        // Actualizar Canvas
        renderer.setData(state.nodes, state.bars, solution);
        if (autoFit) {
            renderer.fitView();
        }

        // Actualizar previsualización de Longitud L y AE/L en tabla de barras
        for (let m = 0; m < 8; m++) {
            const lenEl = document.getElementById(`bar-len-${m}`);
            const aelEl = document.getElementById(`bar-ael-${m}`);
            if (solution && solution.success && solution.activeBars) {
                const bSol = solution.activeBars.find(b => b.id === (m + 1));
                if (bSol) {
                    if (lenEl) lenEl.textContent = `${bSol.L.toFixed(1)} cm`;
                    if (aelEl) aelEl.textContent = `${bSol.ael.toFixed(1)}`;
                    continue;
                }
            }
            if (lenEl) lenEl.textContent = "-";
            if (aelEl) aelEl.textContent = "-";
        }

        // Actualizar Banner de Estado Estructural
        const statusBadge = document.getElementById('structuralStatusBadge');
        const eqBadge = document.getElementById('equilibriumBadge');

        if (solution && solution.success) {
            statusBadge.className = "px-3 py-1 rounded-full text-xs font-bold border transition-colors " +
                (solution.gh === 0 ? "bg-emerald-950/80 border-emerald-500 text-emerald-400" : "bg-sky-950/80 border-sky-500 text-sky-400");
            statusBadge.innerHTML = `Estructura: ${solution.structuralType}`;

            eqBadge.className = "px-3 py-1 rounded-full text-xs font-bold border transition-colors " +
                (solution.equilibrium.isValid ? "bg-teal-950/80 border-teal-500 text-teal-300" : "bg-red-950/80 border-red-500 text-red-400");
            eqBadge.innerHTML = solution.equilibrium.isValid
                ? `✔ Equilibrio Exacto (∑Fx=0, ∑Fy=0)`
                : `⚠ Error de Equilibrio: Fx=${solution.equilibrium.eqErrorX.toFixed(2)}, Fy=${solution.equilibrium.eqErrorY.toFixed(2)}`;
        } else {
            statusBadge.className = "px-3 py-1 rounded-full text-xs font-bold border bg-amber-950/80 border-amber-500 text-amber-400";
            statusBadge.innerHTML = solution && solution.error ? `⚠ ${solution.error}` : "Editando parámetros...";
            eqBadge.className = "hidden";
        }

        // Actualizar Pestañas de Resultados
        renderResultsTab(solution);
        renderPedagogicalTab(solution);
        renderGlobalMatrixTab(solution);
    }

    // 7. Renderizado de Pestaña 1: Resumen de Resultados
    function renderResultsTab(sol) {
        const container = document.getElementById('resultsContainer');
        if (!container) return;

        if (!sol || !sol.success) {
            container.innerHTML = `
                <div class="p-8 text-center text-slate-400">
                    <p class="text-base font-semibold text-amber-400 mb-2">Estructura no resuelta aún</p>
                    <p class="text-sm">${sol && sol.error ? sol.error : 'Ingrese coordenadas válidas y conecte al menos una barra.'}</p>
                </div>
            `;
            return;
        }

        let reactionsRows = '';
        for (const r of sol.reactions) {
            reactionsRows += `
                <tr class="border-b border-slate-700/40 text-xs">
                    <td class="p-2 font-bold text-emerald-400">${r.label}</td>
                    <td class="p-2 text-center">Nudo ${r.nodeId}</td>
                    <td class="p-2 text-center">${r.direction}</td>
                    <td class="p-2 text-right font-mono font-bold text-slate-100">${r.value.toFixed(2)} Kgf</td>
                </tr>
            `;
        }

        let barsRows = '';
        for (const m of sol.memberForces) {
            const stateBg = m.axialForce > 0.01 ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700' :
                           (m.axialForce < -0.01 ? 'bg-rose-950/60 text-rose-300 border-rose-700' : 'bg-slate-800 text-slate-400 border-slate-700');
            barsRows += `
                <tr class="border-b border-slate-700/40 text-xs hover:bg-slate-800/40">
                    <td class="p-2 text-center font-bold" style="color: ${m.color.border};">Barra ${m.barId}</td>
                    <td class="p-2 text-center">N${m.start} → N${m.end}</td>
                    <td class="p-2 text-right font-mono">${m.L.toFixed(1)} cm</td>
                    <td class="p-2 text-right font-mono">${m.a.toFixed(1)} cm²</td>
                    <td class="p-2 text-right font-mono font-bold ${m.axialForce >= 0 ? 'text-cyan-400' : 'text-rose-400'}">
                        ${m.axialForce >= 0 ? '+' : ''}${m.axialForce.toFixed(2)} Kgf
                    </td>
                    <td class="p-2 text-right font-mono">${(m.stress).toFixed(2)} Kgf/cm²</td>
                    <td class="p-2 text-center">
                        <span class="px-2 py-0.5 rounded border text-[10px] font-bold ${stateBg}">${m.state}</span>
                    </td>
                </tr>
            `;
        }

        let dispRows = '';
        for (const nd of sol.activeNodes) {
            const uX = sol.totalDisplacements[nd.dofX] || 0;
            const uY = sol.totalDisplacements[nd.dofY] || 0;
            const totalD = Math.hypot(uX, uY);
            dispRows += `
                <tr class="border-b border-slate-700/40 text-xs">
                    <td class="p-2 font-bold text-sky-400">Nudo ${nd.id}</td>
                    <td class="p-2 text-right font-mono">${uX.toFixed(7)} cm</td>
                    <td class="p-2 text-right font-mono">${uY.toFixed(7)} cm</td>
                    <td class="p-2 text-right font-mono font-semibold text-slate-200">${totalD.toFixed(7)} cm</td>
                </tr>
            `;
        }

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <!-- Reacciones en Apoyos -->
                <div class="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center justify-between">
                        <span>Reacciones en Apoyos</span>
                        <span class="text-[10px] text-slate-400 font-normal">{R} = [K₂₁] · {D}</span>
                    </h3>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead>
                                <tr class="text-[10px] uppercase text-slate-400 border-b border-slate-700">
                                    <th class="p-1">Reacción</th>
                                    <th class="p-1 text-center">Nudo</th>
                                    <th class="p-1 text-center">Eje</th>
                                    <th class="p-1 text-right">Magnitud</th>
                                </tr>
                            </thead>
                            <tbody>${reactionsRows}</tbody>
                        </table>
                    </div>
                </div>

                <!-- Desplazamientos Nodal -->
                <div class="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-sky-400 mb-3 flex items-center justify-between">
                        <span>Desplazamientos Nodales</span>
                        <span class="text-[10px] text-slate-400 font-normal">{D} = [K₁₁]⁻¹ · {C}</span>
                    </h3>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead>
                                <tr class="text-[10px] uppercase text-slate-400 border-b border-slate-700">
                                    <th class="p-1">Nudo</th>
                                    <th class="p-1 text-right">Dx (cm)</th>
                                    <th class="p-1 text-right">Dy (cm)</th>
                                    <th class="p-1 text-right">Despl. Total</th>
                                </tr>
                            </thead>
                            <tbody>${dispRows}</tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Tabla de Resumen de Fuerzas en Barras -->
            <div class="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center justify-between">
                    <span>Fuerzas Axiales Internas y Diagnóstico Estructural</span>
                    <span class="text-[10px] text-slate-400 font-normal">Fₘ = (AE/L) · [-cx, -cy, cx, cy] · {D}</span>
                </h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="text-[10px] uppercase text-slate-400 border-b border-slate-700 bg-slate-800/40">
                                <th class="p-2 text-center">Barra</th>
                                <th class="p-2 text-center">Conexión</th>
                                <th class="p-2 text-right">Longitud</th>
                                <th class="p-2 text-right">Área</th>
                                <th class="p-2 text-right">Fuerza Axial N</th>
                                <th class="p-2 text-right">Esfuerzo σ</th>
                                <th class="p-2 text-center">Diagnóstico</th>
                            </tr>
                        </thead>
                        <tbody>${barsRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // 8. Renderizado de Pestaña 2: Paso a Paso Pedagógico
    function renderPedagogicalTab(sol) {
        const container = document.getElementById('pedagogicalContainer');
        if (!container) return;

        if (!sol || !sol.success) {
            container.innerHTML = `<p class="p-6 text-slate-400 text-center text-sm">Resuelva la armadura para visualizar las matrices paso a paso.</p>`;
            return;
        }

        // Matriz K11
        let k11Headers = sol.freeLabels.map(l => `<th class="p-1 text-center font-mono text-[10px] text-emerald-300 bg-emerald-950/40">${l}</th>`).join('');
        let k11Rows = '';
        for (let i = 0; i < sol.K11.length; i++) {
            let cells = sol.K11[i].map(v => `<td class="p-1 text-right font-mono text-[11px] text-slate-200">${v.toFixed(1)}</td>`).join('');
            k11Rows += `
                <tr class="border-b border-slate-800">
                    <td class="p-1 font-mono text-[10px] text-emerald-400 font-bold bg-slate-900">${sol.freeLabels[i]}</td>
                    ${cells}
                </tr>
            `;
        }

        // Matriz K21
        let k21Headers = sol.freeLabels.map(l => `<th class="p-1 text-center font-mono text-[10px] text-indigo-300 bg-indigo-950/40">${l}</th>`).join('');
        let k21Rows = '';
        for (let i = 0; i < sol.K21.length; i++) {
            let cells = sol.K21[i].map(v => `<td class="p-1 text-right font-mono text-[11px] text-slate-200">${v.toFixed(1)}</td>`).join('');
            k21Rows += `
                <tr class="border-b border-slate-800">
                    <td class="p-1 font-mono text-[10px] text-indigo-400 font-bold bg-slate-900">${sol.restLabels[i]}</td>
                    ${cells}
                </tr>
            `;
        }

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Tarjeta 1: Teoría y Partición Kinemática -->
                <div class="p-4 bg-slate-900/60 rounded-lg border border-slate-800 text-xs">
                    <h4 class="font-bold text-sky-400 mb-2 flex items-center justify-between">
                        <span>1. Partición Cinemática del Sistema Estructural</span>
                        <span class="text-slate-400 font-mono text-[11px]">{C} = [K_global] · {D}</span>
                    </h4>
                    <p class="text-slate-300 leading-relaxed mb-3">
                        Siguiendo la metodología de la cátedra del Ing. Ulianov Cuba Valencia, se eliminan las filas y columnas correspondientes
                        a los grados de libertad restringidos por apoyos (desplazamiento nulo \(D = 0\)). Esto divide el sistema en dos bloques fundamentales:
                    </p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="p-3 bg-emerald-950/30 rounded border border-emerald-800/50">
                            <span class="font-bold text-emerald-300">Submatriz [K₁₁] (Grados Libres)</span>
                            <p class="text-[11px] text-slate-400 mt-1">
                                Dimensión: ${sol.K11.length} × ${sol.K11.length}. Relaciona las cargas externas conocidas con los desplazamientos incógnita:
                                <br><span class="font-mono text-emerald-400 font-bold">{D_libres} = [K₁₁]⁻¹ · {C_libres}</span>
                            </p>
                        </div>
                        <div class="p-3 bg-indigo-950/30 rounded border border-indigo-800/50">
                            <span class="font-bold text-indigo-300">Submatriz [K₂₁] (Reacciones en Apoyos)</span>
                            <p class="text-[11px] text-slate-400 mt-1">
                                Dimensión: ${sol.K21.length} × ${sol.K11.length}. Permite obtener directamente las fuerzas de reacción en los apoyos:
                                <br><span class="font-mono text-indigo-400 font-bold">{R} = [K₂₁] · {D_libres}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Submatriz K11 -->
                <div class="p-4 bg-slate-900/60 rounded-lg border border-slate-800">
                    <h4 class="font-bold text-emerald-400 text-xs mb-3">Submatriz Reducida de Rigidez [K₁₁] (Grados Libres)</h4>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead><tr><th class="p-1 text-[10px] text-slate-400 bg-slate-900">GDL</th>${k11Headers}</tr></thead>
                            <tbody>${k11Rows}</tbody>
                        </table>
                    </div>
                </div>

                <!-- Submatriz K21 -->
                <div class="p-4 bg-slate-900/60 rounded-lg border border-slate-800">
                    <h4 class="font-bold text-indigo-400 text-xs mb-3">Submatriz de Acoplamiento de Apoyos [K₂₁]</h4>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead><tr><th class="p-1 text-[10px] text-slate-400 bg-slate-900">Apoyo</th>${k21Headers}</tr></thead>
                            <tbody>${k21Rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // 9. Renderizado de Pestaña 3: Matriz Global Ensamblada (12x12)
    function renderGlobalMatrixTab(sol) {
        const container = document.getElementById('globalMatrixContainer');
        if (!container) return;

        if (!sol || !sol.success) {
            container.innerHTML = `<p class="p-6 text-slate-400 text-center text-sm">Resuelva la armadura para visualizar la matriz Karmadura completa.</p>`;
            return;
        }

        const dofs = sol.allDofLabels;
        let thHeaders = dofs.map(d => `<th class="p-1 text-center font-mono text-[10px] text-slate-300 bg-slate-800">${d}</th>`).join('');

        let matrixRows = '';
        for (let i = 0; i < 12; i++) {
            let cells = '';
            for (let j = 0; j < 12; j++) {
                const val = sol.Karmadura[i][j];
                const isDiag = (i === j);
                const isNonZero = Math.abs(val) > 1e-4;
                const cellBg = isDiag ? 'bg-emerald-950/60 font-bold text-emerald-300' :
                               (isNonZero ? 'bg-slate-800/70 text-slate-100' : 'bg-slate-900/40 text-slate-500');

                cells += `<td class="p-1 text-right font-mono text-[10px] border border-slate-800/80 ${cellBg}">${isNonZero ? val.toFixed(0) : '0'}</td>`;
            }
            matrixRows += `
                <tr>
                    <td class="p-1 font-mono text-[10px] text-sky-400 font-bold bg-slate-800 border border-slate-700/60 text-center">${dofs[i]}</td>
                    ${cells}
                </tr>
            `;
        }

        container.innerHTML = `
            <div class="p-4 bg-slate-900/60 rounded-lg border border-slate-800">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-bold text-slate-200 text-xs">Matriz de Rigidez Ensamblada [Karmadura] (12 × 12)</h4>
                    <span class="text-[11px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800">
                        Diagonal Principal en Verde Pastel
                    </span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th class="p-1 text-[10px] text-slate-400 bg-slate-800 text-center">GDL</th>
                                ${thHeaders}
                            </tr>
                        </thead>
                        <tbody>${matrixRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // 10. Control de Pestañas
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            tabButtons.forEach(b => {
                b.classList.remove('active', 'border-sky-400', 'text-sky-400');
                b.classList.add('border-transparent', 'text-slate-400');
            });
            btn.classList.add('active', 'border-sky-400', 'text-sky-400');
            btn.classList.remove('border-transparent', 'text-slate-400');

            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
            const targetEl = document.getElementById(targetTab);
            if (targetEl) targetEl.classList.remove('hidden');
        });
    });

    // 11. Carga de Presets Rápidos
    const presetSelect = document.getElementById('presetSelect');
    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            const key = presetSelect.value;
            if (PRESETS[key]) {
                state.currentPresetKey = key;
                state.nodes = JSON.parse(JSON.stringify(PRESETS[key].nodes));
                state.bars = JSON.parse(JSON.stringify(PRESETS[key].bars));
                renderTables();
                recalculateAndRender(true);
            }
        });
    }

    // 12. Controles de Barra de Herramientas del Canvas
    document.getElementById('btnFitView').addEventListener('click', () => renderer.fitView());
    document.getElementById('btnZoomIn').addEventListener('click', () => {
        renderer.view.scale *= 1.25;
        renderer.render();
    });
    document.getElementById('btnZoomOut').addEventListener('click', () => {
        renderer.view.scale *= 0.8;
        renderer.render();
    });

    const toggleDeform = document.getElementById('toggleDeformed');
    if (toggleDeform) {
        toggleDeform.addEventListener('change', (e) => {
            renderer.options.showDeformed = e.target.checked;
            renderer.render();
        });
    }

    const deformSlider = document.getElementById('deformScaleSlider');
    if (deformSlider) {
        deformSlider.addEventListener('input', (e) => {
            renderer.options.deformScale = parseFloat(e.target.value);
            document.getElementById('deformScaleVal').textContent = `${e.target.value}x`;
            if (renderer.options.showDeformed) renderer.render();
        });
    }

    const toggleForces = document.getElementById('toggleForces');
    if (toggleForces) {
        toggleForces.addEventListener('change', (e) => {
            renderer.options.colorByForce = e.target.checked;
            renderer.render();
        });
    }

    const toggleGrid = document.getElementById('toggleGrid');
    if (toggleGrid) {
        toggleGrid.addEventListener('change', (e) => {
            renderer.options.showGrid = e.target.checked;
            renderer.render();
        });
    }

    document.getElementById('btnExportImg').addEventListener('click', () => {
        const dataUrl = renderer.exportImage();
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `Armadura_Grafica_${Date.now()}.png`;
        a.click();
    });

    // 13. BOTÓN MAESTRO DE DESCARGA EXCEL CON FÓRMULAS AUTOMATIZADAS
    const btnDownloadExcel = document.getElementById('btnDownloadExcel');
    if (btnDownloadExcel) {
        btnDownloadExcel.addEventListener('click', async () => {
            try {
                btnDownloadExcel.disabled = true;
                const originalHtml = btnDownloadExcel.innerHTML;
                btnDownloadExcel.innerHTML = `
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg> Generando Excel Automatizado...
                `;

                const isIsostatic = (state.solution && state.solution.gh === 0);
                const prefix = isIsostatic ? "Isostatica" : "Hiperestatica";
                const filename = `Plantilla_Armaduras_${prefix}_Catedra_Ulianov_${Date.now().toString().slice(-4)}.xlsx`;

                await ExcelGenerator.downloadTrussExcel(state.nodes, state.bars, isIsostatic, filename);

                btnDownloadExcel.innerHTML = `✔ ¡Excel Descargado con Éxito!`;
                btnDownloadExcel.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
                btnDownloadExcel.classList.add('bg-teal-700');

                setTimeout(() => {
                    btnDownloadExcel.disabled = false;
                    btnDownloadExcel.innerHTML = originalHtml;
                    btnDownloadExcel.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
                    btnDownloadExcel.classList.remove('bg-teal-700');
                }, 2500);
            } catch (err) {
                console.error("Error al generar Excel:", err);
                alert("Ocurrió un error al generar el archivo Excel: " + err.message);
                btnDownloadExcel.disabled = false;
                btnDownloadExcel.innerHTML = `Descargar Excel Automatizado (.xlsx)`;
            }
        });
    }

    // Inicialización inicial
    renderTables();
    recalculateAndRender(true);
});

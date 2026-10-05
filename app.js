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

            tr.innerHTML = `
                <td class="tbl-idx" style="color: var(--accent-sky);">${i + 1}</td>
                <td>
                    <input type="number" step="any" data-type="node" data-idx="${i}" data-field="x"
                        class="cell-input" placeholder="cm" value="${nd.x !== null && nd.x !== undefined ? nd.x : ''}">
                </td>
                <td>
                    <input type="number" step="any" data-type="node" data-idx="${i}" data-field="y"
                        class="cell-input" placeholder="cm" value="${nd.y !== null && nd.y !== undefined ? nd.y : ''}">
                </td>
                <td>
                    <select data-type="node" data-idx="${i}" data-field="support" class="cell-select">
                        <option value="Libre" ${nd.support === 'Libre' ? 'selected' : ''}>Libre</option>
                        <option value="Fijo" ${nd.support === 'Fijo' ? 'selected' : ''}>Fijo (Rx, Ry)</option>
                        <option value="Móvil Y" ${nd.support === 'Móvil Y' ? 'selected' : ''}>Móvil Y (Apoyo Ry)</option>
                        <option value="Móvil X" ${nd.support === 'Móvil X' ? 'selected' : ''}>Móvil X (Apoyo Rx)</option>
                    </select>
                </td>
                <td>
                    <input type="number" step="any" data-type="node" data-idx="${i}" data-field="px"
                        class="cell-input cell-input-force" placeholder="0" value="${nd.px !== null && nd.px !== undefined ? nd.px : ''}">
                </td>
                <td>
                    <input type="number" step="any" data-type="node" data-idx="${i}" data-field="py"
                        class="cell-input cell-input-force" placeholder="0" value="${nd.py !== null && nd.py !== undefined ? nd.py : ''}">
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

            // Opciones de nodos 1..6
            let optStart = `<option value="">—</option>`;
            let optEnd   = `<option value="">—</option>`;
            for (let n = 1; n <= 6; n++) {
                optStart += `<option value="${n}" ${br.start === n ? 'selected' : ''}>Nodo ${n}</option>`;
                optEnd   += `<option value="${n}" ${br.end === n ? 'selected' : ''}>Nodo ${n}</option>`;
            }

            tr.innerHTML = `
                <td class="tbl-idx" style="background:${pal.bg}; color:${pal.text};">${m + 1}</td>
                <td>
                    <select data-type="bar" data-idx="${m}" data-field="start" class="cell-select" style="font-weight:700">
                        ${optStart}
                    </select>
                </td>
                <td>
                    <select data-type="bar" data-idx="${m}" data-field="end" class="cell-select" style="font-weight:700">
                        ${optEnd}
                    </select>
                </td>
                <td>
                    <input type="number" step="any" data-type="bar" data-idx="${m}" data-field="a"
                        class="cell-input" placeholder="10" value="${br.a || 10}">
                </td>
                <td>
                    <input type="number" step="any" data-type="bar" data-idx="${m}" data-field="e"
                        class="cell-input" placeholder="2100000" value="${br.e || 2100000}">
                </td>
                <td class="cell-calc" id="bar-len-${m}">—</td>
                <td class="cell-calc" id="bar-ael-${m}">—</td>
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

    const inputContainer = document.getElementById('inputTablesContainer');
    if (inputContainer) {
        inputContainer.addEventListener('input', handleInputChange);
        inputContainer.addEventListener('change', handleInputChange);
    }

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
            if (lenEl) lenEl.textContent = "—";
            if (aelEl) aelEl.textContent = "—";
        }

        // Actualizar Banner de Estado Estructural
        const statusBadge = document.getElementById('structuralStatusBadge');
        const eqBadge = document.getElementById('equilibriumBadge');

        if (statusBadge) {
            if (solution && solution.success) {
                statusBadge.className = "badge " + (solution.gh === 0 ? "badge-green" : "badge-blue");
                statusBadge.innerHTML = `Estructura: ${solution.structuralType}`;

                if (eqBadge) {
                    eqBadge.className = "badge " + (solution.equilibrium.isValid ? "badge-green" : "badge-red");
                    eqBadge.style.display = "";
                    eqBadge.innerHTML = solution.equilibrium.isValid
                        ? `✔ Equilibrio Exacto (∑Fx=0, ∑Fy=0)`
                        : `⚠ Error de Equilibrio: Fx=${solution.equilibrium.eqErrorX.toFixed(2)}, Fy=${solution.equilibrium.eqErrorY.toFixed(2)}`;
                }
            } else {
                statusBadge.className = "badge badge-amber";
                statusBadge.innerHTML = solution && solution.error ? `⚠ ${solution.error}` : "Editando parámetros...";
                if (eqBadge) eqBadge.style.display = "none";
            }
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
                <div style="padding: 30px; text-align: center; color: var(--text-muted);">
                    <p style="font-size: 13px; font-weight: 700; color: var(--accent-amber); margin-bottom: 4px;">Estructura en Proceso de Edición</p>
                    <p style="font-size: 12px;">${sol && sol.error ? sol.error : 'Ingrese coordenadas válidas y conecte al menos una barra.'}</p>
                </div>
            `;
            return;
        }

        let reactionsRows = '';
        for (const r of sol.reactions) {
            reactionsRows += `
                <tr>
                    <td style="font-weight: 700; color: #34d399;">${r.label}</td>
                    <td style="text-align: center;">Nudo ${r.nodeId}</td>
                    <td style="text-align: center;">${r.direction}</td>
                    <td style="text-align: right; font-weight: 700; color: var(--text-main);">${r.value.toFixed(2)} Kgf</td>
                </tr>
            `;
        }

        // Calcular desplazamiento máximo para resaltar nodo crítico
        let maxDispVal = 0;
        let maxDispNodeId = null;
        for (const nd of sol.activeNodes) {
            const uX = sol.totalDisplacements[nd.dofX] || 0;
            const uY = sol.totalDisplacements[nd.dofY] || 0;
            const tD = Math.hypot(uX, uY);
            if (tD > maxDispVal) {
                maxDispVal = tD;
                maxDispNodeId = nd.id;
            }
        }

        let dispRows = '';
        for (const nd of sol.activeNodes) {
            const uX = sol.totalDisplacements[nd.dofX] || 0;
            const uY = sol.totalDisplacements[nd.dofY] || 0;
            const totalD = Math.hypot(uX, uY);
            const isMaxDeflection = (nd.id === maxDispNodeId && totalD > 1e-6);

            const xColor = Math.abs(uX) < 1e-7 ? 'color:#64748b;' : (uX > 0 ? 'color:#38bdf8;' : 'color:#0284c7;');
            const yColor = Math.abs(uY) < 1e-7 ? 'color:#64748b;' : (uY > 0 ? 'color:#34d399;' : 'color:#f43f5e;');

            dispRows += `
                <tr ${isMaxDeflection ? 'style="background: rgba(251, 191, 36, 0.08);"' : ''}>
                    <td style="font-weight: 700; color: #f8fafc;">
                        Nudo ${nd.id}
                        ${isMaxDeflection ? '<span style="font-size:9px; font-weight:800; background:#f59e0b; color:#000; padding:1px 6px; border-radius:4px; margin-left:6px;">⭐ MÁXIMA DEFLEXIÓN</span>' : ''}
                    </td>
                    <td style="text-align: right; font-family: monospace; ${xColor}">
                        <span style="font-size:10px; color:#94a3b8; margin-right:4px;">d${nd.id}x =</span>${(uX >= 0 ? '+' : '') + uX.toFixed(6)} cm
                    </td>
                    <td style="text-align: right; font-family: monospace; ${yColor}">
                        <span style="font-size:10px; color:#94a3b8; margin-right:4px;">d${nd.id}y =</span>${(uY >= 0 ? '+' : '') + uY.toFixed(6)} cm
                    </td>
                    <td style="text-align: right; font-family: monospace; font-weight: 700; color: ${isMaxDeflection ? '#fbbf24' : '#f1f5f9'};">
                        ${totalD.toFixed(6)} cm
                    </td>
                </tr>
            `;
        }

        let barsRows = '';
        for (const m of sol.memberForces) {
            const badgeClass = m.axialForce > 0.01 ? 'force-tension' : (m.axialForce < -0.01 ? 'force-compress' : 'force-zero');
            barsRows += `
                <tr>
                    <td style="text-align: center; font-weight: 700; color: ${m.color.border};">Barra ${m.barId}</td>
                    <td style="text-align: center;">N${m.start} → N${m.end}</td>
                    <td style="text-align: right;">${m.L.toFixed(1)} cm</td>
                    <td style="text-align: right;">${m.a.toFixed(1)} cm²</td>
                    <td style="text-align: right; font-weight: 700; color: ${m.axialForce >= 0 ? '#38bdf8' : '#f43f5e'};">
                        ${m.axialForce >= 0 ? '+' : ''}${m.axialForce.toFixed(2)} Kgf
                    </td>
                    <td style="text-align: right;">${m.stress.toFixed(2)} Kgf/cm²</td>
                    <td style="text-align: center;">
                        <span class="force-badge ${badgeClass}">${m.state}</span>
                    </td>
                </tr>
            `;
        }

        container.innerHTML = `
            <div class="results-grid-2col">
                <!-- Reacciones en Apoyos -->
                <div class="mini-card">
                    <div class="mini-card-head" style="color: var(--accent-emerald);">
                        <span>Reacciones en Apoyos</span>
                        <span class="mini-card-formula">{R} = [K₂₁] · {D}</span>
                    </div>
                    <div style="overflow-x: auto;">
                        <table class="results-table">
                            <thead>
                                <tr>
                                    <th style="text-align: left;">Reacción</th>
                                    <th>Nudo</th>
                                    <th>Eje</th>
                                    <th style="text-align: right;">Magnitud</th>
                                </tr>
                            </thead>
                            <tbody>${reactionsRows}</tbody>
                        </table>
                    </div>
                </div>

                <!-- Desplazamientos Nodales y Deflexiones -->
                <div class="mini-card">
                    <div class="mini-card-head" style="color: var(--accent-sky);">
                        <span>Desplazamientos Nodales y Deflexión</span>
                        <span class="mini-card-formula">{D} = [K₁₁]⁻¹ · {C}</span>
                    </div>
                    <div style="overflow-x: auto;">
                        <table class="results-table">
                            <thead>
                                <tr>
                                    <th style="text-align: left;">Nudo</th>
                                    <th style="text-align: right; color: #38bdf8;">d(i)x (Eje X)</th>
                                    <th style="text-align: right; color: #34d399;">d(i)y (Deflexión Y)</th>
                                    <th style="text-align: right; color: #fbbf24;">δ Total</th>
                                </tr>
                            </thead>
                            <tbody>${dispRows}</tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Tabla de Resumen de Fuerzas en Barras -->
            <div class="mini-card">
                <div class="mini-card-head" style="color: #ffffff;">
                    <span>Fuerzas Axiales Internas y Diagnóstico Estructural</span>
                    <span class="mini-card-formula">Fₘ = (AE/L) · [-cx, -cy, cx, cy] · {D}</span>
                </div>
                <div style="overflow-x: auto;">
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>Barra</th>
                                <th>Conexión</th>
                                <th style="text-align: right;">Longitud</th>
                                <th style="text-align: right;">Área</th>
                                <th style="text-align: right;">Fuerza Axial N</th>
                                <th style="text-align: right;">Esfuerzo σ</th>
                                <th>Diagnóstico</th>
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
            container.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--text-muted);">Resuelva la armadura para visualizar las submatrices de partición.</p>`;
            return;
        }

        // Matriz K11
        let k11Headers = sol.freeLabels.map(l => `<th style="padding: 4px; font-family: var(--font-mono); font-size: 10px; color: var(--accent-emerald);">${l}</th>`).join('');
        let k11Rows = '';
        for (let i = 0; i < sol.K11.length; i++) {
            let cells = sol.K11[i].map(v => `<td style="padding: 4px 6px; text-align: right; font-family: var(--font-mono); font-size: 10px;">${v.toFixed(1)}</td>`).join('');
            k11Rows += `
                <tr>
                    <td style="padding: 4px 6px; font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: var(--accent-emerald);">${sol.freeLabels[i]}</td>
                    ${cells}
                </tr>
            `;
        }

        // Matriz K21
        let k21Headers = sol.freeLabels.map(l => `<th style="padding: 4px; font-family: var(--font-mono); font-size: 10px; color: var(--accent-indigo);">${l}</th>`).join('');
        let k21Rows = '';
        for (let i = 0; i < sol.K21.length; i++) {
            let cells = sol.K21[i].map(v => `<td style="padding: 4px 6px; text-align: right; font-family: var(--font-mono); font-size: 10px;">${v.toFixed(1)}</td>`).join('');
            k21Rows += `
                <tr>
                    <td style="padding: 4px 6px; font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: var(--accent-indigo);">${sol.restLabels[i]}</td>
                    ${cells}
                </tr>
            `;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 14px;">
                <div style="background: var(--bg-panel); padding: 12px; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 12px;">
                    <strong style="color: var(--accent-sky); font-size: 12.5px; display: block; margin-bottom: 4px;">Partición Cinemática del Sistema Global</strong>
                    <p style="color: var(--text-muted); line-height: 1.6;">
                        El método de rigidez divide el sistema matricial eliminando los grados de libertad restringidos por apoyos (\(D = 0\)).
                        Esto define directamente la submatriz libre <strong>[K₁₁]</strong> para hallar desplazamientos y la submatriz <strong>[K₂₁]</strong> para obtener reacciones.
                    </p>
                </div>

                <div class="mini-card">
                    <div class="mini-card-head" style="color: var(--accent-emerald);">
                        <span>Submatriz Reducida de Rigidez [K₁₁] (${sol.K11.length} × ${sol.K11.length})</span>
                        <span class="mini-card-formula">{D_libres} = [K₁₁]⁻¹ · {C_libres}</span>
                    </div>
                    <div style="overflow-x: auto; max-height: 250px;">
                        <table class="results-table">
                            <thead><tr><th style="text-align: left;">GDL</th>${k11Headers}</tr></thead>
                            <tbody>${k11Rows}</tbody>
                        </table>
                    </div>
                </div>

                <div class="mini-card">
                    <div class="mini-card-head" style="color: var(--accent-indigo);">
                        <span>Submatriz de Apoyos y Reacciones [K₂₁] (${sol.K21.length} × ${sol.K11.length})</span>
                        <span class="mini-card-formula">{R} = [K₂₁] · {D_libres}</span>
                    </div>
                    <div style="overflow-x: auto; max-height: 250px;">
                        <table class="results-table">
                            <thead><tr><th style="text-align: left;">Apoyo</th>${k21Headers}</tr></thead>
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
            container.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--text-muted);">Resuelva la armadura para visualizar la matriz Karmadura completa.</p>`;
            return;
        }

        const dofs = sol.allDofLabels;
        let thHeaders = dofs.map(d => `<th>${d}</th>`).join('');

        let matrixRows = '';
        for (let i = 0; i < 12; i++) {
            let cells = '';
            for (let j = 0; j < 12; j++) {
                const val = sol.Karmadura[i][j];
                const isDiag = (i === j);
                const isNonZero = Math.abs(val) > 1e-4;
                const cellClass = isDiag ? 'matrix-diag' : (isNonZero ? '' : 'style="color: var(--text-dim);"');

                cells += `<td ${isDiag ? 'class="matrix-diag"' : (isNonZero ? '' : 'style="color: var(--text-dim);"')}>${isNonZero ? val.toFixed(0) : '0'}</td>`;
            }
            matrixRows += `
                <tr>
                    <td style="background: var(--bg-panel); color: var(--accent-sky); font-weight: 700; text-align: center;">${dofs[i]}</td>
                    ${cells}
                </tr>
            `;
        }

        container.innerHTML = `
            <div class="mini-card">
                <div class="mini-card-head" style="color: #ffffff;">
                    <span>Matriz de Rigidez Ensamblada [Karmadura] (12 × 12)</span>
                    <span class="mini-card-formula" style="color: #34d399;">Diagonal Principal Resaltada en Verde</span>
                </div>
                <div class="matrix-scroll-wrap">
                    <table class="matrix-table">
                        <thead>
                            <tr>
                                <th>GDL</th>
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
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(tc => {
                tc.classList.remove('active');
                tc.style.display = 'none';
            });
            const targetEl = document.getElementById(targetTab);
            if (targetEl) {
                targetEl.classList.add('active');
                targetEl.style.display = 'block';
            }
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
    const btnFitView = document.getElementById('btnFitView');
    if (btnFitView) btnFitView.addEventListener('click', () => renderer.fitView());

    const btnZoomIn = document.getElementById('btnZoomIn');
    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => {
            renderer.view.scale *= 1.25;
            renderer.render();
        });
    }

    const btnZoomOut = document.getElementById('btnZoomOut');
    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => {
            renderer.view.scale *= 0.8;
            renderer.render();
        });
    }

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
            const lbl = document.getElementById('deformScaleVal');
            if (lbl) lbl.textContent = `${e.target.value}x`;
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

    const btnExportImg = document.getElementById('btnExportImg');
    if (btnExportImg) {
        btnExportImg.addEventListener('click', () => {
            const dataUrl = renderer.exportImage();
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `Armadura_Grafica_${Date.now()}.png`;
            a.click();
        });
    }

    // 13. BOTÓN MAESTRO DE DESCARGA (PDF O EXCEL SEGÚN PERMISOS VIP)
    const btnDownloadExcel = document.getElementById('btnDownloadExcel');
    if (btnDownloadExcel) {
        btnDownloadExcel.addEventListener('click', async () => {
            try {
                btnDownloadExcel.disabled = true;
                const originalHtml = btnDownloadExcel.innerHTML;
                const isIsostatic = (state.solution && state.solution.gh === 0);
                const prefix = isIsostatic ? "Isostatica" : "Hiperestatica";
                const hasExcel = window.CerebroAuth && window.CerebroAuth.hasExcelPermission();

                if (hasExcel) {
                    // DESCARGA DE EXCEL .XLSX (Solo para Dueño o Alumno con Permiso VIP)
                    btnDownloadExcel.innerHTML = `
                        <svg class="animate-spin" style="animation: spin 1s linear infinite; display: inline-block; vertical-align: middle; margin-right: 6px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                            <path d="M12 2a10 10 0 0 1 10 10"></path>
                        </svg> Generando Excel VIP...
                    `;

                    const filename = `Plantilla_Armaduras_${prefix}_Catedra_Ulianov_${Date.now().toString().slice(-4)}.xlsx`;
                    await ExcelGenerator.downloadTrussExcel(state.nodes, state.bars, isIsostatic, filename, state.solverResult);

                    btnDownloadExcel.innerHTML = `✔ ¡Excel VIP Descargado!`;
                    btnDownloadExcel.style.background = "#047857";
                } else {
                    // DESCARGA DE INFORME TÉCNICO EN PDF (Para Alumno Normal - Protege Fórmulas)
                    btnDownloadExcel.innerHTML = `
                        <svg class="animate-spin" style="animation: spin 1s linear infinite; display: inline-block; vertical-align: middle; margin-right: 6px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                            <path d="M12 2a10 10 0 0 1 10 10"></path>
                        </svg> Generando Informe PDF...
                    `;

                    const canvasImg = renderer ? renderer.exportImage() : null;
                    const pdfFilename = `Informe_Calculo_Armadura_${prefix}_Ulianov_${Date.now().toString().slice(-4)}.pdf`;
                    await PDFGenerator.downloadTrussPDF(state.nodes, state.bars, state.solution, canvasImg, pdfFilename);

                    btnDownloadExcel.innerHTML = `✔ ¡Informe PDF Descargado!`;
                    btnDownloadExcel.style.background = "#0284c7";

                    // Mostrar modal informativo de Licencia VIP de Excel al alumno
                    if (window.CerebroAuth && window.CerebroAuth.showExcelVipNotice) {
                        window.CerebroAuth.showExcelVipNotice();
                    }
                }

                setTimeout(() => {
                    btnDownloadExcel.disabled = false;
                    btnDownloadExcel.innerHTML = originalHtml;
                    btnDownloadExcel.style.background = "";
                }, 2500);
            } catch (err) {
                console.error("Error al generar archivo:", err);
                alert("Ocurrió un error al generar el archivo: " + err.message);
                btnDownloadExcel.disabled = false;
                btnDownloadExcel.innerHTML = `Descargar Reporte de Cálculo`;
            }
        });
    }

    // API de integración para Proyectos y Guardado
    window.CerebroApp = {
        getCurrentData: () => ({
            nodes: JSON.parse(JSON.stringify(state.nodes)),
            bars: JSON.parse(JSON.stringify(state.bars))
        }),
        loadProjectData: (newNodes, newBars) => {
            state.nodes = JSON.parse(JSON.stringify(newNodes));
            state.bars = JSON.parse(JSON.stringify(newBars));
            renderTables();
            recalculateAndRender(true);
        }
    };

    // Inicialización inicial
    renderTables();
    recalculateAndRender(true);
});

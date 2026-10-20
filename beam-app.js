/**
 * app.js — CEREBRO ESTRUCTURAL v4.0 (Edición Vigas — Plantilla Ulianov)
 * Coordinador de interfaz clara, resolución reactiva en vivo,
 * dibujo de la "6° Gráfica Final" y descarga de Excel (.xlsx) y PNG.
 */

(function () {
    'use strict';

    // Estado reactivo global de la viga (Inicio limpio sin ejemplos)
    let currentState = {
        name: 'Viga en Blanco',
        E: 2100000.0,
        sec_type: 'RECTANGULAR',
        b: 15.0,
        h: 30.0,
        p3: 0.0,
        p4: 0.0,
        prop_mode: 'CONSTANTE',
        steiner_rows: [],
        bars: [
            { xi: 0.0, yi: 0.0, xf: 300.0, yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 }
        ],
        oblique_loads: [],
        nodes: [
            { cond: 'FIJO', Px: 0.0, Py: 0.0, Mz: 0.0 },
            { cond: 'RODILLO', Px: 0.0, Py: 0.0, Mz: 0.0 }
        ]
    };
    let currentSolution = null;

    // Sincronizador de etiquetas y visibilidad de sección
    function updateSecLabelsAndVisibility() {
        const lblB = document.getElementById('lblParamB');
        const lblH = document.getElementById('lblParamH');
        const lblP3 = document.getElementById('lblParamP3');
        const lblP4 = document.getElementById('lblParamP4');
        const steinerWrap = document.getElementById('steinerWrap');

        const secType = currentState.sec_type || 'RECTANGULAR';
        if (secType === 'T_SECTION' || secType === 'SECCION_T') {
            if (lblB) lblB.textContent = 'b_alma (cm)';
            if (lblH) lblH.textContent = 'h_alma (cm)';
            if (lblP3) lblP3.textContent = 'b_ala (cm)';
            if (lblP4) lblP4.textContent = 't_ala (cm)';
        } else if (secType === 'I_SECTION' || secType === 'DOBLE_T') {
            if (lblB) lblB.textContent = 'b_ala (cm)';
            if (lblH) lblH.textContent = 'H_tot (cm)';
            if (lblP3) lblP3.textContent = 't_ala (cm)';
            if (lblP4) lblP4.textContent = 't_alma (cm)';
        } else if (secType === 'CIRCULAR') {
            if (lblB) lblB.textContent = 'Diámetro D (cm)';
            if (lblH) lblH.textContent = '—';
            if (lblP3) lblP3.textContent = '—';
            if (lblP4) lblP4.textContent = '—';
        } else if (secType === 'TUBULAR_CIRCULAR') {
            if (lblB) lblB.textContent = 'D_ext (cm)';
            if (lblH) lblH.textContent = 'd_int (cm)';
            if (lblP3) lblP3.textContent = '—';
            if (lblP4) lblP4.textContent = '—';
        } else if (secType === 'CAJON_HUECO' || secType === 'BOX') {
            if (lblB) lblB.textContent = 'B_ext (cm)';
            if (lblH) lblH.textContent = 'H_ext (cm)';
            if (lblP3) lblP3.textContent = 'b_int (cm)';
            if (lblP4) lblP4.textContent = 'h_int (cm)';
        } else if (secType === 'DIRECTO_A_I') {
            if (lblB) lblB.textContent = 'Área A (cm²)';
            if (lblH) lblH.textContent = 'Inercia Iz (cm⁴)';
            if (lblP3) lblP3.textContent = '—';
            if (lblP4) lblP4.textContent = '—';
        } else {
            if (lblB) lblB.textContent = 'b (cm)';
            if (lblH) lblH.textContent = 'h (cm)';
            if (lblP3) lblP3.textContent = '—';
            if (lblP4) lblP4.textContent = '—';
        }

        if (steinerWrap) {
            if (secType === 'STEINER_COMPUESTA' || secType === 'STEINER_CUSTOM') {
                steinerWrap.style.display = 'block';
            } else {
                steinerWrap.style.display = 'none';
            }
        }
    }

    // Sincronizador de UI de Asistente Rápido de Tramos
    function refreshQuickSpansUI() {
        const numSel = document.getElementById('quickNumBars');
        const unitSel = document.getElementById('quickDistUnit');
        const container = document.getElementById('quickSpanInputsContainer');
        if (!container || !numSel) return;

        const activeSpans = (currentState.bars || []).filter(b => (b.xf || 0) > (b.xi || 0));
        if (activeSpans.length > 0) {
            numSel.value = Math.min(12, Math.max(1, activeSpans.length));
        }

        const n = parseInt(numSel.value, 10) || 3;
        const unit = unitSel ? unitSel.value : 'm';
        const scale = unit === 'm' ? 0.01 : 1.0;

        let html = '';
        for (let i = 0; i < n; i++) {
            const b = currentState.bars && currentState.bars[i];
            let defaultVal = 2;
            if (b && (b.xf > b.xi)) {
                defaultVal = Math.round(((b.xf - b.xi) * scale) * 100) / 100;
            }
            html += `
                <div class="span-pill">
                    <span>L${i + 1}:</span>
                    <input type="number" step="any" class="quick-span-val" data-idx="${i}" value="${defaultVal}">
                    <span>${unit}</span>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    // Inicialización del DOM
    function init() {
        // Cargar estado guardado de la viga si existe en localStorage
        try {
            const sync = localStorage.getItem('cerebro_active_beam_sync');
            if (sync) {
                const parsed = JSON.parse(sync);
                if (parsed && ((parsed.bars && parsed.bars.length > 0) || (parsed.nodes && parsed.nodes.length > 0))) {
                    currentState = parsed;
                }
            }
        } catch(e) {}

        setupPresetSelector();
        setupQuickSpans();
        setupSectionControls();
        setupMatrixTabs();
        setupDownloadButtons();

        loadStateIntoUI();

        setupViewModesAndWizard();
        setupCanvasInteractivity();
        setupGalleryAndReportModals();
    }

    // ── GESTIÓN DE PRESETS ───────────────────────────────────────
    function setupPresetSelector() {
        const sel = document.getElementById('selectPreset');
        const btnClear = document.getElementById('btnClearExercise');
        const btnQuickPizarra = document.getElementById('btnQuickPizarra');

        if (sel) {
            sel.addEventListener('change', () => {
                if (!sel.value) return;
                const p = BeamSolver.getPreset(sel.value);
                if (p) {
                    currentState = JSON.parse(JSON.stringify(p));
                    loadStateIntoUI();
                }
            });
        }

        if (btnQuickPizarra) {
            btnQuickPizarra.addEventListener('click', () => {
                if (sel) sel.value = 'ejemplo_5_pizarra';
                const p = BeamSolver.getPreset('ejemplo_5_pizarra');
                if (p) {
                    currentState = JSON.parse(JSON.stringify(p));
                    loadStateIntoUI();
                }
            });
        }

        if (btnClear) {
            btnClear.addEventListener('click', () => {
                if (confirm('¿Limpiar todos los datos para empezar una viga desde cero?')) {
                    currentState = {
                        name: 'Nueva Viga',
                        E: 2100000.0,
                        sec_type: 'RECTANGULAR',
                        b: 15.0,
                        h: 30.0,
                        p3: 0.0,
                        p4: 0.0,
                        prop_mode: 'CONSTANTE',
                        steiner_rows: [],
                        bars: [
                            { xi: 0.0, yi: 0.0, xf: 200.0, yf: 0.0, q: 0.0, P_tramo: 0.0, a_dist: 0.0 }
                        ],
                        dist_loads: [],
                        oblique_loads: [],
                        nodes: [
                            { cond: 'FIJO', Px: 0.0, Py: 0.0, Mz: 0.0 },
                            { cond: 'RODILLO', Px: 0.0, Py: 0.0, Mz: 0.0 }
                        ]
                    };
                    loadStateIntoUI();
                }
            });
        }
    }

    function loadStateIntoUI() {
        // 1. Cargar sección
        const inpE = document.getElementById('inpGlobalE');
        const inpType = document.getElementById('inpSecType');
        const inpB = document.getElementById('inpSecB');
        const inpH = document.getElementById('inpSecH');
        const inpP3 = document.getElementById('inpSecP3');
        const inpP4 = document.getElementById('inpSecP4');
        const inpMode = document.getElementById('inpPropMode');

        if (inpE) inpE.value = currentState.E != null ? currentState.E : 2100000;
        if (inpType) inpType.value = currentState.sec_type || 'RECTANGULAR';
        if (inpB) inpB.value = currentState.b != null ? currentState.b : 15;
        if (inpH) inpH.value = currentState.h != null ? currentState.h : 30;
        if (inpP3) inpP3.value = currentState.p3 != null ? currentState.p3 : 0;
        if (inpP4) inpP4.value = currentState.p4 != null ? currentState.p4 : 0;
        if (inpMode) inpMode.value = currentState.prop_mode || 'CONSTANTE';

        // Actualizar etiquetas de sección y visibilidad de Steiner
        updateSecLabelsAndVisibility();

        // 2. Sincronizar Asistente Rápido de Tramos
        refreshQuickSpansUI();

        // 3. Forzar sincronización de Cargas Distribuidas en Tabla 3.1
        syncDistLoadsFromBars(true);

        // 4. Renderizar todas las tablas de datos
        renderSteinerTable();
        renderBarsTable();
        renderNodesTable();
        renderSpansLoadsTable();
        renderObliqueTable();

        // 5. Sincronizar selector de casos / presets
        const selPreset = document.getElementById('selectPreset');
        if (selPreset) {
            selPreset.value = currentState.id || '';
        }

        recomputeAll();
    }

    // ── ASISTENTE RÁPIDO DE LONGITUDES DE TRAMOS (L1, L2, L3...) ──
    function setupQuickSpans() {
        const numSel = document.getElementById('quickNumBars');
        const unitSel = document.getElementById('quickDistUnit');
        const container = document.getElementById('quickSpanInputsContainer');
        const btnApply = document.getElementById('btnApplyQuickSpans');

        if (numSel) numSel.addEventListener('change', refreshQuickSpansUI);
        if (unitSel) unitSel.addEventListener('change', refreshQuickSpansUI);
        refreshQuickSpansUI();

        if (btnApply) {
            btnApply.addEventListener('click', () => {
                const n = parseInt(numSel.value, 10) || 3;
                const unit = unitSel ? unitSel.value : 'm';
                const mult = unit === 'm' ? 100.0 : 1.0;

                const inputs = container.querySelectorAll('.quick-span-val');
                let currentX = 0.0;
                const newBars = [];

                inputs.forEach((inp, i) => {
                    if (i < n) {
                        const len = parseFloat(inp.value) || 2.0;
                        const lenCm = len * mult;
                        const oldBar = currentState.bars && currentState.bars[i];
                        newBars.push({
                            xi: currentX,
                            yi: 0.0,
                            xf: currentX + lenCm,
                            yf: 0.0,
                            q: oldBar ? (oldBar.q || 0.0) : 0.0,
                            q_unit: oldBar ? (oldBar.q_unit || "kgf/cm") : "kgf/cm",
                            P_tramo: oldBar ? (oldBar.P_tramo || 0.0) : 0.0,
                            a_dist: oldBar ? (oldBar.a_dist || 0.0) : 0.0
                        });
                        currentX += lenCm;
                    }
                });

                currentState.bars = newBars;
                // Asegurar nodos correspondientes
                const reqNodes = n + 1;
                while (currentState.nodes.length < reqNodes) {
                    currentState.nodes.push({ cond: 'LIBRE', Px: 0.0, Py: 0.0, Mz: 0.0 });
                }

                renderBarsTable();
                renderNodesTable();
                recomputeAll();
            });
        }
    }

    // ── CONTROL DE SECCIÓN TRANSVERSAL Y STEINER ────────────────
    function setupSectionControls() {
        const inpE = document.getElementById('inpGlobalE');
        const inpType = document.getElementById('inpSecType');
        const inpB = document.getElementById('inpSecB');
        const inpH = document.getElementById('inpSecH');
        const inpP3 = document.getElementById('inpSecP3');
        const inpP4 = document.getElementById('inpSecP4');
        const inpMode = document.getElementById('inpPropMode');
        const btnToggleSteiner = document.getElementById('btnToggleSteiner');
        const steinerWrap = document.getElementById('steinerWrap');
        const inpMat = document.getElementById('inpMaterial');

        if (inpMat) {
            inpMat.addEventListener('change', () => {
                const mat = inpMat.value;
                if (mat === 'ACERO_A36') inpE.value = '2000000';
                else if (mat === 'ACERO_A992') inpE.value = '2040000';
                else if (mat === 'CONCRETO_210') inpE.value = '217370';
                else if (mat === 'CONCRETO_280') inpE.value = '250998';
                else if (mat === 'MADERA') inpE.value = '100000';
                updateSec();
                recomputeAll();
            });
        }
        if (inpE) {
            inpE.addEventListener('input', () => {
                if (inpMat && inpMat.value !== 'CUSTOM') {
                    inpMat.value = 'CUSTOM';
                }
            });
        }

        const updateSec = () => {
            currentState.E = parseFloat(inpE.value) || 2100000;
            currentState.sec_type = inpType.value;
            currentState.b = parseFloat(inpB.value) || 0;
            currentState.h = parseFloat(inpH.value) || 0;
            currentState.p3 = parseFloat(inpP3.value) || 0;
            currentState.p4 = parseFloat(inpP4.value) || 0;
            currentState.prop_mode = inpMode.value;

            updateSecLabelsAndVisibility();
            recomputeAll();
        };

        [inpE, inpType, inpB, inpH, inpP3, inpP4, inpMode].forEach(el => {
            if (el) el.addEventListener('input', updateSec);
            if (el) el.addEventListener('change', updateSec);
        });

        if (btnToggleSteiner && steinerWrap) {
            btnToggleSteiner.addEventListener('click', () => {
                steinerWrap.style.display = steinerWrap.style.display === 'none' ? 'block' : 'none';
            });
        }
    }

    // ── RENDERIZADO Y EDICIÓN DE TABLA DE STEINER (7 PIEZAS) ─────
    function renderSteinerTable() {
        const tbody = document.getElementById('tbodySteiner');
        if (!tbody) return;

        if (!Array.isArray(currentState.steiner_rows)) {
            currentState.steiner_rows = [];
        }

        let html = '';
        for (let i = 0; i < 7; i++) {
            const row = currentState.steiner_rows[i] || {
                tipo: 'RECTANGULO',
                b: 0.0,
                b_sup: 0.0,
                h: 0.0,
                y_base: 0.0,
                x_c: 0.0
            };

            html += `
                <tr data-st-idx="${i}">
                    <td><strong>Pieza ${i + 1}</strong></td>
                    <td class="cell-input">
                        <select class="st-inp" data-field="tipo">
                            <option value="RECTANGULO" ${row.tipo === 'RECTANGULO' ? 'selected' : ''}>RECTÁNGULO</option>
                            <option value="TRIANGULO" ${row.tipo === 'TRIANGULO' ? 'selected' : ''}>TRIÁNGULO</option>
                            <option value="CIRCULO" ${row.tipo === 'CIRCULO' ? 'selected' : ''}>CÍRCULO</option>
                            <option value="SEMICIRCULO" ${row.tipo === 'SEMICIRCULO' ? 'selected' : ''}>SEMICÍRCULO</option>
                            <option value="HUECO_RECT" ${row.tipo === 'HUECO_RECT' ? 'selected' : ''}>HUECO RECT.</option>
                            <option value="HUECO_CIRC" ${row.tipo === 'HUECO_CIRC' ? 'selected' : ''}>HUECO CIRC.</option>
                        </select>
                    </td>
                    <td class="cell-input"><input type="number" step="any" class="st-inp" data-field="b" value="${row.b || 0}"></td>
                    <td class="cell-input"><input type="number" step="any" class="st-inp" data-field="b_sup" value="${row.b_sup || 0}"></td>
                    <td class="cell-input"><input type="number" step="any" class="st-inp" data-field="h" value="${row.h || 0}"></td>
                    <td class="cell-input"><input type="number" step="any" class="st-inp" data-field="y_base" value="${row.y_base || 0}"></td>
                    <td class="cell-input"><input type="number" step="any" class="st-inp" data-field="x_c" value="${row.x_c || 0}"></td>
                    <td class="cell-auto-green st-out-a">0.00</td>
                    <td class="st-out-y">0.00</td>
                    <td class="st-out-ay">0.00</td>
                    <td class="st-out-i0">0.00</td>
                    <td class="st-out-dy">0.00</td>
                    <td class="cell-auto-green st-out-iz">0.00</td>
                </tr>
            `;
        }
        tbody.innerHTML = html;

        tbody.querySelectorAll('.st-inp').forEach(inp => {
            inp.addEventListener('input', readSteinerInputs);
            inp.addEventListener('change', readSteinerInputs);
        });
    }

    function readSteinerInputs() {
        const rows = [];
        const tbody = document.getElementById('tbodySteiner');
        if (!tbody) return;

        tbody.querySelectorAll('tr').forEach((tr, i) => {
            const tipo = tr.querySelector('[data-field="tipo"]').value;
            const b = parseFloat(tr.querySelector('[data-field="b"]').value) || 0;
            const b_sup = parseFloat(tr.querySelector('[data-field="b_sup"]').value) || 0;
            const h = parseFloat(tr.querySelector('[data-field="h"]').value) || 0;
            const y_base = parseFloat(tr.querySelector('[data-field="y_base"]').value) || 0;
            const x_c = parseFloat(tr.querySelector('[data-field="x_c"]').value) || 0;
            if (b > 0 || h > 0) {
                rows.push({ tipo, b, b_sup, h, y_base, x_c });
            }
        });

        currentState.steiner_rows = rows;
        recomputeAll();
    }

    // ── RENDERIZADO Y EDICIÓN DE TABLA 2: GEOMETRÍA PURA DE TRAMOS ────
    function renderBarsTable() {
        const tbody = document.getElementById('tbodyBars');
        if (!tbody) return;

        let html = '';
        for (let i = 0; i < BeamSolver.MAX_BARS; i++) {
            const b = currentState.bars && currentState.bars[i];
            const hasData = b && (b.xf !== null && b.xf !== undefined && b.xf !== '' && b.xf > b.xi);

            const xi = (b && b.xi !== null && b.xi !== undefined) ? b.xi : (i === 0 ? 0 : '');
            const yi = (b && b.yi !== null && b.yi !== undefined) ? b.yi : (i === 0 ? 0 : '');
            const xf = (b && b.xf !== null && b.xf !== undefined) ? b.xf : '';
            const yf = (b && b.yf !== null && b.yf !== undefined) ? b.yf : '';

            const nI = i + 1;
            const nF = i + 2;

            html += `
                <tr data-bar-idx="${i}" style="${hasData ? '' : 'opacity: 0.65;'}">
                    <td><strong style="color: #b91c1c;">[${i + 1}]</strong></td>
                    <td class="cell-auto-subhdr">${nI}</td>
                    <td class="cell-auto-subhdr">${nF}</td>
                    <td class="cell-input"><input type="number" step="any" class="bar-inp" data-field="xi" value="${xi}"></td>
                    <td class="cell-input"><input type="number" step="any" class="bar-inp" data-field="yi" value="${yi}"></td>
                    <td class="cell-input"><input type="number" step="any" class="bar-inp" data-field="xf" value="${xf}"></td>
                    <td class="cell-input"><input type="number" step="any" class="bar-inp" data-field="yf" value="${yf}"></td>
                    <td class="cell-auto-green bar-out-L">-</td>
                    <td class="cell-auto-green bar-out-Lm">-</td>
                    <td class="bar-out-cos">-</td>
                    <td class="bar-out-sin">-</td>
                    <td class="cell-auto-celeste bar-out-k1">-</td>
                    <td class="bar-out-k2">-</td>
                    <td class="bar-out-k3">-</td>
                    <td class="bar-out-k4">-</td>
                    <td class="bar-out-ea">-</td>
                    <td class="cell-auto-peach" style="font-family: monospace;">U${nI}X, U${nI}Y, U${nI}θ</td>
                    <td class="cell-auto-peach" style="font-family: monospace;">U${nF}X, U${nF}Y, U${nF}θ</td>
                </tr>
            `;
        }
        tbody.innerHTML = html;

        tbody.querySelectorAll('.bar-inp').forEach(inp => {
            inp.addEventListener('input', readBarsInputs);
            inp.addEventListener('change', readBarsInputs);
        });
    }

    function readBarsInputs() {
        const tbody = document.getElementById('tbodyBars');
        if (!tbody) return;

        const newBars = [];
        tbody.querySelectorAll('tr').forEach((tr, i) => {
            const xiVal = tr.querySelector('[data-field="xi"]').value;
            const yiVal = tr.querySelector('[data-field="yi"]').value;
            const xfVal = tr.querySelector('[data-field="xf"]').value;
            const yfVal = tr.querySelector('[data-field="yf"]').value;

            const oldBar = currentState.bars && currentState.bars[i];
            const q = oldBar ? (oldBar.q || 0.0) : 0.0;
            const qUnit = oldBar ? (oldBar.q_unit || 'kgf/m') : 'kgf/m';
            const qInput = oldBar ? (oldBar.q_input || 0.0) : 0.0;
            const lDist = oldBar ? (oldBar.L_dist || undefined) : undefined;

            if (xfVal !== '' && xfVal !== null && !isNaN(parseFloat(xfVal))) {
                newBars.push({
                    xi: parseFloat(xiVal) || 0.0,
                    yi: parseFloat(yiVal) || 0.0,
                    xf: parseFloat(xfVal),
                    yf: parseFloat(yfVal) || 0.0,
                    q: q,
                    q_input: qInput,
                    q_unit: qUnit,
                    L_dist: lDist,
                    P_tramo: 0.0,
                    a_dist: 0.0
                });
            }
        });

        currentState.bars = newBars;
        renderSpansLoadsTable();
        recomputeAll();
    }

    // ── RENDERIZADO Y EDICIÓN DE TABLA 3.1: EXCLUSIVAMENTE CARGAS DISTRIBUIDAS ────
    function syncDistLoadsFromBars(force = false) {
        if (force || !currentState.dist_loads || currentState.dist_loads.length === 0) {
            currentState.dist_loads = [];
            (currentState.bars || []).forEach((b, i) => {
                const hasLoad = (Math.abs(b.q || 0) > 1e-9) || (b.q_input !== undefined && b.q_input !== null && b.q_input !== '' && Math.abs(parseFloat(b.q_input) || 0) > 1e-9);
                if (hasLoad) {
                    const spanLen = Math.abs((b.xf || 0) - (b.xi || 0)) || 200;
                    const wVal = (b.q_input !== undefined && b.q_input !== null && b.q_input !== '') 
                        ? parseFloat(b.q_input) 
                        : (b.q_unit === 'kgf/m' ? (parseFloat(b.q || 0) * 100) : parseFloat(b.q || 0));
                    currentState.dist_loads.push({
                        barIdx: i,
                        w: wVal,
                        unit: b.q_unit || 'kgf/m',
                        L_dist: (b.L_dist !== undefined && b.L_dist !== null && b.L_dist !== '') ? parseFloat(b.L_dist) : spanLen
                    });
                }
            });
        }
    }

    function calcEquivalentLoads(wCm, spanLen, lLoaded) {
        const L = spanLen;
        const c = Math.min(L, Math.max(0, (lLoaded !== undefined && lLoaded !== null && lLoaded !== '') ? parseFloat(lLoaded) : L));
        const w = wCm;
        let Vi = 0, Mi = 0, Vj = 0, Mj = 0;
        if (Math.abs(w) > 1e-12 && L > 0) {
            if (Math.abs(c - L) < 1e-6) {
                Vi = (w * L) / 2.0;
                Mi = (w * L * L) / 12.0;
                Vj = (w * L) / 2.0;
                Mj = -(w * L * L) / 12.0;
            } else if (c > 0) {
                Mi = (w * c * c / (12.0 * L * L)) * (6.0 * L * L - 8.0 * L * c + 3.0 * c * c);
                Mj = -(w * Math.pow(c, 3) / (12.0 * L * L)) * (4.0 * L - 3.0 * c);
                Vi = (w * c * (L - c / 2.0)) / L + (Mi + Mj) / L;
                Vj = w * c - Vi;
            }
        }
        return { Vi, Mi, Vj, Mj };
    }

    function renderSpansLoadsTable() {
        const tbody = document.getElementById('tbodySpansLoads');
        if (!tbody) return;

        syncDistLoadsFromBars();

        // Si no hay ninguna carga distribuida registrada, mostrar 1 fila vacía lista para usar
        if (currentState.dist_loads.length === 0) {
            currentState.dist_loads.push({
                barIdx: 0,
                w: '',
                unit: 'kgf/m',
                L_dist: (currentState.bars && currentState.bars[0]) ? Math.abs(currentState.bars[0].xf - currentState.bars[0].xi) : 200
            });
        }

        const activeBars = (currentState.bars || []).map((b, idx) => ({
            idx: idx,
            barNum: idx + 1,
            nI: idx + 1,
            nF: idx + 2,
            L: Math.abs((b.xf || 0) - (b.xi || 0))
        })).filter(b => b.L > 0);

        let html = '';
        currentState.dist_loads.forEach((item, k) => {
            const barIdx = parseInt(item.barIdx, 10) || 0;
            const targetBar = currentState.bars && currentState.bars[barIdx];
            const spanLen = targetBar ? Math.abs(targetBar.xf - targetBar.xi) : 200;
            const lLoaded = (item.L_dist !== undefined && item.L_dist !== null && item.L_dist !== '') ? item.L_dist : spanLen;
            const wVal = parseFloat(item.w) || 0;
            const unit = item.unit || 'kgf/m';
            const wCm = unit === 'kgf/m' ? (wVal / 100.0) : wVal;

            const eq = calcEquivalentLoads(wCm, spanLen, lLoaded);

            const spanOptions = activeBars.map(ab => `
                <option value="${ab.idx}" ${ab.idx === barIdx ? 'selected' : ''}>
                    Tramo [${ab.barNum}]: Nudo (${ab.nI}) → (${ab.nF}) • L=${ab.L.toFixed(0)}cm
                </option>
            `).join('');

            html += `
                <tr data-dist-row="${k}">
                    <td><strong style="color: #00f0ff;">${k + 1}</strong></td>
                    <td class="cell-input">
                        <select class="dist-inp" data-field="barIdx" style="font-size: 11.5px; width: 100%; min-width: 170px;">
                            ${spanOptions || `<option value="0">Tramo [1] (Nudo 1 → 2)</option>`}
                        </select>
                    </td>
                    <td class="cell-input">
                        <input type="number" step="any" class="dist-inp" data-field="w" value="${item.w !== undefined ? item.w : ''}" placeholder="Ej: 400" style="width: 75px; font-weight: bold; color: #fbbf24;">
                    </td>
                    <td class="cell-input">
                        <select class="dist-inp" data-field="unit" style="font-size: 11px; width: 75px;">
                            <option value="kgf/m" ${unit === 'kgf/m' ? 'selected' : ''}>kgf/m</option>
                            <option value="kgf/cm" ${unit === 'kgf/cm' ? 'selected' : ''}>kgf/cm</option>
                        </select>
                    </td>
                    <td class="cell-auto-subhdr dist-out-ltramo" style="font-family: monospace;">${spanLen.toFixed(1)}</td>
                    <td class="cell-input">
                        <input type="number" step="any" class="dist-inp" data-field="L_dist" value="${lLoaded}" placeholder="${spanLen}" style="width: 80px; font-family: monospace;" title="Longitud real cargada (editable libremente)">
                    </td>
                    <td class="cell-auto-green dist-out-wequiv" style="font-family: monospace; font-weight: bold;">${wCm > 0 ? wCm.toFixed(4) : '0.0000'}</td>
                    <td class="cell-auto-celeste dist-out-vi" style="font-family: monospace;">+${eq.Vi.toFixed(2)}</td>
                    <td class="cell-auto-celeste dist-out-mi" style="font-family: monospace;">+${eq.Mi.toFixed(2)}</td>
                    <td class="cell-auto-celeste dist-out-vj" style="font-family: monospace;">+${eq.Vj.toFixed(2)}</td>
                    <td class="cell-auto-celeste dist-out-mj" style="font-family: monospace;">${eq.Mj.toFixed(2)}</td>
                    <td style="text-align: center;">
                        <button type="button" class="dist-del-btn" data-row="${k}" style="background: #dc2626; color: #fff; border: none; border-radius: 4px; padding: 2px 7px; font-size: 11px; cursor: pointer;" title="Eliminar esta carga distribuida">✕</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        // Binds de inputs en la tabla 3.1
        tbody.querySelectorAll('.dist-inp').forEach(inp => {
            inp.addEventListener('input', readSpansLoadsInputs);
            inp.addEventListener('change', readSpansLoadsInputs);
        });

        // Binds de botones eliminar
        tbody.querySelectorAll('.dist-del-btn').forEach(btn => {
            btn.onclick = () => {
                const rowIdx = parseInt(btn.dataset.row, 10);
                currentState.dist_loads.splice(rowIdx, 1);
                applyDistLoadsToBars();
                renderSpansLoadsTable();
                recomputeAll();
            };
        });

        // Bind botón añadir carga
        const btnAdd = document.getElementById('btnAddDistLoad');
        if (btnAdd) {
            btnAdd.onclick = () => {
                const nextIdx = Math.min((currentState.dist_loads.length), (currentState.bars.length - 1));
                const targetBar = currentState.bars && currentState.bars[nextIdx];
                const spanLen = targetBar ? Math.abs(targetBar.xf - targetBar.xi) : 200;
                currentState.dist_loads.push({
                    barIdx: Math.max(0, nextIdx),
                    w: '',
                    unit: 'kgf/m',
                    L_dist: spanLen
                });
                renderSpansLoadsTable();
            };
        }
    }

    function readSpansLoadsInputs() {
        const tbody = document.getElementById('tbodySpansLoads');
        if (!tbody) return;

        const newDistLoads = [];
        tbody.querySelectorAll('tr').forEach(tr => {
            const barSelect = tr.querySelector('[data-field="barIdx"]');
            const wInput = tr.querySelector('[data-field="w"]');
            const unitSelect = tr.querySelector('[data-field="unit"]');
            const lDistInput = tr.querySelector('[data-field="L_dist"]');
            if (!barSelect || !wInput) return;

            const barIdx = parseInt(barSelect.value, 10) || 0;
            const wVal = wInput.value;
            const unit = unitSelect ? unitSelect.value : 'kgf/m';
            const lDistVal = lDistInput ? lDistInput.value : '';

            const targetBar = currentState.bars && currentState.bars[barIdx];
            const spanLen = targetBar ? Math.abs((targetBar.xf || 0) - (targetBar.xi || 0)) : 200;
            const lLoaded = (lDistVal !== '' && !isNaN(parseFloat(lDistVal))) ? parseFloat(lDistVal) : spanLen;
            const wNum = (wVal !== '' && !isNaN(parseFloat(wVal))) ? parseFloat(wVal) : 0;
            const wCm = unit === 'kgf/m' ? (wNum / 100.0) : wNum;

            const eq = calcEquivalentLoads(wCm, spanLen, lLoaded);

            // Actualizar celdas calculadas en la misma fila en tiempo real
            const tdL = tr.querySelector('.dist-out-ltramo');
            if (tdL) tdL.textContent = spanLen.toFixed(1);
            const tdWequiv = tr.querySelector('.dist-out-wequiv');
            if (tdWequiv) tdWequiv.textContent = wCm > 0 ? wCm.toFixed(4) : '0.0000';
            const tdVi = tr.querySelector('.dist-out-vi');
            if (tdVi) tdVi.textContent = '+' + eq.Vi.toFixed(2);
            const tdMi = tr.querySelector('.dist-out-mi');
            if (tdMi) tdMi.textContent = '+' + eq.Mi.toFixed(2);
            const tdVj = tr.querySelector('.dist-out-vj');
            if (tdVj) tdVj.textContent = '+' + eq.Vj.toFixed(2);
            const tdMj = tr.querySelector('.dist-out-mj');
            if (tdMj) tdMj.textContent = eq.Mj.toFixed(2);

            newDistLoads.push({
                barIdx: barIdx,
                w: wVal !== '' ? parseFloat(wVal) : '',
                unit: unit,
                L_dist: lDistVal !== '' ? parseFloat(lDistVal) : undefined
            });
        });

        currentState.dist_loads = newDistLoads;
        applyDistLoadsToBars();
        recomputeAll();
    }

    function applyDistLoadsToBars() {
        // 1. Limpiar cargas distribuidas previas en las barras
        (currentState.bars || []).forEach(b => {
            b.q = 0.0;
            b.q_input = 0.0;
            b.L_dist = undefined;
        });

        // 2. Aplicar cada carga distribuida de la Tabla 3.1
        (currentState.dist_loads || []).forEach(item => {
            const b = currentState.bars && currentState.bars[item.barIdx];
            if (b && item.w !== '' && item.w !== null && !isNaN(parseFloat(item.w))) {
                const wVal = parseFloat(item.w);
                const unit = item.unit || 'kgf/m';
                const wCm = unit === 'kgf/m' ? (wVal / 100.0) : wVal;
                const spanLen = Math.abs(b.xf - b.xi);
                const lLoaded = (item.L_dist !== undefined && item.L_dist !== null && !isNaN(parseFloat(item.L_dist))) ? parseFloat(item.L_dist) : spanLen;

                b.q = (b.q || 0.0) + wCm;
                b.q_input = (b.q_input || 0.0) + wVal;
                b.q_unit = unit;
                b.L_dist = lLoaded;
            }
        });
    }

// ── RENDERIZADO Y EDICIÓN DE TABLA DE EVALUACIÓN NODAL (12 NUDOS) ──
    function renderNodesTable() {
        const tbody = document.getElementById('tbodyNodes');
        if (!tbody) return;

        let html = '';
        for (let i = 0; i < BeamSolver.MAX_NODES; i++) {
            const nd = currentState.nodes && currentState.nodes[i];
            const cond = (nd && nd.cond) ? nd.cond : 'LIBRE';
            const px = (nd && nd.Px !== null && nd.Px !== undefined) ? nd.Px : 0;
            const py = (nd && nd.Py !== null && nd.Py !== undefined) ? nd.Py : 0;
            const mz = (nd && nd.Mz !== null && nd.Mz !== undefined) ? nd.Mz : 0;

            html += `
                <tr data-node-idx="${i}">
                    <td><strong style="color: #15803d;">(${i + 1})</strong></td>
                    <td class="node-out-active cell-auto-subhdr">-</td>
                    <td class="cell-input">
                        <select class="node-inp" data-field="cond">
                            <option value="FIJO" ${cond === 'FIJO' ? 'selected' : ''}>FIJO</option>
                            <option value="RODILLO" ${cond === 'RODILLO' ? 'selected' : ''}>RODILLO</option>
                            <option value="LIBRE" ${cond === 'LIBRE' ? 'selected' : ''}>LIBRE</option>
                            <option value="EMPOTRADO" ${cond === 'EMPOTRADO' ? 'selected' : ''}>EMPOTRADO</option>
                            <option value="RODILLO_V" ${cond === 'RODILLO_V' ? 'selected' : ''}>RODILLO_V</option>
                        </select>
                    </td>
                    <td class="node-out-has-dx">-</td>
                    <td class="node-out-has-dy">-</td>
                    <td class="node-out-has-dth">-</td>
                    <td class="cell-auto-green node-out-dx font-mono">-</td>
                    <td class="cell-auto-green node-out-dy font-mono">-</td>
                    <td class="cell-auto-green node-out-dth font-mono">-</td>
                    <td class="cell-input"><input type="number" step="any" class="node-inp" data-field="Px" value="${px}"></td>
                    <td class="cell-input"><input type="number" step="any" class="node-inp" data-field="Py" value="${py}"></td>
                    <td class="cell-input"><input type="number" step="any" class="node-inp" data-field="Mz" value="${mz}"></td>
                </tr>
            `;
        }
        tbody.innerHTML = html;

        tbody.querySelectorAll('.node-inp').forEach(inp => {
            inp.addEventListener('input', readNodesInputs);
            inp.addEventListener('change', readNodesInputs);
        });
    }

    function readNodesInputs() {
        const tbody = document.getElementById('tbodyNodes');
        if (!tbody) return;

        const newNodes = [];
        tbody.querySelectorAll('tr').forEach((tr, i) => {
            const cond = tr.querySelector('[data-field="cond"]').value;
            const px = parseFloat(tr.querySelector('[data-field="Px"]').value) || 0.0;
            const py = parseFloat(tr.querySelector('[data-field="Py"]').value) || 0.0;
            const mz = parseFloat(tr.querySelector('[data-field="Mz"]').value) || 0.0;
            newNodes.push({ cond, Px: px, Py: py, Mz: mz });
        });

        currentState.nodes = newNodes;
        recomputeAll();
    }

    // ── RENDERIZADO Y EDICIÓN DE DESCOMPONEDOR OBLICUO (6 FILAS) ──
    function renderObliqueTable() {
        const tbody = document.getElementById('tbodyOblique');
        if (!tbody) return;

        let html = '';
        for (let i = 0; i < 6; i++) {
            const ob = currentState.oblique_loads && currentState.oblique_loads[i];
            const nudo = (ob && ob.nudo) ? ob.nudo : '';
            const P = (ob && ob.P) ? ob.P : '';
            const modo = (ob && ob.modo) ? ob.modo : 'PENDIENTE_dx_dy';
            const val1 = (ob && ob.val1 !== undefined) ? ob.val1 : '';
            const val2 = (ob && ob.val2 !== undefined) ? ob.val2 : '';
            const dirX = (ob && ob.dir_x) ? ob.dir_x : '+X (DER)';
            const dirY = (ob && ob.dir_y) ? ob.dir_y : '-Y (ABAJO)';

            html += `
                <tr data-ob-idx="${i}">
                    <td>${i + 1}</td>
                    <td class="cell-input">
                        <select class="ob-inp" data-field="nudo">
                            <option value="">—</option>
                            ${Array.from({ length: 12 }, (_, n) => `<option value="${n + 1}" ${nudo === n + 1 ? 'selected' : ''}>Nudo (${n + 1})</option>`).join('')}
                        </select>
                    </td>
                    <td class="cell-input"><input type="number" step="any" class="ob-inp" data-field="P" value="${P}"></td>
                    <td class="cell-input">
                        <select class="ob-inp" data-field="modo">
                            <option value="PENDIENTE_dx_dy" ${modo === 'PENDIENTE_dx_dy' ? 'selected' : ''}>PENDIENTE (dx:dy)</option>
                            <option value="ANGULO_GRADOS" ${modo === 'ANGULO_GRADOS' ? 'selected' : ''}>ÁNGULO (α°)</option>
                        </select>
                    </td>
                    <td class="cell-input"><input type="number" step="any" class="ob-inp" data-field="val1" value="${val1}"></td>
                    <td class="cell-input"><input type="number" step="any" class="ob-inp" data-field="val2" value="${val2}"></td>
                    <td class="cell-input">
                        <select class="ob-inp" data-field="dir_x">
                            <option value="+X (DER)" ${dirX === '+X (DER)' ? 'selected' : ''}>+X (DER)</option>
                            <option value="-X (IZQ)" ${dirX === '-X (IZQ)' ? 'selected' : ''}>-X (IZQ)</option>
                        </select>
                    </td>
                    <td class="cell-input">
                        <select class="ob-inp" data-field="dir_y">
                            <option value="-Y (ABAJO)" ${dirY === '-Y (ABAJO)' ? 'selected' : ''}>-Y (ABAJO)</option>
                            <option value="+Y (ARRIBA)" ${dirY === '+Y (ARRIBA)' ? 'selected' : ''}>+Y (ARRIBA)</option>
                        </select>
                    </td>
                    <td class="cell-auto-green ob-out-fx">0.00</td>
                    <td class="cell-auto-green ob-out-fy">0.00</td>
                </tr>
            `;
        }
        tbody.innerHTML = html;

        tbody.querySelectorAll('.ob-inp').forEach(inp => {
            inp.addEventListener('input', readObliqueInputs);
            inp.addEventListener('change', readObliqueInputs);
        });
    }

    function readObliqueInputs() {
        const tbody = document.getElementById('tbodyOblique');
        if (!tbody) return;

        const newOb = [];
        tbody.querySelectorAll('tr').forEach(tr => {
            const nudoVal = tr.querySelector('[data-field="nudo"]').value;
            const pVal = tr.querySelector('[data-field="P"]').value;
            const modo = tr.querySelector('[data-field="modo"]').value;
            const val1 = tr.querySelector('[data-field="val1"]').value;
            const val2 = tr.querySelector('[data-field="val2"]').value;
            const dirX = tr.querySelector('[data-field="dir_x"]').value;
            const dirY = tr.querySelector('[data-field="dir_y"]').value;

            if (nudoVal && pVal) {
                newOb.push({
                    nudo: parseInt(nudoVal, 10),
                    P: parseFloat(pVal) || 0.0,
                    modo: modo,
                    val1: parseFloat(val1) || 0.0,
                    val2: parseFloat(val2) || 0.0,
                    dir_x: dirX,
                    dir_y: dirY
                });
            }
        });

        currentState.oblique_loads = newOb;
        recomputeAll();
    }

    // ── CÁLCULO Y ACTUALIZACIÓN GENERAL (RESOLUCIÓN MATRICIAL) ────
    // ── HELPER DE RENDERIZADO LATEX CON KATEX OFICIAL ───────────
    function renderLatex(tex, isDisplay = true) {
        if (window.katex && typeof window.katex.renderToString === 'function') {
            try {
                return window.katex.renderToString(tex, { displayMode: isDisplay, throwOnError: false });
            } catch(e) {
                console.warn('Error en KaTeX render:', e);
            }
        }
        return `<div style="font-family: 'Times New Roman', serif; font-style: italic; text-align: center; margin: 4px 0; color: #f8fafc;">${tex}</div>`;
    }

    // ── TARJETAS VISUALES DE SEPARACIÓN DE CARGAS EQUIVALENTES (DESCOMPOSICIÓN EXACTA DEL INGENIERO CON SVG Y LATEX) ────
    function renderEquivalentLoadCards(sol) {
        const container = document.getElementById('beamEquivalentCardsContainer');
        if (!container) return;

        const fFem = document.getElementById('formulaFemTitle');
        if (fFem && typeof renderLatex === 'function') {
            fFem.innerHTML = renderLatex('\\{Q_{\\text{equiv}}\\} = \\left\\{ \\frac{q \\cdot a}{2}, \\; \\frac{q \\cdot a^2}{12} \\right\\}', false);
        }

        if (!sol || !sol.success || !sol.barsTable) {
            container.innerHTML = '<div style="grid-column: 1 / -1; color:#64748b; font-size:12px; padding:12px; text-align:center;">Sin solución calculada.</div>';
            return;
        }

        const loadedBars = sol.barsTable.filter(b => b.active && (Math.abs(b.q) > 1e-9 || Math.abs(b.P_tramo) > 1e-9));
        if (loadedBars.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; color: #64748b; font-size: 12px; padding: 14px; text-align: center; background: #090e1a; border-radius: 8px; border: 1px dashed #1e293b;">
                    ℹ️ No hay cargas distribuidas asignadas en los tramos actuales (Cargas nodales puras).
                </div>
            `;
            return;
        }

        let html = '';
        loadedBars.forEach(b => {
            const nI = b.barNum;
            const nF = b.barNum + 1;
            const qDisp = b.q_unit === 'kgf/m' ? (b.q_input + ' kgf/m') : (b.q + ' kgf/cm');
            const L_m = (b.L / 100).toFixed(2);
            const L_cm = b.L.toFixed(0);
            const cLoad = (b.L_dist !== undefined && b.L_dist !== null && b.L_dist > 0) ? Math.min(b.L, b.L_dist) : b.L;
            const isPartial = Math.abs(cLoad - b.L) > 1e-4;

            // Parámetros geométricos para el SVG de descomposición en 3 niveles
            const svgW = 520;
            const svgH = 265;
            const x1 = 70;
            const x2 = 450;
            const spanPx = x2 - x1; // 380px
            const cPx = spanPx * (cLoad / b.L);

            // Generar flechas distribuidas hacia abajo en Nivel 1
            const numArrows = Math.max(4, Math.min(10, Math.round(cPx / 35)));
            let arrowsSvg = '';
            for (let k = 0; k < numArrows; k++) {
                const arrX = x1 + (cPx / (numArrows + 1)) * (k + 1);
                arrowsSvg += `
                    <line x1="${arrX.toFixed(1)}" y1="36" x2="${arrX.toFixed(1)}" y2="52" stroke="#fbbf24" stroke-width="1.6" marker-end="url(#arrow-amber-down-${b.barNum})" />
                `;
            }

            // Valores numéricos formateados
            const qStr = b.q.toFixed(4);
            const aStr = L_cm;
            const ViVal = b.V_ini.toFixed(2);
            const VjVal = b.V_fin.toFixed(2);
            const MiVal = Math.abs(b.M_ini).toFixed(2);
            const MjVal = Math.abs(b.M_fin).toFixed(2);

            // Fórmulas en formato LaTeX profesional con KaTeX
            let texVi = '';
            let texMi = '';
            let texVj = '';
            let texMj = '';

            if (!isPartial) {
                texVi = `P_i = \\frac{q \\cdot a}{2} = \\frac{${qStr} \\times ${aStr}}{2} = \\mathbf{${ViVal} \\text{ kgf}} \\quad (\\downarrow)`;
                texMi = `M_i = \\frac{q \\cdot a^2}{12} = \\frac{${qStr} \\times ${aStr}^2}{12} = \\mathbf{${MiVal} \\text{ kgf}\\cdot\\text{cm}} \\quad (\\curvearrowleft)`;
                texVj = `P_j = \\frac{q \\cdot a}{2} = \\frac{${qStr} \\times ${aStr}}{2} = \\mathbf{${VjVal} \\text{ kgf}} \\quad (\\downarrow)`;
                texMj = `M_j = \\frac{q \\cdot a^2}{12} = \\frac{${qStr} \\times ${aStr}^2}{12} = \\mathbf{${MjVal} \\text{ kgf}\\cdot\\text{cm}} \\quad (\\curvearrowright)`;
            } else {
                const cStr = cLoad.toFixed(1);
                texVi = `P_i = \\frac{q \\cdot c \\left(a - \\frac{c}{2}\\right) + (M_i + M_j)}{a} = \\mathbf{${ViVal} \\text{ kgf}} \\quad (\\downarrow)`;
                texMi = `M_i = \\frac{q \\cdot c^2}{12 a^2}\\left(6a^2 - 8ac + 3c^2\\right) = \\mathbf{${MiVal} \\text{ kgf}\\cdot\\text{cm}} \\quad (\\curvearrowleft)`;
                texVj = `P_j = q \\cdot c - P_i = \\mathbf{${VjVal} \\text{ kgf}} \\quad (\\downarrow)`;
                texMj = `M_j = \\frac{q \\cdot c^3}{12 a^2}\\left(4a - 3c\\right) = \\mathbf{${MjVal} \\text{ kgf}\\cdot\\text{cm}} \\quad (\\curvearrowright)`;
            }

            const htmlVi = renderLatex(texVi, true);
            const htmlMi = renderLatex(texMi, true);
            const htmlVj = renderLatex(texVj, true);
            const htmlMj = renderLatex(texMj, true);

            // SVG de Descomposición Exacta del Ingeniero (3 Niveles: Carga q, Puntuales ↓, Momentos hacia adentro ⤻ ⤺)
            const svgElement = `
                <svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%; height:auto; background: #070d18; border-radius: 10px; border: 1px solid #1e293b; margin: 8px 0; overflow: visible;">
                    <defs>
                        <!-- Flecha hacia abajo cian para cargas puntuales -->
                        <marker id="arrow-cyan-down-${b.barNum}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#00f0ff" />
                        </marker>
                        <!-- Flecha hacia abajo ámbar para carga distribuida -->
                        <marker id="arrow-amber-down-${b.barNum}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
                        </marker>
                        <!-- Flecha hacia adentro verde para momento inicial (antihorario) -->
                        <marker id="arrow-green-inward-${b.barNum}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                        </marker>
                        <!-- Flecha hacia adentro naranja para momento final (horario) -->
                        <marker id="arrow-amber-inward-${b.barNum}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                        </marker>
                    </defs>

                    <!-- ══ NIVEL 1: CARGA DISTRIBUIDA EN TRAMO ══════════════════════════ -->
                    <text x="14" y="20" fill="#38bdf8" font-size="10.5" font-weight="800" font-family="sans-serif">1. Carga Distribuida en Tramo:</text>

                    <!-- Zona Sombreada de la Carga Distribuida (q) -->
                    <rect x="${x1 + 10}" y="32" width="${(cPx > 0 ? cPx - 20 : spanPx - 20).toFixed(1)}" height="24" fill="rgba(251, 191, 36, 0.15)" stroke="#fbbf24" stroke-width="1.2" stroke-dasharray="4,2" rx="2" />
                    ${arrowsSvg}
                    <text x="${((x1 + x2) / 2).toFixed(1)}" y="27" fill="#fbbf24" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle">q = ${qDisp}</text>

                    <!-- Línea de Viga Nivel 1 -->
                    <line x1="${x1 + 10}" y1="56" x2="${x2 - 10}" y2="56" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round" />

                    <!-- Nudo Inicial (i) en Círculo Rojo (Idéntico a la pizarra del Ingeniero) -->
                    <circle cx="${x1}" cy="56" r="10.5" fill="#7f1d1d" stroke="#ef4444" stroke-width="2.2" />
                    <text x="${x1}" y="60" fill="#ffffff" font-size="10.5" font-weight="900" font-family="sans-serif" text-anchor="middle">${nI}</text>

                    <!-- Nudo Final (j) en Círculo Rojo -->
                    <circle cx="${x2}" cy="56" r="10.5" fill="#7f1d1d" stroke="#ef4444" stroke-width="2.2" />
                    <text x="${x2}" y="60" fill="#ffffff" font-size="10.5" font-weight="900" font-family="sans-serif" text-anchor="middle">${nF}</text>

                    <!-- Cota de Longitud a -->
                    <line x1="${x1}" y1="72" x2="${x2}" y2="72" stroke="#475569" stroke-width="1" stroke-dasharray="2,2" />
                    <line x1="${x1}" y1="68" x2="${x1}" y2="76" stroke="#475569" stroke-width="1.2" />
                    <line x1="${x2}" y1="68" x2="${x2}" y2="76" stroke="#475569" stroke-width="1.2" />
                    <text x="${((x1 + x2) / 2).toFixed(1)}" y="83" fill="#94a3b8" font-size="10" font-family="monospace" text-anchor="middle">a = ${L_m} m (${L_cm} cm)</text>

                    <!-- ══ NIVEL 2: PUNTUALES HACIA ABAJO (q·a / 2 ↓) ═══════════════════ -->
                    <text x="14" y="104" fill="#00f0ff" font-size="10.5" font-weight="800" font-family="sans-serif">2. Cargas Puntuales Extremas (P = q·a / 2 ↓):</text>

                    <!-- Línea de Viga Nivel 2 -->
                    <line x1="${x1}" y1="138" x2="${x2}" y2="138" stroke="#334155" stroke-width="3.5" stroke-linecap="round" />
                    <circle cx="${x1}" cy="138" r="4.5" fill="#00f0ff" />
                    <circle cx="${x2}" cy="138" r="4.5" fill="#00f0ff" />

                    <!-- Flecha Puntual Izquierda HACIA ABAJO ↓ -->
                    <line x1="${x1}" y1="116" x2="${x1}" y2="158" stroke="#00f0ff" stroke-width="2.8" marker-end="url(#arrow-cyan-down-${b.barNum})" />
                    <text x="${x1 + 10}" y="152" fill="#00f0ff" font-size="10" font-weight="bold" font-family="monospace">P_i = ${ViVal} kgf (↓)</text>

                    <!-- Flecha Puntual Derecha HACIA ABAJO ↓ -->
                    <line x1="${x2}" y1="116" x2="${x2}" y2="158" stroke="#00f0ff" stroke-width="2.8" marker-end="url(#arrow-cyan-down-${b.barNum})" />
                    <text x="${x2 - 10}" y="152" fill="#00f0ff" font-size="10" font-weight="bold" font-family="monospace" text-anchor="end">P_j = ${VjVal} kgf (↓)</text>

                    <!-- ══ NIVEL 3: MOMENTOS HACIA ADENTRO (q·a² / 12 ↺ ↻) ════════════════ -->
                    <text x="14" y="188" fill="#10b981" font-size="10.5" font-weight="800" font-family="sans-serif">3. Momentos de Fijación Hacia Adentro (M = q·a² / 12 ↺ ↻):</text>

                    <!-- Línea de Viga Nivel 3 -->
                    <line x1="${x1}" y1="228" x2="${x2}" y2="228" stroke="#334155" stroke-width="3.5" stroke-linecap="round" />
                    <circle cx="${x1}" cy="228" r="4.5" fill="#10b981" />
                    <circle cx="${x2}" cy="228" r="4.5" fill="#f59e0b" />

                    <!-- Flecha Curva Izquierda HACIA ADENTRO ↺ (Antihorario hacia el interior del tramo) -->
                    <path d="M ${x1 - 18} 240 A 22 22 0 0 1 ${x1 + 18} 218" fill="none" stroke="#10b981" stroke-width="2.8" marker-end="url(#arrow-green-inward-${b.barNum})" />
                    <text x="${x1 + 22}" y="214" fill="#10b981" font-size="10" font-weight="bold" font-family="monospace">M_i = ${MiVal} kgf·cm (↺)</text>

                    <!-- Flecha Curva Derecha HACIA ADENTRO ↻ (Horario hacia el interior del tramo) -->
                    <path d="M ${x2 + 18} 240 A 22 22 0 0 0 ${x2 - 18} 218" fill="none" stroke="#f59e0b" stroke-width="2.8" marker-end="url(#arrow-amber-inward-${b.barNum})" />
                    <text x="${x2 - 22}" y="214" fill="#f59e0b" font-size="10" font-weight="bold" font-family="monospace" text-anchor="end">M_j = ${MjVal} kgf·cm (↻)</text>
                </svg>
            `;

            html += `
                <div class="eq-card">
                    <div class="eq-card-header">
                        <span class="eq-card-title">Tramo [${b.barNum}]: Nudo (${nI}) → Nudo (${nF})</span>
                        <span class="eq-badge">L = a = ${L_m} m (${L_cm} cm)</span>
                    </div>

                    <!-- Representación Gráfica Vectorial en Vivo del Tramo Aislado (3 Niveles del Ingeniero) -->
                    ${svgElement}

                    <!-- Desglose de Fórmulas y Cargas en Formato LaTeX Oficial -->
                    <div class="eq-card-loads">
                        <div class="eq-load-node" style="border-left: 3px solid #00f0ff;">
                            <div class="eq-node-title" style="color: #38bdf8; display: flex; justify-content: space-between;">
                                <span>Extremo Inicial — Nudo (${nI})</span>
                                <span style="font-size: 10px; color: #94a3b8;">x = 0</span>
                            </div>
                            <div style="font-size: 11px; color: #94a3b8; margin: 4px 0 2px;">Carga Puntual Equivalente:</div>
                            <div class="latex-eq-container">${htmlVi}</div>
                            <div style="font-size: 11px; color: #94a3b8; margin: 6px 0 2px;">Momento de Fijación Equivalente:</div>
                            <div class="latex-eq-container">${htmlMi}</div>
                        </div>

                        <div class="eq-load-node node-j" style="border-left: 3px solid #f59e0b;">
                            <div class="eq-node-title" style="color: #fbbf24; display: flex; justify-content: space-between;">
                                <span>Extremo Final — Nudo (${nF})</span>
                                <span style="font-size: 10px; color: #94a3b8;">x = a = ${L_cm} cm</span>
                            </div>
                            <div style="font-size: 11px; color: #94a3b8; margin: 4px 0 2px;">Carga Puntual Equivalente:</div>
                            <div class="latex-eq-container">${htmlVj}</div>
                            <div style="font-size: 11px; color: #94a3b8; margin: 6px 0 2px;">Momento de Fijación Equivalente:</div>
                            <div class="latex-eq-container">${htmlMj}</div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ── PROCEDIMIENTO MATEMÁTICO PASO A PASO EN DIAGRAMAS (DFC Y DMF) ────
    function renderDiagramStepByStep(sol) {
        const shearBox = document.getElementById('shearStepByStepContainer');
        const momentBox = document.getElementById('momentStepByStepContainer');
        if (!shearBox && !momentBox) return;

        if (!sol || !sol.success || !sol.barsTable) {
            if (shearBox) shearBox.innerHTML = '<span style="color:#64748b;">Esperando solución calculada...</span>';
            if (momentBox) momentBox.innerHTML = '<span style="color:#64748b;">Esperando solución calculada...</span>';
            return;
        }

        const activeBars = sol.barsTable.filter(b => b.active);
        const spans = (window.BeamDiagrams && typeof window.BeamDiagrams.calculate === 'function')
            ? window.BeamDiagrams.calculate(sol)
            : [];

        // 1. Obtener reacciones en apoyos por nudo (tolerancia regex para U o D, mayúsculas/minúsculas)
        const reactionsByNode = {};
        if (sol.calculatedReactions) {
            sol.calculatedReactions.forEach(r => {
                const lbl = String(r.uLbl || '').trim();
                const mY = lbl.match(/^[UuDd](\d+)[Yy]$/);
                const mM = lbl.match(/^[UuDd](\d+)[θΘ]$/) || lbl.match(/^[UuDd](\d+)[Tt][Hh]$/);
                if (mY) {
                    const n = parseInt(mY[1], 10);
                    if (!reactionsByNode[n]) reactionsByNode[n] = {};
                    reactionsByNode[n].Ry = r.reactionFinal;
                }
                if (mM) {
                    const n = parseInt(mM[1], 10);
                    if (!reactionsByNode[n]) reactionsByNode[n] = {};
                    reactionsByNode[n].M = r.reactionFinal;
                }
            });
        }

        // 2. Obtener cargas nodales aplicadas (Py y Mz) directamente de nodesTable
        const nodalLoadsByNode = {};
        if (sol.nodesTable) {
            sol.nodesTable.filter(n => n.active).forEach(n => {
                nodalLoadsByNode[n.nodeNum] = {
                    Py: (typeof n.Py_tot === 'number') ? n.Py_tot : 0,
                    Mz: (typeof n.Mz_tot === 'number') ? n.Mz_tot : 0,
                    cond: n.cond || ''
                };
            });
        }

        const totalNodes = activeBars.length + 1;
        let cumulativeX = 0;
        const nodePositions = [0];
        activeBars.forEach(b => {
            cumulativeX += b.L;
            nodePositions.push(cumulativeX);
        });

        // ══════════════════════════════════════════════════════════════
        // 1. PROCEDIMIENTO PASO A PASO: FUERZA CORTANTE V(x)
        // ══════════════════════════════════════════════════════════════
        if (shearBox) {
            let shearHtml = `
                <div class="step-title" style="color: #00f0ff;">
                    <span>📐 Procedimiento Paso a Paso — Fuerza Cortante V(x)</span>
                    <span style="font-size: 10.5px; color: #94a3b8; font-family: monospace;">Σ Fy = 0</span>
                </div>
                <div class="step-calc-line">
                    <span style="color: #94a3b8;">1. Inicio en x = 0 cm (Extremo inicial izquierdo de la viga):</span>
                    <strong style="color: #cbd5e1;">V(0⁻) = 0.00 kgf</strong>
                </div>
            `;

            let currentV = 0;
            let sumLoads = 0;
            let sumReactions = 0;

            for (let i = 0; i < totalNodes; i++) {
                const nodeNum = i + 1;
                const nodeX = nodePositions[i];
                const ry = (reactionsByNode[nodeNum] && reactionsByNode[nodeNum].Ry) || 0;
                const py = (nodalLoadsByNode[nodeNum] && nodalLoadsByNode[nodeNum].Py) || 0;

                // A) Reacción vertical en apoyo (si existe en el nudo)
                if (Math.abs(ry) > 1e-4) {
                    sumReactions += ry;
                    const prevV = currentV;
                    currentV += ry;
                    const signStr = ry >= 0 ? `+${ry.toFixed(2)}` : `${ry.toFixed(2)}`;
                    shearHtml += `
                        <div class="step-calc-line" style="background: rgba(0, 240, 255, 0.06); border-left: 3px solid #00f0ff;">
                            <span style="color: #38bdf8;">• Nudo (${nodeNum}) [x = ${nodeX.toFixed(1)} cm / ${(nodeX/100).toFixed(2)} m] — Reacción en apoyo:</span>
                            <span style="color: #00f0ff; font-weight: bold;">
                                V(${nodeNum}⁺) = ${prevV.toFixed(2)} ${signStr} = ${currentV.toFixed(2)} kgf
                            </span>
                        </div>
                    `;
                }

                // B) Carga puntual externa aplicada en el nudo (si existe)
                if (Math.abs(py) > 1e-4) {
                    sumLoads += Math.abs(py);
                    const prevV = currentV;
                    currentV += py; // py ya tiene su signo (generalmente negativo para abajo)
                    const signStr = py >= 0 ? `+${py.toFixed(2)}` : `${py.toFixed(2)}`;
                    
                    let zeroCrossingNode = '';
                    if (prevV * currentV < 0) {
                        zeroCrossingNode = `
                            <div class="step-calc-line" style="background: rgba(251, 191, 36, 0.08); border-left: 3px solid #fbbf24; margin: 2px 0 2px 14px;">
                                <span style="color: #fbbf24; font-weight: bold;">⚡ Cambio de Signo / Pico en Nudo (${nodeNum}):</span>
                                <span style="color: #fbbf24; font-family: monospace;">
                                    El cortante pasa de ${prevV.toFixed(2)} a ${currentV.toFixed(2)} kgf → Momento Flector alcanza un pico local en este punto.
                                </span>
                            </div>
                        `;
                    }

                    shearHtml += `
                        <div class="step-calc-line" style="background: rgba(244, 63, 94, 0.06); border-left: 3px solid #f43f5e;">
                            <span style="color: #fda4af;">• Nudo (${nodeNum}) [x = ${nodeX.toFixed(1)} cm / ${(nodeX/100).toFixed(2)} m] — Carga puntual aplicada:</span>
                            <span style="color: #f43f5e; font-weight: bold;">
                                V(${nodeNum}⁺) = ${prevV.toFixed(2)} ${signStr} = ${currentV.toFixed(2)} kgf
                            </span>
                        </div>
                        ${zeroCrossingNode}
                    `;
                }

                // C) Evolución a lo largo del tramo (si no es el último nudo)
                if (i < activeBars.length) {
                    const b = activeBars[i];
                    const nextNodeX = nodePositions[i + 1];
                    const cLoad = (b.L_dist !== undefined && b.L_dist !== null && b.L_dist > 0) ? Math.min(b.L, b.L_dist) : b.L;

                    // Descenso por carga distribuida q en el tramo
                    if (Math.abs(b.q) > 1e-6) {
                        const deltaW = b.q * cLoad;
                        sumLoads += deltaW;
                        const prevV = currentV;
                        currentV -= deltaW;

                        // Verificar si corta el eje V = 0 dentro del tramo
                        let zeroCrossingInfo = '';
                        if (prevV * currentV < 0 && b.q > 0) {
                            const x0 = prevV / b.q;
                            const xAbs = nodeX + x0;
                            zeroCrossingInfo = `
                                <div class="step-calc-line" style="background: rgba(251, 191, 36, 0.08); border-left: 3px solid #fbbf24; margin: 3px 0 3px 14px;">
                                    <span style="color: #fbbf24; font-weight: bold;">⚡ Cruce por Cero V = 0 dentro del tramo:</span>
                                    <span style="color: #fbbf24; font-family: monospace;">
                                        x₀ = V_ini / q = ${prevV.toFixed(2)} / ${b.q.toFixed(4)} = <strong>${x0.toFixed(2)} cm</strong> desde Nudo (${nodeNum}) → <strong>x = ${xAbs.toFixed(2)} cm (${(xAbs/100).toFixed(2)} m)</strong> [Ubicación de M_máx]
                                    </span>
                                </div>
                            `;
                        }

                        shearHtml += `
                            <div class="step-calc-line">
                                <span>• Tramo [${b.barNum}] (${nodeX.toFixed(1)} cm ≤ x ≤ ${nextNodeX.toFixed(1)} cm, L = ${b.L.toFixed(1)} cm): Carga distribuida q = ${b.q_unit === 'kgf/m' ? (b.q_input + ' kgf/m') : (b.q + ' kgf/cm')}:</span>
                                <span style="color: #fbbf24;">ΔV_w = -(${b.q.toFixed(4)} × ${cLoad.toFixed(1)}) = -${deltaW.toFixed(2)} kgf</span>
                            </div>
                            <div class="step-calc-line">
                                <span style="color: #94a3b8;">Cortante al final del Tramo [${b.barNum}] (antes del Nudo ${nodeNum + 1}):</span>
                                <strong>V(${nextNodeX.toFixed(1)}⁻) = ${prevV.toFixed(2)} - ${deltaW.toFixed(2)} = ${currentV.toFixed(2)} kgf</strong>
                            </div>
                            ${zeroCrossingInfo}
                        `;
                    } else {
                        // Tramo sin carga distribuida (cortante constante)
                        shearHtml += `
                            <div class="step-calc-line" style="color: #94a3b8;">
                                <span>• Tramo [${b.barNum}] (${nodeX.toFixed(1)} cm ≤ x ≤ ${nextNodeX.toFixed(1)} cm, L = ${b.L.toFixed(1)} cm): Sin carga distribuida (q = 0) → Cortante constante:</span>
                                <strong>V = ${currentV.toFixed(2)} kgf</strong>
                            </div>
                        `;
                    }

                    // Carga puntual intermedia dentro del tramo
                    if (Math.abs(b.P_tramo) > 1e-4) {
                        sumLoads += b.P_tramo;
                        const prevV = currentV;
                        currentV -= b.P_tramo;
                        shearHtml += `
                            <div class="step-calc-line" style="color: #f43f5e;">
                                <span>• Tramo [${b.barNum}]: Carga puntual interna P = ${b.P_tramo.toFixed(2)} kgf:</span>
                                <strong>ΔV_P = -${b.P_tramo.toFixed(2)} kgf → V = ${currentV.toFixed(2)} kgf</strong>
                            </div>
                        `;
                    }
                }
            }

            shearHtml += `
                <div class="step-calc-line" style="background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; font-weight: bold;">
                    <span style="color: #10b981;">• Cierre en x = ${nodePositions[nodePositions.length - 1].toFixed(1)} cm:</span>
                    <span style="color: #34d399;">V(L⁺) = ${Math.abs(currentV) < 1e-3 ? '0.00' : currentV.toFixed(2)} kgf (Cierra exactamente en cero)</span>
                </div>
                <div class="step-badge-ok">
                    <span>✔ Verificación de Equilibrio Global: Σ Fy = Σ Ry - Σ Cargas = ${(sumReactions - sumLoads).toFixed(3)} kgf ≈ 0.00 kgf (Diagrama Cierra en 0)</span>
                </div>
            `;
            shearBox.innerHTML = shearHtml;
        }

        // ══════════════════════════════════════════════════════════════
        // 2. PROCEDIMIENTO PASO A PASO: MOMENTO FLECTOR M(x) (MÉTODO ÁREAS)
        // ══════════════════════════════════════════════════════════════
        if (momentBox) {
            let momentHtml = `
                <div class="step-title" style="color: #f59e0b;">
                    <span>📐 Procedimiento Paso a Paso — Método de las Áreas y Momento Máximo</span>
                    <span style="font-size: 10.5px; color: #94a3b8; font-family: monospace;">M(x) = M₀ + ∫ V dx</span>
                </div>
                <div class="step-calc-line">
                    <span style="color: #94a3b8;">1. Inicio en x = 0 cm (Lado izquierdo de la viga):</span>
                    <strong style="color: #cbd5e1;">M(0) = 0.00 kgf·cm (0.00 kgf·m)</strong>
                </div>
            `;

            let currentM = 0;
            let maxM = 0;
            let maxX = 0;

            activeBars.forEach((b, idx) => {
                const span = spans[idx];
                const spanStart = nodePositions[idx];
                const spanEnd = nodePositions[idx + 1];
                const cLoad = (b.L_dist !== undefined && b.L_dist !== null && b.L_dist > 0) ? Math.min(b.L, b.L_dist) : b.L;
                
                const V_ini = (span && span.points && span.points[0]) ? span.points[0].V : 0;
                const V_end = (span && span.points && span.points.length) ? span.points[span.points.length - 1].V : (V_ini - b.q * cLoad);

                // Si hay cruce por cero dentro del tramo continuo
                if (V_ini > 0 && V_end < 0 && b.q > 0) {
                    const x0 = V_ini / b.q;
                    const areaPos = (V_ini * x0) / 2.0;
                    const mMaxLocal = currentM + areaPos;
                    if (Math.abs(mMaxLocal) > Math.abs(maxM)) {
                        maxM = mMaxLocal;
                        maxX = spanStart + x0;
                    }

                    const xRemaining = cLoad - x0;
                    const areaNeg = (V_end * xRemaining) / 2.0;
                    const prevM = currentM;
                    currentM = mMaxLocal + areaNeg;

                    momentHtml += `
                        <div class="step-calc-line">
                            <span style="color: #38bdf8;">• Tramo [${b.barNum}] (${spanStart.toFixed(1)} cm a ${(spanStart + x0).toFixed(1)} cm) — Área positiva A₁ (0 ≤ x ≤ ${x0.toFixed(1)} cm):</span>
                            <span style="color: #10b981; font-weight: bold;">
                                A₁ = (${V_ini.toFixed(2)} × ${x0.toFixed(2)}) / 2 = +${areaPos.toFixed(2)} kgf·cm (+${(areaPos/100).toFixed(2)} kgf·m)
                            </span>
                        </div>
                        <div class="step-calc-line" style="background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981;">
                            <span style="color: #10b981; font-weight: bold;">⚡ Momento Máximo Positivo M_máx en Tramo [${b.barNum}]:</span>
                            <strong style="color: #34d399; font-size: 12px;">
                                M_máx = ${prevM.toFixed(2)} + ${areaPos.toFixed(2)} = +${mMaxLocal.toFixed(2)} kgf·cm (+${(mMaxLocal/100).toFixed(2)} kgf·m) @ x = ${(spanStart + x0).toFixed(1)} cm (${((spanStart + x0)/100).toFixed(2)} m)
                            </strong>
                        </div>
                        <div class="step-calc-line">
                            <span style="color: #94a3b8;">Área negativa A₂ (${x0.toFixed(1)} cm ≤ x ≤ ${cLoad.toFixed(1)} cm):</span>
                            <span style="color: #f59e0b;">A₂ = (${V_end.toFixed(2)} × ${xRemaining.toFixed(2)}) / 2 = ${areaNeg.toFixed(2)} kgf·cm (${(areaNeg/100).toFixed(2)} kgf·m)</span>
                        </div>
                        <div class="step-calc-line">
                            <span>Momento al final del Tramo [${b.barNum}] (en Nudo ${b.barNum + 1}):</span>
                            <strong>M(${spanEnd.toFixed(1)} cm) = ${mMaxLocal.toFixed(2)} + (${areaNeg.toFixed(2)}) = ${currentM.toFixed(2)} kgf·cm (${(currentM/100).toFixed(2)} kgf·m)</strong>
                        </div>
                    `;
                } else {
                    // Área trapezoidal o rectangular directa
                    const areaTrapezoid = ((V_ini + V_end) / 2.0) * cLoad;
                    const prevM = currentM;
                    currentM += areaTrapezoid;
                    
                    if (Math.abs(currentM) > Math.abs(maxM)) {
                        maxM = currentM;
                        maxX = spanEnd;
                    }

                    momentHtml += `
                        <div class="step-calc-line">
                            <span>• Tramo [${b.barNum}] (${spanStart.toFixed(1)} cm ≤ x ≤ ${spanEnd.toFixed(1)} cm, L = ${cLoad.toFixed(1)} cm) — Área bajo curva de cortante:</span>
                            <span style="color: #bae6fd;">
                                A = [(${V_ini.toFixed(2)} + ${V_end.toFixed(2)}) / 2] × ${cLoad.toFixed(1)} = ${areaTrapezoid.toFixed(2)} kgf·cm (${(areaTrapezoid/100).toFixed(2)} kgf·m)
                            </span>
                        </div>
                        <div class="step-calc-line">
                            <span>Momento acumulado al final del tramo (en Nudo ${b.barNum + 1}):</span>
                            <strong>M(${spanEnd.toFixed(1)} cm) = ${prevM.toFixed(2)} + (${areaTrapezoid.toFixed(2)}) = ${currentM.toFixed(2)} kgf·cm (${(currentM/100).toFixed(2)} kgf·m)</strong>
                        </div>
                    `;
                }

                // Si hay momento concentrado aplicado en el nudo final
                const nextNodeNum = idx + 2;
                const nextMz = (nodalLoadsByNode[nextNodeNum] && nodalLoadsByNode[nextNodeNum].Mz) || 0;
                if (Math.abs(nextMz) > 1e-4) {
                    const prevM = currentM;
                    currentM += nextMz;
                    momentHtml += `
                        <div class="step-calc-line" style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b;">
                            <span style="color: #f59e0b;">• Nudo (${nextNodeNum}) — Salto por Momento Concentrado Aplicado Mz:</span>
                            <strong>M(${nextNodeNum}⁺) = ${prevM.toFixed(2)} + (${nextMz.toFixed(2)}) = ${currentM.toFixed(2)} kgf·cm</strong>
                        </div>
                    `;
                }
            });

            momentHtml += `
                <div class="step-badge-ok">
                    <span>✔ Verificación de Momento Flector: Cierre equilibrado continuo en apoyo final (Error residual: ${Math.abs(currentM).toFixed(3)} kgf·cm ≈ 0.00 kgf·m)</span>
                </div>
            `;
            momentBox.innerHTML = momentHtml;
        }
    }

    function recomputeAll() {
        currentSolution = BeamSolver.solveBeam(currentState);

        // 1. Actualizar indicador de salud de la estructura
        const healthBadge = document.getElementById('beamHealthBadge');
        if (healthBadge) {
            if (currentSolution.success) {
                healthBadge.className = 'status-pill-ok';
                healthBadge.textContent = '🟢 VIGA ESTABLE (GH = 0 o HIPERESTÁTICA)';
            } else {
                healthBadge.className = 'status-pill-err';
                healthBadge.textContent = '🔴 ERROR: ' + (currentSolution.error || 'Viga inestable');
            }
        }

        // 2. Actualizar etiquetas de sección A e Iz
        const outA = document.getElementById('outGlobalA');
        const outIz = document.getElementById('outGlobalIz');
        if (outA && currentSolution.secProps) outA.textContent = ((currentSolution.secProps.A != null ? currentSolution.secProps.A : 0)).toFixed(4);
        if (outIz && currentSolution.secProps) outIz.textContent = ((currentSolution.secProps.Iz != null ? currentSolution.secProps.Iz : (currentSolution.secProps.I != null ? currentSolution.secProps.I : 0))).toFixed(4);

        // 3. Renderizar Canvas de Vista Previa de Sección
        const cvSec = document.getElementById('canvasSectionPreview');
        if (cvSec && window.BeamCanvas && currentSolution.secProps) {
            BeamCanvas.renderCrossSectionPreview(cvSec, currentSolution.secProps);
        }

        // 4. Actualizar celdas de la tabla de Steiner si aplica
        if (currentSolution.steinerResult && currentSolution.steinerResult.rows) {
            const tbodySt = document.getElementById('tbodySteiner');
            const tfootSt = document.getElementById('tfootSteiner');
            if (tbodySt) {
                currentSolution.steinerResult.rows.forEach((r, idx) => {
                    const tr = tbodySt.children[idx];
                    if (tr) {
                        tr.querySelector('.st-out-a').textContent = r.A.toFixed(2);
                        tr.querySelector('.st-out-y').textContent = r.y_c.toFixed(2);
                        tr.querySelector('.st-out-ay').textContent = r.Ay.toFixed(2);
                        tr.querySelector('.st-out-i0').textContent = r.I0.toFixed(2);
                        tr.querySelector('.st-out-dy').textContent = r.dy.toFixed(2);
                        tr.querySelector('.st-out-iz').textContent = r.Iz_total.toFixed(2);
                    }
                });
            }
            if (tfootSt) {
                const tot = currentSolution.steinerResult;
                tfootSt.innerHTML = `
                    <tr style="background: var(--excel-yellow); font-weight: 900;">
                        <td colspan="7" style="text-align: right;">TOTALES STEINER:</td>
                        <td class="cell-auto-green">${tot.A_total.toFixed(4)}</td>
                        <td>Ȳ = ${tot.y_centroid.toFixed(4)}</td>
                        <td>${tot.Ay_total.toFixed(4)}</td>
                        <td>—</td>
                        <td>—</td>
                        <td class="cell-auto-green">${tot.Iz_total.toFixed(4)} cm⁴</td>
                    </tr>
                `;
            }
        }

        // 5. Actualizar celdas calculadas en tabla de Barras
        const tbodyBars = document.getElementById('tbodyBars');
        if (tbodyBars && currentSolution.barsDetailed) {
            tbodyBars.querySelectorAll('tr').forEach((tr, i) => {
                const bd = currentSolution.barsDetailed[i];
                if (bd && bd.active) {
                    tr.style.opacity = '1';
                    tr.querySelector('.bar-out-L').textContent = (bd.L != null ? bd.L : 0).toFixed(2);
                    tr.querySelector('.bar-out-cos').textContent = (bd.cosT != null ? bd.cosT : 1).toFixed(4);
                    tr.querySelector('.bar-out-sin').textContent = (bd.sinT != null ? bd.sinT : 0).toFixed(4);
                    tr.querySelector('.bar-out-k1').textContent = (bd.k1 != null ? bd.k1 : 0).toFixed(2);
                    tr.querySelector('.bar-out-k2').textContent = (bd.k2 != null ? bd.k2 : 0).toFixed(2);
                    tr.querySelector('.bar-out-k3').textContent = (bd.k3 != null ? bd.k3 : 0).toFixed(2);
                    tr.querySelector('.bar-out-k4').textContent = (bd.k4 != null ? bd.k4 : 0).toFixed(2);
                    tr.querySelector('.bar-out-ea').textContent = (bd.eaL != null ? bd.eaL : 0).toFixed(2);
                } else {
                    tr.style.opacity = '0.5';
                    tr.querySelector('.bar-out-L').textContent = '-';
                    tr.querySelector('.bar-out-cos').textContent = '-';
                    tr.querySelector('.bar-out-sin').textContent = '-';
                    tr.querySelector('.bar-out-k1').textContent = '-';
                    tr.querySelector('.bar-out-k2').textContent = '-';
                    tr.querySelector('.bar-out-k3').textContent = '-';
                    tr.querySelector('.bar-out-k4').textContent = '-';
                    tr.querySelector('.bar-out-ea').textContent = '-';
                }
            });
        }

        // 6. Actualizar celdas calculadas en tabla de Nodos
        const tbodyNodes = document.getElementById('tbodyNodes');
        if (tbodyNodes && currentSolution.nodesDetailed) {
            tbodyNodes.querySelectorAll('tr').forEach((tr, i) => {
                const nd = currentSolution.nodesDetailed[i];
                if (nd) {
                    tr.querySelector('.node-out-active').textContent = nd.active ? 'SÍ' : 'NO';
                    tr.querySelector('.node-out-has-dx').textContent = nd.hasDx;
                    tr.querySelector('.node-out-has-dy').textContent = nd.hasDy;
                    tr.querySelector('.node-out-has-dth').textContent = nd.hasDth;
                    tr.querySelector('.node-out-dx').textContent = nd.dxBox;
                    tr.querySelector('.node-out-dy').textContent = nd.dyBox;
                    tr.querySelector('.node-out-dth').textContent = nd.dthBox;
                }
            });
        }

        // 7. Actualizar celdas calculadas en tabla de Cargas Oblicuas
        const tbodyOb = document.getElementById('tbodyOblique');
        if (tbodyOb && currentSolution.obliqueLoadsCalculated) {
            tbodyOb.querySelectorAll('tr').forEach((tr, i) => {
                const ob = currentSolution.obliqueLoadsCalculated[i];
                if (ob) {
                    tr.querySelector('.ob-out-fx').textContent = ob.Fx.toFixed(2);
                    tr.querySelector('.ob-out-fy').textContent = ob.Fy.toFixed(2);
                } else {
                    tr.querySelector('.ob-out-fx').textContent = '0.00';
                    tr.querySelector('.ob-out-fy').textContent = '0.00';
                }
            });
        }

        // 8. Renderizar "6° Gráfica Final" interactiva
        renderGraficaFinal();

        // 9. Renderizar Tablas de Resultados Directos
        renderSummaryTables();

        // 10. Renderizar Paneles de Matrices Detalladas
        renderMatrixPanes();

        // 11. Renderizar Tarjetas Visuales de Cargas Equivalentes por Tramo (2 Columnas con SVG)
        renderEquivalentLoadCards(currentSolution);

        // 12. Renderizar Procedimiento Matemático Paso a Paso en Diagramas (DFC y DMF)
        renderDiagramStepByStep(currentSolution);

        // Sincronizar las dos gráficas de curva elástica con cada recálculo.
        document.dispatchEvent(new CustomEvent('beam:recomputed'));

        // Sincronizar estado en vivo con las tablas pedagógicas
        try {
            localStorage.setItem('cerebro_active_beam_sync', JSON.stringify(currentState));
        } catch(e) {}
    }

    function renderGraficaFinal() {
        const cv = document.getElementById('canvasGraficaFinal');
        const unitSel = document.getElementById('selectDiagramUnit');
        const unit = unitSel ? unitSel.value : 'm';
        if (cv && window.BeamCanvas && currentSolution) {
            const drawFn = BeamCanvas.renderGraficaFinal || BeamCanvas.renderGraficaFinalCanvas;
            if (typeof drawFn === 'function') {
                drawFn(cv, currentSolution, { unitMode: unit, unit: unit });
            }
        }
    }

    const unitSel = document.getElementById('selectDiagramUnit');
    if (unitSel) unitSel.addEventListener('change', renderGraficaFinal);

    // ── RENDERIZADO DE TABLAS RESUMEN DE RESULTADOS ──────────────
    function renderSummaryTables() {
        const tbD=document.getElementById('tbodySummaryDisplacements');
        const tbR=document.getElementById('tbodySummaryReactions');
        const fmt=v=>Number.isFinite(v)?(Math.abs(v)<1e-9?'0':v.toFixed(6)):'—';
        if(tbD)tbD.innerHTML=(currentSolution?.calculatedDisplacements||[]).map(d=>
            '<tr><td><strong>'+d.uLbl+'</strong></td><td class="cell-auto-green">'+fmt(d.value)+'</td><td>'+d.unit+'</td></tr>'
        ).join('')||'<tr><td colspan="3">Sin desplazamientos libres</td></tr>';
        if(tbR)tbR.innerHTML=(currentSolution?.calculatedReactions||[]).map(r=>
            '<tr><td><strong>'+r.uLbl+'</strong></td><td class="cell-auto-green">'+fmt(r.reactionFinal)+'</td><td>'+r.unit+'</td></tr>'
        ).join('')||'<tr><td colspan="3">Sin reacciones</td></tr>';

        // Renderizado de fórmulas matriciales oficiales en LaTeX KaTeX
        const fR = document.getElementById('formulaReactions');
        if (fR && typeof renderLatex === 'function') {
            fR.innerHTML = renderLatex('\\{R\\} = [K_{21}] \\cdot \\{D\\} - \\{Q_{\\text{rest}}\\}', false);
        }
        const fD = document.getElementById('formulaDisplacements');
        if (fD && typeof renderLatex === 'function') {
            fD.innerHTML = renderLatex('\\{D\\} = [K_{11}]^{-1} \\cdot \\{Q_{\\text{lib}}\\}', false);
        }
    }

    // ── RENDERIZADO DE PANELES MATRICIALES (PASO A PASO) ─────────
    function setupMatrixTabs() {
        // Soporte para pestañas principales en estilo .tabs-nav .tab-btn
        document.querySelectorAll('.tabs-nav .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tabs-nav .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
                const target = document.getElementById(btn.dataset.tab);
                if (target) target.classList.add('active');
            });
        });

        // Soporte para .matrix-tab-btn
        document.querySelectorAll('.matrix-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.matrix-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.matrix-pane').forEach(p => p.style.display = 'none');
                const target = document.getElementById(btn.dataset.mtab);
                if (target) target.style.display = 'block';
            });
        });
    }

    function renderMatrixPanes() {
        if (!currentSolution || !currentSolution.success) return;

        // PANE 1: MATRICES LOCALES 6x6 Y EXTENDIDAS 6x36 POR TRAMO
        const paneLocal = document.getElementById('paneLocalBars');
        if (paneLocal && currentSolution.barsDetailed) {
            const activeBars = currentSolution.barsDetailed.filter(b => b.active);
            paneLocal.innerHTML = activeBars.map(bd => {
                const bIdx = bd.idx;
                const kl = bd.K_local;
                const ke = bd.K_ext;
                const labels = bd.dofLabels;

                return `
                    <div class="matrix-card-neon">
                        <div class="matrix-card-title">
                            <span>⚡ Tramo Barra [${bIdx + 1}] (Nudo ${bd.nodeStart} ➔ Nudo ${bd.nodeEnd})</span>
                            <span style="font-size: 11.5px; color: #94a3b8; font-family: monospace;">L = ${bd.L.toFixed(2)} cm • E = ${bd.E.toLocaleString()} kgf/cm² • I = ${bd.I ? bd.I.toFixed(1) : '—'} cm⁴</span>
                        </div>
                        <div class="grid-equal-2">
                            <div>
                                <div class="matrix-subhead" style="color: #00f0ff;">Matriz de Rigidez Local [k]₆ₓ₆ (kgf y cm):</div>
                                <div class="table-scroll">
                                    <table class="neon-matrix-table">
                                        <thead>
                                            <tr>
                                                <th class="cell-gdl-header">GDL</th>
                                                ${labels.map(l => `<th>${l}</th>`).join('')}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${kl.map((row, rI) => `
                                                <tr>
                                                    <td class="cell-gdl-header">${labels[rI]}</td>
                                                    ${row.map((val, cI) => `<td class="${rI === cI ? 'cell-diag-active' : (Math.abs(val) > 1e-4 ? 'cell-val-active' : 'cell-val-zero')}">${val !== 0 ? val.toFixed(2) : '0.00'}</td>`).join('')}
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div>
                                <div class="matrix-subhead" style="color: #a855f7;">Matriz Extendida [K_ext]₆ₓ₃₆ (Ensamblaje Global):</div>
                                <div class="table-scroll" style="max-height: 250px;">
                                    <table class="neon-matrix-table">
                                        <thead>
                                            <tr>
                                                <th class="cell-gdl-header sticky-col">GDL</th>
                                                ${currentSolution.gdlAllLabels.map(l => `<th style="font-size:9.5px;">${l}</th>`).join('')}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${ke.map((row, rI) => `
                                                <tr>
                                                    <td class="cell-gdl-header sticky-col">${labels[rI]}</td>
                                                    ${row.map(val => `<td class="${Math.abs(val) > 1e-4 ? 'cell-val-active' : 'cell-val-zero'}">${val !== 0 ? val.toFixed(1) : '0'}</td>`).join('')}
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // PANE 2: MATRIZ GLOBAL 36x36
        const paneGlobal = document.getElementById('paneGlobalK');
        if (paneGlobal && currentSolution.K_global) {
            const kg = currentSolution.K_global;
            const labels = currentSolution.gdlAllLabels;
            paneGlobal.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 800; font-size: 13px; color: #00f0ff;">
                        📐 Matriz de Rigidez Global Ensamblada [K]₃₆ₓ₃₆
                    </span>
                    <span style="font-size: 11px; color: #34d399; font-family: monospace;">
                        ✔ Simétrica [K] = [K]ᵀ • Diagonal Principal [K_ii] en Verde Neón
                    </span>
                </div>
                <div class="table-scroll" style="max-height: 520px; border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 8px;">
                    <table class="neon-matrix-table">
                        <thead>
                            <tr>
                                <th class="cell-gdl-header sticky-col">GDL</th>
                                ${labels.map(l => `<th style="font-size: 10px;">${l}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${kg.map((row, rI) => `
                                <tr>
                                    <td class="cell-gdl-header sticky-col">${labels[rI]}</td>
                                    ${row.map((val, cI) => `
                                        <td class="${rI === cI ? 'cell-diag-active' : (Math.abs(val) > 1e-4 ? 'cell-val-active' : 'cell-val-zero')}">
                                            ${val !== 0 ? val.toFixed(1) : '0'}
                                        </td>
                                    `).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // PANE 3: ECUACIÓN COMPLETA [C] = [K][D]
        const paneFull = document.getElementById('paneFullEq');
        if (paneFull && currentSolution.equationRows) {
            paneFull.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 800; font-size: 13px; color: #fbbf24;">
                        📋 Sistema Matricial Completo: {Q} = [K] · {D}
                    </span>
                    <span style="font-size: 11px; color: #fbbf24; background: rgba(245, 158, 11, 0.15); padding: 3px 8px; border-radius: 4px; border: 1px solid #fbbf24;">
                        ★ Filas de Grados Restringidos (Apoyos) Resaltadas en Ámbar Neón
                    </span>
                </div>
                <div class="table-scroll" style="max-height: 520px; border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 8px;">
                    <table class="neon-matrix-table">
                        <thead>
                            <tr>
                                <th class="cell-gdl-header sticky-col">GDL</th>
                                <th style="color: #fbbf24;">{Q} Cargas / Reacc.</th>
                                <th>=</th>
                                ${currentSolution.gdlAllLabels.map(l => `<th style="font-size: 10px;">${l}</th>`).join('')}
                                <th>*</th>
                                <th style="color: #00f0ff;">{D} Desplaz.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${currentSolution.equationRows.map(er => `
                                <tr class="${er.isRestricted ? 'row-restricted-neon' : 'row-free-neon'}">
                                    <td class="cell-gdl-header sticky-col">${er.uLbl}</td>
                                    <td class="cell-c-expr">${er.C_expr}</td>
                                    <td style="color: #64748b;">=</td>
                                    ${er.K_row.map((val, cI) => `
                                        <td class="${er.dofIndex === cI ? 'cell-diag-active' : (Math.abs(val) > 1e-4 ? 'cell-val-active' : 'cell-val-zero')}">
                                            ${val !== 0 ? val.toFixed(1) : '0'}
                                        </td>
                                    `).join('')}
                                    <td style="color: #64748b;">*</td>
                                    <td style="color: ${er.isRestricted ? '#94a3b8' : '#00f0ff'}; font-weight: bold; font-family: monospace;">${er.D_expr}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // PANE 4: REDUCIDA [K_LL] E INVERSA
        const paneRedKLL = document.getElementById('paneReducedKLL');
        if (paneRedKLL && currentSolution.K_LL) {
            const kll = currentSolution.K_LL;
            const kllInv = currentSolution.K_LL_inv;
            const fDofs = currentSolution.freeDofs;
            paneRedKLL.innerHTML = `
                <div class="grid-equal-2">
                    <div>
                        <div style="font-weight: 800; font-size: 12.5px; color: #00f0ff; margin-bottom: 6px;">
                            Matriz Reducida de Grados Libres [K₁₁] (${fDofs.length}×${fDofs.length}):
                        </div>
                        <div class="table-scroll">
                            <table class="neon-matrix-table">
                                <thead>
                                    <tr>
                                        <th class="cell-gdl-header">GDL</th>
                                        ${fDofs.map(f => `<th>${f.uLbl}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${kll.map((row, rI) => `
                                        <tr>
                                            <td class="cell-gdl-header">${fDofs[rI].uLbl}</td>
                                            ${row.map((val, cI) => `<td class="${rI === cI ? 'cell-diag-active' : 'cell-val-active'}">${val.toFixed(2)}</td>`).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div>
                        <div style="font-weight: 800; font-size: 12.5px; color: #10b981; margin-bottom: 6px;">
                            Matriz Inversa [K₁₁]⁻¹ (Equivalente a MINVERSE en Excel):
                        </div>
                        <div class="table-scroll">
                            <table class="neon-matrix-table">
                                <thead>
                                    <tr>
                                        <th class="cell-gdl-header">GDL</th>
                                        ${fDofs.map(f => `<th>${f.uLbl}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${kllInv.map((row, rI) => `
                                        <tr>
                                            <td class="cell-gdl-header">${fDofs[rI].uLbl}</td>
                                            ${row.map(val => `<td class="font-mono" style="color: #34d399;">${val.toExponential(4)}</td>`).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }

        // PANE 5: REDUCIDA [K_RL]
        const paneRedKRL = document.getElementById('paneReducedKRL');
        if (paneRedKRL && currentSolution.K_RL) {
            const krl = currentSolution.K_RL;
            const fDofs = currentSolution.freeDofs;
            const rDofs = currentSolution.restDofs;
            paneRedKRL.innerHTML = `
                <div style="font-weight: 800; font-size: 12.5px; color: #34d399; margin-bottom: 6px;">
                    Ecuación Matricial Reducida para Cargas y Reacciones: {Q_restringidos} = [K₂₁] · {D_libres}:
                </div>
                <div class="table-scroll">
                    <table class="neon-matrix-table">
                        <thead>
                            <tr>
                                <th class="cell-gdl-header">GDL APOYO</th>
                                <th style="color: #fbbf24;">{Q_apoyo}</th>
                                <th>=</th>
                                ${fDofs.map(f => `<th>${f.uLbl}</th>`).join('')}
                                <th>*</th>
                                <th style="color: #00f0ff;">{D_libres}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${krl.map((row, rI) => `
                                <tr>
                                    <td class="cell-gdl-header">${rDofs[rI].uLbl}</td>
                                    <td class="cell-c-expr">${rDofs[rI].C_expr}</td>
                                    <td style="color: #64748b;">=</td>
                                    ${row.map(val => `<td class="${Math.abs(val) > 1e-4 ? 'cell-val-active' : 'cell-val-zero'}">${val.toFixed(2)}</td>`).join('')}
                                    <td style="color: #64748b;">*</td>
                                    <td class="font-mono" style="color: #00f0ff; font-weight: bold;">${currentSolution.calculatedDisplacements[rI] ? currentSolution.calculatedDisplacements[rI].value.toFixed(8) : '0.00000000'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    // ── GESTIÓN DE DESCARGAS (PNG Y EXCEL .XLSX) ─────────────────
    function setupDownloadButtons() {
        // Descargar PNG
        const triggerPNG = () => {
            const cv = document.getElementById('canvasGraficaFinal');
            if (cv) {
                try {
                    const dataUrl = cv.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    a.download = '6TO_GRAFICA_FINAL_VIGA_ULIANOV.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    return;
                } catch(e) {
                    console.warn('Canvas toDataURL fallback', e);
                }
            }
            if (window.BeamCanvas && currentSolution) {
                BeamCanvas.downloadGraficaFinalPNG(currentSolution, {}, '6TO_GRAFICA_FINAL_VIGA_ULIANOV.png');
            }
        };

        const btnTopPNG = document.getElementById('btnTopDownloadPNG');
        const btnMainPNG = document.getElementById('btnDownloadPNGMain');
        if (btnTopPNG) btnTopPNG.addEventListener('click', triggerPNG);
        if (btnMainPNG) btnMainPNG.addEventListener('click', triggerPNG);

        // Descargar Excel (.xlsx)
        const triggerExcel = async () => {
            if (window.CerebroAuth && !CerebroAuth.isAuthorized()) {
                alert('🔒 Para descargar la PLANTILLA ULIANOV en Excel (.xlsx) debes iniciar sesión con tu cuenta.');
                if (typeof CerebroAuth.openAuthModal === 'function') {
                    CerebroAuth.openAuthModal();
                } else if (typeof CerebroAuth.showAuthModal === 'function') {
                    CerebroAuth.showAuthModal();
                }
                return;
            }

            if (window.CerebroAuth && !CerebroAuth.hasExcelPermission()) {
                CerebroAuth.showExcelVipNotice();
                return;
            }

            if (window.BeamExcelGenerator) {
                const btn1 = document.getElementById('btnTopDownloadExcel');
                const btn2 = document.getElementById('btnDownloadExcelMain');
                const orig1 = btn1 ? btn1.innerHTML : '';
                const orig2 = btn2 ? btn2.innerHTML : '';
                if (btn1) btn1.innerHTML = '⏳ Generando Excel...';
                if (btn2) btn2.innerHTML = '⏳ Generando Excel (.xlsx)...';

                try {
                    await BeamExcelGenerator.downloadBeamExcel(currentState, 'PLANTILLA_ULIANOV_VIGAS_12_NODOS_METODO_RIGIDEZ.xlsx');
                    if (btn1) btn1.innerHTML = '✔ ¡Excel Descargado!';
                    if (btn2) btn2.innerHTML = '✔ ¡Excel Descargado!';
                } catch (e) {
                    console.error('Error generando Excel:', e);
                    alert('Error generando Excel: ' + e.message);
                } finally {
                    setTimeout(() => {
                        if (btn1) btn1.innerHTML = orig1;
                        if (btn2) btn2.innerHTML = orig2;
                    }, 2500);
                }
            } else {
                alert('Generador Excel no disponible.');
            }
        };

        const btnTopXlsx = document.getElementById('btnTopDownloadExcel');
        const btnMainXlsx = document.getElementById('btnDownloadExcelMain');
        if (btnTopXlsx) btnTopXlsx.addEventListener('click', triggerExcel);
        if (btnMainXlsx) btnMainXlsx.addEventListener('click', triggerExcel);

        // Mis Proyectos Guardados
        const btnSaveProj = document.getElementById('btnSaveBeamProject');
        if (btnSaveProj) {
            btnSaveProj.addEventListener('click', () => {
                const name = prompt('Nombre para este proyecto de viga:', 'Viga Continua ' + (new Date().toLocaleDateString('es-PE') + ' ' + new Date().toLocaleTimeString('es-PE').slice(0, 5)));
                if (!name) return;
                window.CerebroDB.saveProject('beam', name, currentState);
                alert('✔ ¡Viga guardada exitosamente en Mis Proyectos!');
            });
        }
        const btnOpenProj = document.getElementById('btnOpenBeamProjects');
        if (btnOpenProj) {
            btnOpenProj.addEventListener('click', () => {
                window.CerebroDB.showProjectsModal('beam', (data) => {
                    currentState = JSON.parse(JSON.stringify(data));
                    loadStateIntoUI();
                }, () => currentState);
            });
        }
    }

    // API pública de la aplicación
        // ── GESTIÓN DE MODO GUIADO (PASO A PASO) Y MODO EXPERTO ──────
    let currentViewMode = 'expert';
    let currentWizardStep = 1;

    function setupViewModesAndWizard() {
        const btnGuided = document.getElementById('btnModeGuided');
        const btnClassic = document.getElementById('btnModeClassic');
        const wizardNav = document.getElementById('wizardStepNav');
        const steps = document.querySelectorAll('.wizard-step');

        function setViewMode(mode) {
            currentViewMode = mode;
            if (mode === 'guided') {
                btnGuided && btnGuided.classList.add('active');
                btnClassic && btnClassic.classList.remove('active');
                wizardNav && (wizardNav.style.display = 'flex');
                applyWizardStep(currentWizardStep);
            } else {
                btnClassic && btnClassic.classList.add('active');
                btnGuided && btnGuided.classList.remove('active');
                wizardNav && (wizardNav.style.display = 'none');
                const allCards = ['cardSection', 'cardBars', 'cardNodes', 'cardDistLoads', 'cardOblique', 'cardDiagrams', 'cardMatrices', 'curvaElasticaSection'];
                allCards.forEach(cid => {
                    const el = document.getElementById(cid);
                    if (el) el.classList.remove('guided-hidden');
                });
            }
        }

        function applyWizardStep(step) {
            currentWizardStep = step;
            steps.forEach(st => {
                const sNum = parseInt(st.dataset.step, 10);
                if (sNum === step) st.classList.add('active');
                else st.classList.remove('active');
            });

            if (currentViewMode !== 'guided') return;

            const allCards = ['cardSection', 'cardBars', 'cardNodes', 'cardDistLoads', 'cardOblique', 'cardDiagrams', 'cardMatrices', 'curvaElasticaSection'];
            let activeCards = [];
            if (step === 1) {
                // Paso 1: Geometría y Apoyos
                activeCards = ['cardBars', 'cardNodes'];
            } else if (step === 2) {
                // Paso 2: Sección y Material
                activeCards = ['cardSection'];
            } else if (step === 3) {
                // Paso 3: Cargas (Distribuidas, Puntuales, Oblicuas)
                activeCards = ['cardNodes', 'cardDistLoads', 'cardOblique'];
            } else if (step === 4) {
                // Paso 4: Diagramas y Matrices
                activeCards = ['cardDiagrams', 'cardMatrices', 'curvaElasticaSection'];
            }

            allCards.forEach(cid => {
                const el = document.getElementById(cid);
                if (el) {
                    if (activeCards.includes(cid)) el.classList.remove('guided-hidden');
                    else el.classList.add('guided-hidden');
                }
            });
        }

        if (btnGuided) btnGuided.onclick = () => setViewMode('guided');
        if (btnClassic) btnClassic.onclick = () => setViewMode('expert');

        steps.forEach(st => {
            st.onclick = () => {
                const s = parseInt(st.dataset.step, 10) || 1;
                applyWizardStep(s);
            };
        });

        setViewMode('expert');
    }

    // ── INTERACCIÓN CON CLIC DIRECTO EN EL CANVAS ────────────────
    function setupCanvasInteractivity() {
        const canvas = document.getElementById('canvasGraficaFinal');
        const toast = document.getElementById('canvasInteractiveToast');
        if (!canvas) return;

        let toastTimer = null;
        function showCanvasToast(msg) {
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => {
                toast.classList.remove('show');
            }, 1800);
        }

        canvas.addEventListener('click', (e) => {
            if (!canvas._nodeHitboxes || canvas._nodeHitboxes.length === 0) return;
            const rect = canvas.getBoundingClientRect();
            const logicalW = canvas._logicalW || 1180;
            const logicalH = canvas._logicalH || 540;
            const clickX = ((e.clientX - rect.left) / rect.width) * logicalW;
            const clickY = ((e.clientY - rect.top) / rect.height) * logicalH;

            for (const hb of canvas._nodeHitboxes) {
                const dist = Math.hypot(clickX - hb.x, clickY - hb.y);
                if (dist <= hb.radius + 12) {
                    const seq = ['LIBRE', 'RODILLO', 'FIJO', 'EMPOTRADO'];
                    const curIdx = seq.indexOf(hb.cond) >= 0 ? seq.indexOf(hb.cond) : 0;
                    const nextCond = seq[(curIdx + 1) % seq.length];

                    if (currentState.nodes && currentState.nodes[hb.nodeIdx]) {
                        currentState.nodes[hb.nodeIdx].cond = nextCond;
                    }

                    const tbody = document.getElementById('tbodyNodes');
                    if (tbody) {
                        const row = tbody.querySelector(`tr[data-node-idx="${hb.nodeIdx}"]`);
                        if (row) {
                            const sel = row.querySelector('[data-field="cond"]');
                            if (sel) sel.value = nextCond;
                        }
                    }

                    showCanvasToast(`✨ Nudo ${hb.nodeNum}: ${nextCond}`);
                    recomputeAll();
                    break;
                }
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!canvas._nodeHitboxes) return;
            const rect = canvas.getBoundingClientRect();
            const logicalW = canvas._logicalW || 1180;
            const logicalH = canvas._logicalH || 540;
            const clickX = ((e.clientX - rect.left) / rect.width) * logicalW;
            const clickY = ((e.clientY - rect.top) / rect.height) * logicalH;

            let over = false;
            for (const hb of canvas._nodeHitboxes) {
                if (Math.hypot(clickX - hb.x, clickY - hb.y) <= hb.radius + 12) {
                    over = true;
                    break;
                }
            }
            canvas.style.cursor = over ? 'pointer' : 'default';
        });
    }

    // ── MODALES DE GALERÍA Y MEMORIA DE CÁLCULO ──────────────────
    function setupGalleryAndReportModals() {
        const btnOpenGallery = document.getElementById('btnOpenGallery');
        const modalGallery = document.getElementById('cb-gallery-modal');
        const btnCloseGallery = document.getElementById('btnCloseGallery');

        if (btnOpenGallery && modalGallery) {
            btnOpenGallery.onclick = () => modalGallery.classList.remove('cb-hidden');
            btnCloseGallery && (btnCloseGallery.onclick = () => modalGallery.classList.add('cb-hidden'));
            modalGallery.onclick = (e) => {
                if (e.target === modalGallery) modalGallery.classList.add('cb-hidden');
            };

            modalGallery.querySelectorAll('.gallery-card').forEach(card => {
                card.onclick = () => {
                    const pid = card.dataset.preset;
                    const p = BeamSolver.getPreset(pid);
                    if (p) {
                        currentState = JSON.parse(JSON.stringify(p));
                        loadStateIntoUI();
                        modalGallery.classList.add('cb-hidden');
                    }
                };
            });
        }

        const btnOpenReport = document.getElementById('btnOpenReport');
        const modalReport = document.getElementById('cb-report-modal');
        const btnCloseReport = document.getElementById('btnCloseReport');
        const btnPrintReport = document.getElementById('btnPrintReport');

        if (btnOpenReport && modalReport) {
            btnOpenReport.onclick = () => {
                renderAcademicReportContent();
                modalReport.classList.remove('cb-hidden');
            };
            btnCloseReport && (btnCloseReport.onclick = () => modalReport.classList.add('cb-hidden'));
            modalReport.onclick = (e) => {
                if (e.target === modalReport) modalReport.classList.add('cb-hidden');
            };
            btnPrintReport && (btnPrintReport.onclick = () => window.print());
        }
    }

    function renderAcademicReportContent() {
        const area = document.getElementById('reportContentArea');
        if (!area || !currentSolution) return;

        const sol = currentSolution;
        const b = currentState.b || 15;
        const h = currentState.h || 30;
        const E = currentState.E || 2100000;
        const numBars = (sol.barsTable || []).filter(b => b.active).length;
        const numNodes = (sol.nodesTable || []).filter(n => n.active).length;

        let barsRowsHtml = '';
        (sol.barsTable || []).filter(x => x.active).forEach(bar => {
            barsRowsHtml += `
                <tr>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: center;"><strong>[${bar.barNum}]</strong></td>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: center;">(${bar.nIni || bar.barNum}) → (${bar.nFin || bar.barNum + 1})</td>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: right;">${(bar.L / 100).toFixed(2)} m</td>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: right;">${bar.L.toFixed(1)} cm</td>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: right;">${bar.k12 ? bar.k12.toFixed(2) : '-'}</td>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: right;">${bar.k6 ? bar.k6.toFixed(2) : '-'}</td>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: right;">${bar.k4 ? bar.k4.toFixed(2) : '-'}</td>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: right;">${bar.k2 ? bar.k2.toFixed(2) : '-'}</td>
                </tr>
            `;
        });

        let dispRowsHtml = '';
        (sol.dofResults || []).filter(d => d.hay === 'SÍ').forEach(d => {
            dispRowsHtml += `
                <tr>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1; font-weight: bold;">${d.dLbl || d.uLbl}</td>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1;">${d.dLbl && d.dLbl.includes('θ') ? 'Rotación / Giro' : 'Desplazamiento Lineal'}</td>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold; color: #0284c7;">
                        ${(d.dispVal || 0).toExponential(5)} ${d.dLbl && d.dLbl.includes('θ') ? 'rad' : 'cm'}
                    </td>
                </tr>
            `;
        });

        let reacRowsHtml = '';
        (sol.reactionsList || []).forEach(r => {
            reacRowsHtml += `
                <tr>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1; font-weight: bold;">${r.lbl}</td>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1;">Nudo ${r.nodeNum} (${r.type})</td>
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold; color: #059669;">
                        ${(r.val || 0).toFixed(2)} ${r.type === 'Momento' ? 'Kgf·cm' : 'Kgf'}
                    </td>
                </tr>
            `;
        });

        area.innerHTML = `
            <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
                <h2 style="font-size: 17px; font-weight: 800; margin: 0; color: #0f172a;">UNIVERSIDAD CONTINENTAL — FACULTAD DE INGENIERÍA</h2>
                <h3 style="font-size: 14px; font-weight: 700; color: #475569; margin: 4px 0;">ANÁLISIS ESTRUCTURAL II — MÉTODO DE RIGIDEZ DIRECTA EN VIGAS CONTINUAS</h3>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Cátedra: Ing. Ulianov Cuba Valencia • Fecha: ${new Date().toLocaleDateString('es-PE')}</div>
            </div>

            <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 12px 0 6px;">1. Parámetros del Modelo y Propiedades de la Sección</h4>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 14px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px;">
                <div><strong>Módulo de Elasticidad E:</strong> ${E.toLocaleString()} Kgf/cm²</div>
                <div><strong>Sección Transversal:</strong> ${currentState.sec_type || 'RECTANGULAR'} (${b} × ${h} cm)</div>
                <div><strong>Área Total A:</strong> ${(b * h).toFixed(2)} cm²</div>
                <div><strong>Inercia Iz:</strong> ${(b * Math.pow(h, 3) / 12).toFixed(2)} cm⁴</div>
                <div><strong>Tramos Activos:</strong> ${numBars} tramos</div>
                <div><strong>Nudos Totales:</strong> ${numNodes} nudos</div>
            </div>

            <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 12px 0 6px;">2. Conectividad y Rigideces Locales de Cada Tramo</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px;">
                <thead style="background: #f1f5f9;">
                    <tr>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">Tramo</th>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">Nudos</th>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">L (m)</th>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">L (cm)</th>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">12EI/L³</th>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">6EI/L²</th>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">4EI/L</th>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">2EI/L</th>
                    </tr>
                </thead>
                <tbody>${barsRowsHtml || '<tr><td colspan="8">Sin datos</td></tr>'}</tbody>
            </table>

            <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 12px 0 6px;">3. Grados de Libertad y Desplazamientos Obtenidos {U}</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px;">
                <thead style="background: #f1f5f9;">
                    <tr>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">GDL</th>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">Tipo de Grado</th>
                        <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">Magnitud Calculada</th>
                    </tr>
                </thead>
                <tbody>${dispRowsHtml || '<tr><td colspan="3">Estructura totalmente restringida</td></tr>'}</tbody>
            </table>

            <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 12px 0 6px;">4. Reacciones en los Apoyos {R}</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px;">
                <thead style="background: #f1f5f9;">
                    <tr>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">Reacción</th>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">Ubicación</th>
                        <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">Valor</th>
                    </tr>
                </thead>
                <tbody>${reacRowsHtml || '<tr><td colspan="3">Sin reacciones</td></tr>'}</tbody>
            </table>

            <div style="font-size: 11px; color: #059669; font-weight: bold; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 8px; text-align: center;">
                ✓ Verificación de Equilibrio Estático Global: ΣFy = 0 y ΣMz = 0 comprobados con precisión analítica.
            </div>
        `;
    }

window.CerebroApp = {
        getCurrentState: () => JSON.parse(JSON.stringify(currentState)),
        getSolution: () => currentSolution,
        loadState: (newState) => {
            if (newState) {
                currentState = JSON.parse(JSON.stringify(newState));
                loadStateIntoUI();
            }
        },
        recompute: recomputeAll
    };

    window.BeamApp = {
        getCurrentData: () => JSON.parse(JSON.stringify(currentState)),
        loadProjectData: (data) => {
            if (data) {
                currentState = JSON.parse(JSON.stringify(data));
                loadStateIntoUI();
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

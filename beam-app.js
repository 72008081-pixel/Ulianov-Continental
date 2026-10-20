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

    // Inicialización del DOM
    function init() {
        setupPresetSelector();
        setupQuickSpans();
        setupSectionControls();
        setupMatrixTabs();
        setupDownloadButtons();

        renderBarsTable();
        renderNodesTable();
        renderSpansLoadsTable();
        renderObliqueTable();
        renderSteinerTable();

        recomputeAll();
    }

    // ── GESTIÓN DE PRESETS ───────────────────────────────────────
    function setupPresetSelector() {
        const sel = document.getElementById('selectPreset');
        const btnClear = document.getElementById('btnClearExercise');

        if (sel) {
            sel.addEventListener('change', () => {
                const p = BeamSolver.getPreset(sel.value);
                if (p) {
                    currentState = p;
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
        // Cargar sección
        document.getElementById('inpGlobalE').value = currentState.E || 2100000;
        document.getElementById('inpSecType').value = currentState.sec_type || 'RECTANGULAR';
        document.getElementById('inpSecB').value = currentState.b || 15;
        document.getElementById('inpSecH').value = currentState.h || 30;
        document.getElementById('inpSecP3').value = currentState.p3 || 0;
        document.getElementById('inpSecP4').value = currentState.p4 || 0;
        document.getElementById('inpPropMode').value = currentState.prop_mode || 'CONSTANTE';

        renderSteinerTable();
        renderBarsTable();
        renderNodesTable();
        renderSpansLoadsTable();
        renderObliqueTable();

        recomputeAll();
    }

    // ── ASISTENTE RÁPIDO DE LONGITUDES DE TRAMOS (L1, L2, L3...) ──
    function setupQuickSpans() {
        const numSel = document.getElementById('quickNumBars');
        const unitSel = document.getElementById('quickDistUnit');
        const container = document.getElementById('quickSpanInputsContainer');
        const btnApply = document.getElementById('btnApplyQuickSpans');

        function renderSpanInputs() {
            if (!container || !numSel) return;
            const n = parseInt(numSel.value, 10) || 3;
            const unit = unitSel ? unitSel.value : 'm';
            const scale = unit === 'm' ? 0.01 : 1.0;

            let html = '';
            for (let i = 0; i < n; i++) {
                const b = currentState.bars && currentState.bars[i];
                let defaultVal = 2;
                if (b && (b.xf > b.xi)) {
                    defaultVal = (b.xf - b.xi) * scale;
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

        if (numSel) numSel.addEventListener('change', renderSpanInputs);
        if (unitSel) unitSel.addEventListener('change', renderSpanInputs);
        renderSpanInputs();

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

            // Actualizar etiquetas de parámetros según tipo
            const lblB = document.getElementById('lblParamB');
            const lblH = document.getElementById('lblParamH');
            const lblP3 = document.getElementById('lblParamP3');
            const lblP4 = document.getElementById('lblParamP4');

            if (currentState.sec_type === 'T_SECTION' || currentState.sec_type === 'SECCION_T') {
                if (lblB) lblB.textContent = 'b_alma (cm)';
                if (lblH) lblH.textContent = 'h_alma (cm)';
                if (lblP3) lblP3.textContent = 'b_ala (cm)';
                if (lblP4) lblP4.textContent = 't_ala (cm)';
            } else if (currentState.sec_type === 'I_SECTION' || currentState.sec_type === 'DOBLE_T') {
                if (lblB) lblB.textContent = 'b_ala (cm)';
                if (lblH) lblH.textContent = 'H_tot (cm)';
                if (lblP3) lblP3.textContent = 't_ala (cm)';
                if (lblP4) lblP4.textContent = 't_alma (cm)';
            } else if (currentState.sec_type === 'CIRCULAR') {
                if (lblB) lblB.textContent = 'Diámetro D (cm)';
                if (lblH) lblH.textContent = '—';
                if (lblP3) lblP3.textContent = '—';
                if (lblP4) lblP4.textContent = '—';
            } else if (currentState.sec_type === 'TUBULAR_CIRCULAR') {
                if (lblB) lblB.textContent = 'D_ext (cm)';
                if (lblH) lblH.textContent = 'd_int (cm)';
                if (lblP3) lblP3.textContent = '—';
                if (lblP4) lblP4.textContent = '—';
            } else if (currentState.sec_type === 'CAJON_HUECO' || currentState.sec_type === 'BOX') {
                if (lblB) lblB.textContent = 'B_ext (cm)';
                if (lblH) lblH.textContent = 'H_ext (cm)';
                if (lblP3) lblP3.textContent = 'b_int (cm)';
                if (lblP4) lblP4.textContent = 'h_int (cm)';
            } else if (currentState.sec_type === 'DIRECTO_A_I') {
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

            if ((currentState.sec_type === 'STEINER_COMPUESTA' || currentState.sec_type === 'STEINER_CUSTOM') && steinerWrap) {
                steinerWrap.style.display = 'block';
            }

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
    function syncDistLoadsFromBars() {
        if (!currentState.dist_loads || currentState.dist_loads.length === 0) {
            currentState.dist_loads = [];
            (currentState.bars || []).forEach((b, i) => {
                if (Math.abs(b.q || 0) > 1e-9 || Math.abs(b.q_input || 0) > 1e-9) {
                    const spanLen = Math.abs((b.xf || 0) - (b.xi || 0)) || 200;
                    currentState.dist_loads.push({
                        barIdx: i,
                        w: (b.q_input !== undefined && b.q_input !== null && b.q_input !== '') ? b.q_input : (b.q_unit === 'kgf/m' ? (b.q * 100) : b.q),
                        unit: b.q_unit || 'kgf/m',
                        L_dist: (b.L_dist !== undefined && b.L_dist !== null && b.L_dist !== '') ? b.L_dist : spanLen
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
        // ── TARJETAS VISUALES DE SEPARACIÓN DE CARGAS EQUIVALENTES ────
    function renderEquivalentLoadCards(sol) {
        const container = document.getElementById('beamEquivalentCardsContainer');
        if (!container) return;

        if (!sol || !sol.success || !sol.barsTable) {
            container.innerHTML = '<div style="color:#64748b; font-size:12px; padding:8px;">Sin solución calculada.</div>';
            return;
        }

        const loadedBars = sol.barsTable.filter(b => b.active && (Math.abs(b.q) > 1e-9 || Math.abs(b.P_tramo) > 1e-9));
        if (loadedBars.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; color: #64748b; font-size: 12px; padding: 12px; text-align: center; background: #090e1a; border-radius: 8px; border: 1px dashed #1e293b;">
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

            html += `
                <div class="eq-card">
                    <div class="eq-card-header">
                        <span class="eq-card-title">Tramo [${b.barNum}]: Nudo (${nI}) → Nudo (${nF})</span>
                        <span class="eq-badge">L = ${L_m} m (${b.L.toFixed(0)} cm)</span>
                    </div>
                    <div style="font-size: 11.5px; margin-bottom: 8px; color: #bae6fd;">
                        <strong>Carga aplicada:</strong> q = ${qDisp} ${b.q_unit === 'kgf/m' ? `(${b.q.toFixed(4)} kgf/cm)` : ''}
                        ${b.P_tramo !== 0 ? `<br><strong>Carga puntual en tramo:</strong> P = ${b.P_tramo} kgf @ a = ${b.a_dist || (b.L/2)} cm` : ''}
                    </div>
                    <div class="eq-card-loads">
                        <div class="eq-load-node">
                            <div class="eq-node-title">Extremo Inicial (Nudo ${nI})</div>
                            <div class="eq-val-row"><span class="eq-val-label">Vi equiv:</span><span class="eq-val-num" style="color:#00f0ff;">+${b.V_ini.toFixed(2)} kgf</span></div>
                            <div class="eq-val-row"><span class="eq-val-label">Mi equiv:</span><span class="eq-val-num" style="color:#10b981;">+${b.M_ini.toFixed(2)} kgf·cm</span></div>
                        </div>
                        <div class="eq-load-node node-j">
                            <div class="eq-node-title">Extremo Final (Nudo ${nF})</div>
                            <div class="eq-val-row"><span class="eq-val-label">Vj equiv:</span><span class="eq-val-num" style="color:#00f0ff;">+${b.V_fin.toFixed(2)} kgf</span></div>
                            <div class="eq-val-row"><span class="eq-val-label">Mj equiv:</span><span class="eq-val-num" style="color:#f59e0b;">${b.M_fin.toFixed(2)} kgf·cm</span></div>
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
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
                    <div style="margin-bottom: 20px; background: #ffffff; border: 2px solid #cbd5e1; border-radius: 10px; padding: 12px;">
                        <div style="font-size: 13.5px; font-weight: 900; color: #000000; margin-bottom: 8px;">
                            Tramo Barra [${bIdx + 1}] (Nudo ${bd.nodeStart} ➔ Nudo ${bd.nodeEnd}): Longitud L = ${bd.L.toFixed(2)} cm, E = ${bd.E} kgf/cm²
                        </div>
                        <div class="grid-equal-2">
                            <div>
                                <div style="font-weight: 800; font-size: 12px; margin-bottom: 4px;">Matriz de Rigidez Local [k]₆ₓ₆ (kgf y cm):</div>
                                <div class="table-scroll">
                                    <table class="excel-table">
                                        <thead>
                                            <tr>
                                                <th>GDL</th>
                                                ${labels.map(l => `<th>${l}</th>`).join('')}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${kl.map((row, rI) => `
                                                <tr>
                                                    <td class="cell-auto-subhdr">${labels[rI]}</td>
                                                    ${row.map((val, cI) => `<td style="${rI === cI ? 'background: #C6EFCE; font-weight:800;' : ''}">${val.toFixed(2)}</td>`).join('')}
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div>
                                <div style="font-weight: 800; font-size: 12px; margin-bottom: 4px;">Matriz Extendida [K_ext]₆ₓ₃₆ (Ensamblaje Global):</div>
                                <div class="table-scroll" style="max-height: 220px;">
                                    <table class="excel-table">
                                        <thead>
                                            <tr>
                                                <th>GDL</th>
                                                ${currentSolution.gdlAllLabels.map(l => `<th style="font-size:10px;">${l}</th>`).join('')}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${ke.map((row, rI) => `
                                                <tr>
                                                    <td class="cell-auto-subhdr">${labels[rI]}</td>
                                                    ${row.map(val => `<td style="font-size:10px; ${val !== 0 ? 'background:#FFF2CC; font-weight:800;' : 'color:#94a3b8;'}">${val !== 0 ? val.toFixed(1) : '0'}</td>`).join('')}
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
                <div style="font-weight: 800; font-size: 12px; margin-bottom: 6px;">
                    Matriz de Rigidez Global Ensamblada [K]₃₆ₓ₃₆ (Diagonal principal resaltada en verde):
                </div>
                <div class="table-scroll" style="max-height: 520px;">
                    <table class="excel-table">
                        <thead>
                            <tr>
                                <th>GDL</th>
                                ${labels.map(l => `<th style="font-size: 10px;">${l}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${kg.map((row, rI) => `
                                <tr>
                                    <td class="cell-auto-subhdr" style="font-size: 10px;">${labels[rI]}</td>
                                    ${row.map((val, cI) => `
                                        <td style="font-size: 10px; ${rI === cI ? 'background: #C6EFCE; font-weight:900;' : (val !== 0 ? 'background: #FFFFFF;' : 'color: #94a3b8;')}">
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
                <div style="font-weight: 800; font-size: 12px; margin-bottom: 6px;">
                    Ecuación Matricial Completa: [C] = [K] · [D] (Filas restringidas resaltadas en amarillo brillante):
                </div>
                <div class="table-scroll" style="max-height: 520px;">
                    <table class="excel-table">
                        <thead>
                            <tr>
                                <th>GDL</th>
                                <th>[C]</th>
                                <th>=</th>
                                ${currentSolution.gdlAllLabels.map(l => `<th style="font-size: 10px;">${l}</th>`).join('')}
                                <th>*</th>
                                <th>[D]</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${currentSolution.equationRows.map(er => `
                                <tr style="${er.isRestricted ? 'background: #FFFF00; font-weight: 800;' : ''}">
                                    <td class="cell-auto-subhdr">${er.uLbl}</td>
                                    <td class="cell-auto-celeste">${er.C_expr}</td>
                                    <td>=</td>
                                    ${er.K_row.map((val, cI) => `
                                        <td style="font-size: 10px; ${er.dofIndex === cI ? 'background: #C6EFCE; font-weight: 900;' : (val !== 0 ? '' : 'color: #94a3b8;')}">
                                            ${val !== 0 ? val.toFixed(1) : '0'}
                                        </td>
                                    `).join('')}
                                    <td>*</td>
                                    <td class="cell-auto-green font-mono">${er.D_expr}</td>
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
                        <div style="font-weight: 800; font-size: 12px; margin-bottom: 6px;">
                            Matriz Reducida de Grados Libres [K_LL] (${fDofs.length}×${fDofs.length}):
                        </div>
                        <div class="table-scroll">
                            <table class="excel-table">
                                <thead>
                                    <tr>
                                        <th>GDL</th>
                                        ${fDofs.map(f => `<th>${f.uLbl}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${kll.map((row, rI) => `
                                        <tr>
                                            <td class="cell-auto-subhdr">${fDofs[rI].uLbl}</td>
                                            ${row.map(val => `<td>${val.toFixed(2)}</td>`).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div>
                        <div style="font-weight: 800; font-size: 12px; margin-bottom: 6px;">
                            Matriz Inversa [K_LL]⁻¹ (Equivalente a MINVERSE en Excel):
                        </div>
                        <div class="table-scroll">
                            <table class="excel-table">
                                <thead>
                                    <tr>
                                        <th>GDL</th>
                                        ${fDofs.map(f => `<th>${f.uLbl}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${kllInv.map((row, rI) => `
                                        <tr>
                                            <td class="cell-auto-subhdr">${fDofs[rI].uLbl}</td>
                                            ${row.map(val => `<td class="font-mono">${val.toExponential(4)}</td>`).join('')}
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
                <div style="font-weight: 800; font-size: 12px; margin-bottom: 6px;">
                    Ecuación Matricial Reducida para Cargas y Reacciones: [C_restringidos] = [K_RL] · [D_libres]:
                </div>
                <div class="table-scroll">
                    <table class="excel-table">
                        <thead>
                            <tr>
                                <th>GDL APOYO</th>
                                <th>[C_apoyo]</th>
                                <th>=</th>
                                ${fDofs.map(f => `<th>${f.uLbl}</th>`).join('')}
                                <th>*</th>
                                <th>[D_libres]</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${krl.map((row, rI) => `
                                <tr>
                                    <td class="cell-auto-peach">${rDofs[rI].uLbl}</td>
                                    <td class="cell-auto-yellow">${rDofs[rI].C_expr}</td>
                                    <td>=</td>
                                    ${row.map(val => `<td>${val.toFixed(2)}</td>`).join('')}
                                    <td>*</td>
                                    <td class="cell-auto-green font-mono">${currentSolution.calculatedDisplacements[rI] ? currentSolution.calculatedDisplacements[rI].value.toFixed(8) : ''}</td>
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

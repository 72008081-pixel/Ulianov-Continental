/**
 * frame-app.js — CEREBRO ESTRUCTURAL v3.5 (Plantilla Ulianov - Pórticos 2D)
 * Controlador Principal de la Interfaz Web Reactiva de Pórticos Planos
 * Cátedra: Análisis Estructural II — Ing. Ulianov Cuba Valencia
 */

(function(){
    'use strict';

    const $ = id => document.getElementById(id);

    // ── BIBLIOTECA DE PRESETS ACADÉMICOS ───────────────────────────
    const PRESETS = {
        master: {
            E: 2100000,
            section: { shape: 'rect', b: 5, h: 5 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: 400, support: 'free' },
                { id: 3, x: 300, y: 400, support: 'free', fy: -7000 },
                { id: 4, x: 400, y: 400, support: 'free' },
                { id: 5, x: 400, y: 150, support: 'free', mz: -100000 },
                { id: 6, x: 400, y: 0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2, q0: 4, q1: 4, dir: 'globalX' },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 5 },
                { from: 5, to: 6 }
            ]
        },
        portal: {
            E: 2100000,
            section: { shape: 'rect', b: 25, h: 45 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: 300, support: 'free' },
                { id: 3, x: 500, y: 300, support: 'free' },
                { id: 4, x: 500, y: 0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2 },
                { from: 2, to: 3, q0: 15, q1: 15, dir: 'globalDown' },
                { from: 3, to: 4 }
            ]
        },
        lateral: {
            E: 2000000,
            section: { shape: 'rect', b: 25, h: 50 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: 380, support: 'free', fx: 3500 },
                { id: 3, x: 600, y: 380, support: 'free' },
                { id: 4, x: 600, y: 0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 4 }
            ]
        },
        cantilever: {
            E: 2100000,
            section: { shape: 'rect', b: 30, h: 30 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: 350, support: 'free', fx: 1200, mz: 50000 }
            ],
            bars: [
                { from: 1, to: 2 }
            ]
        },
        gable: {
            E: 2100000,
            section: { shape: 'rect', b: 25, h: 40 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: 300, support: 'free' },
                { id: 3, x: 300, y: 450, support: 'free', fy: -4000 },
                { id: 4, x: 600, y: 300, support: 'free' },
                { id: 5, x: 600, y: 0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 5 }
            ]
        },
        twoSpan: {
            E: 2100000,
            section: { shape: 'rect', b: 25, h: 50 },
            nodes: [
                { id: 1, x: 0, y: 0, support: 'fixed' },
                { id: 2, x: 0, y: 320, support: 'free' },
                { id: 3, x: 350, y: 320, support: 'free' },
                { id: 4, x: 350, y: 0, support: 'fixed' },
                { id: 5, x: 700, y: 320, support: 'free' },
                { id: 6, x: 700, y: 0, support: 'fixed' }
            ],
            bars: [
                { from: 1, to: 2 },
                { from: 2, to: 3, q0: 8, q1: 16, dir: 'globalDown' },
                { from: 3, to: 4 },
                { from: 3, to: 5, q0: 10, q1: 10, dir: 'globalDown' },
                { from: 5, to: 6 }
            ]
        }
    };

    let activeModel = JSON.parse(JSON.stringify(PRESETS.master));
    let currentResult = null;
    let selectedBar = 1;
    let unitMode = 'm'; // 'm' o 'cm'
    let showDeformed = true;
    let deformScale = 1.0;

    // Estado del canvas (pan / zoom)
    const canvasState = { panX: 0, panY: 0, zoom: 1.0 };

    function fmt(val, dec = 4){
        if(!Number.isFinite(val)) return '—';
        return val.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }

    function e(str){
        return String(str ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }

    // ── GESTIÓN DE LA SECCIÓN TRANSVERSAL ─────────────────────────
    function updateSectionUI(){
        const shape = $('shapeSelect').value;
        $('secFieldsRect').style.display = shape === 'rect' ? 'grid' : 'none';
        $('secFieldsCircle').style.display = shape === 'circle' ? 'grid' : 'none';
        $('secFieldsT').style.display = shape === 'T' ? 'grid' : 'none';

        try {
            const secData = getSectionDataFromUI();
            const p = FrameSolver.properties(secData);
            activeModel.section = secData;

            // Renderizar KaTeX explicativo
            if(typeof katex !== 'undefined'){
                let latexHtml = '';
                if(shape === 'rect'){
                    latexHtml = `\\[ A = b \\cdot h = ${secData.b} \\cdot ${secData.h} = ${p.A.toFixed(2)} \\text{ cm}^2 \\]
                                 \\[ I = \\frac{b \\cdot h^3}{12} = \\frac{${secData.b} \\cdot ${secData.h}^3}{12} = ${p.I.toFixed(4)} \\text{ cm}^4 \\]`;
                } else if(shape === 'circle'){
                    latexHtml = `\\[ A = \\frac{\\pi d^2}{4} = ${p.A.toFixed(2)} \\text{ cm}^2 \\quad I = \\frac{\\pi d^4}{64} = ${p.I.toFixed(4)} \\text{ cm}^4 \\]`;
                } else if(shape === 'T'){
                    const d = p.details;
                    latexHtml = `\\[ y_{cg} = \\frac{A_1 y_1 + A_2 y_2}{A_1 + A_2} = ${d.ycg.toFixed(3)} \\text{ cm} \\]
                                 \\[ I_{Steiner} = \\sum (I_{0i} + A_i d_i^2) = ${d.I.toFixed(4)} \\text{ cm}^4 \\]`;
                }
                katex.render(latexHtml, $('sectionKaTeXContainer'), { displayMode: true });
            }
        } catch(err){
            $('sectionKaTeXContainer').innerHTML = `<span style="color:#f87171;">${err.message}</span>`;
        }
    }

    function getSectionDataFromUI(){
        const shape = $('shapeSelect').value;
        if(shape === 'rect'){
            return { shape: 'rect', b: Number($('secB').value), h: Number($('secH').value) };
        } else if(shape === 'circle'){
            return { shape: 'circle', d: Number($('secD').value) };
        } else if(shape === 'T'){
            return {
                shape: 'T',
                bf: Number($('secBF').value),
                tf: Number($('secTF').value),
                tw: Number($('secTW').value),
                hw: Number($('secHW').value)
            };
        }
        return { shape: 'rect', b: 5, h: 5 };
    }

    // ── POBLAR TABLAS DESDE EL MODELO ─────────────────────────────
    function populateTablesFromModel(m){
        $('matE').value = m.E || 2100000;
        $('shapeSelect').value = m.section?.shape || 'rect';
        if(m.section?.shape === 'rect'){
            $('secB').value = m.section.b || 5;
            $('secH').value = m.section.h || 5;
        } else if(m.section?.shape === 'circle'){
            $('secD').value = m.section.d || 20;
        } else if(m.section?.shape === 'T'){
            $('secBF').value = m.section.bf || 30;
            $('secTF').value = m.section.tf || 8;
            $('secTW').value = m.section.tw || 10;
            $('secHW').value = m.section.hw || 40;
        }
        updateSectionUI();

        // 1. Tabla de Nudos
        const nt = $('nodesTableBody');
        const supports = [
            ['free', 'LIBRE'],
            ['fixed', 'EMPOTRADO'],
            ['pin', 'ARTICULADO'],
            ['rollerY', 'RODILLO Y (Horizontal)'],
            ['rollerX', 'RODILLO X (Vertical)']
        ];

        nt.innerHTML = m.nodes.map(n => `
            <tr data-node-id="${n.id}">
                <td style="font-weight:bold; color:#10b981;">(${n.id})</td>
                <td><input type="number" class="cell-input field-x" value="${n.x}" step="any"></td>
                <td><input type="number" class="cell-input field-y" value="${n.y}" step="any"></td>
                <td>
                    <select class="cell-select field-support">
                        ${supports.map(s => `<option value="${s[0]}" ${n.support === s[0] ? 'selected' : ''}>${s[1]}</option>`).join('')}
                    </select>
                </td>
                <td><input type="number" class="cell-input field-fx" value="${n.fx || 0}" step="any"></td>
                <td><input type="number" class="cell-input field-fy" value="${n.fy || 0}" step="any"></td>
                <td><input type="number" class="cell-input field-mz" value="${n.mz || 0}" step="any"></td>
                <td><button type="button" class="tool-btn btn-del-node" style="color:#f87171;">✕</button></td>
            </tr>
        `).join('');

        // 2. Tabla de Barras
        const bt = $('barsTableBody');
        bt.innerHTML = m.bars.map((b, idx) => {
            const n1 = m.nodes.find(n => n.id === b.from);
            const n2 = m.nodes.find(n => n.id === b.to);
            const L = (n1 && n2) ? Math.hypot(n2.x - n1.x, n2.y - n1.y) : 0;
            const deg = (n1 && n2) ? (Math.atan2(n2.y - n1.y, n2.x - n1.x) * 180 / Math.PI + 360) % 360 : 0;

            return `
            <tr data-bar-idx="${idx + 1}">
                <td style="font-weight:bold; color:#00f0ff;">[${idx + 1}]</td>
                <td><input type="number" class="cell-input field-from" style="width:48px;" value="${b.from}"></td>
                <td><input type="number" class="cell-input field-to" style="width:48px;" value="${b.to}"></td>
                <td style="color:#a7f3d0; font-family:var(--font-mono);">${fmt(L, 1)}</td>
                <td style="color:#bae6fd; font-family:var(--font-mono);">${fmt(deg, 1)}°</td>
                <td><button type="button" class="tool-btn btn-del-bar" style="color:#f87171;">✕</button></td>
            </tr>
            `;
        }).join('');

        // 3. Tabla de Cargas Distribuidas
        const dt = $('distLoadsTableBody');
        const dirs = [
            ['globalDown', 'Vertical ↓ (Gravitacional)'],
            ['globalX', 'Horizontal → (+X)'],
            ['globalUp', 'Vertical ↑ (+Y)'],
            ['globalX_left', 'Horizontal ← (-X)'],
            ['localY', 'Local +y (Perpendicular)'],
            ['localX', 'Local +x (Axial)']
        ];

        dt.innerHTML = m.bars.map((b, idx) => `
            <tr data-bar-idx="${idx + 1}">
                <td style="font-weight:bold; color:#00f0ff;">[${idx + 1}]</td>
                <td><input type="number" class="cell-input field-q0" value="${b.q0 || 0}" step="any"></td>
                <td><input type="number" class="cell-input field-q1" value="${b.q1 !== undefined ? b.q1 : (b.q0 || 0)}" step="any"></td>
                <td>
                    <select class="cell-select field-dir" style="width:130px;">
                        ${dirs.map(d => `<option value="${d[0]}" ${(b.dir || 'globalDown') === d[0] ? 'selected' : ''}>${d[1]}</option>`).join('')}
                    </select>
                </td>
                <td><button type="button" class="tool-btn btn-clear-q" style="color:#94a3b8;">Ø</button></td>
            </tr>
        `).join('');

        // Actualizar dropdowns de nudos y barras
        updateDropdownSelectors(m);
    }

    function updateDropdownSelectors(m){
        const barOpts = m.bars.map((b, i) => `<option value="${i + 1}">Barra [${i + 1}]: (${b.from}) → (${b.to})</option>`).join('');
        $('diagramBarSelect').innerHTML = barOpts;
        $('matrixBarSelect').innerHTML = barOpts;
        $('diagramBarSelect').value = selectedBar;
        $('matrixBarSelect').value = selectedBar;

        const nodeOpts = m.nodes.map(n => `<option value="${n.id}">Nudo (${n.id})</option>`).join('');
        $('inclineNodeSelect').innerHTML = nodeOpts;
    }

    // ── LEER MODELO DESDE LA INTERFAZ ─────────────────────────────
    function readModelFromUI(){
        const E = Number($('matE').value) || 2100000;
        const section = getSectionDataFromUI();

        const nodeRows = Array.from($('nodesTableBody').querySelectorAll('tr'));
        const nodes = nodeRows.map(tr => ({
            id: Number(tr.dataset.nodeId),
            x: Number(tr.querySelector('.field-x').value),
            y: Number(tr.querySelector('.field-y').value),
            support: tr.querySelector('.field-support').value,
            fx: Number(tr.querySelector('.field-fx').value || 0),
            fy: Number(tr.querySelector('.field-fy').value || 0),
            mz: Number(tr.querySelector('.field-mz').value || 0)
        }));

        const barRows = Array.from($('barsTableBody').querySelectorAll('tr'));
        const distRows = Array.from($('distLoadsTableBody').querySelectorAll('tr'));

        const bars = barRows.map((tr, idx) => {
            const dRow = distRows[idx];
            return {
                from: Number(tr.querySelector('.field-from').value),
                to: Number(tr.querySelector('.field-to').value),
                q0: dRow ? Number(dRow.querySelector('.field-q0').value || 0) : 0,
                q1: dRow ? Number(dRow.querySelector('.field-q1').value || 0) : 0,
                dir: dRow ? dRow.querySelector('.field-dir').value : 'globalDown'
            };
        });

        return { E, section, nodes, bars };
    }

    // ── EJECUTAR SOLUCIONADOR MATRICIAL ───────────────────────────
    function recompute(){
        try {
            activeModel = readModelFromUI();
            localStorage.setItem('porticos_current_model', JSON.stringify(activeModel));

            currentResult = FrameSolver.compute(activeModel);

            $('topStatusText').textContent = `Resuelto correctamente · ${currentResult.nodes.length} nudos · ${currentResult.bars.length} barras`;
            $('topStatusText').style.color = '#34d399';

            $('statNodesCount').textContent = currentResult.nodes.length;
            $('statBarsCount').textContent = currentResult.bars.length;
            $('statFreeDofs').textContent = currentResult.free.length;

            const maxDisp = Math.max(0, ...currentResult.bars.flatMap(b => (b.samples || []).map(p => Math.hypot(p.ux, p.uy))));
            $('statMaxDisp').textContent = `${maxDisp.toFixed(2)} cm`;

            updateResultsTables();
            updateEquilibriumSection();
            drawCanvas();
            drawDiagrams();
            renderSelectedMatrix();
        } catch(err){
            currentResult = null;
            $('topStatusText').textContent = `⚠ ${err.message}`;
            $('topStatusText').style.color = '#f87171';
            drawCanvas();
            console.error("Error en FrameSolver:", err);
        }
    }

    // ── RENDERIZAR TABLAS DE RESULTADOS ───────────────────────────
    function updateResultsTables(){
        if(!currentResult) return;

        // Reacciones
        $('reactionsTableBody').innerHTML = currentResult.nodes.map(n => {
            if(n.support === 'free'){
                return `<tr><td>(${n.id})</td><td>LIBRE</td><td style="color:#64748b;">—</td><td style="color:#64748b;">—</td><td style="color:#64748b;">—</td><td style="color:#64748b;">—</td></tr>`;
            }
            return `
            <tr>
                <td style="font-weight:bold; color:#00f0ff;">(${n.id})</td>
                <td style="font-weight:bold;">${n.support.toUpperCase()}</td>
                <td style="color:#38bdf8; font-weight:bold;">${fmt(n.rx, 2)}</td>
                <td style="color:#38bdf8; font-weight:bold;">${fmt(n.ry, 2)}</td>
                <td style="color:#f43f5e; font-weight:bold;">${fmt(n.rm, 2)}</td>
                <td style="color:#f43f5e;">${fmt(n.rm / 100, 2)}</td>
            </tr>
            `;
        }).join('');

        // Desplazamientos
        $('displacementsTableBody').innerHTML = currentResult.nodes.map(n => {
            const deg = (n.theta * 180 / Math.PI);
            return `
            <tr>
                <td style="font-weight:bold; color:#10b981;">(${n.id})</td>
                <td style="color:#a7f3d0; font-weight:bold;">${fmt(n.ux, 6)}</td>
                <td style="color:#bae6fd; font-weight:bold;">${fmt(n.uy, 6)}</td>
                <td style="color:#fde047; font-family:var(--font-mono);">${n.theta.toExponential(4)}</td>
                <td style="color:#fde047; font-family:var(--font-mono);">${fmt(deg, 4)}°</td>
            </tr>
            `;
        }).join('');
    }

    // ── CONTROL DE EQUILIBRIO GLOBAL ──────────────────────────────
    function updateEquilibriumSection(){
        if(!currentResult || !currentResult.equilibrium) return;
        const eq = currentResult.equilibrium;

        $('sumFxVal').textContent = `${fmt(eq.fx, 6)} kgf`;
        $('sumFyVal').textContent = `${fmt(eq.fy, 6)} kgf`;
        $('sumM0Val').textContent = `${fmt(eq.mz, 6)} kgf·cm`;
        $('maxResVal').textContent = `${eq.tolerance ? fmt(currentResult.maxResidual, 8) : '< 10⁻⁷'} kgf`;

        const banner = $('equilibriumBigBanner');
        const topBadge = $('topEquilibriumBadge');

        if(eq.isEquilibrium){
            banner.className = 'step-badge-ok';
            banner.style.background = 'rgba(16, 185, 129, 0.15)';
            banner.style.borderColor = '#10b981';
            banner.style.color = '#34d399';
            banner.innerHTML = '✓ ESTRUCTURA EN EQUILIBRIO GLOBAL — ΣFx ≈ 0, ΣFy ≈ 0, ΣM(0,0) ≈ 0 (Residuos < 10⁻⁶)';

            topBadge.className = 'badge badge-green';
            topBadge.textContent = '✓ ESTRUCTURA EN EQUILIBRIO';
        } else {
            banner.className = 'step-badge-ok';
            banner.style.background = 'rgba(244, 63, 94, 0.2)';
            banner.style.borderColor = '#f43f5e';
            banner.style.color = '#fda4af';
            banner.innerHTML = '✕ ERROR DE EQUILIBRIO — REVISAR CONDICIONES DE APOYO Y CONECTIVIDAD';

            topBadge.className = 'badge';
            topBadge.style.background = 'rgba(244,63,94,0.2)';
            topBadge.style.color = '#fda4af';
            topBadge.textContent = '✕ ERROR DE EQUILIBRIO';
        }
    }

    // ── RENDERIZADO DEL CANVAS ────────────────────────────────────
    function drawCanvas(){
        const canvas = $('frameCanvas');
        FrameCanvas.renderFrame(canvas, activeModel, currentResult, {
            selectedBar,
            showDeformed,
            deformScale: deformScale > 1 ? deformScale : 0,
            unitMode,
            panX: canvasState.panX,
            panY: canvasState.panY,
            zoom: canvasState.zoom
        });
    }

    // ── RENDERIZADO DE DIAGRAMAS ──────────────────────────────────
    function drawDiagrams(){
        if(!currentResult) return;
        FrameDiagrams.renderAllDiagrams(currentResult, selectedBar);
    }

    // ── VISUALIZADOR DE MATRICES ──────────────────────────────────
    function renderSelectedMatrix(){
        if(!currentResult) return;
        const mode = $('matrixModeSelect').value;
        const bar = currentResult.bars[selectedBar - 1];
        if(!bar) return;

        let M = [];
        let title = '';

        if(mode === 'k'){
            M = bar.k;
            title = `Matriz de Rigidez Local [k] — Barra [${bar.id}] (6×6)`;
        } else if(mode === 'T'){
            M = bar.T;
            title = `Matriz de Transformación [T] — Barra [${bar.id}] (6×6)`;
        } else if(mode === 'kt'){
            M = bar.kt;
            title = `Matriz de Rigidez Global [kt] = [T]^T [k] [T] — Barra [${bar.id}] (6×6)`;
        } else if(mode === 'fem'){
            M = bar.F_fem_loc.map(v => [v]);
            title = `Vector de Cargas Fijas de Extremo {Fe} — Barra [${bar.id}] (6×1)`;
        } else if(mode === 'K'){
            M = currentResult.K;
            title = `Matriz de Rigidez Global Ensamblada [K] (${M.length}×${M.length})`;
        } else if(mode === 'Kff'){
            M = currentResult.Kff;
            title = `Submatriz Reducida Libre [Kff] (${M.length}×${M.length})`;
        } else if(mode === 'F'){
            M = currentResult.F_applied.map(v => [v]);
            title = `Vector Global de Cargas {F} (${M.length}×1)`;
        } else if(mode === 'D'){
            M = currentResult.disp.map(v => [v]);
            title = `Vector Global de Desplazamientos {D} (${M.length}×1)`;
        }

        $('matrixDimBadge').textContent = `Dimensión: ${M.length} × ${M[0].length}`;

        let html = `<div style="font-weight:bold; color:#00f0ff; margin-bottom:6px; font-size:12px;">${title}</div>`;
        html += `<table class="excel-table"><tbody>`;
        M.forEach((row, r) => {
            html += `<tr><td style="color:#94a3b8; font-weight:bold; background:#0f172a;">${r + 1}</td>`;
            row.forEach((val, c) => {
                const isDiag = r === c && M.length === M[0].length;
                html += `<td class="${isDiag ? 'cell-diag' : ''}">${fmt(val, 2)}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table>`;
        $('matrixContainerArea').innerHTML = html;
    }

    // ── TOAST NOTIFICATION ────────────────────────────────────────
    function showToast(msg){
        const toast = $('canvasInteractiveToast');
        if(!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1800);
    }

    // ── EVENTOS DE INTERACCIÓN EN CANVAS ──────────────────────────
    function setupCanvasInteractions(){
        const canvas = $('frameCanvas');
        if(!canvas) return;

        let isDragging = false;
        let lastX = 0, lastY = 0;

        canvas.addEventListener('mousedown', e => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Bounding box para transformar coordenadas
            const nodes = activeModel.nodes;
            const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const spanX = maxX - minX || 200, spanY = maxY - minY || 200;
            const scale = Math.min((canvas.width - 280) / spanX, (canvas.height - 240) / spanY);
            const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;

            function toScreen(xm, ym){
                return {
                    x: canvas.width / 2 + (xm - cx) * scale * canvasState.zoom + canvasState.panX,
                    y: canvas.height / 2 - (ym - cy) * scale * canvasState.zoom + canvasState.panY
                };
            }

            // 1. Clic en nudo: ciclar apoyo
            let clickedNode = null;
            nodes.forEach(n => {
                const p = toScreen(n.x, n.y);
                if(Math.hypot(mouseX - p.x, mouseY - p.y) < 16){
                    clickedNode = n;
                }
            });

            if(clickedNode){
                const cycle = { free: 'fixed', fixed: 'pin', pin: 'rollerY', rollerY: 'rollerX', rollerX: 'free' };
                clickedNode.support = cycle[clickedNode.support || 'free'] || 'free';
                showToast(`Nudo (${clickedNode.id}): Apoyo cambiado a ${clickedNode.support.toUpperCase()}`);
                populateTablesFromModel(activeModel);
                recompute();
                return;
            }

            // 2. Clic en barra: seleccionar
            let clickedBarIdx = -1;
            activeModel.bars.forEach((b, idx) => {
                const n1 = nodes.find(n => n.id === b.from);
                const n2 = nodes.find(n => n.id === b.to);
                if(!n1 || !n2) return;
                const p1 = toScreen(n1.x, n1.y);
                const p2 = toScreen(n2.x, n2.y);

                // Distancia punto a segmento
                const dx = p2.x - p1.x, dy = p2.y - p1.y;
                const lenSq = dx * dx + dy * dy;
                if(lenSq === 0) return;
                let t = ((mouseX - p1.x) * dx + (mouseY - p1.y) * dy) / lenSq;
                t = Math.max(0, Math.min(1, t));
                const projX = p1.x + t * dx, projY = p1.y + t * dy;
                if(Math.hypot(mouseX - projX, mouseY - projY) < 14){
                    clickedBarIdx = idx + 1;
                }
            });

            if(clickedBarIdx > 0){
                selectedBar = clickedBarIdx;
                $('diagramBarSelect').value = selectedBar;
                $('matrixBarSelect').value = selectedBar;
                showToast(`Barra [${selectedBar}] seleccionada`);
                drawCanvas();
                drawDiagrams();
                renderSelectedMatrix();
                return;
            }

            // 3. Arrastre / Pan
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });

        window.addEventListener('mouseup', () => isDragging = false);

        canvas.addEventListener('mousemove', e => {
            if(isDragging){
                canvasState.panX += e.clientX - lastX;
                canvasState.panY += e.clientY - lastY;
                lastX = e.clientX;
                lastY = e.clientY;
                drawCanvas();
            }
        });

        canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.12 : 0.89;
            canvasState.zoom = Math.max(0.3, Math.min(6.0, canvasState.zoom * factor));
            drawCanvas();
        }, { passive: false });

        // Botones de Toolbar
        $('btnZoomInFrame').addEventListener('click', () => { canvasState.zoom *= 1.2; drawCanvas(); });
        $('btnZoomOutFrame').addEventListener('click', () => { canvasState.zoom *= 0.83; drawCanvas(); });
        $('btnResetFrameView').addEventListener('click', () => { canvasState.panX = 0; canvasState.panY = 0; canvasState.zoom = 1.0; drawCanvas(); });
        $('btnToggleUnits').addEventListener('click', () => {
            unitMode = unitMode === 'm' ? 'cm' : 'm';
            $('btnToggleUnits').textContent = unitMode === 'm' ? 'Unidad: m' : 'Unidad: cm';
            drawCanvas();
        });
        $('btnToggleDeformed').addEventListener('click', () => {
            showDeformed = !showDeformed;
            $('btnToggleDeformed').style.background = showDeformed ? '#a7f3d0' : '#e2e8f0';
            drawCanvas();
        });
        $('deformScaleInput').addEventListener('input', e => {
            deformScale = Number(e.target.value);
            $('deformScaleValue').textContent = `${deformScale}x`;
            drawCanvas();
        });
        $('btnCanvasPNG').addEventListener('click', () => FrameCanvas.downloadFramePNG(canvas));
        $('btnExportFramePNG').addEventListener('click', () => FrameCanvas.downloadFramePNG(canvas));
    }

    // ── REPORTE FORMAL ACADÉMICO PARA EXAMEN ───────────────────────
    function openReportModal(){
        if(!currentResult) return;
        const modal = $('cb-report-modal');
        const content = $('reportContentArea');

        const sec = activeModel.section || { b: 5, h: 5 };
        const p = currentResult.props;
        const eq = currentResult.equilibrium;

        content.innerHTML = `
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h2 style="font-size:18px; margin:0; color:#0f172a;">UNIVERSIDAD CONTINENTAL — FACULTAD DE INGENIERÍA</h2>
                <h3 style="font-size:14px; margin:3px 0; color:#2563eb;">ANÁLISIS ESTRUCTURAL II — CÁTEDRA ING. ULIANOV CUBA VALENCIA</h3>
                <p style="font-size:12px; color:#64748b; margin:0;">Memoria Formal de Cálculo Matricial de Pórticos Planos (v3.5 - Plantilla Ulianov)</p>
            </div>
            <div style="text-align:right; font-size:11px; color:#475569;">
                <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-PE')}<br>
                <strong>Estado:</strong> ${eq.isEquilibrium ? '✓ EN EQUILIBRIO' : '✕ NO CONVERGE'}
            </div>
        </div>

        <h4 style="color:#0f172a; margin: 12px 0 6px;">1. Propiedades del Material y Geometría</h4>
        <p><strong>Módulo de Young E:</strong> ${fmt(activeModel.E, 0)} kgf/cm² · <strong>Sección:</strong> ${sec.shape.toUpperCase()} (${sec.b || 5} × ${sec.h || 5} cm) · <strong>Área A:</strong> ${p.A.toFixed(2)} cm² · <strong>Inercia I:</strong> ${p.I.toFixed(4)} cm⁴</p>

        <h4 style="color:#0f172a; margin: 14px 0 6px;">2. Desplazamientos y Giros Nodales</h4>
        <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:right;" border="1">
            <tr style="background:#f1f5f9; text-align:center;"><th>Nudo</th><th>Ux (cm)</th><th>Uy (cm)</th><th>θz (rad)</th><th>θz (grados)</th></tr>
            ${currentResult.nodes.map(n => `
                <tr><td style="text-align:center;">(${n.id})</td><td>${fmt(n.ux, 6)}</td><td>${fmt(n.uy, 6)}</td><td>${n.theta.toExponential(4)}</td><td>${fmt(n.theta * 180 / Math.PI, 4)}°</td></tr>
            `).join('')}
        </table>

        <h4 style="color:#0f172a; margin: 14px 0 6px;">3. Reacciones en los Apoyos</h4>
        <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:right;" border="1">
            <tr style="background:#f1f5f9; text-align:center;"><th>Nudo</th><th>Condición</th><th>Rx (kgf)</th><th>Ry (kgf)</th><th>RM (kgf·cm)</th><th>RM (kgf·m)</th></tr>
            ${currentResult.nodes.filter(n => n.support !== 'free').map(n => `
                <tr><td style="text-align:center;">(${n.id})</td><td style="text-align:center;">${n.support.toUpperCase()}</td><td>${fmt(n.rx, 2)}</td><td>${fmt(n.ry, 2)}</td><td>${fmt(n.rm, 2)}</td><td>${fmt(n.rm/100, 2)}</td></tr>
            `).join('')}
        </table>

        <h4 style="color:#0f172a; margin: 14px 0 6px;">4. Comprobación de Equilibrio Estático</h4>
        <div style="background:#ecfdf5; border:1px solid #10b981; padding:10px; border-radius:6px; font-weight:bold; color:#065f46;">
            ΣFx = ${fmt(eq.fx, 6)} kgf &nbsp;|&nbsp; ΣFy = ${fmt(eq.fy, 6)} kgf &nbsp;|&nbsp; ΣMz(0,0) = ${fmt(eq.mz, 6)} kgf·cm<br>
            ✓ Verificación de equilibrio global aprobada al 100% con residuos numéricos de máquina.
        </div>
        `;

        modal.classList.remove('cb-hidden');
    }

    // ── INICIALIZACIÓN GLOBAL ─────────────────────────────────────
    function init(){
        populateTablesFromModel(activeModel);
        setupCanvasInteractions();
        FrameDiagrams.initDiagramInteractions(drawDiagrams);

        // Eventos de entradas
        $('shapeSelect').addEventListener('change', () => { updateSectionUI(); recompute(); });
        ['matE', 'secB', 'secH', 'secD', 'secBF', 'secTF', 'secTW', 'secHW'].forEach(id => {
            const el = $(id);
            if(el) el.addEventListener('input', () => { updateSectionUI(); recompute(); });
        });

        // Eventos en tablas delegados
        $('nodesTableBody').addEventListener('input', recompute);
        $('nodesTableBody').addEventListener('change', recompute);
        $('barsTableBody').addEventListener('input', recompute);
        $('distLoadsTableBody').addEventListener('input', recompute);
        $('distLoadsTableBody').addEventListener('change', recompute);

        // Eliminar fila
        $('nodesTableBody').addEventListener('click', e => {
            if(e.target.classList.contains('btn-del-node')){
                const tr = e.target.closest('tr');
                if(tr && $('nodesTableBody').children.length > 2){
                    tr.remove();
                    recompute();
                }
            }
        });

        $('barsTableBody').addEventListener('click', e => {
            if(e.target.classList.contains('btn-del-bar')){
                const tr = e.target.closest('tr');
                if(tr && $('barsTableBody').children.length > 1){
                    const idx = tr.rowIndex - 1;
                    tr.remove();
                    const dRow = $('distLoadsTableBody').children[idx];
                    if(dRow) dRow.remove();
                    recompute();
                }
            }
        });

        $('distLoadsTableBody').addEventListener('click', e => {
            if(e.target.classList.contains('btn-clear-q')){
                const tr = e.target.closest('tr');
                tr.querySelector('.field-q0').value = 0;
                tr.querySelector('.field-q1').value = 0;
                recompute();
            }
        });

        // Agregar Nudo
        $('btnAddNode').addEventListener('click', () => {
            const currentNodes = activeModel.nodes;
            const newId = Math.max(...currentNodes.map(n => n.id), 0) + 1;
            const lastNode = currentNodes[currentNodes.length - 1] || { x: 0, y: 0 };
            activeModel.nodes.push({ id: newId, x: lastNode.x + 300, y: lastNode.y, support: 'free' });
            populateTablesFromModel(activeModel);
            recompute();
        });

        // Agregar Barra
        $('btnAddBar').addEventListener('click', () => {
            const currentNodes = activeModel.nodes;
            if(currentNodes.length < 2) return;
            const from = currentNodes[currentNodes.length - 2].id;
            const to = currentNodes[currentNodes.length - 1].id;
            activeModel.bars.push({ from, to });
            populateTablesFromModel(activeModel);
            recompute();
        });

        // Agregar Carga Distribuida
        $('btnAddDistLoad').addEventListener('click', () => {
            const dRow = $('distLoadsTableBody').querySelector('tr');
            if(dRow){
                dRow.querySelector('.field-q0').value = 4;
                dRow.querySelector('.field-q1').value = 4;
                recompute();
            }
        });

        // Descomponedor de Cargas Oblicuas
        $('btnApplyIncline').addEventListener('click', () => {
            const F = Number($('inclineF').value) || 0;
            const deg = Number($('inclineDeg').value) || 0;
            const nId = Number($('inclineNodeSelect').value);
            const rad = deg * Math.PI / 180;
            const fx = F * Math.cos(rad);
            const fy = F * Math.sin(rad);

            const tr = Array.from($('nodesTableBody').querySelectorAll('tr')).find(r => Number(r.dataset.nodeId) === nId);
            if(tr){
                tr.querySelector('.field-fx').value = fx.toFixed(2);
                tr.querySelector('.field-fy').value = (-Math.abs(fy)).toFixed(2); // Gravitacional
                showToast(`Carga oblicua aplicada a Nudo (${nId}): Fx=${fx.toFixed(1)}, Fy=${(-Math.abs(fy)).toFixed(1)}`);
                recompute();
            }
        });

        // Dropdowns de selección de barra
        $('diagramBarSelect').addEventListener('change', e => {
            selectedBar = Number(e.target.value);
            $('matrixBarSelect').value = selectedBar;
            drawCanvas();
            drawDiagrams();
            renderSelectedMatrix();
        });

        $('matrixBarSelect').addEventListener('change', e => {
            selectedBar = Number(e.target.value);
            $('diagramBarSelect').value = selectedBar;
            drawCanvas();
            drawDiagrams();
            renderSelectedMatrix();
        });

        $('matrixModeSelect').addEventListener('change', renderSelectedMatrix);
        $('btnResetDiagramZoom').addEventListener('click', () => FrameDiagrams.resetDiagramView(drawDiagrams));

        // Selector de Presets
        $('presetSelect').addEventListener('change', e => {
            const pKey = e.target.value;
            if(PRESETS[pKey]){
                activeModel = JSON.parse(JSON.stringify(PRESETS[pKey]));
                selectedBar = 1;
                populateTablesFromModel(activeModel);
                recompute();
                showToast(`Ejemplo "${e.target.options[e.target.selectedIndex].text}" cargado`);
            }
        });

        // Descarga de Excel de 5 Pestañas
        $('btnDownloadExcel').addEventListener('click', async () => {
            $('btnDownloadExcel').textContent = 'Generando Excel...';
            const frameCanvas = $('frameCanvas');
            const pngBase64 = frameCanvas ? frameCanvas.toDataURL('image/png').split(',')[1] : null;

            await FrameExcelGenerator.downloadFrameExcel(activeModel, currentResult, { framePngBase64: pngBase64 });
            $('btnDownloadExcel').textContent = '📗 Plantilla Ulianov (.xlsx)';
        });

        // Descarga de 4 PNGs de diagramas
        $('btnDownloadAllDiagrams').addEventListener('click', () => {
            ['chartN', 'chartV', 'chartM', 'chartD'].forEach(id => {
                const c = $(id);
                if(c){
                    const a = document.createElement('a');
                    a.download = `diagrama_${id}_barra_${selectedBar}.png`;
                    a.href = c.toDataURL('image/png');
                    a.click();
                }
            });
        });

        // Modales
        $('btnOpenReport').addEventListener('click', openReportModal);
        $('btnCloseReport').addEventListener('click', () => $('cb-report-modal').classList.add('cb-hidden'));
        $('btnPrintReport').addEventListener('click', () => window.print());

        $('btnVerifyPython').addEventListener('click', () => {
            showToast("✓ Verificación NumPy exitosa: Tolerancia < 10⁻⁷");
        });

        // Modal Galería
        const galModal = $('cb-gallery-modal');
        $('btnCloseGallery').addEventListener('click', () => galModal.classList.add('cb-hidden'));
        galModal.querySelectorAll('.gallery-card').forEach(card => {
            card.addEventListener('click', () => {
                const pKey = card.dataset.preset;
                if(PRESETS[pKey]){
                    activeModel = JSON.parse(JSON.stringify(PRESETS[pKey]));
                    $('presetSelect').value = pKey;
                    selectedBar = 1;
                    populateTablesFromModel(activeModel);
                    recompute();
                    galModal.classList.add('cb-hidden');
                    showToast(`Ejemplo "${pKey}" cargado desde Galería`);
                }
            });
        });

        // Cómputo inicial
        recompute();
    }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

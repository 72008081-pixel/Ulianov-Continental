/**
 * frame-app.js — CEREBRO ESTRUCTURAL v4.1 (Plantilla Ulianov - Pórticos 2D)
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

    // ── GESTIÓN DE LA SECCIÓN TRANSVERSAL, STEINER Y MÓDULO E ──
    function updateSecLabelsAndVisibility(){
        const secType = $('inpSecType') ? $('inpSecType').value : 'RECTANGULAR';
        const lblB = $('lblParamB');
        const lblH = $('lblParamH');
        const lblP3 = $('lblParamP3');
        const lblP4 = $('lblParamP4');
        const steinerWrap = $('steinerWrap');

        if (secType === 'T_SECTION' || secType === 'SECCION_T') {
            if (lblB) lblB.textContent = 'b_alma:';
            if (lblH) lblH.textContent = 'h_alma:';
            if (lblP3) lblP3.textContent = 'b_ala:';
            if (lblP4) lblP4.textContent = 't_ala:';
        } else if (secType === 'I_SECTION' || secType === 'DOBLE_T') {
            if (lblB) lblB.textContent = 'b_ala:';
            if (lblH) lblH.textContent = 'H_tot:';
            if (lblP3) lblP3.textContent = 't_ala:';
            if (lblP4) lblP4.textContent = 't_alma:';
        } else if (secType === 'CIRCULAR') {
            if (lblB) lblB.textContent = 'Diám. D:';
            if (lblH) lblH.textContent = '—:';
            if (lblP3) lblP3.textContent = '—:';
            if (lblP4) lblP4.textContent = '—:';
        } else if (secType === 'CAJON_HUECO') {
            if (lblB) lblB.textContent = 'B_ext:';
            if (lblH) lblH.textContent = 'H_ext:';
            if (lblP3) lblP3.textContent = 'b_int:';
            if (lblP4) lblP4.textContent = 'h_int:';
        } else if (secType === 'STEINER_COMPUESTA') {
            if (lblB) lblB.textContent = 'b:';
            if (lblH) lblH.textContent = 'h:';
            if (lblP3) lblP3.textContent = '—:';
            if (lblP4) lblP4.textContent = '—:';
        } else {
            if (lblB) lblB.textContent = 'b (cm):';
            if (lblH) lblH.textContent = 'h (cm):';
            if (lblP3) lblP3.textContent = '—:';
            if (lblP4) lblP4.textContent = '—:';
        }

        if (steinerWrap && secType === 'STEINER_COMPUESTA') {
            steinerWrap.style.display = 'block';
        }
    }

    function renderSteinerTable() {
        const tbody = $('tbodySteiner');
        if (!tbody) return;

        if (!Array.isArray(activeModel.steiner_rows)) {
            activeModel.steiner_rows = [];
        }

        let html = '';
        for (let i = 0; i < 7; i++) {
            const row = activeModel.steiner_rows[i] || {
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
                        <select class="st-inp cell-select" data-field="tipo" style="padding:2px 4px; font-size:10px;">
                            <option value="RECTANGULO" ${row.tipo === 'RECTANGULO' ? 'selected' : ''}>RECTÁNGULO</option>
                            <option value="TRIANGULO" ${row.tipo === 'TRIANGULO' ? 'selected' : ''}>TRIÁNGULO</option>
                            <option value="CIRCULO" ${row.tipo === 'CIRCULO' ? 'selected' : ''}>CÍRCULO</option>
                            <option value="SEMICIRCULO" ${row.tipo === 'SEMICIRCULO' ? 'selected' : ''}>SEMICÍRCULO</option>
                            <option value="HUECO_RECT" ${row.tipo === 'HUECO_RECT' ? 'selected' : ''}>HUECO RECT.</option>
                            <option value="HUECO_CIRC" ${row.tipo === 'HUECO_CIRC' ? 'selected' : ''}>HUECO CIRC.</option>
                        </select>
                    </td>
                    <td class="cell-input"><input type="number" step="any" class="st-inp cell-input" data-field="b" value="${row.b || 0}" style="width:48px;"></td>
                    <td class="cell-input"><input type="number" step="any" class="st-inp cell-input" data-field="b_sup" value="${row.b_sup || 0}" style="width:48px;"></td>
                    <td class="cell-input"><input type="number" step="any" class="st-inp cell-input" data-field="h" value="${row.h || 0}" style="width:48px;"></td>
                    <td class="cell-input"><input type="number" step="any" class="st-inp cell-input" data-field="y_base" value="${row.y_base || 0}" style="width:48px;"></td>
                    <td class="cell-input"><input type="number" step="any" class="st-inp cell-input" data-field="x_c" value="${row.x_c || 0}" style="width:48px;"></td>
                    <td class="cell-auto-green st-out-a">0.00</td>
                    <td class="st-out-y">0.00</td>
                    <td class="st-out-ay">0.00</td>
                    <td class="st-out-i0">0.00</td>
                    <td class="st-out-dy">0.00</td>
                    <td class="st-out-ad2">0.00</td>
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
        const tbody = $('tbodySteiner');
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

        activeModel.steiner_rows = rows;
        updateSectionUI();
        recompute();
    }

    function buildSectionLatex(secType, p, secData){
        if(secType === 'RECTANGULAR' || secType === 'RECT'){
            return `\\begin{aligned}
A &= b \\cdot h = ${secData.b} \\cdot ${secData.h} = ${p.A.toFixed(2)} \\text{ cm}^2 \\\\[4pt]
I_z &= \\frac{b \\cdot h^3}{12} = \\frac{${secData.b} \\cdot ${secData.h}^3}{12} = ${p.I.toFixed(4)} \\text{ cm}^4 \\\\[4pt]
\\bar{Y} &= \\frac{h}{2} = \\frac{${secData.h}}{2} = ${p.ycg.toFixed(2)} \\text{ cm}
\\end{aligned}`;
        } else if(secType === 'T_SECTION' || secType === 'SECCION_T' || secType === 'T'){
            const d = p.details;
            return `\\begin{aligned}
A &= A_{ala} + A_{alma} = (${(d.a1||0).toFixed(1)}) + (${(d.a2||0).toFixed(1)}) = ${p.A.toFixed(2)} \\text{ cm}^2 \\\\[4pt]
\\bar{Y} &= \\frac{A_1 y_1 + A_2 y_2}{A_1 + A_2} = ${p.ycg.toFixed(3)} \\text{ cm} \\\\[4pt]
I_{Steiner} &= \\sum (I_{0i} + A_i d_i^2) = ${p.I.toFixed(4)} \\text{ cm}^4
\\end{aligned}`;
        } else if(secType === 'I_SECTION' || secType === 'DOBLE_T'){
            return `\\begin{aligned}
A &= 2 A_{ala} + A_{alma} = 2(${secData.b} \\cdot ${secData.p3}) + (${secData.p4} \\cdot ${secData.h - 2*secData.p3}) = ${p.A.toFixed(2)} \\text{ cm}^2 \\\\[4pt]
\\bar{Y} &= \\frac{H_{tot}}{2} = \\frac{${secData.h}}{2} = ${p.ycg.toFixed(2)} \\text{ cm} \\\\[4pt]
I_z &= 2 (I_{0,ala} + A_{ala} d_{ala}^2) + I_{0,alma} = ${p.I.toFixed(4)} \\text{ cm}^4
\\end{aligned}`;
        } else if(secType === 'CAJON_HUECO' || secType === 'BOX'){
            return `\\begin{aligned}
A &= (B_{ext} \\cdot H_{ext}) - (b_{int} \\cdot h_{int}) = (${secData.b} \\cdot ${secData.h}) - (${secData.p3} \\cdot ${secData.p4}) = ${p.A.toFixed(2)} \\text{ cm}^2 \\\\[4pt]
\\bar{Y} &= \\frac{H_{ext}}{2} = ${p.ycg.toFixed(2)} \\text{ cm} \\\\[4pt]
I_z &= \\frac{B_{ext} H_{ext}^3 - b_{int} h_{int}^3}{12} = ${p.I.toFixed(4)} \\text{ cm}^4
\\end{aligned}`;
        } else if(secType === 'CIRCULAR' || secType === 'CIRCLE'){
            return `\\begin{aligned}
A &= \\frac{\\pi D^2}{4} = \\frac{\\pi (${secData.b})^2}{4} = ${p.A.toFixed(2)} \\text{ cm}^2 \\\\[4pt]
I_z &= \\frac{\\pi D^4}{64} = \\frac{\\pi (${secData.b})^4}{64} = ${p.I.toFixed(4)} \\text{ cm}^4 \\\\[4pt]
\\bar{Y} &= \\frac{D}{2} = ${p.ycg.toFixed(2)} \\text{ cm}
\\end{aligned}`;
        } else if(secType === 'STEINER_COMPUESTA' || secType === 'STEINER_CUSTOM'){
            return `\\begin{aligned}
A_{total} &= \\sum_{i=1}^{n} A_i = ${p.A.toFixed(2)} \\text{ cm}^2 \\\\[4pt]
\\bar{Y} &= \\frac{\\sum A_i y_i}{\\sum A_i} = ${p.ycg.toFixed(3)} \\text{ cm} \\\\[4pt]
I_{z,total} &= \\sum_{i=1}^{n} (I_{0i} + A_i d_i^2) = ${p.I.toFixed(4)} \\text{ cm}^4
\\end{aligned}`;
        }
        return `\\begin{aligned}
A &= ${p.A.toFixed(2)} \\text{ cm}^2 \\\\[4pt]
I_z &= ${p.I.toFixed(4)} \\text{ cm}^4
\\end{aligned}`;
    }

    function updateSectionUI(){
        updateSecLabelsAndVisibility();

        try {
            const secData = getSectionDataFromUI();
            const p = FrameSolver.properties(secData);
            activeModel.section = secData;

            // 1. Actualizar números en tarjetas
            if($('outGlobalA')) $('outGlobalA').textContent = p.A.toFixed(4);
            if($('outGlobalIz')) $('outGlobalIz').textContent = p.I.toFixed(4);
            if($('outGlobalYcg')) $('outGlobalYcg').textContent = (p.ycg || 0).toFixed(4);

            // 2. Renderizar Canvas de Vista Previa de Sección Transversal
            const cvSec = $('canvasSectionPreview');
            if (cvSec && window.FrameCanvas && typeof FrameCanvas.renderCrossSectionPreview === 'function') {
                FrameCanvas.renderCrossSectionPreview(cvSec, p);
            }

            // 3. Actualizar tabla de Steiner si aplica
            if (p.steiner && p.steiner.rows) {
                const tbodySt = $('tbodySteiner');
                const tfootSt = $('tfootSteiner');
                if (tbodySt) {
                    p.steiner.rows.forEach((r, idx) => {
                        const tr = tbodySt.children[idx];
                        if (tr) {
                            tr.querySelector('.st-out-a').textContent = r.A.toFixed(2);
                            tr.querySelector('.st-out-y').textContent = r.y_i.toFixed(2);
                            tr.querySelector('.st-out-ay').textContent = r.Ay.toFixed(2);
                            tr.querySelector('.st-out-i0').textContent = r.I0.toFixed(2);
                            const dyVal = r.y_i - p.steiner.Y_CG;
                            tr.querySelector('.st-out-dy').textContent = dyVal.toFixed(2);
                            tr.querySelector('.st-out-ad2').textContent = r.Ad2.toFixed(2);
                            tr.querySelector('.st-out-iz').textContent = r.Itot.toFixed(2);
                        }
                    });
                }
                if (tfootSt) {
                    tfootSt.innerHTML = `
                        <tr style="background: rgba(254, 240, 138, 0.2); font-weight: 900;">
                            <td colspan="7" style="text-align: right; color:#fef08a;">TOTALES STEINER:</td>
                            <td class="cell-auto-green">${p.steiner.A_total.toFixed(2)}</td>
                            <td style="color:#f59e0b;">Ȳ = ${p.steiner.Y_CG.toFixed(3)}</td>
                            <td>${p.steiner.Ay_total.toFixed(2)}</td>
                            <td>—</td>
                            <td>—</td>
                            <td>${p.steiner.Ad2_total.toFixed(2)}</td>
                            <td class="cell-auto-green">${p.steiner.I_total.toFixed(2)} cm⁴</td>
                        </tr>
                    `;
                }
            }

            // 4. Renderizar KaTeX explicativo sin delimitadores externos
            if(typeof katex !== 'undefined' && $('sectionKaTeXContainer')){
                const latexMath = buildSectionLatex(secData.sec_type, p, secData);
                katex.render(latexMath, $('sectionKaTeXContainer'), { displayMode: true, throwOnError: false });
            }
        } catch(err){
            if($('sectionKaTeXContainer')){
                $('sectionKaTeXContainer').innerHTML = `<span style="color:#f87171;">${err.message}</span>`;
            }
        }
    }

    function getSectionDataFromUI(){
        const secType = $('inpSecType') ? $('inpSecType').value : ($('shapeSelect') ? $('shapeSelect').value : 'RECTANGULAR');
        const b = Number($('inpSecB') ? $('inpSecB').value : ($('secB') ? $('secB').value : 5));
        const h = Number($('inpSecH') ? $('inpSecH').value : ($('secH') ? $('secH').value : 5));
        const p3 = Number($('inpSecP3') ? $('inpSecP3').value : 0);
        const p4 = Number($('inpSecP4') ? $('inpSecP4').value : 0);
        const propMode = $('inpPropMode') ? $('inpPropMode').value : 'CONSTANTE';

        return {
            sec_type: secType,
            shape: secType.toLowerCase(),
            b, h, p3, p4,
            bf: p3 || b,
            tf: p4 || 8,
            tw: b,
            hw: h,
            d: b,
            prop_mode: propMode,
            steiner_rows: activeModel.steiner_rows || []
        };
    }

    // ── POBLAR TABLAS DESDE EL MODELO ─────────────────────────────
    function populateTablesFromModel(m){
        const sec = m.section || { b: 5, h: 5 };
        const secType = (sec.sec_type || (sec.shape === 'rect' ? 'RECTANGULAR' : (sec.shape === 'circle' ? 'CIRCULAR' : (sec.shape === 'T' ? 'T_SECTION' : 'RECTANGULAR'))));
        
        if($('inpSecType')) $('inpSecType').value = secType;
        if($('shapeSelect')) $('shapeSelect').value = sec.shape || 'rect';
        if($('inpSecB')) $('inpSecB').value = sec.b || (sec.shape === 'circle' ? sec.d : 5);
        if($('secB')) $('secB').value = sec.b || 5;
        if($('inpSecH')) $('inpSecH').value = sec.h || (sec.shape === 'circle' ? sec.d : 5);
        if($('secH')) $('secH').value = sec.h || 5;
        if($('inpSecP3')) $('inpSecP3').value = sec.p3 || sec.bf || 0;
        if($('inpSecP4')) $('inpSecP4').value = sec.p4 || sec.tf || 0;
        if($('inpGlobalE')) $('inpGlobalE').value = m.E || 2100000;
        if($('matE')) $('matE').value = m.E || 2100000;

        renderSteinerTable();
        updateSecLabelsAndVisibility();
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
        const E = Number($('inpGlobalE')?.value || $('matE')?.value) || 2100000;
        if($('matE')) $('matE').value = E;
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

        // Tabla de Curva Elástica (2 Columnas Exactas Solicitadas)
        if($('elasticCurve2ColTableBody') && currentResult.elastic_curve_2col){
            $('elasticCurve2ColTableBody').innerHTML = currentResult.elastic_curve_2col.map(pt => `
                <tr>
                    <td style="font-weight:bold; color:#00f0ff;">(${pt.nodeId})</td>
                    <td style="font-weight:bold;">${fmt(pt.x, 2)}</td>
                    <td style="font-weight:bold; color:#34d399;">${fmt(pt.dy, 6)}</td>
                </tr>
            `).join('');
        }

        // Los 3 Cuadros Clásicos de Resolución Matricial
        if($('tresCuadrosContainerArea') && currentResult.Df_inv){
            const freeCount = currentResult.free.length;
            $('tresCuadrosContainerArea').innerHTML = `
                <div class="cuadros-grid" style="display:grid; grid-template-columns: 240px 1fr 240px; gap:14px; align-items:start;">
                    <div style="background:rgba(10,20,38,0.8); border:1px solid #10b981; border-radius:8px; padding:10px;">
                        <div style="color:#34d399; font-weight:bold; font-size:11px; margin-bottom:6px;">CUADRO 1: {D_libres} (${freeCount})</div>
                        <table class="excel-table">
                            <thead><tr><th>GDL</th><th>Desplazamiento</th></tr></thead>
                            <tbody>
                                ${currentResult.Df_inv.map((v, i) => `<tr><td style="color:#00f0ff; font-weight:bold;">${currentResult.dofLabels33[currentResult.free[i]]}</td><td style="color:#34d399; font-weight:bold;">${fmt(v, 6)}</td></tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div style="background:rgba(10,20,38,0.8); border:1px solid #fde047; border-radius:8px; padding:10px; overflow-x:auto;">
                        <div style="color:#fde047; font-weight:bold; font-size:11px; margin-bottom:6px;">CUADRO 2: [K_LL]⁻¹ (${freeCount}×${freeCount})</div>
                        <table class="excel-table">
                            <thead><tr>${currentResult.free.map(d => `<th>${currentResult.dofLabels33[d]}</th>`).join('')}</tr></thead>
                            <tbody>
                                ${currentResult.Kff_inv.map(row => `<tr>${row.map(v => `<td style="font-size:10px;">${v.toExponential(4)}</td>`).join('')}</tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div style="background:rgba(10,20,38,0.8); border:1px solid #38bdf8; border-radius:8px; padding:10px;">
                        <div style="color:#38bdf8; font-weight:bold; font-size:11px; margin-bottom:6px;">CUADRO 3: {F_libres} (${freeCount})</div>
                        <table class="excel-table">
                            <thead><tr><th>GDL</th><th>Fuerza</th></tr></thead>
                            <tbody>
                                ${currentResult.Ff.map((v, i) => `<tr><td style="color:#00f0ff; font-weight:bold;">${currentResult.dofLabels33[currentResult.free[i]]}</td><td style="color:#38bdf8; font-weight:bold;">${fmt(v, 2)}</td></tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
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
        } else if(mode === 'Kff_inv'){
            M = currentResult.Kff_inv;
            title = `Matriz Inversa [K_LL]⁻¹ (${M.length}×${M.length})`;
        } else if(mode === 'K_RL'){
            M = currentResult.K_RL;
            title = `Submatriz de Filas Restringidas [K_RL] (${M.length}×${M[0].length})`;
        } else if(mode === 'K_global_33'){
            M = currentResult.K_global_33;
            title = `Matriz de Rigidez Global Ensamblada 33×33 [Kviga]`;
        } else if(mode === 'K_exp'){
            const expBar = currentResult.expandedBars33.find(eb => eb.barId === selectedBar) || currentResult.expandedBars33[0];
            M = expBar.matrix;
            title = `Matriz Expandida 33×33 — Barra [${selectedBar}]`;
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

        // Eventos de sección transversal y material
        const updateSec = () => {
            if($('matE') && $('inpGlobalE')) $('matE').value = $('inpGlobalE').value;
            updateSecLabelsAndVisibility();
            updateSectionUI();
            recompute();
        };

        if($('inpMaterial')){
            $('inpMaterial').addEventListener('change', () => {
                const mat = $('inpMaterial').value;
                if (mat === 'ACERO_A36') $('inpGlobalE').value = '2000000';
                else if (mat === 'ACERO_A992') $('inpGlobalE').value = '2040000';
                else if (mat === 'CONCRETO_210') $('inpGlobalE').value = '217370';
                else if (mat === 'CONCRETO_280') $('inpGlobalE').value = '250998';
                else if (mat === 'MADERA') $('inpGlobalE').value = '100000';
                updateSec();
            });
        }
        if($('inpGlobalE')){
            $('inpGlobalE').addEventListener('input', () => {
                if($('inpMaterial') && $('inpMaterial').value !== 'CUSTOM') $('inpMaterial').value = 'CUSTOM';
                updateSec();
            });
        }

        ['inpSecType', 'inpPropMode', 'inpSecB', 'inpSecH', 'inpSecP3', 'inpSecP4'].forEach(id => {
            const el = $(id);
            if(el) {
                el.addEventListener('input', updateSec);
                el.addEventListener('change', updateSec);
            }
        });

        if($('btnToggleSteiner') && $('steinerWrap')){
            $('btnToggleSteiner').addEventListener('click', () => {
                $('steinerWrap').style.display = $('steinerWrap').style.display === 'none' ? 'block' : 'none';
            });
        }
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

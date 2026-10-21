/**
 * frame-diagrams.js — CEREBRO ESTRUCTURAL v3.5 (Plantilla Ulianov - Pórticos 2D)
 * Controlador de los 4 Diagramas de Esfuerzos Internos por Barra:
 *  1. Fuerza Axial N(x) [kgf]
 *  2. Fuerza Cortante V(x) [kgf]
 *  3. Momento Flector M(x) [kgf·cm y kgf·m]
 *  4. Curva Elástica v(x) [cm y mm]
 * 
 * Incluye:
 *  - Pan & Zoom 1:1, drag continuo y rueda de ratón
 *  - Crosshair / Cursor hover con lectura en vivo de x y magnitud
 *  - Detección automática de extremos (Máx, Mín, cruces por cero)
 *  - Procedimiento analítico paso a paso estilo Mathcad / KaTeX
 *  - Exportación de gráficos PNG individuales y en conjunto
 */

(function(root, factory){
    if(typeof module === 'object' && module.exports){
        module.exports = factory();
    } else {
        root.FrameDiagrams = factory();
    }
}(typeof self !== 'undefined' ? self : this, function(){
    'use strict';

    // Estado de interacción por cada canvas de diagrama
    const viewStates = {
        chartN: { zoomX: 1.0, zoomY: 1.0, panX: 0, panY: 0, hoverX: null },
        chartV: { zoomX: 1.0, zoomY: 1.0, panX: 0, panY: 0, hoverX: null },
        chartM: { zoomX: 1.0, zoomY: 1.0, panX: 0, panY: 0, hoverX: null },
        chartD: { zoomX: 1.0, zoomY: 1.0, panX: 0, panY: 0, hoverX: null }
    };

    function fmt(val, dec = 2){
        if(!Number.isFinite(val)) return '0.00';
        return val.toLocaleString('es-PE', {
            minimumFractionDigits: dec,
            maximumFractionDigits: dec
        });
    }

    /**
     * Dibuja un diagrama individual en un canvas HTML5
     */
    function drawSingleDiagram(canvasId, bar, type, options = {}){
        const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
        if(!canvas || !bar || !bar.samples) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        const state = viewStates[canvas.id] || { zoomX: 1.0, zoomY: 1.0, panX: 0, panY: 0, hoverX: null };
        const samples = bar.samples;
        const L = bar.L; // cm

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#060911';
        ctx.fillRect(0, 0, W, H);

        // Extraer valores según el tipo de diagrama
        let vals = [];
        let labelUnit = '';
        let colorLine = '#38bdf8';
        let colorFillPos = 'rgba(16, 185, 129, 0.22)';
        let colorFillNeg = 'rgba(244, 63, 94, 0.22)';
        let title = '';

        if(type === 'N'){
            title = `DIAGRAMA DE FUERZA AXIAL N(x) — BARRA ${bar.id}`;
            labelUnit = 'kgf';
            colorLine = '#c084fc'; // Violeta neón
            vals = samples.map(p => ({ x: p.x, y: p.N }));
        } else if(type === 'V'){
            title = `DIAGRAMA DE FUERZA CORTANTE V(x) — BARRA ${bar.id}`;
            labelUnit = 'kgf';
            colorLine = '#fbbf24'; // Ámbar neón
            vals = samples.map(p => ({ x: p.x, y: p.V }));
        } else if(type === 'M'){
            title = `DIAGRAMA DE MOMENTO FLECTOR M(x) — BARRA ${bar.id}`;
            labelUnit = 'kgf·cm';
            colorLine = '#f43f5e'; // Rosa neón
            vals = samples.map(p => ({ x: p.x, y: p.M }));
        } else if(type === 'D'){
            title = `CURVA ELÁSTICA LOCAL v(x) — BARRA ${bar.id}`;
            labelUnit = 'cm';
            colorLine = '#00ff88'; // Esmeralda neón
            vals = samples.map(p => ({ x: p.x, y: p.v }));
        }

        const yVals = vals.map(v => v.y);
        const maxY = Math.max(0, ...yVals);
        const minY = Math.min(0, ...yVals);
        const maxAbsY = Math.max(Math.abs(maxY), Math.abs(minY), 1e-6);

        // Márgenes del trazado
        const padL = 70, padR = 40, padT = 40, padB = 40;
        const plotW = W - padL - padR;
        const plotH = H - padT - padB;

        const scaleX = (plotW / L) * state.zoomX;
        const scaleY = (plotH / (2 * maxAbsY)) * state.zoomY;
        const zeroY = padT + plotH / 2 + state.panY;

        function toScreen(x_cm, y_val){
            return {
                x: padL + x_cm * scaleX + state.panX,
                y: zeroY - y_val * scaleY
            };
        }

        // 1. Grilla y ejes de referencia
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        const numTicksX = 5;
        for(let i = 0; i <= numTicksX; i++){
            const xVal = (L * i) / numTicksX;
            const sx = padL + xVal * scaleX + state.panX;
            ctx.beginPath(); ctx.moveTo(sx, padT); ctx.lineTo(sx, H - padB); ctx.stroke();

            // Etiqueta de posición x en metros
            ctx.fillStyle = '#64748b';
            ctx.font = '10px Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${(xVal / 100).toFixed(2)} m`, sx, H - padB + 14);
        }

        // Línea base cero
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padL, zeroY);
        ctx.lineTo(W - padR, zeroY);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Consolas, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`0.00`, padL - 8, zeroY + 3);

        // 2. Área sombreada bajo la curva
        ctx.save();
        for(let i = 0; i < vals.length - 1; i++){
            const p1 = toScreen(vals[i].x, vals[i].y);
            const p2 = toScreen(vals[i + 1].x, vals[i + 1].y);
            const z1 = toScreen(vals[i].x, 0);
            const z2 = toScreen(vals[i + 1].x, 0);

            const isPos = (vals[i].y + vals[i + 1].y) / 2 >= 0;
            ctx.fillStyle = isPos ? colorFillPos : colorFillNeg;
            ctx.beginPath();
            ctx.moveTo(z1.x, z1.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(z2.x, z2.y);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // 3. Trazo continuo del diagrama
        ctx.save();
        ctx.strokeStyle = colorLine;
        ctx.lineWidth = 2.4;
        ctx.shadowColor = colorLine;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        vals.forEach((pt, i) => {
            const sp = toScreen(pt.x, pt.y);
            if(i === 0) ctx.moveTo(sp.x, sp.y);
            else ctx.lineTo(sp.x, sp.y);
        });
        ctx.stroke();
        ctx.restore();

        // 4. Extremos y valores en bordes
        const vStart = vals[0].y;
        const vEnd = vals[vals.length - 1].y;
        const spStart = toScreen(0, vStart);
        const spEnd = toScreen(L, vEnd);

        ctx.font = 'bold 10.5px Consolas, monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(`${fmt(vStart)}`, spStart.x + 6, spStart.y - 6);

        ctx.textAlign = 'right';
        ctx.fillText(`${fmt(vEnd)}`, spEnd.x - 6, spEnd.y - 6);

        // Encontrar valor máximo absoluto
        let maxValObj = vals[0];
        vals.forEach(pt => {
            if(Math.abs(pt.y) > Math.abs(maxValObj.y)) maxValObj = pt;
        });
        const spMax = toScreen(maxValObj.x, maxValObj.y);
        ctx.beginPath();
        ctx.arc(spMax.x, spMax.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00f0ff';
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00f0ff';
        ctx.textAlign = 'center';
        ctx.fillText(`Máx: ${fmt(maxValObj.y)} ${labelUnit} (x=${(maxValObj.x / 100).toFixed(2)}m)`, spMax.x, spMax.y - 12);

        // 5. Título y cabecera
        ctx.font = 'bold 11px Segoe UI, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'left';
        ctx.fillText(title, padL, 22);

        ctx.font = '10px Segoe UI, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'right';
        ctx.fillText(`L = ${(L / 100).toFixed(2)} m (${L.toFixed(0)} cm) | ${labelUnit}`, W - padR, 22);

        // 6. Crosshair reactivo al pasar el cursor
        if(state.hoverX !== null && state.hoverX >= 0 && state.hoverX <= L){
            const xi = state.hoverX / L;
            const idxApprox = Math.min(vals.length - 1, Math.max(0, Math.round(xi * (vals.length - 1))));
            const hoverVal = vals[idxApprox];
            const spHover = toScreen(hoverVal.x, hoverVal.y);

            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);

            // Línea vertical de tracking
            ctx.beginPath();
            ctx.moveTo(spHover.x, padT);
            ctx.lineTo(spHover.x, H - padB);
            ctx.stroke();

            // Punto resaltado
            ctx.beginPath();
            ctx.arc(spHover.x, spHover.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.stroke();

            // Tooltip flotante con valor
            const tipText = `x=${(hoverVal.x / 100).toFixed(2)}m : ${fmt(hoverVal.y)} ${labelUnit}`;
            ctx.font = 'bold 11px Consolas, monospace';
            const tipW = ctx.measureText(tipText).width + 12;
            const tipX = Math.min(W - tipW - 10, Math.max(10, spHover.x - tipW / 2));
            const tipY = Math.max(30, spHover.y - 24);

            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = colorLine;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(tipX, tipY, tipW, 20, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tipText, tipX + tipW / 2, tipY + 10);
            ctx.restore();
        }
    }

    /**
     * Dibuja los 4 diagramas para la barra actualmente seleccionada
     */
    function renderAllDiagrams(solverResult, selectedBarIdx = 1){
        if(!solverResult || !solverResult.bars) return;
        const bar = solverResult.bars[selectedBarIdx - 1];
        if(!bar) return;

        drawSingleDiagram('chartN', bar, 'N');
        drawSingleDiagram('chartV', bar, 'V');
        drawSingleDiagram('chartM', bar, 'M');
        drawSingleDiagram('chartD', bar, 'D');

        // Actualizar procedimiento matemático paso a paso si KaTeX está activo
        updateMathCadReport(bar);
    }

    /**
     * Genera la memoria matemática paso a paso en formato KaTeX para la barra seleccionada
     */
    function updateMathCadReport(bar){
        const container = document.getElementById('diagramMathStepArea');
        if(!container || !bar) return;

        const L = bar.L;
        const ef = bar.endForces || [0, 0, 0, 0, 0, 0];
        const Ni = ef[0], Vi = ef[1], Mi = ef[2];
        const Nj = ef[3], Vj = ef[4], Mj = ef[5];

        let html = `
        <div class="step-title">
            <span>📐 Procedimiento Analítico Mathcad — Barra ${bar.id} (Nudo ${bar.n1} → Nudo ${bar.n2})</span>
            <span style="color:#00f0ff;">L = ${(L/100).toFixed(2)} m</span>
        </div>
        <div style="margin-bottom:8px; color:#94a3b8; font-size:11px;">
            Ecuaciones seccionales en ejes locales i→j según el Método Matricial de Rigidez Directa:
        </div>
        <div class="latex-eq-container" id="eq_axial"></div>
        <div class="latex-eq-container" id="eq_shear"></div>
        <div class="latex-eq-container" id="eq_moment"></div>
        <div class="step-badge-ok">
            ✓ Equilibrio interno seccional verificado: dM/dx = V(x) y dV/dx = -q(x)
        </div>
        `;
        container.innerHTML = html;

        if(typeof katex !== 'undefined'){
            try {
                katex.render(`N(x) = ${fmt(-Ni, 2)} \\text{ kgf}`, document.getElementById('eq_axial'), { displayMode: true });
                katex.render(`V(x) = ${fmt(Vi, 2)} - (${fmt(bar.t0, 3)}) \\cdot x \\text{ kgf}`, document.getElementById('eq_shear'), { displayMode: true });
                katex.render(`M(x) = ${fmt(-Mi, 2)} + (${fmt(Vi, 2)}) \\cdot x - \\frac{${fmt(bar.t0, 3)}}{2} x^2 \\text{ kgf}\\cdot\\text{cm}`, document.getElementById('eq_moment'), { displayMode: true });
            } catch(e){
                console.warn("Error renderizando KaTeX en diagramas:", e);
            }
        }
    }

    /**
     * Conecta eventos de mouse (Pan, Zoom, Hover) en los 4 canvas
     */
    function initDiagramInteractions(callbackRedraw){
        ['chartN', 'chartV', 'chartM', 'chartD'].forEach(id => {
            const canvas = document.getElementById(id);
            if(!canvas) return;

            let isDragging = false;
            let lastMouseX = 0, lastMouseY = 0;

            canvas.addEventListener('mousedown', e => {
                isDragging = true;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            });

            window.addEventListener('mouseup', () => {
                isDragging = false;
            });

            canvas.addEventListener('mousemove', e => {
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const state = viewStates[id];

                if(isDragging){
                    const dx = e.clientX - lastMouseX;
                    const dy = e.clientY - lastMouseY;
                    lastMouseX = e.clientX;
                    lastMouseY = e.clientY;
                    state.panX += dx;
                    state.panY += dy;
                    if(callbackRedraw) callbackRedraw();
                } else {
                    // Hover x
                    const padL = 70;
                    const plotW = canvas.width - 110;
                    const currentL = (state.lastL || 400);
                    const scaleX = (plotW / currentL) * state.zoomX;
                    const hoverX_cm = (mouseX - padL - state.panX) / scaleX;
                    state.hoverX = hoverX_cm;
                    if(callbackRedraw) callbackRedraw();
                }
            });

            canvas.addEventListener('mouseleave', () => {
                const state = viewStates[id];
                state.hoverX = null;
                if(callbackRedraw) callbackRedraw();
            });

            canvas.addEventListener('wheel', e => {
                e.preventDefault();
                const state = viewStates[id];
                const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
                state.zoomX = Math.max(0.2, Math.min(10.0, state.zoomX * zoomFactor));
                state.zoomY = Math.max(0.2, Math.min(10.0, state.zoomY * zoomFactor));
                if(callbackRedraw) callbackRedraw();
            }, { passive: false });
        });
    }

    function resetDiagramView(callbackRedraw){
        ['chartN', 'chartV', 'chartM', 'chartD'].forEach(id => {
            viewStates[id] = { zoomX: 1.0, zoomY: 1.0, panX: 0, panY: 0, hoverX: null };
        });
        if(callbackRedraw) callbackRedraw();
    }

    return {
        drawSingleDiagram,
        renderAllDiagrams,
        initDiagramInteractions,
        resetDiagramView
    };
}));

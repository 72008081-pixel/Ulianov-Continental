/* Diagramas de Cortante V y Momento Flector M con Shading Neón Fluorescente
   Convención: q, P positivos hacia abajo (-Y global); M positivo sagante (tracción fibra inferior).
   Soporta estiramiento X / Y, grilla cartesiana con origen (0,0), detección de V=0 y M_máx, y crosshair reactivo. */
(function(root){
'use strict';

function calculate(sol){
    if(!sol || !sol.success) return [];
    const out = [];
    let station = 0;
    const activeBars = (sol.barsTable || []).filter(b => b.active);

    for(const b of activeBars){
        const i = b.barNum - 1;
        const L = b.L;
        const c = b.Cosx;
        const s = b.Cosy;
        const d = (sol.D_full || []).slice(3 * i, 3 * i + 6);
        const u = [
            c * d[0] + s * d[1],
            -s * d[0] + c * d[1],
            d[2],
            c * d[3] + s * d[4],
            -s * d[3] + c * d[4],
            d[5]
        ];
        const EI = b.E * b.I;
        const EA = b.E * b.A;
        const k = 12 * EI / Math.pow(L, 3);
        const g = 6 * EI / Math.pow(L, 2);
        const h = 4 * EI / L;
        const j = 2 * EI / L;
        const K = [
            [EA / L, 0, 0, -EA / L, 0, 0],
            [0, k, g, 0, -k, g],
            [0, g, h, 0, -g, j],
            [-EA / L, 0, 0, EA / L, 0, 0],
            [0, -k, -g, 0, k, -g],
            [0, g, j, 0, -g, h]
        ];
        const a = Math.max(0, Math.min(L, b.a_dist > 0 ? b.a_dist : L / 2));
        const t = a / L;
        const q = b.q * c;
        const P = b.P_tramo * c;
        const f = [
            0,
            -q * L / 2 - P * (1 - 3 * t * t + 2 * t * t * t),
            -q * L * L / 12 - P * L * (t - 2 * t * t + t * t * t),
            0,
            -q * L / 2 - P * (3 * t * t - 2 * t * t * t),
            q * L * L / 12 - P * L * (-t * t + t * t * t)
        ];
        const end = K.map((row, idx) => row.reduce((sum, v, col) => sum + v * u[col], 0) - f[idx]);
        const V0 = end[1];
        const M0 = -end[2];
        const points = [];

        const at = (x, after = false) => ({
            x: station + x,
            xLocal: x,
            V: V0 - q * x - (P !== 0 && (x > a || (after && x === a)) ? P : 0),
            M: M0 + V0 * x - q * x * x / 2 - P * Math.max(0, x - a)
        });

        const numDivs = Math.max(40, Math.min(120, Math.floor(L / 5)));
        const cuts = Array.from({ length: numDivs + 1 }, (_, idx) => L * idx / numDivs);
        if (P !== 0) cuts.push(a);
        cuts.sort((x, y) => x - y);
        const unique = cuts.filter((x, idx) => idx === 0 || Math.abs(x - cuts[idx - 1]) > L * 1e-10);

        for(const x of unique){
            if(P !== 0 && Math.abs(x - a) < L * 1e-10){
                points.push(at(a, false), at(a, true));
            } else {
                points.push(at(x));
            }
        }

        out.push({
            bar: b.barNum,
            start: station,
            L,
            points,
            V0, M0,
            Vend: end[4], Mend: end[5],
            q, P, a
        });
        station += L;
    }
    return out;
}

function render(svg, spans, kind, options = {}){
    if(!svg) return;
    const ns = 'http://www.w3.org/2000/svg';
    svg.replaceChildren();

    const node = (tag, attr, text) => {
        const el = document.createElementNS(ns, tag);
        Object.entries(attr || {}).forEach(([k, v]) => el.setAttribute(k, String(v)));
        if(text !== undefined) el.textContent = text;
        svg.appendChild(el);
        return el;
    };

    const all = spans.flatMap(s => s.points);
    const W = 900;
    const H = 320;
    const padX = 65;
    const padY = 50;
    const plotW = W - 2 * padX;
    const plotH = H - 2 * padY;

    if(!all.length){
        node('text', { x: W / 2, y: H / 2, fill: '#64748b', 'text-anchor': 'middle', 'font-size': 14 }, 'Sin solución o tramos activos');
        return;
    }

    const zoomX = options.zoomX || 1.0;
    const zoomY = options.zoomY || 1.0;

    const xmax = Math.max(...all.map(p => p.x), 1);
    const rawMaxAbs = Math.max(...all.map(p => Math.abs(p[kind])), 1e-6);
    const maxAbs = rawMaxAbs / zoomY;

    const px = x => padX + (x / xmax) * plotW * zoomX;
    const py = y => H / 2 - (y / maxAbs) * (plotH / 2 - 12);
    const baselineY = H / 2;

    // 1. Defs: Filtros y Gradientes Neón
    const defs = node('defs', {});
    const gradId = 'gradNeon_' + kind;
    const grad = document.createElementNS(ns, 'linearGradient');
    grad.setAttribute('id', gradId);
    grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '0%'); grad.setAttribute('y2', '100%');

    const colorStroke = kind === 'V' ? '#00f0ff' : '#f59e0b';
    const colorFillTop = kind === 'V' ? 'rgba(0, 240, 255, 0.32)' : 'rgba(245, 158, 11, 0.32)';
    const colorFillBot = kind === 'V' ? 'rgba(0, 240, 255, 0.04)' : 'rgba(245, 158, 11, 0.04)';

    const stop1 = document.createElementNS(ns, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', colorFillTop);
    const stop2 = document.createElementNS(ns, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', colorFillBot);
    grad.appendChild(stop1); grad.appendChild(stop2);
    defs.appendChild(grad);

    // 2. Grilla Cartesiana de Fondo con Origen (0,0)
    const yTicks = [-maxAbs, -maxAbs * 0.5, 0, maxAbs * 0.5, maxAbs];
    for(const yVal of yTicks){
        const yCoord = py(yVal);
        if(yCoord >= padY - 15 && yCoord <= H - padY + 15){
            node('line', {
                x1: padX - 10, y1: yCoord,
                x2: padX + plotW * zoomX + 10, y2: yCoord,
                stroke: yVal === 0 ? '#64748b' : '#1e293b',
                'stroke-width': yVal === 0 ? 1.8 : 1.0,
                'stroke-dasharray': yVal === 0 ? 'none' : '3 4'
            });
            node('text', {
                x: padX - 12, y: yCoord + 4,
                fill: yVal === 0 ? '#f8fafc' : '#94a3b8',
                'text-anchor': 'end',
                'font-size': '11px',
                'font-family': 'monospace'
            }, yVal.toFixed(1));
        }
    }

    // Eje vertical en x = 0 (Origen)
    node('line', {
        x1: padX, y1: padY - 20,
        x2: padX, y2: H - padY + 20,
        stroke: '#64748b',
        'stroke-width': 1.8
    });

    // 3. Shading Neón Bajo la Curva y Trazado de Curva
    let vZeroPoints = [];

    for(const span of spans){
        const pts = span.points;
        if(!pts.length) continue;

        let polyD = 'M ' + px(pts[0].x).toFixed(2) + ' ' + baselineY.toFixed(2) + ' ';
        for(let i = 0; i < pts.length; i++){
            polyD += 'L ' + px(pts[i].x).toFixed(2) + ' ' + py(pts[i][kind]).toFixed(2) + ' ';
        }
        polyD += 'L ' + px(pts[pts.length - 1].x).toFixed(2) + ' ' + baselineY.toFixed(2) + ' Z';

        node('path', {
            d: polyD,
            fill: 'url(#' + gradId + ')',
            stroke: 'none'
        });

        let pathD = pts.map((p, idx) => (idx ? 'L ' : 'M ') + px(p.x).toFixed(2) + ' ' + py(p[kind]).toFixed(2)).join(' ');
        node('path', {
            d: pathD,
            fill: 'none',
            stroke: colorStroke,
            'stroke-width': 2.8,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round'
        });

        node('line', {
            x1: px(span.start), y1: padY - 10,
            x2: px(span.start), y2: H - padY + 10,
            stroke: '#334155',
            'stroke-dasharray': '3 5'
        });

        if(kind === 'V'){
            for(let i = 0; i < pts.length - 1; i++){
                const pA = pts[i];
                const pB = pts[i + 1];
                if((pA.V > 0 && pB.V < 0) || (pA.V < 0 && pB.V > 0) || Math.abs(pA.V) < 1e-4){
                    const denom = (pA.V - pB.V);
                    const xZero = Math.abs(denom) > 1e-6 ? (pA.x + pA.V * (pB.x - pA.x) / denom) : pA.x;
                    vZeroPoints.push(xZero);
                }
            }
        }
    }

    // 4. Resaltar Puntos Clave: V = 0 y M_máx
    if(kind === 'V'){
        const uniqueVZero = vZeroPoints.filter((x, idx) => idx === 0 || Math.abs(x - vZeroPoints[idx - 1]) > 5.0);
        for(const x0 of uniqueVZero){
            const cx = px(x0);
            const cy = baselineY;
            node('circle', { cx, cy, r: 5.5, fill: '#00f0ff', stroke: '#090d16', 'stroke-width': 2.0 });
            node('circle', { cx, cy, r: 8.5, fill: 'none', stroke: 'rgba(0, 240, 255, 0.5)', 'stroke-width': 1.5 });
            const tagY = cy > H / 2 ? cy - 14 : cy + 18;
            node('text', {
                x: cx, y: tagY,
                fill: '#00f0ff',
                'font-size': '10.5px',
                'font-weight': 'bold',
                'text-anchor': 'middle',
                'font-family': 'monospace'
            }, 'V=0 @ ' + (x0 / 100).toFixed(2) + 'm');
        }
    } else {
        let maxPt = all[0];
        for(const p of all){
            if(Math.abs(p.M) > Math.abs(maxPt.M)) maxPt = p;
        }
        if(maxPt && Math.abs(maxPt.M) > 1e-4){
            const cx = px(maxPt.x);
            const cy = py(maxPt.M);
            node('circle', { cx, cy, r: 6.0, fill: '#f59e0b', stroke: '#090d16', 'stroke-width': 2.0 });
            node('circle', { cx, cy, r: 9.5, fill: 'none', stroke: 'rgba(245, 158, 11, 0.5)', 'stroke-width': 1.5 });
            const tagY = cy < baselineY ? cy - 12 : cy + 18;
            node('text', {
                x: cx, y: tagY,
                fill: '#f59e0b',
                'font-size': '11px',
                'font-weight': 'bold',
                'text-anchor': 'middle',
                'font-family': 'monospace'
            }, 'M_máx = ' + maxPt.M.toFixed(1) + ' kgf·cm');
        }
    }

    // 5. Títulos y Ejes
    node('text', {
        x: padX, y: 26,
        fill: colorStroke,
        'font-size': '14px',
        'font-weight': 'bold'
    }, kind === 'V' ? 'Diagrama de Fuerza Cortante V (Kgf) • Fluorescente' : 'Diagrama de Momento Flector M (Kgf·cm) • Fluorescente');

    node('text', {
        x: padX + plotW * zoomX, y: H - 14,
        fill: '#94a3b8',
        'text-anchor': 'end',
        'font-size': '11px'
    }, 'Longitud acumulada x (cm)');

    // 6. Crosshair y Tooltip Interactivo
    const crossLine = node('line', {
        x1: 0, y1: padY - 15, x2: 0, y2: H - padY + 15,
        stroke: '#f8fafc', 'stroke-width': 1.2, 'stroke-dasharray': '2 3',
        style: 'display: none;'
    });
    const crossDot = node('circle', {
        cx: 0, cy: 0, r: 5, fill: colorStroke, stroke: '#ffffff', 'stroke-width': 1.5,
        style: 'display: none;'
    });

    svg.onmousemove = function(e){
        const rect = svg.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (W / rect.width);
        if(mouseX < padX || mouseX > padX + plotW * zoomX){
            crossLine.style.display = 'none';
            crossDot.style.display = 'none';
            return;
        }
        const xVal = ((mouseX - padX) / (plotW * zoomX)) * xmax;
        let closest = all[0];
        let minDist = Infinity;
        for(const p of all){
            const dist = Math.abs(p.x - xVal);
            if(dist < minDist){
                minDist = dist;
                closest = p;
            }
        }
        if(closest){
            const curPx = px(closest.x);
            const curPy = py(closest[kind]);
            crossLine.setAttribute('x1', curPx);
            crossLine.setAttribute('x2', curPx);
            crossLine.style.display = '';
            crossDot.setAttribute('cx', curPx);
            crossDot.setAttribute('cy', curPy);
            crossDot.style.display = '';

            const tipX = document.getElementById('tipX');
            const tipV = document.getElementById('tipV');
            const tipM = document.getElementById('tipM');
            if(tipX) tipX.textContent = closest.x.toFixed(1) + ' cm (' + (closest.x / 100).toFixed(2) + ' m)';
            if(tipV) tipV.textContent = closest.V.toFixed(2) + ' Kgf';
            if(tipM) tipM.textContent = closest.M.toFixed(2) + ' Kgf·cm (' + (closest.M / 100).toFixed(2) + ' Kgf·m)';
        }
    };

    svg.onmouseleave = function(){
        crossLine.style.display = 'none';
        crossDot.style.display = 'none';
    };
}

root.BeamDiagrams = { calculate, render };
})(typeof window !== 'undefined' ? window : globalThis);

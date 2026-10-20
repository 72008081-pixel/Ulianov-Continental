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

        // Longitud cargada de la carga distribuida (parcial o total)
        const L_dist_eff = (b.L_dist !== undefined && b.L_dist !== null && b.L_dist > 0) ? Math.min(L, b.L_dist) : L;
        const cLoad = L_dist_eff;

        let Vi_q = 0, Mi_q = 0, Vj_q = 0, Mj_q = 0;
        if (Math.abs(q) > 1e-12 && L > 0) {
            if (Math.abs(cLoad - L) < 1e-6) {
                Vi_q = q * L / 2.0;
                Mi_q = q * L * L / 12.0;
                Vj_q = q * L / 2.0;
                Mj_q = -q * L * L / 12.0;
            } else if (cLoad > 0) {
                Mi_q = (q * cLoad * cLoad / (12.0 * L * L)) * (6.0 * L * L - 8.0 * L * cLoad + 3.0 * cLoad * cLoad);
                Mj_q = -(q * Math.pow(cLoad, 3) / (12.0 * L * L)) * (4.0 * L - 3.0 * cLoad);
                Vi_q = (q * cLoad * (L - cLoad / 2.0)) / L + (Mi_q + Mj_q) / L;
                Vj_q = q * cLoad - Vi_q;
            }
        }

        const f = [
            0,
            -Vi_q - P * (1 - 3 * t * t + 2 * t * t * t),
            -Mi_q - P * L * (t - 2 * t * t + t * t * t),
            0,
            -Vj_q - P * (3 * t * t - 2 * t * t * t),
            -Mj_q - P * L * (-t * t + t * t * t)
        ];
        const end = K.map((row, idx) => row.reduce((sum, v, col) => sum + v * u[col], 0) - f[idx]);
        const V0 = end[1];
        const M0 = -end[2];
        const points = [];

        const at = (x, after = false) => {
            const qLoaded = Math.min(x, cLoad);
            const qShear = q * qLoaded;
            const qMoment = (x <= cLoad) ? (q * x * x / 2.0) : (q * cLoad * (x - cLoad / 2.0));
            return {
                x: station + x,
                xLocal: x,
                V: V0 - qShear - (P !== 0 && (x > a || (after && x === a)) ? P : 0),
                M: M0 + V0 * x - qMoment - P * Math.max(0, x - a)
            };
        };

        const numDivs = Math.max(40, Math.min(120, Math.floor(L / 5)));
        const cuts = Array.from({ length: numDivs + 1 }, (_, idx) => L * idx / numDivs);
        if (P !== 0) cuts.push(a);
        if (cLoad > 0 && cLoad < L) cuts.push(cLoad);
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

    // 3. Shading Neón Bajo la Curva, Trazado de Curva y Líneas Verticales de Cierre / Salto
    let vZeroPoints = [];
    let mZeroPoints = [];

    // Trazar cada tramo individual con sombreado y contorno
    for(let sIdx = 0; sIdx < spans.length; sIdx++){
        const span = spans[sIdx];
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

        // Líneas punteadas verticales delimitadoras de tramos
        node('line', {
            x1: px(span.start), y1: padY - 10,
            x2: px(span.start), y2: H - padY + 10,
            stroke: '#334155',
            'stroke-dasharray': '3 5'
        });

        // Búsqueda de cruces por cero en Cortante (V = 0)
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

        // Búsqueda de cruces por cero en Momento (M = 0 puntos de inflexión)
        if(kind === 'M'){
            for(let i = 0; i < pts.length - 1; i++){
                const pA = pts[i];
                const pB = pts[i + 1];
                if((pA.M > 0 && pB.M < 0) || (pA.M < 0 && pB.M > 0)){
                    const denom = (pA.M - pB.M);
                    const xZero = Math.abs(denom) > 1e-6 ? (pA.x + pA.M * (pB.x - pA.x) / denom) : pA.x;
                    mZeroPoints.push(xZero);
                }
            }
        }
    }

    // Búsqueda de cruces por cero en saltos verticales nodales (ej. cargas puntuales o reacciones que cambian signo)
    if(kind === 'V'){
        for(let k = 0; k < spans.length - 1; k++){
            const pEnd = spans[k].points[spans[k].points.length - 1];
            const pNext = spans[k + 1].points[0];
            if(pEnd && pNext){
                if((pEnd.V > 0 && pNext.V < 0) || (pEnd.V < 0 && pNext.V > 0)){
                    vZeroPoints.push(pEnd.x);
                }
            }
        }
    }

    // ══ LÍNEAS VERTICALES DE CIERRE Y SALTOS ENTRE TRAMOS (CÁTEDRA INGENIERO) ══
    if(spans.length > 0){
        const firstSpan = spans[0];
        const lastSpan = spans[spans.length - 1];
        const firstPt = firstSpan.points[0];
        const lastPt = lastSpan.points[lastSpan.points.length - 1];

        // 1. Línea vertical inicial en x = 0 (sube o baja desde el eje basal según la reacción)
        if(firstPt && Math.abs(firstPt[kind]) > 1e-4){
            node('line', {
                x1: px(firstPt.x), y1: baselineY,
                x2: px(firstPt.x), y2: py(firstPt[kind]),
                stroke: colorStroke,
                'stroke-width': 2.8,
                'stroke-linecap': 'round'
            });
        }

        // 2. Líneas verticales de salto nodal entre tramos consecutivos (transición de cortante / momento)
        for(let k = 0; k < spans.length - 1; k++){
            const pEnd = spans[k].points[spans[k].points.length - 1];
            const pNext = spans[k + 1].points[0];
            if(pEnd && pNext && Math.abs(pEnd[kind] - pNext[kind]) > 1e-4){
                node('line', {
                    x1: px(pEnd.x), y1: py(pEnd[kind]),
                    x2: px(pEnd.x), y2: py(pNext[kind]),
                    stroke: colorStroke,
                    'stroke-width': 2.8,
                    'stroke-linecap': 'round'
                });
            }
        }

        // 3. Línea vertical final de cierre en x = L_total (cierra el diagrama al eje basal)
        if(lastPt && Math.abs(lastPt[kind]) > 1e-4){
            node('line', {
                x1: px(lastPt.x), y1: py(lastPt[kind]),
                x2: px(lastPt.x), y2: baselineY,
                stroke: colorStroke,
                'stroke-width': 2.8,
                'stroke-linecap': 'round'
            });
        }

        // 4. Líneas verticales internas de saltos por cargas puntuales dentro de cada tramo
        for(const span of spans){
            const pts = span.points;
            for(let i = 0; i < pts.length - 1; i++){
                if(Math.abs(pts[i].x - pts[i + 1].x) < 1e-6 && Math.abs(pts[i][kind] - pts[i + 1][kind]) > 1e-4){
                    node('line', {
                        x1: px(pts[i].x), y1: py(pts[i][kind]),
                        x2: px(pts[i].x), y2: py(pts[i + 1][kind]),
                        stroke: colorStroke,
                        'stroke-width': 2.8,
                        'stroke-linecap': 'round'
                    });
                }
            }
        }
    }

    // 4. Resaltar Puntos Clave: V = 0, V_máx, M_máx y M = 0
    if(kind === 'V'){
        // Puntos de cortante cero (V = 0) que generan Momento Máximo
        const uniqueVZero = vZeroPoints.filter((x, idx) => idx === 0 || Math.abs(x - vZeroPoints[idx - 1]) > 5.0);
        for(const x0 of uniqueVZero){
            const cx = px(x0);
            const cy = baselineY;

            // Obtener el momento correspondiente en esta posición x0
            let Mx0 = 0;
            for(let i = 0; i < all.length - 1; i++){
                if(x0 >= all[i].x && x0 <= all[i + 1].x){
                    const dx = all[i + 1].x - all[i].x;
                    const t = dx > 1e-6 ? (x0 - all[i].x) / dx : 0;
                    Mx0 = all[i].M + t * (all[i + 1].M - all[i].M);
                    break;
                }
            }

            node('circle', { cx, cy, r: 6.0, fill: '#00f0ff', stroke: '#090d16', 'stroke-width': 2.2 });
            node('circle', { cx, cy, r: 10.0, fill: 'none', stroke: 'rgba(0, 240, 255, 0.6)', 'stroke-width': 1.6 });
            
            const tagY = cy > H / 2 ? cy - 16 : cy + 20;
            const mText = Math.abs(Mx0) > 1e-3 ? ` ➔ M_máx=${(Mx0 / 100).toFixed(1)} kgf·m` : '';
            node('text', {
                x: cx, y: tagY,
                fill: '#00f0ff',
                'font-size': '10.5px',
                'font-weight': 'bold',
                'text-anchor': 'middle',
                'font-family': 'monospace'
            }, `V=0 @ ${(x0 / 100).toFixed(2)}m${mText}`);
        }

        // Cortantes máximos absolutos
        let maxV = all[0];
        let minV = all[0];
        for(const p of all){
            if(p.V > maxV.V) maxV = p;
            if(p.V < minV.V) minV = p;
        }
        if(maxV && Math.abs(maxV.V) > 1e-4){
            const cx = px(maxV.x);
            const cy = py(maxV.V);
            node('circle', { cx, cy, r: 4.5, fill: '#38bdf8', stroke: '#090d16', 'stroke-width': 1.8 });
            node('text', {
                x: cx, y: cy - 8,
                fill: '#38bdf8',
                'font-size': '9.5px',
                'font-weight': 'bold',
                'text-anchor': 'middle',
                'font-family': 'monospace'
            }, `+${maxV.V.toFixed(1)}`);
        }
        if(minV && Math.abs(minV.V) > 1e-4 && minV !== maxV){
            const cx = px(minV.x);
            const cy = py(minV.V);
            node('circle', { cx, cy, r: 4.5, fill: '#38bdf8', stroke: '#090d16', 'stroke-width': 1.8 });
            node('text', {
                x: cx, y: cy + 14,
                fill: '#38bdf8',
                'font-size': '9.5px',
                'font-weight': 'bold',
                'text-anchor': 'middle',
                'font-family': 'monospace'
            }, `${minV.V.toFixed(1)}`);
        }
    } else {
        // En Momento Flector M:
        let maxPt = all[0];
        let minPt = all[0];
        for(const p of all){
            if(p.M > maxPt.M) maxPt = p;
            if(p.M < minPt.M) minPt = p;
        }

        // 1. Momento Máximo Positivo (Sagante / tramo)
        if(maxPt && maxPt.M > 1e-4){
            const cx = px(maxPt.x);
            const cy = py(maxPt.M);
            node('circle', { cx, cy, r: 6.5, fill: '#f59e0b', stroke: '#090d16', 'stroke-width': 2.2 });
            node('circle', { cx, cy, r: 10.5, fill: 'none', stroke: 'rgba(245, 158, 11, 0.6)', 'stroke-width': 1.6 });
            node('text', {
                x: cx, y: cy - 12,
                fill: '#fbbf24',
                'font-size': '11px',
                'font-weight': 'bold',
                'text-anchor': 'middle',
                'font-family': 'monospace'
            }, `M_máx(+) = ${(maxPt.M / 100).toFixed(1)} kgf·m (@ ${(maxPt.x / 100).toFixed(2)}m)`);
        }

        // 2. Momento Máximo Negativo (Hogging / sobre apoyos)
        if(minPt && minPt.M < -1e-4 && minPt !== maxPt){
            const cx = px(minPt.x);
            const cy = py(minPt.M);
            node('circle', { cx, cy, r: 6.0, fill: '#ef4444', stroke: '#090d16', 'stroke-width': 2.0 });
            node('circle', { cx, cy, r: 9.5, fill: 'none', stroke: 'rgba(239, 68, 68, 0.6)', 'stroke-width': 1.5 });
            node('text', {
                x: cx, y: cy + 16,
                fill: '#f87171',
                'font-size': '10.5px',
                'font-weight': 'bold',
                'text-anchor': 'middle',
                'font-family': 'monospace'
            }, `M_máx(-) = ${(minPt.M / 100).toFixed(1)} kgf·m (@ ${(minPt.x / 100).toFixed(2)}m)`);
        }

        // 3. Puntos de inflexión (M = 0)
        const uniqueMZero = mZeroPoints.filter((x, idx) => idx === 0 || Math.abs(x - mZeroPoints[idx - 1]) > 5.0);
        for(const x0 of uniqueMZero){
            const cx = px(x0);
            const cy = baselineY;
            node('circle', { cx, cy, r: 4.5, fill: '#10b981', stroke: '#090d16', 'stroke-width': 1.8 });
            node('text', {
                x: cx, y: cy > H / 2 ? cy - 10 : cy + 14,
                fill: '#34d399',
                'font-size': '9px',
                'font-weight': 'bold',
                'text-anchor': 'middle',
                'font-family': 'monospace'
            }, `Inflexión (${(x0 / 100).toFixed(2)}m)`);
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

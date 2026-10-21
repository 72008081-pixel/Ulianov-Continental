/**
 * frame-canvas.js — CEREBRO ESTRUCTURAL v3.5 (Plantilla Ulianov - Pórticos 2D)
 * Renderizador Gráfico de Alta Precisión en HTML5 Canvas para Pórticos Planos:
 *  - Estilo oficial de cátedra Ing. Ulianov Cuba Valencia:
 *    * Nudos en círculos verdes (1)..(N)
 *    * Barras en recuadros rojos [1]..[M]
 *    * Flechas moradas de dirección i -> j
 *    * Coordenadas en morado (x; y)
 *    * Apoyos detallados: Empotrado (hachurado), Articulado, Rodillo X, Rodillo Y
 *    * Cargas distribuidas a lo largo de columnas y vigas con flechas y valor
 *    * Cargas puntuales Fx, Fy con flechas de impacto y etiqueta
 *    * Momentos concentrados con arcos circulares y sentido de giro
 *    * Deformada elástica analítica superpuesta en verde neón (con factor de escala)
 *    * Selección interactiva de barra con resaltado neón
 *    * Clic interactivo en apoyos para ciclar condiciones en vivo
 */

(function(root, factory){
    if(typeof module === 'object' && module.exports){
        module.exports = factory();
    } else {
        root.FrameCanvas = factory();
    }
}(typeof self !== 'undefined' ? self : this, function(){
    'use strict';

    function fmtClean(val, dec = 2){
        if(!Number.isFinite(val)) return '—';
        const s = val.toFixed(dec);
        return s.replace(/\.?0+$/, '');
    }

    function drawLineArrow(ctx, x1, y1, x2, y2, color = '#a855f7', lineWidth = 2.0, headLen = 12){
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headLen * 0.65 * Math.cos(angle), y2 - headLen * 0.65 * Math.sin(angle));
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawCurvedMomentArrow(ctx, xc, yc, radius, clockwise, color = '#f43f5e', label = ''){
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.5;

        const startAngle = clockwise ? -Math.PI * 0.8 : Math.PI * 0.8;
        const endAngle = clockwise ? Math.PI * 0.8 : -Math.PI * 0.8;

        ctx.beginPath();
        ctx.arc(xc, yc, radius, startAngle, endAngle, !clockwise);
        ctx.stroke();

        // Punta de flecha en endAngle
        const tipX = xc + radius * Math.cos(endAngle);
        const tipY = yc + radius * Math.sin(endAngle);
        const tangentAngle = endAngle + (clockwise ? Math.PI / 2 : -Math.PI / 2);

        const headLen = 10;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - headLen * Math.cos(tangentAngle - Math.PI / 6), tipY - headLen * Math.sin(tangentAngle - Math.PI / 6));
        ctx.lineTo(tipX - headLen * Math.cos(tangentAngle + Math.PI / 6), tipY - headLen * Math.sin(tangentAngle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        if(label){
            ctx.font = 'bold 11px Segoe UI, sans-serif';
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.fillText(label, xc, yc - radius - 6);
        }
        ctx.restore();
    }

    function drawSupportSymbol(ctx, x, y, support, normalX = 0, normalY = -1){
        if(!support || support === 'free') return;
        ctx.save();

        if(support === 'fixed'){
            // Empotramiento con muro y achurado
            ctx.strokeStyle = '#00f0ff';
            ctx.fillStyle = '#0f172a';
            ctx.lineWidth = 3.5;

            // Determinar orientación de la base: horizontal o vertical
            const isHorizontal = Math.abs(normalX) < 0.5; // Base horizontal
            if(isHorizontal){
                const baseY = y;
                const sign = normalY >= 0 ? -1 : 1; // Hacia abajo si normalY < 0
                ctx.beginPath();
                ctx.moveTo(x - 28, baseY);
                ctx.lineTo(x + 28, baseY);
                ctx.stroke();

                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#38bdf8';
                for(let hx = x - 24; hx <= x + 24; hx += 8){
                    ctx.beginPath();
                    ctx.moveTo(hx, baseY);
                    ctx.lineTo(hx - 8, baseY + 10 * sign);
                    ctx.stroke();
                }
            } else {
                const baseX = x;
                const sign = normalX >= 0 ? -1 : 1;
                ctx.beginPath();
                ctx.moveTo(baseX, y - 28);
                ctx.lineTo(baseX, y + 28);
                ctx.stroke();

                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#38bdf8';
                for(let hy = y - 24; hy <= y + 24; hy += 8){
                    ctx.beginPath();
                    ctx.moveTo(baseX, hy);
                    ctx.lineTo(baseX + 10 * sign, hy + 8);
                    ctx.stroke();
                }
            }
        } else if(support === 'pin'){
            // Articulación fija (triángulo verde con perno)
            ctx.strokeStyle = '#10b981';
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
            ctx.lineWidth = 2.0;

            const triH = 22;
            const triHalfB = 14;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - triHalfB, y + triH);
            ctx.lineTo(x + triHalfB, y + triH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Perno central
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.stroke();

            // Base achurada
            ctx.beginPath();
            ctx.moveTo(x - 18, y + triH);
            ctx.lineTo(x + 18, y + triH);
            ctx.stroke();
            ctx.lineWidth = 1.2;
            for(let bx = x - 15; bx <= x + 15; bx += 6){
                ctx.beginPath();
                ctx.moveTo(bx, y + triH);
                ctx.lineTo(bx - 5, y + triH + 6);
                ctx.stroke();
            }
        } else if(support === 'rollerY'){
            // Rodillo sobre piso horizontal (permite Ux, restringe Uy)
            ctx.strokeStyle = '#fbbf24';
            ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
            ctx.lineWidth = 2.0;

            const triH = 18;
            const triHalfB = 13;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - triHalfB, y + triH);
            ctx.lineTo(x + triHalfB, y + triH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2 Ruedas
            const rRad = 4;
            const rY = y + triH + rRad;
            ctx.beginPath();
            ctx.arc(x - 7, rY, rRad, 0, Math.PI * 2);
            ctx.arc(x + 7, rY, rRad, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.stroke();

            // Guía horizontal
            ctx.beginPath();
            ctx.moveTo(x - 18, rY + rRad + 1);
            ctx.lineTo(x + 18, rY + rRad + 1);
            ctx.stroke();
        } else if(support === 'rollerX'){
            // Rodillo sobre pared vertical (restringe Ux, permite Uy)
            ctx.strokeStyle = '#fbbf24';
            ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
            ctx.lineWidth = 2.0;

            const triH = 18;
            const triHalfB = 13;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - triH, y - triHalfB);
            ctx.lineTo(x - triH, y + triHalfB);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            const rRad = 4;
            const rX = x - triH - rRad;
            ctx.beginPath();
            ctx.arc(rX, y - 7, rRad, 0, Math.PI * 2);
            ctx.arc(rX, y + 7, rRad, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(rX - rRad - 1, y - 18);
            ctx.lineTo(rX - rRad - 1, y + 18);
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * Renderiza el Canvas interactivo completo del pórtico 2D
     */
    function renderFrame(canvas, model, result, options = {}){
        if(!canvas || !model) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        const nodes = model.nodes || [];
        const bars = model.bars || [];
        if(nodes.length === 0) return;

        const selectedBarIdx = (options.selectedBar || 1) - 1;
        const showDeformed = options.showDeformed !== false;
        const deformScale = Number(options.deformScale || 0); // 0 = auto
        const unitMode = options.unitMode || 'm'; // 'm' o 'cm'
        const scaleDist = unitMode === 'm' ? 0.01 : 1.0;
        const unitSuffix = unitMode === 'm' ? 'm' : 'cm';

        ctx.clearRect(0, 0, W, H);

        // Fondo oscuro de cuadrícula de ingeniería
        ctx.fillStyle = '#060911';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        const gridStep = 40;
        for(let gx = 0; gx < W; gx += gridStep){
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
        }
        for(let gy = 0; gy < H; gy += gridStep){
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
        }

        // Bounding box en coordenadas del modelo (cm)
        const xs = nodes.map(n => Number(n.x));
        const ys = nodes.map(n => Number(n.y));
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);

        const spanX = maxX - minX || 200;
        const spanY = maxY - minY || 200;

        // Márgenes en px
        const padX = 140, padY = 120;
        const scaleX = (W - 2 * padX) / spanX;
        const scaleY = (H - 2 * padY) / spanY;
        const scale = Math.min(scaleX, scaleY);

        const cx_model = (minX + maxX) / 2;
        const cy_model = (minY + maxY) / 2;

        const panX = options.panX || 0;
        const panY = options.panY || 0;
        const zoom = options.zoom || 1.0;

        function toScreen(x_cm, y_cm){
            return {
                x: W / 2 + (x_cm - cx_model) * scale * zoom + panX,
                y: H / 2 - (y_cm - cy_model) * scale * zoom + panY
            };
        }

        const byId = new Map(nodes.map(n => [Number(n.id), n]));

        // Factor de amplificación de deformada
        let ampFactor = 1.0;
        if(result && result.bars){
            const maxDisp = Math.max(1e-9, ...result.bars.flatMap(b => (b.samples || []).map(p => Math.hypot(p.ux, p.uy))));
            if(deformScale > 0){
                ampFactor = deformScale;
            } else {
                ampFactor = Math.min(300, Math.max(1, (spanX * 0.12) / maxDisp));
            }
        }

        // 1. DIBUJAR BARRAS ORIGINALES
        bars.forEach((b, idx) => {
            const n1 = byId.get(Number(b.from));
            const n2 = byId.get(Number(b.to));
            if(!n1 || !n2) return;

            const p1 = toScreen(n1.x, n1.y);
            const p2 = toScreen(n2.x, n2.y);
            const isSelected = idx === selectedBarIdx;

            // Sombra de resaltado si está seleccionada
            if(isSelected){
                ctx.save();
                ctx.strokeStyle = '#00f0ff';
                ctx.lineWidth = 10;
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 18;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
                ctx.restore();
            }

            // Barra principal en azul cian fuerte
            ctx.save();
            ctx.strokeStyle = isSelected ? '#ffffff' : '#38bdf8';
            ctx.lineWidth = isSelected ? 4.5 : 3.5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.restore();

            // Flecha de dirección de barra (morada)
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            if(len > 40){
                const uX = dx / len, uY = dy / len;
                drawLineArrow(ctx, midX - uX * 16, midY - uY * 16, midX + uX * 16, midY + uY * 16, '#c084fc', 2.2, 10);
            }

            // Recuadro rojo de enumeración de barra [1], [2], etc.
            const perpX = -dy / (len || 1);
            const perpY = dx / (len || 1);
            const badgeOffset = 22;
            const bx = midX + perpX * badgeOffset;
            const by = midY + perpY * badgeOffset;

            ctx.save();
            ctx.fillStyle = '#dc2626'; // Rojo cátedra
            ctx.strokeStyle = '#f87171';
            ctx.lineWidth = 1.2;
            const bTxt = `[${idx + 1}]`;
            ctx.font = 'bold 11px Consolas, monospace';
            const bWidth = ctx.measureText(bTxt).width + 8;
            ctx.beginPath();
            ctx.rect(bx - bWidth / 2, by - 9, bWidth, 18);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(bTxt, bx, by);

            // Cota de longitud en metros o cm
            const L_real = Math.hypot(n2.x - n1.x, n2.y - n1.y);
            const lTxt = `${fmtClean(L_real * scaleDist, 2)} ${unitSuffix}`;
            ctx.font = 'bold 10.5px Segoe UI, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(lTxt, bx, by + 16);
            ctx.restore();

            // Cargas distribuidas dibujadas sobre la barra
            const q0 = Number(b.q0 || 0);
            const q1 = Number(b.q1 !== undefined && b.q1 !== null && b.q1 !== '' ? b.q1 : q0);
            if(Math.abs(q0) > 1e-6 || Math.abs(q1) > 1e-6){
                ctx.save();
                ctx.strokeStyle = '#fbbf24';
                ctx.fillStyle = '#fbbf24';
                ctx.lineWidth = 1.6;

                const nArrows = 7;
                const arrowH = 26;
                const dir = b.dir || 'globalDown';

                // Vector unitario de carga
                let qDirX = 0, qDirY = 1; // hacia abajo
                if(dir === 'globalX' || dir === 'globalX_right') { qDirX = 1; qDirY = 0; }
                else if(dir === 'globalX_left') { qDirX = -1; qDirY = 0; }
                else if(dir === 'globalUp') { qDirX = 0; qDirY = -1; }
                else if(dir === 'localY') { qDirX = perpX; qDirY = perpY; }

                for(let k = 0; k < nArrows; k++){
                    const t = k / (nArrows - 1);
                    const q_cur = q0 + (q1 - q0) * t;
                    if(Math.abs(q_cur) < 1e-6) continue;

                    const sx = p1.x + dx * t;
                    const sy = p1.y + dy * t;
                    const ex = sx - qDirX * arrowH;
                    const ey = sy - qDirY * arrowH;

                    drawLineArrow(ctx, ex, ey, sx, sy, '#fbbf24', 1.8, 8);
                }

                // Línea superior conectora de carga
                const s1x = p1.x - qDirX * arrowH, s1y = p1.y - qDirY * arrowH;
                const s2x = p2.x - qDirX * arrowH, s2y = p2.y - qDirY * arrowH;
                ctx.beginPath();
                ctx.moveTo(s1x, s1y);
                ctx.lineTo(s2x, s2y);
                ctx.stroke();

                // Etiqueta de valor de carga distribuida
                const qLabel = `q = ${fmtClean(q0 * (unitMode === 'm' ? 100 : 1), 1)} kgf/${unitSuffix}`;
                ctx.font = 'bold 10px Segoe UI, sans-serif';
                ctx.fillStyle = '#fef08a';
                ctx.textAlign = 'center';
                ctx.fillText(qLabel, (s1x + s2x) / 2, (s1y + s2y) / 2 - 6);
                ctx.restore();
            }
        });

        // 2. DIBUJAR DEFORMADA ANALÍTICA (SI EXISTE RESULTADO Y ESTÁ ACTIVADA)
        if(showDeformed && result && result.bars){
            ctx.save();
            ctx.strokeStyle = '#00ff88'; // Verde neón
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 8;

            result.bars.forEach(el => {
                const samples = el.samples || [];
                if(samples.length === 0) return;

                const n1 = byId.get(el.n1);
                ctx.beginPath();
                samples.forEach((pt, sIdx) => {
                    const x_def = n1.x + el.c * pt.x + pt.ux * ampFactor;
                    const y_def = n1.y + el.s * pt.x + pt.uy * ampFactor;
                    const sPt = toScreen(x_def, y_def);
                    if(sIdx === 0) ctx.moveTo(sPt.x, sPt.y);
                    else ctx.lineTo(sPt.x, sPt.y);
                });
                ctx.stroke();
            });
            ctx.restore();
        }

        // 3. DIBUJAR APOYOS EN NUDOS
        nodes.forEach(n => {
            const p = toScreen(n.x, n.y);
            drawSupportSymbol(ctx, p.x, p.y, n.support);
        });

        // 4. DIBUJAR NUDOS, CARGAS PUNTUALES Y MOMENTOS
        nodes.forEach((n, idx) => {
            const p = toScreen(n.x, n.y);

            // Cargas puntuales Fx, Fy
            const fx = Number(n.fx || 0);
            const fy = Number(n.fy || 0);
            const arrowLen = 38;

            if(Math.abs(fx) > 1e-4){
                const signX = fx > 0 ? 1 : -1;
                const startX = p.x - signX * arrowLen;
                drawLineArrow(ctx, startX, p.y, p.x, p.y, '#f59e0b', 2.8, 11);
                ctx.font = 'bold 11px Segoe UI, sans-serif';
                ctx.fillStyle = '#fde047';
                ctx.textAlign = signX > 0 ? 'right' : 'left';
                ctx.fillText(`Fx=${fmtClean(fx)} kgf`, startX - signX * 4, p.y - 6);
            }

            if(Math.abs(fy) > 1e-4){
                const signY = fy > 0 ? -1 : 1; // Fy>0 sube (y pantalla baja)
                const startY = p.y - signY * arrowLen;
                drawLineArrow(ctx, p.x, startY, p.x, p.y, '#f59e0b', 2.8, 11);
                ctx.font = 'bold 11px Segoe UI, sans-serif';
                ctx.fillStyle = '#fde047';
                ctx.textAlign = 'center';
                ctx.fillText(`Fy=${fmtClean(fy)} kgf`, p.x, startY - signY * 6);
            }

            // Momento concentrado Mz
            const mz = Number(n.mz || 0);
            if(Math.abs(mz) > 1e-4){
                const clockwise = mz < 0; // Negativo es horario
                const mLabel = `M=${fmtClean(Math.abs(mz) * (unitMode === 'm' ? 0.01 : 1), 1)} kgf·${unitSuffix}`;
                drawCurvedMomentArrow(ctx, p.x, p.y, 28, clockwise, '#f43f5e', mLabel);
            }

            // Círculo verde de nudo (1)..(N) oficial
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981'; // Verde esmeralda cátedra
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.0;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10.5px Segoe UI, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(n.id), p.x, p.y);

            // Coordenadas en morado (x; y)
            const coordTxt = `(${fmtClean(n.x * scaleDist, 2)}; ${fmtClean(n.y * scaleDist, 2)})`;
            ctx.font = 'bold 10px Segoe UI, sans-serif';
            ctx.fillStyle = '#c084fc'; // Morado cátedra
            ctx.textAlign = 'center';
            ctx.fillText(coordTxt, p.x, p.y - 18);
            ctx.restore();
        });

        // 5. MARCA DE AGUA Y ESTADÍSTICAS OFICIALES EN ESQUINAS
        ctx.save();
        ctx.font = 'bold 11px Segoe UI, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText("CÁTEDRA ING. ULIANOV CUBA VALENCIA — ANÁLISIS ESTRUCTURAL II", 18, 24);

        if(result && result.equilibrium){
            const isEq = result.equilibrium.isEquilibrium;
            ctx.fillStyle = isEq ? '#34d399' : '#f87171';
            ctx.fillText(isEq ? "✓ EQUILIBRIO GLOBAL COMPROBADO" : "✕ ERROR DE EQUILIBRIO", 18, 42);
        }

        ctx.font = '10px Segoe UI, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'right';
        ctx.fillText(`Escala Deformada: ${fmtClean(ampFactor, 1)}x | Unidad: ${unitMode}`, W - 18, 24);
        ctx.restore();
    }

    /**
     * Descarga la captura de alta resolución del canvas como PNG
     */
    function downloadFramePNG(canvas, filename = 'portico_2d_cerebro_estructural.png'){
        if(!canvas) return;
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    return {
        renderFrame,
        drawSupportSymbol,
        drawLineArrow,
        downloadFramePNG
    };
}));

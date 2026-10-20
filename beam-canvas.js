/**
 * beam-canvas.js — CEREBRO ESTRUCTURAL v4.0 (Edición Vigas - Plantilla Ulianov)
 * Renderizador Gráfico de Alta Precisión en HTML5 Canvas:
 *  1) "6° Gráfica Final" idéntica al formato oficial de cátedra del Ing. Ulianov:
 *     - Enumeración de barras en recuadros rojos [1]..[11] + flechas moradas de dirección
 *     - Enumeración de nudos en círculos verdes (1)..(12)
 *     - Coordenadas en morado (0;0), (2;0), (4;0)...
 *     - Símbolos de apoyos en verde (Fijo Δ, Rodillo Δ+o, Empotrado)
 *     - Grados de libertad globales por nudo (UnX, UnY, Unθ) con flechas de bloque 3D
 *     - Cargas puntuales verticales, cargas oblicuas con triángulo de pendiente (3, 4),
 *       momentos concentrados curvos (800 Kgf.m) y cargas distribuidas q
 *     - Línea de cotas inferior con longitudes de cada tramo (2 m | 2 m | 4 m ...)
 *     - Exportación en 1 clic a imagen PNG de Ultra-Alta Resolución (Fondo Blanco)
 *  2) Visor Geométrico de Sección Transversal Universal y Teorema de Steiner en vivo.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.BeamCanvas = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function fmtClean(num, maxDec = 2) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        const rounded = Number(Math.round(num + 'e' + maxDec) + 'e-' + maxDec);
        return String(rounded);
    }

    /**
     * Dibuja una flecha tipo bloque (doble línea rellena) estilo PowerPoint/Ingeniero
     */
    function drawBlockArrow(ctx, x1, y1, x2, y2, shaftW, headW, headL, fillStyle, strokeStyle) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;
        const angle = Math.atan2(dy, dx);

        ctx.save();
        ctx.translate(x1, y1);
        ctx.rotate(angle);

        const sL = Math.max(0, len - headL);
        const hw = shaftW / 2.0;
        const hhw = headW / 2.0;

        ctx.beginPath();
        ctx.moveTo(0, -hw);
        ctx.lineTo(sL, -hw);
        ctx.lineTo(sL, -hhw);
        ctx.lineTo(len, 0);
        ctx.lineTo(sL, hhw);
        ctx.lineTo(sL, hw);
        ctx.lineTo(0, hw);
        ctx.closePath();

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = 1.4;
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * Dibuja el clúster de 3 Grados de Libertad (UnX, UnY, Unθ) de un nudo nNum
     * exactamente con el estilo de flechas de bloque y cinta curva 3D de la diapositiva del ingeniero
     */
    function drawNodeDOFCluster(ctx, cx, cy, nNum) {
        ctx.save();

        const fillArrow = '#d9e5f3';
        const fillCurveDark = '#95b3d7';
        const strokeBlue = '#385d8a';

        // 1. Flecha vertical UnY (a la izquierda del clúster, apuntando hacia arriba)
        const vx = cx - 22;
        const vy1 = cy + 16;
        const vy2 = cy - 30;
        drawBlockArrow(ctx, vx, vy1, vx, vy2, 5, 11, 9, fillArrow, strokeBlue);

        ctx.font = 'bold 11px "Segoe UI", Calibri, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(`U${nNum}Y`, vx, vy2 - 5);

        // 2. Flecha horizontal UnX (en la base del clúster, apuntando a la derecha)
        const hx1 = cx - 14;
        const hx2 = cx + 22;
        const hy = cy + 25;
        drawBlockArrow(ctx, hx1, hy, hx2, hy, 5, 11, 9, fillArrow, strokeBlue);

        ctx.textAlign = 'left';
        ctx.fillText(`U${nNum}X`, hx2 + 4, hy + 4);

        // 3. Flecha curva 3D Unθ (en el centro-derecha del clúster, giro antihorario hacia arriba-izquierda)
        const rIn = 11;
        const rOut = 17;
        const arcCx = cx - 2;
        const arcCy = cy - 5;

        // Parte inferior de la cinta curva
        ctx.beginPath();
        ctx.arc(arcCx, arcCy, rOut, 0.45 * Math.PI, -0.15 * Math.PI, true);
        ctx.arc(arcCx, arcCy + 4, rIn, -0.15 * Math.PI, 0.45 * Math.PI, false);
        ctx.closePath();
        ctx.fillStyle = fillCurveDark;
        ctx.fill();
        ctx.strokeStyle = strokeBlue;
        ctx.lineWidth = 1.3;
        ctx.stroke();

        // Parte superior de la cinta curva con punta de flecha hacia la izquierda-arriba
        ctx.beginPath();
        ctx.arc(arcCx, arcCy, rOut, 0.05 * Math.PI, -0.58 * Math.PI, true);
        const tipAngle = -0.78 * Math.PI;
        const baseAngle = -0.58 * Math.PI;
        const rMid = (rIn + rOut) / 2.0;
        ctx.lineTo(arcCx + (rOut + 4) * Math.cos(baseAngle), arcCy + (rOut + 4) * Math.sin(baseAngle));
        ctx.lineTo(arcCx + rMid * Math.cos(tipAngle), arcCy + rMid * Math.sin(tipAngle));
        ctx.lineTo(arcCx + Math.max(2, rIn - 4) * Math.cos(baseAngle), arcCy + Math.max(2, rIn - 4) * Math.sin(baseAngle));
        ctx.arc(arcCx, arcCy, rIn, -0.58 * Math.PI, 0.05 * Math.PI, false);
        ctx.closePath();
        ctx.fillStyle = fillArrow;
        ctx.fill();
        ctx.strokeStyle = strokeBlue;
        ctx.lineWidth = 1.3;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(`U${nNum}θ`, arcCx + 10, vy2 - 2);

        ctx.restore();
    }

    /**
     * Dibuja una línea con punta de flecha abierta o rellena
     */
    function drawLineArrow(ctx, x1, y1, x2, y2, color, lineWidth = 2.5, headLen = 11) {
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
        ctx.lineTo(x2 - headLen * (0.65) * Math.cos(angle), y2 - headLen * (0.65) * Math.sin(angle));
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /**
     * Dibuja el apoyo de un nudo (FIJO, RODILLO, EMPOTRADO, RODILLO_V) en verde (#00994d)
     */
    function drawSupportSymbol(ctx, x, y, cond) {
        if (!cond || cond === 'LIBRE') return;
        ctx.save();
        const greenStroke = '#00994d';
        ctx.strokeStyle = greenStroke;
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2.0;

        const triH = 24;
        const triHalfB = 13;

        if (cond === 'FIJO') {
            ctx.beginPath();
            ctx.moveTo(x, y + 2);
            ctx.lineTo(x - triHalfB, y + 2 + triH);
            ctx.lineTo(x + triHalfB, y + 2 + triH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (cond === 'RODILLO') {
            ctx.beginPath();
            ctx.moveTo(x, y + 2);
            ctx.lineTo(x - triHalfB, y + 2 + triH);
            ctx.lineTo(x + triHalfB, y + 2 + triH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Círculo verde debajo del triángulo (exactamente como Nudo 3 del ingeniero)
            const rCirc = 7.5;
            ctx.beginPath();
            ctx.arc(x, y + 2 + triH + rCirc + 1, rCirc, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (cond === 'EMPOTRADO') {
            // Muro vertical verde con achurado
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.moveTo(x, y - 26);
            ctx.lineTo(x, y + 26);
            ctx.stroke();
            ctx.lineWidth = 1.6;
            for (let sy = y - 22; sy <= y + 22; sy += 8) {
                ctx.beginPath();
                ctx.moveTo(x, sy);
                ctx.lineTo(x - 10, sy + 7);
                ctx.stroke();
            }
        } else if (cond === 'RODILLO_V') {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 20, y - 11);
            ctx.lineTo(x - 20, y + 11);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x - 26, y, 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * Renderiza la "6° Gráfica Final" completa en el canvas indicado
     * options: { unitMode: 'm' | 'cm', showDOFs: true, showLoads: true, showDimensions: true }
     */
    function renderGraficaFinal(canvas, solverResult, options = {}) {
        if (!canvas || !solverResult) return;
        const unitMode = options.unitMode || 'm'; // 'm' muestra (2;0) y 2 m como en el PDF; 'cm' muestra (200;0) y 200 cm
        const scaleUnit = unitMode === 'm' ? 0.01 : 1.0;
        const unitSuffix = unitMode === 'm' ? 'm' : 'cm';

        const dpr = window.devicePixelRatio || 2;
        const logicalW = options.width || 1180;
        const logicalH = options.height || 540;

        canvas.width = logicalW * dpr;
        canvas.height = logicalH * dpr;
        canvas.style.width = '100%';
        canvas.style.maxWidth = logicalW + 'px';
        canvas.style.height = 'auto';

        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.scale(dpr, dpr);

        // 1. Fondo blanco limpio para dibujo técnico sin marcas ajenas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, logicalW, logicalH);

        // Distribuidor anticolisiones: recoloca textos sin alterar geometría ni resultados.
        const baseFillText = ctx.fillText.bind(ctx);
        const occupiedLabels = [];
        ctx.fillText = function (value, x, y, maxWidth) {
            const label = String(value);
            const metrics = ctx.measureText(label);
            const w = Math.max(1, Math.min(metrics.width, typeof maxWidth === 'number' ? maxWidth : metrics.width));
            const fs = parseFloat(ctx.font.match(/([0-9.]+)px/)?.[1] || '15');
            const hh = fs * 1.28;
            const align = ctx.textAlign;
            const estimate = (px, py) => ({
                x: px - (align === 'center' ? w / 2 : align === 'right' || align === 'end' ? w : 0) - 3,
                y: py - hh * .88 - 3, w: w + 6, h: hh + 6
            });
            const overlaps = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
            const offsets = [[0,0],[0,-24],[0,24],[0,-48],[0,48],[-36,-24],[36,-24],[-36,24],[36,24],[0,-72],[0,72],[-70,0],[70,0],[-70,-48],[70,-48],[-105,24],[105,24]];
            let chosen = null, cost = Infinity;
            for (const [dx,dy] of offsets) {
                const p=estimate(x+dx,y+dy);
                const collision=occupiedLabels.reduce((n,b)=>n+(overlaps(p,b)?1:0),0);
                const outside=p.x<8||p.x+p.w>logicalW-8||p.y<78||p.y+p.h>logicalH-8;
                const score=collision*10000+(outside?20000:0)+Math.abs(dx)+Math.abs(dy);
                if(score<cost){cost=score;chosen={dx,dy,p};}
                if(score===0)break;
            }
            if(chosen){
                occupiedLabels.push(chosen.p);
                return maxWidth === undefined ? baseFillText(label,x+chosen.dx,y+chosen.dy) :
                    baseFillText(label,x+chosen.dx,y+chosen.dy,maxWidth);
            }
        };
        const activeBars = solverResult.barsTable.filter(b => b.active);
        const activeNodes = solverResult.nodesTable.filter(n => n.active);

        if (activeBars.length === 0 || activeNodes.length === 0) {
            ctx.font = 'bold 16px "Segoe UI", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'center';
            ctx.fillText('Ingresa al menos 1 tramo activo para generar la 6° Gráfica Final.', logicalW / 2, logicalH / 2);
            ctx.restore();
            return;
        }

        // Construir coordenadas (x, y) de cada nudo activo a partir de las barras activas
        const nodeCoords = {};
        activeBars.forEach((b, idx) => {
            if (idx === 0) {
                nodeCoords[b.barNum] = { x: b.xi, y: b.yi };
            }
            nodeCoords[b.barNum + 1] = { x: b.xf, y: b.yf };
        });

        const xs = Object.values(nodeCoords).map(p => p.x);
        const ys = Object.values(nodeCoords).map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const spanX = Math.max(1.0, maxX - minX);
        const spanY = maxY - minY;

        // Región de dibujo de la viga
        const padLeft = 205;
        const padRight = 185;
        const drawW = logicalW - padLeft - padRight;
        const beamBaseY = 278;

        function toScreen(xVal, yVal) {
            const sx = padLeft + ((xVal - minX) / spanX) * drawW;
            const sy = spanY > 1e-3
                ? (beamBaseY + 40 - ((yVal - minY) / Math.max(spanX, spanY)) * (drawW * 0.45))
                : beamBaseY;
            return { x: sx, y: sy };
        }

        // 2. Dibujar Cargas Distribuidas q (si alguna barra tiene q != 0)
        activeBars.forEach(b => {
            const p1 = toScreen(b.xi, b.yi);
            const p2 = toScreen(b.xf, b.yf);
            if (Math.abs(b.q) > 1e-9) {
                ctx.save();
                const qColor = '#0070c0';
                const qH = 38 * Math.sign(b.q);
                const topY1 = p1.y - qH;
                const topY2 = p2.y - qH;

                ctx.fillStyle = 'rgba(0, 112, 192, 0.08)';
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y - 3);
                ctx.lineTo(p1.x, topY1);
                ctx.lineTo(p2.x, topY2);
                ctx.lineTo(p2.x, p2.y - 3);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = qColor;
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.moveTo(p1.x, topY1);
                ctx.lineTo(p2.x, topY2);
                ctx.stroke();

                const numArrows = Math.max(4, Math.min(9, Math.floor(Math.abs(p2.x - p1.x) / 22)));
                for (let k = 0; k <= numArrows; k++) {
                    const t = k / numArrows;
                    const ax = p1.x + t * (p2.x - p1.x);
                    const ayTop = topY1 + t * (topY2 - topY1);
                    const ayBot = p1.y + t * (p2.y - p1.y) - 4;
                    if (b.q > 0) drawLineArrow(ctx, ax, ayTop, ax, ayBot, qColor, 1.6, 7);
                    else drawLineArrow(ctx, ax, ayBot, ax, ayTop, qColor, 1.6, 7);
                }

                const qDisp = b.q_unit === 'kgf/m' ? fmtClean(b.q_input, 2) + ' kgf/m' : (unitMode === 'm' ? fmtClean(b.q * 100, 2) + ' kgf/m' : fmtClean(b.q, 2) + ' kgf/cm');
                ctx.font = 'bold 12.5px "Calibri", "Segoe UI", sans-serif';
                ctx.fillStyle = qColor;
                ctx.textAlign = 'center';
                ctx.fillText(`q = ${qDisp}`, (p1.x + p2.x) / 2, (b.q > 0 ? Math.min(topY1, topY2) - 7 : Math.max(topY1, topY2) + 18));
                ctx.restore();
            }

            // Carga puntual en el interior del tramo (P_tramo != 0)
            if (Math.abs(b.P_tramo) > 1e-9) {
                const a_eff = b.a_dist > 0 ? b.a_dist : (b.L / 2.0);
                const ratio = Math.min(1, Math.max(0, a_eff / b.L));
                const px = p1.x + ratio * (p2.x - p1.x);
                const py = p1.y + ratio * (p2.y - p1.y);
                drawLineArrow(ctx, px, py - 95, px, py - 4, '#0070c0', 2.4, 11);
                ctx.font = 'bold 13.5px "Calibri", "Segoe UI", sans-serif';
                ctx.fillStyle = '#0070c0';
                ctx.textAlign = 'left';
                ctx.fillText(`${fmtClean(Math.abs(b.P_tramo))} Kgf`, px + 6, py - 72);
            }
        });

        // 3. Dibujar la Viga Principal (Línea negra gruesa)
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5.0;
        ctx.lineCap = 'butt';
        activeBars.forEach(b => {
            const p1 = toScreen(b.xi, b.yi);
            const p2 = toScreen(b.xf, b.yf);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        });
        ctx.restore();

        // 4. Dibujar Enumeración de Barras [1]..[11] en recuadro rojo + flecha morada debajo
        activeBars.forEach(b => {
            const p1 = toScreen(b.xi, b.yi);
            const p2 = toScreen(b.xf, b.yf);
            const midX = (p1.x + p2.x) / 2.0;
            const midY = (p1.y + p2.y) / 2.0;

            const hasQ = Math.abs(b.q) > 1e-9;
            const boxW = 36;
            const boxH = 29;
            const boxX = midX - boxW / 2.0;
            const boxY = hasQ ? (midY - 96) : (midY - 48);

            // Recuadro rojo con fondo blanco
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2.4;
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeRect(boxX, boxY, boxW, boxH);

            // Número de barra en rojo negrita
            ctx.font = 'bold 16px "Calibri", "Segoe UI", sans-serif';
            ctx.fillStyle = '#ff0000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(b.barNum), midX, boxY + boxH / 2.0 + 1);

            // Flecha morada de dirección debajo del recuadro rojo
            const arrY = boxY + boxH + 7;
            drawBlockArrow(ctx, midX - 18, arrY, midX + 20, arrY, 4.5, 10, 8, '#7030a0', '#7030a0');
            ctx.restore();
        });

        // 5. Dibujar Apoyos, Nudos (Círculos Verdes), Coordenadas Moradas y Grados de Libertad (UnX, UnY, Unθ)
        const totalN = activeNodes.length;
        activeNodes.forEach((nd, idx) => {
            const nNum = nd.nodeNum;
            const coord = nodeCoords[nNum] || { x: 0, y: 0 };
            const pt = toScreen(coord.x, coord.y);

            // 5A. Símbolo de apoyo en verde debajo del nudo
            drawSupportSymbol(ctx, pt.x, pt.y, nd.cond);

            // 5B. Posición del círculo verde del nudo y su coordenada morada
            // En la gráfica del ingeniero:
            // - Nudos impares (1, 3, 5, 7) o con apoyo tienen el círculo verde ARRIBA de la viga
            // - Nudos pares libres (2, 4, 6) tienen el círculo verde DEBAJO de la viga
            const isFirst = idx === 0;
            const isLast = idx === totalN - 1;
            const hasSupport = nd.cond && nd.cond !== 'LIBRE';
            const hasDownLoad = (nd.Py_dir !== undefined && nd.Py_dir < -1e-9);
            const placeCircleAbove = hasSupport || (!hasDownLoad && (isFirst || isLast || (nNum % 2 === 1)));

            const circleR = 16.5;
            let cX = pt.x;
            let cY = placeCircleAbove ? (pt.y - 25) : (pt.y + 30);
            if (isFirst) {
                cX = pt.x - 22;
                cY = pt.y - 22;
            } else if (isLast) {
                cX = pt.x + 12;
                cY = pt.y - 22;
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(cX, cY, circleR, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#008000';
            ctx.lineWidth = 2.0;
            ctx.stroke();

            ctx.font = 'bold 16px "Calibri", "Segoe UI", sans-serif';
            ctx.fillStyle = '#008000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(nNum), cX, cY + 1);
            ctx.restore();

            // 5C. Etiqueta de Coordenadas en Morado (x;y)
            const xDisp = fmtClean(coord.x * scaleUnit, 2);
            const yDisp = fmtClean(coord.y * scaleUnit, 2);
            const coordText = `(${xDisp};${yDisp})`;

            ctx.save();
            ctx.font = 'bold 18px "Calibri", "Segoe UI", sans-serif';
            ctx.fillStyle = '#7030a0';
            ctx.textAlign = 'center';

            let coordX = cX;
            let coordY = placeCircleAbove ? (cY - 24) : (cY + 36);
            if (isFirst) {
                coordX = pt.x - 28;
                coordY = pt.y + 22;
            } else if (isLast) {
                coordX = pt.x + 12;
                coordY = cY - 24;
            }
            ctx.fillText(coordText, coordX, coordY);
            ctx.restore();

            // 5D. Clúster de Grados de Libertad (UnX, UnY, Unθ)
            if (options.showDOFs !== false) {
                let dofCx = pt.x;
                let dofCy = pt.y;
                if (isFirst) {
                    dofCx = pt.x - 108;
                    dofCy = pt.y - 6;
                } else if (isLast) {
                    dofCx = pt.x + 86;
                    dofCy = pt.y - 8;
                } else if (placeCircleAbove) {
                    dofCx = pt.x + 12;
                    dofCy = pt.y - 115;
                } else {
                    dofCx = pt.x - 6;
                    dofCy = pt.y + 112;
                }
                drawNodeDOFCluster(ctx, dofCx, dofCy, nNum);
            }

            // 5E. Cargas Puntuales Directas en el Nudo (Py_dir, Px_dir, Mz_dir)
            if (options.showLoads !== false) {
                // Carga vertical directa Py_dir
                if (Math.abs(nd.Py_dir) > 1e-9) {
                    const isDown = nd.Py_dir < 0;
                    const startY = isDown ? (pt.y - 122) : (pt.y + 110);
                    const endY = isDown ? (pt.y - 4) : (pt.y + 4);
                    drawLineArrow(ctx, pt.x, startY, pt.x, endY, '#0070c0', 2.5, 11);

                    ctx.save();
                    ctx.font = 'bold 14.5px "Calibri", "Segoe UI", sans-serif';
                    ctx.fillStyle = '#0070c0';
                    ctx.textAlign = 'left';
                    ctx.fillText(`${fmtClean(Math.abs(nd.Py_dir))} Kgf`, pt.x + 7, startY + 26);
                    ctx.restore();
                }

                // Carga horizontal directa Px_dir
                if (Math.abs(nd.Px_dir) > 1e-9) {
                    const isRight = nd.Px_dir > 0;
                    const startX = isRight ? (pt.x - 75) : (pt.x + 75);
                    drawLineArrow(ctx, startX, pt.y - 12, pt.x, pt.y - 12, '#0070c0', 2.4, 10);
                    ctx.save();
                    ctx.font = 'bold 13.5px "Calibri", "Segoe UI", sans-serif';
                    ctx.fillStyle = '#0070c0';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${fmtClean(Math.abs(nd.Px_dir))} Kgf`, (startX + pt.x) / 2, pt.y - 20);
                    ctx.restore();
                }

                // Momento concentrado Mz_dir (Arco circular azul envolviendo el nudo como en Nudo 6 del PDF)
                if (Math.abs(nd.Mz_dir) > 1e-9) {
                    ctx.save();
                    const mColor = '#0070c0';
                    const mRadius = 46;
                    const mCenterX = pt.x + 4;
                    const mCenterY = pt.y + 4;

                    ctx.strokeStyle = mColor;
                    ctx.lineWidth = 2.4;
                    ctx.beginPath();
                    // Arco amplio desde arriba-izquierda pasando por la derecha hasta abajo-izquierda
                    const startAng = -0.78 * Math.PI;
                    const endAng = 0.72 * Math.PI;
                    ctx.arc(mCenterX, mCenterY, mRadius, startAng, endAng, false);
                    ctx.stroke();

                    // Punta de flecha en el extremo inferior del arco
                    const tipX = mCenterX + mRadius * Math.cos(endAng);
                    const tipY = mCenterY + mRadius * Math.sin(endAng);
                    const tangAngle = endAng + Math.PI / 2.0;
                    ctx.fillStyle = mColor;
                    ctx.beginPath();
                    ctx.moveTo(tipX, tipY);
                    ctx.lineTo(tipX - 11 * Math.cos(tangAngle - Math.PI / 6), tipY - 11 * Math.sin(tangAngle - Math.PI / 6));
                    ctx.lineTo(tipX - 11 * Math.cos(tangAngle + Math.PI / 6), tipY - 11 * Math.sin(tangAngle + Math.PI / 6));
                    ctx.closePath();
                    ctx.fill();

                    // Texto del momento (en Kgf.m si unitMode==='m', o Kgf.cm si 'cm')
                    const mValDisp = unitMode === 'm'
                        ? `${fmtClean(Math.abs(nd.Mz_dir) / 100.0, 2)} Kgf.m`
                        : `${fmtClean(Math.abs(nd.Mz_dir), 2)} Kgf.cm`;

                    ctx.font = 'bold 14.5px "Calibri", "Segoe UI", sans-serif';
                    ctx.fillStyle = mColor;
                    ctx.textAlign = 'center';
                    ctx.fillText(mValDisp, mCenterX + 8, mCenterY - mRadius - 10);
                    ctx.restore();
                }
            }
        });

        // 6. Dibujar Cargas Puntuales Oblicuas (con su triángulo de pendiente 3:4 exactamente como en Nudo 4)
        if (options.showLoads !== false && solverResult.obliqueTable) {
            solverResult.obliqueTable.filter(ob => ob.active).forEach(ob => {
                const coord = nodeCoords[ob.nudo];
                if (!coord) return;
                const pt = toScreen(coord.x, coord.y);

                const lenArrow = 128;
                const ux = ob.cosA * (ob.dir_x.includes('-X') ? -1 : 1); // dirección de la fuerza
                const uy = ob.sinA * (ob.dir_y.includes('-Y') ? 1 : -1); // en pantalla +Y es hacia abajo

                // El origen de la flecha está en contra del vector de acción para que la punta llegue al nudo
                const startX = pt.x - ux * lenArrow;
                const startY = pt.y - uy * lenArrow;
                const endX = pt.x - ux * 3;
                const endY = pt.y - uy * 3;

                drawLineArrow(ctx, startX, startY, endX, endY, '#0070c0', 2.5, 11);

                // Etiqueta de magnitud (ej. "2500 Kgf")
                ctx.save();
                ctx.font = 'bold 15px "Calibri", "Segoe UI", sans-serif';
                ctx.fillStyle = '#0070c0';
                ctx.textAlign = 'left';
                ctx.fillText(`${fmtClean(Math.abs(ob.P))} Kgf`, startX - 18, startY - 10);

                // Triángulo rectángulo azul de pendiente adosado a la flecha
                const tFrac = 0.52;
                const pA_x = endX + (startX - endX) * 0.25;
                const pA_y = endY + (startY - endY) * 0.25;
                const pB_x = endX + (startX - endX) * (0.25 + tFrac * 0.45);
                const pB_y = endY + (startY - endY) * (0.25 + tFrac * 0.45);

                ctx.beginPath();
                ctx.moveTo(pA_x, pA_y);
                ctx.lineTo(pB_x, pA_y);
                ctx.lineTo(pB_x, pB_y);
                ctx.closePath();
                ctx.fillStyle = '#4f81bd';
                ctx.fill();
                ctx.strokeStyle = '#1f497d';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.font = 'bold 12px "Calibri", "Segoe UI", sans-serif';
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                if (ob.modo === 'PENDIENTE_dx_dy') {
                    ctx.fillText(fmtClean(ob.val1), (pA_x + pB_x) / 2, pA_y + 14);
                    ctx.textAlign = 'left';
                    ctx.fillText(fmtClean(ob.val2), pB_x + 5, (pA_y + pB_y) / 2 + 4);
                } else {
                    ctx.fillText(`${fmtClean(ob.val1)}°`, pB_x + 14, pA_y + 12);
                }
                ctx.restore();
            });
        }

        // 7. Línea de Cotas Inferior con las longitudes de cada tramo (ej. 2 m | 2 m | 4 m | 4 m | 2.5 m | 2.5 m)
        if (options.showDimensions !== false) {
            const dimY = logicalH - 46;
            const tickTop = dimY - 26;
            const tickBot = dimY + 12;

            ctx.save();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.2;

            // Línea horizontal continua
            const firstPt = toScreen(nodeCoords[1].x, nodeCoords[1].y);
            const lastNodeNum = activeNodes[activeNodes.length - 1].nodeNum;
            const lastPt = toScreen(nodeCoords[lastNodeNum].x, nodeCoords[lastNodeNum].y);

            ctx.beginPath();
            ctx.moveTo(firstPt.x - 45, dimY);
            ctx.lineTo(lastPt.x + 65, dimY);
            ctx.stroke();

            // Marcas verticales en cada nudo
            activeNodes.forEach(nd => {
                const c = nodeCoords[nd.nodeNum];
                if (!c) return;
                const p = toScreen(c.x, c.y);
                ctx.beginPath();
                ctx.moveTo(p.x, tickTop);
                ctx.lineTo(p.x, tickBot);
                ctx.stroke();
            });

            // Texto de longitud de cada barra
            ctx.font = 'bold 16.5px "Calibri", "Segoe UI", sans-serif';
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            activeBars.forEach(b => {
                const p1 = toScreen(b.xi, b.yi);
                const p2 = toScreen(b.xf, b.yf);
                const midX = (p1.x + p2.x) / 2.0;
                const lenVal = fmtClean(b.L * scaleUnit, 2);
                ctx.fillText(`${lenVal} ${unitSuffix}`, midX, dimY - 8);
            });

            ctx.restore();
        }

        ctx.fillText = baseFillText;
        ctx.restore();
    }

    /**
     * Descarga el canvas de la "6° Gráfica Final" como archivo PNG de alta resolución
     */
    function downloadGraficaFinalPNG(target, options = {}, filename = 'Viga_Metodo_Rigidez.png') {
        let dataUrl = '';
        if (target && target.tagName === 'CANVAS') {
            dataUrl = target.toDataURL('image/png');
        } else {
            const offCanvas = document.createElement('canvas');
            renderGraficaFinal(offCanvas, target, Object.assign({}, options, { width: 1320, height: 600 }));
            dataUrl = offCanvas.toDataURL('image/png');
        }
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return dataUrl;
    }

    /**
     * Dibuja la vista previa de la Sección Transversal y el Eje Neutro Y_CG (incluyendo Steiner)
     */
    function renderCrossSectionPreview(canvas, secProps) {
        if (!canvas || !secProps) return;
        const dpr = window.devicePixelRatio || 2;
        const W = 280;
        const H = 200;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';

        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#cbd5e1';
        ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

        const st = secProps.sec_type;
        const pad = 28;
        const drawW = W - pad * 2;
        const drawH = H - pad * 2 - 14;

        ctx.fillStyle = '#bae6fd';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.0;

        let maxH = Math.max(1, secProps.h || secProps.b || 50);
        let maxB = Math.max(1, secProps.b || 30);

        if (st === 'T_SECTION' || st === 'SECCION_T') {
            const b_web = Math.max(1, secProps.b || 15);
            const h_web = Math.max(1, secProps.h || 30);
            const b_flange = Math.max(1, secProps.p3 || 50);
            const t_flange = Math.max(1, secProps.p4 || 10);
            const H_tot = h_web + t_flange;
            const maxW = Math.max(b_flange, b_web);
            const scale = Math.min(drawW / maxW, drawH / H_tot) * 0.85;

            const baseY = H - pad - 6;
            const cx = W / 2.0;

            const wFlange = b_flange * scale;
            const hFlange = t_flange * scale;
            const wWeb = b_web * scale;
            const hWeb = h_web * scale;

            // Alma (Web)
            const rxWeb = cx - wWeb / 2.0;
            const ryWeb = baseY - hWeb;
            ctx.fillStyle = '#bae6fd';
            ctx.fillRect(rxWeb, ryWeb, wWeb, hWeb);
            ctx.strokeRect(rxWeb, ryWeb, wWeb, hWeb);

            // Ala Superior (Top Flange)
            const rxFlange = cx - wFlange / 2.0;
            const ryFlange = ryWeb - hFlange;
            ctx.fillRect(rxFlange, ryFlange, wFlange, hFlange);
            ctx.strokeRect(rxFlange, ryFlange, wFlange, hFlange);

            // Eje Neutro Y_CG
            const yCgScreen = baseY - (secProps.Y_CG || (h_web * 0.6)) * scale;
            ctx.strokeStyle = '#dc2626';
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(20, yCgScreen);
            ctx.lineTo(W - 20, yCgScreen);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#dc2626';
            ctx.font = 'bold 10.5px "Segoe UI", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`Ȳ = ${fmtClean(secProps.Y_CG, 2)} cm`, 22, Math.max(14, yCgScreen - 4));
        } else if (st === 'I_SECTION' || st === 'DOBLE_T') {
            const b_flange = Math.max(1, secProps.b || 30);
            const H_tot = Math.max(1, secProps.h || 50);
            const t_flange = Math.max(1, secProps.p3 || 10);
            const t_web = Math.max(1, secProps.p4 || 8);
            const h_web = Math.max(1, H_tot - 2 * t_flange);
            const scale = Math.min(drawW / b_flange, drawH / H_tot) * 0.85;

            const baseY = H - pad - 6;
            const cx = W / 2.0;

            const wFlange = b_flange * scale;
            const hFlange = t_flange * scale;
            const wWeb = t_web * scale;
            const hWeb = h_web * scale;

            // Ala inferior
            ctx.fillStyle = '#bae6fd';
            ctx.fillRect(cx - wFlange / 2.0, baseY - hFlange, wFlange, hFlange);
            ctx.strokeRect(cx - wFlange / 2.0, baseY - hFlange, wFlange, hFlange);

            // Alma
            ctx.fillRect(cx - wWeb / 2.0, baseY - hFlange - hWeb, wWeb, hWeb);
            ctx.strokeRect(cx - wWeb / 2.0, baseY - hFlange - hWeb, wWeb, hWeb);

            // Ala superior
            ctx.fillRect(cx - wFlange / 2.0, baseY - H_tot * scale, wFlange, hFlange);
            ctx.strokeRect(cx - wFlange / 2.0, baseY - H_tot * scale, wFlange, hFlange);

            // Eje Neutro Y_CG
            const yCgScreen = baseY - (secProps.Y_CG || (H_tot / 2.0)) * scale;
            ctx.strokeStyle = '#dc2626';
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(20, yCgScreen);
            ctx.lineTo(W - 20, yCgScreen);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#dc2626';
            ctx.font = 'bold 10.5px "Segoe UI", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`Ȳ = ${fmtClean(secProps.Y_CG, 2)} cm`, 22, Math.max(14, yCgScreen - 4));
        } else if (st === 'STEINER_COMPUESTA' || st === 'STEINER_CUSTOM') {
            const activeRows = (secProps.steiner && secProps.steiner.rows || []).filter(r => r.active);
            if (activeRows.length > 0) {
                maxH = Math.max(1, ...activeRows.map(r => r.y_base + (r.tipo.includes('CIRC') ? r.b : r.h)));
                maxB = Math.max(1, ...activeRows.map(r => Math.max(r.b, r.b_sup || 0)));
            }
            const scale = Math.min(drawW / maxB, drawH / maxH) * 0.85;
            const baseX = W / 2.0;
            const baseY = H - pad - 6;

            activeRows.forEach(r => {
                const isHole = r.tipo.startsWith('HUECO');
                ctx.fillStyle = isHole ? '#f8fafc' : '#93c5fd';
                ctx.strokeStyle = isHole ? '#ef4444' : '#1d4ed8';
                const rw = r.b * scale;
                const rh = (r.tipo.includes('CIRC') ? r.b : r.h) * scale;
                const ry = baseY - (r.y_base * scale) - rh;
                const rx = baseX - rw / 2.0;

                if (r.tipo.includes('CIRC')) {
                    ctx.beginPath();
                    ctx.arc(baseX, ry + rh / 2, rw / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                } else {
                    ctx.fillRect(rx, ry, rw, rh);
                    ctx.strokeRect(rx, ry, rw, rh);
                }
            });

            // Eje Neutro Y_CG
            const yCgScreen = baseY - secProps.Y_CG * scale;
            ctx.strokeStyle = '#dc2626';
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(20, yCgScreen);
            ctx.lineTo(W - 20, yCgScreen);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#dc2626';
            ctx.font = 'bold 10.5px "Segoe UI", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`Ȳ = ${fmtClean(secProps.Y_CG, 2)} cm`, 22, Math.max(14, yCgScreen - 4));
        } else if (st === 'CIRCULAR' || st === 'TUBULAR_CIRCULAR') {
            const R = Math.min(drawW, drawH) * 0.42;
            const cx = W / 2;
            const cy = H / 2 - 4;
            ctx.beginPath();
            ctx.arc(cx, cy, R, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            if (st === 'TUBULAR_CIRCULAR' && secProps.b > 0) {
                const rInt = R * Math.min(0.9, (secProps.h || 0) / secProps.b);
                ctx.fillStyle = '#f8fafc';
                ctx.beginPath();
                ctx.arc(cx, cy, rInt, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        } else if (st === 'TRAPEZOIDAL' || st === 'TRIANGULAR') {
            const bInf = Math.max(1, secProps.b || 30);
            const bSup = st === 'TRIANGULAR' ? 0 : Math.max(0, secProps.p3 || 15);
            const hVal = Math.max(1, secProps.h || 45);
            const scale = Math.min(drawW / Math.max(bInf, bSup), drawH / hVal) * 0.82;
            const baseY = H - pad - 6;
            const topY = baseY - hVal * scale;
            const cx = W / 2;

            ctx.beginPath();
            ctx.moveTo(cx - (bInf * scale) / 2, baseY);
            ctx.lineTo(cx + (bInf * scale) / 2, baseY);
            ctx.lineTo(cx + (bSup * scale) / 2, topY);
            ctx.lineTo(cx - (bSup * scale) / 2, topY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            // RECTANGULAR / CAJON_HUECO / BOX / DIRECTO_A_I
            const bVal = Math.max(1, secProps.b || 25);
            const hVal = Math.max(1, secProps.h || 45);
            const scale = Math.min(drawW / bVal, drawH / hVal) * 0.82;
            const rw = bVal * scale;
            const rh = hVal * scale;
            const rx = (W - rw) / 2;
            const ry = (H - 12 - rh) / 2;
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeRect(rx, ry, rw, rh);

            if ((st === 'CAJON_HUECO' || st === 'BOX') && secProps.p3 > 0 && secProps.p4 > 0) {
                const iw = Math.min(rw - 6, secProps.p3 * scale);
                const ih = Math.min(rh - 6, secProps.p4 * scale);
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect((W - iw) / 2, (H - 12 - ih) / 2, iw, ih);
                ctx.strokeRect((W - iw) / 2, (H - 12 - ih) / 2, iw, ih);
            }

            // Línea de eje neutro
            const yMid = ry + rh / 2;
            ctx.strokeStyle = '#dc2626';
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(rx - 14, yMid);
            ctx.lineTo(rx + rw + 14, yMid);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        const displayIz = secProps.Iz != null ? secProps.Iz : (secProps.I != null ? secProps.I : 0);
        ctx.fillText(`${st}: A=${fmtClean(secProps.A, 1)} cm² | Iz=${fmtClean(displayIz, 1)} cm⁴`, W / 2, H - 7);
        ctx.restore();
    }

    return {
        renderGraficaFinal,
        renderGraficaFinalCanvas: renderGraficaFinal,
        downloadGraficaFinalPNG,
        renderCrossSectionPreview
    };
}));

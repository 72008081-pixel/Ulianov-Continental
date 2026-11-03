/**
 * beam-canvas.js — CEREBRO ESTRUCTURAL v4.0 (Edición Vigas - Plantilla Ulianov)
 * Motor Gráfico de Alta Precisión Arquitectónica para la "6° Gráfica Final":
 *  1) Fondo blanco técnico (#ffffff) con dibujo vectorial estratificado en 5 franjas:
 *     - FRANJA 1 (Top, Y ≈ 65 px): Clústeres de Grados de Libertad (UnX, UnY, Unθ) alineados arriba.
 *     - FRANJA 2 (Cargas, Y ≈ 115-215 px): Cargas distribuidas q (sombreado, flechas y badge), cargas P y momentos.
 *     - FRANJA 3 (Eje y Viga, Y ≈ 220-305 px):
 *         * Badges de tramo [m] en rojo con flechas moradas de dirección.
 *         * Viga continua de acero (#1e293b) con nudos verdes (1)..(N) centrados en el eje.
 *         * Apoyos estructurales (Fijo, Rodillo, Empotrado) dibujados debajo de los nudos.
 *     - FRANJA 4 (Coordenadas, Y ≈ 335 px): Coordenadas en morado (0;0), (300;0)... en fila uniforme.
 *     - FRANJA 5 (Cotas, Y ≈ 390-440 px): Líneas de cota arquitectónicas por tramo y longitud total.
 *  2) Cero superposiciones, cero saltos aleatorios, sin colisiones de texto.
 *  3) Exportación en 1 clic a imagen PNG de Ultra-Alta Resolución.
 *  4) Visor de Sección Transversal Universal y Steiner en vivo.
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
            ctx.lineWidth = 1.3;
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * Dibuja el clúster de 3 Grados de Libertad (UnX, UnY, Unθ) de un nudo nNum
     * en la franja superior (Y ≈ 65), limpio, nítido y perfectamente alineado.
     */
    function drawNodeDOFCluster(ctx, cx, cy, nNum) {
        ctx.save();

        const fillArrow = '#d9e5f3';
        const fillCurveDark = '#95b3d7';
        const strokeBlue = '#385d8a';

        // 1. Flecha vertical UnY (a la izquierda, apuntando hacia arriba)
        const vx = cx - 20;
        const vy1 = cy + 16;
        const vy2 = cy - 26;
        drawBlockArrow(ctx, vx, vy1, vx, vy2, 5, 11, 9, fillArrow, strokeBlue);

        ctx.font = 'bold 11px "Segoe UI", Calibri, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(`U${nNum}Y`, vx, vy2 - 5);

        // 2. Flecha horizontal UnX (en la base, apuntando a la derecha)
        const hx1 = cx - 12;
        const hx2 = cx + 22;
        const hy = cy + 22;
        drawBlockArrow(ctx, hx1, hy, hx2, hy, 5, 11, 9, fillArrow, strokeBlue);

        ctx.textAlign = 'left';
        ctx.fillText(`U${nNum}X`, hx2 + 4, hy + 4);

        // 3. Flecha curva 3D Unθ (giro antihorario)
        const rIn = 11;
        const rOut = 17;
        const arcCx = cx - 1;
        const arcCy = cy - 4;

        ctx.beginPath();
        ctx.arc(arcCx, arcCy, rOut, 0.45 * Math.PI, -0.15 * Math.PI, true);
        ctx.arc(arcCx, arcCy + 4, rIn, -0.15 * Math.PI, 0.45 * Math.PI, false);
        ctx.closePath();
        ctx.fillStyle = fillCurveDark;
        ctx.fill();
        ctx.strokeStyle = strokeBlue;
        ctx.lineWidth = 1.3;
        ctx.stroke();

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
        ctx.fillText(`U${nNum}θ`, arcCx + 11, vy2 - 2);

        ctx.restore();
    }

    /**
     * Dibuja una línea con punta de flecha rellena
     */
    function drawLineArrow(ctx, x1, y1, x2, y2, color, lineWidth = 2.4, headLen = 10) {
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
     * Dibuja el apoyo de un nudo (FIJO, RODILLO, EMPOTRADO) debajo de la viga
     */
    function drawSupportSymbol(ctx, x, y, cond) {
        if (!cond || cond === 'LIBRE') return;
        ctx.save();
        const greenStroke = '#16a34a';
        ctx.strokeStyle = greenStroke;
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2.0;

        const triH = 22;
        const triHalfB = 14;

        if (cond === 'FIJO') {
            // Triángulo de apoyo
            ctx.beginPath();
            ctx.moveTo(x, y + 2);
            ctx.lineTo(x - triHalfB, y + 2 + triH);
            ctx.lineTo(x + triHalfB, y + 2 + triH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Línea de base y achurado a tierra
            const baseY = y + 2 + triH;
            ctx.beginPath();
            ctx.moveTo(x - triHalfB - 6, baseY);
            ctx.lineTo(x + triHalfB + 6, baseY);
            ctx.stroke();

            ctx.lineWidth = 1.4;
            for (let hx = x - triHalfB - 4; hx <= x + triHalfB + 4; hx += 5) {
                ctx.beginPath();
                ctx.moveTo(hx, baseY);
                ctx.lineTo(hx - 5, baseY + 6);
                ctx.stroke();
            }
        } else if (cond === 'RODILLO') {
            // Triángulo superior
            ctx.beginPath();
            ctx.moveTo(x, y + 2);
            ctx.lineTo(x - triHalfB, y + 2 + triH - 8);
            ctx.lineTo(x + triHalfB, y + 2 + triH - 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Dos rodillos (círculos) debajo
            const rY = y + 2 + triH - 4;
            const rCirc = 4.5;
            ctx.beginPath();
            ctx.arc(x - 6, rY, rCirc, 0, Math.PI * 2);
            ctx.arc(x + 6, rY, rCirc, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Línea de base del rodillo
            const baseY = rY + rCirc + 1;
            ctx.beginPath();
            ctx.moveTo(x - triHalfB - 6, baseY);
            ctx.lineTo(x + triHalfB + 6, baseY);
            ctx.stroke();

            ctx.lineWidth = 1.4;
            for (let hx = x - triHalfB - 4; hx <= x + triHalfB + 4; hx += 5) {
                ctx.beginPath();
                ctx.moveTo(hx, baseY);
                ctx.lineTo(hx - 5, baseY + 6);
                ctx.stroke();
            }
        } else if (cond === 'EMPOTRADO') {
            // Muro vertical verde con achurado
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.moveTo(x, y - 24);
            ctx.lineTo(x, y + 24);
            ctx.stroke();
            ctx.lineWidth = 1.5;
            for (let sy = y - 20; sy <= y + 20; sy += 7) {
                ctx.beginPath();
                ctx.moveTo(x, sy);
                ctx.lineTo(x - 9, sy + 6);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    /**
     * Dibuja un badge tipo píldora blanca con borde de color
     */
    function drawPillBadge(ctx, text, cx, cy, strokeColor, textColor, fontSize = 12) {
        ctx.save();
        ctx.font = `bold ${fontSize}px "Segoe UI", Calibri, sans-serif`;
        const metrics = ctx.measureText(text);
        const padX = 8;
        const padY = 4;
        const w = metrics.width + padX * 2;
        const h = fontSize + padY * 2;
        const rx = cx - w / 2;
        const ry = cy - h / 2;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;

        // Rectángulo redondeado
        ctx.beginPath();
        const rad = 4;
        ctx.moveTo(rx + rad, ry);
        ctx.lineTo(rx + w - rad, ry);
        ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + rad);
        ctx.lineTo(rx + w, ry + h - rad);
        ctx.quadraticCurveTo(rx + w, ry + h, rx + w - rad, ry + h);
        ctx.lineTo(rx + rad, ry + h);
        ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - rad);
        ctx.lineTo(rx, ry + rad);
        ctx.quadraticCurveTo(rx, ry, rx + rad, ry);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, cx, cy);
        ctx.restore();
    }

    /**
     * Renderiza la "6° Gráfica Final" completa en el canvas indicado
     * Motor Gráfico Arquitectónico Estratificado en 5 Franjas de Alta Precisión.
     */
    function renderGraficaFinal(canvas, solverResult, options = {}) {
        if (!canvas || !solverResult) return;
        const unitMode = options.unitMode || 'm';
        const scaleUnit = unitMode === 'm' ? 0.01 : 1.0;
        const unitSuffix = unitMode === 'm' ? 'm' : 'cm';

        const activeBars = solverResult.barsTable ? solverResult.barsTable.filter(b => b.active) : [];
        const activeNodes = solverResult.nodesTable ? solverResult.nodesTable.filter(n => n.active) : [];

        const numSpans = activeBars.length;
        const numNodes = activeNodes.length;

        // Dimensiones dinámicas con espacio garantizado por tramo
        const minSpanPx = Math.max(160, Math.min(240, Math.floor(1000 / Math.max(numSpans, 1))));
        const padLeft = 140;
        const padRight = 140;
        const neededW = padLeft + padRight + Math.max(numSpans, 1) * minSpanPx;
        const logicalW = options.width || Math.max(1280, neededW);
        const logicalH = options.height || 500;

        const dpr = window.devicePixelRatio || 2;
        canvas.width = logicalW * dpr;
        canvas.height = logicalH * dpr;
        canvas._logicalW = logicalW;
        canvas._logicalH = logicalH;
        canvas.style.width = '100%';
        canvas.style.maxWidth = logicalW + 'px';
        canvas.style.height = 'auto';

        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.scale(dpr, dpr);

        // 1. Fondo blanco limpio de dibujo técnico
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, logicalW, logicalH);

        if (numSpans === 0 || numNodes === 0) {
            ctx.font = 'bold 16px "Segoe UI", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'center';
            ctx.fillText('Ingresa al menos 1 tramo activo para generar la 6° Gráfica Final.', logicalW / 2, logicalH / 2);
            ctx.restore();
            return;
        }

        // Construir coordenadas (x, y) de cada nudo activo
        const nodeCoords = {};
        activeBars.forEach((b, idx) => {
            if (idx === 0) {
                nodeCoords[b.barNum] = { x: b.xi, y: b.yi };
            }
            nodeCoords[b.barNum + 1] = { x: b.xf, y: b.yf };
        });

        const xs = Object.values(nodeCoords).map(p => p.x);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const spanX = Math.max(1.0, maxX - minX);
        const drawW = logicalW - padLeft - padRight;

        // Cota Y base del eje de la viga
        const beamY = 250;

        function toScreen(xVal, yVal) {
            const sx = padLeft + ((xVal - minX) / spanX) * drawW;
            return { x: sx, y: beamY };
        }

        // =====================================================================
        // FRANJA 1: GRADOS DE LIBERTAD GLOBALES (Y ≈ 65 px)
        // Todos los nudos tienen su clúster GDL alineado uniformemente arriba
        // =====================================================================
        if (options.showDOFs !== false) {
            const dofY = 65;
            activeNodes.forEach(nd => {
                const coord = nodeCoords[nd.nodeNum] || { x: 0, y: 0 };
                const pt = toScreen(coord.x, coord.y);
                drawNodeDOFCluster(ctx, pt.x, dofY, nd.nodeNum);
            });
        }

        // =====================================================================
        // FRANJA 2: CORREDOR DE CARGAS (Y ≈ 115 a 215 px)
        // Cargas distribuidas q, puntuales P, momentos y oblicuas
        // =====================================================================
        if (options.showLoads !== false) {
            // 2A. Cargas distribuidas q
            activeBars.forEach(b => {
                if (Math.abs(b.q) > 1e-9) {
                    const p1 = toScreen(b.xi, b.yi);
                    const p2 = toScreen(b.xf, b.yf);

                    const L_span = Math.hypot(b.xf - b.xi, b.yf - b.yi);
                    const L_dist_eff = (b.L_dist !== undefined && b.L_dist !== null && b.L_dist > 0) ? Math.min(b.L_dist, L_span) : L_span;
                    const t_dist = L_span > 0 ? (L_dist_eff / L_span) : 1;

                    const p2_load_x = p1.x + t_dist * (p2.x - p1.x);
                    const qTopY = 175;
                    const qBotY = beamY - 6;

                    ctx.save();
                    // Sombreado celeste suave en la zona cargada
                    ctx.fillStyle = 'rgba(2, 132, 199, 0.08)';
                    ctx.fillRect(p1.x, qTopY, p2_load_x - p1.x, qBotY - qTopY);

                    // Línea superior de la carga distribuida
                    ctx.strokeStyle = '#0284c7';
                    ctx.lineWidth = 2.0;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, qTopY);
                    ctx.lineTo(p2_load_x, qTopY);
                    ctx.stroke();

                    // Flechas verticales hacia abajo en la carga distribuida
                    const spanDistW = Math.abs(p2_load_x - p1.x);
                    const numArrows = Math.max(3, Math.min(10, Math.floor(spanDistW / 24)));
                    for (let k = 0; k <= numArrows; k++) {
                        const t = k / (numArrows || 1);
                        const ax = p1.x + t * (p2_load_x - p1.x);
                        drawLineArrow(ctx, ax, qTopY, ax, qBotY, '#0284c7', 1.5, 6);
                    }

                    // Badge de valor de la carga distribuida
                    const qNominal = (b.q_input !== undefined && b.q_input !== null && b.q_input !== '' && !isNaN(parseFloat(b.q_input)) && Math.abs(parseFloat(b.q_input)) > 1e-9)
                        ? parseFloat(b.q_input)
                        : (b.q_unit === 'kgf/m' ? (b.q * 100.0) : b.q);
                    const qDisp = (b.q_unit === 'kgf/m')
                        ? fmtClean(qNominal, 2) + ' kgf/m'
                        : fmtClean(b.q, 2) + ' kgf/cm';
                    const lenDisp = (L_dist_eff < L_span) ? ` (L=${fmtClean(L_dist_eff, 0)}cm)` : '';

                    drawPillBadge(ctx, `q = ${qDisp}${lenDisp}`, (p1.x + p2_load_x) / 2, qTopY - 14, '#0284c7', '#0284c7', 11.5);
                    ctx.restore();
                }

                // 2B. Carga puntual en el interior del tramo (P_tramo != 0)
                if (Math.abs(b.P_tramo) > 1e-9) {
                    const p1 = toScreen(b.xi, b.yi);
                    const p2 = toScreen(b.xf, b.yf);
                    const a_eff = b.a_dist > 0 ? b.a_dist : (b.L / 2.0);
                    const ratio = Math.min(1, Math.max(0, a_eff / b.L));
                    const px = p1.x + ratio * (p2.x - p1.x);

                    const pTopY = 145;
                    const pBotY = beamY - 6;
                    drawLineArrow(ctx, px, pTopY, px, pBotY, '#0284c7', 2.4, 10);
                    drawPillBadge(ctx, `${fmtClean(Math.abs(b.P_tramo))} Kgf`, px, pTopY - 12, '#0284c7', '#0284c7', 12);
                }
            });

            // 2C. Cargas directas en nudos (Py, Px, Mz)
            activeNodes.forEach(nd => {
                const coord = nodeCoords[nd.nodeNum] || { x: 0, y: 0 };
                const pt = toScreen(coord.x, coord.y);

                // Carga vertical puntual Py_dir
                if (Math.abs(nd.Py_dir) > 1e-9) {
                    const isDown = nd.Py_dir < 0;
                    const startY = isDown ? 145 : (beamY + 50);
                    const endY = isDown ? (beamY - 16) : (beamY + 16);
                    drawLineArrow(ctx, pt.x, startY, pt.x, endY, '#0284c7', 2.5, 10);
                    drawPillBadge(ctx, `${fmtClean(Math.abs(nd.Py_dir))} Kgf`, pt.x, startY - 12, '#0284c7', '#0284c7', 12);
                }

                // Carga horizontal directa Px_dir
                if (Math.abs(nd.Px_dir) > 1e-9) {
                    const isRight = nd.Px_dir > 0;
                    const startX = isRight ? (pt.x - 55) : (pt.x + 55);
                    drawLineArrow(ctx, startX, beamY, pt.x - (isRight ? 16 : -16), beamY, '#0284c7', 2.2, 9);
                    drawPillBadge(ctx, `${fmtClean(Math.abs(nd.Px_dir))} Kgf`, (startX + pt.x) / 2, beamY - 16, '#0284c7', '#0284c7', 11);
                }

                // Momento concentrado Mz_dir
                if (Math.abs(nd.Mz_dir) > 1e-9) {
                    ctx.save();
                    const mColor = '#0284c7';
                    const mRadius = 32;
                    const mCenterX = pt.x;
                    const mCenterY = beamY;

                    ctx.strokeStyle = mColor;
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    const startAng = -0.75 * Math.PI;
                    const endAng = 0.65 * Math.PI;
                    ctx.arc(mCenterX, mCenterY, mRadius, startAng, endAng, false);
                    ctx.stroke();

                    const tipX = mCenterX + mRadius * Math.cos(endAng);
                    const tipY = mCenterY + mRadius * Math.sin(endAng);
                    const tangAngle = endAng + Math.PI / 2.0;
                    ctx.fillStyle = mColor;
                    ctx.beginPath();
                    ctx.moveTo(tipX, tipY);
                    ctx.lineTo(tipX - 9 * Math.cos(tangAngle - Math.PI / 6), tipY - 9 * Math.sin(tangAngle - Math.PI / 6));
                    ctx.lineTo(tipX - 9 * Math.cos(tangAngle + Math.PI / 6), tipY - 9 * Math.sin(tangAngle + Math.PI / 6));
                    ctx.closePath();
                    ctx.fill();

                    const mValDisp = unitMode === 'm'
                        ? `${fmtClean(Math.abs(nd.Mz_dir) / 100.0, 2)} Kgf·m`
                        : `${fmtClean(Math.abs(nd.Mz_dir), 2)} Kgf·cm`;

                    drawPillBadge(ctx, mValDisp, mCenterX, beamY - mRadius - 12, mColor, mColor, 11);
                    ctx.restore();
                }
            });

            // 2D. Cargas oblicuas con triángulo de pendiente
            if (solverResult.obliqueTable) {
                solverResult.obliqueTable.filter(ob => ob.active).forEach(ob => {
                    const coord = nodeCoords[ob.nudo];
                    if (!coord) return;
                    const pt = toScreen(coord.x, coord.y);

                    const lenArrow = 95;
                    const ux = ob.cosA * (ob.dir_x.includes('-X') ? -1 : 1);
                    const uy = ob.sinA * (ob.dir_y.includes('-Y') ? 1 : -1);

                    const startX = pt.x - ux * lenArrow;
                    const startY = beamY - uy * lenArrow;
                    const endX = pt.x - ux * 16;
                    const endY = beamY - uy * 16;

                    drawLineArrow(ctx, startX, startY, endX, endY, '#0284c7', 2.4, 10);
                    drawPillBadge(ctx, `${fmtClean(Math.abs(ob.P))} Kgf`, startX, startY - 12, '#0284c7', '#0284c7', 12);
                });
            }
        }

        // =====================================================================
        // FRANJA 3A: BADGES DE TRAMO [1]..[N] Y FLECHA MORADA DE DIRECCIÓN
        // Centrados horizontalmente en cada vano, a Y ≈ 224 px
        // =====================================================================
        activeBars.forEach(b => {
            const p1 = toScreen(b.xi, b.yi);
            const p2 = toScreen(b.xf, b.yf);
            const midX = (p1.x + p2.x) / 2.0;

            const boxW = 26;
            const boxH = 20;
            const boxX = midX - boxW / 2.0;
            const boxY = 216;

            ctx.save();
            // Cuadro rojo con fondo blanco
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2.0;
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeRect(boxX, boxY, boxW, boxH);

            ctx.font = 'bold 12.5px "Calibri", "Segoe UI", sans-serif';
            ctx.fillStyle = '#ef4444';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(b.barNum), midX, boxY + boxH / 2.0 + 1);

            // Flecha morada de dirección local (Xi -> Xf)
            const arrY = boxY + boxH + 6;
            drawBlockArrow(ctx, midX - 14, arrY, midX + 16, arrY, 4, 8, 7, '#7e22ce', '#7e22ce');
            ctx.restore();
        });

        // =====================================================================
        // FRANJA 3B: VIGA PRINCIPAL Y NUDOS EN EL EJE (Y = 250 px)
        // La viga es una barra sólida de acero estructural (#1e293b)
        // y los nudos son círculos verdes (1)..(N) centrados en el eje
        // =====================================================================
        const firstPt = toScreen(nodeCoords[1].x, nodeCoords[1].y);
        const lastNodeNum = activeNodes[activeNodes.length - 1].nodeNum;
        const lastPt = toScreen(nodeCoords[lastNodeNum].x, nodeCoords[lastNodeNum].y);

        // Viga principal
        ctx.save();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 6.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(firstPt.x, beamY);
        ctx.lineTo(lastPt.x, beamY);
        ctx.stroke();
        ctx.restore();

        // Nudos centrados en el eje de la viga
        canvas._nodeHitboxes = [];
        activeNodes.forEach((nd, idx) => {
            const nNum = nd.nodeNum;
            const coord = nodeCoords[nNum] || { x: 0, y: 0 };
            const pt = toScreen(coord.x, coord.y);

            // Hitbox interactiva para clics
            canvas._nodeHitboxes.push({
                nodeNum: nNum,
                nodeIdx: idx,
                x: pt.x,
                y: beamY,
                cond: nd.cond,
                radius: 22
            });

            // Círculo verde con fondo blanco opaco (corta limpiamente la viga detrás)
            const circleR = 15;
            ctx.save();
            ctx.beginPath();
            ctx.arc(pt.x, beamY, circleR, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 2.4;
            ctx.stroke();

            ctx.font = 'bold 13px "Calibri", "Segoe UI", sans-serif';
            ctx.fillStyle = '#16a34a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(nNum), pt.x, beamY + 1);
            ctx.restore();
        });

        // =====================================================================
        // FRANJA 3C: SÍMBOLOS DE APOYOS EN NUDOS (Y ≈ 266 a 300 px)
        // =====================================================================
        activeNodes.forEach(nd => {
            const coord = nodeCoords[nd.nodeNum] || { x: 0, y: 0 };
            const pt = toScreen(coord.x, coord.y);
            drawSupportSymbol(ctx, pt.x, beamY + 15, nd.cond);
        });

        // =====================================================================
        // FRANJA 4: COORDENADAS DE NUDOS EN MORADO (Y = 335 px)
        // Alineadas en una fila horizontal uniforme sin superposiciones
        // =====================================================================
        activeNodes.forEach(nd => {
            const coord = nodeCoords[nd.nodeNum] || { x: 0, y: 0 };
            const pt = toScreen(coord.x, coord.y);
            const xDisp = fmtClean(coord.x * scaleUnit, 2);
            const yDisp = fmtClean(coord.y * scaleUnit, 2);
            const coordText = `(${xDisp};${yDisp})`;

            ctx.save();
            ctx.font = 'bold 13px "Calibri", "Segoe UI", sans-serif';
            ctx.fillStyle = '#7e22ce';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(coordText, pt.x, 335);
            ctx.restore();
        });

        // =====================================================================
        // FRANJA 5: LÍNEAS DE COTAS ARQUITECTÓNICAS (Y ≈ 390 a 440 px)
        // 5A: Longitudes de cada tramo individual
        // 5B: Longitud total acumulada
        // =====================================================================
        if (options.showDimensions !== false) {
            const dimY = 390;
            const tickTop = dimY - 14;
            const tickBot = dimY + 14;

            ctx.save();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.8;

            // Línea horizontal de cotas
            ctx.beginPath();
            ctx.moveTo(firstPt.x, dimY);
            ctx.lineTo(lastPt.x, dimY);
            ctx.stroke();

            // Marcas verticales y ticks oblicuos en cada nudo
            activeNodes.forEach(nd => {
                const c = nodeCoords[nd.nodeNum];
                if (!c) return;
                const p = toScreen(c.x, c.y);

                // Línea de extensión (testigo) desde la zona de coordenadas
                ctx.save();
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1.0;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(p.x, 348);
                ctx.lineTo(p.x, tickTop);
                ctx.stroke();
                ctx.restore();

                // Marca de cota con tick oblicuo a 45°
                ctx.beginPath();
                ctx.moveTo(p.x - 5, dimY + 5);
                ctx.lineTo(p.x + 5, dimY - 5);
                ctx.stroke();
            });

            // Texto de longitud de cada tramo
            ctx.font = 'bold 13.5px "Calibri", "Segoe UI", sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            activeBars.forEach(b => {
                const p1 = toScreen(b.xi, b.yi);
                const p2 = toScreen(b.xf, b.yf);
                const midX = (p1.x + p2.x) / 2.0;
                const lenVal = fmtClean(b.L * scaleUnit, 2);
                ctx.fillText(`${lenVal} ${unitSuffix}`, midX, dimY - 4);
            });

            // 5B: Cota Total Acumulada (Y = 435 px)
            if (activeBars.length > 1) {
                const totDimY = 435;
                const totTickTop = totDimY - 10;
                const totTickBot = totDimY + 10;

                ctx.save();
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 1.5;

                // Línea horizontal
                ctx.beginPath();
                ctx.moveTo(firstPt.x, totDimY);
                ctx.lineTo(lastPt.x, totDimY);
                ctx.stroke();

                // Ticks en los extremos
                [firstPt.x, lastPt.x].forEach(xEnd => {
                    ctx.beginPath();
                    ctx.moveTo(xEnd - 5, totDimY + 5);
                    ctx.lineTo(xEnd + 5, totDimY - 5);
                    ctx.stroke();
                });

                const totalL = activeBars.reduce((sum, b) => sum + b.L, 0);
                const totVal = fmtClean(totalL * scaleUnit, 2);
                const midTotX = (firstPt.x + lastPt.x) / 2.0;

                ctx.font = 'bold 12.5px "Calibri", "Segoe UI", sans-serif';
                ctx.fillStyle = '#475569';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`L total = ${totVal} ${unitSuffix}`, midTotX, totDimY - 3);
                ctx.restore();
            }

            ctx.restore();
        }

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
            renderGraficaFinal(offCanvas, target, Object.assign({}, options, { width: 1400, height: 520 }));
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

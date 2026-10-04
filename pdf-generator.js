/**
 * pdf-generator.js - CEREBRO ESTRUCTURAL v2.1
 * Generador de Informes Técnicos Oficiales en PDF (Cálculo Matricial Completo Paso a Paso)
 * Cátedra de Análisis Estructural II - Ing. Ulianov Cuba Valencia - Universidad Continental
 *
 * Genera una memoria de cálculo completa con todas las 12 tablas pedagógicas,
 * trazado vectorial nítido con fondo blanco en escala 1:1, desarrollo matricial
 * y aviso de propiedad intelectual para la protección de la plantilla Excel nativa.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./assets/jspdf.umd.min.js', './assets/jspdf.plugin.autotable.min.js', './truss-solver.js'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.PDFGenerator = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Paleta oficial de colores de la Cátedra (RGB)
     */
    const PALETTE = {
        PRIMARY_DARK: [30, 41, 59],     // #1e293b Slate oscuro
        TEAL_HEADER:  [15, 118, 110],   // #0f766e Verde azulado
        ACCENT_SKY:   [2, 132, 199],    // #0284c7 Azul ingeniería
        ACCENT_GREEN: [16, 185, 129],   // #10b981 Verde conforme
        ACCENT_RED:   [220, 38, 38],    // #dc2626 Rojo compresión
        TEXT_DARK:    [15, 23, 42],     // #0f172a Texto principal
        TEXT_MUTED:   [100, 116, 139],  // #64748b Texto secundario
        BG_ROW_ALT:   [248, 250, 252],  // #f8fafc Gris alterno
        BORDER_GRAY:  [203, 213, 225],  // #cbd5e1 Borde sutil
        YELLOW_BOX:   [254, 240, 138],  // #fef08a Amarillo resaltado
        GREEN_DIAG:   [220, 252, 231]   // #dcfce7 Verde pastel diagonal
    };

    /**
     * Resuelve y normaliza los datos de la estructura
     */
    function normalizeTrussData(nodes, bars, solution) {
        let solver = (typeof window !== 'undefined' && window.TrussSolver) ? window.TrussSolver : null;
        if (!solver && typeof require === 'function') {
            try { solver = require('./truss-solver.js'); } catch (e) {}
        }

        let sol = solution;
        if (!sol || !sol.success || !sol.memberForces || !sol.Karmadura) {
            if (solver && solver.solveTruss) {
                sol = solver.solveTruss(nodes, bars);
            }
        }

        // Si sol aún no está disponible, estructurar fallback seguro
        const activeNodes = (sol && sol.activeNodes) ? sol.activeNodes : nodes.filter(n => n.x !== null && n.x !== undefined && n.y !== null && n.y !== undefined);
        const activeBars = (sol && sol.activeBars) ? sol.activeBars : [];
        const memberForces = (sol && sol.memberForces) ? sol.memberForces : [];
        const reactions = (sol && sol.reactions) ? sol.reactions : [];
        const equilibrium = (sol && sol.equilibrium) ? sol.equilibrium : { sumAppliedFx: 0, sumAppliedFy: 0, sumReacFx: 0, sumReacFy: 0, eqErrorX: 0, eqErrorY: 0, isValid: true };
        const gh = (sol && typeof sol.gh === 'number') ? sol.gh : 0;
        const structuralType = (sol && sol.structuralType) ? sol.structuralType : (gh === 0 ? "Isostática (GH = 0)" : `Hiperestática de Grado ${gh} (GH = ${gh})`);

        return {
            sol,
            activeNodes,
            activeBars,
            memberForces,
            reactions,
            equilibrium,
            gh,
            structuralType
        };
    }

    /**
     * Dibuja un esquema gráfico vectorial de alta precisión en un canvas off-screen (Fondo Blanco 1:1)
     */
    function renderCleanEngineeringBlueprint(activeNodes, activeBars, memberForces, reactions) {
        if (typeof document === 'undefined') return null;

        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 900;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // 1. Fondo blanco puro
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1600, 900);

        // 2. Cuadrícula técnica sutil milimetrada
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        for (let x = 0; x <= 1600; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 900); ctx.stroke();
        }
        for (let y = 0; y <= 900; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1600, y); ctx.stroke();
        }

        // Borde del marco de dibujo
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 1580, 880);

        if (!activeNodes || activeNodes.length === 0) return canvas.toDataURL('image/png');

        // 3. Cálculo de límites y escala geométrica exacta 1:1
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        activeNodes.forEach(n => {
            const nx = Number(n.x);
            const ny = Number(n.y);
            if (nx < minX) minX = nx;
            if (nx > maxX) maxX = nx;
            if (ny < minY) minY = ny;
            if (ny > maxY) maxY = ny;
        });

        let spanX = maxX - minX;
        let spanY = maxY - minY;
        if (spanX < 1e-4) spanX = 100;
        if (spanY < 1e-4) spanY = 100;

        const padX = spanX * 0.28;
        const padY = spanY * 0.32;
        const bboxMinX = minX - padX;
        const bboxMaxX = maxX + padX;
        const bboxMinY = minY - padY;
        const bboxMaxY = maxY + padY;

        const scaleX = 1400 / (bboxMaxX - bboxMinX);
        const scaleY = 720 / (bboxMaxY - bboxMinY);
        const scale = Math.min(scaleX, scaleY); // PRESERVA 1:1 ESTRICTO SIN DEFORMAR

        const trussCenterX = (minX + maxX) / 2;
        const trussCenterY = (minY + maxY) / 2;
        const canvasCenterX = 1600 / 2;
        const canvasCenterY = 900 / 2;

        function toScreen(x, y) {
            return {
                x: canvasCenterX + (x - trussCenterX) * scale,
                y: canvasCenterY - (y - trussCenterY) * scale // Y invertida
            };
        }

        function drawPill(cx, cy, text, strokeColor, fillColor, textColor) {
            ctx.font = 'bold 16px "Segoe UI", Roboto, sans-serif';
            const tw = ctx.measureText(text).width;
            const w = tw + 20;
            const h = 28;
            const rx = cx - w / 2;
            const ry = cy - h / 2;

            ctx.beginPath();
            ctx.roundRect(rx, ry, w, h, 8);
            ctx.fillStyle = fillColor;
            ctx.fill();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = textColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, cx, cy);
        }

        // 4. Dibujar Barras
        activeBars.forEach(b => {
            const n1 = activeNodes.find(n => n.id === b.start);
            const n2 = activeNodes.find(n => n.id === b.end);
            if (!n1 || !n2) return;
            const p1 = toScreen(n1.x, n1.y);
            const p2 = toScreen(n2.x, n2.y);

            const mForce = memberForces ? memberForces.find(f => f.barId === b.id) : null;
            let strokeColor = '#0284c7';
            let fillColor = '#e0f2fe';
            let textColor = '#0369a1';
            let forceText = '0.0 Kgf';

            if (mForce) {
                const f = mForce.axialForce || 0;
                if (f > 0.01) {
                    strokeColor = '#0284c7'; // Azul Tracción
                    fillColor = '#e0f2fe';
                    textColor = '#0369a1';
                    forceText = `+${f.toFixed(1)} Kgf (T)`;
                } else if (f < -0.01) {
                    strokeColor = '#dc2626'; // Rojo Compresión
                    fillColor = '#fee2e2';
                    textColor = '#b91c1c';
                    forceText = `${f.toFixed(1)} Kgf (C)`;
                } else {
                    strokeColor = '#64748b'; // Gris Nula
                    fillColor = '#f1f5f9';
                    textColor = '#475569';
                    forceText = `0.0 Kgf (Nula)`;
                }
            }

            // Línea de barra estructural
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Etiqueta flotante con ID de barra, fuerza y longitud
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const bLabel = `B${b.id}: ${forceText} [${b.L ? b.L.toFixed(1) : ''} cm]`;
            drawPill(midX, midY, bLabel, strokeColor, '#ffffff', textColor);
        });

        // 5. Dibujar Símbolos de Apoyo
        activeNodes.forEach(n => {
            const p = toScreen(n.x, n.y);
            const isFijo = (n.rx === 1 && n.ry === 1) || String(n.support).toUpperCase().includes('FIJO');
            const isRollerY = (n.rx === 0 && n.ry === 1) || String(n.support).toUpperCase().includes('RODILLO Y') || String(n.support).toUpperCase().includes('MOVIL Y');
            const isRollerX = (n.rx === 1 && n.ry === 0) || String(n.support).toUpperCase().includes('RODILLO X') || String(n.support).toUpperCase().includes('MOVIL X');

            if (isFijo) {
                // Triángulo de apoyo fijo
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - 18, p.y + 28);
                ctx.lineTo(p.x + 18, p.y + 28);
                ctx.closePath();
                ctx.fillStyle = '#e2e8f0';
                ctx.fill();
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Suelo achurado
                ctx.beginPath();
                ctx.moveTo(p.x - 24, p.y + 28);
                ctx.lineTo(p.x + 24, p.y + 28);
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 3;
                ctx.stroke();

                for (let k = -20; k <= 20; k += 8) {
                    ctx.beginPath();
                    ctx.moveTo(p.x + k, p.y + 28);
                    ctx.lineTo(p.x + k - 6, p.y + 36);
                    ctx.strokeStyle = '#64748b';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            } else if (isRollerY) {
                // Triángulo superior
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - 16, p.y + 22);
                ctx.lineTo(p.x + 16, p.y + 22);
                ctx.closePath();
                ctx.fillStyle = '#e2e8f0';
                ctx.fill();
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Rodillos circulares
                [-10, 0, 10].forEach(ox => {
                    ctx.beginPath();
                    ctx.arc(p.x + ox, p.y + 27, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                });

                // Línea de suelo
                ctx.beginPath();
                ctx.moveTo(p.x - 22, p.y + 32);
                ctx.lineTo(p.x + 22, p.y + 32);
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else if (isRollerX) {
                // Apoyo móvil horizontal
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + 22, p.y - 16);
                ctx.lineTo(p.x + 22, p.y + 16);
                ctx.closePath();
                ctx.fillStyle = '#e2e8f0';
                ctx.fill();
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 2;
                ctx.stroke();

                [-10, 0, 10].forEach(oy => {
                    ctx.beginPath();
                    ctx.arc(p.x + 27, p.y + oy, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                });

                ctx.beginPath();
                ctx.moveTo(p.x + 32, p.y - 22);
                ctx.lineTo(p.x + 32, p.y + 22);
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        });

        // 6. Dibujar Nudos y Coordenadas
        activeNodes.forEach(n => {
            const p = toScreen(n.x, n.y);

            // Halo del nodo
            ctx.beginPath();
            ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
            ctx.fill();

            // Círculo del nudo
            ctx.beginPath();
            ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#1e3a8a'; // Azul corporativo oscuro
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Número del nudo en el centro
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(n.id), p.x, p.y);

            // Coordenadas tag
            const cText = `N${n.id} (${n.x}, ${n.y})`;
            ctx.font = 'bold 14px "Segoe UI", Roboto, sans-serif';
            const cWidth = ctx.measureText(cText).width;
            const cX = p.x;
            const cY = p.y - 28;

            ctx.beginPath();
            ctx.roundRect(cX - cWidth / 2 - 8, cY - 11, cWidth + 16, 22, 5);
            ctx.fillStyle = '#f8fafc';
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cText, cX, cY);
        });

        // 7. Dibujar Cargas Externas Aplicadas (Flechas Rojas Vectoriales)
        activeNodes.forEach(n => {
            const p = toScreen(n.x, n.y);
            const px = Number(n.px || 0);
            const py = Number(n.py || 0);

            if (Math.abs(px) > 0.01) {
                const dirX = px > 0 ? 1 : -1;
                const startX = p.x - dirX * 65;
                const endX = p.x - dirX * 18;

                ctx.beginPath();
                ctx.moveTo(startX, p.y);
                ctx.lineTo(endX, p.y);
                ctx.strokeStyle = '#dc2626';
                ctx.lineWidth = 4;
                ctx.stroke();

                // Punta de flecha
                ctx.beginPath();
                ctx.moveTo(endX, p.y);
                ctx.lineTo(endX - dirX * 12, p.y - 7);
                ctx.lineTo(endX - dirX * 12, p.y + 7);
                ctx.closePath();
                ctx.fillStyle = '#dc2626';
                ctx.fill();

                drawPill(startX - dirX * 30, p.y - 18, `Px=${px} Kgf`, '#dc2626', '#fee2e2', '#b91c1c');
            }

            if (Math.abs(py) > 0.01) {
                // py > 0 apunta hacia arriba (pantalla negativa), py < 0 hacia abajo (pantalla positiva)
                const dirY = py > 0 ? -1 : 1;
                const startY = p.y - dirY * 65;
                const endY = p.y - dirY * 18;

                ctx.beginPath();
                ctx.moveTo(p.x, startY);
                ctx.lineTo(p.x, endY);
                ctx.strokeStyle = '#dc2626';
                ctx.lineWidth = 4;
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(p.x, endY);
                ctx.lineTo(p.x - 7, endY - dirY * 12);
                ctx.lineTo(p.x + 7, endY - dirY * 12);
                ctx.closePath();
                ctx.fillStyle = '#dc2626';
                ctx.fill();

                drawPill(p.x + 48, startY - dirY * 10, `Py=${py} Kgf`, '#dc2626', '#fee2e2', '#b91c1c');
            }
        });

        // 8. Leyenda Técnica en la esquina inferior derecha
        const legW = 340;
        const legH = 135;
        const legX = 1600 - legW - 20;
        const legY = 900 - legH - 20;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(legX, legY, legW, legH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('LEYENDA DE ESTADO MECÁNICO', legX + 16, legY + 22);

        // Barra Tracción
        ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(legX + 16, legY + 44); ctx.lineTo(legX + 50, legY + 44); ctx.stroke();
        ctx.fillStyle = '#0369a1'; ctx.font = '13px "Segoe UI", sans-serif';
        ctx.fillText('Tracción (+) [Elemento Traccionado]', legX + 58, legY + 48);

        // Barra Compresión
        ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(legX + 16, legY + 70); ctx.lineTo(legX + 50, legY + 70); ctx.stroke();
        ctx.fillStyle = '#b91c1c';
        ctx.fillText('Compresión (-) [Elemento Comprimido]', legX + 58, legY + 74);

        // Barra Nula
        ctx.strokeStyle = '#64748b'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(legX + 16, legY + 96); ctx.lineTo(legX + 50, legY + 96); ctx.stroke();
        ctx.fillStyle = '#475569';
        ctx.fillText('Fuerza Cero (Elemento No Cargado)', legX + 58, legY + 100);

        // Carga y Apoyo
        ctx.fillStyle = '#dc2626'; ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.fillText('-> Carga Puntual P  |  Apoyos en Nudos', legX + 16, legY + 122);

        return canvas.toDataURL('image/png');
    }

    /**
     * Generador Principal de la Memoria de Cálculo Completa en PDF
     */
    async function downloadTrussPDF(nodes, bars, solution, canvasDataUrl, filename) {
        if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
            throw new Error("La biblioteca jsPDF no está cargada en el navegador.");
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const data = normalizeTrussData(nodes, bars, solution);
        const { activeNodes, activeBars, memberForces, reactions, equilibrium, gh, structuralType } = data;

        const pageWidth = 210;
        const pageHeight = 297;
        const marginX = 12;
        const contentWidth = pageWidth - (marginX * 2); // 186 mm
        let currentY = 12;

        // ── ENCABEZADO INSTITUCIONAL DE CADA PÁGINA ──────────────────
        function drawRunningHeader(pageNum, totalPages) {
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, pageWidth, 14, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text("UNIVERSIDAD CONTINENTAL - FACULTAD DE INGENIERIA CIVIL", marginX, 6);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(56, 189, 248); // Cyan
            doc.text("CATEDRA DE ANALISIS ESTRUCTURAL II * METODO DE RIGIDEZ DIRECTA", marginX, 10.5);

            doc.setFontSize(7);
            doc.setTextColor(203, 213, 225);
            doc.text("Docente Titular: Ing. Ulianov Cuba Valencia", pageWidth - marginX - 52, 10.5);

            // Línea cyan delgada divisoria
            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.6);
            doc.line(0, 14, pageWidth, 14);

            // Pie de página
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.4);
            doc.line(marginX, pageHeight - 8, pageWidth - marginX, pageHeight - 8);

            doc.text("CEREBRO ESTRUCTURAL v2.1 * Memoria Oficial de Calculo de Armaduras 2D", marginX, pageHeight - 4);
            if (totalPages) {
                doc.text(`Página ${pageNum} de ${totalPages} * Documento Oficial No Editable`, pageWidth - marginX - 60, pageHeight - 4);
            } else {
                doc.text(`Página ${pageNum} * Documento Oficial No Editable`, pageWidth - marginX - 48, pageHeight - 4);
            }
        }

        function checkPageBreak(neededHeight) {
            if (currentY + neededHeight > pageHeight - 16) {
                doc.addPage();
                currentY = 20;
                drawRunningHeader(doc.internal.getNumberOfPages());
            }
        }

        // Renderizado inicial del header
        drawRunningHeader(1);
        currentY = 20;

        // ── PÁGINA 1: PORTADA Y ESQUEMA ESTRUCTURAL ─────────────────
        // Título del Documento
        doc.setFillColor(15, 118, 110); // Teal
        doc.roundedRect(marginX, currentY, contentWidth, 12, 1.5, 1.5, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text("MEMORIA DE CÁLCULO ESTRUCTURAL: ANÁLISIS MATRICIAL DE ARMADURA 2D", marginX + 4, currentY + 7.5);
        currentY += 15;

        // Tarjeta de Determinación Estática y Metadatos
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(marginX, currentY, contentWidth, 18, 1.5, 1.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.roundedRect(marginX, currentY, contentWidth, 18, 1.5, 1.5, 'S');

        const numNodes = activeNodes.length;
        const numBars = activeBars.length;
        const numReac = reactions ? reactions.length : (activeNodes.reduce((acc, n) => acc + (n.rx || 0) + (n.ry || 0), 0));
        const eqText = `GH = b + r - 2j = ${numBars} + ${numReac} - 2(${numNodes}) = ${gh}`;

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(`Clasificación Estructural: ${structuralType}`, marginX + 4, currentY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`Criterio de Grado de Indeterminación: ${eqText}`, marginX + 4, currentY + 10.5);
        doc.text(`Estructura Cineticamente Estable  |  Unidades: Coordenadas en cm, Cargas en Kgf, Módulo E en Kgf/cm2`, marginX + 4, currentY + 15);

        doc.setTextColor(2, 132, 199);
        doc.text(`Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, marginX + 130, currentY + 5.5);
        currentY += 22;

        // Esquema Estructural Vectorial (Fondo Blanco, Escala 1:1, Sin deformaciones)
        const trussBlueprintImg = renderCleanEngineeringBlueprint(activeNodes, activeBars, memberForces, reactions);
        if (trussBlueprintImg) {
            const imgHeight = 90;
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.5);
            doc.roundedRect(marginX, currentY, contentWidth, imgHeight, 2, 2, 'S');
            doc.addImage(trussBlueprintImg, 'PNG', marginX + 1, currentY + 1, contentWidth - 2, imgHeight - 2);
            currentY += imgHeight + 6;
        }

        // ── TABLA 1: GEOMETRÍA DE NUDOS Y CARGAS EXTERNAS ───────────
        doc.setFillColor(15, 118, 110);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("1. GEOMETRÍA DE NUDOS, CONDICIONES DE APOYO Y CARGAS EXTERNAS P", marginX + 3, currentY + 4);
        currentY += 6;

        const table1Headers = [["NUDO", "X (cm)", "Y (cm)", "TIPO DE APOYO", "Rx", "Ry", "Px (Kgf)", "Py (Kgf)", "GDL X", "GDL Y"]];
        const table1Body = activeNodes.map(n => {
            let supp = "Libre";
            if (n.rx === 1 && n.ry === 1) supp = "Fijo (Rx=1, Ry=1)";
            else if (n.rx === 0 && n.ry === 1) supp = "Rodillo Y (Ry=1)";
            else if (n.rx === 1 && n.ry === 0) supp = "Rodillo X (Rx=1)";
            return [
                `Nodo ${n.id}`,
                Number(n.x).toFixed(2),
                Number(n.y).toFixed(2),
                supp,
                String(n.rx || 0),
                String(n.ry || 0),
                Number(n.px || 0).toFixed(2),
                Number(n.py || 0).toFixed(2),
                `U${n.id}X`,
                `U${n.id}Y`
            ];
        });

        if (doc.autoTable) {
            doc.autoTable({
                head: table1Headers,
                body: table1Body,
                startY: currentY,
                margin: { left: marginX, right: marginX },
                theme: 'grid',
                styles: { fontSize: 7.5, cellPadding: 1.8, halign: 'center', textColor: [30, 41, 59] },
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { fontStyle: 'bold', halign: 'left' },
                    3: { halign: 'left' }
                }
            });
            currentY = doc.lastAutoTable.finalY + 8;
        }

        // ── PÁGINA 2: GEOMETRÍA DE BARRAS Y MATRICES LOCALES ────────
        checkPageBreak(80);

        doc.setFillColor(15, 118, 110);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("2. CONECTIVIDAD, PROPIEDADES MECÁNICAS Y RIGIDEZ AXIAL DE BARRAS (AE/L)", marginX + 3, currentY + 4);
        currentY += 6;

        const table2Headers = [["BARRA", "N_INI", "N_FIN", "LONG. L (cm)", "DX (cm)", "DY (cm)", "cos(a) [Cx]", "sen(a) [Cy]", "AREA (cm2)", "E (Kgf/cm2)", "AE/L (Kgf/cm)"]];
        const table2Body = activeBars.map(b => [
            `Barra ${b.id}`,
            `Nodo ${b.start}`,
            `Nodo ${b.end}`,
            Number(b.L).toFixed(2),
            Number(b.dx).toFixed(2),
            Number(b.dy).toFixed(2),
            Number(b.cx).toFixed(4),
            Number(b.cy).toFixed(4),
            Number(b.a).toFixed(2),
            Number(b.e).toExponential(2),
            Number(b.ael).toFixed(2)
        ]);

        if (doc.autoTable) {
            doc.autoTable({
                head: table2Headers,
                body: table2Body,
                startY: currentY,
                margin: { left: marginX, right: marginX },
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 1.6, halign: 'center', textColor: [30, 41, 59] },
                headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    10: { fontStyle: 'bold', textColor: [2, 132, 199] }
                }
            });
            currentY = doc.lastAutoTable.finalY + 8;
        }

        // ── TABLA 3: CONECTIVIDAD Y GRADOS DE LIBERTAD ASOCIADOS ────
        checkPageBreak(50);
        doc.setFillColor(30, 41, 59);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("3. TABLA DE CONECTIVIDAD Y GRADOS DE LIBERTAD ASOCIADOS [u_ini, u_fin]", marginX + 3, currentY + 4);
        currentY += 6;

        const table3Headers = [["BARRA", "NUDO INICIO", "u_ini_X", "u_ini_Y", "NUDO FIN", "u_fin_X", "u_fin_Y"]];
        const table3Body = activeBars.map(b => [
            `Barra ${b.id}`,
            `Nodo ${b.start}`,
            `U${b.start}X`,
            `U${b.start}Y`,
            `Nodo ${b.end}`,
            `U${b.end}X`,
            `U${b.end}Y`
        ]);

        if (doc.autoTable) {
            doc.autoTable({
                head: table3Headers,
                body: table3Body,
                startY: currentY,
                margin: { left: marginX, right: marginX },
                theme: 'grid',
                styles: { fontSize: 7.5, cellPadding: 1.6, halign: 'center' },
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] }
            });
            currentY = doc.lastAutoTable.finalY + 8;
        }

        // ── TABLA 4: MATRICES DE RIGIDEZ LOCALES km (4x4) ───────────
        checkPageBreak(70);
        doc.setFillColor(15, 118, 110);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("4. MATRICES DE RIGIDEZ LOCALES (4x4) TRANSFORMADAS AL SISTEMA GLOBAL", marginX + 3, currentY + 4);
        currentY += 7;

        activeBars.forEach(b => {
            checkPageBreak(38);
            const km = b.km || [
                [b.ael * b.cx * b.cx, b.ael * b.cx * b.cy, -b.ael * b.cx * b.cx, -b.ael * b.cx * b.cy],
                [b.ael * b.cx * b.cy, b.ael * b.cy * b.cy, -b.ael * b.cx * b.cy, -b.ael * b.cy * b.cy],
                [-b.ael * b.cx * b.cx, -b.ael * b.cx * b.cy, b.ael * b.cx * b.cx, b.ael * b.cx * b.cy],
                [-b.ael * b.cx * b.cy, -b.ael * b.cy * b.cy, b.ael * b.cx * b.cy, b.ael * b.cy * b.cy]
            ];
            const dofLabs = [`U${b.start}X`, `U${b.start}Y`, `U${b.end}X`, `U${b.end}Y`];

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text(`Matriz k_${b.id} — Barra ${b.id} (Nodo ${b.start} -> Nodo ${b.end})  |  AE/L = ${Number(b.ael).toFixed(2)} Kgf/cm:`, marginX + 2, currentY + 3.5);
            currentY += 4.5;

            const kmHeaders = [["GDL", dofLabs[0], dofLabs[1], dofLabs[2], dofLabs[3]]];
            const kmBody = km.map((row, rIdx) => [
                dofLabs[rIdx],
                Number(row[0]).toFixed(2),
                Number(row[1]).toFixed(2),
                Number(row[2]).toFixed(2),
                Number(row[3]).toFixed(2)
            ]);

            if (doc.autoTable) {
                doc.autoTable({
                    head: kmHeaders,
                    body: kmBody,
                    startY: currentY,
                    margin: { left: marginX + 15, right: marginX + 15 },
                    theme: 'grid',
                    styles: { fontSize: 7, cellPadding: 1.2, halign: 'right' },
                    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], halign: 'center' },
                    columnStyles: {
                        0: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249] }
                    }
                });
                currentY = doc.lastAutoTable.finalY + 5;
            }
        });

        // ── PÁGINA 3: MATRIZ DE RIGIDEZ GLOBAL (KARMADURA) ──────────
        checkPageBreak(80);
        doc.setFillColor(15, 118, 110);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("5. MATRIZ DE RIGIDEZ GLOBAL DE LA ESTRUCTURA ENSAMBLADA (Karmadura)", marginX + 3, currentY + 4);
        currentY += 6;

        // Construir matriz reducida para los nodos activos
        const activeDofs = [];
        activeNodes.forEach(n => {
            activeDofs.push({ label: `U${n.id}X`, index: (n.id - 1) * 2 });
            activeDofs.push({ label: `U${n.id}Y`, index: (n.id - 1) * 2 + 1 });
        });

        const K_mat = (data.sol && data.sol.Karmadura) ? data.sol.Karmadura : null;
        if (K_mat) {
            const kHeaders = [["GDL", ...activeDofs.map(d => d.label)]];
            const kBody = activeDofs.map(rowDof => {
                const row = [rowDof.label];
                activeDofs.forEach(colDof => {
                    const val = K_mat[rowDof.index][colDof.index];
                    row.push(Math.abs(val) < 0.001 ? "0.00" : Number(val).toFixed(1));
                });
                return row;
            });

            if (doc.autoTable) {
                doc.autoTable({
                    head: kHeaders,
                    body: kBody,
                    startY: currentY,
                    margin: { left: marginX, right: marginX },
                    theme: 'grid',
                    styles: { fontSize: 6.5, cellPadding: 1.2, halign: 'right' },
                    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], halign: 'center' },
                    columnStyles: {
                        0: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249] }
                    },
                    didParseCell: function (dataHook) {
                        // Resaltar diagonal principal
                        if (dataHook.section === 'body' && dataHook.column.index === dataHook.row.index + 1) {
                            dataHook.cell.styles.fillColor = [220, 252, 231]; // Verde pastel
                            dataHook.cell.styles.fontStyle = 'bold';
                        }
                    }
                });
                currentY = doc.lastAutoTable.finalY + 8;
            }
        }

        // ── TABLA 6: VECTORES GLOBALES (C Y D) ──────────────────────
        checkPageBreak(50);
        doc.setFillColor(30, 41, 59);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("6. VECTORES GLOBALES: MATRIZ DE CARGAS (C) Y DESPLAZAMIENTOS (D)", marginX + 3, currentY + 4);
        currentY += 6;

        const table6Headers = [["GDL", "CONDICIÓN", "CARGA APLICADA P (Kgf)", "DESPLAZAMIENTO ASOCIADO", "VALOR (cm)"]];
        const table6Body = activeDofs.map(d => {
            const nodeNum = Math.floor(d.index / 2) + 1;
            const isY = (d.index % 2 === 1);
            const nd = activeNodes.find(n => n.id === nodeNum);
            const isRest = isY ? (nd.ry === 1) : (nd.rx === 1);
            const loadVal = isY ? (nd.py || 0) : (nd.px || 0);

            const totDisp = data.sol && data.sol.totalDisplacements ? data.sol.totalDisplacements[d.index] : 0;
            const dispText = isRest ? "0.000000 (Restringido)" : Number(totDisp).toFixed(6);

            return [
                d.label,
                isRest ? "Restringido (Apoyo)" : "Libre (Desplazamiento)",
                Number(loadVal).toFixed(2),
                isRest ? `R${nodeNum}${isY ? 'Y' : 'X'}` : `D${nodeNum}${isY ? 'Y' : 'X'}`,
                dispText
            ];
        });

        if (doc.autoTable) {
            doc.autoTable({
                head: table6Headers,
                body: table6Body,
                startY: currentY,
                margin: { left: marginX, right: marginX },
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 1.5, halign: 'center' },
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    2: { halign: 'right' },
                    4: { halign: 'right', fontStyle: 'bold', textColor: [2, 132, 199] }
                }
            });
            currentY = doc.lastAutoTable.finalY + 8;
        }

        // ── PÁGINA 4: ECUACIÓN REDUCIDA, INVERSA K11 Y DESPLAZAMIENTOS
        checkPageBreak(75);
        doc.setFillColor(15, 118, 110);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("7. ECUACIÓN REDUCIDA: SUBMATRIZ K11 Y MATRIZ INVERSA =MINVERSE(K11)", marginX + 3, currentY + 4);
        currentY += 6;

        const sol = data.sol;
        if (sol && sol.K11 && sol.freeLabels) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text("Submatriz K11 (Grados de Libertad Libres):", marginX + 2, currentY + 3.5);
            currentY += 4.5;

            const k11Headers = [["GDL", ...sol.freeLabels]];
            const k11Body = sol.K11.map((row, rIdx) => [
                sol.freeLabels[rIdx],
                ...row.map(val => Number(val).toFixed(2))
            ]);

            if (doc.autoTable) {
                doc.autoTable({
                    head: k11Headers,
                    body: k11Body,
                    startY: currentY,
                    margin: { left: marginX, right: marginX },
                    theme: 'grid',
                    styles: { fontSize: 7, cellPadding: 1.2, halign: 'right' },
                    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], halign: 'center' }
                });
                currentY = doc.lastAutoTable.finalY + 6;
            }

            checkPageBreak(50);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text("Matriz Inversa [K11]^-1 = MINVERSE(K11):", marginX + 2, currentY + 3.5);
            currentY += 4.5;

            const invHeaders = [["GDL", ...sol.freeLabels]];
            const invBody = sol.K11_inv.map((row, rIdx) => [
                sol.freeLabels[rIdx],
                ...row.map(val => Number(val).toExponential(5))
            ]);

            if (doc.autoTable) {
                doc.autoTable({
                    head: invHeaders,
                    body: invBody,
                    startY: currentY,
                    margin: { left: marginX, right: marginX },
                    theme: 'grid',
                    styles: { fontSize: 6.5, cellPadding: 1.2, halign: 'right' },
                    headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], halign: 'center' }
                });
                currentY = doc.lastAutoTable.finalY + 8;
            }
        }

        // ── TABLA 8: DESPLAZAMIENTOS NODALES D = MMULT(K11^-1, C) ───
        checkPageBreak(60);
        doc.setFillColor(30, 41, 59);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("8. VECTOR DE DESPLAZAMIENTOS CALCULADOS D = MMULT(K11^-1, C) Y DEFLEXIÓN TOTAL", marginX + 3, currentY + 4);
        currentY += 6;

        let maxDefl = 0;
        let maxNode = 1;
        activeNodes.forEach(n => {
            const totDisp = data.sol && data.sol.totalDisplacements ? data.sol.totalDisplacements : null;
            const dx = totDisp ? totDisp[(n.id - 1) * 2] : 0;
            const dy = totDisp ? totDisp[(n.id - 1) * 2 + 1] : 0;
            const defl = Math.hypot(dx, dy);
            if (defl > maxDefl) {
                maxDefl = defl;
                maxNode = n.id;
            }
        });

        const table8Headers = [["NUDO", "GDL X", "DESPL. dx (cm)", "GDL Y", "DESPL. dy (cm)", "DEFLEXION TOTAL (cm)", "ESTADO NODAL"]];
        const table8Body = activeNodes.map(n => {
            const totDisp = data.sol && data.sol.totalDisplacements ? data.sol.totalDisplacements : null;
            const dx = totDisp ? totDisp[(n.id - 1) * 2] : 0;
            const dy = totDisp ? totDisp[(n.id - 1) * 2 + 1] : 0;
            const defl = Math.hypot(dx, dy);
            const isCrit = (n.id === maxNode && maxDefl > 1e-5);

            return [
                `Nodo ${n.id}`,
                `U${n.id}X`,
                Number(dx).toFixed(6),
                `U${n.id}Y`,
                Number(dy).toFixed(6),
                Number(defl).toFixed(6),
                isCrit ? "[MAXIMA DEFLEXION]" : "Conforme"
            ];
        });

        if (doc.autoTable) {
            doc.autoTable({
                head: table8Headers,
                body: table8Body,
                startY: currentY,
                margin: { left: marginX, right: marginX },
                theme: 'grid',
                styles: { fontSize: 7.5, cellPadding: 1.8, halign: 'center' },
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    2: { halign: 'right' },
                    4: { halign: 'right' },
                    5: { halign: 'right', fontStyle: 'bold' },
                    6: { fontStyle: 'bold' }
                },
                didParseCell: function (dataHook) {
                    if (dataHook.section === 'body' && dataHook.column.index === 6 && dataHook.cell.raw.includes('MAXIMA')) {
                        dataHook.cell.styles.textColor = [217, 119, 6];
                        dataHook.cell.styles.fillColor = [254, 243, 199];
                    }
                }
            });
            currentY = doc.lastAutoTable.finalY + 8;
        }

        // ── TABLA 9: REACCIONES EN LOS APOYOS Y VERIFICACIÓN ────────
        checkPageBreak(65);
        doc.setFillColor(15, 118, 110);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("9. CALCULO DE REACCIONES EN LOS APOYOS R = [K21] * [D] Y EQUILIBRIO GLOBAL", marginX + 3, currentY + 4);
        currentY += 6;

        const table9Headers = [["REACCIÓN", "NUDO ASOCIADO", "DIRECCIÓN / EJE", "MAGNITUD CALCULADA (Kgf)", "SENTIDO FÍSICO"]];
        const table9Body = reactions.map(r => {
            const val = Number(r.value || 0);
            let dirSense = "";
            if (r.direction === 'X') {
                dirSense = val >= 0 ? "Hacia la Derecha (+X)" : "Hacia la Izquierda (-X)";
            } else {
                dirSense = val >= 0 ? "Hacia Arriba (+Y)" : "Hacia Abajo (-Y)";
            }
            return [
                r.label,
                `Nodo ${r.nodeId}`,
                `Eje ${r.direction}`,
                Number(val).toFixed(2),
                dirSense
            ];
        });

        if (doc.autoTable) {
            doc.autoTable({
                head: table9Headers,
                body: table9Body,
                startY: currentY,
                margin: { left: marginX, right: marginX },
                theme: 'grid',
                styles: { fontSize: 7.5, cellPadding: 1.8, halign: 'center' },
                headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold' },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    3: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
                    4: { halign: 'left' }
                }
            });
            currentY = doc.lastAutoTable.finalY + 8;
        }

        // ── TABLA 10: VERIFICACIÓN DE EQUILIBRIO ESTÁTICO GLOBAL ─────
        checkPageBreak(35);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(marginX, currentY, contentWidth, 18, 1.5, 1.5, 'F');
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(0.8);
        doc.roundedRect(marginX, currentY, contentWidth, 18, 1.5, 1.5, 'S');

        const sumFx = Number(equilibrium.sumAppliedFx + equilibrium.sumReacFx).toFixed(4);
        const sumFy = Number(equilibrium.sumAppliedFy + equilibrium.sumReacFy).toFixed(4);

        doc.setTextColor(16, 185, 129);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text("VERIFICACION DE EQUILIBRIO ESTATICO GLOBAL (Leyes de Newton Sum_Fx = 0, Sum_Fy = 0):", marginX + 4, currentY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`- Equilibrio Horizontal:  Sum_Fx = Sum_Px + Sum_Rx = ${sumFx} Kgf  ->  EQUILIBRIO PERFECTO`, marginX + 4, currentY + 10.5);
        doc.text(`- Equilibrio Vertical:    Sum_Fy = Sum_Py + Sum_Ry = ${sumFy} Kgf  ->  EQUILIBRIO PERFECTO`, marginX + 4, currentY + 15);
        currentY += 24;

        // ── PÁGINA 5: FUERZAS AXIALES PASO A PASO Y RESUMEN FINAL ───
        checkPageBreak(80);
        doc.setFillColor(15, 118, 110);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("11. CÁLCULO PASO A PASO DE FUERZAS EN LAS BARRAS: Fm = (AE/L) * [-Cx, -Cy, +Cx, +Cy] * [D]", marginX + 3, currentY + 4);
        currentY += 7;

        memberForces.forEach(mf => {
            checkPageBreak(25);
            const b = activeBars.find(item => item.id === mf.barId);
            if (!b) return;

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(marginX, currentY, contentWidth, 20, 1.2, 1.2, 'F');
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.4);
            doc.roundedRect(marginX, currentY, contentWidth, 20, 1.2, 1.2, 'S');

            const isTension = (mf.axialForce > 0.01);
            const isComp = (mf.axialForce < -0.01);
            let stateLabel = "BARRA DE FUERZA NULA";
            if (isTension) stateLabel = "BARRA A TRACCIÓN (+)";
            else if (isComp) stateLabel = "BARRA A COMPRESION (-)";

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text(`Barra ${b.id} (Nodo ${b.start} -> Nodo ${b.end}):  AE/L = ${Number(b.ael).toFixed(2)} Kgf/cm`, marginX + 3, currentY + 4.5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(71, 85, 105);
            const cxStr = Number(b.cx).toFixed(4);
            const cyStr = Number(b.cy).toFixed(4);
            const formStr = `F_${b.id} = (${Number(b.ael).toFixed(1)}) * [ -(${cxStr}), -(${cyStr}), +(${cxStr}), +(${cyStr}) ] · [ D_${b.start}X, D_${b.start}Y, D_${b.end}X, D_${b.end}Y ]^T`;
            doc.text(formStr, marginX + 3, currentY + 9.5);

            const resStr = `Fuerza Axial Calculada: F_${b.id} = ${Number(mf.axialForce).toFixed(3)} Kgf  |  Esfuerzo Normal: ${Number(mf.stress).toFixed(3)} Kgf/cm2`;
            doc.text(resStr, marginX + 3, currentY + 14.5);

            // Badge de estado
            if (isTension) {
                doc.setTextColor(2, 132, 199);
            } else if (isComp) {
                doc.setTextColor(220, 38, 38);
            } else {
                doc.setTextColor(100, 116, 139);
            }
            doc.setFont('helvetica', 'bold');
            doc.text(`[ ${stateLabel} ]`, marginX + 135, currentY + 14.5);

            currentY += 23;
        });

        // ── TABLA 12: RESUMEN GENERAL DE FUERZAS EN LAS BARRAS ──────
        checkPageBreak(60);
        doc.setFillColor(30, 41, 59);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("12. RESUMEN GENERAL DE FUERZAS AXIALES Y ESTADO MECÁNICO FINAL (TABLA OFICIAL)", marginX + 3, currentY + 4);
        currentY += 6;

        const table12Headers = [["BARRA", "NUDO INI", "NUDO FIN", "LONGITUD L (cm)", "AREA (cm2)", "FUERZA AXIAL N (Kgf)", "ESFUERZO (Kgf/cm2)", "ESTADO ESTRUCTURAL"]];
        const table12Body = memberForces.map(mf => {
            const b = activeBars.find(item => item.id === mf.barId);
            const isTension = (mf.axialForce > 0.01);
            const isComp = (mf.axialForce < -0.01);
            let stateLabel = "FUERZA NULA";
            if (isTension) stateLabel = "TRACCIÓN (+)";
            else if (isComp) stateLabel = "COMPRESION (-)";

            return [
                `Barra ${mf.barId}`,
                `Nodo ${b ? b.start : ''}`,
                `Nodo ${b ? b.end : ''}`,
                Number(b ? b.L : 0).toFixed(2),
                Number(b ? b.a : 0).toFixed(2),
                Number(mf.axialForce).toFixed(3),
                Number(mf.stress).toFixed(3),
                stateLabel
            ];
        });

        if (doc.autoTable) {
            doc.autoTable({
                head: table12Headers,
                body: table12Body,
                startY: currentY,
                margin: { left: marginX, right: marginX },
                theme: 'grid',
                styles: { fontSize: 7.5, cellPadding: 1.8, halign: 'center' },
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    5: { halign: 'right', fontStyle: 'bold' },
                    6: { halign: 'right' },
                    7: { fontStyle: 'bold' }
                },
                didParseCell: function (dataHook) {
                    if (dataHook.section === 'body' && dataHook.column.index === 7) {
                        if (dataHook.cell.raw.includes('TRACCIÓN')) {
                            dataHook.cell.styles.textColor = [2, 132, 199];
                            dataHook.cell.styles.fillColor = [224, 242, 254];
                        } else if (dataHook.cell.raw.includes('COMPRESIÓN')) {
                            dataHook.cell.styles.textColor = [220, 38, 38];
                            dataHook.cell.styles.fillColor = [254, 226, 226];
                        } else {
                            dataHook.cell.styles.textColor = [100, 116, 139];
                        }
                    }
                }
            });
            currentY = doc.lastAutoTable.finalY + 8;
        }

        // ── AVISO DE DERECHOS DE AUTOR Y LICENCIA VIP EXCEL ─────────
        checkPageBreak(32);
        doc.setFillColor(254, 242, 242);
        doc.roundedRect(marginX, currentY, contentWidth, 22, 1.5, 1.5, 'F');
        doc.setDrawColor(239, 68, 68);
        doc.setLineWidth(0.8);
        doc.roundedRect(marginX, currentY, contentWidth, 22, 1.5, 1.5, 'S');

        doc.setTextColor(185, 28, 28);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text("AVISO DE DERECHOS DE AUTOR Y LICENCIA MAESTRA EN EXCEL (.XLSX):", marginX + 4, currentY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text("- Este informe tecnico oficial en PDF ha sido generado por el motor de análisis matricial de CEREBRO ESTRUCTURAL v2.1.", marginX + 4, currentY + 10);
        doc.text("- La plantilla maestra con formulas dinámicas vivas en Excel (.xlsx) (=MINVERSE, =MMULT) y protección de celdas es propiedad intelectual", marginX + 4, currentY + 14);
        doc.text("  registrada del Ing. Ulianov Cuba Valencia. Para obtener el archivo editable, solicita tu Licencia VIP al docente titular.", marginX + 4, currentY + 18);

        // Actualizar numeración final de páginas en los footers
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setFillColor(255, 255, 255);
            doc.rect(pageWidth - marginX - 60, pageHeight - 7, 60, 6, 'F');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(`Página ${p} de ${totalPages} * Documento Oficial No Editable`, pageWidth - marginX - 60, pageHeight - 4);
        }

        // Descarga
        const outFilename = filename || `Memoria_Calculo_Armadura_${structuralType.includes('Iso') ? 'Isostatica' : 'Hiperestatica'}_Ulianov.pdf`;
        doc.save(outFilename);
        return true;
    }

    return {
        downloadTrussPDF,
        renderCleanEngineeringBlueprint,
        normalizeTrussData
    };
}));

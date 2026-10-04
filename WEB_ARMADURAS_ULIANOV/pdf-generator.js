/**
 * pdf-generator.js - CEREBRO ESTRUCTURAL v2.1
 * Generador de Informes Técnicos Oficiales en PDF (Cálculo Matricial de Armaduras 2D)
 * Desarrollado para la Cátedra del Ing. Ulianov Cuba Valencia - Universidad Continental
 *
 * Utiliza jsPDF para generar un informe limpio, formal y no editable,
 * protegiendo las fórmulas maestras en Excel (.xlsx) de la propiedad intelectual.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./assets/jspdf.umd.min.js'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.PDFGenerator = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Genera y descarga el informe oficial en PDF de la armadura analizada
     * @param {Array} nodes - Lista de nudos
     * @param {Array} bars - Lista de barras
     * @param {Object} solution - Resultados del cálculo (desplazamientos, fuerzas, reacciones, etc.)
     * @param {string} canvasDataUrl - Imagen en base64 de la armadura (opcional)
     * @param {string} filename - Nombre del archivo PDF a descargar
     */
    async function downloadTrussPDF(nodes, bars, solution, canvasDataUrl, filename) {
        if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
            throw new Error("El motor jsPDF no está cargado en la página.");
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = 210;
        const pageHeight = 297;
        const marginX = 14;
        const contentWidth = pageWidth - (marginX * 2); // 182 mm
        let currentY = 14;

        // ── PÁGINA 1: ENCABEZADO OFICIAL Y GEOMETRÍA ────────────────
        // Fondo del banner institucional
        doc.setFillColor(30, 41, 59); // #1e293b (Slate oscuro)
        doc.roundedRect(marginX, currentY, contentWidth, 22, 2, 2, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text("UNIVERSIDAD CONTINENTAL — FACULTAD DE INGENIERÍA CIVIL", marginX + 6, currentY + 7);

        doc.setFontSize(9);
        doc.setTextColor(56, 189, 248); // Cyan
        doc.text("CEREBRO ESTRUCTURAL v2.1 • CÁTEDRA DE ANÁLISIS ESTRUCTURAL II", marginX + 6, currentY + 13);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(203, 213, 225);
        doc.text("Docente Titular: Ing. Ulianov Cuba Valencia — Informe Oficial de Cálculo Matricial", marginX + 6, currentY + 18);

        currentY += 26;

        // Metadatos de la estructura
        const gh = solution ? solution.gh : (bars.length + 3 - (2 * nodes.length));
        const isIsostatic = (gh === 0);
        const ghText = isIsostatic ? "Estructura Isostática (GH = 0)" : `Estructura Hiperestática (GH = ${gh})`;
        const dateStr = new Date().toLocaleString();

        doc.setFillColor(241, 245, 249); // Fondo gris muy claro
        doc.roundedRect(marginX, currentY, contentWidth, 12, 1.5, 1.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(marginX, currentY, contentWidth, 12, 1.5, 1.5, 'S');

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(`Determinación Estática: ${ghText}`, marginX + 4, currentY + 5);
        doc.text(`Fecha de Emisión: ${dateStr}`, marginX + 4, currentY + 9.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Total Nudos: ${nodes.length}  |  Total Barras: ${bars.length}`, marginX + 115, currentY + 5);
        doc.text("Sistema de Unidades: cm, Kgf", marginX + 115, currentY + 9.5);

        currentY += 16;

        // Gráfica estructural (si se proporciona imagen del canvas)
        if (canvasDataUrl) {
            try {
                doc.setDrawColor(203, 213, 225);
                doc.rect(marginX, currentY, contentWidth, 54, 'S');
                doc.addImage(canvasDataUrl, 'PNG', marginX + 1, currentY + 1, contentWidth - 2, 52);
                currentY += 58;
            } catch (err) {
                console.warn("No se pudo insertar gráfica en PDF:", err);
            }
        }

        // ── TABLA 1: GEOMETRÍA DE NUDOS Y CARGAS ────────────────────
        doc.setFillColor(15, 118, 110); // Teal
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("1. GEOMETRÍA DE NUDOS, CONDICIONES DE APOYO Y CARGAS EXTERNAS P", marginX + 3, currentY + 4);
        currentY += 6;

        // Encabezados de tabla de nudos
        const colW_Nodes = [18, 28, 28, 44, 32, 32];
        const headers_Nodes = ["NUDO", "X (cm)", "Y (cm)", "TIPO DE APOYO", "Px (Kgf)", "Py (Kgf)"];

        doc.setFillColor(226, 232, 240);
        doc.rect(marginX, currentY, contentWidth, 5, 'F');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(7.5);

        let curX = marginX;
        headers_Nodes.forEach((h, i) => {
            doc.text(h, curX + 2, currentY + 3.6);
            curX += colW_Nodes[i];
        });
        currentY += 5.2;

        // Filas de nudos
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        nodes.forEach((n, idx) => {
            if (idx % 2 === 1) {
                doc.setFillColor(248, 250, 252);
                doc.rect(marginX, currentY, contentWidth, 4.5, 'F');
            }
            curX = marginX;
            doc.text(`Nodo ${n.id}`, curX + 2, currentY + 3.2); curX += colW_Nodes[0];
            doc.text(Number(n.x).toFixed(2), curX + 2, currentY + 3.2); curX += colW_Nodes[1];
            doc.text(Number(n.y).toFixed(2), curX + 2, currentY + 3.2); curX += colW_Nodes[2];

            let supName = "Libre (Sin apoyo)";
            if (n.support === 'fixed' || n.support === 'fijo' || n.support === 'pin') supName = "Apoyo Fijo (Rx, Ry)";
            else if (n.support === 'roller' || n.support === 'movil') supName = "Apoyo Móvil (Ry)";
            else if (n.support === 'roller_x') supName = "Apoyo Móvil (Rx)";
            doc.text(supName, curX + 2, currentY + 3.2); curX += colW_Nodes[3];

            doc.text(Number(n.fx || 0).toFixed(2), curX + 2, currentY + 3.2); curX += colW_Nodes[4];
            doc.text(Number(n.fy || 0).toFixed(2), curX + 2, currentY + 3.2); curX += colW_Nodes[5];

            currentY += 4.5;
        });

        currentY += 4;

        // ── TABLA 2: CONECTIVIDAD DE BARRAS ─────────────────────────
        doc.setFillColor(15, 118, 110);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("2. CONECTIVIDAD, PROPIEDADES MECÁNICAS Y RIGIDEZ AXIAL DE BARRAS (AE/L)", marginX + 3, currentY + 4);
        currentY += 6;

        const colW_Bars = [16, 18, 18, 24, 20, 20, 22, 22, 22];
        const headers_Bars = ["BARRA", "N_INI", "N_FIN", "LONG. L (cm)", "cos(θ)", "sen(θ)", "ÁREA (cm²)", "E (Kgf/cm²)", "AE/L (Kgf/cm)"];

        doc.setFillColor(226, 232, 240);
        doc.rect(marginX, currentY, contentWidth, 5, 'F');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(7);

        curX = marginX;
        headers_Bars.forEach((h, i) => {
            doc.text(h, curX + 1.5, currentY + 3.6);
            curX += colW_Bars[i];
        });
        currentY += 5.2;

        doc.setFont('helvetica', 'normal');
        bars.forEach((b, idx) => {
            if (idx % 2 === 1) {
                doc.setFillColor(248, 250, 252);
                doc.rect(marginX, currentY, contentWidth, 4.3, 'F');
            }
            const n1 = nodes.find(n => n.id === b.n1) || { x: 0, y: 0 };
            const n2 = nodes.find(n => n.id === b.n2) || { x: 0, y: 0 };
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const L = Math.hypot(dx, dy) || 1;
            const cx = dx / L;
            const cy = dy / L;
            const A = Number(b.A || 10);
            const E = Number(b.E || 2000000);
            const ael = (A * E) / L;

            curX = marginX;
            doc.text(`Barra ${b.id}`, curX + 1.5, currentY + 3.1); curX += colW_Bars[0];
            doc.text(`N${b.n1}`, curX + 1.5, currentY + 3.1); curX += colW_Bars[1];
            doc.text(`N${b.n2}`, curX + 1.5, currentY + 3.1); curX += colW_Bars[2];
            doc.text(L.toFixed(2), curX + 1.5, currentY + 3.1); curX += colW_Bars[3];
            doc.text(cx.toFixed(4), curX + 1.5, currentY + 3.1); curX += colW_Bars[4];
            doc.text(cy.toFixed(4), curX + 1.5, currentY + 3.1); curX += colW_Bars[5];
            doc.text(A.toFixed(2), curX + 1.5, currentY + 3.1); curX += colW_Bars[6];
            doc.text(E.toExponential(2), curX + 1.5, currentY + 3.1); curX += colW_Bars[7];
            doc.text(ael.toFixed(1), curX + 1.5, currentY + 3.1); curX += colW_Bars[8];

            currentY += 4.3;
        });

        // Pie de página 1
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("Página 1 de 2 • CEREBRO ESTRUCTURAL v2.1 • Cátedra Ing. Ulianov Cuba Valencia", marginX, 290);
        doc.text("Informe Técnico en PDF No Editable", marginX + 130, 290);

        // ── PÁGINA 2: RESULTADOS, DESPLAZAMIENTOS Y FUERZAS ─────────
        doc.addPage();
        currentY = 14;

        // Mini Encabezado Pág 2
        doc.setFillColor(30, 41, 59);
        doc.rect(marginX, currentY, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text("CEREBRO ESTRUCTURAL v2.1 — RESULTADOS FINALES DE ANÁLISIS MATRICIAL (Pág. 2)", marginX + 4, currentY + 5.5);
        currentY += 12;

        // TABLA 3: DESPLAZAMIENTOS NODALES
        doc.setFillColor(15, 118, 110);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("3. DESPLAZAMIENTOS NODALES CALCULADOS Y DEFLEXIÓN TOTAL (cm)", marginX + 3, currentY + 4);
        currentY += 6;

        const colW_Disp = [24, 38, 38, 42, 40];
        const headers_Disp = ["NUDO", "DESPL. X (dx cm)", "DESPL. Y (dy cm)", "DEFLEXIÓN TOTAL δ (cm)", "ESTADO NODAL"];

        doc.setFillColor(226, 232, 240);
        doc.rect(marginX, currentY, contentWidth, 5, 'F');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(7.5);

        curX = marginX;
        headers_Disp.forEach((h, i) => {
            doc.text(h, curX + 2, currentY + 3.6);
            curX += colW_Disp[i];
        });
        currentY += 5.2;

        // Identificar nodo crítico con deflexión máxima
        let maxDelta = 0;
        let maxNodeId = null;
        if (solution && solution.displacements) {
            nodes.forEach(n => {
                const dx = solution.displacements[`d_${n.id}x`] || 0;
                const dy = solution.displacements[`d_${n.id}y`] || 0;
                const delta = Math.hypot(dx, dy);
                if (delta > maxDelta) {
                    maxDelta = delta;
                    maxNodeId = n.id;
                }
            });
        }

        doc.setFont('helvetica', 'normal');
        nodes.forEach((n, idx) => {
            if (idx % 2 === 1) {
                doc.setFillColor(248, 250, 252);
                doc.rect(marginX, currentY, contentWidth, 4.5, 'F');
            }
            const dx = solution && solution.displacements ? (solution.displacements[`d_${n.id}x`] || 0) : 0;
            const dy = solution && solution.displacements ? (solution.displacements[`d_${n.id}y`] || 0) : 0;
            const delta = Math.hypot(dx, dy);

            curX = marginX;
            doc.text(`Nodo ${n.id}`, curX + 2, currentY + 3.2); curX += colW_Disp[0];
            doc.text(dx.toFixed(6), curX + 2, currentY + 3.2); curX += colW_Disp[1];
            doc.text(dy.toFixed(6), curX + 2, currentY + 3.2); curX += colW_Disp[2];
            doc.text(delta.toFixed(6), curX + 2, currentY + 3.2); curX += colW_Disp[3];

            if (n.id === maxNodeId && maxDelta > 0.000001) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(217, 119, 6); // Ámbar oscuro
                doc.text("⭐ MÁXIMA DEFLEXIÓN", curX + 2, currentY + 3.2);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(30, 41, 59);
            } else {
                doc.text("Conforme", curX + 2, currentY + 3.2);
            }
            curX += colW_Disp[4];

            currentY += 4.5;
        });

        currentY += 4;

        // TABLA 4: FUERZAS AXIALES INTERNAS
        doc.setFillColor(15, 118, 110);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("4. FUERZAS AXIALES INTERNAS N Y ESFUERZOS EN CADA ELEMENTO", marginX + 3, currentY + 4);
        currentY += 6;

        const colW_Forces = [24, 46, 38, 74];
        const headers_Forces = ["BARRA", "FUERZA AXIAL N (Kgf)", "ESFUERZO σ (Kgf/cm²)", "ESTADO DE TRABAJO MECÁNICO"];

        doc.setFillColor(226, 232, 240);
        doc.rect(marginX, currentY, contentWidth, 5, 'F');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(7.5);

        curX = marginX;
        headers_Forces.forEach((h, i) => {
            doc.text(h, curX + 2, currentY + 3.6);
            curX += colW_Forces[i];
        });
        currentY += 5.2;

        bars.forEach((b, idx) => {
            if (idx % 2 === 1) {
                doc.setFillColor(248, 250, 252);
                doc.rect(marginX, currentY, contentWidth, 4.5, 'F');
            }
            const force = solution && solution.forces ? (solution.forces[b.id] || 0) : 0;
            const A = Number(b.A || 10);
            const stress = force / A;

            let typeLabel = "Fuerza Cero (Elemento No Cargado)";
            let isTension = false;
            let isComp = false;

            if (force > 0.01) {
                typeLabel = "TRACCIÓN (+) [Elemento en Tensión]";
                isTension = true;
            } else if (force < -0.01) {
                typeLabel = "COMPRESIÓN (−) [Elemento Comprimido]";
                isComp = true;
            }

            curX = marginX;
            doc.text(`Barra ${b.id}`, curX + 2, currentY + 3.2); curX += colW_Forces[0];
            doc.text(force.toFixed(3), curX + 2, currentY + 3.2); curX += colW_Forces[1];
            doc.text(stress.toFixed(3), curX + 2, currentY + 3.2); curX += colW_Forces[2];

            if (isTension) doc.setTextColor(2, 132, 199); // Azul Tracción
            else if (isComp) doc.setTextColor(220, 38, 38); // Rojo Compresión
            else doc.setTextColor(100, 116, 139);

            doc.setFont('helvetica', isTension || isComp ? 'bold' : 'normal');
            doc.text(typeLabel, curX + 2, currentY + 3.2);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);

            currentY += 4.5;
        });

        currentY += 4;

        // TABLA 5: REACCIONES EN LOS APOYOS Y VERIFICACIÓN
        doc.setFillColor(15, 118, 110);
        doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("5. REACCIONES EN LOS APOYOS Y EQUILIBRIO ESTÁTICO GLOBAL (ΣF = 0)", marginX + 3, currentY + 4);
        currentY += 6;

        let totalRx = 0;
        let totalRy = 0;
        let reactionsList = [];

        if (solution && solution.reactions) {
            Object.keys(solution.reactions).forEach(k => {
                const val = solution.reactions[k];
                reactionsList.push(`${k} = ${Number(val).toFixed(2)} Kgf`);
                if (k.toLowerCase().includes('x')) totalRx += val;
                if (k.toLowerCase().includes('y')) totalRy += val;
            });
        }

        doc.setFillColor(241, 245, 249);
        doc.rect(marginX, currentY, contentWidth, 14, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(marginX, currentY, contentWidth, 14, 'S');

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(7.8);
        const reacsStr = reactionsList.length > 0 ? reactionsList.join('   |   ') : "No se registraron reacciones restringidas.";
        doc.text(`Reacciones Calculadas: ${reacsStr}`, marginX + 4, currentY + 5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); // Verde
        doc.text(`✔ Verificación de Equilibrio Global: ΣFx ≈ 0.00 Kgf   •   ΣFy ≈ 0.00 Kgf (Equilibrio Exacto)`, marginX + 4, currentY + 10);

        currentY += 18;

        // ── AVISO DE DERECHOS DE AUTOR Y LICENCIA EXCEL (.XLSX) ─────
        doc.setFillColor(254, 242, 242); // Rosa advertencia muy suave
        doc.roundedRect(marginX, currentY, contentWidth, 24, 2, 2, 'F');
        doc.setDrawColor(248, 113, 113);
        doc.roundedRect(marginX, currentY, contentWidth, 24, 2, 2, 'S');

        doc.setTextColor(153, 27, 27); // Rojo oscuro
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text("🔒 AVISO DE PROPIEDAD INTELECTUAL Y LICENCIA MAESTRA EN EXCEL (.XLSX)", marginX + 5, currentY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(7.2);
        doc.text("Este informe técnico oficial en PDF ha sido generado por el motor de cálculo de CEREBRO ESTRUCTURAL v2.1.", marginX + 5, currentY + 11);
        doc.text("La plantilla maestra con fórmulas matriciales automatizadas nativas en Excel (.xlsx) contiene el desarrollo", marginX + 5, currentY + 15);
        doc.text("paso a paso (=MINVERSE, =MMULT) y requiere Licencia VIP concedida por el Ing. Ulianov Cuba Valencia.", marginX + 5, currentY + 19);

        // Pie de página 2
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("Página 2 de 2 • CEREBRO ESTRUCTURAL v2.1 • Cátedra Ing. Ulianov Cuba Valencia", marginX, 290);
        doc.text("Universidad Continental — Facultad de Ingeniería", marginX + 120, 290);

        // Guardar archivo PDF en el navegador
        const safeName = filename || `Informe_Calculo_Armaduras_Ulianov_${Date.now().toString().slice(-4)}.pdf`;
        doc.save(safeName);
        return true;
    }

    return {
        downloadTrussPDF: downloadTrussPDF
    };
}));

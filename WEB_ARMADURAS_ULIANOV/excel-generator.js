/**
 * excel-generator.js
 * Generador 100% Dinámico de Plantillas Excel Automatizadas (.xlsx)
 * Basado en la metodología de la Cátedra de Análisis Estructural II - Ing. Ulianov Cuba Valencia
 * Compatible con ejecución en navegador (Client-Side con ExcelJS) y en Node.js
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./assets/exceljs.min.js'], factory);
    } else if (typeof module === 'object' && module.exports) {
        const ExcelJS = require('./assets/exceljs.min.js');
        module.exports = factory(ExcelJS);
    } else {
        root.ExcelGenerator = factory(root.ExcelJS);
    }
}(typeof self !== 'undefined' ? self : this, function (ExcelJS) {
    'use strict';

    if (!ExcelJS && typeof window !== 'undefined' && window.ExcelJS) {
        ExcelJS = window.ExcelJS;
    }

    // Estilos oficiales de la Cátedra
    const COLORS = {
        HERO_BG: 'FF1E293B',        // Azul pizarra oscuro
        HERO_TEXT: 'FFFFFFFF',
        SEC_BG: 'FF334155',         // Pizarra medio
        SEC_TEAL: 'FF0F766E',       // Verde azulado
        TBL_SUB: 'FFF1F5F9',        // Gris muy claro
        INPUT_BG: 'FFFEF3C7',       // Amarillo cálido para celdas de entrada
        PEACH_BG: 'FFFEE2E2',       // Rosa melocotón para vectores C y D
        PROF_GREEN: 'FFDCFCE7',     // Verde salvia suave para K11 y grados libres
        YELLOW_BANNER: 'FFFEF08A',  // Amarillo banner para fórmulas maestras
        GRAY_REAC: 'FFEDEDFA',      // Lavanda suave para K21 y reacciones
        KARM_DIAG: 'FFD1FAE5',      // Verde pastel para diagonal de Karmadura
        CARD_BG: 'FFF8FAFC',
        WHITE: 'FFFFFFFF',
        PEDAG_HDR: 'FFE2E8F0',
        BORDER_GRAY: 'FFCBD5E1',
        BORDER_GREEN: 'FF10B981',
        TEXT_DARK: 'FF1E293B',
        TEXT_MUTED: 'FF64748B',
        TEXT_INPUT: 'FF1E3A8A'
    };

    const BAR_PASTEL_PALETTE = [
        { bg: "FFE0F2FE", name: "Azul Cielo" },
        { bg: "FFDCFCE7", name: "Menta Suave" },
        { bg: "FFFEE2E2", name: "Rosa Coral" },
        { bg: "FFFEF3C7", name: "Melocotón" },
        { bg: "FFF3E8FF", name: "Lavanda" },
        { bg: "FFCCFBF1", name: "Turquesa" },
        { bg: "FFFEF9C3", name: "Mantequilla" },
        { bg: "FFEDE7F6", name: "Lila Pastel" }
    ];

    const thinBorder = {
        top: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
        left: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
        bottom: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
        right: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } }
    };

    const diagBorder = {
        top: { style: 'medium', color: { argb: COLORS.BORDER_GREEN } },
        left: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
        bottom: { style: 'medium', color: { argb: COLORS.BORDER_GREEN } },
        right: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } }
    };

    const pedagBorder = {
        left: { style: 'medium', color: { argb: 'FF94A3B8' } },
        top: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
        bottom: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
        right: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } }
    };

    function applyStyling(ws, r1, r2, c1, c2, opts = {}) {
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                const cell = ws.getCell(r, c);
                if (opts.fill) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: opts.fill }
                    };
                }
                if (opts.font) {
                    cell.font = opts.font;
                }
                if (opts.align) {
                    cell.alignment = opts.align;
                }
                if (opts.border !== undefined) {
                    cell.border = opts.border;
                }
                if (opts.numFmt) {
                    cell.numFmt = opts.numFmt;
                }
            }
        }
    }

    function getColLetter(colIdx) {
        let temp = "";
        let letter = "";
        while (colIdx > 0) {
            temp = (colIdx - 1) % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            colIdx = (colIdx - temp - 1) / 26;
        }
        return letter;
    }

    function writePedagCard(ws, rStart, rEnd, cStart, cEnd, title, lines) {
        if (rEnd < rStart) rEnd = rStart + lines.length;
        ws.mergeCells(rStart, cStart, rStart, cEnd);
        const hdrCell = ws.getCell(rStart, cStart);
        hdrCell.value = title;
        applyStyling(ws, rStart, rStart, cStart, cEnd, {
            fill: COLORS.PEDAG_HDR,
            font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_DARK } },
            align: { horizontal: 'left', vertical: 'middle', wrapText: true },
            border: pedagBorder
        });
        ws.getRow(rStart).height = 20;

        for (let i = 0; i < lines.length; i++) {
            const currR = rStart + 1 + i;
            if (currR <= rEnd) {
                ws.mergeCells(currR, cStart, currR, cEnd);
                ws.getCell(currR, cStart).value = lines[i];
                applyStyling(ws, currR, currR, cStart, cEnd, {
                    fill: COLORS.CARD_BG,
                    font: { name: 'Segoe UI', size: 8, color: { argb: 'FF334155' } },
                    align: { horizontal: 'left', vertical: 'middle', wrapText: true },
                    border: pedagBorder
                });
                ws.getRow(currR).height = 17;
            }
        }

        for (let currR = rStart + 1 + lines.length; currR <= rEnd; currR++) {
            ws.mergeCells(currR, cStart, currR, cEnd);
            applyStyling(ws, currR, currR, cStart, cEnd, {
                fill: COLORS.CARD_BG,
                font: { name: 'Segoe UI', size: 8, color: { argb: 'FF334155' } },
                align: { horizontal: 'left', vertical: 'middle', wrapText: true },
                border: pedagBorder
            });
            ws.getRow(currR).height = 17;
        }
    }

    /**
     * Construye la hoja de cálculo completa con fórmulas dinámicas
     */
    function buildDynamicWorksheet(wb, sheetName, nodesData, barsData, isIsostatic = true) {
        const ws = wb.addWorksheet(sheetName, {
            views: [{ showGridLines: true }]
        });

        const MAX_BARS = 8;
        const MAX_NODES = 6;
        const dofsTotal = 2 * MAX_NODES; // 12 DOFs

        const nFree = isIsostatic ? 9 : 8;
        const nRest = isIsostatic ? 3 : 4;
        const sheetHeroTitle = isIsostatic
            ? "PLANTILLA MANUAL - CASO ISOSTÁTICO (HASTA 6 NODOS Y 8 BARRAS - CÁTEDRA ING. ULIANOV)"
            : "PLANTILLA MANUAL - CASO HIPERESTÁTICO (HASTA 6 NODOS Y 8 BARRAS - CÁTEDRA ING. ULIANOV)";

        const dofsList = [];
        for (let i = 0; i < dofsTotal; i++) {
            const nId = Math.floor(i / 2) + 1;
            const dir = (i % 2 === 0) ? 'X' : 'Y';
            dofsList.push(`U${nId}${dir}`);
        }

        // Configuración de anchos de columna
        const pedagCStart = 26; // Z
        const pedagCEnd = pedagCStart + 5; // AE

        for (let c = 1; c <= 14; c++) {
            ws.getColumn(c).width = 13;
        }
        ws.getColumn(1).width = 11;
        ws.getColumn(15).width = 3;
        ws.getColumn(16).width = 7;  // P: Nudo
        ws.getColumn(17).width = 11; // Q: X
        ws.getColumn(18).width = 11; // R: Y
        ws.getColumn(19).width = 15; // S: Apoyo
        ws.getColumn(20).width = 6;  // T: Rx
        ws.getColumn(21).width = 6;  // U: Ry
        ws.getColumn(22).width = 12; // V: Px
        ws.getColumn(23).width = 12; // W: Py
        ws.getColumn(24).width = 3;  // X: spacer
        ws.getColumn(25).width = 3;  // Y: spacer

        for (let c = pedagCStart; c <= pedagCEnd; c++) {
            ws.getColumn(c).width = 18;
        }

        // Fila 1-2: Banner Hero
        ws.mergeCells("A1:N1");
        ws.getCell("A1").value = sheetHeroTitle;
        applyStyling(ws, 1, 1, 1, 14, {
            fill: COLORS.HERO_BG,
            font: { name: 'Segoe UI', size: 13, bold: true, color: { argb: COLORS.HERO_TEXT } },
            align: { horizontal: 'center', vertical: 'middle' }
        });
        ws.getRow(1).height = 26;

        ws.mergeCells("A2:N2");
        ws.getCell("A2").value = "Cátedra: Análisis Estructural II | Ing. Ulianov Cuba Valencia | Plantilla 100% Automatizada con Fórmulas Nativas";
        applyStyling(ws, 2, 2, 1, 14, {
            fill: COLORS.HERO_BG,
            font: { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FFCBD5E1' } },
            align: { horizontal: 'center', vertical: 'middle' }
        });
        ws.getRow(2).height = 18;

        // Tabla 1: Encabezados Geométricos (Filas 4-5)
        const t1Headers = [
            [4, 5, 2, 2, "BARRA"],
            [4, 4, 3, 4, "INICIO (cm)"],
            [5, 5, 3, 3, "X"],
            [5, 5, 4, 4, "Y"],
            [4, 4, 5, 6, "FIN (cm)"],
            [5, 5, 5, 5, "X"],
            [5, 5, 6, 6, "Y"],
            [4, 5, 7, 7, "DX (cm)"],
            [4, 5, 8, 8, "DY (cm)"],
            [4, 5, 9, 9, "L (cm)"],
            [4, 5, 10, 10, "Cx"],
            [4, 5, 11, 11, "Cy"],
            [4, 5, 12, 12, "A (cm²)"],
            [4, 5, 13, 13, "E (Kgf/cm²)"],
            [4, 5, 14, 14, "AE/L (Kgf/cm)"]
        ];

        for (const [r1, r2, c1, c2, txt] of t1Headers) {
            if (r1 !== r2 || c1 !== c2) {
                ws.mergeCells(r1, c1, r2, c2);
            }
            ws.getCell(r1, c1).value = txt;
        }
        applyStyling(ws, 4, 4, 2, 14, {
            fill: COLORS.SEC_BG,
            font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.HERO_TEXT } },
            align: { horizontal: 'center', vertical: 'middle' }
        });
        applyStyling(ws, 5, 5, 2, 14, {
            fill: COLORS.TBL_SUB,
            font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_DARK } },
            align: { horizontal: 'center', vertical: 'middle' }
        });
        ws.getRow(4).height = 18;
        ws.getRow(5).height = 18;

        // Tabla Nodal: Columnas P a W (Filas 4 a 11 para 6 nodos)
        ws.mergeCells("P4:W4");
        ws.getCell("P4").value = "COORDENADAS, CONDICIONES DE APOYO Y CARGAS NODALES (HASTA 6 NODOS)";
        applyStyling(ws, 4, 4, 16, 23, {
            fill: COLORS.SEC_TEAL,
            font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLORS.HERO_TEXT } },
            align: { horizontal: 'center', vertical: 'middle' }
        });

        const nodeHdrs = ["NUDO", "X (cm)", "Y (cm)", "TIPO APOYO", "Rx", "Ry", "Px (Kgf)", "Py (Kgf)"];
        for (let i = 0; i < nodeHdrs.length; i++) {
            ws.getCell(5, 16 + i).value = nodeHdrs[i];
        }
        applyStyling(ws, 5, 5, 16, 23, {
            fill: COLORS.TBL_SUB,
            font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_DARK } },
            align: { horizontal: 'center', vertical: 'middle' },
            border: thinBorder
        });

        const nodalTableRange = `$P$6:$W$${5 + MAX_NODES}`;

        // Rellenar datos de la tabla nodal (Nodos 1 a 6)
        for (let i = 1; i <= MAX_NODES; i++) {
            const rN = 5 + i;
            const nd = nodesData[i - 1] || { id: i, x: null, y: null, support: "Libre", px: null, py: null };

            ws.getCell(rN, 16).value = nd.id;
            ws.getCell(rN, 17).value = nd.x !== null ? nd.x : "";
            ws.getCell(rN, 18).value = nd.y !== null ? nd.y : "";
            ws.getCell(rN, 19).value = nd.support || "Libre";

            // Fórmulas automáticas de Rx y Ry
            ws.getCell(rN, 20).value = {
                formula: `IF(Q${rN}="","", IF(LEFT(UPPER(TRIM(S${rN})),4)="FIJO", 1, IF(OR(UPPER(TRIM(S${rN}))="MOVIL X", UPPER(TRIM(S${rN}))="MÓVIL X", UPPER(TRIM(S${rN}))="RODILLO X"), 1, 0)))`
            };
            ws.getCell(rN, 21).value = {
                formula: `IF(Q${rN}="","", IF(LEFT(UPPER(TRIM(S${rN})),4)="FIJO", 1, IF(OR(UPPER(TRIM(S${rN}))="MOVIL Y", UPPER(TRIM(S${rN}))="MÓVIL Y", UPPER(TRIM(S${rN}))="RODILLO Y", UPPER(TRIM(S${rN}))="MOVIL", UPPER(TRIM(S${rN}))="MÓVIL"), 1, 0)))`
            };

            ws.getCell(rN, 22).value = nd.px !== null ? nd.px : "";
            ws.getCell(rN, 23).value = nd.py !== null ? nd.py : "";

            applyStyling(ws, rN, rN, 16, 16, { fill: COLORS.CARD_BG, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            applyStyling(ws, rN, rN, 17, 18, { fill: COLORS.INPUT_BG, font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_INPUT } }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '#,##0.00' });
            applyStyling(ws, rN, rN, 19, 19, { fill: COLORS.INPUT_BG, font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_INPUT } }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            applyStyling(ws, rN, rN, 20, 21, { fill: COLORS.CARD_BG, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            applyStyling(ws, rN, rN, 22, 23, { fill: COLORS.INPUT_BG, font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_INPUT } }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '#,##0.00' });
            ws.getRow(rN).height = 19;
        }

        // Tabla 2: Conectividad y Grados de Libertad (Filas 15 a 24)
        const t2TitleRow = 15;
        ws.mergeCells(`B${t2TitleRow}:H${t2TitleRow}`);
        ws.getCell(`B${t2TitleRow}`).value = "CONECTIVIDAD DE BARRAS Y GRADOS DE LIBERTAD ASOCIADOS:";
        applyStyling(ws, t2TitleRow, t2TitleRow, 2, 8, {
            fill: COLORS.SEC_BG,
            font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLORS.HERO_TEXT } },
            align: { horizontal: 'left', vertical: 'middle' }
        });
        ws.getRow(t2TitleRow).height = 20;

        const t2HdrRow = t2TitleRow + 1;
        const t2Headers = [
            [t2HdrRow, 2, "BARRA"],
            [t2HdrRow, 3, "NUDO INICIO"],
            [t2HdrRow, 4, "u_ini_x"],
            [t2HdrRow, 5, "u_ini_y"],
            [t2HdrRow, 6, "NUDO FIN"],
            [t2HdrRow, 7, "u_fin_x"],
            [t2HdrRow, 8, "u_fin_y"]
        ];
        for (const [r, c, txt] of t2Headers) {
            ws.getCell(r, c).value = txt;
        }
        applyStyling(ws, t2HdrRow, t2HdrRow, 2, 8, {
            fill: COLORS.SEC_BG,
            font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.HERO_TEXT } },
            align: { horizontal: 'center', vertical: 'middle' },
            border: thinBorder
        });
        ws.getRow(t2HdrRow).height = 18;

        const t2DataStart = t2HdrRow + 1;

        // Rellenar Tabla 2 (Barras 1 a 8)
        for (let m = 1; m <= MAX_BARS; m++) {
            const r2 = t2DataStart + m - 1;
            const br = barsData[m - 1] || { id: m, start: null, end: null, a: 10.0, e: 2100000.0 };
            const barCol = BAR_PASTEL_PALETTE[(m - 1) % BAR_PASTEL_PALETTE.length];

            ws.getCell(r2, 2).value = m;
            ws.getCell(r2, 3).value = br.start !== null && br.start !== undefined ? br.start : "";
            ws.getCell(r2, 6).value = br.end !== null && br.end !== undefined ? br.end : "";

            ws.getCell(r2, 4).value = { formula: `IF(C${r2}="","", "U" & C${r2} & "X")` };
            ws.getCell(r2, 5).value = { formula: `IF(C${r2}="","", "U" & C${r2} & "Y")` };
            ws.getCell(r2, 7).value = { formula: `IF(F${r2}="","", "U" & F${r2} & "X")` };
            ws.getCell(r2, 8).value = { formula: `IF(F${r2}="","", "U" & F${r2} & "Y")` };

            applyStyling(ws, r2, r2, 2, 2, { fill: barCol.bg, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            applyStyling(ws, r2, r2, 3, 3, { fill: COLORS.INPUT_BG, font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_INPUT } }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            applyStyling(ws, r2, r2, 4, 5, { fill: COLORS.CARD_BG, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            applyStyling(ws, r2, r2, 6, 6, { fill: COLORS.INPUT_BG, font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_INPUT } }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            applyStyling(ws, r2, r2, 7, 8, { fill: COLORS.CARD_BG, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            ws.getRow(r2).height = 19;
        }

        // Rellenar Tabla 1: Propiedades Geométricas con Fórmulas
        for (let m = 1; m <= MAX_BARS; m++) {
            const r1 = 5 + m;
            const r2 = t2DataStart + m - 1;
            const br = barsData[m - 1] || { id: m, start: null, end: null, a: 10.0, e: 2100000.0 };
            const barCol = BAR_PASTEL_PALETTE[(m - 1) % BAR_PASTEL_PALETTE.length];

            ws.getCell(r1, 2).value = m;
            applyStyling(ws, r1, r1, 2, 2, { fill: barCol.bg, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });

            ws.getCell(r1, 3).value = { formula: `IF(C${r2}="","", IFERROR(VLOOKUP(C${r2}, ${nodalTableRange}, 2, FALSE), ""))` };
            ws.getCell(r1, 4).value = { formula: `IF(C${r2}="","", IFERROR(VLOOKUP(C${r2}, ${nodalTableRange}, 3, FALSE), ""))` };
            ws.getCell(r1, 5).value = { formula: `IF(F${r2}="","", IFERROR(VLOOKUP(F${r2}, ${nodalTableRange}, 2, FALSE), ""))` };
            ws.getCell(r1, 6).value = { formula: `IF(F${r2}="","", IFERROR(VLOOKUP(F${r2}, ${nodalTableRange}, 3, FALSE), ""))` };
            applyStyling(ws, r1, r1, 3, 6, { fill: COLORS.INPUT_BG, font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_INPUT } }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '#,##0.00' });

            ws.getCell(r1, 7).value = { formula: `IF(OR(C${r1}="",E${r1}=""), "", E${r1}-C${r1})` };
            ws.getCell(r1, 8).value = { formula: `IF(OR(D${r1}="",F${r1}=""), "", F${r1}-D${r1})` };
            ws.getCell(r1, 9).value = { formula: `IF(OR(G${r1}="",H${r1}=""), "", SQRT(G${r1}^2+H${r1}^2))` };
            ws.getCell(r1, 10).value = { formula: `IF(OR(I${r1}="",I${r1}=0), "", G${r1}/I${r1})` };
            ws.getCell(r1, 11).value = { formula: `IF(OR(I${r1}="",I${r1}=0), "", H${r1}/I${r1})` };

            applyStyling(ws, r1, r1, 7, 8, { fill: COLORS.CARD_BG, font: { name: 'Segoe UI', size: 9 }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '#,##0.00' });
            applyStyling(ws, r1, r1, 9, 9, { fill: COLORS.CARD_BG, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '#,##0.00' });
            applyStyling(ws, r1, r1, 10, 11, { fill: COLORS.CARD_BG, font: { name: 'Segoe UI', size: 9 }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '0.0000' });

            ws.getCell(r1, 12).value = { formula: `IF(C${r2}="","", ${br.a || 10.0})` };
            ws.getCell(r1, 13).value = { formula: `IF(C${r2}="","", ${br.e || 2100000.0})` };
            applyStyling(ws, r1, r1, 12, 12, { fill: COLORS.INPUT_BG, font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_INPUT } }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '#,##0.00' });
            applyStyling(ws, r1, r1, 13, 13, { fill: COLORS.INPUT_BG, font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_INPUT } }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '#,##0' });

            ws.getCell(r1, 14).value = { formula: `IF(OR(I${r1}="",I${r1}=0,L${r1}="",M${r1}=""), 0, (L${r1}*M${r1})/I${r1})` };
            applyStyling(ws, r1, r1, 14, 14, { fill: COLORS.CARD_BG, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '#,##0.00' });
            ws.getRow(r1).height = 19;
        }

        // Sección 3: Matrices Locales (4x4) y Expandidas (12x12) para las 8 Barras
        let currR = t2DataStart + MAX_BARS + 2;
        const factors = [
            ["J", "J", 1], ["J", "K", 1], ["J", "J", -1], ["J", "K", -1],
            ["J", "K", 1], ["K", "K", 1], ["J", "K", -1], ["K", "K", -1],
            ["J", "J", -1], ["J", "K", -1], ["J", "J", 1], ["J", "K", 1],
            ["J", "K", -1], ["K", "K", -1], ["J", "K", 1], ["K", "K", 1]
        ];
        const expMatrixStartRows = [];

        for (let m = 1; m <= MAX_BARS; m++) {
            const t1Row = 5 + m;
            const t2Row = t2DataStart + (m - 1);
            const barCol = BAR_PASTEL_PALETTE[(m - 1) % BAR_PASTEL_PALETTE.length];

            // Encabezado 4x4
            const hdr4x4Row = currR;
            ws.getCell(hdr4x4Row, 1).value = `k${m}=`;
            applyStyling(ws, hdr4x4Row, hdr4x4Row, 1, 1, {
                font: { name: 'Segoe UI', size: 11, bold: true, color: { argb: COLORS.TEXT_DARK } },
                align: { horizontal: 'center', vertical: 'middle' }
            });

            ws.getCell(hdr4x4Row, 2).value = { formula: `IF(D${t2Row}="","-",D${t2Row})` };
            ws.getCell(hdr4x4Row, 3).value = { formula: `IF(E${t2Row}="","-",E${t2Row})` };
            ws.getCell(hdr4x4Row, 4).value = { formula: `IF(G${t2Row}="","-",G${t2Row})` };
            ws.getCell(hdr4x4Row, 5).value = { formula: `IF(H${t2Row}="","-",H${t2Row})` };
            applyStyling(ws, hdr4x4Row, hdr4x4Row, 2, 5, {
                fill: barCol.bg,
                font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_DARK } },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });
            ws.getRow(hdr4x4Row).height = 19;

            // Contenido 4x4
            const mat4x4Row = hdr4x4Row + 1;
            const dofColsT2 = ["D", "E", "G", "H"];

            for (let iRow = 0; iRow < 4; iRow++) {
                const r = mat4x4Row + iRow;
                ws.getCell(r, 6).value = { formula: `IF(${dofColsT2[iRow]}${t2Row}="","-",${dofColsT2[iRow]}${t2Row})` };
                applyStyling(ws, r, r, 6, 6, {
                    fill: barCol.bg,
                    font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_DARK } },
                    align: { horizontal: 'center', vertical: 'middle' },
                    border: thinBorder
                });

                for (let jCol = 0; jCol < 4; jCol++) {
                    const fIdx = iRow * 4 + jCol;
                    const [c1, c2, sign] = factors[fIdx];
                    const signStr = sign === -1 ? "-" : "";
                    ws.getCell(r, 2 + jCol).value = {
                        formula: `IF(N${t1Row}=0, 0, ${signStr}N${t1Row}*${c1}${t1Row}*${c2}${t1Row})`
                    };
                    applyStyling(ws, r, r, 2 + jCol, 2 + jCol, {
                        fill: barCol.bg,
                        font: { name: 'Segoe UI', size: 9 },
                        align: { horizontal: 'right', vertical: 'middle' },
                        border: thinBorder,
                        numFmt: '#,##0.00'
                    });
                }
                ws.getRow(r).height = 18;
            }

            // Matriz Expandida Km (12x12)
            const hdrExpRow = mat4x4Row + 5;
            for (let cIdx = 0; cIdx < dofsTotal; cIdx++) {
                ws.getCell(hdrExpRow, 2 + cIdx).value = dofsList[cIdx];
            }
            applyStyling(ws, hdrExpRow, hdrExpRow, 2, 1 + dofsTotal, {
                fill: COLORS.SEC_BG,
                font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.HERO_TEXT } },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });
            ws.getRow(hdrExpRow).height = 19;

            const matExpRow = hdrExpRow + 1;
            expMatrixStartRows.push(matExpRow);

            const midExpRow = matExpRow + Math.floor(dofsTotal / 2) - 1;
            ws.getCell(midExpRow, 1).value = `K${m}=`;
            applyStyling(ws, midExpRow, midExpRow, 1, 1, {
                font: { name: 'Segoe UI', size: 11, bold: true },
                align: { horizontal: 'center', vertical: 'middle' }
            });

            const lblColIdx = 2 + dofsTotal; // Col N (14)
            const lblColLet = getColLetter(lblColIdx);

            for (let iRow = 0; iRow < dofsTotal; iRow++) {
                const currExpR = matExpRow + iRow;
                ws.getCell(currExpR, lblColIdx).value = dofsList[iRow];
                applyStyling(ws, currExpR, currExpR, lblColIdx, lblColIdx, {
                    fill: barCol.bg,
                    font: { name: 'Segoe UI', size: 9, bold: true },
                    align: { horizontal: 'center', vertical: 'middle' },
                    border: thinBorder
                });

                for (let iCol = 2; iCol < 2 + dofsTotal; iCol++) {
                    const colLet = getColLetter(iCol);
                    const formulaStr = `IFERROR(INDEX($B$${mat4x4Row}:$E$${mat4x4Row + 3}, MATCH($${lblColLet}${currExpR}, $B$${hdr4x4Row}:$E$${hdr4x4Row}, 0), MATCH(${colLet}$${hdrExpRow}, $B$${hdr4x4Row}:$E$${hdr4x4Row}, 0)), 0)`;
                    ws.getCell(currExpR, iCol).value = { formula: formulaStr };
                    applyStyling(ws, currExpR, currExpR, iCol, iCol, {
                        fill: COLORS.WHITE,
                        font: { name: 'Segoe UI', size: 9 },
                        align: { horizontal: 'right', vertical: 'middle' },
                        border: thinBorder,
                        numFmt: '#,##0.00'
                    });
                }
                ws.getRow(currExpR).height = 19;
            }

            currR = matExpRow + dofsTotal + 2;
        }

        // Sección 4: Karmadura (12x12)
        const hdrKarmRow = currR;
        const karmEndColLet = getColLetter(1 + dofsTotal);
        const karmLblColIdx = 2 + dofsTotal;
        const karmLblColLet = getColLetter(karmLblColIdx);

        for (let cIdx = 0; cIdx < dofsTotal; cIdx++) {
            ws.getCell(hdrKarmRow, 2 + cIdx).value = dofsList[cIdx];
        }
        applyStyling(ws, hdrKarmRow, hdrKarmRow, 2, 1 + dofsTotal, {
            fill: COLORS.SEC_BG,
            font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.HERO_TEXT } },
            align: { horizontal: 'center', vertical: 'middle' },
            border: thinBorder
        });
        ws.getRow(hdrKarmRow).height = 20;

        const matKarmRow = hdrKarmRow + 1;
        const matKarmEnd = matKarmRow + dofsTotal - 1;
        const midKarmRow = matKarmRow + Math.floor(dofsTotal / 2) - 1;

        ws.getCell(midKarmRow, 1).value = "Karmadura=";
        applyStyling(ws, midKarmRow, midKarmRow, 1, 1, {
            font: { name: 'Segoe UI', size: 11, bold: true },
            align: { horizontal: 'center', vertical: 'middle' }
        });

        for (let iR = 0; iR < dofsTotal; iR++) {
            const currKR = matKarmRow + iR;
            ws.getCell(currKR, karmLblColIdx).value = dofsList[iR];
            applyStyling(ws, currKR, currKR, karmLblColIdx, karmLblColIdx, {
                fill: COLORS.TBL_SUB,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });

            for (let iC = 2; iC < 2 + dofsTotal; iC++) {
                const cLet = getColLetter(iC);
                const sumParts = expMatrixStartRows.map(expR => `${cLet}${expR + iR}`);
                ws.getCell(currKR, iC).value = { formula: sumParts.join("+") };

                const nodeR = Math.floor(iR / 2);
                const nodeC = Math.floor((iC - 2) / 2);
                const isDiag = (iR === (iC - 2));

                applyStyling(ws, currKR, currKR, iC, iC, {
                    fill: (nodeR === nodeC) ? COLORS.KARM_DIAG : COLORS.WHITE,
                    font: { name: 'Segoe UI', size: 9, bold: (nodeR === nodeC) },
                    align: { horizontal: 'right', vertical: 'middle' },
                    border: isDiag ? diagBorder : thinBorder,
                    numFmt: '#,##0.00'
                });
            }
            ws.getRow(currKR).height = 20;
        }

        // 1. Matriz de Cargas {C} (12 DOFs)
        const cargasHdrRow = matKarmRow + dofsTotal + 2;
        ws.getCell(cargasHdrRow, 1).value = "Matriz de cargas:";
        applyStyling(ws, cargasHdrRow, cargasHdrRow, 1, 1, {
            font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLORS.TEXT_DARK } }
        });
        ws.getRow(cargasHdrRow).height = 20;

        const cargasStartRow = cargasHdrRow + 1;
        const cargasEndRow = cargasStartRow + dofsTotal - 1;
        const midCargaRow = cargasStartRow + Math.floor(dofsTotal / 2) - 1;

        ws.getCell(midCargaRow, 1).value = "C=";
        applyStyling(ws, midCargaRow, midCargaRow, 1, 1, {
            fill: COLORS.PROF_GREEN,
            font: { name: 'Segoe UI', size: 9, bold: true },
            align: { horizontal: 'center', vertical: 'middle' },
            border: thinBorder
        });

        for (let idxD = 0; idxD < dofsTotal; idxD++) {
            const r = cargasStartRow + idxD;
            const nodeNum = Math.floor(idxD / 2) + 1;
            const isX = (idxD % 2 === 0);
            const dofVarC = `C${nodeNum}${isX ? 'X' : 'Y'}`;
            const dofLblU = `U${nodeNum}${isX ? 'X' : 'Y'}`;

            ws.getCell(r, 2).value = dofVarC;
            ws.getCell(r, 3).value = dofLblU;
            applyStyling(ws, r, r, 2, 3, {
                fill: COLORS.WHITE,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });

            if (r === midCargaRow) {
                ws.getCell(r, 4).value = "=";
                ws.getCell(r, 4).alignment = { horizontal: 'center', vertical: 'middle' };
            }

            const restColIdx = isX ? 5 : 6;
            const loadColIdx = isX ? 7 : 8;
            const cFormula = `IF(IFERROR(VLOOKUP(${nodeNum}, ${nodalTableRange}, 2, FALSE), "")="", 0, IF(VLOOKUP(${nodeNum}, ${nodalTableRange}, ${restColIdx}, FALSE)=1, B${r}, VLOOKUP(${nodeNum}, ${nodalTableRange}, ${loadColIdx}, FALSE)))`;

            ws.getCell(r, 5).value = { formula: cFormula };
            applyStyling(ws, r, r, 5, 5, {
                fill: COLORS.PEACH_BG,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'right', vertical: 'middle' },
                border: thinBorder,
                numFmt: '#,##0.00'
            });
            ws.getRow(r).height = 19;
        }

        // 2. Matriz de Desplazamientos {D} (12 DOFs)
        const dispHdrRow = cargasEndRow + 2;
        ws.getCell(dispHdrRow, 1).value = "Matriz de desplazamientos:";
        applyStyling(ws, dispHdrRow, dispHdrRow, 1, 1, {
            font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLORS.TEXT_DARK } }
        });
        ws.getRow(dispHdrRow).height = 20;

        const dispStartRow = dispHdrRow + 1;
        const dispEndRow = dispStartRow + dofsTotal - 1;
        const midDispRow = dispStartRow + Math.floor(dofsTotal / 2) - 1;

        ws.getCell(midDispRow, 1).value = "D=";
        applyStyling(ws, midDispRow, midDispRow, 1, 1, {
            fill: COLORS.PROF_GREEN,
            font: { name: 'Segoe UI', size: 9, bold: true },
            align: { horizontal: 'center', vertical: 'middle' },
            border: thinBorder
        });

        for (let idxD = 0; idxD < dofsTotal; idxD++) {
            const r = dispStartRow + idxD;
            const srcCR = cargasStartRow + idxD;
            const nodeNum = Math.floor(idxD / 2) + 1;
            const isX = (idxD % 2 === 0);
            const dofVarD = `D${nodeNum}${isX ? 'X' : 'Y'}`;
            const dofLblU = `U${nodeNum}${isX ? 'X' : 'Y'}`;

            ws.getCell(r, 2).value = dofVarD;
            ws.getCell(r, 3).value = dofLblU;
            applyStyling(ws, r, r, 2, 3, {
                fill: COLORS.WHITE,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });

            if (r === midDispRow) {
                ws.getCell(r, 4).value = "=";
                ws.getCell(r, 4).alignment = { horizontal: 'center', vertical: 'middle' };
            }

            const restColIdx = isX ? 5 : 6;
            const dFormula = `IF(IFERROR(VLOOKUP(${nodeNum}, ${nodalTableRange}, 2, FALSE), "")="", 0, IF(VLOOKUP(${nodeNum}, ${nodalTableRange}, ${restColIdx}, FALSE)=1, 0, B${r}))`;

            ws.getCell(r, 5).value = { formula: dFormula };
            applyStyling(ws, r, r, 5, 5, {
                fill: COLORS.PEACH_BG,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });

            // Columnas Auxiliares F y G: Conteo dinámico de libres y restringidos
            if (idxD === 0) {
                ws.getCell(r, 6).value = { formula: `IF(ISTEXT(E${r}), 1, "")` };
                ws.getCell(r, 7).value = { formula: `IF(ISTEXT(E${srcCR}), 1, "")` };
            } else {
                ws.getCell(r, 6).value = { formula: `IF(ISTEXT(E${r}), MAX(F$${dispStartRow}:F${r - 1}) + 1, "")` };
                ws.getCell(r, 7).value = { formula: `IF(ISTEXT(E${srcCR}), MAX(G$${dispStartRow}:G${r - 1}) + 1, "")` };
            }
            applyStyling(ws, r, r, 6, 7, {
                fill: COLORS.CARD_BG,
                font: { name: 'Segoe UI', size: 8, italic: true, color: { argb: COLORS.TEXT_MUTED } },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });
            ws.getRow(r).height = 19;
        }

        // Tarjeta Pedagógica 1
        const card1Lines = [
            "• Columna B: Variable del vector (C1X, C1Y / D1X, D1Y) hasta 6 nodos (12 GDL).",
            "• Columna C: Grado de libertad global asociado (U1X, U1Y...).",
            "• Columna E (Cargas): Si hay apoyo, C=Cnx (reacción incógnita). Si está libre, C=Px (carga externa).",
            "• Columna E (Desplazamientos): Si hay apoyo, D=0 (restringido). Si está libre, D=Dnx (desplazamiento incógnita).",
            "• Columnas F y G (Auxiliares): Conteo dinámico de grados libres (D≠0) y apoyos (D=0) para extraer K11 y K21."
        ];
        writePedagCard(ws, cargasHdrRow, dispEndRow, pedagCStart, pedagCEnd,
            "1. MATRIZ DE CARGAS Y DESPLAZAMIENTOS ({C} Y {D})", card1Lines);

        // 3. Ecuación Matricial Global: C = Karmadura*D (12x12)
        const sysHdrRow = dispEndRow + 2;
        ws.getCell(sysHdrRow, 1).value = "Ecuacion matricial:";
        applyStyling(ws, sysHdrRow, sysHdrRow, 1, 1, {
            font: { name: 'Segoe UI', size: 10, bold: true, underline: true, color: { argb: COLORS.TEXT_DARK } }
        });
        ws.getRow(sysHdrRow).height = 22;

        ws.mergeCells(sysHdrRow, 3, sysHdrRow, 4);
        ws.getCell(sysHdrRow, 3).value = "C = Karmadura*D";
        applyStyling(ws, sysHdrRow, sysHdrRow, 3, 4, {
            fill: COLORS.YELLOW_BANNER,
            font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_DARK } },
            align: { horizontal: 'center', vertical: 'middle' },
            border: thinBorder
        });

        ws.getCell(sysHdrRow, 5).value = "ELIMINO FILA Y COLUMNA DE LOS QUE NO CORRESPONDE PARA HALLAR LOS DESPLAZAMIENTOS";
        applyStyling(ws, sysHdrRow, sysHdrRow, 5, 5, {
            font: { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF334155' } }
        });
        ws.getCell(sysHdrRow + 1, 5).value = "ELIMINO COLUMNA SEGÚN LAS REACCIONES EN ORDEN SIN CONSIDERAR LAS FILAS ANULADAS";
        applyStyling(ws, sysHdrRow + 1, sysHdrRow + 1, 5, 5, {
            font: { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF334155' } }
        });

        const sysDataStart = sysHdrRow + 3;
        ws.getCell(sysDataStart - 1, 1).value = "C";
        ws.getCell(sysDataStart - 1, 3).value = "K";
        const dispColIdx = 3 + dofsTotal + 1;
        ws.getCell(sysDataStart - 1, dispColIdx).value = "D";
        applyStyling(ws, sysDataStart - 1, sysDataStart - 1, 1, dispColIdx, {
            font: { name: 'Segoe UI', size: 9, bold: true },
            align: { horizontal: 'center', vertical: 'middle' }
        });

        for (let idxD = 0; idxD < dofsTotal; idxD++) {
            const r = sysDataStart + idxD;
            const srcCargasR = cargasStartRow + idxD;
            const srcDispR = dispStartRow + idxD;

            ws.getCell(r, 1).value = { formula: `E${srcCargasR}` };
            applyStyling(ws, r, r, 1, 1, {
                fill: COLORS.WHITE,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'right', vertical: 'middle' },
                border: thinBorder,
                numFmt: '#,##0.00'
            });

            if (idxD === Math.floor(dofsTotal / 2)) {
                ws.getCell(r, 2).value = "=";
                ws.getCell(r, 2).alignment = { horizontal: 'center', vertical: 'middle' };
            }

            for (let colK = 0; colK < dofsTotal; colK++) {
                const cDest = 3 + colK;
                const cSrc = 2 + colK;
                const srcLet = getColLetter(cSrc);
                const srcRow = matKarmRow + idxD;
                ws.getCell(r, cDest).value = { formula: `${srcLet}${srcRow}` };
                applyStyling(ws, r, r, cDest, cDest, {
                    fill: COLORS.WHITE,
                    font: { name: 'Segoe UI', size: 9 },
                    align: { horizontal: 'right', vertical: 'middle' },
                    border: thinBorder,
                    numFmt: '#,##0.00'
                });
            }

            ws.getCell(r, 3 + dofsTotal).value = "·";
            ws.getCell(r, 3 + dofsTotal).alignment = { horizontal: 'center', vertical: 'middle' };

            ws.getCell(r, dispColIdx).value = { formula: `E${srcDispR}` };
            applyStyling(ws, r, r, dispColIdx, dispColIdx, {
                fill: COLORS.WHITE,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });
            ws.getRow(r).height = 20;
        }

        // Tarjeta Pedagógica 2
        const card2Lines = [
            "• Fundamento: Ley de Hooke generalizada para armaduras planas {C} = [K_global] · {D}.",
            "• Apunte del Docente: 'ELIMINO FILA Y COLUMNA DE LOS QUE NO CORRESPONDE PARA HALLAR LOS DESPLAZAMIENTOS'.",
            "• Partición de Rigidez:",
            "    [ C_libres ] = [ K11   K12 ] · [ D_libres ]",
            "    [ R_apoyos ]   [ K21   K22 ]   [    0     ]",
            "• K11 (verde pastel): Rigideces directas para {D_libres} = [K11]⁻¹ · {C_libres}.",
            "• K21 (lavanda pastel): Rigideces de acoplamiento para reacciones {R} = [K21] · {D_libres}."
        ];
        writePedagCard(ws, sysHdrRow, sysDataStart + dofsTotal - 1, pedagCStart, pedagCEnd,
            "2. ECUACIÓN MATRICIAL GLOBAL: {C} = [K] · {D}", card2Lines);

        // 4. Ecuación Matricial Reducida (K11: nFree x nFree)
        const k11HdrRow = sysDataStart + dofsTotal + 2;
        ws.getCell(k11HdrRow, 1).value = "Ecuacion matricial reducida para el calculo de desplazamientos:";
        applyStyling(ws, k11HdrRow, k11HdrRow, 1, 1, {
            font: { name: 'Segoe UI', size: 10, bold: true, underline: true, color: { argb: COLORS.TEXT_DARK } }
        });
        ws.getRow(k11HdrRow).height = 22;

        const k11ColDofsRow = k11HdrRow + 1;
        for (let jF = 0; jF < nFree; jF++) {
            const cDest = 3 + jF;
            const k = jF + 1;
            ws.getCell(k11ColDofsRow, cDest).value = {
                formula: `IFERROR(INDEX(C$${dispStartRow}:C$${dispEndRow}, MATCH(${k}, F$${dispStartRow}:F$${dispEndRow}, 0)), "-")`
            };
            applyStyling(ws, k11ColDofsRow, k11ColDofsRow, cDest, cDest, {
                fill: COLORS.PROF_GREEN,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });
        }
        ws.getRow(k11ColDofsRow).height = 18;

        const k11DataStart = k11ColDofsRow + 1;
        const k11EndRow = k11DataStart + nFree - 1;
        const midK11Row = k11DataStart + Math.floor(nFree / 2);

        const k11HelperCol = 3 + nFree + 2;
        const k11HelperColLet = getColLetter(k11HelperCol);
        const dLblCol = 3 + nFree + 1;

        for (let iF = 0; iF < nFree; iF++) {
            const r = k11DataStart + iF;
            const k = iF + 1;

            ws.getCell(r, k11HelperCol).value = {
                formula: `IFERROR(INDEX(C$${dispStartRow}:C$${dispEndRow}, MATCH(${k}, F$${dispStartRow}:F$${dispEndRow}, 0)), "-")`
            };
            applyStyling(ws, r, r, k11HelperCol, k11HelperCol, {
                fill: COLORS.CARD_BG,
                font: { name: 'Segoe UI', size: 8, italic: true, color: { argb: COLORS.TEXT_MUTED } },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });

            ws.getCell(r, dLblCol).value = {
                formula: `IFERROR(INDEX(B$${dispStartRow}:B$${dispEndRow}, MATCH(${k}, F$${dispStartRow}:F$${dispEndRow}, 0)), "-")`
            };
            applyStyling(ws, r, r, dLblCol, dLblCol, {
                fill: COLORS.PROF_GREEN,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });

            ws.getCell(r, 1).value = {
                formula: `IF($${k11HelperColLet}${r}="-", 0, IFERROR(INDEX(E$${cargasStartRow}:E$${cargasEndRow}, MATCH($${k11HelperColLet}${r}, C$${cargasStartRow}:C$${cargasEndRow}, 0)), 0))`
            };
            applyStyling(ws, r, r, 1, 1, {
                fill: COLORS.PROF_GREEN,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'right', vertical: 'middle' },
                border: thinBorder,
                numFmt: '#,##0.00'
            });

            if (r === midK11Row) {
                ws.getCell(r, 2).value = "=";
                ws.getCell(r, 2).alignment = { horizontal: 'center', vertical: 'middle' };
            }

            for (let jF = 0; jF < nFree; jF++) {
                const cDest = 3 + jF;
                const colDestLet = getColLetter(cDest);
                const inactVal = (iF === jF) ? "1" : "0";

                const formulaStr = `IF(OR($${k11HelperColLet}${r}="-", ${colDestLet}$${k11ColDofsRow}="-"), ${inactVal}, ` +
                    `IF(OR(` +
                    `IFERROR(INDEX($B$${matKarmRow}:${karmEndColLet}${matKarmEnd}, MATCH($${k11HelperColLet}${r}, $${karmLblColLet}$${matKarmRow}:$${karmLblColLet}$${matKarmEnd}, 0), MATCH($${k11HelperColLet}${r}, $B$${hdrKarmRow}:${karmEndColLet}$${hdrKarmRow}, 0)), 0)=0, ` +
                    `IFERROR(INDEX($B$${matKarmRow}:${karmEndColLet}${matKarmEnd}, MATCH(${colDestLet}$${k11ColDofsRow}, $${karmLblColLet}$${matKarmRow}:$${karmLblColLet}$${matKarmEnd}, 0), MATCH(${colDestLet}$${k11ColDofsRow}, $B$${hdrKarmRow}:${karmEndColLet}$${hdrKarmRow}, 0)), 0)=0), ` +
                    `${inactVal}, ` +
                    `IFERROR(INDEX($B$${matKarmRow}:${karmEndColLet}${matKarmEnd}, MATCH($${k11HelperColLet}${r}, $${karmLblColLet}$${matKarmRow}:$${karmLblColLet}$${matKarmEnd}, 0), MATCH(${colDestLet}$${k11ColDofsRow}, $B$${hdrKarmRow}:${karmEndColLet}$${hdrKarmRow}, 0)), 0)))`;

                ws.getCell(r, cDest).value = { formula: formulaStr };
                applyStyling(ws, r, r, cDest, cDest, {
                    fill: COLORS.PROF_GREEN,
                    font: { name: 'Segoe UI', size: 9, bold: true },
                    align: { horizontal: 'right', vertical: 'middle' },
                    border: thinBorder,
                    numFmt: '#,##0.00'
                });
            }

            ws.getCell(r, 3 + nFree).value = "·";
            ws.getCell(r, 3 + nFree).alignment = { horizontal: 'center', vertical: 'middle' };
            ws.getRow(r).height = 20;
        }

        // 5. D = MINVERSA(K)*C
        const invBannerRow = k11EndRow + 2;
        const bannerEndCol = Math.max(3 + nFree - 1, 4);
        ws.mergeCells(invBannerRow, 3, invBannerRow, bannerEndCol);
        ws.getCell(invBannerRow, 3).value = "D=MINVERSA(K)*C";
        applyStyling(ws, invBannerRow, invBannerRow, 3, bannerEndCol, {
            fill: COLORS.YELLOW_BANNER,
            font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_DARK } },
            align: { horizontal: 'center', vertical: 'middle' },
            border: thinBorder
        });
        ws.getRow(invBannerRow).height = 20;

        const invHdrRow = invBannerRow + 1;
        ws.getCell(invHdrRow, 1).value = "D";
        applyStyling(ws, invHdrRow, invHdrRow, 1, 1, {
            font: { name: 'Segoe UI', size: 9, bold: true },
            align: { horizontal: 'center', vertical: 'middle' }
        });

        if (nFree > 1) {
            ws.mergeCells(invHdrRow, 3, invHdrRow, 3 + nFree - 1);
        }
        ws.getCell(invHdrRow, 3).value = "MIN";
        applyStyling(ws, invHdrRow, invHdrRow, 3, 3, {
            font: { name: 'Segoe UI', size: 9, bold: true },
            align: { horizontal: 'center', vertical: 'middle' }
        });

        const cVecColIdx = 3 + nFree + 1;
        const cVecColLet = getColLetter(cVecColIdx);
        ws.getCell(invHdrRow, cVecColIdx).value = "C";
        applyStyling(ws, invHdrRow, invHdrRow, cVecColIdx, cVecColIdx, {
            font: { name: 'Segoe UI', size: 9, bold: true },
            align: { horizontal: 'center', vertical: 'middle' }
        });

        const invStartRow = invHdrRow + 1;
        const invEndRow = invStartRow + nFree - 1;
        const colK11Start = "C";
        const colK11End = getColLetter(3 + nFree - 1);

        for (let iF = 0; iF < nFree; iF++) {
            const r = invStartRow + iF;
            const dLblColLet = getColLetter(dLblCol);

            ws.getCell(r, 1).value = { formula: `${dLblColLet}${k11DataStart + iF}` };
            applyStyling(ws, r, r, 1, 1, {
                fill: COLORS.WHITE,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });

            if (r === invStartRow + Math.floor(nFree / 2)) {
                ws.getCell(r, 2).value = "=";
                ws.getCell(r, 2).alignment = { horizontal: 'center', vertical: 'middle' };
            }

            ws.getCell(r, cVecColIdx).value = { formula: `A${k11DataStart + iF}` };
            applyStyling(ws, r, r, cVecColIdx, cVecColIdx, {
                fill: COLORS.WHITE,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'right', vertical: 'middle' },
                border: thinBorder,
                numFmt: '#,##0.00'
            });
            ws.getRow(r).height = 20;
        }

        // Fórmulas MINVERSA en el bloque
        ws.getCell(`C${invStartRow}`).value = {
            formula: `MINVERSE(C${k11DataStart}:${colK11End}${k11EndRow})`,
            shareType: 'array',
            ref: `C${invStartRow}:${colK11End}${invEndRow}`
        };
        applyStyling(ws, invStartRow, invEndRow, 3, 2 + nFree, {
            fill: COLORS.WHITE,
            font: { name: 'Segoe UI', size: 9 },
            align: { horizontal: 'right', vertical: 'middle' },
            border: thinBorder,
            numFmt: '0.00000E+00'
        });

        // 6. D = MMULT(MIN)*C
        const duBannerRow = invEndRow + 2;
        ws.mergeCells(duBannerRow, 3, duBannerRow, 4);
        ws.getCell(duBannerRow, 3).value = "D=MMULT(MIN)*C";
        applyStyling(ws, duBannerRow, duBannerRow, 3, 4, {
            fill: COLORS.YELLOW_BANNER,
            font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_DARK } },
            align: { horizontal: 'center', vertical: 'middle' },
            border: thinBorder
        });
        ws.getRow(duBannerRow).height = 20;

        const duHdrRow = duBannerRow + 1;
        ws.getCell(duHdrRow, 1).value = "D";
        ws.getCell(duHdrRow, 3).value = "MM*C";
        applyStyling(ws, duHdrRow, duHdrRow, 1, 3, {
            font: { name: 'Segoe UI', size: 9, bold: true },
            align: { horizontal: 'center', vertical: 'middle' }
        });

        const duStartRow = duHdrRow + 1;
        const duEndRow = duStartRow + nFree - 1;

        for (let iF = 0; iF < nFree; iF++) {
            const r = duStartRow + iF;
            ws.getCell(r, 1).value = { formula: `A${invStartRow + iF}` };
            applyStyling(ws, r, r, 1, 1, {
                fill: COLORS.WHITE,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });

            if (r === duStartRow + Math.floor(nFree / 2)) {
                ws.getCell(r, 2).value = "=";
                ws.getCell(r, 2).alignment = { horizontal: 'center', vertical: 'middle' };
            }

            ws.getCell(r, 4).value = "cm";
            applyStyling(ws, r, r, 4, 4, {
                fill: COLORS.WHITE,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });
            ws.getRow(r).height = 20;
        }

        ws.getCell(`C${duStartRow}`).value = {
            formula: `MMULT(C${invStartRow}:${colK11End}${invEndRow}, ${cVecColLet}${invStartRow}:${cVecColLet}${invEndRow})`,
            shareType: 'array',
            ref: `C${duStartRow}:C${duEndRow}`
        };
        applyStyling(ws, duStartRow, duEndRow, 3, 3, {
            fill: COLORS.WHITE,
            font: { name: 'Segoe UI', size: 9, bold: true },
            align: { horizontal: 'right', vertical: 'middle' },
            border: thinBorder,
            numFmt: '0.000000000'
        });

        // Tarjeta Pedagógica 3
        const card3Lines = [
            "• Submatriz [K11]: Extraída dinámicamente con INDEX/MATCH desde Karmadura usando los grados libres.",
            "• Vector de Cargas {C}: Fuerzas externas actuantes en los nudos libres.",
            "• Inversión [MINVERSA]: Matriz de flexibilidad [K11]⁻¹ en cm/Kgf.",
            "• Multiplicación [MMULT]: {D_libres} = [K11]⁻¹ · {C} obtiene los desplazamientos reales en cm."
        ];
        writePedagCard(ws, k11HdrRow, duEndRow, pedagCStart, pedagCEnd,
            "3. CÁLCULO DE DESPLAZAMIENTOS: {D} = [K₁₁]⁻¹ · {C}", card3Lines);

        // 7. Ecuación Matricial Reducida para Reacciones (K21: nRest x nFree)
        const k21HdrRow = duEndRow + 3;
        ws.getCell(k21HdrRow, 1).value = "Ecuacion matricial reducida para el calculo de reacciones";
        applyStyling(ws, k21HdrRow, k21HdrRow, 1, 1, {
            font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLORS.TEXT_DARK } }
        });
        ws.getRow(k21HdrRow).height = 20;

        const k21SubHdr = k21HdrRow + 1;
        ws.getCell(k21SubHdr, 1).value = "C";
        const duColDest = 3 + nFree + 1;
        const duColDestLet = getColLetter(duColDest);
        ws.getCell(k21SubHdr, duColDest).value = "D";
        applyStyling(ws, k21SubHdr, k21SubHdr, 1, duColDest, {
            font: { name: 'Segoe UI', size: 9, bold: true },
            align: { horizontal: 'center', vertical: 'middle' }
        });

        const k21DataStart = k21SubHdr + 1;
        const k21EndRow = k21DataStart + nRest - 1;
        const k21ColEnd = getColLetter(3 + nFree - 1);
        const k21HelperCol = 3 + nFree + 2;
        const k21HelperColLet = getColLetter(k21HelperCol);

        for (let iR = 0; iR < nRest; iR++) {
            const r = k21DataStart + iR;
            const k = iR + 1;

            ws.getCell(r, k21HelperCol).value = {
                formula: `IFERROR(INDEX(C$${dispStartRow}:C$${dispEndRow}, MATCH(${k}, G$${dispStartRow}:G$${dispEndRow}, 0)), "-")`
            };
            applyStyling(ws, r, r, k21HelperCol, k21HelperCol, {
                fill: COLORS.CARD_BG,
                font: { name: 'Segoe UI', size: 8, italic: true, color: { argb: COLORS.TEXT_MUTED } },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });

            ws.getCell(r, 1).value = {
                formula: `IF($${k21HelperColLet}${r}="-", "-", IFERROR(INDEX(B$${cargasStartRow}:B$${cargasEndRow}, MATCH($${k21HelperColLet}${r}, C$${cargasStartRow}:C$${cargasEndRow}, 0)), "-"))`
            };
            applyStyling(ws, r, r, 1, 1, {
                fill: COLORS.GRAY_REAC,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });

            if (iR === Math.floor(nRest / 2)) {
                ws.getCell(r, 2).value = "=";
                ws.getCell(r, 2).alignment = { horizontal: 'center', vertical: 'middle' };
            }

            for (let jF = 0; jF < nFree; jF++) {
                const cDest = 3 + jF;
                const colDestLet = getColLetter(cDest);
                const formulaStr = `IF(OR($${k21HelperColLet}${r}="-", ${colDestLet}$${k11ColDofsRow}="-"), 0, ` +
                    `IFERROR(INDEX($B$${matKarmRow}:${karmEndColLet}${matKarmEnd}, MATCH($${k21HelperColLet}${r}, $${karmLblColLet}$${matKarmRow}:$${karmLblColLet}$${matKarmEnd}, 0), MATCH(${colDestLet}$${k11ColDofsRow}, $B$${hdrKarmRow}:${karmEndColLet}$${hdrKarmRow}, 0)), 0))`;

                ws.getCell(r, cDest).value = { formula: formulaStr };
                applyStyling(ws, r, r, cDest, cDest, {
                    fill: COLORS.WHITE,
                    font: { name: 'Segoe UI', size: 9 },
                    align: { horizontal: 'right', vertical: 'middle' },
                    border: thinBorder,
                    numFmt: '#,##0.00'
                });
            }

            if (iR < nFree) {
                ws.getCell(r, duColDest).value = { formula: `C${duStartRow + iR}` };
                applyStyling(ws, r, r, duColDest, duColDest, {
                    fill: COLORS.WHITE,
                    font: { name: 'Segoe UI', size: 9 },
                    align: { horizontal: 'right', vertical: 'middle' },
                    border: thinBorder,
                    numFmt: '0.000000000'
                });
            }
            ws.getRow(r).height = 20;
        }

        if (nRest < nFree) {
            for (let extraI = nRest; extraI < nFree; extraI++) {
                const r = k21DataStart + extraI;
                ws.getCell(r, duColDest).value = { formula: `C${duStartRow + extraI}` };
                applyStyling(ws, r, r, duColDest, duColDest, {
                    fill: COLORS.WHITE,
                    font: { name: 'Segoe UI', size: 9 },
                    align: { horizontal: 'right', vertical: 'middle' },
                    border: thinBorder,
                    numFmt: '0.000000000'
                });
                ws.getRow(r).height = 20;
            }
        }

        // Bloque de Resultados de Reacciones {R}
        const reacResStart = Math.max(k21EndRow, k21DataStart + nFree - 1) + 2;
        const reacResEnd = reacResStart + nRest - 1;

        for (let iR = 0; iR < nRest; iR++) {
            const r = reacResStart + iR;
            ws.getCell(r, 1).value = { formula: `A${k21DataStart + iR}` };
            applyStyling(ws, r, r, 1, 1, {
                fill: COLORS.WHITE,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });

            if (iR === Math.floor(nRest / 2)) {
                ws.getCell(r, 2).value = "=";
                ws.getCell(r, 2).alignment = { horizontal: 'center', vertical: 'middle' };
            }

            ws.getCell(r, 4).value = "Kgf";
            applyStyling(ws, r, r, 4, 4, {
                fill: COLORS.WHITE,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });
            ws.getRow(r).height = 20;
        }

        ws.getCell(`C${reacResStart}`).value = {
            formula: `MMULT(C${k21DataStart}:${k21ColEnd}${k21EndRow}, ${duColDestLet}${k21DataStart}:${duColDestLet}${k21DataStart + nFree - 1})`,
            shareType: 'array',
            ref: `C${reacResStart}:C${reacResEnd}`
        };
        applyStyling(ws, reacResStart, reacResEnd, 3, 3, {
            fill: COLORS.WHITE,
            font: { name: 'Segoe UI', size: 9, bold: true },
            align: { horizontal: 'right', vertical: 'middle' },
            border: thinBorder,
            numFmt: '#,##0.00'
        });

        // Tarjeta Pedagógica 4
        const card4Lines = [
            "• Submatriz [K21]: Filas de apoyos (D=0) y columnas de grados libres (D≠0).",
            "• Multiplicación [MMULT]: {R} = [K21] · {D_libres} genera las reacciones en cada apoyo en Kgf.",
            "• Verificación de Equilibrio Global: ∑ Fx = 0  y  ∑ Fy = 0 (Equilibrio estático exacto)."
        ];
        writePedagCard(ws, k21HdrRow, reacResEnd, pedagCStart, pedagCEnd,
            "4. CÁLCULO DE REACCIONES: {R} = [K₂₁] · {D}", card4Lines);

        // 8. Matriz de Desplazamientos Total (12 DOFs)
        const dtotHdrRow = reacResEnd + 3;
        ws.getCell(dtotHdrRow, 1).value = "Matriz de desplazamientos total";
        applyStyling(ws, dtotHdrRow, dtotHdrRow, 1, 1, {
            font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLORS.TEXT_DARK } }
        });
        ws.getRow(dtotHdrRow).height = 20;

        const dtotStartRow = dtotHdrRow + 2;
        const dtotEndRow = dtotStartRow + dofsTotal - 1;

        for (let idxD = 0; idxD < dofsTotal; idxD++) {
            const r = dtotStartRow + idxD;
            const nodeNum = Math.floor(idxD / 2) + 1;
            const isX = (idxD % 2 === 0);

            ws.getCell(r, 1).value = `D${nodeNum}${isX ? 'X' : 'Y'}`;
            ws.getCell(r, 2).value = `U${nodeNum}${isX ? 'X' : 'Y'}`;
            applyStyling(ws, r, r, 1, 2, {
                fill: COLORS.WHITE,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });

            ws.getCell(r, 4).value = {
                formula: `IFERROR(INDEX(C$${duStartRow}:C$${duEndRow}, MATCH(A${r}, A$${duStartRow}:A$${duEndRow}, 0)), 0)`
            };
            applyStyling(ws, r, r, 4, 4, {
                fill: COLORS.WHITE,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'right', vertical: 'middle' },
                border: thinBorder,
                numFmt: '0.000000000'
            });
            ws.getRow(r).height = 19;
        }

        // 9. Cálculo de Fuerzas en las 8 Barras
        const forcesHdrRow = dtotStartRow + dofsTotal + 2;
        ws.getCell(forcesHdrRow, 1).value = "Calculo de las fuerzas";
        applyStyling(ws, forcesHdrRow, forcesHdrRow, 1, 1, {
            font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLORS.TEXT_DARK } }
        });
        ws.getRow(forcesHdrRow).height = 22;

        let fBarCurr = forcesHdrRow + 2;
        const barForceResultRows = {};

        for (let m = 1; m <= MAX_BARS; m++) {
            const t1Row = 5 + m;
            const t2Row = t2DataStart + (m - 1);

            const rHdr1 = fBarCurr;
            ws.getCell(rHdr1, 1).value = "AE/L";
            ws.getCell(rHdr1, 3).value = "cx";
            ws.getCell(rHdr1, 4).value = "cy";
            ws.getCell(rHdr1, 5).value = "cx";
            ws.getCell(rHdr1, 6).value = "cy";
            ws.getCell(rHdr1, 7).value = "D";
            applyStyling(ws, rHdr1, rHdr1, 1, 1, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' } });
            applyStyling(ws, rHdr1, rHdr1, 3, 7, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' } });
            ws.getRow(rHdr1).height = 18;

            const rHdr2 = fBarCurr + 1;
            ws.getCell(rHdr2, 3).value = "-";
            ws.getCell(rHdr2, 4).value = "-";
            ws.getCell(rHdr2, 5).value = "+";
            ws.getCell(rHdr2, 6).value = "+";
            applyStyling(ws, rHdr2, rHdr2, 3, 6, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' } });
            ws.getRow(rHdr2).height = 16;

            const r3 = fBarCurr + 2;
            ws.getCell(r3, 1).value = { formula: `N${t1Row}` };
            applyStyling(ws, r3, r3, 1, 1, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '#,##0.00' });

            ws.getCell(r3, 3).value = { formula: `IF(J${t1Row}="","", -J${t1Row})` };
            ws.getCell(r3, 4).value = { formula: `IF(K${t1Row}="","", -K${t1Row})` };
            ws.getCell(r3, 5).value = { formula: `IF(J${t1Row}="","", J${t1Row})` };
            ws.getCell(r3, 6).value = { formula: `IF(K${t1Row}="","", K${t1Row})` };
            applyStyling(ws, r3, r3, 3, 6, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9 }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '0.0000' });

            ws.getCell(r3, 8).value = { formula: `IF(C${t2Row}="","", "D" & C${t2Row} & "X")` };
            ws.getCell(r3, 7).value = { formula: `IF(H${r3}="","", IFERROR(VLOOKUP(H${r3}, A$${dtotStartRow}:D$${dtotEndRow}, 4, FALSE), 0))` };
            applyStyling(ws, r3, r3, 7, 7, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9 }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '0.00000000' });
            applyStyling(ws, r3, r3, 8, 8, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            ws.getRow(r3).height = 20;

            const r4 = fBarCurr + 3;
            ws.getCell(r4, 1).value = `F${m}=`;
            applyStyling(ws, r4, r4, 1, 1, { font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' } });

            ws.getCell(r4, 2).value = {
                formula: `IF(OR(A${r3}=0, C${t2Row}=""), 0, (MMULT(C${r3}:F${r3}, G${r3}:G${r3 + 3})*A${r3}))`
            };
            applyStyling(ws, r4, r4, 2, 2, { fill: COLORS.YELLOW_BANNER, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '#,##0.000' });

            ws.getCell(r4, 8).value = { formula: `IF(C${t2Row}="","", "D" & C${t2Row} & "Y")` };
            ws.getCell(r4, 7).value = { formula: `IF(H${r4}="","", IFERROR(VLOOKUP(H${r4}, A$${dtotStartRow}:D$${dtotEndRow}, 4, FALSE), 0))` };
            applyStyling(ws, r4, r4, 7, 7, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9 }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '0.00000000' });
            applyStyling(ws, r4, r4, 8, 8, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            ws.getRow(r4).height = 20;

            const r5 = fBarCurr + 4;
            ws.getCell(r5, 8).value = { formula: `IF(F${t2Row}="","", "D" & F${t2Row} & "X")` };
            ws.getCell(r5, 7).value = { formula: `IF(H${r5}="","", IFERROR(VLOOKUP(H${r5}, A$${dtotStartRow}:D$${dtotEndRow}, 4, FALSE), 0))` };
            applyStyling(ws, r5, r5, 7, 7, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9 }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '0.00000000' });
            applyStyling(ws, r5, r5, 8, 8, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            ws.getRow(r5).height = 20;

            const r6 = fBarCurr + 5;
            ws.getCell(r6, 8).value = { formula: `IF(F${t2Row}="","", "D" & F${t2Row} & "Y")` };
            ws.getCell(r6, 7).value = { formula: `IF(H${r6}="","", IFERROR(VLOOKUP(H${r6}, A$${dtotStartRow}:D$${dtotEndRow}, 4, FALSE), 0))` };
            applyStyling(ws, r6, r6, 7, 7, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9 }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '0.00000000' });
            applyStyling(ws, r6, r6, 8, 8, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            ws.getRow(r6).height = 20;

            const r7 = fBarCurr + 6;
            ws.getCell(r7, 2).value = "Kgf";
            applyStyling(ws, r7, r7, 2, 2, { font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' } });

            ws.mergeCells(r7, 3, r7, 6);
            ws.getCell(r7, 3).value = {
                formula: `IF(C${t2Row}="","", IF(B${r4}>0.001,"BARRA A TRACCIÓN (+)",IF(B${r4}<-0.001,"BARRA A COMPRESIÓN (-)","BARRA DE FUERZA NULA")))`
            };
            applyStyling(ws, r7, r7, 3, 6, {
                fill: COLORS.PROF_GREEN,
                font: { name: 'Segoe UI', size: 9, bold: true },
                align: { horizontal: 'center', vertical: 'middle' },
                border: thinBorder
            });
            ws.getRow(r7).height = 20;

            barForceResultRows[m] = [r4, r7];
            fBarCurr = r7 + 2;
        }

        // Tarjeta Pedagógica 5
        const card5Lines = [
            "• Fila de Signos [-cx, -cy, +cx, +cy]: Deformación axial relativa de la barra m.",
            "• Fuerza Axial F_m: Obtenida mediante =(MMULT(C:F, G:G)*A) vinculada a los nudos reales.",
            "• Diagnóstico de Estado: Tracción (+), Compresión (-) o Fuerza Nula."
        ];
        const card5End = Math.min(forcesHdrRow + 25, fBarCurr - 1);
        writePedagCard(ws, forcesHdrRow, card5End, pedagCStart, pedagCEnd,
            "5. CÁLCULO DE FUERZAS EN BARRAS: {Fₘ} = (AE/L) · [-cx, -cy, cx, cy] · {D}", card5Lines);

        // 10. Resumen General de Fuerzas en las Barras (8 Barras)
        const sumHdrRow = fBarCurr + 1;
        ws.mergeCells(sumHdrRow, 2, sumHdrRow, 8);
        ws.getCell(sumHdrRow, 2).value = "RESUMEN GENERAL DE FUERZAS EN LAS BARRAS (HASTA 8 BARRAS)";
        applyStyling(ws, sumHdrRow, sumHdrRow, 2, 8, {
            fill: COLORS.SEC_TEAL,
            font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLORS.HERO_TEXT } },
            align: { horizontal: 'left', vertical: 'middle' }
        });
        ws.getRow(sumHdrRow).height = 22;

        const sumCols = [
            [sumHdrRow + 1, 2, "BARRA\n#"],
            [sumHdrRow + 1, 3, "NUDO\nINI"],
            [sumHdrRow + 1, 4, "NUDO\nFIN"],
            [sumHdrRow + 1, 5, "LONGITUD L\n(cm)"],
            [sumHdrRow + 1, 6, "ÁREA A\n(cm²)"],
            [sumHdrRow + 1, 7, "FUERZA AXIAL N\n(Kgf)"],
            [sumHdrRow + 1, 8, "ESTADO ESTRUCTURAL\n(TRACCIÓN / COMPRESIÓN)"]
        ];

        for (const [r, c, txt] of sumCols) {
            ws.getCell(r, c).value = txt;
        }
        applyStyling(ws, sumHdrRow + 1, sumHdrRow + 1, 2, 8, {
            fill: COLORS.SEC_BG,
            font: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.HERO_TEXT } },
            align: { horizontal: 'center', vertical: 'middle' },
            border: thinBorder
        });
        ws.getRow(sumHdrRow + 1).height = 24;

        for (let m = 1; m <= MAX_BARS; m++) {
            const r = sumHdrRow + 1 + m;
            const t1Row = 5 + m;
            const t2Row = t2DataStart + (m - 1);
            const [r4Res, r7Res] = barForceResultRows[m];
            const barCol = BAR_PASTEL_PALETTE[(m - 1) % BAR_PASTEL_PALETTE.length];

            ws.getCell(r, 2).value = { formula: `IF(C${t2Row}="","", ${m})` };
            ws.getCell(r, 3).value = { formula: `IF(C${t2Row}="","", C${t2Row})` };
            ws.getCell(r, 4).value = { formula: `IF(F${t2Row}="","", F${t2Row})` };
            ws.getCell(r, 5).value = { formula: `IF(I${t1Row}="","", I${t1Row})` };
            ws.getCell(r, 6).value = { formula: `IF(C${t2Row}="","", L${t1Row})` };
            ws.getCell(r, 7).value = { formula: `IF(C${t2Row}="","", B${r4Res})` };
            ws.getCell(r, 8).value = { formula: `IF(C${t2Row}="","", C${r7Res})` };

            applyStyling(ws, r, r, 2, 2, { fill: barCol.bg, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            applyStyling(ws, r, r, 3, 4, { fill: COLORS.CARD_BG, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            applyStyling(ws, r, r, 5, 6, { fill: COLORS.WHITE, font: { name: 'Segoe UI', size: 9 }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '#,##0.00' });
            applyStyling(ws, r, r, 7, 7, { fill: COLORS.YELLOW_BANNER, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'right', vertical: 'middle' }, border: thinBorder, numFmt: '#,##0.000' });
            applyStyling(ws, r, r, 8, 8, { fill: COLORS.PROF_GREEN, font: { name: 'Segoe UI', size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: thinBorder });
            ws.getRow(r).height = 20;
        }

        return ws;
    }

    /**
     * Genera un libro Excel completo con las hojas Isostática e Hiperestática
     * y retorna el buffer listo para descargar o guardar en disco.
     */
    async function generateTrussWorkbook(nodesData, barsData, isIsostatic = true) {
        if (!ExcelJS) {
            throw new Error("La biblioteca ExcelJS no está cargada.");
        }

        const wb = new ExcelJS.Workbook();
        wb.creator = "Cátedra Ing. Ulianov Cuba Valencia - Análisis Estructural II";
        wb.lastModifiedBy = "Antigravity Autonomous Engineering Core";
        wb.created = new Date();
        wb.modified = new Date();

        const sheetName = isIsostatic ? "MANUAL_ISOSTATICA_3R" : "MANUAL_HIPERESTATICA_4R";
        buildDynamicWorksheet(wb, sheetName, nodesData, barsData, isIsostatic);

        const altSheetName = isIsostatic ? "MANUAL_HIPERESTATICA_4R" : "MANUAL_ISOSTATICA_3R";
        buildDynamicWorksheet(wb, altSheetName, nodesData, barsData, !isIsostatic);

        return wb;
    }

    /**
     * Dispara la descarga directa en el navegador cliente
     */
    async function downloadTrussExcel(nodesData, barsData, isIsostatic = true, filename = null) {
        const wb = await generateTrussWorkbook(nodesData, barsData, isIsostatic);
        const buffer = await wb.xlsx.writeBuffer();

        const defaultFilename = `Armadura_Estructural_${isIsostatic ? 'Isostatica' : 'Hiperestatica'}_Automatizada.xlsx`;
        const finalName = filename || defaultFilename;

        if (typeof window !== 'undefined' && window.Blob && window.URL) {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = finalName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            return true;
        }
        return buffer;
    }

    return {
        buildDynamicWorksheet,
        generateTrussWorkbook,
        downloadTrussExcel,
        COLORS,
        BAR_PASTEL_PALETTE
    };
}));

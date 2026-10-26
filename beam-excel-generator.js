/**
 * beam-excel-generator.js — CEREBRO ESTRUCTURAL v4.0 (Parche 4.0 Basado en Parche 3.0)
 * Generador 100% Dinámico de la Pestaña Única "PLANTILLA ULIANOV" en Excel (.xlsx)
 * - Usa exclusivamente la pestaña "PLANTILLA ULIANOV" (hasta 12 Nudos y 11 Barras)
 * - Inyección Dual (Fórmula Nativa de Excel + Resultado Precalculado por BeamSolver)
 *   eliminando por completo cualquier error #¡VALOR! o #¡DIV/0! en cualquier versión de Excel
 * - Colores básicos clásicos de Excel (Amarillo, Celeste, Verde Suave, Durazno Suave) y 100% letras negras.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        const ExcelJS = require('./assets/exceljs.min.js');
        const BeamSolver = require('./beam-solver.js');
        module.exports = factory(ExcelJS, BeamSolver);
    } else {
        root.BeamExcelGenerator = factory(root.ExcelJS, root.BeamSolver);
        root.ExcelGenerator = root.BeamExcelGenerator;
    }
}(typeof self !== 'undefined' ? self : this, function (ExcelJS, BeamSolver) {
    'use strict';

    const PALETTE = {
        WHITE:        'FFFFFFFF',
        YELLOW_INPUT: 'FFFFF2CC',
        YELLOW_BRIGHT:'FFFFFF00',
        CELESTE:      'FFCCECFF',
        HEADER_BLUE:  'FFB4C6E7',
        SUBHDR_BLUE:  'FFD9E1F2',
        GREEN_SOFT:   'FFC6EFCE',
        GREEN_PASTEL: 'FFE2EFDA',
        PEACH_SOFT:   'FFFCE4D6',
        LAVENDER:     'FFEDEDFA',
        GRAY_SOFT:    'FFF2F2F2',
        BLACK:        'FF000000',
        BORDER_DARK:  'FF000000',
        BORDER_MED:   'FF595959'
    };

    const BAR_COLORS = [
        'FFCCECFF', // Barra 1: Celeste
        'FFC6EFCE', // Barra 2: Verde suave
        'FFFFF2CC', // Barra 3: Amarillo suave
        'FFFCE4D6', // Barra 4: Durazno suave
        'FFEDEDFA', // Barra 5: Lavanda suave
        'FFD9E1F2', // Barra 6: Azul claro
        'FFE2EFDA', // Barra 7: Menta
        'FFFFE699', // Barra 8: Dorado claro
        'FFF8CBAD', // Barra 9: Salmón claro
        'FFBDD7EE', // Barra 10: Cielo
        'FFD0CECE'  // Barra 11: Gris perla
    ];

    const BORDERS = {
        ALL: {
            top:    { style: 'thin', color: { argb: PALETTE.BORDER_MED } },
            bottom: { style: 'thin', color: { argb: PALETTE.BORDER_MED } },
            left:   { style: 'thin', color: { argb: PALETTE.BORDER_MED } },
            right:  { style: 'thin', color: { argb: PALETTE.BORDER_MED } }
        },
        HDR: {
            top:    { style: 'medium', color: { argb: PALETTE.BORDER_DARK } },
            bottom: { style: 'medium', color: { argb: PALETTE.BORDER_DARK } },
            left:   { style: 'thin',   color: { argb: PALETTE.BORDER_DARK } },
            right:  { style: 'thin',   color: { argb: PALETTE.BORDER_DARK } }
        },
        BOX: {
            top:    { style: 'medium', color: { argb: PALETTE.BORDER_DARK } },
            bottom: { style: 'medium', color: { argb: PALETTE.BORDER_DARK } },
            left:   { style: 'medium', color: { argb: PALETTE.BORDER_DARK } },
            right:  { style: 'medium', color: { argb: PALETTE.BORDER_DARK } }
        },
        TOTAL: {
            top:    { style: 'thin',   color: { argb: PALETTE.BORDER_DARK } },
            bottom: { style: 'double', color: { argb: PALETTE.BORDER_DARK } },
            left:   { style: 'thin',   color: { argb: PALETTE.BORDER_DARK } },
            right:  { style: 'thin',   color: { argb: PALETTE.BORDER_DARK } }
        }
    };

    const FONTS = {
        BANNER:  { name: 'Calibri', size: 11, bold: true, color: { argb: PALETTE.BLACK } },
        HDR:     { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.BLACK } },
        SUBHDR:  { name: 'Calibri', size: 9,  bold: true, color: { argb: PALETTE.BLACK } },
        BOLD:    { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.BLACK } },
        REG:     { name: 'Calibri', size: 10, bold: false, color: { argb: PALETTE.BLACK } },
        SMALL:   { name: 'Calibri', size: 9,  bold: false, color: { argb: PALETTE.BLACK } },
        SMALL_B: { name: 'Calibri', size: 9,  bold: true, color: { argb: PALETTE.BLACK } }
    };

    const ALIGNS = {
        CENTER: { horizontal: 'center', vertical: 'middle', wrapText: true },
        LEFT:   { horizontal: 'left',   vertical: 'middle', wrapText: true },
        RIGHT:  { horizontal: 'right',  vertical: 'middle', wrapText: true }
    };

    const FMTS = {
        INT:  '0',
        DEC2: '0.00',
        DEC3: '0.000',
        DEC4: '0.0000',
        DISP: '0.000000000',
        SCI:  '0.0000E+00'
    };

    function getColLetter(colIdx) {
        let temp = '';
        let letter = '';
        while (colIdx > 0) {
            temp = (colIdx - 1) % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            colIdx = (colIdx - temp - 1) / 26;
        }
        return letter;
    }

    function styleCell(cell, fillArgb, fontObj, borderObj, alignObj, numFmtStr) {
        if (fillArgb) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
        }
        if (fontObj) cell.font = fontObj;
        if (borderObj) cell.border = borderObj;
        if (alignObj) cell.alignment = alignObj;
        if (numFmtStr) cell.numFmt = numFmtStr;
    }

    function makeBanner(ws, row, c1, c2, text, fillArgb) {
        ws.mergeCells(row, c1, row, c2);
        ws.getRow(row).height = 22;
        for (let c = c1; c <= c2; c++) {
            const cell = ws.getCell(row, c);
            if (c === c1) cell.value = text;
            styleCell(cell, fillArgb, FONTS.BANNER, BORDERS.BOX, ALIGNS.CENTER);
        }
    }

    function setFormulaWithResult(ws, row, col, formulaNoEq, resultVal) {
        ws.getCell(row, col).value = {
            formula: formulaNoEq,
            result: (resultVal === undefined || resultVal === null) ? '' : resultVal
        };
    }

    /**
     * Construye el libro Excel con la ÚNICA pestaña "PLANTILLA ULIANOV"
     */
    async function generateBeamWorkbook(config) {
        if (!ExcelJS) throw new Error('ExcelJS no está disponible.');
        const solver = BeamSolver.solveBeam(config);
        const sp = solver.secProps;

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Ingeniero Ulianov Cuba - Análisis Estructural II (v4.0)';
        wb.lastModifiedBy = 'CEREBRO ESTRUCTURAL v4.0 - Edición Vigas';
        wb.created = new Date();
        wb.modified = new Date();
        wb.calcProperties.fullCalcOnLoad = true;
        wb.calcProperties.forceFullCalculation = true;

        const ws = wb.addWorksheet('PLANTILLA ULIANOV', {
            views: [{ showGridLines: true, zoomScale: 85 }]
        });

        // Anchos de columna
        ws.getColumn(1).width = 3;
        ws.getColumn(2).width = 18;
        const colWidths = {
            3: 14, 4: 11, 5: 11, 6: 16, 7: 14, 8: 11, 9: 13, 10: 11,
            11: 11, 12: 14, 13: 13, 14: 14, 15: 13, 16: 13, 17: 13,
            18: 13, 19: 13, 20: 13, 21: 13, 22: 13, 23: 14, 24: 14, 25: 14, 26: 14
        };
        Object.keys(colWidths).forEach(k => {
            ws.getColumn(Number(k)).width = colWidths[k];
        });
        for (let c = 27; c <= 46; c++) {
            ws.getColumn(c).width = 10.5;
        }

        // =========================================================================
        // BLOQUE 1A (Cols B..I, Filas 1..7): SELECTOR UNIVERSAL DE SECCIÓN Y MATERIAL
        // =========================================================================
        makeBanner(ws, 1, 2, 9, '1A. PROPIEDADES DEL MATERIAL Y SELECTOR UNIVERSAL DE SECCIÓN (CON MENÚ DESPLEGABLE)', PALETTE.CELESTE);

        // Fila 2
        ws.getCell(2, 2).value = 'E (Elasticidad) =';
        ws.getCell(2, 3).value = sp.E;
        ws.getCell(2, 4).value = 'kgf/cm²';
        ws.getCell(2, 6).value = 'Área Activa A =';
        setFormulaWithResult(ws, 2, 7,
            'IF(C3="RECTANGULAR",C4*C5,IF(C3="CIRCULAR",PI()*(C4^2)/4,IF(C3="TUBULAR_CIRCULAR",PI()*((C4^2)-(C5^2))/4,IF(C3="TRAPEZOIDAL",((C4+C6)/2)*C5,IF(C3="TRIANGULAR",(C4*C5)/2,IF(C3="CAJON_HUECO",(C4*C5)-(C6*C7),IF(C3="STEINER_COMPUESTA",R10,C4)))))))',
            sp.A
        );
        ws.getCell(2, 8).value = 'cm²';
        ws.getCell(2, 9).value = 'Calculado Auto';

        // Fila 3
        ws.getCell(3, 2).value = 'Tipo de Sección =';
        ws.getCell(3, 3).value = sp.sec_type;
        ws.getCell(3, 3).dataValidation = {
            type: 'list',
            allowBlank: false,
            formulae: ['"RECTANGULAR,CIRCULAR,TUBULAR_CIRCULAR,TRAPEZOIDAL,TRIANGULAR,CAJON_HUECO,STEINER_COMPUESTA,DIRECTO_A_I"']
        };
        ws.getCell(3, 4).value = '← Menú Desplegable';
        ws.getCell(3, 6).value = 'Centroide Y_CG =';
        setFormulaWithResult(ws, 3, 7,
            'IF(C3="RECTANGULAR",C5/2,IF(C3="CIRCULAR",C4/2,IF(C3="TUBULAR_CIRCULAR",C4/2,IF(C3="TRAPEZOIDAL",IF((C4+C6)>0,C5*(C4+2*C6)/(3*(C4+C6)),0),IF(C3="TRIANGULAR",C5/3,IF(C3="CAJON_HUECO",C5/2,IF(C3="STEINER_COMPUESTA",S10,0)))))))',
            sp.Y_CG
        );
        ws.getCell(3, 8).value = 'cm';
        ws.getCell(3, 9).value = 'Eje Neutro';

        // Fila 4
        setFormulaWithResult(ws, 4, 2,
            'IF(OR(C3="RECTANGULAR",C3="TRIANGULAR"),"b (Base)",IF(C3="CIRCULAR","D (Diámetro)",IF(C3="TUBULAR_CIRCULAR","D_ext (Diám. Ext.)",IF(C3="TRAPEZOIDAL","B_inf (Base Inferior)",IF(C3="CAJON_HUECO","B_ext (Base Exterior)",IF(C3="STEINER_COMPUESTA","Usando Steiner →","A_directa (Área)"))))))',
            sp.labels.p1
        );
        ws.getCell(4, 3).value = sp.b;
        setFormulaWithResult(ws, 4, 4, 'IF(C3="DIRECTO_A_I","cm²","cm")', sp.labels.u1);
        ws.getCell(4, 6).value = 'Inercia Activa I =';
        setFormulaWithResult(ws, 4, 7,
            'IF(C3="RECTANGULAR",(C4*(C5^3))/12,IF(C3="CIRCULAR",PI()*(C4^4)/64,IF(C3="TUBULAR_CIRCULAR",PI()*((C4^4)-(C5^4))/64,IF(C3="TRAPEZOIDAL",IF((C4+C6)>0,(C5^3)*((C4^2)+4*C4*C6+(C6^2))/(36*(C4+C6)),0),IF(C3="TRIANGULAR",(C4*(C5^3))/36,IF(C3="CAJON_HUECO",((C4*(C5^3))-(C6*(C7^3)))/12,IF(C3="STEINER_COMPUESTA",W10,C5)))))))',
            sp.I
        );
        ws.getCell(4, 8).value = 'cm⁴';
        ws.getCell(4, 9).value = 'Calculado Auto';

        // Fila 5
        setFormulaWithResult(ws, 5, 2,
            'IF(OR(C3="RECTANGULAR",C3="TRIANGULAR",C3="TRAPEZOIDAL"),"h (Altura)",IF(C3="TUBULAR_CIRCULAR","d_int (Diám. Int.)",IF(C3="CAJON_HUECO","H_ext (Altura Exterior)",IF(C3="DIRECTO_A_I","I_directa (Inercia)","- (No requiere)"))))',
            sp.labels.p2
        );
        ws.getCell(5, 3).value = sp.h;
        setFormulaWithResult(ws, 5, 4, 'IF(C3="DIRECTO_A_I","cm⁴","cm")', sp.labels.u2);
        ws.getCell(5, 6).value = 'Modo Propiedades =';
        ws.getCell(5, 7).value = config.prop_mode || 'CONSTANTE';
        ws.getCell(5, 7).dataValidation = {
            type: 'list',
            allowBlank: false,
            formulae: ['"CONSTANTE,PERSONALIZADO_POR_BARRA"']
        };
        ws.getCell(5, 8).value = '← Menú';
        ws.getCell(5, 9).value = 'Global en barras';

        // Fila 6
        setFormulaWithResult(ws, 6, 2,
            'IF(C3="TRAPEZOIDAL","b_sup (Base Superior)",IF(C3="CAJON_HUECO","b_int (Base Interior)","- (Opcional)"))',
            sp.labels.p3
        );
        ws.getCell(6, 3).value = sp.p3;
        ws.getCell(6, 4).value = 'cm';
        ws.getCell(6, 6).value = 'Barras Activas =';
        setFormulaWithResult(ws, 6, 7, 'COUNT(I14:I24)', solver.activeBarsCount);
        ws.getCell(6, 8).value = 'barras';
        ws.getCell(6, 9).value = 'Detectado Auto';

        // Fila 7
        setFormulaWithResult(ws, 7, 2,
            'IF(C3="CAJON_HUECO","h_int (Altura Interior)","- (Opcional)")',
            sp.labels.p4
        );
        ws.getCell(7, 3).value = sp.p4;
        ws.getCell(7, 4).value = 'cm';
        ws.getCell(7, 6).value = 'Nudos Activos =';
        setFormulaWithResult(ws, 7, 7, 'IF(G6>0,MAX(F28:H38),0)', solver.maxActiveNode);
        ws.getCell(7, 8).value = 'nudos';
        ws.getCell(7, 9).value = 'Correlacional';

        for (let r = 2; r <= 7; r++) {
            ws.getRow(r).height = 20;
            styleCell(ws.getCell(r, 2), r <= 5 ? PALETTE.HEADER_BLUE : PALETTE.SUBHDR_BLUE, FONTS.BOLD, BORDERS.ALL, ALIGNS.LEFT);
            styleCell(ws.getCell(r, 3), PALETTE.YELLOW_INPUT, FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER, r === 3 ? undefined : FMTS.DEC2);
            styleCell(ws.getCell(r, 4), PALETTE.GRAY_SOFT, FONTS.SMALL, BORDERS.ALL, ALIGNS.CENTER);
            styleCell(ws.getCell(r, 6), r <= 5 ? PALETTE.HEADER_BLUE : PALETTE.SUBHDR_BLUE, FONTS.BOLD, BORDERS.ALL, ALIGNS.LEFT);
            const gFill = (r === 2 || r === 4) ? PALETTE.GREEN_SOFT : (r === 3 ? PALETTE.GREEN_PASTEL : (r === 5 ? PALETTE.YELLOW_INPUT : PALETTE.CELESTE));
            const gFmt = (r === 2 || r === 4) ? FMTS.DEC2 : (r === 3 ? FMTS.DEC3 : (r >= 6 ? FMTS.INT : undefined));
            styleCell(ws.getCell(r, 7), gFill, FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER, gFmt);
            styleCell(ws.getCell(r, 8), PALETTE.GRAY_SOFT, FONTS.SMALL, BORDERS.ALL, ALIGNS.CENTER);
            styleCell(ws.getCell(r, 9), PALETTE.GRAY_SOFT, FONTS.SMALL, BORDERS.ALL, ALIGNS.CENTER);
        }

        // =========================================================================
        // BLOQUE 1B (Cols K..W, Filas 1..10): CALCULADORA UNIVERSAL POR STEINER
        // =========================================================================
        makeBanner(ws, 1, 11, 23, '1B. CALCULADORA DE CUALQUIER SECCIÓN COMPUESTA POR TEOREMA DE STEINER: I_x = ∑(I_0i + A_i · d_yi²)', PALETTE.CELESTE);

        const steinerHdrs = [
            [11, 'Pieza'], [12, 'Sub-Figura (Menú)'], [13, 'b o D (cm)'], [14, 'b_sup (Trap.)'],
            [15, 'h (Altura cm)'], [16, 'y_base (Cota Inf.)'], [17, 'x_c (Centro X)'],
            [18, 'Área A_i (cm²)'], [19, 'Centroide y_i (cm)'], [20, 'A_i · y_i (cm³)'],
            [21, 'I_0i Propia (cm⁴)'], [22, 'Steiner A_i·d_y²'], [23, 'I_xi Total (cm⁴)']
        ];
        steinerHdrs.forEach(([colI, txt]) => {
            const c = ws.getCell(2, colI);
            c.value = txt;
            styleCell(c, PALETTE.HEADER_BLUE, FONTS.SUBHDR, BORDERS.HDR, ALIGNS.CENTER);
        });

        sp.steiner.rows.forEach((sr, idxS) => {
            const r = 3 + idxS;
            ws.getCell(r, 11).value = idxS + 1;
            styleCell(ws.getCell(r, 11), PALETTE.SUBHDR_BLUE, FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER);

            ws.getCell(r, 12).value = sr.tipo;
            ws.getCell(r, 12).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['"NINGUNO,RECTANGULO,TRIANGULO,TRAPECIO,CIRCULO,SEMICIRCULO,HUECO_RECT,HUECO_CIRC"']
            };
            ws.getCell(r, 13).value = sr.active ? sr.b : null;
            ws.getCell(r, 14).value = sr.active ? sr.b_sup : null;
            ws.getCell(r, 15).value = sr.active ? sr.h : null;
            ws.getCell(r, 16).value = sr.active ? sr.y_base : null;
            ws.getCell(r, 17).value = sr.active ? sr.x_c : null;

            setFormulaWithResult(ws, r, 18,
                `IF(OR(L${r}="NINGUNO",L${r}="",M${r}="",M${r}=0),"",IF(L${r}="RECTANGULO",M${r}*O${r},IF(L${r}="TRIANGULO",(M${r}*O${r})/2,IF(L${r}="TRAPECIO",((M${r}+N${r})/2)*O${r},IF(L${r}="CIRCULO",PI()*(M${r}^2)/4,IF(L${r}="SEMICIRCULO",PI()*((M${r}/2)^2)/2,IF(L${r}="HUECO_RECT",-M${r}*O${r},IF(L${r}="HUECO_CIRC",-PI()*(M${r}^2)/4,""))))))))`,
                sr.active ? sr.A : ''
            );
            setFormulaWithResult(ws, r, 19,
                `IF(R${r}="","",N(P${r})+IF(OR(L${r}="RECTANGULO",L${r}="HUECO_RECT"),O${r}/2,IF(L${r}="TRIANGULO",O${r}/3,IF(L${r}="TRAPECIO",IF((M${r}+N${r})>0,O${r}*(M${r}+2*N${r})/(3*(M${r}+N${r})),0),IF(OR(L${r}="CIRCULO",L${r}="HUECO_CIRC"),M${r}/2,IF(L${r}="SEMICIRCULO",(4*(M${r}/2))/(3*PI()),0))))))`,
                sr.active ? sr.y_i : ''
            );
            setFormulaWithResult(ws, r, 20, `IF(R${r}="","",R${r}*S${r})`, sr.active ? sr.Ay : '');
            setFormulaWithResult(ws, r, 21,
                `IF(R${r}="","",IF(L${r}="RECTANGULO",(M${r}*(O${r}^3))/12,IF(L${r}="TRIANGULO",(M${r}*(O${r}^3))/36,IF(L${r}="TRAPECIO",IF((M${r}+N${r})>0,(O${r}^3)*((M${r}^2)+4*M${r}*N${r}+(N${r}^2))/(36*(M${r}+N${r})),0),IF(L${r}="CIRCULO",PI()*(M${r}^4)/64,IF(L${r}="SEMICIRCULO",((PI()/8)-(8/(9*PI())))*((M${r}/2)^4),IF(L${r}="HUECO_RECT",-(M${r}*(O${r}^3))/12,IF(L${r}="HUECO_CIRC",-PI()*(M${r}^4)/64,0))))))))`,
                sr.active ? sr.I0 : ''
            );
            setFormulaWithResult(ws, r, 22, `IF(R${r}="","",R${r}*((S${r}-$S$10)^2))`, sr.active ? sr.Ad2 : '');
            setFormulaWithResult(ws, r, 23, `IF(R${r}="","",U${r}+V${r})`, sr.active ? sr.Itot : '');

            for (let cI = 12; cI <= 23; cI++) {
                const fill = cI <= 17 ? PALETTE.YELLOW_INPUT : (cI === 23 ? PALETTE.GREEN_PASTEL : PALETTE.WHITE);
                const font = [12, 18, 23].includes(cI) ? FONTS.BOLD : FONTS.REG;
                styleCell(ws.getCell(r, cI), fill, font, BORDERS.ALL, ALIGNS.CENTER, cI >= 13 ? FMTS.DEC2 : undefined);
            }
        });

        // Fila 10: Totales Steiner
        ws.mergeCells(10, 11, 10, 17);
        ws.getRow(10).height = 21;
        for (let c = 11; c <= 17; c++) {
            if (c === 11) ws.getCell(10, 11).value = 'TOTALES SECCIÓN COMPUESTA POR STEINER (A_total, Y_CG, I_xx,Steiner) →';
            styleCell(ws.getCell(10, c), PALETTE.HEADER_BLUE, FONTS.BOLD, BORDERS.TOTAL, ALIGNS.RIGHT);
        }
        setFormulaWithResult(ws, 10, 18, 'SUM(R3:R9)', sp.steiner.A_total);
        setFormulaWithResult(ws, 10, 19, 'IF(R10<>0,T10/R10,0)', sp.steiner.Y_CG);
        setFormulaWithResult(ws, 10, 20, 'SUM(T3:T9)', sp.steiner.Ay_total);
        setFormulaWithResult(ws, 10, 21, 'SUM(U3:U9)', sp.steiner.I0_total);
        setFormulaWithResult(ws, 10, 22, 'SUM(V3:V9)', sp.steiner.Ad2_total);
        setFormulaWithResult(ws, 10, 23, 'SUM(W3:W9)', sp.steiner.I_total);
        for (let c = 18; c <= 23; c++) {
            styleCell(ws.getCell(10, c), PALETTE.GREEN_SOFT, FONTS.BOLD, BORDERS.TOTAL, ALIGNS.CENTER, FMTS.DEC2);
        }

        // =========================================================================
        // BLOQUE 2 (Filas 12..24): TABLA PRINCIPAL DE LAS 11 BARRAS
        // =========================================================================
        ws.getRow(12).height = 20;
        ws.getRow(13).height = 20;
        ws.mergeCells(12, 2, 13, 2); ws.getCell(12, 2).value = 'BARRA';
        ws.mergeCells(12, 3, 12, 4); ws.getCell(12, 3).value = 'Nudo Inicio';
        ws.getCell(13, 3).value = 'Xi'; ws.getCell(13, 4).value = 'Yi';
        ws.mergeCells(12, 5, 12, 6); ws.getCell(12, 5).value = 'Nudo Final';
        ws.getCell(13, 5).value = 'Xf'; ws.getCell(13, 6).value = 'Yf';

        const barTableCols = [
            [7, 'Dx'], [8, 'Dy'], [9, 'L'], [10, 'Cosx'], [11, 'Cosy'],
            [12, 'A'], [13, 'E'], [14, 'I'], [15, '12EI/L^3'], [16, '6EI/L^2'],
            [17, '4EI/L'], [18, '2EI/L'], [19, 'EA/L'], [20, 'q_dist (kgf/cm)'],
            [21, 'P_tramo (kgf)'], [22, 'a_dist (cm)'], [23, 'V_ini (kgf)'],
            [24, 'M_ini (kgf·cm)'], [25, 'V_fin (kgf)'], [26, 'M_fin (kgf·cm)']
        ];
        barTableCols.forEach(([colI, hTxt]) => {
            ws.mergeCells(12, colI, 13, colI);
            ws.getCell(12, colI).value = hTxt;
        });
        for (let r = 12; r <= 13; r++) {
            for (let c = 2; c <= 26; c++) {
                styleCell(ws.getCell(r, c), (r === 13 && c >= 3 && c <= 6) ? PALETTE.SUBHDR_BLUE : PALETTE.HEADER_BLUE, FONTS.HDR, BORDERS.HDR, ALIGNS.CENTER);
            }
        }

        solver.barsTable.forEach((bRow, bIdx) => {
            const r = 14 + bIdx;
            ws.getRow(r).height = 19;
            const bFill = BAR_COLORS[bIdx];

            ws.getCell(r, 2).value = bRow.barNum;
            styleCell(ws.getCell(r, 2), bFill, FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER);

            ws.getCell(r, 3).value = bRow.active ? bRow.xi : null;
            ws.getCell(r, 4).value = bRow.active ? bRow.yi : null;
            ws.getCell(r, 5).value = bRow.active ? bRow.xf : null;
            ws.getCell(r, 6).value = bRow.active ? bRow.yf : null;
            ws.getCell(r, 20).value = bRow.active ? bRow.q : null;
            ws.getCell(r, 21).value = bRow.active ? bRow.P_tramo : null;
            ws.getCell(r, 22).value = bRow.active ? bRow.a_dist : null;

            [3, 4, 5, 6, 20, 21, 22].forEach(cIn => {
                styleCell(ws.getCell(r, cIn), PALETTE.YELLOW_INPUT, FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER, FMTS.DEC2);
            });

            const act = `COUNTA(C${r}:F${r})=4`;
            setFormulaWithResult(ws, r, 7,  `IF(${act},E${r}-C${r},"")`, bRow.Dx);
            setFormulaWithResult(ws, r, 8,  `IF(${act},F${r}-D${r},"")`, bRow.Dy);
            setFormulaWithResult(ws, r, 9,  `IF(${act},SQRT(G${r}^2+H${r}^2),"")`, bRow.L);
            setFormulaWithResult(ws, r, 10, `IF(OR(I${r}="",I${r}=0),"",G${r}/I${r})`, bRow.Cosx);
            setFormulaWithResult(ws, r, 11, `IF(OR(I${r}="",I${r}=0),"",H${r}/I${r})`, bRow.Cosy);
            setFormulaWithResult(ws, r, 12, `IF(OR(I${r}="",I${r}=0),"",$G$2)`, bRow.A);
            setFormulaWithResult(ws, r, 13, `IF(OR(I${r}="",I${r}=0),"",$C$2)`, bRow.E);
            setFormulaWithResult(ws, r, 14, `IF(OR(I${r}="",I${r}=0),"",$G$4)`, bRow.I);
            setFormulaWithResult(ws, r, 15, `IF(OR(I${r}="",I${r}=0),"",(12*M${r}*N${r})/(I${r}^3))`, bRow.k12);
            setFormulaWithResult(ws, r, 16, `IF(OR(I${r}="",I${r}=0),"",(6*M${r}*N${r})/(I${r}^2))`, bRow.k6);
            setFormulaWithResult(ws, r, 17, `IF(OR(I${r}="",I${r}=0),"",(4*M${r}*N${r})/I${r})`, bRow.k4);
            setFormulaWithResult(ws, r, 18, `IF(OR(I${r}="",I${r}=0),"",(2*M${r}*N${r})/I${r})`, bRow.k2);
            setFormulaWithResult(ws, r, 19, `IF(OR(I${r}="",I${r}=0),"",(M${r}*L${r})/I${r})`, bRow.kEA);

            const aEff = `IF(OR(V${r}="",V${r}=0),I${r}/2,V${r})`;
            const bEff = `(I${r}-${aEff})`;
            setFormulaWithResult(ws, r, 23, `IF(OR(I${r}="",I${r}=0),"",(N(T${r})*I${r}/2)+IF(N(U${r})<>0,N(U${r})*(${bEff}^2)*(3*${aEff}+${bEff})/(I${r}^3),0))`, bRow.V_ini);
            setFormulaWithResult(ws, r, 24, `IF(OR(I${r}="",I${r}=0),"",(N(T${r})*(I${r}^2)/12)+IF(N(U${r})<>0,N(U${r})*${aEff}*(${bEff}^2)/(I${r}^2),0))`, bRow.M_ini);
            setFormulaWithResult(ws, r, 25, `IF(OR(I${r}="",I${r}=0),"",(N(T${r})*I${r}/2)+IF(N(U${r})<>0,N(U${r})*(${aEff}^2)*(${aEff}+3*${bEff})/(I${r}^3),0))`, bRow.V_fin);
            setFormulaWithResult(ws, r, 26, `IF(OR(I${r}="",I${r}=0),"",-(N(T${r})*(I${r}^2)/12)-IF(N(U${r})<>0,N(U${r})*(${aEff}^2)*${bEff}/(I${r}^2),0))`, bRow.M_fin);

            [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 23, 24, 25, 26].forEach(cCalc => {
                const fill = cCalc >= 23 ? PALETTE.PEACH_SOFT : (cCalc >= 15 ? PALETTE.GREEN_PASTEL : PALETTE.WHITE);
                const fmt = (cCalc === 10 || cCalc === 11) ? FMTS.DEC4 : FMTS.DEC2;
                styleCell(ws.getCell(r, cCalc), fill, FONTS.REG, BORDERS.ALL, ALIGNS.CENTER, fmt);
            });
        });

        // =========================================================================
        // BLOQUE 3A (Cols B..H, Filas 26..38): CUADRO CORRELACIONAL AUTOMÁTICO DE GDL
        // =========================================================================
        ws.mergeCells(26, 2, 27, 2); ws.getCell(26, 2).value = 'BARRA';
        ws.mergeCells(26, 3, 26, 5); ws.getCell(26, 3).value = 'Grado de Libertad Inicio (Automático)';
        ws.mergeCells(26, 6, 26, 8); ws.getCell(26, 6).value = 'Grado de Libertad Fin (Automático)';
        ['X', 'Y', 'θ', 'X', 'Y', 'θ'].forEach((lblD, idxD) => {
            ws.getCell(27, 3 + idxD).value = lblD;
        });
        for (let r = 26; r <= 27; r++) {
            for (let c = 2; c <= 8; c++) {
                styleCell(ws.getCell(r, c), (r === 27 && c >= 3) ? PALETTE.SUBHDR_BLUE : PALETTE.HEADER_BLUE, FONTS.HDR, BORDERS.HDR, ALIGNS.CENTER);
            }
        }

        solver.gdlTable.forEach((gRow, bIdx) => {
            const rGdl = 28 + bIdx;
            const rBar = 14 + bIdx;
            ws.getRow(rGdl).height = 18;
            setFormulaWithResult(ws, rGdl, 2, `IF(I${rBar}="","",B${rBar})`, gRow.active ? gRow.barNum : '');
            styleCell(ws.getCell(rGdl, 2), BAR_COLORS[bIdx], FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER);

            [3, 4, 5].forEach(cIni => {
                setFormulaWithResult(ws, rGdl, cIni, `IF(I${rBar}="","",B${rBar})`, gRow.nIni);
                styleCell(ws.getCell(rGdl, cIni), PALETTE.WHITE, FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER);
            });
            [6, 7, 8].forEach(cFin => {
                setFormulaWithResult(ws, rGdl, cFin, `IF(I${rBar}="","",B${rBar}+1)`, gRow.nFin);
                styleCell(ws.getCell(rGdl, cFin), PALETTE.WHITE, FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER);
            });
        });

        // =========================================================================
        // BLOQUE 3B (Cols K..W, Filas 26..38): DESCOMPONEDOR DE CARGAS OBLICUAS
        // =========================================================================
        makeBanner(ws, 26, 11, 23, '2B. HERRAMIENTA AUTOMÁTICA DE DESCOMPOSICIÓN DE CARGAS PUNTUALES OBLICUAS EN NUDOS', PALETTE.CELESTE);
        const obHdrs = [
            [11, 'N°'], [12, 'Nudo Destino'], [13, 'Carga P (kgf)'], [14, 'Método (Menú)'],
            [15, 'dx o Ángulo α°'], [16, 'dy (Vert.)'], [17, 'Hipotenusa L'],
            [18, 'Cos α (X)'], [19, 'Sen α (Y)'], [20, 'Sentido X'], [21, 'Sentido Y'],
            [22, 'Px Nudo (kgf)'], [23, 'Py Nudo (kgf)']
        ];
        obHdrs.forEach(([colI, hT]) => {
            const c = ws.getCell(27, colI);
            c.value = hT;
            styleCell(c, PALETTE.HEADER_BLUE, FONTS.SUBHDR, BORDERS.HDR, ALIGNS.CENTER);
        });

        solver.obliqueTable.forEach((ob, idxO) => {
            const rO = 28 + idxO;
            ws.getCell(rO, 11).value = idxO + 1;
            styleCell(ws.getCell(rO, 11), PALETTE.SUBHDR_BLUE, FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER);

            ws.getCell(rO, 12).value = ob.active ? ob.nudo : null;
            ws.getCell(rO, 13).value = ob.active ? ob.P : null;
            ws.getCell(rO, 14).value = ob.modo;
            ws.getCell(rO, 14).dataValidation = { type: 'list', allowBlank: true, formulae: ['"PENDIENTE_dx_dy,ANGULO_GRADOS"'] };
            ws.getCell(rO, 15).value = ob.active ? ob.val1 : null;
            ws.getCell(rO, 16).value = ob.active ? ob.val2 : null;
            ws.getCell(rO, 20).value = ob.dir_x;
            ws.getCell(rO, 20).dataValidation = { type: 'list', allowBlank: true, formulae: ['"+X (DER),-X (IZQ)"'] };
            ws.getCell(rO, 21).value = ob.dir_y;
            ws.getCell(rO, 21).dataValidation = { type: 'list', allowBlank: true, formulae: ['"+Y (ARRIBA),-Y (ABAJO)"'] };

            setFormulaWithResult(ws, rO, 17, `IF(OR(L${rO}="",M${rO}="",M${rO}=0),"",IF(N${rO}="PENDIENTE_dx_dy",SQRT(O${rO}^2+P${rO}^2),1))`, ob.hip);
            setFormulaWithResult(ws, rO, 18, `IF(Q${rO}="","",IF(N${rO}="PENDIENTE_dx_dy",O${rO}/Q${rO},COS(RADIANS(O${rO}))))`, ob.cosA);
            setFormulaWithResult(ws, rO, 19, `IF(Q${rO}="","",IF(N${rO}="PENDIENTE_dx_dy",P${rO}/Q${rO},SIN(RADIANS(O${rO}))))`, ob.sinA);
            setFormulaWithResult(ws, rO, 22, `IF(Q${rO}="","",M${rO}*R${rO}*IF(T${rO}="-X (IZQ)",-1,1))`, ob.Px);
            setFormulaWithResult(ws, rO, 23, `IF(Q${rO}="","",M${rO}*S${rO}*IF(U${rO}="-Y (ABAJO)",-1,1))`, ob.Py);

            for (let cI = 12; cI <= 23; cI++) {
                const isInput = [12, 13, 14, 15, 16, 20, 21].includes(cI);
                const isRes = [22, 23].includes(cI);
                const fill = isInput ? PALETTE.YELLOW_INPUT : (isRes ? PALETTE.GREEN_SOFT : PALETTE.WHITE);
                const font = (isInput || isRes) ? FONTS.BOLD : FONTS.REG;
                const fmt = isRes ? FMTS.DEC2 : (!isInput ? FMTS.DEC4 : undefined);
                styleCell(ws.getCell(rO, cI), fill, font, BORDERS.ALL, ALIGNS.CENTER, fmt);
            }
        });

        // Mini-herramienta para Barras Oblicuas (Filas 34..38, Cols K..W)
        makeBanner(ws, 34, 11, 23, '2C. AUXILIAR DE GEOMETRÍA PARA BARRAS OBLICUAS (DADA LONGITUD L Y ÁNGULO α O PENDIENTE → HALLAR Xf, Yf)', PALETTE.SUBHDR_BLUE);
        const auxBHdrs = [
            [11, 'Barra'], [12, 'Xi'], [13, 'Yi'], [14, 'Longitud L'], [15, 'Modo'],
            [16, 'Ángulo α° o dx'], [17, 'dy'], [18, 'Cos x'], [19, 'Cos y'],
            [20, 'Dx = L·Cosx'], [21, 'Dy = L·Cosy'], [22, 'Xf = Xi+Dx'], [23, 'Yf = Yi+Dy']
        ];
        auxBHdrs.forEach(([colI, hT]) => {
            const c = ws.getCell(35, colI);
            c.value = hT;
            styleCell(c, PALETTE.HEADER_BLUE, FONTS.SUBHDR, BORDERS.HDR, ALIGNS.CENTER);
        });
        for (let idxAb = 0; idxAb < 3; idxAb++) {
            const rAb = 36 + idxAb;
            ws.getCell(rAb, 11).value = idxAb + 1;
            ws.getCell(rAb, 15).value = 'ANGULO_GRADOS';
            setFormulaWithResult(ws, rAb, 18, `IF(OR(N${rAb}="",N${rAb}=0),"",IF(O${rAb}="ANGULO_GRADOS",COS(RADIANS(P${rAb})),P${rAb}/SQRT(P${rAb}^2+Q${rAb}^2)))`, '');
            setFormulaWithResult(ws, rAb, 19, `IF(OR(N${rAb}="",N${rAb}=0),"",IF(O${rAb}="ANGULO_GRADOS",SIN(RADIANS(P${rAb})),Q${rAb}/SQRT(P${rAb}^2+Q${rAb}^2)))`, '');
            setFormulaWithResult(ws, rAb, 20, `IF(R${rAb}="","",N${rAb}*R${rAb})`, '');
            setFormulaWithResult(ws, rAb, 21, `IF(S${rAb}="","",N${rAb}*S${rAb})`, '');
            setFormulaWithResult(ws, rAb, 22, `IF(T${rAb}="","",L${rAb}+T${rAb})`, '');
            setFormulaWithResult(ws, rAb, 23, `IF(U${rAb}="","",M${rAb}+U${rAb})`, '');
            for (let cI = 11; cI <= 23; cI++) {
                const fill = cI === 11 ? PALETTE.SUBHDR_BLUE : (cI <= 17 ? PALETTE.YELLOW_INPUT : (cI >= 22 ? PALETTE.GREEN_PASTEL : PALETTE.WHITE));
                styleCell(ws.getCell(rAb, cI), fill, [11, 22, 23].includes(cI) ? FONTS.BOLD : FONTS.REG, BORDERS.ALL, ALIGNS.CENTER);
            }
        }

        // =========================================================================
        // BLOQUE 4 (Filas 40..53): TABLA DE EVALUACIÓN NODAL (HASTA 12 NODOS)
        // =========================================================================
        makeBanner(ws, 40, 2, 17, '3. TABLA DE EVALUACIÓN NODAL: MENÚ DE APOYOS (FIJO / LIBRE / RODILLO / EMPOTRADO), CUADRO DE DESPLAZAMIENTOS Y CARGAS PUNTUALES', PALETTE.CELESTE);
        const nodalHdrs = [
            [2, 'NUDO'], [3, 'CONDICIÓN (Menú)'], [4, '¿Hay Dx?'], [5, '¿Hay Dy?'], [6, '¿Hay Dθ?'],
            [7, 'Cuadro Dx'], [8, 'Cuadro Dy'], [9, 'Cuadro Dθ'], [10, 'Px Directa (kgf)'],
            [11, 'Py Directa (kgf)'], [12, 'Mz Directo (kgf·cm)'], [13, 'Px Oblicua Auto'],
            [14, 'Py Oblicua Auto'], [15, 'Px Total Nudo'], [16, 'Py Total Nudo'], [17, 'Mz Total Nudo']
        ];
        ws.getRow(41).height = 22;
        nodalHdrs.forEach(([colI, hT]) => {
            const c = ws.getCell(41, colI);
            c.value = hT;
            styleCell(c, PALETTE.HEADER_BLUE, FONTS.HDR, BORDERS.HDR, ALIGNS.CENTER);
        });

        solver.nodesTable.forEach((nd, nIdx) => {
            const rN = 42 + nIdx;
            ws.getRow(rN).height = 19;
            ws.getCell(rN, 2).value = nd.nodeNum;
            styleCell(ws.getCell(rN, 2), PALETTE.SUBHDR_BLUE, FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER);

            ws.getCell(rN, 3).value = nd.active ? nd.cond : null;
            ws.getCell(rN, 3).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['"FIJO,LIBRE,RODILLO,EMPOTRADO,RODILLO_V"']
            };
            ws.getCell(rN, 10).value = nd.active ? nd.Px_dir : null;
            ws.getCell(rN, 11).value = nd.active ? nd.Py_dir : null;
            ws.getCell(rN, 12).value = nd.active ? nd.Mz_dir : null;

            [3, 10, 11, 12].forEach(cIn => {
                styleCell(ws.getCell(rN, cIn), PALETTE.YELLOW_INPUT, FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER, cIn >= 10 ? FMTS.DEC2 : undefined);
            });

            setFormulaWithResult(ws, rN, 4, `IF(OR(B${rN}>$G$7,C${rN}=""),"",IF(OR(C${rN}="LIBRE",C${rN}="RODILLO"),"SÍ","NO"))`, nd.hayDx);
            setFormulaWithResult(ws, rN, 5, `IF(OR(B${rN}>$G$7,C${rN}=""),"",IF(OR(C${rN}="LIBRE",C${rN}="RODILLO_V"),"SÍ","NO"))`, nd.hayDy);
            setFormulaWithResult(ws, rN, 6, `IF(OR(B${rN}>$G$7,C${rN}=""),"",IF(C${rN}="EMPOTRADO","NO","SÍ"))`, nd.hayDz);

            setFormulaWithResult(ws, rN, 7, `IF(D${rN}="","",IF(D${rN}="NO",0,"D"&B${rN}&"X"))`, nd.cuadroDx);
            setFormulaWithResult(ws, rN, 8, `IF(E${rN}="","",IF(E${rN}="NO",0,"D"&B${rN}&"Y"))`, nd.cuadroDy);
            setFormulaWithResult(ws, rN, 9, `IF(F${rN}="","",IF(F${rN}="NO",0,"D"&B${rN}&"θ"))`, nd.cuadroDz);

            setFormulaWithResult(ws, rN, 13, `IF(D${rN}="","",SUMIF($L$28:$L$32,B${rN},$V$28:$V$32))`, nd.Px_ob);
            setFormulaWithResult(ws, rN, 14, `IF(D${rN}="","",SUMIF($L$28:$L$32,B${rN},$W$28:$W$32))`, nd.Py_ob);
            setFormulaWithResult(ws, rN, 15, `IF(D${rN}="","",N(J${rN})+N(M${rN}))`, nd.Px_tot);
            setFormulaWithResult(ws, rN, 16, `IF(D${rN}="","",N(K${rN})+N(N${rN}))`, nd.Py_tot);
            setFormulaWithResult(ws, rN, 17, `IF(D${rN}="","",N(L${rN}))`, nd.Mz_tot);

            for (let cCalc = 4; cCalc <= 9; cCalc++) {
                styleCell(ws.getCell(rN, cCalc), cCalc >= 7 ? PALETTE.GREEN_PASTEL : PALETTE.WHITE, FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER);
            }
            for (let cLd = 13; cLd <= 17; cLd++) {
                styleCell(ws.getCell(rN, cLd), cLd >= 15 ? PALETTE.PEACH_SOFT : PALETTE.WHITE, cLd >= 15 ? FONTS.BOLD : FONTS.REG, BORDERS.ALL, ALIGNS.CENTER, FMTS.DEC2);
            }
        });

        // =========================================================================
        // BLOQUE 5 (Filas 55..241): 11 MATRICES DE RIGIDEZ LOCALES (6x6) Y EXTENDIDAS (6x36)
        // =========================================================================
        const localBlockStartRows = [];
        const extBlockStartRows = [];

        for (let bIdx = 0; bIdx < 11; bIdx++) {
            const bNum = bIdx + 1;
            const bFill = BAR_COLORS[bIdx];
            const rBar = 14 + bIdx;
            const rGdl = 28 + bIdx;
            const locObj = solver.localMatrices[bIdx];
            const extObj = solver.extendedMatrices[bIdx];
            const KLoc = locObj.matrix;
            const KExt = extObj.matrix;

            const baseR = 55 + bIdx * 17;
            const locHdrR = baseR;
            const locStart = baseR + 1; // 6 filas
            const extHdrR = baseR + 8;
            const extStart = baseR + 9; // 6 filas

            localBlockStartRows.push(locStart);
            extBlockStartRows.push(extStart);

            // Cabecera Local 6x6
            for (let k = 0; k < 6; k++) {
                const colC = 3 + k;
                const gdlColLet = getColLetter(3 + k);
                const sfx = ['X', 'Y', 'θ'][k % 3];
                const cellH = ws.getCell(locHdrR, colC);
                setFormulaWithResult(ws, locHdrR, colC, `IF(${gdlColLet}${rGdl}="","U${bNum + Math.floor(k / 3)}${sfx}","U"&${gdlColLet}${rGdl}&"${sfx}")`, locObj.dofLabels[k]);
                styleCell(cellH, PALETTE.HEADER_BLUE, FONTS.HDR, BORDERS.HDR, ALIGNS.CENTER);
            }
            ws.getCell(locHdrR, 9).value = 'GDL';
            styleCell(ws.getCell(locHdrR, 9), PALETTE.HEADER_BLUE, FONTS.HDR, BORDERS.HDR, ALIGNS.CENTER);

            for (let rrI = 0; rrI < 6; rrI++) {
                const rowCurr = locStart + rrI;
                ws.getRow(rowCurr).height = 18;
                const hdrColLet = getColLetter(3 + rrI);
                setFormulaWithResult(ws, rowCurr, 9, `${hdrColLet}${locHdrR}`, locObj.dofLabels[rrI]);
                styleCell(ws.getCell(rowCurr, 9), PALETTE.SUBHDR_BLUE, FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER);
            }

            ws.getCell(locStart + 2, 2).value = `K${bNum}=`;
            styleCell(ws.getCell(locStart + 2, 2), PALETTE.YELLOW_BRIGHT, FONTS.BOLD, BORDERS.BOX, ALIGNS.CENTER);

            const [r1, r2, r3, r4, r5, r6] = [locStart, locStart + 1, locStart + 2, locStart + 3, locStart + 4, locStart + 5];
            // Fila 1
            setFormulaWithResult(ws, r1, 3, `IF(I${rBar}="",0,(S${rBar}*(J${rBar}^2))+(O${rBar}*(K${rBar}^2)))`, KLoc[0][0]);
            setFormulaWithResult(ws, r1, 4, `IF(I${rBar}="",0,(S${rBar}-O${rBar})*J${rBar}*K${rBar})`, KLoc[0][1]);
            setFormulaWithResult(ws, r1, 5, `IF(I${rBar}="",0,-P${rBar}*K${rBar})`, KLoc[0][2]);
            setFormulaWithResult(ws, r1, 6, `-1*C${r1}`, KLoc[0][3]);
            setFormulaWithResult(ws, r1, 7, `-1*D${r1}`, KLoc[0][4]);
            setFormulaWithResult(ws, r1, 8, `E${r1}`, KLoc[0][5]);
            // Fila 2
            setFormulaWithResult(ws, r2, 3, `D${r1}`, KLoc[1][0]);
            setFormulaWithResult(ws, r2, 4, `IF(I${rBar}="",0,(S${rBar}*(K${rBar}^2))+(O${rBar}*(J${rBar}^2)))`, KLoc[1][1]);
            setFormulaWithResult(ws, r2, 5, `IF(I${rBar}="",0,P${rBar}*J${rBar})`, KLoc[1][2]);
            setFormulaWithResult(ws, r2, 6, `-1*D${r1}`, KLoc[1][3]);
            setFormulaWithResult(ws, r2, 7, `-1*D${r2}`, KLoc[1][4]);
            setFormulaWithResult(ws, r2, 8, `E${r2}`, KLoc[1][5]);
            // Fila 3
            setFormulaWithResult(ws, r3, 3, `E${r1}`, KLoc[2][0]);
            setFormulaWithResult(ws, r3, 4, `E${r2}`, KLoc[2][1]);
            setFormulaWithResult(ws, r3, 5, `IF(I${rBar}="",0,Q${rBar})`, KLoc[2][2]);
            setFormulaWithResult(ws, r3, 6, `-1*E${r1}`, KLoc[2][3]);
            setFormulaWithResult(ws, r3, 7, `-1*E${r2}`, KLoc[2][4]);
            setFormulaWithResult(ws, r3, 8, `IF(I${rBar}="",0,R${rBar})`, KLoc[2][5]);
            // Fila 4
            setFormulaWithResult(ws, r4, 3, `F${r1}`, KLoc[3][0]);
            setFormulaWithResult(ws, r4, 4, `F${r2}`, KLoc[3][1]);
            setFormulaWithResult(ws, r4, 5, `F${r3}`, KLoc[3][2]);
            setFormulaWithResult(ws, r4, 6, `C${r1}`, KLoc[3][3]);
            setFormulaWithResult(ws, r4, 7, `D${r1}`, KLoc[3][4]);
            setFormulaWithResult(ws, r4, 8, `-1*H${r1}`, KLoc[3][5]);
            // Fila 5 (Simétrica exacta: E{r5} = G{r3})
            setFormulaWithResult(ws, r5, 3, `G${r1}`, KLoc[4][0]);
            setFormulaWithResult(ws, r5, 4, `G${r2}`, KLoc[4][1]);
            setFormulaWithResult(ws, r5, 5, `G${r3}`, KLoc[4][2]);
            setFormulaWithResult(ws, r5, 6, `G${r4}`, KLoc[4][3]);
            setFormulaWithResult(ws, r5, 7, `D${r2}`, KLoc[4][4]);
            setFormulaWithResult(ws, r5, 8, `-1*H${r2}`, KLoc[4][5]);
            // Fila 6
            setFormulaWithResult(ws, r6, 3, `H${r1}`, KLoc[5][0]);
            setFormulaWithResult(ws, r6, 4, `H${r2}`, KLoc[5][1]);
            setFormulaWithResult(ws, r6, 5, `H${r3}`, KLoc[5][2]);
            setFormulaWithResult(ws, r6, 6, `H${r4}`, KLoc[5][3]);
            setFormulaWithResult(ws, r6, 7, `H${r5}`, KLoc[5][4]);
            setFormulaWithResult(ws, r6, 8, `E${r3}`, KLoc[5][5]);

            for (let rr = r1; rr <= r6; rr++) {
                for (let cc = 3; cc <= 8; cc++) {
                    styleCell(ws.getCell(rr, cc), bFill, FONTS.REG, BORDERS.ALL, ALIGNS.CENTER, FMTS.DEC2);
                }
            }

            // Cabecera Extendida 6x36
            solver.gdlAllLabels.forEach((gLbl, gI) => {
                const c = ws.getCell(extHdrR, 3 + gI);
                c.value = gLbl;
                styleCell(c, PALETTE.HEADER_BLUE, FONTS.SMALL_B, BORDERS.HDR, ALIGNS.CENTER);
            });
            ws.getCell(extHdrR, 39).value = 'GDL';
            styleCell(ws.getCell(extHdrR, 39), PALETTE.HEADER_BLUE, FONTS.SMALL_B, BORDERS.HDR, ALIGNS.CENTER);

            ws.getCell(extStart + 2, 2).value = `K${bNum}=`;
            styleCell(ws.getCell(extStart + 2, 2), PALETTE.YELLOW_BRIGHT, FONTS.BOLD, BORDERS.BOX, ALIGNS.CENTER);

            const activeGCols = Array.from({ length: 6 }, (_, k) => 3 * bIdx + k);
            for (let rrI = 0; rrI < 6; rrI++) {
                const rowE = extStart + rrI;
                const locR = r1 + rrI;
                ws.getRow(rowE).height = 17;
                setFormulaWithResult(ws, rowE, 39, `I${locR}`, locObj.dofLabels[rrI]);
                styleCell(ws.getCell(rowE, 39), PALETTE.SUBHDR_BLUE, FONTS.SMALL_B, BORDERS.ALL, ALIGNS.CENTER);

                for (let ccI = 0; ccI < 36; ccI++) {
                    const colE = 3 + ccI;
                    if (activeGCols.includes(ccI)) {
                        const locCIdx = activeGCols.indexOf(ccI);
                        const locColLet = getColLetter(3 + locCIdx);
                        setFormulaWithResult(ws, rowE, colE, `${locColLet}${locR}`, KExt[rrI][ccI]);
                        styleCell(ws.getCell(rowE, colE), bFill, FONTS.SMALL_B, BORDERS.ALL, ALIGNS.CENTER, FMTS.DEC2);
                    } else {
                        ws.getCell(rowE, colE).value = 0;
                        styleCell(ws.getCell(rowE, colE), PALETTE.WHITE, FONTS.SMALL, BORDERS.ALL, ALIGNS.CENTER, FMTS.DEC2);
                    }
                }
            }
        }

        // =========================================================================
        // BLOQUE 6 (Filas 243..280): MATRIZ DE RIGIDEZ GLOBAL [K] (36 x 36)
        // =========================================================================
        const globBannerR = 243;
        const globHdrR = 244;
        const globStartR = 245;

        makeBanner(ws, globBannerR, 2, 39, '4. MATRIZ DE RIGIDEZ GLOBAL DE LA VIGA [K] (ENSAMBLE EN DIAGONAL POR TRAMOS - HASTA 12 NODOS / 36 GDL)', PALETTE.CELESTE);

        ws.getCell(globHdrR, 2).value = 'GDL';
        styleCell(ws.getCell(globHdrR, 2), PALETTE.HEADER_BLUE, FONTS.BOLD, BORDERS.HDR, ALIGNS.CENTER);
        solver.gdlAllLabels.forEach((gLbl, gI) => {
            const c = ws.getCell(globHdrR, 3 + gI);
            c.value = gLbl;
            styleCell(c, PALETTE.HEADER_BLUE, FONTS.SMALL_B, BORDERS.HDR, ALIGNS.CENTER);
        });
        ws.getCell(globHdrR, 39).value = 'GDL';
        styleCell(ws.getCell(globHdrR, 39), PALETTE.HEADER_BLUE, FONTS.BOLD, BORDERS.HDR, ALIGNS.CENTER);

        for (let rG = 0; rG < 36; rG++) {
            const currR = globStartR + rG;
            ws.getRow(currR).height = 18;
            const nodeIdx = Math.floor(rG / 3);
            const dofRem = rG % 3;

            [2, 39].forEach(colLbl => {
                ws.getCell(currR, colLbl).value = solver.gdlAllLabels[rG];
                styleCell(ws.getCell(currR, colLbl), PALETTE.SUBHDR_BLUE, FONTS.SMALL_B, BORDERS.ALL, ALIGNS.CENTER);
            });

            const contributingExtRows = [];
            if (nodeIdx === 0) {
                contributingExtRows.push(extBlockStartRows[0] + dofRem);
            } else if (nodeIdx === 11) {
                contributingExtRows.push(extBlockStartRows[10] + 3 + dofRem);
            } else {
                contributingExtRows.push(extBlockStartRows[nodeIdx - 1] + 3 + dofRem);
                contributingExtRows.push(extBlockStartRows[nodeIdx] + dofRem);
            }

            for (let cG = 0; cG < 36; cG++) {
                const currC = 3 + cG;
                const colLet = getColLetter(currC);
                const formulaStr = contributingExtRows.map(er => `${colLet}${er}`).join('+');
                setFormulaWithResult(ws, currR, currC, formulaStr, solver.K_global[rG][cG]);

                const colNode = Math.floor(cG / 3);
                let fillK = PALETTE.WHITE;
                let fontK = FONTS.SMALL;
                if (rG === cG) {
                    fillK = PALETTE.GREEN_SOFT;
                    fontK = FONTS.SMALL_B;
                } else if (Math.abs(nodeIdx - colNode) <= 1) {
                    const barColorIdx = Math.min(nodeIdx, colNode, 10);
                    fillK = BAR_COLORS[barColorIdx];
                    fontK = FONTS.SMALL_B;
                }
                styleCell(ws.getCell(currR, currC), fillK, fontK, BORDERS.ALL, ALIGNS.CENTER, FMTS.DEC2);
            }
        }

        // =========================================================================
        // MOTOR SOLVER EN COLUMNAS AU..CF (Cols 47..84, Filas 245..320)
        // Con inyección dual (Fórmula + Resultado numérico exacto de BeamSolver)
        // =========================================================================
        ws.getCell(244, 47).value = 'BLOQUE TÉCNICO DE INVERSIÓN AUTOMÁTICA [K_SOLVER] (NO TOCAR)';
        ws.getCell(244, 47).font = FONTS.SMALL_B;

        for (let iG = 0; iG < 36; iG++) {
            const rKs = 245 + iG;
            const rCargas = 285 + iG;
            for (let jG = 0; jG < 36; jG++) {
                const cKs = 47 + jG;
                const rCargasCol = 285 + jG;
                const kGlobLet = getColLetter(3 + jG);
                if (iG === jG) {
                    setFormulaWithResult(ws, rKs, cKs, `IF($R${rCargas}<>"",${kGlobLet}${rKs},1)`, solver.K_solver[iG][jG]);
                } else {
                    setFormulaWithResult(ws, rKs, cKs, `IF(AND($R${rCargas}<>"",$R$${rCargasCol}<>""),${kGlobLet}${rKs},0)`, solver.K_solver[iG][jG]);
                }
            }
            setFormulaWithResult(ws, rKs, 83, `IF($R${rCargas}<>"",$F${rCargas},0)`, solver.C_solver[iG]);
            setFormulaWithResult(ws, 282, 47 + iG, `CE${rKs}`, solver.C_solver[iG]);
            setFormulaWithResult(ws, 283, 47 + iG, `CE${rCargas}`, solver.D_full[iG]);
        }

        // Inversa 36x36 en AU285:CD320 con inyección completa de valores para evitar #¡VALOR!
        ws.getCell('AU285').value = {
            formula: 'MINVERSE(AU245:CD280)',
            result: solver.K_solver_inv[0][0],
            shareType: 'array',
            ref: 'AU285:CD320'
        };
        for (let iG = 0; iG < 36; iG++) {
            for (let jG = 0; jG < 36; jG++) {
                if (iG === 0 && jG === 0) continue;
                ws.getCell(285 + iG, 47 + jG).value = solver.K_solver_inv[iG][jG];
            }
        }

        for (let iG = 0; iG < 36; iG++) {
            const rInv = 285 + iG;
            const rGlob = 245 + iG;
            setFormulaWithResult(ws, rInv, 83, `IF($R${rInv}="",0,SUMPRODUCT(AU${rInv}:CD${rInv},$AU$282:$CD$282))`, solver.D_full[iG]);
            setFormulaWithResult(ws, rInv, 84, `IF($Q${rInv}="NO",0,SUMPRODUCT(C${rGlob}:AL${rGlob},$AU$283:$CD$283))`, solver.R_full_prod[iG]);
        }

        // =========================================================================
        // BLOQUE 7 (Filas 283..320): MATRIZ DE CARGAS [C] Y MATRIZ DE DESPLAZAMIENTO [D]
        // =========================================================================
        makeBanner(ws, 283, 2, 8, '5A. MATRIZ DE CARGAS [C] (AUTOMÁTICA)', PALETTE.YELLOW_BRIGHT);
        makeBanner(ws, 283, 10, 15, '5B. MATRIZ DE DESPLAZAMIENTO [D] (AUTOMÁTICA)', PALETTE.YELLOW_BRIGHT);

        const cHdrs = [
            [2, 'C_i'], [3, 'GDL'], [4, 'P_Puntual Nudo'], [5, 'C_Dist/Tramo Eq.'],
            [6, 'Carga Numérica'], [7, 'VECTOR [C]'], [8, 'GDL']
        ];
        cHdrs.forEach(([colI, hT]) => {
            ws.getCell(284, colI).value = hT;
            styleCell(ws.getCell(284, colI), PALETTE.HEADER_BLUE, FONTS.HDR, BORDERS.HDR, ALIGNS.CENTER);
        });

        const dHdrs = [
            [10, 'D_i'], [11, 'GDL'], [12, '¿Hay Despl.?'], [13, 'VECTOR [D]'],
            [14, 'VALOR D (cm/rad)'], [15, 'GDL']
        ];
        dHdrs.forEach(([colI, hT]) => {
            ws.getCell(284, colI).value = hT;
            styleCell(ws.getCell(284, colI), PALETTE.HEADER_BLUE, FONTS.HDR, BORDERS.HDR, ALIGNS.CENTER);
        });

        const auxHdrs = [[16, 'Idx'], [17, 'Activo'], [18, 'N° Libre'], [19, 'N° Restr.']];
        auxHdrs.forEach(([colI, hT]) => {
            ws.getCell(284, colI).value = hT;
            styleCell(ws.getCell(284, colI), PALETTE.SUBHDR_BLUE, FONTS.SMALL_B, BORDERS.HDR, ALIGNS.CENTER);
        });

        for (let gI = 0; gI < 36; gI++) {
            const rCd = 285 + gI;
            ws.getRow(rCd).height = 18;
            const nNum = Math.floor(gI / 3) + 1;
            const dRem = gI % 3;
            const rNodal = 42 + (nNum - 1);

            const cRow = solver.cargasRows[gI];
            const dRow = solver.dispRows[gI];
            const uLbl = solver.gdlAllLabels[gI];
            const cLbl = `C${nNum}${['X', 'Y', 'θ'][dRem]}`;
            const dLbl = `D${nNum}${['X', 'Y', 'θ'][dRem]}`;

            ws.getCell(rCd, 16).value = gI + 1;
            setFormulaWithResult(ws, rCd, 17, `IF(${nNum}<=$G$7,"SÍ","NO")`, cRow.active ? 'SÍ' : 'NO');
            setFormulaWithResult(ws, rCd, 18, `IF(AND(Q${rCd}="SÍ",L${rCd}="SÍ"),COUNTIFS($Q$285:Q${rCd},"SÍ",$L$285:L${rCd},"SÍ"),"")`, dRow.freeOrder);
            setFormulaWithResult(ws, rCd, 19, `IF(AND(Q${rCd}="SÍ",L${rCd}="NO"),COUNTIFS($Q$285:Q${rCd},"SÍ",$L$285:L${rCd},"NO"),"")`, dRow.restOrder);

            for (let cAux = 16; cAux <= 19; cAux++) {
                styleCell(ws.getCell(rCd, cAux), PALETTE.GRAY_SOFT, FONTS.SMALL, BORDERS.ALL, ALIGNS.CENTER);
            }

            const pColLet = ['O', 'P', 'Q'][dRem];
            const hayColLet = ['D', 'E', 'F'][dRem];
            const cuadroDLet = ['G', 'H', 'I'][dRem];

            let eqTramoFormula = '0';
            if (dRem === 1) {
                if (nNum === 1) eqTramoFormula = '-N(W14)';
                else if (nNum === 12) eqTramoFormula = '-N(Y24)';
                else {
                    const rBPrev = 14 + (nNum - 2);
                    const rBCurr = 14 + (nNum - 1);
                    eqTramoFormula = `-N(Y${rBPrev})-N(W${rBCurr})`;
                }
            } else if (dRem === 2) {
                if (nNum === 1) eqTramoFormula = '-N(X14)';
                else if (nNum === 12) eqTramoFormula = '-N(Z24)';
                else {
                    const rBPrev = 14 + (nNum - 2);
                    const rBCurr = 14 + (nNum - 1);
                    eqTramoFormula = `-N(Z${rBPrev})-N(X${rBCurr})`;
                }
            }

            setFormulaWithResult(ws, rCd, 2, `IF(Q${rCd}="NO","","${cLbl}")`, cRow.cLbl);
            setFormulaWithResult(ws, rCd, 3, `IF(Q${rCd}="NO","","${uLbl}")`, cRow.uLbl);
            setFormulaWithResult(ws, rCd, 4, `IF(Q${rCd}="NO","",N(${pColLet}${rNodal}))`, cRow.P_nudo);
            setFormulaWithResult(ws, rCd, 5, `IF(Q${rCd}="NO","",${eqTramoFormula})`, cRow.C_tramo);
            setFormulaWithResult(ws, rCd, 6, `IF(Q${rCd}="NO","",D${rCd}+E${rCd})`, cRow.C_num);
            setFormulaWithResult(ws, rCd, 7, `IF(Q${rCd}="NO","",IF(L${rCd}="NO",IF(F${rCd}=0,B${rCd},IF(F${rCd}<0,B${rCd}&F${rCd},B${rCd}&"+"&F${rCd})),F${rCd}))`, cRow.C_expr);
            setFormulaWithResult(ws, rCd, 8, `C${rCd}`, cRow.uLbl);

            for (let cMc = 2; cMc <= 8; cMc++) {
                const fill = cMc === 7 ? PALETTE.YELLOW_INPUT : (cMc === 5 ? PALETTE.PEACH_SOFT : PALETTE.WHITE);
                styleCell(ws.getCell(rCd, cMc), fill, [2, 6, 7].includes(cMc) ? FONTS.BOLD : FONTS.REG, BORDERS.ALL, ALIGNS.CENTER, [4, 5, 6, 7].includes(cMc) ? FMTS.DEC2 : undefined);
            }

            setFormulaWithResult(ws, rCd, 10, `IF(Q${rCd}="NO","","${dLbl}")`, dRow.dLbl);
            setFormulaWithResult(ws, rCd, 11, `IF(Q${rCd}="NO","","${uLbl}")`, dRow.uLbl);
            setFormulaWithResult(ws, rCd, 12, `IF(Q${rCd}="NO","",${hayColLet}${rNodal})`, dRow.hay);
            setFormulaWithResult(ws, rCd, 13, `IF(Q${rCd}="NO","",${cuadroDLet}${rNodal})`, dRow.D_expr);
            setFormulaWithResult(ws, rCd, 14, `IF(Q${rCd}="NO","",CE${rCd})`, dRow.active ? dRow.D_val : '');
            setFormulaWithResult(ws, rCd, 15, `K${rCd}`, dRow.uLbl);

            for (let cMd = 10; cMd <= 15; cMd++) {
                const fill = cMd === 13 ? PALETTE.YELLOW_INPUT : (cMd === 14 ? PALETTE.GREEN_SOFT : PALETTE.WHITE);
                styleCell(ws.getCell(rCd, cMd), fill, [10, 13, 14].includes(cMd) ? FONTS.BOLD : FONTS.REG, BORDERS.ALL, ALIGNS.CENTER, cMd === 14 ? FMTS.DISP : undefined);
            }
        }

        // =========================================================================
        // BLOQUE 8 (Filas 323..360): ECUACIÓN MATRICIAL COMPLETA [C] = [K] * [D]
        // =========================================================================
        const eqBannerR = 323;
        const eqHdrR = 324;
        const eqStartR = 325;

        makeBanner(ws, eqBannerR, 2, 42, '6. ECUACIÓN MATRICIAL COMPLETA: [C] = [K] * [D] (LAS FILAS EN AMARILLO SON RESTRINGIDAS: D = 0)', PALETTE.CELESTE);

        ws.getCell(eqHdrR, 2).value = 'GDL';
        ws.getCell(eqHdrR, 3).value = '[C]';
        ws.getCell(eqHdrR, 4).value = '=';
        solver.gdlAllLabels.forEach((gLbl, gI) => {
            ws.getCell(eqHdrR, 5 + gI).value = gLbl;
        });
        ws.getCell(eqHdrR, 41).value = '*';
        ws.getCell(eqHdrR, 42).value = '[D]';
        for (let c = 2; c <= 42; c++) {
            styleCell(ws.getCell(eqHdrR, c), PALETTE.HEADER_BLUE, FONTS.SMALL_B, BORDERS.HDR, ALIGNS.CENTER);
        }

        for (let gI = 0; gI < 36; gI++) {
            const rEq = eqStartR + gI;
            const rCd = 285 + gI;
            const rGlob = 245 + gI;
            ws.getRow(rEq).height = 18;

            const cRow = solver.cargasRows[gI];
            const dRow = solver.dispRows[gI];
            const isRestRow = dRow.active && dRow.hay === 'NO';
            const rowFill = isRestRow ? PALETTE.YELLOW_BRIGHT : PALETTE.WHITE;

            setFormulaWithResult(ws, rEq, 2, `IF($Q${rCd}="NO","",C${rCd})`, cRow.uLbl);
            setFormulaWithResult(ws, rEq, 3, `IF($Q${rCd}="NO","",G${rCd})`, cRow.C_expr);
            setFormulaWithResult(ws, rEq, 4, `IF($Q${rCd}="NO","","=")`, cRow.active ? '=' : '');

            for (let cI = 0; cI < 36; cI++) {
                const cEq = 5 + cI;
                const rCdCol = 285 + cI;
                const kLet = getColLetter(3 + cI);
                const bothAct = cRow.active && solver.cargasRows[cI].active;
                setFormulaWithResult(ws, rEq, cEq, `IF(OR($Q${rCd}="NO",$Q$${rCdCol}="NO"),"",${kLet}${rGlob})`, bothAct ? solver.K_global[gI][cI] : '');
                styleCell(ws.getCell(rEq, cEq), rowFill, isRestRow ? FONTS.SMALL_B : FONTS.SMALL, BORDERS.ALL, ALIGNS.CENTER, FMTS.DEC2);
            }

            setFormulaWithResult(ws, rEq, 41, `IF($Q${rCd}="NO","","*")`, cRow.active ? '*' : '');
            setFormulaWithResult(ws, rEq, 42, `IF($Q${rCd}="NO","",M${rCd})`, dRow.D_expr);

            [2, 3, 4, 41, 42].forEach(cEnds => {
                styleCell(ws.getCell(rEq, cEnds), cEnds === 2 ? PALETTE.SUBHDR_BLUE : rowFill, FONTS.SMALL_B, BORDERS.ALL, ALIGNS.CENTER, cEnds === 3 ? FMTS.DEC2 : undefined);
            });
        }

        // =========================================================================
        // BLOQUE 9 (Filas 363..480): ECUACIÓN REDUCIDA, INVERSA [K_LL]^-1 Y DESPLAZAMIENTOS
        // =========================================================================
        const redDBanner = 363;
        const redDHdr = 364;
        const redDStart = 365;

        makeBanner(ws, redDBanner, 2, 42, '7. ECUACIÓN MATRICIAL REDUCIDA PARA CÁLCULO DE DESPLAZAMIENTOS: [C_libres] = [K_LL] * [D_libres] (AUTOMÁTICA)', PALETTE.CELESTE);

        ws.getRow(362).hidden = true;
        for (let cI = 0; cI < 36; cI++) {
            const colC = 5 + cI;
            const fd = solver.freeDofs[cI];
            setFormulaWithResult(ws, 362, colC, `IFERROR(MATCH(${cI + 1},$R$285:$R$320,0),"")`, fd ? fd.idx1 : '');
        }

        ws.getCell(redDHdr, 2).value = 'GDL';
        ws.getCell(redDHdr, 3).value = '[C_libre]';
        ws.getCell(redDHdr, 4).value = '=';
        for (let cI = 0; cI < 36; cI++) {
            const colC = 5 + cI;
            const colLet = getColLetter(colC);
            const fd = solver.freeDofs[cI];
            setFormulaWithResult(ws, redDHdr, colC, `IF(${colLet}$362="","",INDEX($C$285:$C$320,${colLet}$362))`, fd ? fd.uLbl : '');
        }
        ws.getCell(redDHdr, 41).value = '*';
        ws.getCell(redDHdr, 42).value = '[D_libre]';
        for (let c = 2; c <= 42; c++) {
            styleCell(ws.getCell(redDHdr, c), PALETTE.HEADER_BLUE, FONTS.SMALL_B, BORDERS.HDR, ALIGNS.CENTER);
        }

        for (let rI = 0; rI < 36; rI++) {
            const currR = redDStart + rI;
            ws.getRow(currR).height = 18;
            const fdRow = solver.freeDofs[rI];

            setFormulaWithResult(ws, currR, 43, `IFERROR(MATCH(${rI + 1},$R$285:$R$320,0),"")`, fdRow ? fdRow.idx1 : '');
            setFormulaWithResult(ws, currR, 2, `IF($AQ${currR}="","",INDEX($C$285:$C$320,$AQ${currR}))`, fdRow ? fdRow.uLbl : '');
            setFormulaWithResult(ws, currR, 3, `IF($AQ${currR}="","",INDEX($F$285:$F$320,$AQ${currR}))`, fdRow ? fdRow.C_num : '');
            setFormulaWithResult(ws, currR, 4, `IF($AQ${currR}="","","=")`, fdRow ? '=' : '');

            for (let cI = 0; cI < 36; cI++) {
                const colC = 5 + cI;
                const colLet = getColLetter(colC);
                const fdCol = solver.freeDofs[cI];
                const kVal = (fdRow && fdCol) ? solver.K_LL[rI][cI] : '';
                setFormulaWithResult(ws, currR, colC, `IF(OR($AQ${currR}="",${colLet}$362=""),"",INDEX($C$245:$AL$280,$AQ${currR},${colLet}$362))`, kVal);
                styleCell(ws.getCell(currR, colC), rI === cI ? PALETTE.GREEN_SOFT : PALETTE.WHITE, rI === cI ? FONTS.SMALL_B : FONTS.SMALL, BORDERS.ALL, ALIGNS.CENTER, FMTS.DEC2);
            }

            setFormulaWithResult(ws, currR, 41, `IF($AQ${currR}="","","*")`, fdRow ? '*' : '');
            setFormulaWithResult(ws, currR, 42, `IF($AQ${currR}="","",INDEX($M$285:$M$320,$AQ${currR}))`, fdRow ? fdRow.D_expr : '');

            [2, 3, 4, 41, 42].forEach(cEnds => {
                const fill = cEnds === 2 ? PALETTE.SUBHDR_BLUE : (cEnds === 3 ? PALETTE.YELLOW_INPUT : (cEnds === 42 ? PALETTE.GREEN_PASTEL : PALETTE.WHITE));
                styleCell(ws.getCell(currR, cEnds), fill, FONTS.SMALL_B, BORDERS.ALL, ALIGNS.CENTER, cEnds === 3 ? FMTS.DEC2 : undefined);
            });
        }

        // SUB-BLOQUE 9B (Filas 403..440): INVERSA DE LA MATRIZ REDUCIDA [K_LL]^-1
        const invBanner = 403;
        const invHdr = 404;
        const invStart = 405;

        makeBanner(ws, invBanner, 2, 42, '8. INVERSA DE LA MATRIZ REDUCIDA: [D_libres] = [K_LL]^-1 * [C_libres] (CALCULADA AUTOMÁTICAMENTE CON MINVERSE)', PALETTE.CELESTE);

        ws.getCell(invHdr, 2).value = 'GDL';
        ws.getCell(invHdr, 3).value = '[D_libre]';
        ws.getCell(invHdr, 4).value = '=';
        for (let cI = 0; cI < 36; cI++) {
            const colC = 5 + cI;
            const colLet = getColLetter(colC);
            const fd = solver.freeDofs[cI];
            setFormulaWithResult(ws, invHdr, colC, `${colLet}${redDHdr}`, fd ? fd.uLbl : '');
        }
        ws.getCell(invHdr, 41).value = '*';
        ws.getCell(invHdr, 42).value = '[C_libre]';
        for (let c = 2; c <= 42; c++) {
            styleCell(ws.getCell(invHdr, c), PALETTE.HEADER_BLUE, FONTS.SMALL_B, BORDERS.HDR, ALIGNS.CENTER);
        }

        for (let rI = 0; rI < 36; rI++) {
            const currR = invStart + rI;
            const rRed = redDStart + rI;
            ws.getRow(currR).height = 18;
            const fdRow = solver.freeDofs[rI];

            setFormulaWithResult(ws, currR, 2, `B${rRed}`, fdRow ? fdRow.uLbl : '');
            setFormulaWithResult(ws, currR, 3, `AP${rRed}`, fdRow ? fdRow.D_expr : '');
            setFormulaWithResult(ws, currR, 4, `D${rRed}`, fdRow ? '=' : '');

            for (let cI = 0; cI < 36; cI++) {
                const colC = 5 + cI;
                const colLet = getColLetter(colC);
                const fdCol = solver.freeDofs[cI];
                const invVal = (fdRow && fdCol) ? solver.K_LL_inv[rI][cI] : '';
                setFormulaWithResult(ws, currR, colC, `IF(OR($AQ${rRed}="",${colLet}$362=""),"",INDEX($AU$285:$CD$320,$AQ${rRed},${colLet}$362))`, invVal);
                styleCell(ws.getCell(currR, colC), rI === cI ? PALETTE.GREEN_SOFT : PALETTE.WHITE, rI === cI ? FONTS.SMALL_B : FONTS.SMALL, BORDERS.ALL, ALIGNS.CENTER, FMTS.SCI);
            }

            setFormulaWithResult(ws, currR, 41, `AO${rRed}`, fdRow ? '*' : '');
            setFormulaWithResult(ws, currR, 42, `C${rRed}`, fdRow ? fdRow.C_num : '');

            [2, 3, 4, 41, 42].forEach(cEnds => {
                const fill = cEnds === 2 ? PALETTE.SUBHDR_BLUE : (cEnds === 3 ? PALETTE.GREEN_PASTEL : (cEnds === 42 ? PALETTE.YELLOW_INPUT : PALETTE.WHITE));
                styleCell(ws.getCell(currR, cEnds), fill, FONTS.SMALL_B, BORDERS.ALL, ALIGNS.CENTER, cEnds === 42 ? FMTS.DEC2 : undefined);
            });
        }

        // SUB-BLOQUE 9C (Filas 443..480): RESULTADOS DE DESPLAZAMIENTOS [D_libres]
        const resDBanner = 443;
        const resDHdr = 444;
        const resDStart = 445;

        makeBanner(ws, resDBanner, 2, 8, '9. RESULTADOS DE LOS DESPLAZAMIENTOS NODALES [D] = [K_LL]^-1 * [C_libres]', PALETTE.GREEN_SOFT);

        const resDCols = [[2, 'GDL'], [3, 'INCÓGNITA D'], [4, '='], [5, 'DESPLAZAMIENTO CALCULADO'], [6, 'UNIDAD'], [7, 'INTERPRETACIÓN FÍSICA']];
        resDCols.forEach(([colI, hT]) => {
            ws.getCell(resDHdr, colI).value = hT;
            styleCell(ws.getCell(resDHdr, colI), PALETTE.HEADER_BLUE, FONTS.HDR, BORDERS.HDR, ALIGNS.CENTER);
        });

        for (let rI = 0; rI < 36; rI++) {
            const currR = resDStart + rI;
            const rRed = redDStart + rI;
            ws.getRow(currR).height = 18;
            const calcD = solver.calculatedDisplacements[rI];

            setFormulaWithResult(ws, currR, 2, `B${rRed}`, calcD ? calcD.uLbl : '');
            setFormulaWithResult(ws, currR, 3, `AP${rRed}`, calcD ? calcD.dLbl : '');
            setFormulaWithResult(ws, currR, 4, `D${rRed}`, calcD ? '=' : '');
            setFormulaWithResult(ws, currR, 5, `IF($AQ${rRed}="","",INDEX($CE$285:$CE$320,$AQ${rRed}))`, calcD ? calcD.value : '');
            setFormulaWithResult(ws, currR, 6, `IF($AQ${rRed}="","",IF(RIGHT(C${currR},1)="θ","rad","cm"))`, calcD ? calcD.unit : '');
            setFormulaWithResult(ws, currR, 7, `IF($AQ${rRed}="","",IF(RIGHT(C${currR},1)="θ","Giro nodal θ","Desplazamiento lineal"))`, calcD ? calcD.desc : '');

            for (let cI = 2; cI <= 7; cI++) {
                const fill = cI === 2 ? PALETTE.SUBHDR_BLUE : (cI === 3 ? PALETTE.YELLOW_INPUT : (cI === 5 ? PALETTE.GREEN_SOFT : (cI === 6 ? PALETTE.GRAY_SOFT : PALETTE.WHITE)));
                styleCell(ws.getCell(currR, cI), fill, [2, 3, 5].includes(cI) ? FONTS.BOLD : FONTS.REG, BORDERS.ALL, cI < 7 ? ALIGNS.CENTER : ALIGNS.LEFT, cI === 5 ? FMTS.DISP : undefined);
            }
        }

        // =========================================================================
        // BLOQUE 10 (Filas 483..560): ECUACIÓN REDUCIDA PARA CARGAS Y REACCIONES
        // =========================================================================
        const redRBanner = 483;
        const redRHdr = 484;
        const redRStart = 485;

        makeBanner(ws, redRBanner, 2, 42, '10. ECUACIÓN MATRICIAL REDUCIDA PARA CÁLCULO DE CARGAS (REACCIONES): [C_restringidos] = [K_RL] * [D_libres]', PALETTE.CELESTE);

        ws.getCell(redRHdr, 2).value = 'GDL';
        ws.getCell(redRHdr, 3).value = '[C_apoyo]';
        ws.getCell(redRHdr, 4).value = '=';
        for (let cI = 0; cI < 36; cI++) {
            const colC = 5 + cI;
            const colLet = getColLetter(colC);
            const fd = solver.freeDofs[cI];
            setFormulaWithResult(ws, redRHdr, colC, `${colLet}${redDHdr}`, fd ? fd.uLbl : '');
        }
        ws.getCell(redRHdr, 41).value = '*';
        ws.getCell(redRHdr, 42).value = '[D_libre]';
        for (let c = 2; c <= 42; c++) {
            styleCell(ws.getCell(redRHdr, c), PALETTE.HEADER_BLUE, FONTS.SMALL_B, BORDERS.HDR, ALIGNS.CENTER);
        }

        for (let mI = 0; mI < 36; mI++) {
            const currR = redRStart + mI;
            const rResD = resDStart + mI;
            ws.getRow(currR).height = 18;
            const rdRow = solver.restDofs[mI];
            const calcD = solver.calculatedDisplacements[mI];

            setFormulaWithResult(ws, currR, 43, `IFERROR(MATCH(${mI + 1},$S$285:$S$320,0),"")`, rdRow ? rdRow.idx1 : '');
            setFormulaWithResult(ws, currR, 2, `IF($AQ${currR}="","",INDEX($C$285:$C$320,$AQ${currR}))`, rdRow ? rdRow.uLbl : '');
            setFormulaWithResult(ws, currR, 3, `IF($AQ${currR}="","",INDEX($G$285:$G$320,$AQ${currR}))`, rdRow ? rdRow.C_expr : '');
            setFormulaWithResult(ws, currR, 4, `IF($AQ${currR}="","","=")`, rdRow ? '=' : '');

            for (let cI = 0; cI < 36; cI++) {
                const colC = 5 + cI;
                const colLet = getColLetter(colC);
                const fdCol = solver.freeDofs[cI];
                const krlVal = (rdRow && fdCol) ? solver.K_RL[mI][cI] : '';
                setFormulaWithResult(ws, currR, colC, `IF(OR($AQ${currR}="",${colLet}$362=""),"",INDEX($C$245:$AL$280,$AQ${currR},${colLet}$362))`, krlVal);
                styleCell(ws.getCell(currR, colC), PALETTE.WHITE, FONTS.SMALL, BORDERS.ALL, ALIGNS.CENTER, FMTS.DEC2);
            }

            setFormulaWithResult(ws, currR, 41, `IF($AQ${currR}="","","*")`, rdRow ? '*' : '');
            setFormulaWithResult(ws, currR, 42, `E${rResD}`, calcD ? calcD.value : '');

            [2, 3, 4, 41, 42].forEach(cEnds => {
                const fill = cEnds === 2 ? PALETTE.SUBHDR_BLUE : (cEnds === 3 ? PALETTE.YELLOW_BRIGHT : (cEnds === 42 ? PALETTE.GREEN_PASTEL : PALETTE.WHITE));
                styleCell(ws.getCell(currR, cEnds), fill, FONTS.SMALL_B, BORDERS.ALL, ALIGNS.CENTER, cEnds === 42 ? FMTS.DISP : undefined);
            });
        }

        // SUB-BLOQUE 10B (Filas 523..560): RESULTADOS DE CARGAS Y REACCIONES
        const resRBanner = 523;
        const resRHdr = 524;
        const resRStart = 525;

        makeBanner(ws, resRBanner, 2, 9, '11. RESULTADOS DE LAS CARGAS Y REACCIONES EN LOS APOYOS [R] = [K_RL] * [D_libres]', PALETTE.YELLOW_BRIGHT);

        const resRCols = [
            [2, 'GDL'], [3, 'EXPRESIÓN EN [C]'], [4, '='], [5, 'PRODUCTO [K_RL]*[D]'],
            [6, 'CARGA EN APOYO'], [7, 'REACCIÓN DESPEJADA FINAL'], [8, 'UNIDAD'], [9, 'DESCRIPCIÓN']
        ];
        resRCols.forEach(([colI, hT]) => {
            ws.getCell(resRHdr, colI).value = hT;
            styleCell(ws.getCell(resRHdr, colI), PALETTE.HEADER_BLUE, FONTS.HDR, BORDERS.HDR, ALIGNS.CENTER);
        });

        for (let mI = 0; mI < 36; mI++) {
            const currR = resRStart + mI;
            const rRedR = redRStart + mI;
            ws.getRow(currR).height = 18;
            const calcR = solver.calculatedReactions[mI];

            setFormulaWithResult(ws, currR, 2, `B${rRedR}`, calcR ? calcR.uLbl : '');
            setFormulaWithResult(ws, currR, 3, `C${rRedR}`, calcR ? calcR.C_expr : '');
            setFormulaWithResult(ws, currR, 4, `D${rRedR}`, calcR ? '=' : '');
            setFormulaWithResult(ws, currR, 5, `IF($AQ${rRedR}="","",INDEX($CF$285:$CF$320,$AQ${rRedR}))`, calcR ? calcR.prod_KRL_D : '');
            setFormulaWithResult(ws, currR, 6, `IF($AQ${rRedR}="","",INDEX($F$285:$F$320,$AQ${rRedR}))`, calcR ? calcR.loadAtSupport : '');
            setFormulaWithResult(ws, currR, 7, `IF($AQ${rRedR}="","",E${currR}-F${currR})`, calcR ? calcR.reactionFinal : '');
            setFormulaWithResult(ws, currR, 8, `IF($AQ${rRedR}="","",IF(RIGHT(B${currR},1)="θ","kgf·cm","kgf"))`, calcR ? calcR.unit : '');
            setFormulaWithResult(ws, currR, 9, `IF($AQ${rRedR}="","",IF(RIGHT(B${currR},1)="θ","Momento de reacción en apoyo","Fuerza de reacción en apoyo"))`, calcR ? calcR.desc : '');

            for (let cI = 2; cI <= 9; cI++) {
                const fill = cI === 2 ? PALETTE.SUBHDR_BLUE : (cI === 3 ? PALETTE.YELLOW_INPUT : (cI === 5 ? PALETTE.GREEN_PASTEL : (cI === 6 ? PALETTE.PEACH_SOFT : (cI === 7 ? PALETTE.GREEN_SOFT : (cI === 8 ? PALETTE.GRAY_SOFT : PALETTE.WHITE)))));
                styleCell(ws.getCell(currR, cI), fill, [2, 3, 5, 7].includes(cI) ? FONTS.BOLD : FONTS.REG, BORDERS.ALL, cI < 9 ? ALIGNS.CENTER : ALIGNS.LEFT, [5, 6, 7].includes(cI) ? FMTS.DEC4 : undefined);
            }
        }


        // =========================================================================
        // BLOQUE 12 (Filas 565..580): DATOS PARA GRAFICAR LA CURVA ELÁSTICA (2 COLUMNAS)
        // =========================================================================
        const elastBanner = 565;
        const elastHdr = 566;
        const elastStart = 567;

        makeBanner(ws, elastBanner, 2, 6, '12. DATOS PARA GRAFICAR LA CURVA ELÁSTICA (TABLA DE 2 COLUMNAS)', PALETTE.GREEN_SOFT);

        const elastCols = [[2, 'Nudo'], [3, 'X (cm)'], [4, 'DY (cm)'], [5, 'θz (rad)']];
        elastCols.forEach(([colI, hT]) => {
            ws.getCell(elastHdr, colI).value = hT;
            styleCell(ws.getCell(elastHdr, colI), PALETTE.HEADER_BLUE, FONTS.HDR, BORDERS.HDR, ALIGNS.CENTER);
        });

        const numNodesPlot = Math.min(12, Math.max(2, solver.maxActiveNode || 2));
        for (let n = 1; n <= 12; n++) {
            const currR = elastStart + n - 1;
            const pt = (solver.elastic_curve_2col && solver.elastic_curve_2col[n - 1]) ? solver.elastic_curve_2col[n - 1] : null;
            ws.getRow(currR).height = 18;

            ws.getCell(currR, 2).value = n;
            styleCell(ws.getCell(currR, 2), PALETTE.SUBHDR_BLUE, FONTS.SMALL_B, BORDERS.ALL, ALIGNS.CENTER);

            if (n <= numNodesPlot && pt) {
                ws.getCell(currR, 3).value = pt.x;
                ws.getCell(currR, 4).value = pt.dy;
                ws.getCell(currR, 5).value = pt.theta;

                styleCell(ws.getCell(currR, 3), PALETTE.WHITE, FONTS.SMALL_B, BORDERS.ALL, ALIGNS.RIGHT, FMTS.DEC1);
                styleCell(ws.getCell(currR, 4), PALETTE.GREEN_PASTEL, FONTS.SMALL_B, BORDERS.ALL, ALIGNS.RIGHT, FMTS.DISP);
                styleCell(ws.getCell(currR, 5), PALETTE.YELLOW_INPUT, FONTS.SMALL, BORDERS.ALL, ALIGNS.RIGHT, FMTS.ROT);
            } else {
                for (let cI = 3; cI <= 5; cI++) {
                    ws.getCell(currR, cI).value = '';
                    styleCell(ws.getCell(currR, cI), PALETTE.WHITE, FONTS.SMALL, BORDERS.ALL, ALIGNS.CENTER);
                }
            }
        }

        // Protección de hoja de cálculo contra edición de fórmulas con la contraseña maestra 'miau'
        await ws.protect('miau', {
            selectLockedCells: true,
            selectUnlockedCells: true,
            formatCells: false,
            formatColumns: false,
            formatRows: false,
            insertColumns: false,
            insertRows: false,
            deleteColumns: false,
            deleteRows: false
        });

        return wb;
    }

    /**
     * Descarga el libro Excel con la pestaña única PLANTILLA ULIANOV en el navegador
     */
    async function downloadBeamExcel(config, filename = 'PLANTILLA_ULIANOV_VIGAS_5_PESTAÑAS.xlsx') {
        const xpLib = (typeof XlsxPopulate !== 'undefined') ? XlsxPopulate : (typeof window !== 'undefined' ? window.XlsxPopulate : null);
        if (xpLib && typeof fetch !== 'undefined') {
            try {
                const resp = await fetch('PLANTILLA_MAESTRA_5_PESTANAS_ULIANOV.xlsx');
                if (resp.ok) {
                    const arrayBuf = await resp.arrayBuffer();
                    const wb5 = await xpLib.fromDataAsync(arrayBuf);
                    const wsMix = wb5.sheet('3.1 MIXTAS');
                    if (wsMix) {
                        const solver = (typeof BeamSolver !== 'undefined' && BeamSolver.solveBeam) ? BeamSolver.solveBeam(config) : null;
                        const E_val = parseFloat(config.E) || 2100000;
                        const b_val = parseFloat(config.b) || 25;
                        const h_val = parseFloat(config.h) || 50;
                        wsMix.cell('C2').value(E_val);
                        wsMix.cell('C3').value(b_val);
                        wsMix.cell('C4').value(h_val);

                        const bars = (solver && solver.barsTable) ? solver.barsTable : (config.bars || []);
                        for (let i = 0; i < 10; i++) {
                            const r = 9 + i;
                            const b = bars[i];
                            const isActive = b && (b.active || (b.xi !== undefined && b.xf !== undefined && b.xf !== null && b.xf !== ''));
                            if (isActive) {
                                wsMix.cell('C' + r).value(parseFloat(b.xi) || 0);
                                wsMix.cell('D' + r).value(parseFloat(b.yi) || 0);
                                wsMix.cell('E' + r).value(parseFloat(b.xf) || 0);
                                wsMix.cell('F' + r).value(parseFloat(b.yf) || 0);
                            } else {
                                wsMix.cell('C' + r).value(null);
                                wsMix.cell('D' + r).value(null);
                                wsMix.cell('E' + r).value(null);
                                wsMix.cell('F' + r).value(null);
                            }
                        }

                        const nodes = (solver && solver.nodesTable) ? solver.nodesTable : (config.nodes || []);
                        for (let n = 0; n < 11; n++) {
                            const node = nodes[n];
                            const rX = 504 + n * 3;
                            const rY = 505 + n * 3;
                            const rZ = 506 + n * 3;
                            if (node && node.active) {
                                const isRestrX = (node.hayDx === 'NO' || node.cond === 'EMPOTRADO' || node.cond === 'FIJO');
                                const isRestrY = (node.hayDy === 'NO' || node.cond === 'EMPOTRADO' || node.cond === 'FIJO' || node.cond === 'RODILLO');
                                const isRestrZ = (node.hayDz === 'NO' || node.cond === 'EMPOTRADO');
                                wsMix.cell('N' + rX).value(isRestrX ? 'RESTRINGIDO' : 'LIBRE');
                                wsMix.cell('N' + rY).value(isRestrY ? 'RESTRINGIDO' : 'LIBRE');
                                wsMix.cell('N' + rZ).value(isRestrZ ? 'RESTRINGIDO' : 'LIBRE');
                            } else {
                                wsMix.cell('N' + rX).value('LIBRE');
                                wsMix.cell('N' + rY).value('LIBRE');
                                wsMix.cell('N' + rZ).value('LIBRE');
                            }
                        }
                    }

                    const outBlob = await wb5.outputAsync();
                    if (typeof window !== 'undefined' && window.URL) {
                        const url = window.URL.createObjectURL(outBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        return true;
                    }
                }
            } catch (err) {
                console.warn('Fallo cargando plantilla 5 pestañas, usando generador ExcelJS:', err);
            }
        }

        const wb = await generateBeamWorkbook(config);
        // Hoja visual independiente: cuatro diagramas exportados tal como aparecen en pantalla.
        if (typeof document !== 'undefined') {
            const defs = [
                ['elasticPolygon','CURVA ELÁSTICA POLIGONAL'],
                ['elasticSmooth','CURVA ELÁSTICA SUAVIZADA CON GIROS θ'],
                ['beamShearDiagram','DIAGRAMA DE FUERZA CORTANTE V (kgf)'],
                ['beamMomentDiagram','DIAGRAMA DE MOMENTO FLECTOR M (kgf·cm)']
            ];
            const sheet = wb.addWorksheet('GRÁFICAS');
            sheet.columns = Array.from({length:18},()=>({width:13}));
            sheet.getCell('B2').value='CEREBRO ESTRUCTURAL — 4 GRÁFICAS DE VIGAS';
            sheet.getCell('B2').font={bold:true,size:18,color:{argb:'FF174F79'}};
            sheet.getCell('B3').value='Los diagramas corresponden al análisis en el instante de descargar el archivo.';
            async function svgPngData(svg){
                const clone=svg.cloneNode(true);
                clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
                const view=svg.viewBox.baseVal;
                const width=view&&view.width?view.width:900;
                const height=view&&view.height?view.height:310;
                clone.setAttribute('width',width);clone.setAttribute('height',height);
                const blob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'});
                const url=URL.createObjectURL(blob);
                try {
                    const im=new Image();
                    await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src=url;});
                    const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;
                    const cx=canvas.getContext('2d');cx.fillStyle='#0b1423';cx.fillRect(0,0,canvas.width,canvas.height);
                    cx.drawImage(im,0,0,canvas.width,canvas.height);
                    return canvas.toDataURL('image/png');
                } finally {URL.revokeObjectURL(url);}
            }
            for(let i=0;i<defs.length;i++){
                const [id,title]=defs[i],top=5+i*22;
                sheet.getCell('B'+top).value=(i+1)+'. '+title;
                sheet.getCell('B'+top).font={bold:true,size:14,color:{argb:'FF174F79'}};
                const svg=document.getElementById(id);
                if(!svg)continue;
                try{
                    const base64=await svgPngData(svg);
                    const imageId=wb.addImage({base64,extension:'png'});
                    sheet.addImage(imageId,{tl:{col:1,row:top},ext:{width:900,height:340}});
                }catch(error){sheet.getCell('B'+(top+1)).value='No se pudo convertir la gráfica: '+error.message;}
            }
            await sheet.protect('miau', {
                selectLockedCells: true,
                selectUnlockedCells: true,
                formatCells: false,
                formatColumns: false,
                formatRows: false,
                insertColumns: false,
                insertRows: false,
                deleteColumns: false,
                deleteRows: false
            });
        }
        const buffer = await wb.xlsx.writeBuffer();
        if (typeof window !== 'undefined' && window.Blob && window.URL) {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            return true;
        }
        return buffer;
    }

    return {
        generateBeamWorkbook,
        downloadBeamExcel
    };
}));

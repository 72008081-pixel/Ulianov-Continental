/**
 * frame-excel-generator.js — CEREBRO ESTRUCTURAL v4.0 (Plantilla Ulianov - Pórticos 2D)
 * Generador Oficial de Hojas de Cálculo Académicas (Cátedra Ing. Ulianov Cuba Valencia)
 * 
 * Genera EXACTAMENTE las DOS pestañas maestras solicitadas:
 *   1. '3.1 MIXTAS': Formato oficial de clase con ensamble completo 33x33 por tramo,
 *      matriz reducida diagonal 1, MMULT(MINVERSE), resumen de desplazamientos,
 *      reacciones y tabla de 2 columnas para curva elástica.
 *   2. 'PLANTILLA ULIANOV': La plantilla automatizada grandote con partición matricial
 *      (eliminación de 3 filas/columnas iniciales y finales de empotramientos),
 *      matriz inversa [K_LL]^-1 con =MINVERSA, los 3 cuadros clásicos de resolución
 *      {D_L} = [K_LL]^-1 * {F_L}, cálculo de reacciones {R} = [K_RL]*{D_L} - {F_R},
 *      y la tabla de 2 columnas para graficar la curva elástica.
 */

(function(root, factory){
    if(typeof define === 'function' && define.amd){
        define(['./assets/exceljs.min.js', './frame-solver.js'], factory);
    } else if(typeof module === 'object' && module.exports){
        const ExcelJS = require('./assets/exceljs.min.js');
        const FrameSolver = require('./frame-solver.js');
        module.exports = factory(ExcelJS, FrameSolver);
    } else {
        root.FrameExcelGenerator = factory(root.ExcelJS, root.FrameSolver);
    }
}(typeof self !== 'undefined' ? self : this, function(ExcelJS, FrameSolver){
    'use strict';

    function getColLetter(colIdx){
        let letter = '';
        while (colIdx > 0) {
            let rem = (colIdx - 1) % 26;
            letter = String.fromCharCode(65 + rem) + letter;
            colIdx = Math.floor((colIdx - 1) / 26);
        }
        return letter;
    }

    const PALETTE = {
        NAVY_DARK:    'FF0A192F',
        NAVY_HDR:     'FF1E293B',
        BLUE_ACCENT:  'FF0284C7',
        BLUE_LIGHT:   'FFBAE6FD',
        BLUE_HEADER:  'FFB4C6E7',
        BLUE_SUBHDR:  'FFD9E1F2',
        CYAN_ACCENT:  'FF00F0FF',
        GREEN_ACCENT: 'FF10B981',
        GREEN_LIGHT:  'FFD1FAE5',
        GREEN_PASTEL: 'FFE2EFDA',
        YELLOW_LIGHT: 'FFFEF9C3',
        YELLOW_BRIGHT:'FFFFFF00',
        ORANGE_LIGHT: 'FFFFEDD5',
        ROSE_LIGHT:   'FFFFE4E6',
        GRAY_BG:      'FFF8FAFC',
        GRAY_BORDER:  'FFE2E8F0',
        GRAY_TEXT:    'FF64748B',
        WHITE:        'FFFFFFFF',
        BLACK:        'FF000000',
        BORDER_DARK:  'FF334155',
        BORDER_MED:   'FF94A3B8'
    };

    const BORDERS = {
        THIN: {
            top:    { style: 'thin', color: { argb: PALETTE.BORDER_MED } },
            bottom: { style: 'thin', color: { argb: PALETTE.BORDER_MED } },
            left:   { style: 'thin', color: { argb: PALETTE.BORDER_MED } },
            right:  { style: 'thin', color: { argb: PALETTE.BORDER_MED } }
        },
        HEADER: {
            top:    { style: 'medium', color: { argb: PALETTE.BORDER_DARK } },
            bottom: { style: 'medium', color: { argb: PALETTE.BORDER_DARK } },
            left:   { style: 'thin',   color: { argb: PALETTE.BORDER_DARK } },
            right:  { style: 'thin',   color: { argb: PALETTE.BORDER_DARK } }
        },
        DOUBLE_BOTTOM: {
            top:    { style: 'thin',   color: { argb: PALETTE.BORDER_DARK } },
            bottom: { style: 'double', color: { argb: PALETTE.BORDER_DARK } },
            left:   { style: 'thin',   color: { argb: PALETTE.BORDER_DARK } },
            right:  { style: 'thin',   color: { argb: PALETTE.BORDER_DARK } }
        }
    };

    const FONTS = {
        TITLE:   { name: 'Calibri', size: 12, bold: true, color: { argb: PALETTE.BLACK } },
        SUBTITLE:{ name: 'Calibri', size: 11, bold: true, color: { argb: PALETTE.BLACK } },
        HDR:     { name: 'Calibri', size: 9.5, bold: true, color: { argb: PALETTE.BLACK } },
        BOLD:    { name: 'Calibri', size: 9.5, bold: true, color: { argb: PALETTE.BLACK } },
        REG:     { name: 'Calibri', size: 9.5, bold: false, color: { argb: PALETTE.BLACK } },
        MONO:    { name: 'Consolas', size: 9, bold: false, color: { argb: PALETTE.BLACK } },
        MONO_B:  { name: 'Consolas', size: 9, bold: true, color: { argb: PALETTE.BLACK } }
    };

    const ALIGNS = {
        CENTER: { horizontal: 'center', vertical: 'middle' },
        LEFT:   { horizontal: 'left',   vertical: 'middle' },
        RIGHT:  { horizontal: 'right',  vertical: 'middle' }
    };

    function styleCell(cell, fillHex, font, border, alignment, numFmt){
        if(fillHex) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillHex } };
        if(font) cell.font = font;
        if(border) cell.border = border;
        if(alignment) cell.alignment = alignment;
        if(numFmt) cell.numFmt = numFmt;
    }

    function setFormulaWithResult(cell, formula, resultVal, numFmt, fillHex, font, border, align){
        cell.value = { formula: formula, result: resultVal };
        styleCell(cell, fillHex, font || FONTS.MONO, border || BORDERS.THIN, align || ALIGNS.RIGHT, numFmt);
    }

    /**
     * Construye el libro de trabajo con las dos pestañas oficiales
     */
    async function buildMasterFrameWorkbook(model, result){
        if(!result){
            result = FrameSolver.compute(model);
        }

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Cátedra Ing. Ulianov Cuba Valencia - Análisis Estructural II';
        wb.lastModifiedBy = 'Cátedra Ing. Ulianov Cuba Valencia';
        wb.created = new Date();
        wb.modified = new Date();

        // =========================================================================
        // PESTAÑA 1: '3.1 MIXTAS'
        // =========================================================================
        const ws1 = wb.addWorksheet('3.1 MIXTAS', {
            views: [{ showGridLines: true }]
        });

        // Configuración de anchos de columnas
        ws1.getColumn(1).width = 10; // Col A
        for(let c = 2; c <= 35; c++){
            ws1.getColumn(c).width = 13; // B .. AI
        }
        ws1.getColumn(36).width = 14; // AJ
        ws1.getColumn(38).width = 16; // AL
        ws1.getColumn(40).width = 16; // AN

        // Bloque 1: Propiedades de la Sección y Material (Filas 1 a 6)
        ws1.mergeCells('B1:H1');
        const b1 = ws1.getCell('B1');
        b1.value = 'PROPIEDADES DEL MATERIAL Y SECCIÓN (10 TRAMOS)';
        styleCell(b1, PALETTE.BLUE_HEADER, FONTS.TITLE, BORDERS.HEADER, ALIGNS.CENTER);

        ws1.getCell('B2').value = 'E (Elasticidad) =';
        styleCell(ws1.getCell('B2'), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.LEFT);
        ws1.getCell('C2').value = model.E;
        styleCell(ws1.getCell('C2'), PALETTE.YELLOW_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT, '#,##0');
        ws1.getCell('D2').value = 'kgf/cm²';
        styleCell(ws1.getCell('D2'), null, FONTS.REG, null, ALIGNS.LEFT);

        ws1.getCell('B3').value = 'b (Base) =';
        styleCell(ws1.getCell('B3'), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.LEFT);
        ws1.getCell('C3').value = model.section.b;
        styleCell(ws1.getCell('C3'), PALETTE.YELLOW_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');
        ws1.getCell('D3').value = 'cm';
        styleCell(ws1.getCell('D3'), null, FONTS.REG, null, ALIGNS.LEFT);

        ws1.getCell('F3').value = 'Tramos Utilizados =';
        styleCell(ws1.getCell('F3'), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.LEFT);
        setFormulaWithResult(ws1.getCell('G3'), 'COUNT(I9:I18)', result.bars.length, '0', PALETTE.GREEN_PASTEL, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

        ws1.getCell('B4').value = 'h (Altura) =';
        styleCell(ws1.getCell('B4'), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.LEFT);
        ws1.getCell('C4').value = model.section.h;
        styleCell(ws1.getCell('C4'), PALETTE.YELLOW_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');
        ws1.getCell('D4').value = 'cm';
        styleCell(ws1.getCell('D4'), null, FONTS.REG, null, ALIGNS.LEFT);

        ws1.getCell('F4').value = 'Nodos Utilizados =';
        styleCell(ws1.getCell('F4'), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.LEFT);
        setFormulaWithResult(ws1.getCell('G4'), 'IF(G3>0, G3+1, 0)', result.nodes.length, '0', PALETTE.GREEN_PASTEL, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

        ws1.getCell('B5').value = 'Área =';
        styleCell(ws1.getCell('B5'), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.LEFT);
        setFormulaWithResult(ws1.getCell('C5'), 'C3*C4', result.props.A, '#,##0.00', PALETTE.BLUE_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT);
        ws1.getCell('D5').value = 'cm²';
        styleCell(ws1.getCell('D5'), null, FONTS.REG, null, ALIGNS.LEFT);

        ws1.getCell('E5').value = 'Inercia =';
        styleCell(ws1.getCell('E5'), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.LEFT);
        setFormulaWithResult(ws1.getCell('F5'), '(C3*(C4^3))/12', result.props.I, '#,##0.0000', PALETTE.BLUE_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT);
        ws1.getCell('G5').value = 'cm⁴';
        styleCell(ws1.getCell('G5'), null, FONTS.REG, null, ALIGNS.LEFT);

        // Bloque 2: Tabla de Geometría de Barras (Filas 7 a 18)
        const geomHeaders = ['Barra', 'INICIO', '', 'FIN', '', 'ΔX', 'ΔY', 'L (cm)', 'Cosx', 'Cosy', 'E', 'A', 'I', 'EA/L', '12EI/L³', '6EI/L²', '4EI/L', '2EI/L'];
        geomHeaders.forEach((h, idx) => {
            if(h){
                const cell = ws1.getCell(7, idx + 2);
                cell.value = h;
                styleCell(cell, PALETTE.BLUE_HEADER, FONTS.HDR, BORDERS.HEADER, ALIGNS.CENTER);
            }
        });
        ws1.mergeCells('C7:D7');
        ws1.mergeCells('E7:F7');

        const subHeaders = ['', 'Xi', 'Yi', 'Xf', 'Yf'];
        subHeaders.forEach((sh, idx) => {
            if(sh){
                const cell = ws1.getCell(8, idx + 2);
                cell.value = sh;
                styleCell(cell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
            }
        });

        for(let bIdx = 1; bIdx <= 10; bIdx++){
            const r = 8 + bIdx;
            const bar = result.bars[bIdx - 1];
            ws1.getCell(r, 2).value = bIdx;
            styleCell(ws1.getCell(r, 2), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

            if(bar){
                const n1 = result.nodes.find(n => n.id === bar.n1);
                const n2 = result.nodes.find(n => n.id === bar.n2);
                ws1.getCell(r, 3).value = n1.x;
                styleCell(ws1.getCell(r, 3), PALETTE.YELLOW_LIGHT, FONTS.REG, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');
                ws1.getCell(r, 4).value = n1.y;
                styleCell(ws1.getCell(r, 4), PALETTE.YELLOW_LIGHT, FONTS.REG, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');
                ws1.getCell(r, 5).value = n2.x;
                styleCell(ws1.getCell(r, 5), PALETTE.YELLOW_LIGHT, FONTS.REG, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');
                ws1.getCell(r, 6).value = n2.y;
                styleCell(ws1.getCell(r, 6), PALETTE.YELLOW_LIGHT, FONTS.REG, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');

                setFormulaWithResult(ws1.getCell(r, 7), `IF(OR(C${r}="",E${r}=""),"", E${r}-C${r})`, n2.x - n1.x, '#,##0.00', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 8), `IF(OR(D${r}="",F${r}=""),"", F${r}-D${r})`, n2.y - n1.y, '#,##0.00', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 9), `IF(OR(G${r}="",H${r}=""),"", SQRT(G${r}*G${r}+H${r}*H${r}))`, bar.L, '#,##0.00', PALETTE.GREEN_LIGHT, FONTS.BOLD, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 10), `IF(OR(I${r}="",I${r}=0),"", G${r}/I${r})`, bar.c, '0.0000', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 11), `IF(OR(I${r}="",I${r}=0),"", H${r}/I${r})`, bar.s, '0.0000', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 12), `IF(I${r}="","",$C$2)`, model.E, '#,##0', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 13), `IF(I${r}="","",$C$5)`, result.props.A, '#,##0.00', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 14), `IF(I${r}="","",$F$5)`, result.props.I, '#,##0.0000', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 15), `IF(I${r}="","",L${r}*M${r}/I${r})`, model.E * result.props.A / bar.L, '#,##0.00', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 16), `IF(I${r}="","",12*L${r}*N${r}/(I${r}^3))`, 12 * model.E * result.props.I / (bar.L ** 3), '#,##0.0000', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 17), `IF(I${r}="","",6*L${r}*N${r}/(I${r}^2))`, 6 * model.E * result.props.I / (bar.L ** 2), '#,##0.00', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 18), `IF(I${r}="","",4*L${r}*N${r}/I${r})`, 4 * model.E * result.props.I / bar.L, '#,##0.00', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 19), `IF(I${r}="","",2*L${r}*N${r}/I${r})`, 2 * model.E * result.props.I / bar.L, '#,##0.00', null, null, null, ALIGNS.RIGHT);
            } else {
                for(let c = 3; c <= 6; c++) styleCell(ws1.getCell(r, c), null, FONTS.REG, BORDERS.THIN, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 7), `IF(OR(C${r}="",E${r}=""),"", E${r}-C${r})`, '', '#,##0.00', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 8), `IF(OR(D${r}="",F${r}=""),"", F${r}-D${r})`, '', '#,##0.00', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 9), `IF(OR(G${r}="",H${r}=""),"", SQRT(G${r}*G${r}+H${r}*H${r}))`, '', '#,##0.00', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 10), `IF(OR(I${r}="",I${r}=0),"", G${r}/I${r})`, '', '0.0000', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 11), `IF(OR(I${r}="",I${r}=0),"", H${r}/I${r})`, '', '0.0000', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 12), `IF(I${r}="","",$C$2)`, '', '#,##0', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 13), `IF(I${r}="","",$C$5)`, '', '#,##0.00', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 14), `IF(I${r}="","",$F$5)`, '', '#,##0.0000', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 15), `IF(I${r}="","",L${r}*M${r}/I${r})`, '', '#,##0.00', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 16), `IF(I${r}="","",12*L${r}*N${r}/(I${r}^3))`, '', '#,##0.0000', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 17), `IF(I${r}="","",6*L${r}*N${r}/(I${r}^2))`, '', '#,##0.00', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 18), `IF(I${r}="","",4*L${r}*N${r}/I${r})`, '', '#,##0.00', null, null, null, ALIGNS.RIGHT);
                setFormulaWithResult(ws1.getCell(r, 19), `IF(I${r}="","",2*L${r}*N${r}/I${r})`, '', '#,##0.00', null, null, null, ALIGNS.RIGHT);
            }
        }

        // Bloque 3: Conectividad y GDL (Filas 20 a 31)
        ws1.getCell('B20').value = 'Barra';
        styleCell(ws1.getCell('B20'), PALETTE.BLUE_HEADER, FONTS.HDR, BORDERS.HEADER, ALIGNS.CENTER);
        ws1.mergeCells('C20:E20');
        ws1.getCell('C20').value = 'INICIO';
        styleCell(ws1.getCell('C20'), PALETTE.BLUE_HEADER, FONTS.HDR, BORDERS.HEADER, ALIGNS.CENTER);
        ws1.mergeCells('F20:H20');
        ws1.getCell('F20').value = 'FIN';
        styleCell(ws1.getCell('F20'), PALETTE.BLUE_HEADER, FONTS.HDR, BORDERS.HEADER, ALIGNS.CENTER);

        ['X', 'Y', 'θ', 'X', 'Y', 'θ'].forEach((txt, idx) => {
            const cell = ws1.getCell(21, idx + 3);
            cell.value = txt;
            styleCell(cell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        });

        for(let bIdx = 1; bIdx <= 10; bIdx++){
            const r = 21 + bIdx;
            const geomR = 8 + bIdx;
            ws1.getCell(r, 2).value = bIdx;
            styleCell(ws1.getCell(r, 2), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

            const bar = result.bars[bIdx - 1];
            const niVal = bar ? bar.n1 : bIdx;
            const njVal = bar ? bar.n2 : bIdx + 1;

            for(let c = 3; c <= 5; c++){
                setFormulaWithResult(ws1.getCell(r, c), `IF(I${geomR}="","", ${niVal})`, bar ? niVal : '', '0', null, null, null, ALIGNS.CENTER);
            }
            for(let c = 6; c <= 8; c++){
                setFormulaWithResult(ws1.getCell(r, c), `IF(I${geomR}="","", ${njVal})`, bar ? njVal : '', '0', null, null, null, ALIGNS.CENTER);
            }
        }

        // Bloque 4: 10 Bloques de Rigidez Elemental K1..K10 con Expansión Completa 33x33
        // Satisface la exigencia de considerar vertical y horizontalmente las 33 variables
        for(let bIdx = 1; bIdx <= 10; bIdx++){
            const startR = 34 + (bIdx - 1) * 43;
            const geomR = 8 + bIdx;
            const connR = 21 + bIdx;
            const bar = result.bars[bIdx - 1];

            // Fila startR: Encabezado de GDL de la barra
            const dofLetters = ['X', 'Y', 'θ', 'X', 'Y', 'θ'];
            for(let c = 0; c < 6; c++){
                const connCol = getColLetter(3 + c);
                const subLet = dofLetters[c];
                const cell = ws1.getCell(startR, 2 + c);
                const fallbackTxt = bar ? (c < 3 ? `U${bar.n1}${subLet}` : `U${bar.n2}${subLet}`) : '';
                setFormulaWithResult(cell, `IF(${connCol}${connR}="","", CONCATENATE("U",${connCol}${connR},"${subLet}"))`, fallbackTxt, '@', PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
            }

            // Matriz 6x6 (startR+1 a startR+6, Cols B..G)
            ws1.getCell(startR + 3, 1).value = `K${bIdx} =`;
            styleCell(ws1.getCell(startR + 3, 1), PALETTE.BLUE_HEADER, FONTS.TITLE, null, ALIGNS.CENTER);

            // Fórmulas oficiales de la cátedra para la matriz 6x6
            // Fila 1
            setFormulaWithResult(ws1.getCell(startR + 1, 2), `IF(I${geomR}="", 0, O${geomR}*J${geomR}*J${geomR}+P${geomR}*K${geomR}*K${geomR})`, bar ? bar.kt[0][0] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 1, 3), `IF(I${geomR}="", 0, (O${geomR}-P${geomR})*(J${geomR}*K${geomR}))`, bar ? bar.kt[0][1] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 1, 4), `IF(I${geomR}="", 0, -Q${geomR}*K${geomR})`, bar ? bar.kt[0][2] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 1, 5), `-B${startR + 1}`, bar ? bar.kt[0][3] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 1, 6), `-C${startR + 1}`, bar ? bar.kt[0][4] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 1, 7), `D${startR + 1}`, bar ? bar.kt[0][5] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 1, 8), `B${startR}`, ws1.getCell(startR, 2).value ? ws1.getCell(startR, 2).value.result : '', '@', PALETTE.BLUE_SUBHDR, FONTS.HDR);

            // Fila 2
            setFormulaWithResult(ws1.getCell(startR + 2, 2), `C${startR + 1}`, bar ? bar.kt[1][0] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 2, 3), `IF(I${geomR}="", 0, O${geomR}*K${geomR}*K${geomR}+P${geomR}*J${geomR}*J${geomR})`, bar ? bar.kt[1][1] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 2, 4), `IF(I${geomR}="", 0, Q${geomR}*J${geomR})`, bar ? bar.kt[1][2] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 2, 5), `-B${startR + 2}`, bar ? bar.kt[1][3] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 2, 6), `-C${startR + 2}`, bar ? bar.kt[1][4] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 2, 7), `D${startR + 2}`, bar ? bar.kt[1][5] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 2, 8), `C${startR}`, ws1.getCell(startR, 3).value ? ws1.getCell(startR, 3).value.result : '', '@', PALETTE.BLUE_SUBHDR, FONTS.HDR);

            // Fila 3
            setFormulaWithResult(ws1.getCell(startR + 3, 2), `D${startR + 1}`, bar ? bar.kt[2][0] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 3, 3), `D${startR + 2}`, bar ? bar.kt[2][1] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 3, 4), `IF(I${geomR}="", 0, R${geomR})`, bar ? bar.kt[2][2] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 3, 5), `-B${startR + 3}`, bar ? bar.kt[2][3] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 3, 6), `-C${startR + 3}`, bar ? bar.kt[2][4] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 3, 7), `IF(I${geomR}="", 0, S${geomR})`, bar ? bar.kt[2][5] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 3, 8), `D${startR}`, ws1.getCell(startR, 4).value ? ws1.getCell(startR, 4).value.result : '', '@', PALETTE.BLUE_SUBHDR, FONTS.HDR);

            // Fila 4
            setFormulaWithResult(ws1.getCell(startR + 4, 2), `E${startR + 1}`, bar ? bar.kt[3][0] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 4, 3), `E${startR + 2}`, bar ? bar.kt[3][1] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 4, 4), `E${startR + 3}`, bar ? bar.kt[3][2] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 4, 5), `B${startR + 1}`, bar ? bar.kt[3][3] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 4, 6), `C${startR + 1}`, bar ? bar.kt[3][4] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 4, 7), `-D${startR + 1}`, bar ? bar.kt[3][5] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 4, 8), `E${startR}`, ws1.getCell(startR, 5).value ? ws1.getCell(startR, 5).value.result : '', '@', PALETTE.BLUE_SUBHDR, FONTS.HDR);

            // Fila 5
            setFormulaWithResult(ws1.getCell(startR + 5, 2), `F${startR + 1}`, bar ? bar.kt[4][0] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 5, 3), `F${startR + 2}`, bar ? bar.kt[4][1] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 5, 4), `F${startR + 3}`, bar ? bar.kt[4][2] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 5, 5), `F${startR + 4}`, bar ? bar.kt[4][3] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 5, 6), `C${startR + 2}`, bar ? bar.kt[4][4] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 5, 7), `-D${startR + 2}`, bar ? bar.kt[4][5] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 5, 8), `F${startR}`, ws1.getCell(startR, 6).value ? ws1.getCell(startR, 6).value.result : '', '@', PALETTE.BLUE_SUBHDR, FONTS.HDR);

            // Fila 6
            setFormulaWithResult(ws1.getCell(startR + 6, 2), `G${startR + 1}`, bar ? bar.kt[5][0] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 6, 3), `G${startR + 2}`, bar ? bar.kt[5][1] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 6, 4), `G${startR + 3}`, bar ? bar.kt[5][2] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 6, 5), `G${startR + 4}`, bar ? bar.kt[5][3] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 6, 6), `G${startR + 5}`, bar ? bar.kt[5][4] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 6, 7), `D${startR + 3}`, bar ? bar.kt[5][5] : 0, '#,##0.00');
            setFormulaWithResult(ws1.getCell(startR + 6, 8), `G${startR}`, ws1.getCell(startR, 7).value ? ws1.getCell(startR, 7).value.result : '', '@', PALETTE.BLUE_SUBHDR, FONTS.HDR);

            // MATRIZ EXPANDIDA 33x33 (Fila startR+8 a startR+41)
            // Encabezado horizontal de los 33 GDL en fila startR+8
            for(let d = 0; d < 33; d++){
                const cell = ws1.getCell(startR + 8, 2 + d);
                cell.value = result.dofLabels33[d];
                styleCell(cell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
            }

            // 33 Filas de la matriz expandida
            const ni = bar ? bar.n1 - 1 : bIdx - 1;
            const nj = bar ? bar.n2 - 1 : bIdx;
            const activeDofs = bar ? [
                3 * ni,     3 * ni + 1, 3 * ni + 2,
                3 * nj,     3 * nj + 1, 3 * nj + 2
            ] : [];

            for(let rIdx = 0; rIdx < 33; rIdx++){
                const curRow = startR + 9 + rIdx;
                const lblCell = ws1.getCell(curRow, 35); // Col AI
                lblCell.value = result.dofLabels33[rIdx];
                styleCell(lblCell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);

                const activeRowPos = activeDofs.indexOf(rIdx);

                for(let cIdx = 0; cIdx < 33; cIdx++){
                    const curCell = ws1.getCell(curRow, 2 + cIdx);
                    const activeColPos = activeDofs.indexOf(cIdx);

                    if(bar && activeRowPos !== -1 && activeColPos !== -1){
                        const refRow = startR + 1 + activeRowPos;
                        const refColLetter = getColLetter(2 + activeColPos);
                        const expectedVal = bar.kt[activeRowPos][activeColPos];
                        setFormulaWithResult(curCell, `${refColLetter}${refRow}`, expectedVal, '#,##0.00', PALETTE.GREEN_PASTEL, FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT);
                    } else {
                        curCell.value = 0;
                        styleCell(curCell, null, FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT, '0.00');
                    }
                }
            }
        }

        // Bloque 5: Matriz de Rigidez Global [Kviga] (Ensamble Completo 33 GDL)
        ws1.mergeCells('B465:AH465');
        const hdrGlobal = ws1.getCell('B465');
        hdrGlobal.value = 'MATRIZ DE RIGIDEZ GLOBAL DE LA VIGA [Kviga] (ENSAMBLE COMPLETO 10 TRAMOS / 11 NODOS / 33 GDL)';
        styleCell(hdrGlobal, PALETTE.BLUE_HEADER, FONTS.TITLE, BORDERS.HEADER, ALIGNS.CENTER);

        for(let d = 0; d < 33; d++){
            const cell = ws1.getCell(466, 2 + d);
            cell.value = result.dofLabels33[d];
            styleCell(cell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        }

        ws1.getCell(483, 1).value = 'Kviga =';
        styleCell(ws1.getCell(483, 1), PALETTE.BLUE_HEADER, FONTS.TITLE, null, ALIGNS.CENTER);

        for(let rIdx = 0; rIdx < 33; rIdx++){
            const curRow = 467 + rIdx;
            const lblCell = ws1.getCell(curRow, 35); // Col AI
            lblCell.value = result.dofLabels33[rIdx];
            styleCell(lblCell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);

            for(let cIdx = 0; cIdx < 33; cIdx++){
                const colLetter = getColLetter(2 + cIdx);
                const sumParts = [];
                for(let bIdx = 1; bIdx <= 10; bIdx++){
                    const subR = 34 + (bIdx - 1) * 43 + 9 + rIdx;
                    sumParts.push(`${colLetter}${subR}`);
                }
                const formulaStr = sumParts.join('+');
                const expectedGlobalVal = result.K_global_33[rIdx][cIdx];
                const isDiag = (rIdx === cIdx);
                setFormulaWithResult(ws1.getCell(curRow, 2 + cIdx), formulaStr, expectedGlobalVal, '#,##0.00', isDiag ? PALETTE.YELLOW_LIGHT : null, isDiag ? FONTS.MONO_B : FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT);
            }
        }

        // Bloque 6: Vectores de Cargas Globales {C} y Condiciones (Filas 502 a 536)
        ws1.mergeCells('B502:N502');
        const hdrVec = ws1.getCell('B502');
        hdrVec.value = 'VECTORES DE CARGAS GLOBALES {C} Y CONDICIONES DE FRONTERA / DESPLAZAMIENTOS {D}';
        styleCell(hdrVec, PALETTE.BLUE_HEADER, FONTS.TITLE, BORDERS.HEADER, ALIGNS.CENTER);

        ['GDL', 'Nudo', 'Tipo', 'Fuerza (C)', '', '', 'GDL', '', '', '', '', '', 'Condición GDL'].forEach((txt, idx) => {
            if(txt){
                const cell = ws1.getCell(503, 2 + idx);
                cell.value = txt;
                styleCell(cell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
            }
        });

        for(let d = 0; d < 33; d++){
            const curRow = 504 + d;
            const nIdx = Math.floor(d / 3) + 1;
            const dofType = ['X', 'Y', 'θ'][d % 3];

            ws1.getCell(curRow, 2).value = result.dofLabels33[d];
            styleCell(ws1.getCell(curRow, 2), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

            ws1.getCell(curRow, 3).value = nIdx;
            styleCell(ws1.getCell(curRow, 3), null, FONTS.REG, BORDERS.THIN, ALIGNS.CENTER);

            ws1.getCell(curRow, 4).value = dofType;
            styleCell(ws1.getCell(curRow, 4), null, FONTS.REG, BORDERS.THIN, ALIGNS.CENTER);

            ws1.getCell(curRow, 5).value = result.F_applied_33[d];
            styleCell(ws1.getCell(curRow, 5), PALETTE.YELLOW_LIGHT, FONTS.REG, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');

            ws1.getCell(curRow, 8).value = result.dofLabels33[d];
            styleCell(ws1.getCell(curRow, 8), PALETTE.BLUE_SUBHDR, FONTS.REG, BORDERS.THIN, ALIGNS.CENTER);

            ws1.getCell(curRow, 14).value = result.dofConditions_33[d];
            const isRestr = result.dofConditions_33[d] === 'RESTRINGIDO';
            styleCell(ws1.getCell(curRow, 14), isRestr ? PALETTE.ROSE_LIGHT : PALETTE.GREEN_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);
        }

        // Bloque 7: Matriz Modificada y Resolución (Filas 576 a 610)
        ws1.mergeCells('B576:AH576');
        const hdrMod = ws1.getCell('B576');
        hdrMod.value = '7. MATRIZ DE RIGIDEZ MODIFICADA PARA CÁLCULO DE DESPLAZAMIENTOS [K_mod] (DIAGONAL 1 EN RESTRINGIDOS)';
        styleCell(hdrMod, PALETTE.BLUE_HEADER, FONTS.TITLE, BORDERS.HEADER, ALIGNS.CENTER);

        for(let d = 0; d < 33; d++){
            const cell = ws1.getCell(577, 2 + d);
            cell.value = result.dofLabels33[d];
            styleCell(cell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        }

        ws1.getCell('AJ577').value = 'C_LIBRES';
        styleCell(ws1.getCell('AJ577'), PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        ws1.getCell('AL577').value = 'D_CALCULADO';
        styleCell(ws1.getCell('AL577'), PALETTE.GREEN_PASTEL, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);
        ws1.getCell('AN577').value = 'R_CALCULADO';
        styleCell(ws1.getCell('AN577'), PALETTE.BLUE_HEADER, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

        for(let rIdx = 0; rIdx < 33; rIdx++){
            const curRow = 578 + rIdx;
            const dofRow = 504 + rIdx;
            const kvigaRow = 467 + rIdx;

            for(let cIdx = 0; cIdx < 33; cIdx++){
                const colLetter = getColLetter(2 + cIdx);
                const dofCol = 504 + cIdx;
                const curCell = ws1.getCell(curRow, 2 + cIdx);

                if(rIdx === cIdx){
                    const formula = `IF($N${dofRow}="RESTRINGIDO", 1, IF(OR($N${dofRow}="", $C${kvigaRow}=""), 1, ${colLetter}${kvigaRow}))`;
                    const isRestr = result.dofConditions_33[rIdx] === 'RESTRINGIDO';
                    const val = isRestr ? 1 : result.K_global_33[rIdx][cIdx];
                    setFormulaWithResult(curCell, formula, val, '#,##0.00', isRestr ? PALETTE.ROSE_LIGHT : PALETTE.YELLOW_LIGHT, FONTS.MONO_B, BORDERS.THIN, ALIGNS.RIGHT);
                } else {
                    const formula = `IF(OR($N${dofRow}="RESTRINGIDO", $N${dofCol}="RESTRINGIDO"), 0, ${colLetter}${kvigaRow})`;
                    const isRestr = result.dofConditions_33[rIdx] === 'RESTRINGIDO' || result.dofConditions_33[cIdx] === 'RESTRINGIDO';
                    const val = isRestr ? 0 : result.K_global_33[rIdx][cIdx];
                    setFormulaWithResult(curCell, formula, val, '#,##0.00', null, FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT);
                }
            }

            // Columna AJ: C_LIBRES
            const ajCell = ws1.getCell(curRow, 36);
            const fFreeVal = (result.dofConditions_33[rIdx] === 'LIBRE') ? result.F_applied_33[rIdx] : 0;
            setFormulaWithResult(ajCell, `IF($N${dofRow}="LIBRE", IF(ISNUMBER(E${dofRow}), E${dofRow}, 0), 0)`, fFreeVal, '#,##0.00', PALETTE.YELLOW_LIGHT, FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT);

            // Columna AL: D_CALCULADO
            const alCell = ws1.getCell(curRow, 38);
            const dVal = result.D_total_33[rIdx];
            if(rIdx === 0){
                alCell.value = {
                    formula: 'MMULT(MINVERSE(B578:AH610), AJ578:AJ610)',
                    result: dVal
                };
            } else {
                alCell.value = dVal;
            }
            styleCell(alCell, PALETTE.GREEN_PASTEL, FONTS.MONO_B, BORDERS.THIN, ALIGNS.RIGHT, '0.000000');

            // Columna AN: R_CALCULADO
            const anCell = ws1.getCell(curRow, 40);
            const rVal = result.reactions_33[rIdx];
            if(rIdx === 0){
                anCell.value = {
                    formula: 'MMULT(B467:AH499, AL578:AL610) - IF(ISNUMBER(E504:E536), E504:E536, 0)',
                    result: rVal
                };
            } else {
                anCell.value = rVal;
            }
            styleCell(anCell, PALETTE.BLUE_LIGHT, FONTS.MONO_B, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');
        }

        // Bloque 8: Resumen de Desplazamientos (Filas 615 a 649)
        ws1.mergeCells('B615:H615');
        const hdrResD = ws1.getCell('B615');
        hdrResD.value = 'RESUMEN DE DESPLAZAMIENTOS';
        styleCell(hdrResD, PALETTE.BLUE_HEADER, FONTS.TITLE, BORDERS.HEADER, ALIGNS.CENTER);

        for(let d = 0; d < 33; d++){
            const curRow = 617 + d;
            const nIdx = Math.floor(d / 3) + 1;
            const dofType = ['X', 'Y', 'θ'][d % 3];
            const dofRow = 504 + d;
            const alRow = 578 + d;

            ws1.getCell(curRow, 2).value = `D${nIdx}${dofType}`;
            ws1.getCell(curRow, 3).value = result.dofLabels33[d];
            ws1.getCell(curRow, 4).value = '=';
            setFormulaWithResult(ws1.getCell(curRow, 5), `IF(OR($G$4=0, ${nIdx}>$G$4), 0, IF(N${dofRow}="RESTRINGIDO", 0, AL${alRow}))`, result.D_total_33[d], dofType==='θ' ? '0.00000000' : '0.000000', PALETTE.GREEN_PASTEL, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT);
            ws1.getCell(curRow, 6).value = result.dofLabels33[d];
            ws1.getCell(curRow, 7).value = dofType === 'θ' ? 'rad' : 'cm';
            for(let c = 2; c <= 7; c++){
                if(c !== 5) styleCell(ws1.getCell(curRow, c), null, FONTS.REG, BORDERS.THIN, ALIGNS.CENTER);
            }
        }

        // Bloque 9: Resumen de Reacciones en Apoyos (Filas 653 a 687)
        ws1.mergeCells('B653:H653');
        const hdrResR = ws1.getCell('B653');
        hdrResR.value = 'RESUMEN DE REACCIONES EN LOS APOYOS';
        styleCell(hdrResR, PALETTE.BLUE_HEADER, FONTS.TITLE, BORDERS.HEADER, ALIGNS.CENTER);

        ['Símbolo', 'G.D.L.', '=', 'Valor Reacción', 'G.D.L.', 'Unidad', 'Condición'].forEach((txt, idx) => {
            const cell = ws1.getCell(654, 2 + idx);
            cell.value = txt;
            styleCell(cell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        });

        for(let d = 0; d < 33; d++){
            const curRow = 655 + d;
            const nIdx = Math.floor(d / 3) + 1;
            const dofType = ['X', 'Y', 'θ'][d % 3];
            const dofRow = 504 + d;
            const anRow = 578 + d;

            ws1.getCell(curRow, 2).value = `R${nIdx}${dofType}`;
            ws1.getCell(curRow, 3).value = result.dofLabels33[d];
            ws1.getCell(curRow, 4).value = '=';
            setFormulaWithResult(ws1.getCell(curRow, 5), `IF(OR($G$4=0, ${nIdx}>$G$4), 0, IF(N${dofRow}="RESTRINGIDO", AN${anRow}, 0))`, result.reactions_33[d], '#,##0.00', PALETTE.BLUE_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT);
            ws1.getCell(curRow, 6).value = result.dofLabels33[d];
            ws1.getCell(curRow, 7).value = dofType === 'θ' ? 'Kgf.cm' : 'Kgf';
            setFormulaWithResult(ws1.getCell(curRow, 8), `=N${dofRow}`, result.dofConditions_33[d], '@', null, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

            for(let c = 2; c <= 7; c++){
                if(c !== 5) styleCell(ws1.getCell(curRow, c), null, FONTS.REG, BORDERS.THIN, ALIGNS.CENTER);
            }
        }

        // Bloque 10: TABLA DE CURVA ELÁSTICA (2 Columnas Exactas, Filas 673 a 686, Cols J a M)
        ws1.mergeCells('J673:M673');
        const hdrElast = ws1.getCell('J673');
        hdrElast.value = 'DATOS PARA GRAFICAR LA CURVA ELÁSTICA';
        styleCell(hdrElast, PALETTE.GREEN_PASTEL, FONTS.TITLE, BORDERS.HEADER, ALIGNS.CENTER);

        ws1.getCell('J674').value = 'Nudo';
        styleCell(ws1.getCell('J674'), PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        ws1.getCell('K674').value = 'X (cm)';
        styleCell(ws1.getCell('K674'), PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        ws1.getCell('L674').value = 'DY (cm)';
        styleCell(ws1.getCell('L674'), PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        ws1.getCell('M674').value = 'θ (rad)';
        styleCell(ws1.getCell('M674'), PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);

        for(let n = 1; n <= 11; n++){
            const curRow = 674 + n;
            ws1.getCell(curRow, 10).value = n;
            styleCell(ws1.getCell(curRow, 10), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

            if(n === 1){
                ws1.getCell(curRow, 11).value = 0;
                styleCell(ws1.getCell(curRow, 11), null, FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');
            } else {
                const prevRow = curRow - 1;
                const geomR = 8 + (n - 1);
                setFormulaWithResult(ws1.getCell(curRow, 11), `IF(I${geomR}="","", K${prevRow}+I${geomR})`, (n <= result.nodes.length ? result.nodes[n-1].x : ''), '#,##0.00', null, FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT);
            }

            const dyRow = 617 + 3 * (n - 1) + 1;
            const thRow = 617 + 3 * (n - 1) + 2;
            const dyVal = n <= result.nodes.length ? result.D_total_33[3 * (n - 1) + 1] : 0;
            const thVal = n <= result.nodes.length ? result.D_total_33[3 * (n - 1) + 2] : 0;

            setFormulaWithResult(ws1.getCell(curRow, 12), `IF(${n}>$G$4,"", E${dyRow})`, dyVal, '0.000000', PALETTE.GREEN_PASTEL, FONTS.MONO_B, BORDERS.THIN, ALIGNS.RIGHT);
            setFormulaWithResult(ws1.getCell(curRow, 13), `IF(${n}>$G$4,"", E${thRow})`, thVal, '0.00000000', PALETTE.YELLOW_LIGHT, FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT);
        }

        // =========================================================================
        // PESTAÑA 2: 'PLANTILLA ULIANOV' (Grandote Automatizado con Partición y 3 Cuadros)
        // =========================================================================
        const ws2 = wb.addWorksheet('PLANTILLA ULIANOV', {
            views: [{ showGridLines: true }]
        });

        ws2.getColumn(1).width = 8;
        for(let c = 2; c <= 35; c++){
            ws2.getColumn(c).width = 13;
        }
        for(let c = 36; c <= 45; c++){
            ws2.getColumn(c).width = 15;
        }

        // Banner Institucional
        ws2.mergeCells('B1:N1');
        const uliB1 = ws2.getCell('B1');
        uliB1.value = 'UNIVERSIDAD CONTINENTAL - FACULTAD DE INGENIERÍA';
        styleCell(uliB1, PALETTE.NAVY_HDR, { name: 'Calibri', size: 13, bold: true, color: { argb: PALETTE.WHITE } }, BORDERS.HEADER, ALIGNS.CENTER);

        ws2.mergeCells('B2:N2');
        const uliB2 = ws2.getCell('B2');
        uliB2.value = 'CÁTEDRA DE ANÁLISIS ESTRUCTURAL II - ING. ULIANOV CUBA VALENCIA';
        styleCell(uliB2, PALETTE.BLUE_ACCENT, { name: 'Calibri', size: 11, bold: true, color: { argb: PALETTE.WHITE } }, BORDERS.THIN, ALIGNS.CENTER);

        ws2.mergeCells('B3:N3');
        const uliB3 = ws2.getCell('B3');
        uliB3.value = 'MÉTODO MATRICIAL DE RIGIDEZ DIRECTA EN PÓRTICOS 2D (HASTA 10 TRAMOS / 11 NODOS / 33 GDL)';
        styleCell(uliB3, PALETTE.BLUE_SUBHDR, FONTS.SUBTITLE, BORDERS.THIN, ALIGNS.CENTER);

        // Sección 1: Propiedades (Filas 4 a 8)
        ws2.getCell('B4').value = '1. PROPIEDADES DE LA SECCIÓN TRANSVERSAL Y MATERIAL';
        styleCell(ws2.getCell('B4'), PALETTE.BLUE_HEADER, FONTS.BOLD, BORDERS.HEADER, ALIGNS.LEFT);

        ws2.getCell('B5').value = 'Base b (cm):';
        ws2.getCell('C5').value = model.section.b;
        styleCell(ws2.getCell('C5'), PALETTE.YELLOW_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT);
        ws2.getCell('D5').value = 'Altura h (cm):';
        ws2.getCell('E5').value = model.section.h;
        styleCell(ws2.getCell('E5'), PALETTE.YELLOW_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT);
        ws2.getCell('F5').value = 'Área A (cm²):';
        setFormulaWithResult(ws2.getCell('G5'), 'C5*E5', result.props.A, '#,##0.00', PALETTE.BLUE_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT);
        ws2.getCell('H5').value = 'Inercia I (cm⁴):';
        setFormulaWithResult(ws2.getCell('I5'), '(C5*(E5^3))/12', result.props.I, '#,##0.0000', PALETTE.BLUE_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT);
        ws2.getCell('J5').value = 'Módulo E (kgf/cm²):';
        ws2.getCell('K5').value = model.E;
        styleCell(ws2.getCell('K5'), PALETTE.YELLOW_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT, '#,##0');

        // Sección 2: Tabla de Geometría de Barras (Filas 10 a 22)
        ws2.getCell('B10').value = '2. GEOMETRÍA DE BARRAS Y PROPIEDADES DE RIGIDEZ';
        styleCell(ws2.getCell('B10'), PALETTE.BLUE_HEADER, FONTS.BOLD, BORDERS.HEADER, ALIGNS.LEFT);

        const uliGeomH = ['Barra', 'Ni', 'Nj', 'Xi', 'Yi', 'Xf', 'Yf', 'L (cm)', 'Cosx', 'Cosy', 'EA/L', '12EI/L³', '6EI/L²', '4EI/L', '2EI/L'];
        uliGeomH.forEach((h, idx) => {
            const cell = ws2.getCell(11, 2 + idx);
            cell.value = h;
            styleCell(cell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        });

        for(let bIdx = 1; bIdx <= 10; bIdx++){
            const r = 11 + bIdx;
            const bar = result.bars[bIdx - 1];
            ws2.getCell(r, 2).value = bIdx;
            styleCell(ws2.getCell(r, 2), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

            if(bar){
                const n1 = result.nodes.find(n => n.id === bar.n1);
                const n2 = result.nodes.find(n => n.id === bar.n2);
                ws2.getCell(r, 3).value = bar.n1;
                ws2.getCell(r, 4).value = bar.n2;
                ws2.getCell(r, 5).value = n1.x;
                ws2.getCell(r, 6).value = n1.y;
                ws2.getCell(r, 7).value = n2.x;
                ws2.getCell(r, 8).value = n2.y;
                ws2.getCell(r, 9).value = bar.L;
                ws2.getCell(r, 10).value = bar.c;
                ws2.getCell(r, 11).value = bar.s;
                ws2.getCell(r, 12).value = model.E * result.props.A / bar.L;
                ws2.getCell(r, 13).value = 12 * model.E * result.props.I / (bar.L ** 3);
                ws2.getCell(r, 14).value = 6 * model.E * result.props.I / (bar.L ** 2);
                ws2.getCell(r, 15).value = 4 * model.E * result.props.I / bar.L;
                ws2.getCell(r, 16).value = 2 * model.E * result.props.I / bar.L;

                for(let c = 3; c <= 16; c++){
                    const fmt = c === 3 || c === 4 ? '0' : (c === 10 || c === 11 ? '0.0000' : '#,##0.00');
                    styleCell(ws2.getCell(r, c), null, FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT, fmt);
                }
            } else {
                for(let c = 3; c <= 16; c++){
                    styleCell(ws2.getCell(r, c), null, FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT);
                }
            }
        }

        // Sección 3: Tabla de Evaluación Nodal (Filas 24 a 37)
        ws2.getCell('B24').value = '3. TABLA DE EVALUACIÓN NODAL: APOYOS, CONDICIONES GDL Y CARGAS';
        styleCell(ws2.getCell('B24'), PALETTE.BLUE_HEADER, FONTS.BOLD, BORDERS.HEADER, ALIGNS.LEFT);

        ['Nudo', 'X (cm)', 'Y (cm)', 'Apoyo', 'GDL Ux', 'GDL Uy', 'GDL θz', 'Fx (kgf)', 'Fy (kgf)', 'Mz (kgf·cm)'].forEach((h, idx) => {
            const cell = ws2.getCell(25, 2 + idx);
            cell.value = h;
            styleCell(cell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        });

        for(let n = 1; n <= 11; n++){
            const r = 25 + n;
            const node = result.nodes.find(nd => nd.id === n);
            ws2.getCell(r, 2).value = n;
            styleCell(ws2.getCell(r, 2), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

            if(node){
                ws2.getCell(r, 3).value = node.x;
                ws2.getCell(r, 4).value = node.y;
                ws2.getCell(r, 5).value = node.support.toUpperCase();
                ws2.getCell(r, 6).value = (node.support === 'fixed' || node.support === 'pin' || node.support === 'rollerX') ? 'RESTRINGIDO' : 'LIBRE';
                ws2.getCell(r, 7).value = (node.support === 'fixed' || node.support === 'pin' || node.support === 'rollerY') ? 'RESTRINGIDO' : 'LIBRE';
                ws2.getCell(r, 8).value = (node.support === 'fixed') ? 'RESTRINGIDO' : 'LIBRE';
                ws2.getCell(r, 9).value = node.fx || 0;
                ws2.getCell(r, 10).value = node.fy || 0;
                ws2.getCell(r, 11).value = node.mz || 0;

                for(let c = 3; c <= 11; c++){
                    const isCond = c >= 6 && c <= 8;
                    const fill = isCond && ws2.getCell(r, c).value === 'RESTRINGIDO' ? PALETTE.ROSE_LIGHT : (isCond ? PALETTE.GREEN_LIGHT : null);
                    styleCell(ws2.getCell(r, c), fill, FONTS.REG, BORDERS.THIN, isCond ? ALIGNS.CENTER : ALIGNS.RIGHT, '#,##0.00');
                }
            } else {
                for(let c = 3; c <= 11; c++) styleCell(ws2.getCell(r, c), null, FONTS.REG, BORDERS.THIN, ALIGNS.CENTER);
            }
        }

        // Sección 4: Matriz de Rigidez Global [K] Ensamble 33x33 (Filas 40 a 74)
        ws2.mergeCells('B39:AH39');
        ws2.getCell('B39').value = '4. MATRIZ DE RIGIDEZ GLOBAL DE LA ESTRUCTURA [K] (33 x 33 GDL)';
        styleCell(ws2.getCell('B39'), PALETTE.BLUE_HEADER, FONTS.TITLE, BORDERS.HEADER, ALIGNS.CENTER);

        for(let d = 0; d < 33; d++){
            const cell = ws2.getCell(40, 2 + d);
            cell.value = result.dofLabels33[d];
            styleCell(cell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        }

        for(let rIdx = 0; rIdx < 33; rIdx++){
            const curRow = 41 + rIdx;
            const lblCell = ws2.getCell(curRow, 1);
            lblCell.value = result.dofLabels33[rIdx];
            styleCell(lblCell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);

            for(let cIdx = 0; cIdx < 33; cIdx++){
                const cell = ws2.getCell(curRow, 2 + cIdx);
                const val = result.K_global_33[rIdx][cIdx];
                cell.value = val;
                const isDiag = (rIdx === cIdx);
                styleCell(cell, isDiag ? PALETTE.YELLOW_LIGHT : null, isDiag ? FONTS.MONO_B : FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');
            }
        }

        // Sección 5: PARTICIÓN MATRICIAL DEL PÓRTICO (Filas 76 a 130)
        // Eliminación de filas y columnas con desplazamiento nulo (apoyos fijos / empotrados)
        const freeCount = result.free.length;
        ws2.mergeCells('B76:R76');
        ws2.getCell('B76').value = `5. PARTICIÓN MATRICIAL: SUBMATRIZ REDUCIDA [K_LL] (${freeCount} x ${freeCount} GDL LIBRES)`;
        styleCell(ws2.getCell('B76'), PALETTE.BLUE_HEADER, FONTS.TITLE, BORDERS.HEADER, ALIGNS.CENTER);

        for(let f = 0; f < freeCount; f++){
            const cell = ws2.getCell(77, 2 + f);
            cell.value = result.dofLabels33[result.free[f]];
            styleCell(cell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        }

        for(let i = 0; i < freeCount; i++){
            const curRow = 78 + i;
            const lblCell = ws2.getCell(curRow, 1);
            lblCell.value = result.dofLabels33[result.free[i]];
            styleCell(lblCell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);

            for(let j = 0; j < freeCount; j++){
                const cell = ws2.getCell(curRow, 2 + j);
                cell.value = result.Kff[i][j];
                const isDiag = (i === j);
                styleCell(cell, isDiag ? PALETTE.GREEN_PASTEL : null, isDiag ? FONTS.MONO_B : FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');
            }
        }

        // Sección 6: MATRIZ INVERSA [K_LL]^-1
        const invStartRow = 78 + freeCount + 3;
        ws2.mergeCells(`B${invStartRow}:R${invStartRow}`);
        ws2.getCell(`B${invStartRow}`).value = `6. MATRIZ INVERSA [K_LL]^-1 (CALCULADA CON =MINVERSA, ${freeCount} x ${freeCount})`;
        styleCell(ws2.getCell(`B${invStartRow}`), PALETTE.BLUE_HEADER, FONTS.TITLE, BORDERS.HEADER, ALIGNS.CENTER);

        for(let f = 0; f < freeCount; f++){
            const cell = ws2.getCell(invStartRow + 1, 2 + f);
            cell.value = result.dofLabels33[result.free[f]];
            styleCell(cell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        }

        const firstKLLCell = `B78`;
        const lastKLLCell = `${getColLetter(1 + freeCount)}${78 + freeCount - 1}`;

        for(let i = 0; i < freeCount; i++){
            const curRow = invStartRow + 2 + i;
            const lblCell = ws2.getCell(curRow, 1);
            lblCell.value = result.dofLabels33[result.free[i]];
            styleCell(lblCell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);

            for(let j = 0; j < freeCount; j++){
                const cell = ws2.getCell(curRow, 2 + j);
                const invVal = result.Kff_inv[i][j];
                if(i === 0 && j === 0){
                    cell.value = {
                        formula: `MINVERSE(${firstKLLCell}:${lastKLLCell})`,
                        result: invVal
                    };
                } else {
                    cell.value = invVal;
                }
                styleCell(cell, PALETTE.YELLOW_LIGHT, FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT, '0.000000000');
            }
        }

        // Sección 7: LOS 3 CUADROS CLÁSICOS DE RESOLUCIÓN MATRICIAL: [D_L] = [K_LL]^-1 * [F_L]
        const tresCuadrosStart = invStartRow + 2 + freeCount + 3;
        ws2.mergeCells(`B${tresCuadrosStart}:Z${tresCuadrosStart}`);
        ws2.getCell(`B${tresCuadrosStart}`).value = '7. ECUACIÓN MATRICIAL FUNDAMENTAL: {D_libres} = [K_LL]^-1 · {F_libres} (3 CUADROS MATRICIALES)';
        styleCell(ws2.getCell(`B${tresCuadrosStart}`), PALETTE.NAVY_HDR, { name: 'Calibri', size: 11, bold: true, color: { argb: PALETTE.WHITE } }, BORDERS.HEADER, ALIGNS.CENTER);

        // Cuadro 1: Vector {D_L}
        ws2.mergeCells(`B${tresCuadrosStart + 1}:D${tresCuadrosStart + 1}`);
        ws2.getCell(`B${tresCuadrosStart + 1}`).value = 'CUADRO 1: {D_libres} (cm, rad)';
        styleCell(ws2.getCell(`B${tresCuadrosStart + 1}`), PALETTE.GREEN_PASTEL, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

        // Cuadro 2: Matriz [K_LL]^-1
        const invColStart = 6;
        const invColEnd = invColStart + freeCount - 1;
        ws2.mergeCells(tresCuadrosStart + 1, invColStart, tresCuadrosStart + 1, invColEnd);
        const c2Hdr = ws2.getCell(tresCuadrosStart + 1, invColStart);
        c2Hdr.value = `CUADRO 2: [K_LL]^-1 (${freeCount}x${freeCount})`;
        styleCell(c2Hdr, PALETTE.YELLOW_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

        // Cuadro 3: Vector {F_L}
        const fColStart = invColEnd + 2;
        ws2.mergeCells(tresCuadrosStart + 1, fColStart, tresCuadrosStart + 1, fColStart + 1);
        const c3Hdr = ws2.getCell(tresCuadrosStart + 1, fColStart);
        c3Hdr.value = 'CUADRO 3: {F_libres} (kgf, kgf·cm)';
        styleCell(c3Hdr, PALETTE.BLUE_HEADER, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

        const firstInvCell = `B${invStartRow + 2}`;
        const lastInvCell = `${getColLetter(1 + freeCount)}${invStartRow + 2 + freeCount - 1}`;
        const firstFCell = `${getColLetter(fColStart + 1)}${tresCuadrosStart + 2}`;
        const lastFCell = `${getColLetter(fColStart + 1)}${tresCuadrosStart + 1 + freeCount}`;

        for(let i = 0; i < freeCount; i++){
            const r = tresCuadrosStart + 2 + i;

            // Cuadro 1: Desplazamiento
            ws2.getCell(r, 2).value = result.dofLabels33[result.free[i]];
            styleCell(ws2.getCell(r, 2), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

            const dCell = ws2.getCell(r, 3);
            const dVal = result.Df_inv[i];
            if(i === 0){
                dCell.value = {
                    formula: `MMULT(${firstInvCell}:${lastInvCell}, ${firstFCell}:${lastFCell})`,
                    result: dVal
                };
            } else {
                dCell.value = dVal;
            }
            styleCell(dCell, PALETTE.GREEN_PASTEL, FONTS.MONO_B, BORDERS.THIN, ALIGNS.RIGHT, '0.000000');

            ws2.getCell(r, 4).value = (result.free[i] % 3 === 2) ? 'rad' : 'cm';
            styleCell(ws2.getCell(r, 4), null, FONTS.REG, BORDERS.THIN, ALIGNS.CENTER);

            // Cuadro 2: Fila de la matriz inversa
            for(let j = 0; j < freeCount; j++){
                const cell = ws2.getCell(r, invColStart + j);
                cell.value = result.Kff_inv[i][j];
                styleCell(cell, null, FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT, '0.0000000');
            }

            // Cuadro 3: Carga libre
            ws2.getCell(r, fColStart).value = result.dofLabels33[result.free[i]];
            styleCell(ws2.getCell(r, fColStart), PALETTE.BLUE_SUBHDR, FONTS.REG, BORDERS.THIN, ALIGNS.CENTER);

            const fCell = ws2.getCell(r, fColStart + 1);
            fCell.value = result.Ff[i];
            styleCell(fCell, PALETTE.YELLOW_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');
        }

        // Sección 8: CÁLCULO DE REACCIONES MEDIANTE FILAS RESTRINGIDAS [K_RL]
        // {R} = [K_RL] * {D_L} - {F_R}
        const restrCount = result.restrained.length;
        const reacStartRow = tresCuadrosStart + 2 + freeCount + 3;

        ws2.mergeCells(`B${reacStartRow}:N${reacStartRow}`);
        ws2.getCell(`B${reacStartRow}`).value = `8. CÁLCULO DE REACCIONES: {R} = [K_RL] · {D_libres} - {F_restringidos} (${restrCount} GDL RESTRINGIDOS)`;
        styleCell(ws2.getCell(`B${reacStartRow}`), PALETTE.BLUE_HEADER, FONTS.TITLE, BORDERS.HEADER, ALIGNS.CENTER);

        ['GDL Reacción', 'Símbolo', 'Fórmula Aplicada', 'Valor Reacción', 'Unidad', 'Condición'].forEach((h, idx) => {
            const cell = ws2.getCell(reacStartRow + 1, 2 + idx);
            cell.value = h;
            styleCell(cell, PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        });

        for(let r = 0; r < restrCount; r++){
            const curRow = reacStartRow + 2 + r;
            const dIdx = result.restrained[r];
            const nIdx = Math.floor(dIdx / 3) + 1;
            const dofType = ['X', 'Y', 'θ'][dIdx % 3];
            const rVal = result.R_partition[r];

            ws2.getCell(curRow, 2).value = result.dofLabels33[dIdx];
            styleCell(ws2.getCell(curRow, 2), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

            ws2.getCell(curRow, 3).value = `R${nIdx}${dofType}`;
            styleCell(ws2.getCell(curRow, 3), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

            ws2.getCell(curRow, 4).value = `K_RL(${r+1},:) · D_L - F_R(${r+1})`;
            styleCell(ws2.getCell(curRow, 4), null, FONTS.REG, BORDERS.THIN, ALIGNS.LEFT);

            ws2.getCell(curRow, 5).value = rVal;
            styleCell(ws2.getCell(curRow, 5), PALETTE.BLUE_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');

            ws2.getCell(curRow, 6).value = dofType === 'θ' ? 'kgf·cm' : 'kgf';
            styleCell(ws2.getCell(curRow, 6), null, FONTS.REG, BORDERS.THIN, ALIGNS.CENTER);

            ws2.getCell(curRow, 7).value = 'RESTRINGIDO';
            styleCell(ws2.getCell(curRow, 7), PALETTE.ROSE_LIGHT, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);
        }

        // Sección 9: TABLA DE CURVA ELÁSTICA (2 Columnas Exactas para Graficación)
        const elastStart = reacStartRow + 2 + restrCount + 3;
        ws2.mergeCells(`B${elastStart}:D${elastStart}`);
        ws2.getCell(`B${elastStart}`).value = '9. TABLA DE DATOS PARA GRAFICAR LA CURVA ELÁSTICA (2 COLUMNAS)';
        styleCell(ws2.getCell(`B${elastStart}`), PALETTE.GREEN_PASTEL, FONTS.TITLE, BORDERS.HEADER, ALIGNS.CENTER);

        ws2.getCell(`B${elastStart + 1}`).value = 'Nudo';
        styleCell(ws2.getCell(`B${elastStart + 1}`), PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        ws2.getCell(`C${elastStart + 1}`).value = 'X (cm)';
        styleCell(ws2.getCell(`C${elastStart + 1}`), PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);
        ws2.getCell(`D${elastStart + 1}`).value = 'DY (cm)';
        styleCell(ws2.getCell(`D${elastStart + 1}`), PALETTE.BLUE_SUBHDR, FONTS.HDR, BORDERS.THIN, ALIGNS.CENTER);

        result.nodes.forEach((nd, idx) => {
            const curRow = elastStart + 2 + idx;
            ws2.getCell(curRow, 2).value = nd.id;
            styleCell(ws2.getCell(curRow, 2), PALETTE.BLUE_SUBHDR, FONTS.BOLD, BORDERS.THIN, ALIGNS.CENTER);

            ws2.getCell(curRow, 3).value = nd.x;
            styleCell(ws2.getCell(curRow, 3), null, FONTS.MONO, BORDERS.THIN, ALIGNS.RIGHT, '#,##0.00');

            ws2.getCell(curRow, 4).value = nd.uy;
            styleCell(ws2.getCell(curRow, 4), PALETTE.GREEN_PASTEL, FONTS.MONO_B, BORDERS.THIN, ALIGNS.RIGHT, '0.000000');
        });

        // Sección 10: Comprobación de Equilibrio Estático
        const eqStart = elastStart + 2 + result.nodes.length + 2;
        ws2.mergeCells(`B${eqStart}:H${eqStart}`);
        const eq = result.equilibrium;
        ws2.getCell(`B${eqStart}`).value = `✓ COMPROBACIÓN DE EQUILIBRIO GLOBAL ESTÁTICO: ΣFx = ${eq.fx.toExponential(3)} kgf · ΣFy = ${eq.fy.toExponential(3)} kgf · ΣMz = ${eq.mz.toExponential(3)} kgf·cm (CONVERGENCIA ALCANZADA)`;
        styleCell(ws2.getCell(`B${eqStart}`), PALETTE.GREEN_LIGHT, FONTS.BOLD, BORDERS.HEADER, ALIGNS.CENTER);

        return wb;
    }

    /**
     * Descarga automática en el navegador de la hoja Excel con las dos pestañas oficiales
     */
    async function downloadFrameExcel(model, result, opts = 'PLANTILLA_ULIANOV_PORTICOS_2D_OFICIAL.xlsx'){
        let filename = 'PLANTILLA_ULIANOV_PORTICOS_2D_OFICIAL.xlsx';
        if(typeof opts === 'string' && opts.trim()) filename = opts.trim();
        else if(opts && typeof opts.filename === 'string') filename = opts.filename.trim();
        try {
            const wb = await buildMasterFrameWorkbook(model, result);
            const buffer = await wb.xlsx.writeBuffer();

            if(typeof window !== 'undefined' && typeof document !== 'undefined'){
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
        } catch(err){
            console.error('Error generando hoja Excel de Pórticos:', err);
            throw err;
        }
    }

    return {
        buildMasterFrameWorkbook,
        downloadFrameExcel
    };
}));

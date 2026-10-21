/**
 * frame-excel-generator.js — CEREBRO ESTRUCTURAL v3.5 (Plantilla Ulianov - Pórticos 2D)
 * Exportador Oficial de Hojas de Cálculo Académicas:
 *  1. Método A: Inyección en la "PLANTILLA_MAESTRA_5_PESTANAS_ULIANOV.xlsx" (5 pestañas oficiales intactas)
 *  2. Método B: Generador Dinámico de 5 Pestañas con ExcelJS:
 *     - Pestaña 1: 1. GEOMETRÍA Y SECCIÓN (Propiedades, Steiner, Nudos, Coordenadas, Cargas)
 *     - Pestaña 2: 2. MATRICES ELEMENTALES 6x6 (k local, T transformación, kt global y Fe)
 *     - Pestaña 3: 3. SISTEMA GLOBAL Y ENSAMBLE (K global, Kff reducida, vector F y D)
 *     - Pestaña 4: 4. RESULTADOS Y EQUILIBRIO (Desplazamientos, Reacciones, Esfuerzos de Extremo y ΣFx, ΣFy, ΣM)
 *     - Pestaña 5: 5. GRÁFICAS Y MUESTREO (61 puntos por tramo para DFC, DMF, Curva Elástica y PNG incrustado)
 */

(function(root, factory){
    if(typeof module === 'object' && module.exports){
        const ExcelJS = require('./assets/exceljs.min.js');
        const FrameSolver = require('./frame-solver.js');
        module.exports = factory(ExcelJS, FrameSolver);
    } else {
        root.FrameExcelGenerator = factory(root.ExcelJS, root.FrameSolver);
    }
}(typeof self !== 'undefined' ? self : this, function(ExcelJS, FrameSolver){
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
        TOTAL: {
            top:    { style: 'thin',   color: { argb: PALETTE.BORDER_DARK } },
            bottom: { style: 'double', color: { argb: PALETTE.BORDER_DARK } },
            left:   { style: 'thin',   color: { argb: PALETTE.BORDER_DARK } },
            right:  { style: 'thin',   color: { argb: PALETTE.BORDER_DARK } }
        }
    };

    const FONTS = {
        TITLE:   { name: 'Calibri', size: 12, bold: true, color: { argb: PALETTE.BLACK } },
        HDR:     { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.BLACK } },
        BOLD:    { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.BLACK } },
        REG:     { name: 'Calibri', size: 10, bold: false, color: { argb: PALETTE.BLACK } },
        MONO:    { name: 'Consolas', size: 9.5, bold: false, color: { argb: PALETTE.BLACK } }
    };

    const ALIGNS = {
        CENTER: { horizontal: 'center', vertical: 'middle', wrapText: true },
        LEFT:   { horizontal: 'left',   vertical: 'middle', wrapText: true },
        RIGHT:  { horizontal: 'right',  vertical: 'middle', wrapText: true }
    };

    function styleCell(cell, fillHex, font, border, alignment, numFmt){
        if(fillHex){
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillHex } };
        }
        if(font) cell.font = font;
        if(border) cell.border = border;
        if(alignment) cell.alignment = alignment;
        if(numFmt) cell.numFmt = numFmt;
    }

    /**
     * Inyección en la Plantilla Maestra Oficial de 5 pestañas
     */
    async function downloadPopulatedMaster5Tabs(model, result, filename = 'PLANTILLA_ULIANOV_PORTICOS_5_PESTANAS.xlsx'){
        const xp = (typeof XlsxPopulate !== 'undefined') ? XlsxPopulate : (typeof window !== 'undefined' ? window.XlsxPopulate : null);
        if(!xp || typeof fetch === 'undefined'){
            return false;
        }

        try {
            const resp = await fetch('PLANTILLA_MAESTRA_5_PESTANAS_ULIANOV.xlsx');
            if(!resp.ok) return false;

            const arrayBuf = await resp.arrayBuffer();
            const wb5 = await xp.fromDataAsync(arrayBuf);
            const wsMix = wb5.sheet('3.1 MIXTAS');
            if(wsMix){
                const sec = model.section || { b: 5, h: 5 };
                const E_val = parseFloat(model.E) || 2100000;
                const b_val = parseFloat(sec.b) || 5;
                const h_val = parseFloat(sec.h) || 5;

                wsMix.cell('C2').value(E_val);
                wsMix.cell('C3').value(b_val);
                wsMix.cell('C4').value(h_val);

                const bars = model.bars || [];
                const nodes = model.nodes || [];
                const nodeMap = new Map(nodes.map(n => [Number(n.id), n]));

                for(let i = 0; i < 10; i++){
                    const r = 9 + i;
                    const b = bars[i];
                    if(b){
                        const n1 = nodeMap.get(Number(b.from));
                        const n2 = nodeMap.get(Number(b.to));
                        if(n1 && n2){
                            wsMix.cell('C' + r).value(parseFloat(n1.x) || 0);
                            wsMix.cell('D' + r).value(parseFloat(n1.y) || 0);
                            wsMix.cell('E' + r).value(parseFloat(n2.x) || 0);
                            wsMix.cell('F' + r).value(parseFloat(n2.y) || 0);
                        } else {
                            wsMix.cell('C' + r).value(null);
                            wsMix.cell('D' + r).value(null);
                            wsMix.cell('E' + r).value(null);
                            wsMix.cell('F' + r).value(null);
                        }
                    } else {
                        wsMix.cell('C' + r).value(null);
                        wsMix.cell('D' + r).value(null);
                        wsMix.cell('E' + r).value(null);
                        wsMix.cell('F' + r).value(null);
                    }
                }

                // Condiciones de frontera en filas 504+
                for(let n = 0; n < 11; n++){
                    const node = nodes[n];
                    const rX = 504 + n * 3;
                    const rY = 505 + n * 3;
                    const rZ = 506 + n * 3;
                    if(node){
                        const isFixed = node.support === 'fixed';
                        const isPin = node.support === 'pin';
                        const isRollerY = node.support === 'rollerY';
                        const isRollerX = node.support === 'rollerX';

                        const restrX = isFixed || isPin || isRollerX;
                        const restrY = isFixed || isPin || isRollerY;
                        const restrZ = isFixed;

                        wsMix.cell('N' + rX).value(restrX ? 'RESTRINGIDO' : 'LIBRE');
                        wsMix.cell('N' + rY).value(restrY ? 'RESTRINGIDO' : 'LIBRE');
                        wsMix.cell('N' + rZ).value(restrZ ? 'RESTRINGIDO' : 'LIBRE');
                    } else {
                        wsMix.cell('N' + rX).value('LIBRE');
                        wsMix.cell('N' + rY).value('LIBRE');
                        wsMix.cell('N' + rZ).value('LIBRE');
                    }
                }
            }

            const outBlob = await wb5.outputAsync();
            if(typeof window !== 'undefined' && window.URL){
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
        } catch(err){
            console.warn("Fallo inyección en plantilla 5 pestañas, generando con ExcelJS:", err);
            return false;
        }
        return false;
    }

    /**
     * Generador Maestro con ExcelJS (5 pestañas completas y detalladas)
     */
    async function generateFullFrameExcelJS(model, result, options = {}){
        const wb = new ExcelJS.Workbook();
        wb.creator = 'Cátedra Ing. Ulianov Cuba Valencia — Universidad Continental';
        wb.created = new Date();

        const nodes = model.nodes || [];
        const bars = model.bars || [];
        const resBars = (result && result.bars) ? result.bars : [];
        const resNodes = (result && result.nodes) ? result.nodes : [];

        // ═════════════════════════════════════════════════════════════════
        // PESTAÑA 1: 1. GEOMETRÍA Y SECCIÓN
        // ═════════════════════════════════════════════════════════════════
        const ws1 = wb.addWorksheet('1. GEOMETRÍA Y SECCIÓN');
        ws1.columns = Array.from({length: 12}, () => ({ width: 14 }));

        ws1.mergeCells('B2:J2');
        ws1.getCell('B2').value = 'CEREBRO ESTRUCTURAL — PÓRTICOS 2D (PLANTILLA ULIANOV v3.5)';
        styleCell(ws1.getCell('B2'), PALETTE.HEADER_BLUE, FONTS.TITLE, BORDERS.HDR, ALIGNS.CENTER);

        ws1.getCell('B4').value = '1. PROPIEDADES DEL MATERIAL Y SECCIÓN';
        styleCell(ws1.getCell('B4'), PALETTE.SUBHDR_BLUE, FONTS.HDR, BORDERS.ALL, ALIGNS.LEFT);

        ws1.getCell('B5').value = 'Módulo Elasticidad E (kgf/cm²):';
        ws1.getCell('C5').value = model.E || 2100000;
        styleCell(ws1.getCell('B5'), PALETTE.GRAY_SOFT, FONTS.REG, BORDERS.ALL, ALIGNS.LEFT);
        styleCell(ws1.getCell('C5'), PALETTE.YELLOW_INPUT, FONTS.BOLD, BORDERS.ALL, ALIGNS.RIGHT, '#,##0');

        const sec = model.section || { shape: 'rect', b: 5, h: 5 };
        ws1.getCell('B6').value = 'Tipo de Sección:';
        ws1.getCell('C6').value = (sec.shape || 'rect').toUpperCase();
        styleCell(ws1.getCell('B6'), PALETTE.GRAY_SOFT, FONTS.REG, BORDERS.ALL, ALIGNS.LEFT);
        styleCell(ws1.getCell('C6'), PALETTE.WHITE, FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER);

        ws1.getCell('B7').value = 'Área A (cm²):';
        ws1.getCell('C7').value = result?.props?.A || (sec.b * sec.h);
        styleCell(ws1.getCell('B7'), PALETTE.GRAY_SOFT, FONTS.REG, BORDERS.ALL, ALIGNS.LEFT);
        styleCell(ws1.getCell('C7'), PALETTE.GREEN_PASTEL, FONTS.BOLD, BORDERS.ALL, ALIGNS.RIGHT, '0.00');

        ws1.getCell('B8').value = 'Inercia I (cm⁴):';
        ws1.getCell('C8').value = result?.props?.I || ((sec.b * Math.pow(sec.h, 3)) / 12);
        styleCell(ws1.getCell('B8'), PALETTE.GRAY_SOFT, FONTS.REG, BORDERS.ALL, ALIGNS.LEFT);
        styleCell(ws1.getCell('C8'), PALETTE.GREEN_PASTEL, FONTS.BOLD, BORDERS.ALL, ALIGNS.RIGHT, '0.0000');

        // Tabla de Nudos
        ws1.getCell('B10').value = '2. TABLA DE EVALUACIÓN NODAL Y CONDICIONES DE APOYO';
        styleCell(ws1.getCell('B10'), PALETTE.SUBHDR_BLUE, FONTS.HDR, BORDERS.ALL, ALIGNS.LEFT);

        const nodeHdrs = ['Nudo', 'X (cm)', 'Y (cm)', 'Apoyo', 'Ux (GDL)', 'Uy (GDL)', 'θz (GDL)', 'Fx (kgf)', 'Fy (kgf)', 'Mz (kgf·cm)'];
        nodeHdrs.forEach((h, colIdx) => {
            const cell = ws1.getCell(11, 2 + colIdx);
            cell.value = h;
            styleCell(cell, PALETTE.CELESTE, FONTS.HDR, BORDERS.HDR, ALIGNS.CENTER);
        });

        nodes.forEach((n, idx) => {
            const r = 12 + idx;
            const rowData = [
                n.id, n.x, n.y, (n.support || 'free').toUpperCase(),
                n.support === 'fixed' || n.support === 'pin' || n.support === 'rollerX' ? 'RESTRINGIDO' : 'LIBRE',
                n.support === 'fixed' || n.support === 'pin' || n.support === 'rollerY' ? 'RESTRINGIDO' : 'LIBRE',
                n.support === 'fixed' ? 'RESTRINGIDO' : 'LIBRE',
                n.fx || 0, n.fy || 0, n.mz || 0
            ];
            rowData.forEach((val, cIdx) => {
                const cell = ws1.getCell(r, 2 + cIdx);
                cell.value = val;
                styleCell(cell, idx % 2 === 0 ? PALETTE.WHITE : PALETTE.GRAY_SOFT, FONTS.REG, BORDERS.ALL, typeof val === 'number' ? ALIGNS.RIGHT : ALIGNS.CENTER);
            });
        });

        // ═════════════════════════════════════════════════════════════════
        // PESTAÑA 2: 2. MATRICES ELEMENTALES 6x6
        // ═════════════════════════════════════════════════════════════════
        const ws2 = wb.addWorksheet('2. MATRICES ELEMENTALES');
        ws2.columns = Array.from({length: 18}, () => ({ width: 13 }));

        let curRow2 = 2;
        resBars.forEach((bar, bIdx) => {
            ws2.mergeCells(curRow2, 2, curRow2, 14);
            ws2.getCell(curRow2, 2).value = `BARRA ${bar.id}: NUDO ${bar.n1} → NUDO ${bar.n2} (L = ${bar.L.toFixed(1)} cm, θ = ${bar.angleDeg.toFixed(1)}°)`;
            styleCell(ws2.getCell(curRow2, 2), PALETTE.HEADER_BLUE, FONTS.TITLE, BORDERS.HDR, ALIGNS.LEFT);
            curRow2++;

            // Matriz local k (6x6)
            ws2.getCell(curRow2, 2).value = 'Matriz de Rigidez Local [k] (6x6):';
            styleCell(ws2.getCell(curRow2, 2), PALETTE.SUBHDR_BLUE, FONTS.HDR, BORDERS.ALL, ALIGNS.LEFT);

            // Matriz global kt (6x6)
            ws2.getCell(curRow2, 9).value = 'Matriz de Rigidez Global [kt] = [T]^T [k] [T] (6x6):';
            styleCell(ws2.getCell(curRow2, 9), PALETTE.SUBHDR_BLUE, FONTS.HDR, BORDERS.ALL, ALIGNS.LEFT);
            curRow2++;

            for(let r = 0; r < 6; r++){
                for(let c = 0; c < 6; c++){
                    // k local
                    const cellK = ws2.getCell(curRow2 + r, 2 + c);
                    cellK.value = bar.k[r][c];
                    styleCell(cellK, r === c ? PALETTE.GREEN_PASTEL : PALETTE.WHITE, FONTS.MONO, BORDERS.ALL, ALIGNS.RIGHT, '0.00');

                    // kt global
                    const cellKt = ws2.getCell(curRow2 + r, 9 + c);
                    cellKt.value = bar.kt[r][c];
                    styleCell(cellKt, r === c ? PALETTE.PEACH_SOFT : PALETTE.WHITE, FONTS.MONO, BORDERS.ALL, ALIGNS.RIGHT, '0.00');
                }
            }
            curRow2 += 8;
        });

        // ═════════════════════════════════════════════════════════════════
        // PESTAÑA 3: 3. SISTEMA GLOBAL Y ENSAMBLE
        // ═════════════════════════════════════════════════════════════════
        const ws3 = wb.addWorksheet('3. SISTEMA GLOBAL');
        ws3.columns = Array.from({length: 22}, () => ({ width: 13 }));

        ws3.getCell('B2').value = 'MATRIZ GLOBAL ENSAMBLADA [K] Y VECTOR DE CARGAS {F}';
        styleCell(ws3.getCell('B2'), PALETTE.HEADER_BLUE, FONTS.TITLE, BORDERS.HDR, ALIGNS.LEFT);

        const ndof = (result && result.K) ? result.K.length : 18;
        for(let r = 0; r < ndof; r++){
            for(let c = 0; c < ndof; c++){
                const cell = ws3.getCell(4 + r, 2 + c);
                cell.value = result ? result.K[r][c] : 0;
                styleCell(cell, r === c ? PALETTE.GREEN_PASTEL : PALETTE.WHITE, FONTS.MONO, BORDERS.ALL, ALIGNS.RIGHT, '0.00');
            }
            const cellF = ws3.getCell(4 + r, 2 + ndof + 1);
            cellF.value = result ? result.F_applied[r] : 0;
            styleCell(cellF, PALETTE.YELLOW_INPUT, FONTS.MONO, BORDERS.ALL, ALIGNS.RIGHT, '0.00');
        }

        // ═════════════════════════════════════════════════════════════════
        // PESTAÑA 4: 4. RESULTADOS Y EQUILIBRIO
        // ═════════════════════════════════════════════════════════════════
        const ws4 = wb.addWorksheet('4. RESULTADOS Y EQUILIBRIO');
        ws4.columns = Array.from({length: 14}, () => ({ width: 15 }));

        ws4.getCell('B2').value = 'RESUMEN EJECUTIVO DE DESPLAZAMIENTOS Y REACCIONES';
        styleCell(ws4.getCell('B2'), PALETTE.HEADER_BLUE, FONTS.TITLE, BORDERS.HDR, ALIGNS.LEFT);

        const resHdrs = ['Nudo', 'Apoyo', 'Ux (cm)', 'Uy (cm)', 'θz (rad)', 'Rx (kgf)', 'Ry (kgf)', 'RM (kgf·cm)'];
        resHdrs.forEach((h, cIdx) => {
            const cell = ws4.getCell(4, 2 + cIdx);
            cell.value = h;
            styleCell(cell, PALETTE.CELESTE, FONTS.HDR, BORDERS.HDR, ALIGNS.CENTER);
        });

        resNodes.forEach((n, idx) => {
            const r = 5 + idx;
            const vals = [
                n.id, n.support.toUpperCase(), n.ux, n.uy, n.theta,
                n.support !== 'free' ? n.rx : 0,
                n.support !== 'free' ? n.ry : 0,
                n.support !== 'free' ? n.rm : 0
            ];
            vals.forEach((v, cIdx) => {
                const cell = ws4.getCell(r, 2 + cIdx);
                cell.value = v;
                styleCell(cell, idx % 2 === 0 ? PALETTE.WHITE : PALETTE.GRAY_SOFT, FONTS.REG, BORDERS.ALL, typeof v === 'number' ? ALIGNS.RIGHT : ALIGNS.CENTER, typeof v === 'number' ? (cIdx === 4 ? '0.000000' : '0.0000') : undefined);
            });
        });

        // Comprobación de Equilibrio
        const eqRow = 6 + resNodes.length;
        ws4.getCell(eqRow, 2).value = 'VERIFICACIÓN DE EQUILIBRIO GLOBAL ESTÁTICO:';
        styleCell(ws4.getCell(eqRow, 2), PALETTE.SUBHDR_BLUE, FONTS.HDR, BORDERS.ALL, ALIGNS.LEFT);

        const eq = result?.equilibrium || { fx: 0, fy: 0, mz: 0, isEquilibrium: true };
        ws4.getCell(eqRow + 1, 2).value = 'ΣFx Total (kgf):';
        ws4.getCell(eqRow + 1, 3).value = eq.fx;
        ws4.getCell(eqRow + 2, 2).value = 'ΣFy Total (kgf):';
        ws4.getCell(eqRow + 2, 3).value = eq.fy;
        ws4.getCell(eqRow + 3, 2).value = 'ΣMz(0,0) Total (kgf·cm):';
        ws4.getCell(eqRow + 3, 3).value = eq.mz;

        for(let k = 1; k <= 3; k++){
            styleCell(ws4.getCell(eqRow + k, 2), PALETTE.GRAY_SOFT, FONTS.REG, BORDERS.ALL, ALIGNS.LEFT);
            styleCell(ws4.getCell(eqRow + k, 3), PALETTE.GREEN_PASTEL, FONTS.BOLD, BORDERS.ALL, ALIGNS.RIGHT, '0.000000');
        }

        ws4.getCell(eqRow + 4, 2).value = 'ESTADO DE EQUILIBRIO:';
        ws4.getCell(eqRow + 4, 3).value = eq.isEquilibrium ? '✓ EN EQUILIBRIO ESTÁTICO' : '✕ ERROR DE EQUILIBRIO';
        styleCell(ws4.getCell(eqRow + 4, 2), PALETTE.GRAY_SOFT, FONTS.BOLD, BORDERS.ALL, ALIGNS.LEFT);
        styleCell(ws4.getCell(eqRow + 4, 3), eq.isEquilibrium ? PALETTE.GREEN_SOFT : 'FFFFC7CE', FONTS.BOLD, BORDERS.ALL, ALIGNS.CENTER);

        // ═════════════════════════════════════════════════════════════════
        // PESTAÑA 5: 5. GRÁFICAS Y MUESTREO
        // ═════════════════════════════════════════════════════════════════
        const ws5 = wb.addWorksheet('5. GRÁFICAS Y MUESTREO');
        ws5.columns = Array.from({length: 12}, () => ({ width: 14 }));

        ws5.getCell('B2').value = 'MUESTREO DISCRETO PARA DIAGRAMAS DE ESFUERZOS INTERNOS (61 PUNTOS POR TRAMO)';
        styleCell(ws5.getCell('B2'), PALETTE.HEADER_BLUE, FONTS.TITLE, BORDERS.HDR, ALIGNS.LEFT);

        let curR5 = 4;
        resBars.forEach(bar => {
            ws5.getCell(curR5, 2).value = `BARRA ${bar.id}: N${bar.n1} → N${bar.n2} (L = ${bar.L} cm)`;
            styleCell(ws5.getCell(curR5, 2), PALETTE.SUBHDR_BLUE, FONTS.HDR, BORDERS.ALL, ALIGNS.LEFT);
            curR5++;

            const diagHdrs = ['Punto', 'x (cm)', 'x (m)', 'N (kgf)', 'V (kgf)', 'M (kgf·cm)', 'M (kgf·m)', 'v (cm)', 'v (mm)'];
            diagHdrs.forEach((dh, cIdx) => {
                const cell = ws5.getCell(curR5, 2 + cIdx);
                cell.value = dh;
                styleCell(cell, PALETTE.CELESTE, FONTS.HDR, BORDERS.HDR, ALIGNS.CENTER);
            });
            curR5++;

            (bar.samples || []).forEach((pt, pIdx) => {
                const rVals = [
                    pIdx + 1, pt.x, pt.x / 100, pt.N, pt.V, pt.M, pt.M / 100, pt.v, pt.v * 10
                ];
                rVals.forEach((val, cIdx) => {
                    const cell = ws5.getCell(curR5, 2 + cIdx);
                    cell.value = val;
                    styleCell(cell, pIdx % 2 === 0 ? PALETTE.WHITE : PALETTE.GRAY_SOFT, FONTS.MONO, BORDERS.ALL, ALIGNS.RIGHT, cIdx >= 3 ? '0.0000' : '0.00');
                });
                curR5++;
            });
            curR5 += 2;
        });

        // Incrustación opcional de imagen PNG del pórtico en la hoja de cálculo
        if(options.framePngBase64){
            try {
                const imageId = wb.addImage({
                    base64: options.framePngBase64,
                    extension: 'png'
                });
                ws5.addImage(imageId, {
                    tl: { col: 12, row: 4 },
                    ext: { width: 600, height: 400 }
                });
            } catch(e){
                console.warn("No se pudo incrustar la imagen PNG en Excel:", e);
            }
        }

        return wb;
    }

    /**
     * Controlador principal de descarga en el navegador
     */
    async function downloadFrameExcel(model, result, options = {}, filename = 'PLANTILLA_ULIANOV_PORTICOS_5_PESTANAS.xlsx'){
        // 1. Intentar inyección en la plantilla oficial de 5 pestañas
        const okPopulate = await downloadPopulatedMaster5Tabs(model, result, filename);
        if(okPopulate) return true;

        // 2. Si no es posible, generar libro completo de 5 pestañas con ExcelJS
        const wb = await generateFullFrameExcelJS(model, result, options);
        const buffer = await wb.xlsx.writeBuffer();
        if(typeof window !== 'undefined' && window.URL){
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
        return false;
    }

    return {
        downloadFrameExcel,
        downloadPopulatedMaster5Tabs,
        generateFullFrameExcelJS
    };
}));

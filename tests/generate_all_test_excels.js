/**
 * generate_all_test_excels.js
 * Genera archivos .xlsx reales desde los tres generadores ExcelJS
 * para auditoría profunda con openpyxl / pandas.
 */

const fs = require('fs');
const path = require('path');
const ExcelGenerator = require('../excel-generator.js');
const BeamExcel = require('../beam-excel-generator.js');
const FrameExcel = require('../frame-excel-generator.js');
const FrameSolver = require('../frame-solver.js');

const OUT_DIR = path.resolve(__dirname, '../test_outputs/excel_audit');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function generateAllExcels() {
    console.log("=== GENERANDO ARCHIVOS EXCEL PARA AUDITORÍA PROFUNDA ===");

    // 1. Armaduras Excel
    const nodesTruss = [
        { id: 1, x: 0, y: 0, rX: true, rY: true, pX: 0, pY: 0 },
        { id: 2, x: 300, y: 0, rX: false, rY: true, pX: 0, pY: -2000 },
        { id: 3, x: 150, y: 200, rX: false, rY: false, pX: 1000, pY: 0 }
    ];
    const barsTruss = [
        { id: 1, nI: 1, nF: 2, A: 25.0, E: 2100000.0 },
        { id: 2, nI: 1, nF: 3, A: 25.0, E: 2100000.0 },
        { id: 3, nI: 3, nF: 2, A: 25.0, E: 2100000.0 }
    ];
    const wbTruss = await ExcelGenerator.generateTrussWorkbook(nodesTruss, barsTruss, true);
    const pathTruss = path.join(OUT_DIR, '01_AUDIT_ARMADURAS.xlsx');
    const bufTruss = await wbTruss.xlsx.writeBuffer();
    fs.writeFileSync(pathTruss, Buffer.from(bufTruss));
    console.log(`[EXCEL 1/3] Armaduras generado: ${pathTruss} (${fs.statSync(pathTruss).size} bytes)`);

    // 2. Vigas Excel
    const beamCfg = {
        spans: [
            { L: 4.0, b: 30, h: 50, q: 1500, p: 0, a: 0, support: 'pin' },
            { L: 5.0, b: 30, h: 50, q: 2000, p: 1000, a: 2.5, support: 'roller' },
            { L: 3.0, b: 30, h: 50, q: 0, p: 0, a: 0, support: 'roller' }
        ],
        E: 21700000,
        unidades: { fuerza: 'kgf', longitud: 'm' }
    };
    const wbBeam = await BeamExcel.generateBeamWorkbook(beamCfg);
    const pathBeam = path.join(OUT_DIR, '02_AUDIT_VIGAS.xlsx');
    const bufBeam = await wbBeam.xlsx.writeBuffer();
    fs.writeFileSync(pathBeam, Buffer.from(bufBeam));
    console.log(`[EXCEL 2/3] Vigas generado: ${pathBeam} (${fs.statSync(pathBeam).size} bytes)`);

    // 3. Pórticos Excel
    const frameModel = {
        E: 2100000.0,
        section: { shape: 'rect', b: 25.0, h: 50.0 },
        nodes: [
            { id: 1, x: 0.0, y: 0.0, support: 'fixed' },
            { id: 2, x: 0.0, y: 350.0, support: 'free' },
            { id: 3, x: 500.0, y: 350.0, support: 'free', fy: -4500.0 },
            { id: 4, x: 500.0, y: 0.0, support: 'fixed' }
        ],
        bars: [
            { from: 1, to: 2, q0: 12.0, q1: 12.0, dir: 'globalX' },
            { from: 2, to: 3, q0: 15.0, q1: 15.0, dir: 'localY' },
            { from: 3, to: 4 }
        ]
    };
    const frameRes = FrameSolver.compute(frameModel);
    const wbFrame = await FrameExcel.buildMasterFrameWorkbook(frameModel, frameRes);
    const pathFrame = path.join(OUT_DIR, '03_AUDIT_PORTICOS.xlsx');
    const bufFrame = await wbFrame.xlsx.writeBuffer();
    fs.writeFileSync(pathFrame, Buffer.from(bufFrame));
    console.log(`[EXCEL 3/3] Pórticos generado: ${pathFrame} (${fs.statSync(pathFrame).size} bytes)`);

    console.log("=== TODOS LOS ARCHIVOS EXCEL GENERADOS CON ÉXITO ===");
}

if (require.main === module) {
    generateAllExcels();
}

module.exports = { generateAllExcels };

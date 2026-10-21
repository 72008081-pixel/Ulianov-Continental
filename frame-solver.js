/* CEREBRO ESTRUCTURAL — PÓRTICOS 2D v3.5 (Plantilla Ulianov)
   Motor Matemático Matricial de Rigidez Directa para Pórticos Planos
   Elementos Euler-Bernoulli de 6 Grados de Libertad (Ux, Uy, θz)
   Unidades del sistema interno: cm, kgf, kgf·cm, kgf/cm, kgf/cm²
   Cátedra: Análisis Estructural II — Ing. Ulianov Cuba Valencia
*/
(function(root, factory){
  if(typeof module === 'object' && module.exports){
    module.exports = factory();
  } else {
    root.FrameSolver = factory();
  }
}(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  const EPS = 1e-11;

  function zeros(n, m){
    return Array.from({length: n}, () => Array(m).fill(0));
  }

  function mul(A, B){
    const rA = A.length, cA = A[0].length, cB = B[0].length;
    const C = zeros(rA, cB);
    for(let i = 0; i < rA; i++){
      for(let k = 0; k < cA; k++){
        const aik = A[i][k];
        if(aik !== 0){
          for(let j = 0; j < cB; j++){
            C[i][j] += aik * B[k][j];
          }
        }
      }
    }
    return C;
  }

  function mv(A, v){
    return A.map(row => row.reduce((sum, a, i) => sum + a * v[i], 0));
  }

  function tr(A){
    return A[0].map((_, j) => A.map(row => row[j]));
  }

  function invertMatrix(M){
    const n = M.length;
    const A = M.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
    for(let i = 0; i < n; i++){
      let maxRow = i;
      for(let k = i + 1; k < n; k++){
        if(Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
      }
      if(Math.abs(A[maxRow][i]) < 1e-15){
        throw new Error("Matriz singular no invertible en inversión de Gauss-Jordan");
      }
      if(maxRow !== i){
        const tmp = A[i];
        A[i] = A[maxRow];
        A[maxRow] = tmp;
      }
      const pivot = A[i][i];
      for(let j = 0; j < 2 * n; j++) A[i][j] /= pivot;
      for(let k = 0; k < n; k++){
        if(k !== i){
          const factor = A[k][i];
          if(factor !== 0){
            for(let j = 0; j < 2 * n; j++) A[k][j] -= factor * A[i][j];
          }
        }
      }
    }
    return A.map(row => row.slice(n));
  }

  function solveLinearSystem(A, b){
    const n = b.length;
    const M = A.map((r, i) => r.slice().concat(b[i]));
    let maxA = 0;
    for(let i = 0; i < n; i++){
      for(let j = 0; j < n; j++){
        const val = Math.abs(A[i][j]);
        if(val > maxA) maxA = val;
      }
    }
    const scale = Math.max(1, maxA);

    for(let k = 0; k < n; k++){
      let p = k;
      let maxVal = Math.abs(M[k][k]);
      for(let i = k + 1; i < n; i++){
        const cur = Math.abs(M[i][k]);
        if(cur > maxVal){
          maxVal = cur;
          p = i;
        }
      }
      if(maxVal < EPS * scale){
        throw new Error("Estructura inestable o mecanismo cinemático detectado en GDL " + (k + 1) + ". Verifique apoyos y barras.");
      }
      if(p !== k){
        const tmp = M[k];
        M[k] = M[p];
        M[p] = tmp;
      }
      for(let i = k + 1; i < n; i++){
        const z = M[i][k] / M[k][k];
        M[i][k] = 0;
        for(let j = k + 1; j <= n; j++){
          M[i][j] -= z * M[k][j];
        }
      }
    }

    const x = Array(n).fill(0);
    for(let i = n - 1; i >= 0; i--){
      let v = M[i][n];
      for(let j = i + 1; j < n; j++){
        v -= M[i][j] * x[j];
      }
      x[i] = v / M[i][i];
    }
    return x;
  }

  function computeSteinerTable(steinerRows) {
    const rowsOut = [];
    let sumA = 0;
    let sumAy = 0;

    for (let i = 0; i < 7; i++) {
      const r = (steinerRows && steinerRows[i]) ? steinerRows[i] : { tipo: 'NINGUNO', b: 0, b_sup: 0, h: 0, y_base: 0, x_c: 0 };
      const tipo = String(r.tipo || 'NINGUNO').toUpperCase().trim();
      const b = parseFloat(r.b) || 0;
      const b_sup = parseFloat(r.b_sup) || 0;
      const h = parseFloat(r.h) || 0;
      const y_base = parseFloat(r.y_base) || 0;
      const x_c = parseFloat(r.x_c) || 0;

      if (tipo === 'NINGUNO' || tipo === '' || (b <= 0 && h <= 0)) {
        rowsOut.push({
          idx: i + 1, tipo: 'NINGUNO', b: 0, b_sup: 0, h: 0, y_base: 0, x_c: 0,
          active: false, A: 0, y_i: 0, Ay: 0, I0: 0, Ad2: 0, Itot: 0
        });
        continue;
      }

      let A = 0;
      let dy_local = 0;
      let I0 = 0;

      if (tipo === 'RECTANGULO') {
        A = b * h;
        dy_local = h / 2.0;
        I0 = (b * Math.pow(h, 3)) / 12.0;
      } else if (tipo === 'TRIANGULO') {
        A = (b * h) / 2.0;
        dy_local = h / 3.0;
        I0 = (b * Math.pow(h, 3)) / 36.0;
      } else if (tipo === 'TRAPECIO') {
        A = ((b + b_sup) / 2.0) * h;
        dy_local = (b + b_sup) > 0 ? (h * (b + 2.0 * b_sup)) / (3.0 * (b + b_sup)) : 0;
        I0 = (b + b_sup) > 0 ? (Math.pow(h, 3) * (b * b + 4.0 * b * b_sup + b_sup * b_sup)) / (36.0 * (b + b_sup)) : 0;
      } else if (tipo === 'CIRCULO') {
        A = (Math.PI * b * b) / 4.0;
        dy_local = b / 2.0;
        I0 = (Math.PI * Math.pow(b, 4)) / 64.0;
      } else if (tipo === 'SEMICIRCULO') {
        const rad = b / 2.0;
        A = (Math.PI * rad * rad) / 2.0;
        dy_local = (4.0 * rad) / (3.0 * Math.PI);
        I0 = ((Math.PI / 8.0) - (8.0 / (9.0 * Math.PI))) * Math.pow(rad, 4);
      } else if (tipo === 'HUECO_RECT') {
        A = -(b * h);
        dy_local = h / 2.0;
        I0 = -(b * Math.pow(h, 3)) / 12.0;
      } else if (tipo === 'HUECO_CIRC') {
        A = -(Math.PI * b * b) / 4.0;
        dy_local = b / 2.0;
        I0 = -(Math.PI * Math.pow(b, 4)) / 64.0;
      }

      const y_i = y_base + dy_local;
      const Ay = A * y_i;
      sumA += A;
      sumAy += Ay;

      rowsOut.push({
        idx: i + 1, tipo, b, b_sup, h, y_base, x_c,
        active: true, A, y_i, Ay, I0, Ad2: 0, Itot: 0
      });
    }

    const Y_CG = Math.abs(sumA) > 1e-12 ? (sumAy / sumA) : 0;
    let sumI0 = 0;
    let sumAd2 = 0;
    let sumItot = 0;

    for (const row of rowsOut) {
      if (row.active) {
        row.Ad2 = row.A * Math.pow(row.y_i - Y_CG, 2);
        row.Itot = row.I0 + row.Ad2;
        sumI0 += row.I0;
        sumAd2 += row.Ad2;
        sumItot += row.Itot;
      }
    }

    return {
      rows: rowsOut,
      A_total: sumA,
      Y_CG: Y_CG,
      Ay_total: sumAy,
      I0_total: sumI0,
      Ad2_total: sumAd2,
      I_total: sumItot
    };
  }

  function properties(p){
    if(!p) p = { shape: 'rect', b: 5, h: 5 };
    const secType = String(p.sec_type || p.shape || 'rect').toUpperCase().trim();
    let A = 0, I = 0, ycg = 0;
    let details = {};
    let steinerResult = null;

    if(secType === 'RECT' || secType === 'RECTANGULAR'){
      const b = Number(p.b || 5), h = Number(p.h || 5);
      if(!(b > 0 && h > 0)) throw new Error("Base b y altura h deben ser mayores a cero");
      A = b * h;
      I = (b * Math.pow(h, 3)) / 12;
      ycg = h / 2;
      details = {
        shape: 'rect', sec_type: 'RECTANGULAR', b, h, A, I, ycg,
        formulaA: 'b \cdot h',
        formulaI: '\frac{b \cdot h^3}{12}',
        subsA: `${b} \cdot ${h} = ${A.toFixed(2)}\text{ cm}^2`,
        subsI: `\frac{${b} \cdot ${h}^3}{12} = ${I.toFixed(4)}\text{ cm}^4`
      };
    } else if(secType === 'CIRCLE' || secType === 'CIRCULAR'){
      const d = Number(p.d || p.b || 20);
      if(!(d > 0)) throw new Error("Diámetro d debe ser mayor a cero");
      A = Math.PI * d * d / 4;
      I = Math.PI * Math.pow(d, 4) / 64;
      ycg = d / 2;
      details = {
        shape: 'circle', sec_type: 'CIRCULAR', d, b: d, h: d, A, I, ycg,
        formulaA: '\frac{\pi d^2}{4}',
        formulaI: '\frac{\pi d^4}{64}',
        subsA: `\frac{\pi (${d})^2}{4} = ${A.toFixed(2)}\text{ cm}^2`,
        subsI: `\frac{\pi (${d})^4}{64} = ${I.toFixed(4)}\text{ cm}^4`
      };
    } else if(secType === 'TUBULAR_CIRCULAR'){
      const D = Number(p.b || 20), d = Number(p.h || 16);
      if(!(D > d && d > 0)) throw new Error("Diámetro exterior debe ser mayor al interior");
      A = Math.PI * (D * D - d * d) / 4;
      I = Math.PI * (Math.pow(D, 4) - Math.pow(d, 4)) / 64;
      ycg = D / 2;
      details = {
        shape: 'tubular_circular', sec_type: 'TUBULAR_CIRCULAR', D, d, b: D, h: d, A, I, ycg
      };
    } else if(secType === 'T' || secType === 'T_SECTION' || secType === 'SECCION_T'){
      let bf = Number(p.bf), tf = Number(p.tf), tw = Number(p.tw), hw = Number(p.hw);
      if(!(bf > 0 && tf > 0 && tw > 0 && hw > 0)){
        tw = Number(p.b || 10);
        hw = Number(p.h || 40);
        bf = Number(p.p3 || 30);
        tf = Number(p.p4 || 8);
      }
      if(!(bf > 0 && tf > 0 && tw > 0 && hw > 0)){
        throw new Error("Dimensiones de la sección T inválidas");
      }
      const a1 = bf * tf;
      const a2 = tw * hw;
      const y1 = hw + tf / 2;
      const y2 = hw / 2;
      A = a1 + a2;
      ycg = (a1 * y1 + a2 * y2) / A;
      const d1 = y1 - ycg;
      const d2 = y2 - ycg;
      const I1_0 = (bf * Math.pow(tf, 3)) / 12;
      const I2_0 = (tw * Math.pow(hw, 3)) / 12;
      const st1 = a1 * d1 * d1;
      const st2 = a2 * d2 * d2;
      I = I1_0 + st1 + I2_0 + st2;
      details = {
        shape: 'T', sec_type: 'T_SECTION', bf, tf, tw, hw, b: tw, h: hw, p3: bf, p4: tf, a1, a2, y1, y2, A, ycg, d1, d2, I1_0, I2_0, st1, st2, I,
        formulaYcg: 'y_{cg} = \frac{A_1 y_1 + A_2 y_2}{A_1 + A_2}',
        formulaSteiner: 'I = \sum (I_{0i} + A_i d_i^2)',
        subsYcg: `\frac{(${a1.toFixed(1)})(${y1.toFixed(1)}) + (${a2.toFixed(1)})(${y2.toFixed(1)})}{${A.toFixed(1)}} = ${ycg.toFixed(3)}\text{ cm}`,
        subsSteiner: `(${I1_0.toFixed(2)} + ${st1.toFixed(2)}) + (${I2_0.toFixed(2)} + ${st2.toFixed(2)}) = ${I.toFixed(4)}\text{ cm}^4`
      };
    } else if(secType === 'I_SECTION' || secType === 'DOBLE_T'){
      const b_ala = Number(p.b || 30);
      const H_tot = Number(p.h || 50);
      const t_ala = Number(p.p3 || 10);
      const t_alma = Number(p.p4 || 8);
      const h_web = Math.max(0.1, H_tot - 2 * t_ala);
      const a_flange = b_ala * t_ala;
      const a_web = t_alma * h_web;
      A = 2 * a_flange + a_web;
      ycg = H_tot / 2;
      const d_flange = H_tot / 2 - t_ala / 2;
      const I0_flange = (b_ala * Math.pow(t_ala, 3)) / 12;
      const I0_web = (t_alma * Math.pow(h_web, 3)) / 12;
      I = 2 * (I0_flange + a_flange * d_flange * d_flange) + I0_web;
      details = {
        shape: 'I', sec_type: 'I_SECTION', b: b_ala, h: H_tot, p3: t_ala, p4: t_alma, A, I, ycg
      };
    } else if(secType === 'CAJON_HUECO' || secType === 'BOX' || secType === 'TUBULAR'){
      const B_ext = Number(p.b || 25);
      const H_ext = Number(p.h || 45);
      const b_int = Number(p.p3 || 15);
      const h_int = Number(p.p4 || 35);
      A = (B_ext * H_ext) - (b_int * h_int);
      I = ((B_ext * Math.pow(H_ext, 3)) - (b_int * Math.pow(h_int, 3))) / 12;
      ycg = H_ext / 2;
      details = {
        shape: 'cajon_hueco', sec_type: 'CAJON_HUECO', b: B_ext, h: H_ext, p3: b_int, p4: h_int, A, I, ycg
      };
    } else if(secType === 'STEINER_COMPUESTA' || secType === 'STEINER_CUSTOM'){
      steinerResult = computeSteinerTable(p.steiner_rows || (p.steiner && p.steiner.rows) || []);
      A = steinerResult.A_total > 0 ? steinerResult.A_total : (Number(p.b || 20) * Number(p.h || 50));
      ycg = steinerResult.Y_CG > 0 ? steinerResult.Y_CG : (Number(p.h || 50) / 2);
      I = steinerResult.I_total > 0 ? steinerResult.I_total : ((Number(p.b || 20) * Math.pow(Number(p.h || 50), 3)) / 12);
      details = {
        shape: 'steiner_compuesta', sec_type: 'STEINER_COMPUESTA', b: Number(p.b || 20), h: Number(p.h || 50), A, I, ycg, steiner: steinerResult
      };
    } else if(secType === 'DIRECTO_A_I'){
      A = Number(p.b || 25);
      I = Number(p.h || 52.0833);
      ycg = 0;
      details = { shape: 'directo_a_i', sec_type: 'DIRECTO_A_I', b: A, h: I, A, I, ycg };
    } else {
      const b = Number(p.b || 5), h = Number(p.h || 5);
      A = b * h;
      I = (b * Math.pow(h, 3)) / 12;
      ycg = h / 2;
      details = { shape: 'rect', sec_type: 'RECTANGULAR', b, h, A, I, ycg };
    }

    return {
      A,
      I,
      Iz: I,
      ycg,
      Y_CG: ycg,
      b: Number(p.b || 5),
      h: Number(p.h || 5),
      p3: Number(p.p3 || 0),
      p4: Number(p.p4 || 0),
      sec_type: secType,
      shape: p.shape || secType.toLowerCase(),
      steiner: steinerResult,
      details
    };
  }

  function element(n1, n2, E, A, I, id, q0, q1, dir){
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const L = Math.hypot(dx, dy);
    if(!(L > 0 && E > 0 && A > 0 && I > 0)){
      throw new Error(`Geometría o propiedades inválidas en barra ${id}: L=${L}, E=${E}, A=${A}, I=${I}`);
    }
    const c = dx / L;
    const s = dy / L;

    const a = (E * A) / L;
    const b = (12 * E * I) / Math.pow(L, 3);
    const d = (6 * E * I) / Math.pow(L, 2);
    const e = (4 * E * I) / L;
    const f = (2 * E * I) / L;

    // Matriz de rigidez local 6x6
    const k = [
      [ a,  0,  0, -a,  0,  0],
      [ 0,  b,  d,  0, -b,  d],
      [ 0,  d,  e,  0, -d,  f],
      [-a,  0,  0,  a,  0,  0],
      [ 0, -b, -d,  0,  b, -d],
      [ 0,  d,  f,  0, -d,  e]
    ];

    // Matriz de transformación T 6x6
    const T = [
      [ c,  s,  0,  0,  0,  0],
      [-s,  c,  0,  0,  0,  0],
      [ 0,  0,  1,  0,  0,  0],
      [ 0,  0,  0,  c,  s,  0],
      [ 0,  0,  0, -s,  c,  0],
      [ 0,  0,  0,  0,  0,  1]
    ];

    const kt = mul(tr(T), mul(k, T));

    // Descomposición de cargas distribuidas a ejes locales (a0, a1 axial; t0, t1 transversal perpendicular)
    let a0 = 0, a1 = 0, t0 = 0, t1 = 0;
    const direction = dir || 'globalDown';

    if(direction === 'globalDown' || direction === 'globalY_down'){
      // Carga gravitacional vertical hacia abajo (-Y)
      // wY = -q
      a0 = -s * q0;
      a1 = -s * q1;
      t0 = -c * q0;
      t1 = -c * q1;
    } else if(direction === 'globalUp' || direction === 'globalY_up'){
      // Carga vertical hacia arriba (+Y)
      a0 = s * q0;
      a1 = s * q1;
      t0 = c * q0;
      t1 = c * q1;
    } else if(direction === 'globalX' || direction === 'globalX_right'){
      // Carga horizontal hacia la derecha (+X)
      // wX = +q.
      // Proyección: x_local = c*X + s*Y -> a = c * q
      // y_local = -s*X + c*Y -> t = -s * q
      a0 = c * q0;
      a1 = c * q1;
      t0 = -s * q0;
      t1 = -s * q1;
    } else if(direction === 'globalX_left'){
      // Carga horizontal hacia la izquierda (-X)
      a0 = -c * q0;
      a1 = -c * q1;
      t0 = s * q0;
      t1 = s * q1;
    } else if(direction === 'localY'){
      // Carga en eje local y' perpendicular a la barra
      t0 = q0;
      t1 = q1;
    } else if(direction === 'localX'){
      // Carga en eje local x' axial a la barra
      a0 = q0;
      a1 = q1;
    } else {
      throw new Error(`Dirección de carga desconocida: ${direction} en barra ${id}`);
    }

    // Fuerzas fijas de extremo locales (f_fem_loc) bajo carga trapezoidal
    // Nota de convención: F_fem_loc representa la acción fija nodal reactiva necesaria para sujetar el elemento
    // Su negativo es la carga nodal equivalente transferida al sistema global.
    const F_fem_loc = [
      (L * (2 * a0 + a1)) / 6,
      (L * (7 * t0 + 3 * t1)) / 20,
      (L * L * (3 * t0 + 2 * t1)) / 60,
      (L * (a0 + 2 * a1)) / 6,
      (L * (3 * t0 + 7 * t1)) / 20,
      -(L * L * (2 * t0 + 3 * t1)) / 60
    ];

    // Cargas nodales equivalentes globales para ensamblaje en vector F:
    // F_eq_glob = T^T * F_fem_loc
    const fg = mv(tr(T), F_fem_loc);

    return {
      id,
      n1: n1.id,
      n2: n2.id,
      L,
      c,
      s,
      angleDeg: (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360,
      E,
      A,
      I,
      k,
      T,
      kt,
      F_fem_loc,
      fg,
      a0, a1, t0, t1,
      dir: direction,
      q0, q1
    };
  }

  function compute(model){
    const nodes = (model.nodes || []).map(n => ({
      id: Number(n.id),
      x: Number(n.x),
      y: Number(n.y),
      support: n.support || 'free',
      fx: Number(n.fx || 0),
      fy: Number(n.fy || 0),
      mz: Number(n.mz || 0)
    }));
    const rawBars = model.bars || [];

    if(nodes.length < 2 || nodes.length > 24) throw new Error("El modelo debe tener entre 2 y 24 nudos");
    if(rawBars.length < 1 || rawBars.length > 36) throw new Error("El modelo debe tener entre 1 y 36 barras");
    if(new Set(nodes.map(n => n.id)).size !== nodes.length) throw new Error("Existen IDs de nudos duplicados");

    nodes.forEach(n => {
      if(![n.x, n.y, n.fx, n.fy, n.mz].every(Number.isFinite)){
        throw new Error(`Coordenadas o cargas no numéricas en nudo ${n.id}`);
      }
    });

    const defaultProp = properties(model.section || {shape: 'rect', b: 25, h: 50});
    const E0 = Number(model.E) || 2100000;
    if(!(E0 > 0)) throw new Error("El módulo de elasticidad E debe ser positivo");

    const byId = new Map(nodes.map((n, i) => [n.id, {...n, idx: i}]));
    const ndof = nodes.length * 3;
    const K = zeros(ndof, ndof);
    const F_applied = Array(ndof).fill(0);
    const elements = [];

    // Cargas nodales directas
    nodes.forEach((n, i) => {
      F_applied[3 * i] += n.fx;
      F_applied[3 * i + 1] += n.fy;
      F_applied[3 * i + 2] += n.mz;
    });

    // Ensamblaje de barras
    rawBars.forEach((raw, i) => {
      const fromNode = byId.get(Number(raw.from));
      const toNode = byId.get(Number(raw.to));
      if(!fromNode || !toNode || fromNode.id === toNode.id){
        throw new Error(`Conectividad inválida en barra ${i + 1}`);
      }
      const E_bar = Number(raw.E) || E0;
      const A_bar = Number(raw.A) || defaultProp.A;
      const I_bar = Number(raw.I) || defaultProp.I;
      const q0 = Number(raw.q0 || 0);
      const q1 = Number(raw.q1 !== undefined && raw.q1 !== null && raw.q1 !== '' ? raw.q1 : q0);

      const el = element(fromNode, toNode, E_bar, A_bar, I_bar, i + 1, q0, q1, raw.dir || 'globalDown');
      el.dof = [
        3 * fromNode.idx,     3 * fromNode.idx + 1, 3 * fromNode.idx + 2,
        3 * toNode.idx,       3 * toNode.idx + 1,   3 * toNode.idx + 2
      ];

      for(let a = 0; a < 6; a++){
        F_applied[el.dof[a]] += el.fg[a];
        for(let b = 0; b < 6; b++){
          K[el.dof[a]][el.dof[b]] += el.kt[a][b];
        }
      }
      elements.push(el);
    });

    // Condiciones de borde
    const restrained = [];
    const free = [];

    nodes.forEach((n, i) => {
      let fix = [false, false, false];
      switch(n.support){
        case 'fixed':    fix = [true, true, true]; break;
        case 'pin':      fix = [true, true, false]; break;
        case 'rollerY':  fix = [false, true, false]; break;  // Restringe Y, libre en X y giro
        case 'rollerX':  fix = [true, false, false]; break;  // Restringe X, libre en Y y giro
        case 'free':     fix = [false, false, false]; break;
        default:         throw new Error(`Apoyo desconocido "${n.support}" en nudo ${n.id}`);
      }
      fix.forEach((isFixed, j) => {
        const dofIdx = 3 * i + j;
        if(isFixed) restrained.push(dofIdx);
        else free.push(dofIdx);
      });
    });

    if(restrained.length === 0){
      throw new Error("La estructura no tiene apoyos restringidos (es cinemáticamente inestable)");
    }
    if(free.length === 0){
      throw new Error("No hay grados de libertad libres para resolver");
    }

    // Sistema reducido Kff * Df = Ff
    const Kff = free.map(i => free.map(j => K[i][j]));
    const Ff = free.map(i => F_applied[i]);
    const Kfr = free.map(i => restrained.map(j => K[i][j]));

    const Df = solveLinearSystem(Kff, Ff);
    const Kff_inv = invertMatrix(Kff);
    const Df_inv = mv(Kff_inv, Ff);

    const D_total = Array(ndof).fill(0);
    free.forEach((dofIdx, i) => {
      D_total[dofIdx] = Df[i];
    });

    // Submatriz de filas restringidas [K_RL] y cálculo de reacciones por partición
    const K_RL = restrained.map(r => free.map(c => K[r][c]));
    const Fr = restrained.map(r => F_applied[r]);
    const R_partition = mv(K_RL, Df_inv).map((v, i) => v - Fr[i]);

    // ENSAMBLE EXPANDIDO 33x33 (HASTA 10 TRAMOS Y 11 NODOS / 33 GDL)
    // Cumple con la exigencia académica de dimensionar horizontal y verticalmente las 33 variables
    const maxNodes33 = 11;
    const maxDofs33 = 33;
    const dofLabels33 = [];
    for(let n = 1; n <= maxNodes33; n++){
      dofLabels33.push(`U${n}X`, `U${n}Y`, `U${n}θ`);
    }

    const expandedBars33 = [];
    const K_global_33 = zeros(maxDofs33, maxDofs33);

    elements.forEach((el, bIdx) => {
      const expMat = zeros(maxDofs33, maxDofs33);
      const ni = el.n1.id - 1;
      const nj = el.n2.id - 1;
      if(ni < maxNodes33 && nj < maxNodes33){
        const elDofs = [
          3 * ni,     3 * ni + 1, 3 * ni + 2,
          3 * nj,     3 * nj + 1, 3 * nj + 2
        ];
        for(let a = 0; a < 6; a++){
          for(let b = 0; b < 6; b++){
            const val = el.kt[a][b];
            expMat[elDofs[a]][elDofs[b]] = val;
            K_global_33[elDofs[a]][elDofs[b]] += val;
          }
        }
      }
      expandedBars33.push({
        barId: el.id,
        n1: el.n1.id,
        n2: el.n2.id,
        matrix: expMat
      });
    });

    // Rellenar barras vacías hasta 10 tramos
    for(let bIdx = elements.length + 1; bIdx <= 10; bIdx++){
      expandedBars33.push({
        barId: bIdx,
        n1: bIdx,
        n2: bIdx + 1,
        matrix: zeros(maxDofs33, maxDofs33)
      });
    }

    // Vectores expandidos de 33 componentes
    const F_applied_33 = Array(maxDofs33).fill(0);
    const D_total_33 = Array(maxDofs33).fill(0);
    const reactions_33 = Array(maxDofs33).fill(0);
    const dofConditions_33 = Array(maxDofs33).fill('LIBRE');

    nodes.forEach(n => {
      const nIdx = n.id - 1;
      if(nIdx < maxNodes33){
        for(let j = 0; j < 3; j++){
          const dIdx = 3 * nIdx + j;
          F_applied_33[dIdx] = F_applied[dIdx];
          D_total_33[dIdx] = D_total[dIdx];
        }
      }
    });

    restrained.forEach(dIdx => {
      if(dIdx < maxDofs33) dofConditions_33[dIdx] = 'RESTRINGIDO';
    });

    // TABLA DE 2 COLUMNAS PARA CURVA ELÁSTICA (Exacta de 2 columnas)
    // Columna 1: X (cm) | Columna 2: DY (cm)
    const elastic_curve_2col = nodes.map(n => ({
      nodeId: n.id,
      x: n.x,
      y: n.y,
      dy: D_total[3 * (n.id - 1) + 1],
      dx: D_total[3 * (n.id - 1)],
      theta: D_total[3 * (n.id - 1) + 2]
    }));

    // Recuperación de reacciones completas: R = K * D - F_applied
    const KD = mv(K, D_total);
    const reactions = KD.map((v, i) => v - F_applied[i]);

    // Residuos en GDL libres (deben ser numéricamente cero)
    let maxResidual = 0;
    free.forEach(idx => {
      const res = Math.abs(reactions[idx]);
      if(res > maxResidual) maxResidual = res;
    });
    const maxF = Math.max(1, ...F_applied.map(Math.abs));
    const relResidual = maxResidual / maxF;

    // Resultados en nudos
    const nodeResults = nodes.map((n, i) => ({
      ...n,
      ux: D_total[3 * i],
      uy: D_total[3 * i + 1],
      theta: D_total[3 * i + 2],
      rx: reactions[3 * i],
      ry: reactions[3 * i + 1],
      rm: reactions[3 * i + 2]
    }));

    // Fuerzas internas y deformaciones en cada elemento
    elements.forEach(el => {
      el.dGlobal = el.dof.map(idx => D_total[idx]);
      el.dLocal = mv(el.T, el.dGlobal);

      // Fuerzas de extremo en coordenadas locales:
      // q = k_loc * d_loc + F_fem_loc
      el.endForces = mv(el.k, el.dLocal).map((val, idx) => val + el.F_fem_loc[idx]);

      const [u0, v0, th0, u1, v1, th1] = el.dLocal;
      const L = el.L, E = el.E, I = el.I, A = el.A;
      const q1_loc = el.endForces[0];
      const q2_loc = el.endForces[1];
      const q3_loc = el.endForces[2];
      const q4_loc = el.endForces[3];
      const q5_loc = el.endForces[4];
      const q6_loc = el.endForces[5];

      // Muestreo analítico exacto de 61 puntos por elemento
      const numSamples = 61;
      const samples = [];
      for(let sIdx = 0; sIdx < numSamples; sIdx++){
        const xi = sIdx / (numSamples - 1);
        const x = L * xi;

        // Esfuerzos internos seccionales (convención resistente):
        // N(x): axial (tracción positiva)
        // V(x): cortante
        // M(x): momento flector (tracción abajo positiva)
        const N = -q1_loc - el.a0 * x - (el.a1 - el.a0) * (x * x) / (2 * L);
        const V = q2_loc - el.t0 * x - (el.t1 - el.t0) * (x * x) / (2 * L);
        const M = -q3_loc + q2_loc * x - el.t0 * (x * x) / 2 - (el.t1 - el.t0) * Math.pow(x, 3) / (6 * L);

        // Curva elástica analítica (funciones de Hermite cúbicas + solución particular)
        const N1 = 1 - 3 * xi * xi + 2 * Math.pow(xi, 3);
        const N2 = xi - 2 * xi * xi + Math.pow(xi, 3);
        const N3 = 3 * xi * xi - 2 * Math.pow(xi, 3);
        const N4 = -xi * xi + Math.pow(xi, 3);

        let v = N1 * v0 + N2 * L * th0 + N3 * v1 + N4 * L * th1;
        // Solución particular para v bajo carga distribuida uniforme/lineal
        v += (Math.pow(L, 4) / (E * I)) * (
          el.t0 * (xi * xi - 2 * Math.pow(xi, 3) + Math.pow(xi, 4)) / 24 +
          (el.t1 - el.t0) * (Math.pow(xi, 5) / 120 - Math.pow(xi, 3) / 40 + xi * xi / 60)
        );

        // Desplazamiento axial u(x)
        let u = (1 - xi) * u0 + xi * u1;
        if(Math.abs(el.a0) > 1e-9 || Math.abs(el.a1) > 1e-9){
          u += (L * L / (E * A)) * (el.a0 * xi * (1 - xi) / 2 + (el.a1 - el.a0) * (xi - Math.pow(xi, 3)) / 6);
        }

        // Proyección a desplazamientos globales
        const ux_glob = el.c * u - el.s * v;
        const uy_glob = el.s * u + el.c * v;

        samples.push({
          x,
          xi,
          N,
          V,
          M,
          u,
          v,
          ux: ux_glob,
          uy: uy_glob
        });
      }

      el.samples = samples;
      el.maxN = Math.max(...samples.map(p => p.N));
      el.minN = Math.min(...samples.map(p => p.N));
      el.maxV = Math.max(...samples.map(p => p.V));
      el.minV = Math.min(...samples.map(p => p.V));
      el.maxM = Math.max(...samples.map(p => p.M));
      el.minM = Math.min(...samples.map(p => p.M));
    });

    // Control riguroso de equilibrio global
    // 1) Reacciones en apoyos
    let sumRx = 0, sumRy = 0, sumRM_origin = 0;
    nodeResults.forEach(n => {
      if(n.support !== 'free'){
        sumRx += n.rx;
        sumRy += n.ry;
        sumRM_origin += n.rm + (n.x * n.ry - n.y * n.rx);
      }
    });

    // 2) Cargas nodales directas
    let sumFx_nodes = 0, sumFy_nodes = 0, sumM_nodes_origin = 0;
    nodes.forEach(n => {
      sumFx_nodes += n.fx;
      sumFy_nodes += n.fy;
      sumM_nodes_origin += n.mz + (n.x * n.fy - n.y * n.fx);
    });

    // 3) Cargas distribuidas en barras
    let sumFx_dist = 0, sumFy_dist = 0, sumM_dist_origin = 0;
    elements.forEach(el => {
      const p1 = byId.get(el.n1);
      // Fuerzas totales distribuidas en componentes globales
      const qxa = el.c * el.a0 - el.s * el.t0;
      const qxb = el.c * el.a1 - el.s * el.t1;
      const qya = el.s * el.a0 + el.c * el.t0;
      const qyb = el.s * el.a1 + el.c * el.t1;

      const rX = el.L * (qxa + qxb) / 2;
      const rY = el.L * (qya + qyb) / 2;

      sumFx_dist += rX;
      sumFy_dist += rY;

      // Momento respecto a (0,0) mediante integración exacta
      const M_dist = el.L * (p1.x * (qya + qyb) / 2 - p1.y * (qxa + qxb) / 2) +
                     (el.L * el.L / 6) * (el.c * (qya + 2 * qyb) - el.s * (qxa + 2 * qxb));
      sumM_dist_origin += M_dist;
    });

    const totalFx = sumRx + sumFx_nodes + sumFx_dist;
    const totalFy = sumRy + sumFy_nodes + sumFy_dist;
    const totalM0 = sumRM_origin + sumM_nodes_origin + sumM_dist_origin;

    const tolEq = 1e-4; // 0.0001 kgf o kgf·cm
    const isEquilibrium = Math.abs(totalFx) < tolEq && Math.abs(totalFy) < tolEq && Math.abs(totalM0) < tolEq;

    // Sincronizar reactions_33 con las reacciones calculadas
    nodes.forEach(n => {
      const nIdx = n.id - 1;
      if(nIdx < maxNodes33){
        for(let j = 0; j < 3; j++){
          const dIdx = 3 * nIdx + j;
          reactions_33[dIdx] = reactions[dIdx];
        }
      }
    });

    return {
      nodes: nodeResults,
      bars: elements,
      props: defaultProp,
      E: E0,
      K,
      F_applied,
      Kff,
      Ff,
      Kfr,
      Kff_inv,
      Df_inv,
      K_RL,
      Fr,
      R_partition,
      free,
      restrained,
      disp: D_total,
      reactions,
      maxResidual,
      relativeResidual: relResidual,
      expandedBars33,
      K_global_33,
      F_applied_33,
      D_total_33,
      reactions_33,
      dofConditions_33,
      dofLabels33,
      elastic_curve_2col,
      equilibrium: {
        sumRx, sumRy, sumRM_origin,
        sumFx_nodes, sumFy_nodes, sumM_nodes_origin,
        sumFx_dist, sumFy_dist, sumM_dist_origin,
        fx: totalFx,
        fy: totalFy,
        mz: totalM0,
        isEquilibrium,
        tolerance: tolEq
      }
    };
  }

  return {
    compute,
    properties,
    element,
    solveLinearSystem,
    invertMatrix
  };
}));

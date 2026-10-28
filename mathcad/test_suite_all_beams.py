import os, sys, zipfile, xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding='utf-8')

from beam_engine import BeamModel
from mcdx_generator import generate_mcdx_for_beam

test_cases = [
    {
        "name": "01_Exam_4Spans",
        "beam": BeamModel(
            spans=[2.0, 1.0, 1.0, 1.0],
            supports={0: 'pin', 3: 'roller'},
            distributed_loads={0: 15.0},
            point_loads={2: 20.0, 4: 8.0},
            applied_moments={1: 10.0}
        )
    },
    {
        "name": "02_User_3Spans_q500",
        "beam": BeamModel(
            spans=[2.0, 4.0, 2.0],
            supports={0: 'pin', 3: 'roller'},
            distributed_loads={1: 500.0},
            point_loads={},
            applied_moments={}
        )
    },
    {
        "name": "03_Cantilever_1Span",
        "beam": BeamModel(
            spans=[3.0],
            supports={0: 'fixed'},
            distributed_loads={0: 50.0},
            point_loads={1: 100.0},
            applied_moments={}
        )
    },
    {
        "name": "04_Double_Overhang_3Spans",
        "beam": BeamModel(
            spans=[1.5, 5.0, 1.5],
            supports={1: 'pin', 2: 'roller'},
            distributed_loads={0: 20.0, 1: 30.0, 2: 20.0},
            point_loads={0: 15.0, 3: 15.0},
            applied_moments={}
        )
    },
    {
        "name": "05_Full_10_Spans",
        "beam": BeamModel(
            spans=[1.0, 1.5, 2.0, 1.0, 1.2, 0.8, 1.5, 1.0, 1.0, 2.0],
            supports={0: 'pin', 7: 'roller'},
            distributed_loads={2: 40.0, 5: 25.0},
            point_loads={3: 50.0, 8: 30.0},
            applied_moments={4: 15.0}
        )
    }
]

os.makedirs("test_outputs", exist_ok=True)

all_passed = True
for tc in test_cases:
    out_path = f"test_outputs/{tc['name']}.mcdx"
    b = tc['beam']
    generate_mcdx_for_beam(b, out_path)
    
    with zipfile.ZipFile(out_path, 'r') as z:
        root = ET.fromstring(z.read('mathcad/worksheet.xml'))
        regs_dict = {r.attrib.get('region-id'): r for r in root[0]}
        
        # 1. Verificar que no haya imágenes parásitas
        pictures = [r for r in root[0] if r.find('{http://schemas.mathsoft.com/worksheet50}picture') is not None]
        assert len(pictures) == 1, f"Expected 1 picture, got {len(pictures)}"
        assert pictures[0].attrib.get('region-id') == '24', "Picture must be Region 24"
        
        # 2. Verificar que la imagen esté en top=210 y cargas distribuidas en top=380
        top_pic = float(pictures[0].attrib.get('top', 0))
        top_q1 = float(regs_dict['25'].attrib.get('top', 0))
        assert top_pic == 210.0, f"Pic top expected 210.0, got {top_pic}"
        assert top_q1 >= 380.0, f"q1 top expected >= 380, got {top_q1}"
        
        # 3. Verificar que X axis en Plot 66 y 67 coincida con Ltot
        total_l = b.total_length
        p66 = regs_dict['66'].find('{http://schemas.mathsoft.com/worksheet50}plot')
        p67 = regs_dict['67'].find('{http://schemas.mathsoft.com/worksheet50}plot')
        x66_end = float(p66.find('.//{http://schemas.mathsoft.com/worksheet50}xAxis').attrib['end'])
        x67_end = float(p67.find('.//{http://schemas.mathsoft.com/worksheet50}xAxis').attrib['end'])
        assert abs(x66_end - total_l) < 1e-4, f"Plot 66 X end {x66_end} != {total_l}"
        assert abs(x67_end - total_l) < 1e-4, f"Plot 67 X end {x67_end} != {total_l}"
        
        # 4. Verificar que Y axis cubra los extremos calculados
        q_min, q_max, m_min, m_max = b.compute_internal_force_extrema()
        y66_start = float(p66.find('.//{http://schemas.mathsoft.com/worksheet50}yAxis').attrib['start'])
        y66_end = float(p66.find('.//{http://schemas.mathsoft.com/worksheet50}yAxis').attrib['end'])
        y67_start = float(p67.find('.//{http://schemas.mathsoft.com/worksheet50}yAxis').attrib['start'])
        y67_end = float(p67.find('.//{http://schemas.mathsoft.com/worksheet50}yAxis').attrib['end'])
        
        assert y66_start <= q_min and y66_end >= q_max, f"Q plot {y66_start}..{y66_end} does not encompass {q_min}..{q_max}"
        assert y67_start <= m_min and y67_end >= m_max, f"M plot {y67_start}..{y67_end} does not encompass {m_min}..{m_max}"

        print(f"PASS: {tc['name']:<25} | Ltot={total_l:4.1f}m | Q:[{y66_start:6.1f}, {y66_end:6.1f}] | M:[{y67_start:6.1f}, {y67_end:6.1f}]")

print("\nALL 5 TEST CASES PASSED WITH 100% PRECISION!")

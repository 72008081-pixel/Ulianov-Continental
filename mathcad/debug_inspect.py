import zipfile, xml.etree.ElementTree as ET, sys
sys.stdout.reconfigure(encoding='utf-8')

with zipfile.ZipFile('PLANTILLA_MAESTRA_VIGAS_EXAMEN.mcdx') as z:
    root = ET.fromstring(z.read('mathcad/worksheet.xml'))

for rid in ['13', '14', '15', '16', '17', '18', '19', '20']:
    for r in root.findall(f".//{{http://schemas.mathsoft.com/worksheet50}}region[@region-id='{rid}']"):
        print(f"=== Region {rid} ===")
        print(ET.tostring(r, encoding='utf-8').decode('utf-8'))

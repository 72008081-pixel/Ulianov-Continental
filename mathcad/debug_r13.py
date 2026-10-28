import zipfile, xml.etree.ElementTree as ET, sys
sys.stdout.reconfigure(encoding='utf-8')

with zipfile.ZipFile('EJERCICIO-01.mcdx') as z:
    root = ET.fromstring(z.read('mathcad/worksheet.xml'))
r13 = root.find(".//{http://schemas.mathsoft.com/worksheet50}region[@region-id='13']")
r14 = root.find(".//{http://schemas.mathsoft.com/worksheet50}region[@region-id='14']")
r17 = root.find(".//{http://schemas.mathsoft.com/worksheet50}region[@region-id='17']")
r18 = root.find(".//{http://schemas.mathsoft.com/worksheet50}region[@region-id='18']")

for name, r in [('Region 13', r13), ('Region 14', r14), ('Region 17', r17), ('Region 18', r18)]:
    print(f'=== {name} ===')
    if r is not None:
        print(ET.tostring(r, encoding='utf-8').decode('utf-8'))

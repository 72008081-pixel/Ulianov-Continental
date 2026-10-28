import os, zipfile, win32com.client
import xml.etree.ElementTree as ET

CUR_DIR = os.path.dirname(os.path.abspath(__file__))
MCDX_10 = os.path.join(CUR_DIR, "PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx")

files = {}
with zipfile.ZipFile(MCDX_10, 'r') as z:
    for name in z.namelist():
        files[name] = z.read(name)

root = ET.fromstring(files['mathcad/worksheet.xml'])

# 1. Remove all mc14-conversion-loss-annotations
for r in list(root[0]):
    for anno in list(r.findall('{http://schemas.mathsoft.com/worksheet50}mc14-conversion-loss-annotations')):
        r.remove(anno)

# 2. Fix spacing of moments (46 to 56): 4 per row, dx=175
regs_by_id = {r.attrib.get('region-id'): r for r in root[0]}

m_rows = [
    (['46', '47', '48', '49'], 415.0),
    (['50', '51', '52', '53'], 445.0),
    (['54', '55', '56'], 475.0)
]
for ids, top_val in m_rows:
    for col_idx, rid in enumerate(ids):
        if rid in regs_by_id:
            regs_by_id[rid].attrib['top'] = f'{top_val:.1f}'
            regs_by_id[rid].attrib['left'] = f'{37.8 + col_idx * 175.0:.1f}'

# Push regions >= 57 down by 50 pt
for rid, r in regs_by_id.items():
    if int(rid) >= 57:
        orig_top = float(r.attrib.get('top', 0))
        r.attrib['top'] = f'{orig_top + 50.0:.1f}'

files['mathcad/worksheet.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)

with zipfile.ZipFile(MCDX_10, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for name, content in files.items():
        z.writestr(name, content)

print("PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx actualizada exitosamente.")

# Verify with Mathcad COM
mc = win32com.client.Dispatch('MathcadPrime.Application')
mc.Visible = False
try:
    mc.Open(os.path.abspath(MCDX_10))
    ws = mc.Worksheets.Item(mc.Worksheets.Count - 1)
    print("Opened worksheet:", ws.FullName)
    has_corr = getattr(ws, 'HasCorruptedRegions', False)
    print("HasCorruptedRegions:", has_corr)
    ws.Close(0)
finally:
    mc.CloseAll(0)
    mc.Quit(0)

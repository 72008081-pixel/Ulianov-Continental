import zipfile, xml.etree.ElementTree as ET, sys
sys.stdout.reconfigure(encoding='utf-8')

def validate_mcdx(path):
    print(f"\n--- Validating: {path} ---")
    with zipfile.ZipFile(path, 'r') as z:
        root = ET.fromstring(z.read('mathcad/worksheet.xml'))

    errors = []
    
    # 1. Check all apply elements in Region 61 and 62
    binary_ops = {'mult', 'div', 'pow', 'greaterThan', 'greaterOrEqual'}
    for r in root.iter('{http://schemas.mathsoft.com/worksheet50}region'):
        rid = r.attrib.get('region-id')
        for apply_el in r.iter('{http://schemas.mathsoft.com/math50}apply'):
            if len(apply_el) == 0:
                errors.append(f"Region {rid}: Empty <apply /> element")
                continue
            op_tag = apply_el[0].tag.split('}')[-1]
            num_args = len(apply_el) - 1
            if op_tag in binary_ops and num_args != 2:
                errors.append(f"Region {rid}: Binary op <{op_tag}> has {num_args} args (expected 2)! Children: {[c.tag.split('}')[-1] for c in apply_el]}")
            elif op_tag == 'minus' and num_args not in (1, 2):
                errors.append(f"Region {rid}: Op <minus> has {num_args} args (expected 1 or 2)!")
            elif op_tag == 'plus' and num_args < 2:
                errors.append(f"Region {rid}: Op <plus> has {num_args} args (expected >= 2)!")

    # 2. Check positionticmark attribute in all axisLine elements (must be xs:integer)
    import re
    for aline in root.iter('{http://schemas.mathsoft.com/worksheet50}axisLine'):
        ptm = aline.attrib.get('positionticmark')
        if ptm is not None and not re.match(r'^-?\d+$', ptm):
            errors.append(f"axisLine positionticmark='{ptm}' is NOT a valid integer!")
                
    if errors:
        print(f"FAILED with {len(errors)} errors:")
        for e in errors:
            print("  ❌", e)
        return False, errors
    else:
        print("✅ PASSED: All <apply> elements are complete and valid!")
        return True, []

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else r'D:\Visitante\Documents\Viga_3Tramos_Mathcad_Prime_11 (1).mcdx'
    validate_mcdx(target)

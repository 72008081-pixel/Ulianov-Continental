import sys, os, zipfile, io, win32com.client, fitz
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding='utf-8')

CUR_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_MCDX = os.path.join(CUR_DIR, "EJERCICIO-01.mcdx")
OUT_DIR = os.path.join(CUR_DIR, "test_outputs")
os.makedirs(OUT_DIR, exist_ok=True)

OUT_MCDX = os.path.join(CUR_DIR, "PLANTILLA_MAESTRA_VIGAS_EXAMEN.mcdx")
OUT_PDF = os.path.join(CUR_DIR, "PLANTILLA_MAESTRA_VIGAS_EXAMEN.pdf")

def make_header_banner(title, subtitle=None, width=1600, height=90, bg='#0B3C5D', fg='#FFFFFF'):
    im = Image.new('RGB', (width, height), color=bg)
    draw = ImageDraw.Draw(im)
    try:
        font_title = ImageFont.truetype('arialbd.ttf', 32)
        font_sub = ImageFont.truetype('arial.ttf', 20)
    except:
        font_title = ImageFont.load_default()
        font_sub = font_title
    
    if subtitle:
        draw.text((35, 12), title, fill=fg, font=font_title)
        draw.text((35, 50), subtitle, fill='#D0E1FD', font=font_sub)
    else:
        draw.text((35, (height - 36) // 2), title, fill=fg, font=font_title)
    return im

def make_callout_box(title, bullets, width=1600, bg='#F0F4F8', border='#0B3C5D', text_color='#1D2731'):
    line_h = 32
    padding = 24
    height = padding * 2 + 36 + len(bullets) * line_h + 10
    im = Image.new('RGB', (width, height), color=bg)
    draw = ImageDraw.Draw(im)
    
    # Left accent bar
    draw.rectangle([(0, 0), (12, height)], fill=border)
    # Border
    draw.rectangle([(0, 0), (width - 1, height - 1)], outline='#CAD5E2', width=2)
    draw.rectangle([(0, 0), (12, height)], fill=border)
    
    try:
        font_hdr = ImageFont.truetype('arialbd.ttf', 24)
        font_txt = ImageFont.truetype('arial.ttf', 21)
    except:
        font_hdr = ImageFont.load_default()
        font_txt = font_hdr
        
    draw.text((35, padding), title, fill=border, font=font_hdr)
    y = padding + 40
    for b in bullets:
        draw.text((45, y), b, fill=text_color, font=font_txt)
        y += line_h
    return im

print("1. Creando banners de alta definición...")
h1 = make_header_banner(
    'EJERCICIO 01: ANÁLISIS ESTRUCTURAL DE VIGAS ISOSTÁTICAS',
    'Método de Funciones de Singularidad de Macaulay — PTC Mathcad Prime 11',
    width=1600, height=95, bg='#0B3C5D'
)
h2 = make_header_banner(
    '1. DATOS DE LA VIGA (Longitudes, Cargas Puntuales, Distribuidas y Momentos)',
    width=1600, height=60, bg='#1D2731', fg='#FFFFFF'
)
h3 = make_header_banner(
    '2. CÁLCULO DE REACCIONES DE APOYO (Condiciones de Equilibrio Estático)',
    width=1600, height=60, bg='#1D2731', fg='#FFFFFF'
)
h4 = make_header_banner(
    '3. SECCIONES Y SUSTENTACIÓN DE ECUACIONES M(x) Y Q(x)',
    width=1600, height=60, bg='#1D2731', fg='#FFFFFF'
)
callout_sec = make_callout_box(
    'SUSTENTACIÓN TEÓRICA — MÉTODO DE FUNCIONES DE SINGULARIDAD (MACAULAY):',
    [
        '• En cada corte x solo se consideran las cargas activas situadas a la izquierda (x ≥ xi) mediante corchetes angulares [x - xi].',
        '• Momento Flector M(x): Cargas puntuales y distribuidas aportan término con brazo (x - xi). El momento concentrado M actúa directo.',
        '• Fuerza Cortante Q(x): Derivada diferencial Q(x) = dM(x)/dx. Al derivar respecto a x se anulan los brazos de palanca.'
    ],
    width=1600
)
h5 = make_header_banner(
    '4. DIAGRAMAS DE FUERZA CORTANTE (DFC), MOMENTO FLECTOR (DMF) Y TABLAS',
    width=1600, height=60, bg='#0B3C5D', fg='#FFFFFF'
)

# Read base EJERCICIO-01.mcdx
files = {}
with zipfile.ZipFile(SRC_MCDX, 'r') as z:
    for name in z.namelist():
        files[name] = z.read(name)

# Save images to files dict
banner_map = [
    (h1, 'HdrTitle.png', 'RelHdrTitle'),
    (h2, 'HdrDatos.png', 'RelHdrDatos'),
    (h3, 'HdrReac.png', 'RelHdrReac'),
    (h4, 'HdrSec.png', 'RelHdrSec'),
    (callout_sec, 'BoxSustentacion.png', 'RelBoxSust'),
    (h5, 'HdrDiag.png', 'RelHdrDiag')
]

for img_obj, img_fname, rel_id in banner_map:
    b = io.BytesIO()
    img_obj.save(b, format='PNG')
    files[f'mathcad/media/{img_fname}'] = b.getvalue()

# Build worksheet.xml.rels
rels_xml = '<?xml version="1.0" encoding="utf-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
for _, img_fname, rel_id in banner_map:
    rels_xml += f'    <Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="/mathcad/media/{img_fname}" Id="{rel_id}" />\n'
rels_xml += '    <Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="/mathcad/media/Image10.png" Id="RelImg10" />\n'
rels_xml += '    <Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="/mathcad/media/Image22.png" Id="RelImg22" />\n'
rels_xml += '</Relationships>'
files['mathcad/_rels/worksheet.xml.rels'] = rels_xml.encode('utf-8')

# Build worksheet.xml
ws_root = ET.fromstring(files['mathcad/worksheet.xml'])
orig_regs = {r.attrib.get('region-id'): r for r in list(ws_root[0])}
ws_root[0].clear()

def make_pic_reg(rid, rel_id, top, left, w=765, h=30):
    reg = ET.Element('{http://schemas.mathsoft.com/worksheet50}region', {
        'region-id': str(rid),
        'top': f'{top:.1f}',
        'left': f'{left:.1f}',
        'width': str(w),
        'height': str(h)
    })
    pic = ET.SubElement(reg, '{http://schemas.mathsoft.com/worksheet50}picture')
    png = ET.SubElement(pic, '{http://schemas.mathsoft.com/worksheet50}png', {
        'item-idref': rel_id,
        'display-width': str(w),
        'display-height': str(h)
    })
    return reg

def add_math(r_id, top, left):
    r = orig_regs[str(r_id)]
    r.attrib['top'] = f'{top:.1f}'
    r.attrib['left'] = f'{left:.1f}'
    ws_root[0].append(r)

reg_counter = 100

# ================= PAGE 1 (top: 20 to 1100 pt) =================
# 1. Main Title Banner
ws_root[0].append(make_pic_reg(reg_counter, 'RelHdrTitle', top=20.0, left=37.8, w=765, h=40)); reg_counter += 1

# 2. Section 1 Banner: DATOS
ws_root[0].append(make_pic_reg(reg_counter, 'RelHdrDatos', top=68.0, left=37.8, w=765, h=25)); reg_counter += 1

# Longitudes: a, b, c, d
add_math(6, top=100.0, left=37.8)          # a := 2 m
add_math(7, top=100.0, left=37.8 + 140.0)  # b := 1 m
add_math(8, top=100.0, left=37.8 + 280.0)  # c := 1 m
add_math(9, top=100.0, left=37.8 + 420.0)  # d := 1 m

# Cargas puntuales: P1, P2
add_math(3, top=132.0, left=37.8)          # P1 := 20 kg
add_math(4, top=132.0, left=37.8 + 200.0)  # P2 := 8 kg

# Carga distribuida q y Momento M
add_math(2, top=164.0, left=37.8)          # q := 15 kg/m
add_math(5, top=164.0, left=37.8 + 230.0)  # M := 10 kg*m

# Esquema de la viga (Image10)
r10 = orig_regs['10']
r10.attrib['top'] = '200.0'
r10.attrib['left'] = '37.8'
png10 = r10.find('{http://schemas.mathsoft.com/worksheet50}picture/{http://schemas.mathsoft.com/worksheet50}png')
if png10 is not None:
    png10.attrib['item-idref'] = 'RelImg10'
    png10.attrib['display-width'] = '765'
    png10.attrib['display-height'] = '145'
ws_root[0].append(r10)

# 3. Section 2 Banner: REACCIONES
ws_root[0].append(make_pic_reg(reg_counter, 'RelHdrReac', top=360.0, left=37.8, w=765, h=25)); reg_counter += 1

# Equilibrio de Momentos
add_math(13, top=395.0, left=37.8)   # Sum MA = 0
add_math(14, top=395.0, left=150.0)  # Solve VD
add_math(15, top=440.0, left=150.0)  # VD := 35 kg
add_math(16, top=440.0, left=300.0)  # VD = 35 kg

# Equilibrio Vertical
add_math(17, top=480.0, left=37.8)   # Sum Fy = 0
add_math(18, top=480.0, left=150.0)  # Solve VA
add_math(19, top=525.0, left=150.0)  # VA := 23 kg
add_math(20, top=525.0, left=300.0)  # VA = 23 kg

# 4. Section 3 Banner: SECCIONES Y SUSTENTACIÓN
ws_root[0].append(make_pic_reg(reg_counter, 'RelHdrSec', top=565.0, left=37.8, w=765, h=25)); reg_counter += 1

# Esquema cortes (Image22)
r22 = orig_regs['22']
r22.attrib['top'] = '598.0'
r22.attrib['left'] = '37.8'
png22 = r22.find('{http://schemas.mathsoft.com/worksheet50}picture/{http://schemas.mathsoft.com/worksheet50}png')
if png22 is not None:
    png22.attrib['item-idref'] = 'RelImg22'
    png22.attrib['display-width'] = '765'
    png22.attrib['display-height'] = '145'
ws_root[0].append(r22)

# Cuadro de Sustentación Teórica Macaulay
ws_root[0].append(make_pic_reg(reg_counter, 'RelBoxSust', top=755.0, left=37.8, w=765, h=65)); reg_counter += 1

# Ecuaciones M(x) y Q(x)
add_math(23, top=835.0, left=37.8)   # M(x)
add_math(24, top=895.0, left=37.8)   # Q(x)

# Rango
add_math(25, top=955.0, left=37.8)   # x := 0..

# ================= PAGE 2 (top: 1550 to 2400 pt) =================
# Section 4 Banner: DIAGRAMAS
ws_root[0].append(make_pic_reg(reg_counter, 'RelHdrDiag', top=1550.0, left=37.8, w=765, h=25)); reg_counter += 1

# Plot Q(x) - DFC
r29 = orig_regs['29']
r29.attrib['top'] = '1590.0'
r29.attrib['left'] = '37.8'
r29.attrib['width'] = '550.0'
r29.attrib['height'] = '240.0'
ws_root[0].append(r29)

# Tabla Q(x) al costado de Plot Q
add_math(28, top=1610.0, left=610.0)   # Q(x) eval

# Plot M(x) - DMF
r30 = orig_regs['30']
r30.attrib['top'] = '1880.0'
r30.attrib['left'] = '37.8'
r30.attrib['width'] = '550.0'
r30.attrib['height'] = '240.0'
ws_root[0].append(r30)

# Tabla M(x) al costado de Plot M
add_math(27, top=1900.0, left=610.0)   # M(x) eval

files['mathcad/worksheet.xml'] = ET.tostring(ws_root, encoding='utf-8', xml_declaration=True)

print("2. Guardando paquete en:", OUT_MCDX)
with zipfile.ZipFile(OUT_MCDX, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for name, content in files.items():
        z.writestr(name, content)

print("3. Abriendo y sincronizando en PTC Mathcad Prime 11...")
mc = win32com.client.Dispatch('MathcadPrime.Application')
mc.Visible = False
try:
    mc.Open(os.path.abspath(OUT_MCDX))
    ws = mc.Worksheets.Item(mc.Worksheets.Count - 1)
    print('Worksheet abierta:', ws.FullName)
    has_corr = getattr(ws, 'HasCorruptedRegions', False)
    print('HasCorruptedRegions (engranajes con flechas):', has_corr)
    assert not has_corr, "¡ERROR! Aún existen regiones corruptas."
    
    ws.Synchronize()
    ws.SaveAs(os.path.abspath(OUT_PDF))
    print('PDF generado exitosamente:', os.path.getsize(OUT_PDF), 'bytes')
    ws.Close(0)
finally:
    mc.CloseAll(0)
    mc.Quit(0)

# 4. Renderizar a imágenes y verificar
print("4. Renderizando páginas a imágenes de alta resolución...")
doc = fitz.open(OUT_PDF)
print('Total de páginas en PDF:', len(doc))
for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=150)
    img_path = os.path.join(OUT_DIR, f'PERFECT_PAGE_{i+1}.png')
    pix.save(img_path)
    print(f'Página {i+1} guardada en: {img_path}')

print("¡Plantilla Maestra ultra-mejorada creada y verificada con 100% de éxito!")

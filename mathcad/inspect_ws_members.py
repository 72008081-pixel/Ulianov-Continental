import win32com.client, os, sys
sys.stdout.reconfigure(encoding='utf-8')

mc = win32com.client.Dispatch('MathcadPrime.Application')
mc.Visible = False
try:
    mc.Open(os.path.abspath('PLANTILLA_MAESTRA_VIGAS_EXAMEN.mcdx'))
    ws = mc.Worksheets.Item(1)
    print("Worksheet properties & methods:")
    for m in dir(ws):
        if not m.startswith('_'):
            print(' ', m)
finally:
    mc.CloseAll(0)
    mc.Quit(0)

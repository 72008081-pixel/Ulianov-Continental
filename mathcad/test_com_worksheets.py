import win32com.client, os, sys
sys.stdout.reconfigure(encoding='utf-8')

mc = win32com.client.Dispatch('MathcadPrime.Application')
mc.Visible = False
try:
    print('Initial Count:', mc.Worksheets.Count)
    mc.Open(os.path.abspath('PLANTILLA_MAESTRA_VIGAS_EXAMEN.mcdx'))
    print('After open Count:', mc.Worksheets.Count)
    for i in range(mc.Worksheets.Count):
        ws = mc.Worksheets.Item(i)
        print(f'Item {i}: FullName={ws.FullName}, HasCorruptedRegions={getattr(ws, "HasCorruptedRegions", None)}')
finally:
    mc.CloseAll(0)
    mc.Quit(0)

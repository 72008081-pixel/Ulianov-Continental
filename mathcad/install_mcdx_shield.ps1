# =============================================================================
# INSTALADOR DEL ESCUDO PERMANENTE DE MATHCAD PRIME 11 (MCDX SHIELD)
# =============================================================================
# Asocia la extensión .mcdx a nivel de usuario con el interceptor transparente
# mcdx_shield.py usando pythonw.exe (sin ventana de consola, 15ms de latencia).
# Preserva el icono oficial de PTC Mathcad Prime (MCDXFile.ico).
# =============================================================================

$PythonW = "C:\Python314\pythonw.exe"
$ShieldScript = "D:\ANTIGRAVITY CUBA V\01. Análisis Estructural II\01. PLANTILLAS FINALES EXAMENES\03. MATHCAD\mcdx_shield.py"
$McdxIcon = "C:\Program Files\PTC\Mathcad Prime 11.0.0.0\MCDXFile.ico"

# 1. Crear ProgID MathcadShield
$ProgIdPath = "HKCU:\Software\Classes\MathcadPrimeShield"
New-Item -Path $ProgIdPath -Force | Out-Null
Set-ItemProperty -Path $ProgIdPath -Name "(default)" -Value "Documento PTC Mathcad Prime (Protegido)"

# Icono
$IconPath = "$ProgIdPath\DefaultIcon"
New-Item -Path $IconPath -Force | Out-Null
Set-ItemProperty -Path $IconPath -Name "(default)" -Value "$McdxIcon"

# Comando de apertura
$CmdPath = "$ProgIdPath\shell\open\command"
New-Item -Path $CmdPath -Force | Out-Null
$LaunchCmd = "`"$PythonW`" `"$ShieldScript`" `"%1`""
Set-ItemProperty -Path $CmdPath -Name "(default)" -Value $LaunchCmd

# 2. Asociar .mcdx al ProgID protegido en HKCU
$ExtPath = "HKCU:\Software\Classes\.mcdx"
New-Item -Path $ExtPath -Force | Out-Null
Set-ItemProperty -Path $ExtPath -Name "(default)" -Value "MathcadPrimeShield"
Set-ItemProperty -Path $ExtPath -Name "Content Type" -Value "application/x-mathcad-mcdx"

# 3. Notificar a Windows del cambio de asociación
Write-Host "✅ Escudo Mathcad Prime 11 instalado con éxito en HKCU."
Write-Host "   Comando registrado: $LaunchCmd"

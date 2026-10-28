# =============================================================================
# DESINSTALADOR DEL ESCUDO PERMANENTE DE MATHCAD PRIME 11
# =============================================================================
Remove-Item -Path "HKCU:\Software\Classes\.mcdx" -Recurse -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\MathcadPrimeShield" -Recurse -ErrorAction SilentlyContinue
Write-Host "✅ Escudo desinstalado. La asociación de .mcdx ha vuelto al estándar del sistema."

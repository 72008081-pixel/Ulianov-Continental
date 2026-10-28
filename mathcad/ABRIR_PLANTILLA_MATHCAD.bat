@echo off
title Abrir Plantilla Maestra en Mathcad Prime 11
echo ========================================================
echo   ABRIENDO PLANTILLA MAESTRA DE VIGAS EN MATHCAD PRIME 11
echo ========================================================
echo.
set MATHCAD_EXE="C:\Program Files\PTC\Mathcad Prime 11.0.0.0\MathcadPrime.exe"
set PLANTILLA="%~dp0PLANTILLA_MAESTRA_10_TRAMOS_VIGAS.mcdx"

if exist %MATHCAD_EXE% (
    echo Iniciando PTC Mathcad Prime 11...
    start "" %MATHCAD_EXE% %PLANTILLA%
    echo Archivo abierto correctamente.
) else (
    echo Error: No se encontro MathcadPrime.exe en la ruta por defecto.
    pause
)

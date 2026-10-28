@echo off
title Lanzador de Asistente de Vigas para Mathcad Prime 11
echo =========================================================================
echo   INICIANDO ASISTENTE GRAFICO DE VIGAS — PTC MATHCAD PRIME 11
echo =========================================================================
echo.
cd /d "%~dp0"
python app_gui.py
if errorlevel 1 (
    echo.
    echo Ocurrio un error al ejecutar la aplicacion. Verifique Python.
    pause
)

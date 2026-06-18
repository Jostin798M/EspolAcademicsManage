@echo off
rem ─────────────────────────────────────────────────────────────
rem  EspolAcademicsManage - preparar entorno y arrancar el servidor
rem  Uso (Windows): doble clic en run-server.bat  o  run-server.bat
rem ─────────────────────────────────────────────────────────────
setlocal enabledelayedexpansion

rem Ir a la carpeta backend (donde esta manage.py)
cd /d "%~dp0backend"

rem Elegir interprete de Python (python o el lanzador py)
set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY (
  where py >nul 2>nul && set "PY=py"
)
if not defined PY (
  echo ERROR: Python no esta instalado o no esta en el PATH.
  echo Instalalo desde https://python.org  ^(marca "Add Python to PATH"^)
  pause
  exit /b 1
)

rem Crear el entorno virtual si no existe (o si es de otro sistema operativo)
if not exist "venv\Scripts\python.exe" (
  echo ^>^> Creando entorno virtual...
  %PY% -m venv venv
)

set "VENV_PY=venv\Scripts\python.exe"

echo ^>^> Instalando dependencias...
"%VENV_PY%" -m pip install --upgrade pip >nul
"%VENV_PY%" -m pip install -r requirements.txt

echo ^>^> Aplicando migraciones...
"%VENV_PY%" manage.py migrate

echo ^>^> Sembrando datos iniciales (solo si la base de datos esta vacia)...
"%VENV_PY%" manage.py seed --if-empty

echo.
echo ^>^> Servidor listo en  http://localhost:8000/   (Ctrl+C para detener)
echo.
"%VENV_PY%" manage.py runserver 127.0.0.1:8000

endlocal

#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# EspolAcademicsManage — preparar entorno y arrancar el servidor
# Uso (Linux / macOS):   ./run-server.sh
# ─────────────────────────────────────────────────────────────
set -e

# Ir a la carpeta backend (donde esta manage.py)
cd "$(dirname "$0")/backend"

# Elegir interprete de Python
if command -v python3 >/dev/null 2>&1; then PY=python3
elif command -v python >/dev/null 2>&1; then PY=python
else echo "ERROR: Python no esta instalado. Instalalo desde https://python.org"; exit 1; fi

# Crear el entorno virtual si no existe (o si es de otro sistema operativo)
if [ ! -x venv/bin/python ]; then
  echo ">> Creando entorno virtual..."
  "$PY" -m venv venv
fi

VENV_PY="venv/bin/python"

echo ">> Instalando dependencias..."
"$VENV_PY" -m pip install --upgrade pip >/dev/null
"$VENV_PY" -m pip install -r requirements.txt

echo ">> Aplicando migraciones..."
"$VENV_PY" manage.py migrate

echo ">> Sembrando datos iniciales (solo si la base de datos esta vacia)..."
"$VENV_PY" manage.py seed --if-empty

echo ""
echo ">> Servidor listo en  http://localhost:8000/   (Ctrl+C para detener)"
echo ""
"$VENV_PY" manage.py runserver 127.0.0.1:8000

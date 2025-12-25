#!/bin/bash
# Build React app and start Django server

set -e

echo "=== Checking React build ==="
if [ ! -d "frontend/build" ]; then
    echo "React build not found. Building now..."
    cd frontend
    npm run build
    cd ..
else
    echo "React build exists."
fi

echo ""
echo "=== Collecting static files ==="
source venv/bin/activate
python manage.py collectstatic --noinput

echo ""
echo "=== Starting Django server ==="
echo "Access the app at: http://localhost:8000/"
echo ""
python manage.py runserver 0.0.0.0:8000

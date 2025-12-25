#!/bin/bash
# Script to build React app and integrate with Django

set -e  # Exit on error

echo "=== Building React App ==="
cd frontend
npm run build
cd ..

echo ""
echo "=== Collecting Static Files ==="
source venv/bin/activate
python manage.py collectstatic --noinput

echo ""
echo "=== Integration Complete! ==="
echo "You can now run: python manage.py runserver 0.0.0.0:8000"
echo "Access the app at: http://localhost:8000/"

# React-Django Integration Guide

## Quick Start

Run these commands in order:

### 1. Update Django Configuration
```bash
cd /Users/kiran/Desktop/programs/invoice
source venv/bin/activate
python update_django_config.py
```

### 2. Build and Deploy React App
```bash
chmod +x deploy_react.sh
./deploy_react.sh
```

### 3. Start Django Server
```bash
python manage.py runserver 0.0.0.0:8000
```

### 4. Access the Application
- **Main App**: http://localhost:8000/
- **Admin Panel**: http://localhost:8000/admin/
- **API**: http://localhost:8000/api/

## What Changed

### Settings (`invoice_app/settings.py`)
- Added React build directory to `TEMPLATES['DIRS']`
- Updated `STATICFILES_DIRS` to include React static files
- Configured `STATIC_ROOT` for collectstatic

### URLs (`invoice_app/urls.py`)
- Added catch-all route to serve React `index.html`
- All non-API routes now handled by React Router
- API routes (`/api/*`) remain unchanged

### Benefits
✅ Single server on port 8000
✅ No CORS issues
✅ Production-ready setup
✅ Simplified deployment
✅ All features work together

## Development vs Production

### Development (Current)
```bash
# Only run Django
python manage.py runserver 0.0.0.0:8000
```

### If You Need to Update React Code
```bash
cd frontend
npm start  # React dev server on :3000
# In another terminal:
python manage.py runserver 0.0.0.0:8000  # Django on :8000
```

After making React changes, rebuild:
```bash
./deploy_react.sh
```

## File Structure
```
invoice/
├── frontend/
│   ├── build/              # React production build
│   │   ├── index.html     # Main HTML file
│   │   └── static/        # JS/CSS bundles
│   └── src/               # React source code
├── invoice_app/
│   ├── settings.py        # Updated: TEMPLATES, STATICFILES
│   └── urls.py           # Updated: catch-all route
├── staticfiles/          # Collected static files
└── deploy_react.sh       # Build & deploy script
```

## Troubleshooting

### Static Files Not Loading
```bash
python manage.py collectstatic --noinput
```

### React Build Fails
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

## Notes
- The old template views in `invoices/urls.py` are bypassed
- Django still serves the admin panel at `/admin/`
- API endpoints work exactly as before
- React handles all client-side routing

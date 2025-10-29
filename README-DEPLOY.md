# 🚀 Tuentis - Aplicación Compilada

Esta es la versión compilada y lista para producción de Tuentis.

## 📦 Contenido

- `dist/` - Aplicación compilada y optimizada
- Todos los archivos están minificados y optimizados para producción
- Console.log removidos automáticamente
- Headers de seguridad incluidos

## 🌐 Deployment

### Servidor Web (Nginx/Apache)
```bash
# Servir archivos desde la carpeta dist/
# Configurar el document root hacia: /ruta/a/este/repo/dist/
```

### Hosting Estático
- Subir contenido de `dist/` a tu hosting
- Configurar redirects para SPA (Single Page Application)

## 🔧 Configuración Requerida

### Variables de Entorno (en tu servidor)
```
VITE_API_BASE_URL=https://tu-api.com
VITE_APP_NAME=Tuentis  
VITE_APP_VERSION=1.0.0
```

### Nginx Config Mínima
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    root /ruta/a/este/repo/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---
**⚡ Aplicación optimizada y segura - Lista para producción**
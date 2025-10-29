# 🔒 Guía de Seguridad - Tuenti

## ⚠️ IMPORTANTE: Configuración de Producción

### Variables de Entorno Seguras

#### Desarrollo Local
- Las credenciales están en `src/lib/config.ts` solo para desarrollo
- **NUNCA** subir este archivo con credenciales reales a producción

#### Producción
Para despliegue en producción, configurar las siguientes variables de entorno en el servidor:

```bash
# Variables del servidor (NO expuestas al cliente)
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_clave_anonima
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio

# Variables públicas (expuestas al cliente)
VITE_API_BASE_URL=/api
VITE_APP_NAME=Tuenti
VITE_APP_VERSION=1.0.0
```

### Configuración del Servidor de Producción

1. **Proxy para Supabase**: Configurar un proxy en tu servidor web para ocultar las credenciales:

```nginx
# Ejemplo para Nginx
location /api/supabase/ {
    proxy_pass https://tu-proyecto.supabase.co/;
    proxy_set_header Authorization "Bearer $SUPABASE_ANON_KEY";
    proxy_set_header Content-Type "application/json";
}
```

2. **Headers de Seguridad**: Agregar headers de seguridad:

```nginx
add_header X-Frame-Options "DENY";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
```

### Lista de Verificación de Seguridad

- [ ] Variables sensibles movidas fuera de archivos VITE_
- [ ] Archivo .env.server no incluido en git
- [ ] Headers de seguridad configurados
- [ ] CORS configurado correctamente
- [ ] Dependencias actualizadas sin vulnerabilidades
- [ ] Console.log removidos en producción
- [ ] HTTPS habilitado
- [ ] Certificados SSL válidos

### Archivos Sensibles (NO subir a git)

- `.env.server`
- `.env.production`
- `.env.local` (si contiene datos sensibles)
- Cualquier archivo con credenciales reales

### Contacto de Seguridad

Si encuentras una vulnerabilidad de seguridad, por favor reporta a: [tu-email-de-seguridad]
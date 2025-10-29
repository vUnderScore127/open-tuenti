# 🚀 Guía de Desarrollo - Tuentis

## 📋 Mejores Prácticas de Desarrollo

### 🐛 **Debugging y Logging**

#### ✅ **Recomendado para Desarrollo:**
```typescript
// Usar console.log para debugging local
console.log('Debug info:', data);
console.warn('Warning:', warning);
console.error('Error:', error);

// Usar debugger para breakpoints
debugger;
```

#### ❌ **Evitar en Producción:**
- Los `console.log` se remueven automáticamente en builds de producción
- Los `debugger` statements también se eliminan automáticamente

#### 🔧 **Logging Estructurado (Recomendado):**
```typescript
// Para logging que necesite persistir en producción
const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, data);
    }
    // Aquí podrías enviar a un servicio de logging
  },
  error: (message: string, error?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ERROR] ${message}`, error);
    }
    // Enviar errores a servicio de monitoreo
  }
};
```

### 🏗️ **Scripts de Build**

#### **Desarrollo:**
```bash
npm run dev          # Servidor de desarrollo
```

#### **Producción:**
```bash
npm run build        # Build estándar
npm run build:prod   # Build optimizado para producción
npm run build:clean  # Limpia cache y hace build de producción
```

#### **Verificación:**
```bash
npm run preview      # Preview del build
npm run lint         # Verificar código
npm run test.unit    # Tests unitarios
```

### 🔒 **Seguridad en Desarrollo**

#### **Variables de Entorno:**
- ✅ Usar `.env.local` para desarrollo
- ✅ Usar `.env.server` para credenciales sensibles
- ❌ NUNCA commitear archivos `.env` con credenciales

#### **Archivos Sensibles:**
```
.env.local
.env.server
.env.production
.env.staging
*.env.local
```

### 📦 **Optimización de Build**

#### **Chunks Automáticos:**
- `vendor`: React y React-DOM
- `supabase`: Cliente de Supabase
- Chunks dinámicos por rutas

#### **Optimizaciones Aplicadas:**
- ✅ Remoción automática de `console.log` y `debugger`
- ✅ Minificación con esbuild
- ✅ Tree shaking automático
- ✅ Compresión gzip
- ✅ Code splitting

### 🛡️ **Headers de Seguridad**

Los siguientes headers están configurados automáticamente:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

### 📝 **Convenciones de Código**

#### **Estructura de Archivos:**
```
src/
├── components/     # Componentes reutilizables
├── pages/         # Páginas/rutas
├── lib/           # Utilidades y configuración
├── hooks/         # Custom hooks
├── contexts/      # React contexts
└── styles/        # Estilos globales
```

#### **Naming Conventions:**
- Componentes: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Utilidades: `camelCase.ts`
- Estilos: `kebab-case.css`

### 🚀 **Deployment**

#### **Antes del Deploy:**
1. `npm run build:clean`
2. `npm run test.unit`
3. `npm run lint`
4. Verificar que no hay console.log en dist/

#### **Configuración del Servidor:**
- Usar `nginx.conf.example` como base
- Configurar variables de entorno del servidor
- Habilitar HTTPS y headers de seguridad

---

## 🔧 **Comandos Útiles**

```bash
# Limpiar cache y dependencias
npm run clean

# Reinstalar dependencias
rm -rf node_modules package-lock.json && npm install

# Verificar vulnerabilidades
npm audit

# Actualizar dependencias
npm update
```

---

**📚 Para más información, consulta:**
- `SECURITY.md` - Guía de seguridad
- `nginx.conf.example` - Configuración del servidor
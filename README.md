# Tuentis - Red Social

Una aplicación web moderna inspirada en Tuenti, desarrollada con React, TypeScript y Vite.

## 🚀 Demo en Vivo

La aplicación está desplegada automáticamente en GitHub Pages: [Ver Demo](https://tu-usuario.github.io/tuentis-ionic/)

## 🛠️ Tecnologías

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** CSS personalizado + Tailwind CSS
- **Backend:** Supabase
- **Deployment:** GitHub Pages + GitHub Actions

## 📦 Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/tuentis-ionic.git
cd tuentis-ionic

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Compilar para producción
npm run build:prod
```

## 🔧 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build:prod` - Compilación optimizada para producción
- `npm run preview` - Vista previa de la compilación
- `npm run lint` - Verificar código con ESLint
- `npm run clean` - Limpiar archivos de compilación

## 🚀 Deployment

El proyecto se despliega automáticamente en GitHub Pages cuando se hace push a la rama `main`. 

### Configuración Manual

Si prefieres desplegar manualmente:

```bash
npm run build:prod
# Subir el contenido de la carpeta 'dist' a tu hosting
```

## 🔒 Seguridad

- ✅ Variables de entorno protegidas
- ✅ Eliminación automática de console.log en producción
- ✅ Headers de seguridad configurados
- ✅ Dependencias auditadas (0 vulnerabilidades)

## 📁 Estructura del Proyecto

```
src/
├── components/     # Componentes reutilizables
├── pages/         # Páginas de la aplicación
├── lib/           # Configuración y utilidades
├── styles/        # Estilos CSS
└── contexts/      # Contextos de React
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
// Configuración segura para el cliente
export const config = {
  // Variables públicas (seguras para el cliente)
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  appName: import.meta.env.VITE_APP_NAME || 'Tuenti',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Para desarrollo local, usamos las credenciales directamente
  // En producción, estas deberían venir del servidor
  isDevelopment: import.meta.env.DEV,
  
  // URLs de desarrollo (solo para desarrollo local)
  dev: {
    supabaseUrl: 'https://rsnefonhngnphthcoegh.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbmVmb25obmducGh0aGNvZWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDkyMzYsImV4cCI6MjA3NzMyNTIzNn0.Z1i8FpUdg8rRUyRryRNnLKKZ09FXLMCXtn9GzbWPWH0'
  }
}

// Función para obtener la configuración de Supabase
export function getSupabaseConfig() {
  if (config.isDevelopment) {
    // En desarrollo, usar credenciales directas
    return {
      url: config.dev.supabaseUrl,
      anonKey: config.dev.supabaseAnonKey
    }
  } else {
    // Para GitHub Pages y hosting estático, usar las mismas credenciales
    // En un entorno de producción real, estas vendrían del servidor
    console.warn('⚠️ Usando credenciales de desarrollo en producción estática (GitHub Pages)')
    return {
      url: config.dev.supabaseUrl,
      anonKey: config.dev.supabaseAnonKey
    }
  }
}
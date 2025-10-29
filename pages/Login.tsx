import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { authService, useAuth } from '@/lib/auth'
import { User, MapPin, Smartphone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import EmailVerificationBanner from '@/components/EmailVerificationBanner'

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [userEmail, setUserEmail] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [showBanner, setShowBanner] = useState(true)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      await authService.signIn(email, password)
      
      // Guardar email para mostrar en pantalla de carga
      setUserEmail(email)
      
      // Mostrar pantalla de carga
      setShowLoadingScreen(true)
      
      // Simular progreso de carga más rápido
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            // Forzar recarga de la página para actualizar el estado
            window.location.href = '/'
            return 100
          }
          return prev + 2
        })
      }, 90)
      
      toast({
        title: '¡Bienvenido a Tuentis!',
        description: 'Has iniciado sesión correctamente.',
      })
    } catch (error: any) {
      toast({
        title: 'Error al iniciar sesión',
        description: error.message,
        variant: 'destructive',
      })
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor, introduce tu email.',
        variant: 'destructive',
      })
      return
    }

    setIsResetting(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
      })

      if (error) throw error

      toast({
        title: 'Email enviado',
        description: 'Revisa tu bandeja de entrada para restablecer tu contraseña.',
      })
      
      setShowResetPassword(false)
      setResetEmail('')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsResetting(false)
    }
  }

  // Pantalla de carga
  if (showLoadingScreen) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Banner de verificación de email */}
        {user && showBanner && (
          <EmailVerificationBanner onClose={() => setShowBanner(false)} />
        )}
        
        {/* Header con texto de carga */}
        <div className="p-4">
          <div className="text-black text-sm">
            Cargando <span className="font-bold">{userEmail}</span> <span className="font-bold">{loadingProgress}%</span>
          </div>
        </div>
        
        {/* Barra de progreso con borde grisáceo */}
        <div className="px-4">
          <div className="w-60 bg-gray-200 h-3 border border-gray-300" style={{ borderRadius: '0' }}>
            <div 
              className="h-3 ease-linear" 
              style={{
                backgroundColor: '#4E7BA8',
                width: `${loadingProgress}%`,
                borderRadius: '0',
                transition: 'width 0.17s linear'
              }}
            ></div>
          </div>
        </div>
        
        {/* Contenido principal - placeholder para cumpleaños */}
        {/* Contenido principal - cumpleaños estilo Tuenti */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            {/* Mensaje de cumpleaños estilo Tuenti más grande */}
            <div className="bg-white p-8 rounded-lg shadow-sm max-w-4xl mx-auto border border-gray-200">
              <div className="flex items-start space-x-6">
                {/* Icono de Tuenti más grande */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">t</span>
                  </div>
                </div>
                
                {/* Contenido del mensaje más grande */}
                <div className="flex-1 text-left">
                  <p className="text-gray-700 text-lg leading-relaxed">
                    En los próximos días cumplen años <strong>Nuria Montero</strong> y <strong>Beatriz Blanco González</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Modal de restablecimiento de contraseña
  if (showResetPassword) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Restablecer contraseña
          </h2>
          
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Introduce tu email"
                required
                disabled={isResetting}
                className="w-full"
              />
            </div>
            
            <div className="flex space-x-3">
              <Button
                type="button"
                onClick={() => setShowResetPassword(false)}
                variant="outline"
                className="flex-1"
                disabled={isResetting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isResetting}
              >
                {isResetting ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700">
      {/* Banner de verificación de email */}
      {user && showBanner && (
        <EmailVerificationBanner onClose={() => setShowBanner(false)} />
      )}
      
      {/* Header - Eliminar completamente o simplificar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center text-white text-sm">
        <div className="flex space-x-4">
        </div>
        <div className="flex space-x-4">
        </div>
      </div>

      {/* Login Form - Mover más arriba y ajustar posicionamiento */}
      <div className="absolute top-6 right-8">
        <form onSubmit={handleLogin} className="flex items-center space-x-3">
          <Input
            name="email"
            type="email"
            placeholder="Email"
            required
            disabled={isLoading}
            className="w-40 h-8 bg-white/90 border-none text-gray-800 text-sm placeholder:text-gray-500 rounded-sm"
          />
          <Input
            name="password"
            type="password"
            placeholder="Contraseña"
            required
            disabled={isLoading}
            className="w-40 h-8 bg-white/90 border-none text-gray-800 text-sm placeholder:text-gray-500 rounded-sm"
          />
          <Button 
            type="submit" 
            disabled={isLoading}
            className="h-8 px-4 text-white text-sm font-medium border-none hover:opacity-90 rounded-sm" 
            style={{backgroundColor: '#1r4pd9'}}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        
        {/* Recordarme y Olvidaste contraseña - Posicionamiento absoluto con texto más grande */}
        <div className="mt-2 text-sm relative">
          <div className="flex items-center space-x-1">
            <input type="checkbox" id="remember" className="w-3 h-3" />
            <label htmlFor="remember" className="text-white">Recordarme</label>
          </div>
          <div className="absolute top-0 left-44">
            <button
              onClick={() => setShowResetPassword(true)}
              className="text-white hover:underline bg-none border-none cursor-pointer"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>
        
        {/* Register Link con texto más grande */}
        {/* Barra separadora original de Tuenti */}
        {/* Barra separadora más fina y gris blanca */}
        <div className="mt-1" style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.3)',
          marginTop: '5px'
        }}>
          <div style={{
            paddingTop: '5px',
            textAlign: 'right'
          }}>
            <button 
              onClick={() => navigate('/invitation')}
              className="text-white text-sm hover:underline"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                fontWeight: 'normal'
              }}
            >
              ¿Quieres una cuenta?
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen px-8">
        <div className="max-w-4xl mx-auto text-center text-white">
          {/* Logo */}
          <div className="mb-12">
            <h1 className="text-6xl font-bold mb-4 flex items-center justify-center">
              <span className="bg-white rounded-full w-16 h-16 flex items-center justify-center mr-4 text-blue-600">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 12 Q10 10 12 12 Q10 14 8 12" fill="currentColor"/>
                  <path d="M20 12 Q22 10 24 12 Q22 14 20 12" fill="currentColor"/>
                  <path d="M10 18 Q16 24 22 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
              tuentis
            </h1>
          </div>

          {/* Description */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-4">¿Qué es Tuenties?</h2>
            <p className="text-lg leading-relaxed max-w-2xl mx-auto">
              Tuenties es una plataforma social privada, a la que solo
              se accede únicamente por invitación. Cada día la
              usan millones de personas para comunicarse
              entre ellas y compartir información.
            </p>
          </div>

          {/* Features - Más fiel al original */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-3">Social</h3>
              <p className="text-sm leading-relaxed opacity-90">
                Conecta con tus amigos de forma segura y divertida.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-3">Local</h3>
              <p className="text-sm leading-relaxed opacity-90">
                Descubre eventos y lugares cerca de ti.<br/>
                Conecta con tu comunidad local.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-3">Móvil</h3>
              <p className="text-sm leading-relaxed opacity-90">
                Accede desde cualquier dispositivo.<br/>
                Tu red social siempre contigo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex justify-between items-center text-white text-sm">
          <div className="flex items-center space-x-6">
            <span>© Tuenties 2025</span>
            <span className="font-semibold">Castellano</span>
            <div className="flex space-x-2">
              <a href="#" className="hover:underline">Català</a>
              <a href="#" className="hover:underline">English</a>
              <a href="#" className="hover:underline">Euskera</a>
              <a href="#" className="hover:underline">Galego</a>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <a href="#" className="hover:underline">Acerca de</a>
            <a href="#" className="hover:underline">Empleo</a>
            <a href="#" className="hover:underline">Anúnciate</a>
            <a href="#" className="hover:underline">Prensa</a>
            <a href="#" className="hover:underline">Blog</a>
            <a href="#" className="hover:underline">Desarrolladores</a>
            <a href="#" className="hover:underline">Ayuda</a>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { emailVerificationService } from '@/lib/emailVerificationService'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  
  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      setMessage('Token de verificación no válido')
      return
    }
    
    verifyEmail(token)
  }, [searchParams])
  
  const verifyEmail = async (token: string) => {
    try {
      const success = await emailVerificationService.verifyEmail(token)
      
      if (success) {
        setStatus('success')
        setMessage('¡Email verificado correctamente!')
        
        // Redirigir al dashboard después de 3 segundos
        setTimeout(() => {
          navigate('/')
        }, 3000)
      } else {
        setStatus('error')
        setMessage('Token de verificación inválido o expirado')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Error al verificar el email')
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verificando email...</h2>
            <p className="text-gray-600">Por favor espera mientras verificamos tu email.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Email verificado!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Serás redirigido automáticamente...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error de verificación</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Volver al inicio de sesión
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
import React from 'react'
import { useAlert } from '../../contexts/AlertContext'

export const GlobalAlert: React.FC = () => {
  const { state, closeAlert } = useAlert()
  const isVisible = state.visible && !!state.message

  return (
    <div className={`global-alert-wrapper ${isVisible ? 'show' : ''}`} aria-live="polite" aria-atomic="true">
      {isVisible && (
        <div className="global-alert" role="alert">
          <span className="global-alert__text">{state.message}</span>
          <button className="global-alert__close" onClick={closeAlert} aria-label="Cerrar alerta">
            ×
          </button>
        </div>
      )}
    </div>
  )
}

export default GlobalAlert
import React from 'react'
import '../styles/tuenti-login.css'

export default function NeedInvite() {
  return (
    <div className="nSplash">
      <div className="need-invite-container">
        <div className="need-invite-panel">
          <div className="tuenti-logo">
            <img src="/open-tuenti/Logo_tuenti_positivo_color.png" alt="Tuenti" />
          </div>
          
          <h1 className="need-invite-title">Consigue una cuenta en Tuenti</h1>
          
          <p className="need-invite-description">
            Tuenti es una plataforma social privada. Puedes registrarte a través de una invitación.
            Para descubrir si alguno de tus amigos tiene una cuenta en Tuenti y pedirles una 
            invitación, puedes seguir estos sencillos pasos:
          </p>

          <div className="need-invite-steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-text">
                Importa tu lista de contactos de Hotmail, Gmail o Yahoo! pinchando en el 
                siguiente botón.
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-text">
                Buscaremos para ver si alguno de tus contactos tiene una cuenta en Tuenti.
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-text">
                Si encontramos alguna coincidencia, les comunicaremos a esos usuarios que 
                quieres una invitación. Si deciden enviártela, ¡podrás crear tu cuenta en Tuenti!
              </div>
            </div>
          </div>

          <div className="need-invite-button-container">
            <button className="need-invite-button">Empezar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
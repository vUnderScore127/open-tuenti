import React from 'react'
import '../styles/tuenti-login.css'
import '../styles/tuenti-forms.css'
import '../styles/tuenti-signup.css'

export default function NeedInvite() {
  return (
    <div className="nSplash signup-page">
      <div className="signup">
        <h2 className="signup-title">Consigue una cuenta en Tuenti</h2>
        <p className="signup-subtitle">
          Tuenti es una plataforma social privada. Puedes registrarte a través de una invitación.
          Para descubrir si alguno de tus amigos tiene una cuenta en Tuenti y pedirles una invitación,
          puedes seguir estos sencillos pasos:
        </p>

        <ol className="signup-steps">
          <li>
            Importa tu lista de contactos de Hotmail, Gmail o Yahoo! pinchando en el siguiente botón.
          </li>
          <li>
            Buscaremos para ver si alguno de tus contactos tiene una cuenta en Tuenti.
          </li>
          <li>
            Si encontramos alguna coincidencia, les comunicaremos a esos usuarios que quieres una invitación.
            Si deciden enviártela, ¡podrás crear tu cuenta en Tuenti!
          </li>
        </ol>

        <div className="form-row" style={{ textAlign: 'center' }}>
          <a href="/open-tuenti/login" className="btn-primary" style={{ display: 'inline-block', padding: '8px 16px' }}>
            Empezar
          </a>
        </div>
      </div>
    </div>
  )
}
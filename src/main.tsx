import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// En desarrollo, React.StrictMode duplica renders y efectos intencionalmente.
// Lo desactivamos para evitar dobles suscripciones y llamadas que parecen "refresh".
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
);
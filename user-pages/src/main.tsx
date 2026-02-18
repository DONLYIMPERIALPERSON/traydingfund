import React from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@descope/react-sdk'
import App from './App'
import './styles/global.css'

const descopeProjectId = import.meta.env.VITE_DESCOPE_PROJECT_ID ?? ''

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(
    <AuthProvider projectId={descopeProjectId}>
      <App />
    </AuthProvider>,
  )
}
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import React from 'react'
import { AuthProvider } from '@descope/react-sdk'
import { BrowserRouter } from 'react-router-dom'

const descopeProjectId = import.meta.env.VITE_DESCOPE_PROJECT_ID ?? ''

createRoot(document.getElementById('root')! as HTMLElement).render(
    <AuthProvider projectId={descopeProjectId}>
        <React.StrictMode>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </React.StrictMode>
    </AuthProvider>
)

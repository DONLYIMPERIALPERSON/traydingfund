import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@descope/react-sdk'
import './index.css'
import App from './App.tsx'
import AppMock from './AppMock'

const descopeProjectId = import.meta.env.VITE_DESCOPE_PROJECT_ID ?? ''
const shouldUseMock = !descopeProjectId || import.meta.env.VITE_ADMIN_USE_MOCK === 'true'

createRoot(document.getElementById('root')!).render(
  shouldUseMock ? (
    <AppMock />
  ) : (
    <AuthProvider projectId={descopeProjectId}>
      <App />
    </AuthProvider>
  ),
)

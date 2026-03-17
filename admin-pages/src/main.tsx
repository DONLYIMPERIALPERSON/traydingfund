import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppMock from './AppMock'

const shouldUseMock = import.meta.env.VITE_ADMIN_USE_MOCK === 'true'

createRoot(document.getElementById('root')!).render(
  shouldUseMock ? (
    <AppMock />
  ) : (
    <App />
  ),
)

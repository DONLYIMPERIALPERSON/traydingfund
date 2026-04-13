import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'
import './styles/Home.css'
import { Analytics } from '@vercel/analytics/react'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(
    <>
      <App />
      <Analytics />
    </>,
  )
}
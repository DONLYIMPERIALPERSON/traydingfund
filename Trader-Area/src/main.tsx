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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (registration.waiting) {
        window.dispatchEvent(new Event('pwa:update-available'))
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new Event('pwa:update-available'))
          }
        })
      })
    }).catch((error) => {
      console.error('Service worker registration failed:', error)
    })
  })
}
import { QueryClientProvider } from '@tanstack/react-query'
import { APIProvider } from '@vis.gl/react-google-maps'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { AuthProvider } from 'src/lib/auth'
import { store } from 'src/lib/store'
import './index.css'
import { queryClient } from './lib/api/base'
import { Router } from './router'

const container = document.getElementById('root')
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_API_KEY}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </APIProvider>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
)

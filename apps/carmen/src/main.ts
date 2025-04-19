import './index.css'
import App from './App.svelte'

// Get the app element from the DOM
const appElement = document.getElementById('app')
if (!appElement) {
  throw new Error('Failed to find app container element')
}

// Initialize the Svelte app
const app = new App({
  target: appElement,
})

export default app

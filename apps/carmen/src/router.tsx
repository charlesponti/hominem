import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './routes'
import routerConfig from '../react-router.config'

export const Router = () => {
  const router = createBrowserRouter(routes, routerConfig)
  return <RouterProvider router={router} fallbackElement={<div>Loading...</div>} />
}

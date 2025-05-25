'use client'

import { Navigate } from 'react-router'

export default function BanksPage() {
  // Redirect to accounts page since bank connections have been merged there
  return <Navigate to="/accounts" replace />
}

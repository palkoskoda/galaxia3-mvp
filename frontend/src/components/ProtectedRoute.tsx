import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import LoadingSpinner from './LoadingSpinner'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, token } = useAuthStore()

  // Check if we have a token but auth state hasn't been initialized yet
  const hasToken = !!localStorage.getItem('galaxia_token')
  
  // If we have a token but isAuthenticated is false, we're still loading
  if (hasToken && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

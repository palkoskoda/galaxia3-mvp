import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'

// Layout
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import HomePage from './pages/HomePage'
import MenuPage from './pages/MenuPage'
import MyPlanPage from './pages/MyPlanPage'
import HistoryPage from './pages/HistoryPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminMenu from './pages/admin/AdminMenu'
import AdminDailySummary from './pages/admin/AdminDailySummary'
import AdminUsers from './pages/admin/AdminUsers'

function App() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Public routes */}
        <Route index element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected customer routes */}
        <Route path="/menu" element={
          <ProtectedRoute>
            <MenuPage />
          </ProtectedRoute>
        } />
        <Route path="/moj-plan" element={
          <ProtectedRoute>
            <MyPlanPage />
          </ProtectedRoute>
        } />
        <Route path="/historia" element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        } />
        <Route path="/profil" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        
        {/* Admin routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/menu" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminMenu />
          </ProtectedRoute>
        } />
        <Route path="/admin/suviska" element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <AdminDailySummary />
          </ProtectedRoute>
        } />
        <Route path="/admin/pouzivatelia" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App

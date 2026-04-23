import { useEffect, useState } from 'react'
import { adminApi } from '../../services/api'
import { Search, Users, UserCheck, UserX, Edit2 } from 'lucide-react'
import LoadingSpinner from '../../components/LoadingSpinner'
import type { User } from '../../types'

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')

  useEffect(() => {
    loadUsers()
  }, [roleFilter])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const response = await adminApi.getUsers({
        role: roleFilter || undefined,
        search: searchTerm || undefined,
      })
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadUsers()
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="badge-red">Admin</span>
      case 'staff':
        return <span className="badge-blue">Personál</span>
      default:
        return <span className="badge-green">Zákazník</span>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Správa používateľov</h1>
          <p className="text-gray-600 mt-2">
            Zoznam a správa používateľov systému.
          </p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Hľadať podľa mena alebo emailu..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10"
                  />
                </div>
                <button type="submit" className="btn-primary">
                  Hľadať
                </button>
              </form>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input w-full sm:w-48"
              >
                <option value="">Všetky role</option>
                <option value="customer">Zákazníci</option>
                <option value="staff">Personál</option>
                <option value="admin">Administrátori</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users table */}
        <div className="card">
          <div className="card-header border-b border-gray-200">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">
                Používatelia ({users.length})
              </h2>
            </div>
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-medium text-gray-500">Meno</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-500">Email</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-500">Telefón</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-500">Adresa</th>
                      <th className="text-center py-3 text-sm font-medium text-gray-500">Rola</th>
                      <th className="text-center py-3 text-sm font-medium text-gray-500">Stav</th>
                      <th className="text-right py-3 text-sm font-medium text-gray-500">Akcie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-3">
                          <div className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                        </td>
                        <td className="py-3 text-gray-600">{user.email}</td>
                        <td className="py-3 text-gray-600">{user.phone || '-'}</td>
                        <td className="py-3 text-gray-600 max-w-xs truncate">{user.address || '-'}</td>
                        <td className="py-3 text-center">{getRoleBadge(user.role)}</td>
                        <td className="py-3 text-center">
                          {user.isActive ? (
                            <span className="flex items-center justify-center text-green-600">
                              <UserCheck className="w-4 h-4 mr-1" />
                              Aktívny
                            </span>
                          ) : (
                            <span className="flex items-center justify-center text-red-600">
                              <UserX className="w-4 h-4 mr-1" />
                              Neaktívny
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button className="text-blue-600 hover:text-blue-800">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          Žiadni používatelia neboli nájdení
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react'
import { adminApi } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboardStats,
  })

  if (isLoading) {
    return <LoadingSpinner />
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${stats?.data?.totalRevenue?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Orders',
      value: stats?.data?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Today\'s Revenue',
      value: `$${stats?.data?.todayRevenue?.toFixed(2) || '0.00'}`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Today\'s Orders',
      value: stats?.data?.todayOrders || 0,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <div key={stat.title} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-500 text-center py-8">
              Recent orders will appear here
            </p>
          </div>
        </div>

        {/* Popular Items */}
        <div className="mt-8 bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Popular Items</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-500 text-center py-8">
              Popular items will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
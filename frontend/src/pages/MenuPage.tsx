import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Filter } from 'lucide-react'
import { menuApi } from '../services/api'
import { useCartStore } from '../stores/cartStore'
import LoadingSpinner from '../components/LoadingSpinner'
import type { MenuItem, Category } from '../types'

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const { addItem } = useCartStore()

  const { data: menuItems, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', selectedCategory, searchTerm],
    queryFn: () => menuApi.getMenu({ 
      category: selectedCategory || undefined,
      search: searchTerm || undefined 
    }),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: menuApi.getCategories,
  })

  const handleAddToCart = (item: MenuItem) => {
    addItem(item)
  }

  if (menuLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Menu</h1>
          <p className="text-gray-600">Discover our delicious offerings</p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search menu items..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories?.data?.map((category: Category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems?.data?.map((item: MenuItem) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{item.name}</h3>
                  <span className="text-lg font-bold text-primary-600">
                    ${item.price.toFixed(2)}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {item.description}
                </p>

                {item.dietaryTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.dietaryTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {item.preparationTime} min
                  </span>
                  
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.isAvailable}
                    className="flex items-center space-x-1 bg-primary-600 text-white px-3 py-2 rounded-md text-sm hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>{item.isAvailable ? 'Add to Cart' : 'Unavailable'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {menuItems?.data?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No menu items found</p>
          </div>
        )}
      </div>
    </div>
  )
}
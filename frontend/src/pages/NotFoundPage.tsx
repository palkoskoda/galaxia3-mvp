import { Link } from 'react-router-dom'
import { Home, AlertTriangle } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-12 h-12 text-yellow-600" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Stránka nenájdená
        </h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Prepáčte, ale stránka ktorú hľadáte neexistuje alebo bola presunutá.
        </p>
        <Link
          to="/"
          className="inline-flex items-center btn-primary"
        >
          <Home className="w-4 h-4 mr-2" />
          Späť na domov
        </Link>
      </div>
    </div>
  )
}

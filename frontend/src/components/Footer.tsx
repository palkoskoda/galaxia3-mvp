export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="text-lg font-bold text-white">Galaxia Obedy 3.0</span>
            <p className="text-sm text-gray-400 mt-1">
              Inteligentný systém pre plánovanie dodávok obedov
            </p>
          </div>
          <div className="text-sm text-gray-400">
            © {new Date().getFullYear()} Galaxia Obedy. Všetky práva vyhradené.
          </div>
        </div>
      </div>
    </footer>
  )
}

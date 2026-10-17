import { Link } from 'react-router-dom'
import Logo from '../Common/Logo'

const PublicNavbar = () => (
  <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost">Sign in</Link>
          <Link to="/register" className="btn-primary">Join free</Link>
        </div>
      </div>
    </div>
  </nav>
)

export default PublicNavbar

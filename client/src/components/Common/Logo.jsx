import { Link } from 'react-router-dom'

const Logo = ({ to = '/', compact = false, className = '' }) => (
  <Link to={to} className={`flex items-center gap-2.5 group ${className}`}>
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 text-white text-sm font-extrabold shadow-sm group-hover:shadow-md transition-shadow">
      DC
    </span>
    {!compact && (
      <span className="text-xl font-extrabold tracking-tight text-slate-900">
        Dev<span className="text-primary-600">Connect</span>
      </span>
    )}
  </Link>
)

export default Logo

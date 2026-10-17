import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FiBell, FiBriefcase, FiLogOut, FiMessageSquare, FiSearch, FiUser, FiUsers, FiX } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { notificationService } from '../../services/notifications'
import { connectionsService } from '../../services/connections'
import { getAvatarUrl } from '../../utils/avatar'
import Logo from '../Common/Logo'

const navLinkClass = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-0.5 min-w-[4.25rem] px-2 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
    isActive ? 'text-primary-700 bg-primary-50' : 'text-slate-500 hover:text-primary-700 hover:bg-slate-50'
  }`

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const menuRef = useRef(null)

  const { data: unreadData } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: notificationService.getUnreadCount,
    refetchInterval: 30000,
  })
  const { data: pendingData } = useQuery({
    queryKey: ['pendingRequests'],
    queryFn: connectionsService.getPendingRequests,
    refetchInterval: 60000,
  })

  const unread = unreadData?.data?.count || 0
  const pending = (pendingData?.data?.data || pendingData?.data || []).length || 0

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false)
        setShowMenu(false)
      }
    }
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false)
    }
    window.addEventListener('keydown', handleEsc)
    window.addEventListener('mousedown', handleClick)
    return () => {
      window.removeEventListener('keydown', handleEsc)
      window.removeEventListener('mousedown', handleClick)
    }
  }, [])

  const handleSearch = (event) => {
    event.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    setSearchQuery('')
    setIsSearchOpen(false)
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-3">
          <Logo />

          <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-xl mx-4">
            <label className="relative block">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search developers, skills, posts…"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:bg-white"
              />
            </label>
          </form>

          <button type="button" onClick={() => setIsSearchOpen(true)} className="md:hidden ml-auto text-slate-600 p-2 rounded-xl hover:bg-slate-100" aria-label="Search">
            <FiSearch size={20} />
          </button>

          <div className="hidden md:flex items-center gap-1 ml-auto">
            <NavLink to="/projects" className={navLinkClass}>
              <FiBriefcase size={20} />
              Projects
            </NavLink>
            <NavLink to="/connections" className={navLinkClass}>
              <span className="relative">
                <FiUsers size={20} />
                {pending > 0 && <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] leading-4 text-center">{pending}</span>}
              </span>
              Network
            </NavLink>
            <NavLink to="/chat" className={navLinkClass}>
              <FiMessageSquare size={20} />
              Messages
            </NavLink>
            <NavLink to="/notifications" className={navLinkClass}>
              <span className="relative">
                <FiBell size={20} />
                {unread > 0 && <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] leading-4 text-center">{unread > 9 ? '9+' : unread}</span>}
              </span>
              Alerts
            </NavLink>
          </div>

          <div className="relative" ref={menuRef}>
            <button type="button" onClick={() => setShowMenu((open) => !open)} className="flex items-center rounded-full ring-2 ring-transparent hover:ring-primary-200 transition">
              <img src={getAvatarUrl(user)} alt={user?.firstName} className="w-10 h-10 rounded-full object-cover" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lift border border-slate-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="font-semibold truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.headline || user?.email}</p>
                </div>
                <Link to="/profile" className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50" onClick={() => setShowMenu(false)}>
                  <FiUser size={16} /> Profile
                </Link>
                <Link to="/profile/edit" className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50" onClick={() => setShowMenu(false)}>
                  <FiUser size={16} /> Edit profile
                </Link>
                <button
                  type="button"
                  onClick={() => { logout(); setShowMenu(false) }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-rose-50 text-rose-600"
                >
                  <FiLogOut size={16} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isSearchOpen && (
        <div className="fixed inset-0 bg-white z-[60] md:hidden">
          <div className="flex items-center gap-2 p-3 border-b">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search developers, skills, posts…"
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
              </div>
            </form>
            <button type="button" onClick={() => setIsSearchOpen(false)} className="p-2 text-slate-500" aria-label="Close search">
              <FiX size={22} />
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar

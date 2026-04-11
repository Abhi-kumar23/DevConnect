import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FiUser, FiLogOut, FiMessageSquare, FiUsers, FiHome, FiSearch, FiBell, FiBriefcase } from 'react-icons/fi'

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false)
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isSearchOpen])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${searchQuery}`)
      setSearchQuery('')
    }
  }

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-primary-600">
              DevConnect
            </Link>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-xl mx-8">
            <form onSubmit={handleSearch} className="relative mt-3">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </form>
          </div>

          {/* Search Bar - Mobile */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsSearchOpen(true)} className="text-gray-600">
              <FiSearch className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-500" />
            </button>
          </div>

          {/* Full Screen Search Modal - Mobile */}
          {isSearchOpen && (
            <div className="fixed inset-0 bg-white z-50 md:hidden">
              <div className="flex items-center p-3 border-b">
                <form onSubmit={handleSearch} className="flex-1">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                      autoFocus
                    />
                  </div>
                </form>
                <button onClick={() => setIsSearchOpen(false)} className="ml-3 text-gray-600 font-medium">
                  Cancel
                </button>
              </div>
              <div className="p-4">
                <p className="text-gray-500 text-sm">Type something to search...</p>
              </div>
            </div>
          )}
          

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">

            <div className="hidden md:flex items-center space-x-6">
              <Link to="/projects" className="flex flex-col items-center justify-center text-gray-600 hover:text-primary-600">
                <FiBriefcase size={22} />
                <span className="text-xs text-center mt-1">Projects</span>
              </Link>
              <Link to="/connections" className="flex flex-col items-center justify-center text-gray-600 hover:text-primary-600">
                <FiUsers size={22} />
                <span className="text-xs text-center mt-1">Connections</span>
              </Link>
              <Link to="/chat" className="flex flex-col items-center justify-center text-gray-600 hover:text-primary-600">
                <FiMessageSquare size={22} />
                <span className="text-xs text-center mt-1">Messages</span>
              </Link>
              <Link to="/notifications" className="flex flex-col items-center justify-center text-gray-600 hover:text-primary-600">
                <FiBell size={22} />
                <span className="text-xs text-center mt-1">Notifications</span>
              </Link>
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center space-x-2 focus:outline-none"
              >
                <img
                  src={user?.avatar || user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=3b82f6&color=fff`}
                  alt={user?.firstName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 border z-50">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100"
                    onClick={() => setShowMenu(false)}
                  >
                    <FiUser size={16} />
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout()
                      setShowMenu(false)
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-gray-100 text-red-600"
                  >
                    <FiLogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiHome, FiUsers, FiMessageSquare, FiBell, FiBriefcase } from 'react-icons/fi'

const BottomNavbar = () => {
    const location = useLocation()

    const navItems = [
        { path: '/', icon: FiHome, label: 'Home' },
        { path: '/connections', icon: FiUsers, label: 'Connections' },
        { path: '/projects', icon: FiBriefcase, label: 'Projects' },
        { path: '/notifications', icon: FiBell, label: 'Notifications' },
        { path: '/chat', icon: FiMessageSquare, label: 'Messages' },
    ]

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t shadow-lg z-50 safe-bottom">
            <div className="flex justify-around items-center max-w-md mx-auto px-2 py-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-all duration-200 active:scale-95 ${
                                isActive
                                    ? 'text-primary-600'
                                    : 'text-gray-500 hover:text-primary-600'
                            }`}
                        >
                            <item.icon size={20} />
                            <span className="text-[11px] text-center mt-1 font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

export default BottomNavbar
// src/components/Layout/BottomNavbar.jsx
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
            <div className="flex justify-around items-center py-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
                                isActive
                                    ? 'text-primary-600'
                                    : 'text-gray-500 hover:text-primary-600'
                            }`}
                        >
                            <item.icon size={22} />
                            <span className="text-xs text-center mt-1">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

export default BottomNavbar
import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import MobileNavbar from './MobileNavbar'

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </div>
      <MobileNavbar />
    </div>
  )
}

export default Layout
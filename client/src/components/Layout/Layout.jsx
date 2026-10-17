import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import MobileNavbar from './MobileNavbar'

const Layout = () => {
  const { pathname } = useLocation()
  const immersive = pathname === '/chat' || pathname.startsWith('/chat/') || pathname.includes('/chat')

  return (
    <div className={`min-h-screen ${immersive ? 'h-dvh overflow-hidden' : 'pb-20 md:pb-0'}`}>
      <Navbar />
      {immersive ? (
        <div className="h-[calc(100dvh-4rem)]">
          <Outlet />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </div>
      )}
      {!immersive && <MobileNavbar />}
    </div>
  )
}

export default Layout

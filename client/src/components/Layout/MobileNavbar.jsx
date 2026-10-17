import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FiBell, FiBriefcase, FiHome, FiMessageSquare, FiUsers } from 'react-icons/fi'
import { notificationService } from '../../services/notifications'
import { connectionsService } from '../../services/connections'

const MobileNavbar = () => {
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

  const items = [
    { to: '/', icon: FiHome, label: 'Home', end: true },
    { to: '/connections', icon: FiUsers, label: 'Network', badge: pending },
    { to: '/projects', icon: FiBriefcase, label: 'Projects' },
    { to: '/notifications', icon: FiBell, label: 'Alerts', badge: unread },
    { to: '/chat', icon: FiMessageSquare, label: 'Chat' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md safe-bottom">
      <div className="flex justify-around items-center max-w-lg mx-auto px-1 py-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-3 rounded-xl min-w-[3.5rem] transition ${
                isActive ? 'text-primary-700' : 'text-slate-500'
              }`
            }
          >
            <span className="relative">
              <item.icon size={21} />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] leading-4 text-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </span>
            <span className="text-[11px] mt-1 font-semibold">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default MobileNavbar

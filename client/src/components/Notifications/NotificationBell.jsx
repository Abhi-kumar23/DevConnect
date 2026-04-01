import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiBell } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import { notificationService } from '../../services/notifications'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false)
    const queryClient = useQueryClient()

    const { data: notificationsData, isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: notificationService.getNotifications,
        refetchInterval: 30000, // Refetch every 30 seconds
    })

    const { data: unreadCountData } = useQuery({
        queryKey: ["unreadCount"],
        queryFn: notificationService.getUnreadCount,
        refetchInterval: 30000,
    })

    const markAsReadMutation = useMutation({
        mutationFn: notificationService.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
            queryClient.invalidateQueries({ queryKey: ["unreadCount"] })
        },
    })

    const notifications = notificationsData?.data?.data || notificationsData?.data || []
    const unreadCount = unreadCountData?.data?.count || 0
    

    const handleNotificationClick = async (notification) => {
        if (!notification.isRead) {
            await markAsReadMutation.mutateAsync(notification._id)
        }
        if (notification.actionUrl) {
            window.location.href = notification.actionUrl
        }
        setIsOpen(false)
    }

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'like': return '❤️'
            case 'comment': return '💬'
            case 'connection_request': return '👥'
            case 'connection_accept': return '✅'
            case 'message': return '💬'
            default: return '🔔'
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors"
            >
                <FiBell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
                        <div className="p-3 border-b">
                            <h3 className="font-semibold">Notifications</h3>
                        </div>
                        <div className="divide-y">
                            {isLoading ? (
                                <div className="p-4 text-center text-gray-500">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">No notifications</div>
                            ) : (
                                notifications.map((notification) => (
                                    <button
                                        key={notification._id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className="text-xl">{getNotificationIcon(notification.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {formatDistanceToNow(new Date(notification.createdAt))} ago
                                                </p>
                                            </div>
                                            {!notification.isRead && (
                                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default NotificationBell
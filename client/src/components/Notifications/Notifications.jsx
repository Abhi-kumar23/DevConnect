import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { notificationService } from '../../services/notifications'
import Loading from '../../components/Common/Loading'

const Notifications = () => {
    const queryClient = useQueryClient()

    const { data: notificationsData, isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: notificationService.getNotifications,
    })

    const markAsReadMutation = useMutation({
        mutationFn: notificationService.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
        }
    })

    const notifications = notificationsData?.data?.data || notificationsData?.data || []

    const handleNotificationClick = async (notification) => {
        if (!notification.isRead) {
            await markAsReadMutation.mutateAsync(notification._id)
        }
        if (notification.actionUrl) {
            window.location.href = notification.actionUrl
        }
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

    if (isLoading) return <Loading />

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-4 border-b">
                    <h1 className="text-xl font-bold">Notifications</h1>
                </div>

                <div className="divide-y">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <button
                                key={notification._id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50' : ''}`}
                            >
                                <div className="flex items-start space-x-3">
                                    <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                                    <div className="flex-1">
                                        <p className="font-medium">{notification.title}</p>
                                        <p className="text-sm text-gray-600">{notification.message}</p>
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
        </div>
    )
}

export default Notifications
// src/pages/Chat.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { chatService } from '../services/chat'
import io from 'socket.io-client'
import Loading from '../components/Common/Loading'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'

const Chat = () => {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [socket, setSocket] = useState(null)
    const [selectedChat, setSelectedChat] = useState(null)
    const [messages, setMessages] = useState([])
    const [messageText, setMessageText] = useState('')
    const messagesEndRef = useRef(null)
    const chatCreatedRef = useRef(false)

    // Get userId from URL
    const [searchParams] = useSearchParams()
    const userId = searchParams.get('userId')

    // Get chats
    const { data: chatsResponse, isLoading, error } = useQuery({
        queryKey: ["chats"],
        queryFn: chatService.getChats,
    })

    // Extract the actual chats array from the response
    const chats = chatsResponse?.data?.data || chatsResponse?.data || []

    console.log('Chats response:', chatsResponse)
    console.log('Extracted chats:', chats)

    // Create or open chat when userId is present in URL
    // Create or open chat when userId is present in URL
    useEffect(() => {
        const createOrOpenChat = async () => {
            // Only run once
            if (chatCreatedRef.current) return
            if (!userId || !user?._id || userId === user._id) return

            chatCreatedRef.current = true

            try {
                // Check if chat already exists in current chats
                const existingChat = chats.find(chat =>
                    chat.participants?.some(p => p._id === userId)
                )

                if (existingChat) {
                    setSelectedChat(existingChat)
                } else {
                    // Create new chat
                    const response = await chatService.createChat(userId)
                    const newChat = response?.data?.data
                    if (newChat) {
                        setSelectedChat(newChat)
                        // Refresh chats list
                        queryClient.invalidateQueries({ queryKey: ["chats"] })
                    }
                }
                // Remove userId from URL
                window.history.replaceState({}, '', '/chat')
            } catch (error) {
                console.error('Error creating chat:', error)
                toast.error('Could not start chat')
                chatCreatedRef.current = false // Reset on error
            }
        }

        createOrOpenChat()
    }, [userId, user, chats, queryClient])

    // Get messages when chat is selected
    const { data: messagesResponse, refetch: refetchMessages } = useQuery({
        queryKey: ["messages", selectedChat?._id],
        queryFn: () => chatService.getMessages(selectedChat?._id),
        enabled: !!selectedChat,
    })

    // Extract messages array
    useEffect(() => {
        if (messagesResponse?.data?.data) {
            setMessages(messagesResponse.data.data)
        } else if (messagesResponse?.data) {
            setMessages(Array.isArray(messagesResponse.data) ? messagesResponse.data : [])
        }
    }, [messagesResponse])

    // Send message mutation
    const sendMutation = useMutation({
        mutationFn: ({ chatId, text }) => chatService.sendMessage(chatId, text),
        onSuccess: (response) => {
            const newMessage = response?.data?.data || response?.data
            if (newMessage) {
                setMessages(prev => [...prev, newMessage])
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
            }
            queryClient.invalidateQueries({ queryKey: ["chats"] })
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to send message')
        }
    })

    // Socket.io setup
    useEffect(() => {
        if (!user?._id) return

        const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000')
        setSocket(newSocket)

        newSocket.emit('userOnline', user._id)

        newSocket.on('receiveMessage', (message) => {
            if (selectedChat?._id === message.chatId || selectedChat?._id === message.chat) {
                setMessages(prev => [...prev, message])
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
            }
            queryClient.invalidateQueries({ queryKey: ["chats"] })
        })

        return () => {
            newSocket.disconnect()
        }
    }, [user, selectedChat, queryClient])

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const selectChat = async (chat) => {
        setSelectedChat(chat)
        setMessages([])
        await refetchMessages()

        if (chat._id) {
            try {
                await chatService.markAsRead(chat._id)
            } catch (error) {
                console.error('Failed to mark as read:', error)
            }
        }

        if (socket) {
            socket.emit('joinChat', chat._id)
        }
    }

    const sendMessage = (e) => {
        e.preventDefault()
        if (!messageText.trim()) return
        if (!selectedChat) {
            toast.error('No chat selected')
            return
        }

        sendMutation.mutate({
            chatId: selectedChat._id,
            text: messageText
        })
        setMessageText('')
    }

    if (isLoading) return <Loading />

    if (error) {
        console.error('Chats loading error:', error)
        return (
            <div className="text-center py-8 text-red-500">
                Error loading chats. Please refresh the page.
            </div>
        )
    }

    const getOtherParticipant = (chat) => {
        if (!chat.participants) return null
        return chat.participants.find(p => p._id !== user?._id)
    }

   return (
        <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex h-full">
            {/* Chat List Sidebar - hidden on mobile when chat selected */}
            <div className={`${selectedChat ? 'hidden md:block' : 'block'} w-full md:w-80 border-r flex flex-col h-full`}>
                <div className="p-4 border-b bg-white">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg">Messages</h2>
                        {selectedChat && (
                            <button 
                                onClick={() => setSelectedChat(null)}
                                className="md:hidden text-gray-500"
                            >
                                Back
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        {chats.length} {chats.length === 1 ? 'conversation' : 'conversations'}
                    </p>
                </div>
                <div className="overflow-y-auto flex-1">
                    {chats.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500 p-8 text-center">
                            <div>
                                <p>No conversations yet</p>
                                <p className="text-sm mt-2">Connect with other developers to start chatting</p>
                            </div>
                        </div>
                    ) : (
                        chats.map((chat) => {
                            const otherUser = getOtherParticipant(chat)
                            if (!otherUser) return null

                            return (
                                <button
                                    key={chat._id}
                                    onClick={() => selectChat(chat)}
                                    className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors border-b ${selectedChat?._id === chat._id ? 'bg-primary-50' : ''
                                        }`}
                                >
                                    <img
                                        src={otherUser.avatar || otherUser.profilePicture || `https://ui-avatars.com/api/?name=${otherUser.firstName}+${otherUser.lastName}&background=3b82f6&color=fff`}
                                        alt={`${otherUser.firstName} ${otherUser.lastName}`}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {otherUser.firstName} {otherUser.lastName}
                                        </p>
                                        <p className="text-sm text-gray-500 truncate">
                                            {chat.lastMessage?.content || chat.lastMessage?.text || 'No messages yet'}
                                        </p>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Chat Area - full width on mobile when chat selected */}
            <div className={`${selectedChat ? 'block' : 'hidden md:block'} flex-1 flex flex-col h-full`}>
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-3 md:p-4 border-b bg-white flex items-center space-x-3">
                            <button 
                                onClick={() => setSelectedChat(null)}
                                className="md:hidden text-gray-600 mr-2"
                            >
                                ← Back
                            </button>
                            {(() => {
                                const otherUser = getOtherParticipant(selectedChat)
                                return (
                                    <>
                                        <img
                                            src={otherUser?.avatar || otherUser?.profilePicture || `https://ui-avatars.com/api/?name=${otherUser?.firstName}+${otherUser?.lastName}&background=3b82f6&color=fff`}
                                            alt=""
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div>
                                            <p className="font-semibold">
                                                {otherUser?.firstName} {otherUser?.lastName}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {otherUser?.headline || 'Developer'}
                                            </p>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>

                        {/* Messages Container */}
                        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50">
                            {messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <p className="text-sm md:text-base">No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div
                                        key={msg._id || idx}
                                        className={`flex ${msg.sender?._id === user?._id || msg.sender === user?._id ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] md:max-w-[70%] rounded-lg p-2 md:p-3 ${msg.sender?._id === user?._id || msg.sender === user?._id
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-white text-gray-900 shadow-sm'
                                                }`}
                                        >
                                            <p className="break-words text-sm md:text-base">{msg.content || msg.text}</p>
                                            <p className={`text-xs mt-1 ${msg.sender?._id === user?._id || msg.sender === user?._id
                                                ? 'text-primary-100'
                                                : 'text-gray-400'
                                                }`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <form onSubmit={sendMessage} className="p-3 md:p-4 border-t bg-white flex space-x-2">
                            <input
                                type="text"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 input-primary text-sm md:text-base"
                                disabled={sendMutation.isLoading}
                            />
                            <button
                                type="submit"
                                className="btn-primary px-4 md:px-6 disabled:opacity-50"
                                disabled={sendMutation.isLoading || !messageText.trim()}
                            >
                                {sendMutation.isLoading ? '...' : 'Send'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center p-4">
                            <p className="text-base md:text-lg">Select a chat to start messaging</p>
                            <p className="text-xs md:text-sm mt-2">Click on any conversation from the left sidebar</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
}

export default Chat
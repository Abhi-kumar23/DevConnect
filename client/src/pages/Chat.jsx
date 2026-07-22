import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import io from 'socket.io-client'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { chatService } from '../services/chat'
import Loading from '../components/Common/Loading'
import { getAvatarUrl } from '../utils/avatar'

const EMPTY_CHATS = []

const Chat = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const userId = searchParams.get('userId')
  const [selectedChat, setSelectedChat] = useState(null)
  const [messageText, setMessageText] = useState('')
  const socketRef = useRef(null)
  const openedUserRef = useRef(null)
  const messagesEndRef = useRef(null)

  const { data: chatsResponse, isLoading, error } = useQuery({ queryKey: ['chats'], queryFn: chatService.getChats })
  const chats = chatsResponse?.data?.data || EMPTY_CHATS
  const { data: messagesResponse } = useQuery({
    queryKey: ['messages', selectedChat?._id],
    queryFn: () => chatService.getMessages(selectedChat._id),
    enabled: Boolean(selectedChat?._id),
  })
  const rawMessages = messagesResponse?.data?.data || []
  const messages = rawMessages.filter((message, index, list) =>
    list.findIndex((candidate) => candidate._id === message._id) === index,
  )

  useEffect(() => {
    if (!user?._id) return undefined
    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, { auth: { token: localStorage.getItem('token') } })
    socketRef.current = socket
    socket.on('receiveMessage', (message) => {
      const chatId = String(message.chat?._id || message.chat)
      queryClient.setQueryData(['messages', chatId], (old) => {
        const existing = old?.data?.data || []
        if (existing.some((item) => item._id === message._id)) return old
        return { ...old, data: { ...old?.data, data: [...existing, message] } }
      })
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    })
    socket.on('chatUpdated', () => queryClient.invalidateQueries({ queryKey: ['chats'] }))
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [queryClient, user?._id])

  useEffect(() => {
    if (!userId || !user?._id || userId === user._id || openedUserRef.current === userId) return
    const existing = chats.find((chat) => chat.participants?.some((participant) => participant._id === userId))
    if (existing) {
      openedUserRef.current = userId
      setSelectedChat(existing)
      navigate('/chat', { replace: true })
      return
    }
    if (!chatsResponse) return
    openedUserRef.current = userId
    chatService.createChat(userId)
      .then((response) => {
        const chat = response.data?.data
        if (chat) {
          setSelectedChat(chat)
          socketRef.current?.emit('joinChat', chat._id)
          queryClient.invalidateQueries({ queryKey: ['chats'] })
          navigate('/chat', { replace: true })
        }
      })
      .catch((requestError) => {
        openedUserRef.current = null
        toast.error(requestError.response?.data?.message || 'Could not start this conversation')
      })
  }, [chats, chatsResponse, navigate, queryClient, user?._id, userId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const sendMutation = useMutation({
    mutationFn: ({ chatId, text }) => chatService.sendMessage(chatId, text),
    onSuccess: (response, { chatId }) => {
      const message = response.data?.data
      if (message) {
        queryClient.setQueryData(['messages', chatId], (old) => {
          const existing = old?.data?.data || []
          if (existing.some((item) => item._id === message._id)) return old
          return { ...old, data: { ...old?.data, data: [...existing, message] } }
        })
      }
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
    onError: (requestError) => toast.error(requestError.response?.data?.message || 'Failed to send message'),
  })

  const selectChat = (chat) => {
    setSelectedChat(chat)
    socketRef.current?.emit('joinChat', chat._id)
    chatService.markAsRead(chat._id).catch(() => {})
  }
  const sendMessage = (event) => {
    event.preventDefault()
    const text = messageText.trim()
    if (!text || !selectedChat) return
    setMessageText('')
    sendMutation.mutate({ chatId: selectedChat._id, text })
  }
  const getOtherParticipant = (chat) => chat?.participants?.find((participant) => participant._id !== user?._id)

  if (isLoading) return <Loading />
  if (error) return <div className="card text-center text-red-600">Could not load messages. Please refresh the page.</div>
  const otherUser = getOtherParticipant(selectedChat)

  return <div className="h-[calc(100vh-8rem)] min-h-[520px] bg-white rounded-xl shadow-sm border overflow-hidden flex">
    <aside className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r flex-col`}>
      <div className="p-4 border-b"><h1 className="font-semibold text-lg">Messages</h1><p className="text-sm text-gray-500 mt-1">{chats.length} {chats.length === 1 ? 'conversation' : 'conversations'}</p></div>
      <div className="overflow-y-auto flex-1">{chats.length === 0 ? <p className="p-8 text-center text-gray-500">No conversations yet. Visit a developer’s profile to start one.</p> : chats.map((chat) => {
        const person = getOtherParticipant(chat)
        if (!person) return null
        return <button key={chat._id} onClick={() => selectChat(chat)} className={`w-full p-4 flex gap-3 text-left border-b hover:bg-gray-50 ${selectedChat?._id === chat._id ? 'bg-primary-50' : ''}`}>
          <img src={getAvatarUrl(person)} alt="" className="w-11 h-11 rounded-full object-cover" /><span className="min-w-0 flex-1"><strong className="block truncate">{person.firstName} {person.lastName}</strong><small className="block truncate text-gray-500">{chat.lastMessage?.content || 'No messages yet'}</small></span>
        </button>
      })}</div>
    </aside>
    <main className={`${selectedChat ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col`}>
      {selectedChat ? <>
        <header className="p-4 border-b flex gap-3 items-center"><button className="md:hidden text-gray-500" onClick={() => setSelectedChat(null)}>←</button><img src={getAvatarUrl(otherUser)} alt="" className="w-10 h-10 rounded-full object-cover" /><div><p className="font-semibold">{otherUser?.firstName} {otherUser?.lastName}</p><p className="text-xs text-gray-500">Developer</p></div></header>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">{messages.length === 0 ? <p className="h-full flex items-center justify-center text-gray-400">Start the conversation.</p> : messages.map((message) => {
          const mine = (message.sender?._id || message.sender) === user?._id
          return <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-xl px-3 py-2 ${mine ? 'bg-primary-600 text-white' : 'bg-white shadow-sm'}`}><p className="break-words">{message.content}</p><time className={`block text-right mt-1 text-xs ${mine ? 'text-primary-100' : 'text-gray-400'}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div></div>
        })}<div ref={messagesEndRef} /></div>
        <form onSubmit={sendMessage} className="p-4 border-t flex gap-2"><input value={messageText} onChange={(event) => setMessageText(event.target.value)} maxLength="5000" className="input-primary" placeholder="Type a message…" disabled={sendMutation.isPending} /><button className="btn-primary disabled:opacity-60" disabled={sendMutation.isPending || !messageText.trim()}>{sendMutation.isPending ? 'Sending…' : 'Send'}</button></form>
      </> : <div className="m-auto text-center text-gray-500">Select a conversation to begin.</div>}
    </main>
  </div>
}

export default Chat

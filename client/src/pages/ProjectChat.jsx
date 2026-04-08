import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiArrowLeft, FiSend } from 'react-icons/fi';
import { projectService } from '../services/projects';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Common/Loading';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const ProjectChat = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const messagesEndRef = useRef(null);

    const { data, isLoading } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectService.getProjectById(projectId)
    });

    const { data: chatData, isLoading: chatLoading, refetch } = useQuery({
        queryKey: ['projectChat', projectId],
        queryFn: () => projectService.getProjectChat(projectId),
        enabled: !!projectId
    });

    const sendMutation = useMutation({
        mutationFn: ({ projectId, content }) => projectService.sendProjectMessage(projectId, content),
        onSuccess: () => {
            refetch();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to send message');
        }
    });

    const project = data?.data?.data || data?.data;
    const chat = chatData?.data?.data || chatData?.data;
    const chatMessages = chat?.messages || [];

    // Socket.io setup
    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000');
        setSocket(newSocket);

        newSocket.emit('joinProjectChat', projectId);

        newSocket.on('projectMessage', (message) => {
            setMessages(prev => [...prev, message]);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [projectId]);

    useEffect(() => {
        if (chatMessages.length > 0) {
            setMessages(chatMessages);
        }
    }, [chatMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!messageText.trim()) return;
        sendMutation.mutate({ projectId, content: messageText });
        setMessageText('');
    };

    if (isLoading || chatLoading) return <Loading />;
    if (!project) return <div className="text-center py-8">Project not found</div>;

    const isMember = project.members?.some(m => m.user?._id === user?._id);
    if (!isMember) {
        return (
            <div className="text-center py-8">
                <p className="text-red-500">You must be a member to access the chat</p>
                <button onClick={() => navigate(`/projects/${projectId}`)} className="btn-primary mt-4">Back to Project</button>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-8rem)] flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm p-3 md:p-4 flex items-center space-x-3 md:space-x-4 sticky top-0 z-10 border-b">
                <button
                    onClick={() => navigate(`/projects/${projectId}`)}
                    className="text-gray-600 hover:text-primary-600 p-1"
                >
                    <FiArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="font-semibold text-sm md:text-base">{project.title}</h1>
                    <p className="text-xs text-gray-500">Project Discussion</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <p className="text-sm md:text-base">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.sender?._id === user?._id ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] md:max-w-[70%] rounded-lg p-2 md:p-3 ${msg.sender?._id === user?._id
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white shadow-sm border'
                                }`}>
                                {msg.sender?._id !== user?._id && (
                                    <p className="text-xs font-semibold mb-1 text-gray-700">
                                        {msg.sender?.firstName} {msg.sender?.lastName}
                                    </p>
                                )}
                                <p className="text-sm md:text-base break-words">{msg.content}</p>
                                <p className={`text-xs mt-1 ${msg.sender?._id === user?._id
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

            {/* Input */}
            <form onSubmit={sendMessage} className="bg-white border-t p-3 md:p-4 flex space-x-2">
                <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Share GitHub links, ideas..."
                    className="flex-1 input-primary text-sm md:text-base"
                    disabled={sendMutation.isLoading}
                />
                <button
                    type="submit"
                    className="btn-primary px-4 md:px-6 disabled:opacity-50"
                    disabled={sendMutation.isLoading || !messageText.trim()}
                >
                    {sendMutation.isLoading ? '...' : <FiSend size={18} />}
                </button>
            </form>
        </div>
    );
};

export default ProjectChat;
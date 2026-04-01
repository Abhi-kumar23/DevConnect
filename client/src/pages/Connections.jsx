// src/pages/Connections.jsx
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { connectionsService } from '../services/connections'
import Loading from '../components/Common/Loading'
import toast from 'react-hot-toast'

const Connections = () => {
    const [activeTab, setActiveTab] = useState('connections'); // Change default to 'connections'
    const [searchTerm, setSearchTerm] = useState('')
    const queryClient = useQueryClient();

    // Get connections
    const { data: connectionsData, isLoading: connectionsLoading } = useQuery({
        queryKey: ["connections"],
        queryFn: connectionsService.getConnections,
    })

    // Get pending requests
    const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
        queryKey: ["pendingRequests"],
        queryFn: connectionsService.getPendingRequests,
    })

    // Get suggestions
    const { data: suggestionsData, isLoading: suggestionsLoading, refetch: refetchSuggestions } = useQuery({
        queryKey: ["suggestions"],
        queryFn: connectionsService.getSuggestions,
    })

    // Accept request
    const acceptMutation = useMutation({
        mutationFn: connectionsService.acceptRequest,
        onSuccess: () => {
            toast.success('Connection request accepted!')
            refetchPending()
            queryClient.invalidateQueries({ queryKey: ["connections"] })
            queryClient.invalidateQueries({ queryKey: ["suggestions"] })
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to accept request')
        }
    })

    // Reject request
    const rejectMutation = useMutation({
        mutationFn: connectionsService.rejectRequest,
        onSuccess: () => {
            toast.success('Request rejected')
            refetchPending()
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to reject request')
        }
    })

    // Send connection request
    const sendMutation = useMutation({
        mutationFn: connectionsService.sendRequest,
        onSuccess: () => {
            toast.success('Connection request sent!')
            refetchSuggestions()
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to send request')
        }
    })

    if (connectionsLoading || pendingLoading || suggestionsLoading) return <Loading />

    const connections = connectionsData?.data?.data || connectionsData?.data || []
    const pendingRequests = pendingData?.data?.data || pendingData?.data || []
    const suggestions = suggestionsData?.data?.data || suggestionsData?.data || []

    const filterData = (data) => {
        return data.filter(user => 
            user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.headline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.skills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
        )
    }

    const filteredConnections = filterData(connections)
    const filteredPending = filterData(pendingRequests)
    const filteredSuggestions = filterData(suggestions)

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">My Network</h1>
                <p className="text-gray-600 mt-1">Connect with developers around the world</p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search by name, title, or skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
            </div>

            {/* Tabs */}
            <div className="border-b mb-6">
                <div className="flex space-x-6">
                    <button
                        onClick={() => setActiveTab('connections')}
                        className={`pb-3 px-1 font-medium transition-colors ${
                            activeTab === 'connections' 
                                ? 'text-primary-600 border-b-2 border-primary-600' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Connections ({connections.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`pb-3 px-1 font-medium transition-colors ${
                            activeTab === 'pending' 
                                ? 'text-primary-600 border-b-2 border-primary-600' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Pending ({pendingRequests.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('suggestions')}
                        className={`pb-3 px-1 font-medium transition-colors ${
                            activeTab === 'suggestions' 
                                ? 'text-primary-600 border-b-2 border-primary-600' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Suggestions ({suggestions.length})
                    </button>
                </div>
            </div>

            {/* Connections Tab */}
            {activeTab === 'connections' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredConnections.map((user) => (
                        <div key={user._id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start space-x-4">
                                <img
                                    src={user.avatar || user.profilePicture || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=3b82f6&color=fff&size=80`}
                                    alt={user.firstName}
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{user.firstName} {user.lastName}</h3>
                                    <p className="text-sm text-gray-600">{user.headline || 'Developer'}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {user.skills?.slice(0, 4).map((skill, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t">
                                <button
                                    onClick={() => window.location.href = `/chat?userId=${user._id}`}
                                    className="w-full btn-secondary py-2 text-sm"
                                >
                                    Message
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredConnections.length === 0 && (
                        <div className="col-span-2 text-center py-12 text-gray-500">
                            No connections yet. Start connecting with other developers!
                        </div>
                    )}
                </div>
            )}

            {/* Pending Requests Tab */}
            {activeTab === 'pending' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPending.map((user) => (
                        <div key={user._id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start space-x-4">
                                <img
                                    src={user.avatar || user.profilePicture || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=orange&color=fff&size=80`}
                                    alt={user.firstName}
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{user.firstName} {user.lastName}</h3>
                                    <p className="text-sm text-gray-600">{user.headline || 'Developer'}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {user.skills?.slice(0, 4).map((skill, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t flex space-x-2">
                                <button
                                    onClick={() => acceptMutation.mutate(user._id)}
                                    disabled={acceptMutation.isLoading}
                                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => rejectMutation.mutate(user._id)}
                                    disabled={rejectMutation.isLoading}
                                    className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredPending.length === 0 && (
                        <div className="col-span-2 text-center py-12 text-gray-500">
                            No pending requests
                        </div>
                    )}
                </div>
            )}

            {/* Suggestions Tab */}
            {activeTab === 'suggestions' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredSuggestions.map((user) => (
                        <div key={user._id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start space-x-4">
                                <img
                                    src={user.avatar || user.profilePicture || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=gray&color=fff&size=80`}
                                    alt={user.firstName}
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{user.firstName} {user.lastName}</h3>
                                    <p className="text-sm text-gray-600">{user.headline || 'Developer'}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {user.skills?.slice(0, 4).map((skill, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                {skill}
                                            </span>
                                        ))}
                                        {user.skills?.length > 4 && (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                +{user.skills.length - 4}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t">
                                <button
                                    onClick={() => sendMutation.mutate(user._id)}
                                    disabled={sendMutation.isLoading}
                                    className="w-full btn-primary py-2 text-sm disabled:opacity-50"
                                >
                                    {sendMutation.isLoading ? 'Sending...' : 'Connect'}
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredSuggestions.length === 0 && (
                        <div className="col-span-2 text-center py-12 text-gray-500">
                            No suggestions available
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default Connections
// src/pages/Profile.jsx (Updated with tabs)
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { profileService } from '../services/profile'
import { postsService } from '../services/posts'
import ProfileCard from '../components/Profile/ProfileCard'
import PostCard from '../components/Posts/PostCard'
import Loading from '../components/Common/Loading'
import { FiFileText, FiFolder } from 'react-icons/fi'

const Profile = () => {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('posts')
    
    const { data: profileResponse, isLoading: profileLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: profileService.getMyProfile,
    })
    
    const { data: feedResponse, isLoading: postsLoading } = useQuery({
        queryKey: ["feed", 1],
        queryFn: () => postsService.getFeed(1, 10),
    })

    if (profileLoading || postsLoading) return <Loading />

    const profileData = profileResponse?.data?.data || profileResponse?.data
    const postsArray = feedResponse?.data?.data?.data || feedResponse?.data?.data || []
    const userPosts = postsArray.filter(post => post.user?._id === user?._id)

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <ProfileCard 
                profile={profileData} 
                user={user}
                postsCount={userPosts.length}
            />
            
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border">
                <div className="border-b">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                                activeTab === 'posts' 
                                    ? 'text-primary-600 border-b-2 border-primary-600' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <FiFileText size={18} />
                            <span>Posts ({userPosts.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                                activeTab === 'projects' 
                                    ? 'text-primary-600 border-b-2 border-primary-600' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <FiFolder size={18} />
                            <span>Projects (0)</span>
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'posts' && (
                        userPosts.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No posts yet</p>
                                <p className="text-sm mt-2">Share your thoughts with the community!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {userPosts.map((post) => (
                                    <PostCard 
                                        key={post._id} 
                                        post={post}
                                        onLike={() => {}}
                                        onComment={() => {}}
                                    />
                                ))}
                            </div>
                        )
                    )}
                    
                    {activeTab === 'projects' && (
                        <div className="text-center py-8 text-gray-500">
                            <p>No projects yet</p>
                            <p className="text-sm mt-2">Showcase your work to the community!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Profile
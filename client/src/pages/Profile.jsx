// src/pages/Profile.jsx (Updated with tabs)
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { profileService } from '../services/profile'
import { postsService } from '../services/posts'
import { projectService } from '../services/projects'
import ProfileCard from '../components/Profile/ProfileCard'
import PostCard from '../components/Posts/PostCard'
import Loading from '../components/Common/Loading'
import { FiFileText, FiFolder } from 'react-icons/fi'

const Profile = () => {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('posts')
    
    const { data: profileResponse, isLoading: profileLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: profileService.getMyProfile,
    })
    
    const { data: postsResponse, isLoading: postsLoading } = useQuery({
        queryKey: ["userPosts", user?._id],
        queryFn: () => postsService.getUserPosts(user._id, 1, 20),
        enabled: !!user?._id,
    })

    const { data: projectsResponse } = useQuery({
        queryKey: ['projects', 'my'],
        queryFn: () => projectService.getProjects('my'),
        enabled: !!user?._id,
    })

    const refreshPosts = () => queryClient.invalidateQueries({ queryKey: ['userPosts', user?._id] })
    const likeMutation = useMutation({ mutationFn: postsService.likePost, onSuccess: refreshPosts })
    const commentMutation = useMutation({ mutationFn: ({ postId, text }) => postsService.commentPost(postId, text), onSuccess: refreshPosts })

    if (profileLoading || postsLoading) return <Loading />

    const profileData = profileResponse?.data?.data || profileResponse?.data
    const userPosts = postsResponse?.data?.data?.data || postsResponse?.data?.data || []
    const projects = projectsResponse?.data?.data?.projects || projectsResponse?.data?.projects || []

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <ProfileCard 
                profile={profileData} 
                user={{ ...user, ...profileData?.user }}
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
                            <span>Projects ({projects.length})</span>
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
                                        onLike={() => likeMutation.mutate(post._id)}
                                        onComment={(text) => commentMutation.mutate({ postId: post._id, text })}
                                    />
                                ))}
                            </div>
                        )
                    )}
                    
                    {activeTab === 'projects' && (projects.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {projects.map((project) => (
                                <Link key={project._id} to={`/projects/${project._id}`} className="border rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition">
                                    <h3 className="font-semibold">{project.title}</h3>
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                                    <div className="flex flex-wrap gap-1 mt-3">{project.technologies?.slice(0, 4).map((tech) => <span key={tech} className="text-xs rounded-full bg-gray-100 px-2 py-1">{tech}</span>)}</div>
                                </Link>
                            ))}
                        </div>
                    ) : <div className="text-center py-8 text-gray-500"><p>No projects yet</p><p className="text-sm mt-2">Showcase your work to the community!</p></div>)}
                </div>
            </div>
        </div>
    )
}

export default Profile

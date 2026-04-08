import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiGithub, FiGlobe, FiUsers, FiLock, FiUnlock, FiArrowLeft, FiCheck, FiX } from 'react-icons/fi';
import { projectService } from '../services/projects';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Common/Loading';
import toast from 'react-hot-toast';

const ProjectDetail = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectService.getProjectById(projectId)
    });

    const joinMutation = useMutation({
        mutationFn: ({ projectId, message }) => projectService.sendJoinRequest(projectId, message),
        onSuccess: (response) => {
            queryClient.invalidateQueries(['project', projectId]);
            if (response.data?.data?.message === 'Joined project successfully') {
                toast.success('Joined project!');
                navigate(`/projects/${projectId}/chat`);
            } else {
                toast.success('Join request sent!');
            }
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to send request');
        }
    });

    const acceptMutation = useMutation({
        mutationFn: ({ projectId, userId }) => projectService.acceptRequest(projectId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries(['project', projectId]);
            toast.success('Request accepted');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to accept request');
        }
    });

    const rejectMutation = useMutation({
        mutationFn: ({ projectId, userId }) => projectService.rejectRequest(projectId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries(['project', projectId]);
            toast.success('Request rejected');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to reject request');
        }
    });

    const project = data?.data?.data || data?.data;
    
    if (isLoading) return <Loading />;
    if (!project) return <div className="text-center py-8">Project not found</div>;

    const isOwner = project.createdBy?._id === user?._id;
    const isMember = project.members?.some(m => m.user?._id === user?._id);
    const hasPendingRequest = project.pendingRequests?.some(r => r.user?._id === user?._id);
    const pendingRequests = project.pendingRequests || [];

    return (
        <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <button onClick={() => navigate('/projects')} className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 mb-4">
                <FiArrowLeft size={18} />
                <span>Back to Projects</span>
            </button>

            {/* Project Header */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold">{project.title}</h1>
                            <div className="flex items-center space-x-2 mt-2">
                                {project.visibility === 'private' ? (
                                    <span className="flex items-center space-x-1 text-gray-500 text-sm">
                                        <FiLock size={14} />
                                        <span>Private</span>
                                    </span>
                                ) : (
                                    <span className="flex items-center space-x-1 text-gray-500 text-sm">
                                        <FiUnlock size={14} />
                                        <span>Public</span>
                                    </span>
                                )}
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-500 text-sm">Created by {project.createdBy?.firstName} {project.createdBy?.lastName}</span>
                            </div>
                        </div>
                        {!isMember && !hasPendingRequest && !isOwner && (
                            <button
                                onClick={() => {
                                    const message = prompt('Optional: Add a message to the project owner (max 500 chars)');
                                    joinMutation.mutate({ projectId: project._id, message: message || '' });
                                }}
                                className="btn-primary"
                            >
                                {project.visibility === 'public' ? 'Join Project' : 'Request to Join'}
                            </button>
                        )}
                        {hasPendingRequest && (
                            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">Request Pending</span>
                        )}
                        {isMember && (
                            <button onClick={() => navigate(`/projects/${projectId}/chat`)} className="btn-primary">
                                Go to Chat
                            </button>
                        )}
                    </div>

                    {/* Description */}
                    <div className="mt-6">
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-gray-700">{project.description}</p>
                    </div>

                    {/* Links */}
                    {(project.githubLink || project.demoLink) && (
                        <div className="mt-4 flex space-x-4">
                            {project.githubLink && (
                                <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-gray-600 hover:text-primary-600">
                                    <FiGithub size={18} />
                                    <span>GitHub Repository</span>
                                </a>
                            )}
                            {project.demoLink && (
                                <a href={project.demoLink} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-gray-600 hover:text-primary-600">
                                    <FiGlobe size={18} />
                                    <span>Live Demo</span>
                                </a>
                            )}
                        </div>
                    )}

                    {/* Technologies */}
                    {project.technologies?.length > 0 && (
                        <div className="mt-4">
                            <h3 className="font-semibold mb-2">Technologies</h3>
                            <div className="flex flex-wrap gap-2">
                                {project.technologies.map((tech, i) => (
                                    <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{tech}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Members */}
                    <div className="mt-6">
                        <h3 className="font-semibold mb-2 flex items-center space-x-2">
                            <FiUsers size={16} />
                            <span>Members ({project.members?.length || 1})</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {project.members?.map((member) => (
                                <div key={member.user?._id} className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full">
                                    <img
                                        src={member.user?.avatar || `https://ui-avatars.com/api/?name=${member.user?.firstName}+${member.user?.lastName}&background=3b82f6&color=fff`}
                                        alt=""
                                        className="w-6 h-6 rounded-full"
                                    />
                                    <span className="text-sm">{member.user?.firstName} {member.user?.lastName}</span>
                                    {member.role === 'owner' && <span className="text-xs text-primary-600">(Owner)</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pending Requests (Owner only) */}
                    {isOwner && pendingRequests.length > 0 && (
                        <div className="mt-6 border-t pt-4">
                            <h3 className="font-semibold mb-3">Pending Join Requests ({pendingRequests.length})</h3>
                            <div className="space-y-3">
                                {pendingRequests.map((request) => (
                                    <div key={request.user?._id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <img
                                                src={request.user?.avatar || `https://ui-avatars.com/api/?name=${request.user?.firstName}+${request.user?.lastName}&background=gray&color=fff`}
                                                alt=""
                                                className="w-10 h-10 rounded-full"
                                            />
                                            <div>
                                                <p className="font-medium">{request.user?.firstName} {request.user?.lastName}</p>
                                                <p className="text-sm text-gray-500">{request.user?.headline || 'Developer'}</p>
                                                {request.message && <p className="text-sm text-gray-600 mt-1">"{request.message}"</p>}
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => acceptMutation.mutate({ projectId: project._id, userId: request.user._id })}
                                                className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700"
                                            >
                                                <FiCheck size={16} />
                                            </button>
                                            <button
                                                onClick={() => rejectMutation.mutate({ projectId: project._id, userId: request.user._id })}
                                                className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"
                                            >
                                                <FiX size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail;
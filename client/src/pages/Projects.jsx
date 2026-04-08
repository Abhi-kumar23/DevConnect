import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FiPlus, FiGithub, FiUsers, FiLock, FiUnlock, FiSend } from 'react-icons/fi';
import { projectService } from '../services/projects';
import Loading from '../components/Common/Loading';
import toast from 'react-hot-toast';

const Projects = () => {
    const [filter, setFilter] = useState('all');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['projects', filter],
        queryFn: () => projectService.getProjects(filter)
    });

    const createMutation = useMutation({
        mutationFn: projectService.createProject,
        onSuccess: () => {
            queryClient.invalidateQueries(['projects']);
            setShowCreateForm(false);
            toast.success('Project created successfully!');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to create project');
        }
    });

    const joinMutation = useMutation({
        mutationFn: ({ projectId, message }) => projectService.sendJoinRequest(projectId, message),
        onSuccess: (response, variables) => {
            queryClient.invalidateQueries(['projects']);
            if (response.data?.data?.message === 'Joined project successfully') {
                toast.success('Joined project!');
            } else {
                toast.success('Join request sent!');
            }
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to send request');
        }
    });

    const projects = data?.data?.data?.projects || data?.data?.projects || [];
    const isMember = (project) => {
        return project.members?.some(m => m.user?._id === projectService.getCurrentUserId());
    };

    const hasPendingRequest = (project) => {
        return project.pendingRequests?.some(r => r.user?._id === projectService.getCurrentUserId());
    };

    if (isLoading) return <Loading />;

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Projects</h1>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="btn-primary flex items-center space-x-2"
                >
                    <FiPlus size={18} />
                    <span>New Project</span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex space-x-4 mb-6 border-b">
                <button
                    onClick={() => setFilter('all')}
                    className={`pb-2 px-4 ${filter === 'all' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
                >
                    All Projects
                </button>
                <button
                    onClick={() => setFilter('public')}
                    className={`pb-2 px-4 ${filter === 'public' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
                >
                    Public
                </button>
                <button
                    onClick={() => setFilter('my')}
                    className={`pb-2 px-4 ${filter === 'my' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
                >
                    My Projects
                </button>
                <button
                    onClick={() => setFilter('joined')}
                    className={`pb-2 px-4 ${filter === 'joined' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
                >
                    Joined
                </button>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <div key={project._id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-4">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-lg">{project.title}</h3>
                                {project.visibility === 'private' ? (
                                    <FiLock className="text-gray-400" size={16} />
                                ) : (
                                    <FiUnlock className="text-gray-400" size={16} />
                                )}
                            </div>
                            <p className="text-gray-600 text-sm mt-2 line-clamp-2">{project.description}</p>
                            <div className="flex flex-wrap gap-1 mt-3">
                                {project.technologies?.slice(0, 3).map((tech, i) => (
                                    <span key={i} className="px-2 py-1 bg-gray-100 text-xs rounded-full">{tech}</span>
                                ))}
                                {project.technologies?.length > 3 && (
                                    <span className="px-2 py-1 bg-gray-100 text-xs rounded-full">+{project.technologies.length - 3}</span>
                                )}
                            </div>
                            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                    <FiUsers size={14} />
                                    <span>{project.members?.length || 1} members</span>
                                </div>
                                {project.githubLink && (
                                    <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="hover:text-primary-600">
                                        <FiGithub size={16} />
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className="border-t p-3 bg-gray-50 flex justify-between items-center">
                            <Link to={`/projects/${project._id}`} className="text-primary-600 text-sm hover:underline">
                                View Details
                            </Link>
                            {!isMember(project) && !hasPendingRequest(project) && project.createdBy?._id !== projectService.getCurrentUserId() && (
                                <button
                                    onClick={() => {
                                        const message = prompt('Optional: Add a message to the project owner (max 500 chars)');
                                        joinMutation.mutate({ projectId: project._id, message: message || '' });
                                    }}
                                    className="btn-primary text-sm px-3 py-1"
                                >
                                    {project.visibility === 'public' ? 'Join' : 'Request to Join'}
                                </button>
                            )}
                            {hasPendingRequest(project) && (
                                <span className="text-yellow-600 text-sm">Request Pending</span>
                            )}
                            {isMember(project) && (
                                <Link to={`/projects/${project._id}/chat`} className="text-green-600 text-sm">
                                    Go to Chat →
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {projects.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <p>No projects found</p>
                </div>
            )}

            {/* Create Project Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Create New Project</h2>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            createMutation.mutate({
                                title: formData.get('title'),
                                description: formData.get('description'),
                                githubLink: formData.get('githubLink'),
                                technologies: formData.get('technologies'),
                                visibility: formData.get('visibility')
                            });
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Title *</label>
                                <input name="title" required className="input-primary w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description *</label>
                                <textarea name="description" rows="3" required className="input-primary w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">GitHub Link</label>
                                <input name="githubLink" type="url" className="input-primary w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Technologies (comma separated)</label>
                                <input name="technologies" placeholder="React, Node.js, MongoDB" className="input-primary w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Visibility</label>
                                <select name="visibility" className="input-primary w-full">
                                    <option value="public">Public - Anyone can join</option>
                                    <option value="private">Private - Requires approval</option>
                                </select>
                            </div>
                            <div className="flex space-x-3 pt-2">
                                <button type="submit" className="btn-primary flex-1" disabled={createMutation.isLoading}>
                                    {createMutation.isLoading ? 'Creating...' : 'Create'}
                                </button>
                                <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
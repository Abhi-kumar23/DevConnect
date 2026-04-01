// src/components/Profile/ProfileCard.jsx (Enhanced)
import React from 'react'
import { Link } from 'react-router-dom'
import { FiEdit2, FiMapPin, FiBriefcase, FiGithub, FiLinkedin, FiTwitter, FiUsers, FiFileText, FiFolder } from 'react-icons/fi'

const ProfileCard = ({ profile, user, postsCount = 0 }) => {
    const completion = profile?.completionPercentage || 0
    const joinedDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Cover Image */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-700 h-32"></div>
            
            <div className="px-6 pb-6 relative">
                {/* Avatar */}
                <div className="flex justify-between items-end -mt-12 mb-4">
                    <img
                        src={user?.avatar || user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=3b82f6&color=fff&size=120`}
                        alt={user?.firstName}
                        className="w-24 h-24 rounded-full border-4 border-white object-cover"
                    />
                    <Link to="/profile/edit" className="btn-secondary flex items-center space-x-2 text-sm">
                        <FiEdit2 size={14} />
                        <span>Edit</span>
                    </Link>
                </div>
                
                {/* User Info */}
                <h2 className="text-2xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h2>
                <p className="text-gray-600 mt-1">{profile?.headline || 'Developer'}</p>
                
                {profile?.bio && (
                    <p className="mt-3 text-gray-700 leading-relaxed">{profile.bio}</p>
                )}
                
                {/* Location & Joined */}
                <div className="mt-3 space-y-1">
                    {profile?.location && (
                        <div className="flex items-center space-x-2 text-gray-600 text-sm">
                            <FiMapPin size={14} />
                            <span>{profile.location}</span>
                        </div>
                    )}
                    {joinedDate && (
                        <div className="flex items-center space-x-2 text-gray-600 text-sm">
                            <span>Joined {joinedDate}</span>
                        </div>
                    )}
                </div>
                
                {/* Stats */}
                <div className="mt-4 flex space-x-6 border-t pt-4">
                    <div>
                        <p className="font-bold text-lg">{profile?.connections?.length || 0}</p>
                        <p className="text-xs text-gray-500">connections</p>
                    </div>
                    <div>
                        <p className="font-bold text-lg">{postsCount}</p>
                        <p className="text-xs text-gray-500">posts</p>
                    </div>
                    <div>
                        <p className="font-bold text-lg">{profile?.projects?.length || 0}</p>
                        <p className="text-xs text-gray-500">projects</p>
                    </div>
                </div>
                
                {/* Skills */}
                {profile?.skills?.length > 0 && (
                    <div className="mt-4">
                        <h4 className="font-semibold text-sm mb-2">Skills</h4>
                        <div className="flex flex-wrap gap-2">
                            {profile.skills.map((skill, idx) => (
                                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Social Links */}
                <div className="mt-4 flex space-x-4">
                    {profile?.social?.github && (
                        <a href={profile.social.github} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors">
                            <FiGithub size={20} />
                        </a>
                    )}
                    {profile?.social?.linkedin && (
                        <a href={profile.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors">
                            <FiLinkedin size={20} />
                        </a>
                    )}
                    {profile?.social?.twitter && (
                        <a href={profile.social.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors">
                            <FiTwitter size={20} />
                        </a>
                    )}
                </div>
                
                {/* Profile Completion */}
                <div className="mt-6">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Profile Completion</span>
                        <span className="text-primary-600 font-medium">{completion}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${completion}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProfileCard
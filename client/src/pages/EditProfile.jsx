import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { profileService } from '../services/profile'
import toast from 'react-hot-toast'
import Loading from '../components/Common/Loading'

const EditProfile = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { data: profileResponse, isLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: profileService.getMyProfile,
    });

    const [formData, setFormData] = useState({
        headline: '',
        bio: '',
        location: '',
        skills: '',
        github: '',
        linkedin: '',
        twitter: '',
    })

    useEffect(() => {
        const profile = profileResponse?.data?.data || profileResponse?.data
        if (profile) {
            setFormData({
                headline: profile.headline || '',
                bio: profile.bio || '',
                location: profile.location || '',
                skills: profile.skills?.join(', ') || '',
                github: profile.social?.github || '',
                linkedin: profile.social?.linkedin || '',
                twitter: profile.social?.twitter || '',
            })
        }
    }, [profileResponse])

    const updateMutation = useMutation({
        mutationFn: (data) => profileService.updateProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profile"] })
            toast.success('Profile updated successfully!')
            navigate('/profile')
        },
        onError: (error) => {
            console.error('Update error:', error)
            toast.error(error.response?.data?.message || 'Failed to update profile')
        }
    })

    const handleSubmit = (e) => {
        e.preventDefault()

        console.log("Skills value:", formData.skills);
        console.log("Skills type:", typeof formData.skills);

        let skillsArray = formData.skills;
        if (typeof formData.skills === 'string') {
            skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s);
        } else if (Array.isArray(formData.skills)) {
            skillsArray = formData.skills;
        } else {
            skillsArray = [];
        }

        const data = {
            headline: formData.headline || "",
            bio: formData.bio || "",
            location: formData.location || "",
            skills: skillsArray,
            github: formData.github || "",
            linkedin: formData.linkedin || "",
            twitter: formData.twitter || "",
        }

        console.log("Submitting data:", data); 
        updateMutation.mutate(data)
    }

    if (isLoading) return <Loading />

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Headline</label>
                        <input
                            type="text"
                            value={formData.headline}
                            onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                            className="input-primary"
                            placeholder="e.g., Senior Full Stack Developer"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Bio</label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            rows="4"
                            className="input-primary"
                            placeholder="Tell us about yourself..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Location</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="input-primary"
                            placeholder="e.g., San Francisco, CA"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Skills (comma separated)</label>
                        <input
                            type="text"
                            value={formData.skills}
                            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                            className="input-primary"
                            placeholder="e.g., React, Node.js, MongoDB"
                        />
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold">Social Links</h3>
                        <div>
                            <input
                                type="url"
                                value={formData.github}
                                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                                className="input-primary"
                                placeholder="GitHub URL"
                            />
                        </div>
                        <div>
                            <input
                                type="url"
                                value={formData.linkedin}
                                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                                className="input-primary"
                                placeholder="LinkedIn URL"
                            />
                        </div>
                        <div>
                            <input
                                type="url"
                                value={formData.twitter}
                                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                                className="input-primary"
                                placeholder="Twitter URL"
                            />
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={updateMutation.isLoading}
                        >
                            {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/profile')}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default EditProfile
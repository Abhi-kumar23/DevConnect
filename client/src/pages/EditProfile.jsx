import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FiCamera, FiImage } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { profileService } from '../services/profile'
import Loading from '../components/Common/Loading'
import { getAvatarUrl } from '../utils/avatar'

const emptyForm = {
  headline: '', bio: '', location: '', skills: '', github: '', linkedin: '', twitter: '', portfolio: '',
}

const createImageFormData = (field, file) => {
  const data = new FormData()
  data.append(field, file)
  return data
}

const EditProfile = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, updateUser } = useAuth()
  const avatarInputRef = useRef(null)
  const coverInputRef = useRef(null)
  const hydratedProfileIdRef = useRef(null)
  const [formData, setFormData] = useState(emptyForm)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [coverPreview, setCoverPreview] = useState('')

  const { data: profileResponse, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.getMyProfile,
  })
  const profile = profileResponse?.data?.data || profileResponse?.data
  const profileUser = profile?.user || user

  useEffect(() => {
    if (!profile || hydratedProfileIdRef.current === profile._id) return
    hydratedProfileIdRef.current = profile._id
    setFormData({
      headline: profile.headline || '',
      bio: profile.bio || '',
      location: profile.location || '',
      skills: profile.skills?.join(', ') || '',
      github: profile.social?.github || '',
      linkedin: profile.social?.linkedin || '',
      twitter: profile.social?.twitter || '',
      portfolio: profile.social?.portfolio || '',
    })
  }, [profile])

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    if (coverPreview) URL.revokeObjectURL(coverPreview)
  }, [avatarPreview, coverPreview])

  const updateMutation = useMutation({
    mutationFn: profileService.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Profile updated successfully')
      navigate('/profile')
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update profile'),
  })

  const imageMutation = useMutation({
    mutationFn: ({ type, file }) => type === 'avatar'
      ? profileService.uploadProfilePic(createImageFormData('avatar', file))
      : profileService.uploadCoverPhoto(createImageFormData('cover', file)),
    onSuccess: (response, { type }) => {
      const imageData = response.data?.data || {}
      updateUser(imageData)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success(type === 'avatar' ? 'Profile picture updated' : 'Cover photo updated')
    },
    onError: (error, { type }) => {
      if (type === 'avatar') setAvatarPreview('')
      else setCoverPreview('')
      toast.error(error.response?.data?.message || 'Image upload failed')
    },
  })

  const setField = (field, value) => setFormData((current) => ({ ...current, [field]: value }))

  const handleImage = (type, event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file')
    if (file.size > 5 * 1024 * 1024) return toast.error('Images must be 5 MB or smaller')
    const preview = URL.createObjectURL(file)
    if (type === 'avatar') setAvatarPreview(preview)
    else setCoverPreview(preview)
    imageMutation.mutate({ type, file })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    updateMutation.mutate({
      ...formData,
      skills: formData.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
    })
  }

  if (isLoading) return <Loading />

  const avatar = avatarPreview || getAvatarUrl(profileUser)
  const cover = coverPreview || profileUser?.coverPhoto

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="relative h-40 bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-700">
          {cover && <img src={cover} alt="Cover preview" className="w-full h-full object-cover" />}
          <button type="button" onClick={() => coverInputRef.current?.click()} disabled={imageMutation.isPending}
            className="absolute right-4 bottom-4 bg-black/60 hover:bg-black/75 text-white rounded-lg px-3 py-2 flex items-center gap-2 text-sm disabled:opacity-60">
            <FiImage /> {imageMutation.isPending ? 'Uploading…' : 'Change cover'}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImage('cover', event)} />
        </div>
        <div className="relative px-6 pb-5">
          <div className="relative -mt-12 w-24 h-24">
            <img src={avatar} alt="Profile preview" className="w-24 h-24 rounded-full object-cover border-4 border-white bg-white" />
            <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={imageMutation.isPending}
              aria-label="Change profile picture" className="absolute bottom-0 right-0 p-2 rounded-full bg-primary-600 text-white border-2 border-white disabled:opacity-60">
              <FiCamera size={15} />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImage('avatar', event)} />
          </div>
          <p className="mt-3 text-sm text-gray-600">Upload a JPG, PNG, WebP, or GIF up to 5 MB. Image changes save immediately.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold mb-6">Edit profile</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block text-sm font-medium">Headline
            <input value={formData.headline} maxLength="100" onChange={(event) => setField('headline', event.target.value)} className="input-primary mt-2" placeholder="e.g. Full-stack developer" />
          </label>
          <label className="block text-sm font-medium">About
            <textarea value={formData.bio} maxLength="500" rows="5" onChange={(event) => setField('bio', event.target.value)} className="input-primary mt-2" placeholder="Tell the developer community about yourself" />
            <span className="mt-1 block text-right text-xs text-gray-400">{formData.bio.length}/500</span>
          </label>
          <label className="block text-sm font-medium">Location
            <input value={formData.location} maxLength="100" onChange={(event) => setField('location', event.target.value)} className="input-primary mt-2" placeholder="e.g. Bengaluru, India" />
          </label>
          <label className="block text-sm font-medium">Skills <span className="font-normal text-gray-500">(comma separated)</span>
            <input value={formData.skills} onChange={(event) => setField('skills', event.target.value)} className="input-primary mt-2" placeholder="React, Node.js, MongoDB" />
          </label>
          <fieldset className="space-y-3 border-t pt-5">
            <legend className="font-semibold mb-3">Links</legend>
            {[
              ['github', 'GitHub profile URL'], ['linkedin', 'LinkedIn profile URL'], ['twitter', 'Twitter profile URL'], ['portfolio', 'Portfolio URL'],
            ].map(([field, label]) => (
              <input key={field} type="url" value={formData[field]} onChange={(event) => setField(field, event.target.value)} className="input-primary" placeholder={label} />
            ))}
          </fieldset>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary disabled:opacity-60">{updateMutation.isPending ? 'Saving…' : 'Save changes'}</button>
            <button type="button" onClick={() => navigate('/profile')} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditProfile

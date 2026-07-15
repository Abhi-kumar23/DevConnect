import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FiMessageSquare, FiUserPlus } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { profileService } from '../services/profile'
import { postsService } from '../services/posts'
import { connectionsService } from '../services/connections'
import ProfileCard from '../components/Profile/ProfileCard'
import PostCard from '../components/Posts/PostCard'
import Loading from '../components/Common/Loading'

const PublicProfile = () => {
  const { userId } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: profileResponse, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['profile', userId], queryFn: () => profileService.getProfileByUserId(userId), enabled: !!userId,
  })
  const { data: postsResponse, isLoading: postsLoading } = useQuery({
    queryKey: ['userPosts', userId], queryFn: () => postsService.getUserPosts(userId, 1, 20), enabled: !!userId,
  })
  const connectMutation = useMutation({
    mutationFn: () => connectionsService.sendRequest(userId),
    onSuccess: () => {
      toast.success('Connection request sent')
      queryClient.invalidateQueries({ queryKey: ['suggestions'] })
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not send connection request'),
  })
  const refreshPosts = () => queryClient.invalidateQueries({ queryKey: ['userPosts', userId] })
  const likeMutation = useMutation({ mutationFn: postsService.likePost, onSuccess: refreshPosts, onError: (error) => toast.error(error.response?.data?.message || 'Could not update like') })
  const commentMutation = useMutation({ mutationFn: ({ postId, text }) => postsService.commentPost(postId, text), onSuccess: refreshPosts, onError: (error) => toast.error(error.response?.data?.message || 'Could not add comment') })

  if (profileLoading || postsLoading) return <Loading />
  if (profileError) return <div className="card max-w-3xl mx-auto text-center text-red-600">This profile is unavailable.</div>

  const profile = profileResponse?.data?.data || profileResponse?.data
  const profileUser = profile?.user
  const posts = postsResponse?.data?.data?.data || postsResponse?.data?.data || []
  const isOwnProfile = user?._id === profileUser?._id
  const isConnected = user?.connections?.some((connection) => String(connection?._id || connection) === String(userId))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ProfileCard profile={profile} user={profileUser} postsCount={posts.length} isOwnProfile={isOwnProfile} />
      {!isOwnProfile && <div className="flex gap-3">
        <Link to={`/chat?userId=${encodeURIComponent(userId)}`} className="btn-secondary flex items-center gap-2"><FiMessageSquare /> Message</Link>
        {!isConnected && <button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <FiUserPlus /> {connectMutation.isPending ? 'Sending…' : 'Connect'}
        </button>}
      </div>}
      <section className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Posts</h2>
        {posts.length ? <div className="space-y-4">{posts.map((post) => <PostCard key={post._id} post={post} onLike={() => likeMutation.mutate(post._id)} onComment={(text) => commentMutation.mutate({ postId: post._id, text })} />)}</div>
          : <p className="text-center text-gray-500 py-6">No posts shared yet.</p>}
      </section>
    </div>
  )
}

export default PublicProfile

import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FiSearch } from 'react-icons/fi'
import api from '../services/api'
import Loading from '../components/Common/Loading'
import { getAvatarUrl } from '../utils/avatar'

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.get('/search', { params: { q: query } }),
    enabled: query.trim().length > 0,
  })
  const results = data?.data?.data || {}
  const profiles = results.profiles || []
  const users = results.users || []
  const posts = results.posts || []
  const profileUserIds = new Set(profiles.map((profile) => String(profile.user?._id)))
  const people = [...profiles.map((profile) => ({ user: profile.user, headline: profile.headline, skills: profile.skills })),
    ...users.filter((user) => !profileUserIds.has(String(user._id))).map((user) => ({ user }))]

  const submit = (event) => {
    event.preventDefault()
    const value = new FormData(event.currentTarget).get('q')?.toString().trim()
    setSearchParams(value ? { q: value } : {})
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={submit} className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input name="q" defaultValue={query} className="input-primary pl-11 py-3" placeholder="Search developers, skills, and posts" autoFocus />
      </form>
      {!query && <div className="card text-center text-gray-500">Search by a name, skill, location, or post content.</div>}
      {query && isLoading && <Loading />}
      {query && !isLoading && <>
        <div className="flex items-baseline justify-between"><h1 className="text-xl font-bold">Results for “{query}”</h1>{isFetching && <span className="text-sm text-gray-500">Updating…</span>}</div>
        {people.length > 0 && <section className="space-y-3"><h2 className="font-semibold">Developers</h2><div className="grid gap-3 md:grid-cols-2">
          {people.map(({ user, headline, skills }) => <Link key={user?._id} to={`/profile/${user?._id}`} className="card p-4 flex items-center gap-3 hover:border-primary-300 hover:shadow-md transition">
            <img src={getAvatarUrl(user)} alt="" className="w-12 h-12 rounded-full object-cover" /><div className="min-w-0"><p className="font-semibold truncate">{user?.firstName} {user?.lastName}</p><p className="text-sm text-gray-600 truncate">{headline || 'Developer'}</p>{skills?.length > 0 && <p className="text-xs text-gray-500 truncate mt-1">{skills.slice(0, 3).join(' · ')}</p>}</div>
          </Link>)}
        </div></section>}
        {posts.length > 0 && <section className="space-y-3"><h2 className="font-semibold">Posts</h2>{posts.map((post) => <Link to={`/profile/${post.user?._id}`} key={post._id} className="block card p-4 hover:border-primary-300"><p className="font-medium">{post.user?.firstName} {post.user?.lastName}</p><p className="text-gray-700 whitespace-pre-wrap mt-2">{post.content}</p></Link>)}</section>}
        {!people.length && !posts.length && <div className="card text-center text-gray-500">No matching developers or posts found.</div>}
      </>}
    </div>
  )
}

export default Search

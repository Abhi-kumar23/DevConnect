import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { FiArrowRight, FiLock, FiMail } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import PublicNavbar from '../components/Layout/PublicNavbar'
import Logo from '../components/Common/Logo'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, loginWithGoogle } = useAuth()
  const hasGoogleLogin = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID) &&
    import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'your-google-client-id.apps.googleusercontent.com'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    await login(email, password)
    setLoading(false)
  }

  const handleGoogleLogin = async (credentialResponse) => {
    if (!credentialResponse.credential) {
      return
    }
    setLoading(true)
    await loginWithGoogle(credentialResponse.credential)
    setLoading(false)
  }

  return (
    <div className="min-h-screen">
      <PublicNavbar />
      <div className="grid lg:grid-cols-2 min-h-[calc(100vh-4rem)]">
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-teal-950 to-indigo-950 text-white">
          {/* <Logo to="/login" className="[&_span:last-child]:text-white" /> */}
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-teal-300 font-semibold">Developer network</p>
            <h1 className="mt-4 text-4xl xl:text-5xl font-extrabold leading-tight">
              Share work. Find collaborators. Grow your craft.
            </h1>
            <p className="mt-4 text-lg text-slate-300 max-w-md">
              Posts, connections, project teams, and real-time chat — built for people who ship.
            </p>
          </div>
          <p className="text-sm text-slate-400">Join developers already building in public.</p>
        </div>

        <div className="flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8"><Logo /></div>
            <div className="card">
              <h2 className="text-2xl font-extrabold text-slate-900">Welcome back</h2>
              <p className="mt-1 text-slate-500">Sign in to continue to DevConnect</p>

              {hasGoogleLogin && (
                <>
                  <div className={`mt-6 ${loading ? 'pointer-events-none opacity-60' : ''}`}>
                    <GoogleLogin onSuccess={handleGoogleLogin} onError={() => {}} text="continue_with" width="auto" />
                  </div>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-slate-400">or email</span></div>
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className={`space-y-4 ${!hasGoogleLogin ? 'mt-6' : ''}`}>
                <label className="block text-sm font-semibold text-slate-700">
                  Email
                  <div className="relative mt-1.5">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input-primary pl-10" placeholder="you@example.com" autoComplete="email" required />
                  </div>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Password
                  <div className="relative mt-1.5">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input-primary pl-10" placeholder="••••••••" autoComplete="current-password" required />
                  </div>
                </label>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? 'Signing in…' : <>Sign in <FiArrowRight /></>}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-600">
                New here? <Link to="/register" className="text-primary-700 font-semibold hover:underline">Create an account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

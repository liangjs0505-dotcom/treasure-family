import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import Auth from '../pages/Auth'
import { fetchMe, logout as logoutRequest } from '../api/auth'
import { getToken } from '../api/client'

interface AuthContextValue {
  username: string
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (!getToken()) {
        if (!cancelled) setReady(true)
        return
      }
      const me = await fetchMe()
      if (cancelled) return
      setUsername(me?.username ?? null)
      setReady(true)
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return <div className="boot">正在检查登录状态…</div>
  }

  if (!username) {
    return <Auth onLoggedIn={setUsername} />
  }

  const logout = async () => {
    await logoutRequest()
    setUsername(null)
  }

  return (
    <AuthContext.Provider value={{ username, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth 必须在登录后的页面里使用')
  }
  return value
}

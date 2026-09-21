import { useEffect, useState, type FormEvent } from 'react'
import { login } from '../../api/auth'
import { toErrorMessage, useToast } from '../../components/Toast'
import './index.scss'

interface Props {
  onLoggedIn: (username: string) => void
  onGoRegister: () => void
}

export default function Login({ onLoggedIn, onGoRegister }: Props) {
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = '登录 · Treasure Family'
    return () => {
      document.title = 'Treasure Family'
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const result = await login(username.trim(), password)
      setPassword('')
      onLoggedIn(result.username)
    } catch (err) {
      const message = toErrorMessage(err, '登录失败')
      setPassword('')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit} autoComplete="on">
        <div className="login-brand">
          <span className="brand-icon">🛒</span>
          <h1>Treasure Family</h1>
          <p>宝藏之家 · 请先登录</p>
        </div>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <label className="login-field">
          用户名
          <input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={32}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>

        <label className="login-field">
          密码
          <span className="login-password">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              className="login-toggle"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? '隐藏' : '显示'}
            </button>
          </span>
        </label>

        <button className="btn primary login-submit" type="submit" disabled={loading}>
          {loading ? '正在验证…' : '登录'}
        </button>

        <p className="login-switch">
          还没有账号？
          <button type="button" onClick={onGoRegister}>
            去注册
          </button>
        </p>
      </form>
    </div>
  )
}

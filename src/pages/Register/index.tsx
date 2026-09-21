import { useEffect, useState, type FormEvent } from 'react'
import { register } from '../../api/auth'
import { toErrorMessage, useToast } from '../../components/Toast'
import '../Login/index.scss'

interface Props {
  onLoggedIn: (username: string) => void
  onGoLogin: () => void
}

function usernameHint(username: string) {
  if (!username) return '3–32 位，仅字母、数字、下划线'
  if (username.length < 3) return '用户名至少 3 位'
  if (!/^[A-Za-z0-9_]+$/.test(username)) return '只能用字母、数字和下划线'
  return ''
}

function passwordHint(password: string) {
  if (!password) return '至少 12 位，需同时包含字母和数字'
  if (password.length < 12) return '还差 ' + (12 - password.length) + ' 位'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return '须同时包含字母和数字'
  return ''
}

export default function Register({ onLoggedIn, onGoLogin }: Props) {
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = '注册 · Treasure Family'
    return () => {
      document.title = 'Treasure Family'
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    const nameHint = usernameHint(username.trim())
    if (nameHint) {
      setError(nameHint)
      toast.error(nameHint)
      return
    }
    const hint = passwordHint(password)
    if (hint) {
      setError(hint)
      toast.error(hint)
      return
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致')
      toast.error('两次输入的密码不一致')
      setConfirm('')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await register(username.trim(), password)
      setPassword('')
      setConfirm('')
      onLoggedIn(result.username)
    } catch (err) {
      const message = toErrorMessage(err, '注册失败')
      setPassword('')
      setConfirm('')
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
          <p>宝藏之家 · 创建账号</p>
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
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9_]+"
            title="只能用字母、数字和下划线"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <span className="login-hint">{usernameHint(username.trim()) || '用户名格式符合要求'}</span>
        </label>

        <label className="login-field">
          密码
          <span className="login-password">
            <input
              name="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
            />
            <button
              type="button"
              className="login-toggle"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? '隐藏' : '显示'}
            </button>
          </span>
          <span className="login-hint">{passwordHint(password) || '密码强度符合要求'}</span>
        </label>

        <label className="login-field">
          确认密码
          <input
            name="confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            maxLength={72}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={12}
          />
        </label>

        <button className="btn primary login-submit" type="submit" disabled={loading}>
          {loading ? '正在创建…' : '注册并进入'}
        </button>

        <p className="login-switch">
          已有账号？
          <button type="button" onClick={onGoLogin}>
            去登录
          </button>
        </p>
      </form>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { resetAdminPassword, verifyAdminPassword } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../Toast'
import Dialog from '../Dialog'
import Dashboard from '../Dashboard'
import GoodsForm from '../GoodsForm'
import Inventory, { type InventoryQuery } from '../Inventory'
import Restock from '../Restock'
import Books from '../Books'
import Ranks from '../Ranks'
import Checkout from '../Checkout'
import type { Goods } from '../../types'

type Panel =
  | { type: 'inventory'; query: InventoryQuery }
  | { type: 'restock' }
  | { type: 'books' }
  | { type: 'ranks'; kind: 'hot' | 'cold' }

type Tab = 'dashboard' | 'entry' | 'checkout'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: '数据看板', icon: '📊' },
  { key: 'entry', label: '货物录入', icon: '📝' },
  { key: 'checkout', label: '结账', icon: '🧾' },
]

export default function Workspace() {
  const { username, logout } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [editing, setEditing] = useState<Goods | null>(null)
  const [editFromInventory, setEditFromInventory] = useState(false)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [adminMode, setAdminMode] = useState(false)
  const [adminPrompt, setAdminPrompt] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminNotice, setAdminNotice] = useState('')
  const [adminChecking, setAdminChecking] = useState(false)
  const [adminReset, setAdminReset] = useState(false)
  const [adminCurrent, setAdminCurrent] = useState('')
  const [adminNext, setAdminNext] = useState('')

  const handleEdit = (item: Goods) => {
    setEditing(item)
    setEditFromInventory(true)
    setTab('entry')
  }

  const finishEntry = () => {
    setEditing(null)
    if (!editFromInventory) return
    setEditFromInventory(false)
    setTab('dashboard')
  }

  const closeAdminPrompt = () => {
    if (adminChecking) return
    setAdminPrompt(false)
    setAdminPassword('')
    setAdminError('')
    setAdminNotice('')
    setAdminReset(false)
    setAdminCurrent('')
    setAdminNext('')
  }

  const openAdminPrompt = () => {
    if (adminMode) {
      setAdminMode(false)
      if (panel?.type === 'books' || panel?.type === 'ranks') {
        setPanel(null)
        setTab('dashboard')
      }
      return
    }
    setAdminPassword('')
    setAdminError('')
    setAdminNotice('')
    setAdminReset(false)
    setAdminCurrent('')
    setAdminNext('')
    setAdminPrompt(true)
  }

  const adminNextHint = () => {
    if (!adminNext.trim()) return '新密码 5 到 8 位'
    const short = 5 - adminNext.length
    if (short > 0) return '还差 ' + short + ' 位'
    if (adminNext.length > 8) return '最长 8 位'
    return ''
  }

  const submitAdminPassword = async () => {
    if (adminChecking) return
    if (!adminPassword.trim()) {
      setAdminError('请输入管理员密码')
      return
    }
    setAdminChecking(true)
    setAdminError('')
    try {
      await verifyAdminPassword(adminPassword)
      setAdminMode(true)
      setAdminPrompt(false)
      setAdminPassword('')
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '管理员密码不正确')
    } finally {
      setAdminChecking(false)
    }
  }

  const openAdminReset = () => {
    if (adminChecking) return
    setAdminError('')
    setAdminNotice('')
    setAdminCurrent('')
    setAdminNext('')
    setAdminReset(true)
  }

  const submitAdminReset = async () => {
    if (adminChecking) return
    if (!adminCurrent.trim()) {
      setAdminError('请输入原密码')
      return
    }
    const hint = adminNextHint()
    if (hint) {
      setAdminError(hint)
      return
    }
    setAdminChecking(true)
    setAdminError('')
    try {
      await resetAdminPassword(adminCurrent, adminNext)
      setAdminReset(false)
      setAdminCurrent('')
      setAdminNext('')
      setAdminPassword('')
      setAdminNotice('管理员密码已重置，请输入新密码')
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '原密码不正确')
    } finally {
      setAdminChecking(false)
    }
  }

  useEffect(() => {
    if (!adminPrompt) return
    document.getElementById(adminReset ? 'admin-password-current' : 'admin-password')?.focus()
  }, [adminPrompt, adminReset])

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">🛒</span>
          <div>
            <h1>Treasure Family</h1>
          </div>
        </div>
        <div className="session">
          <div className="session-bar">
            <span className="session-user">{username}</span>
            <button className="btn ghost" type="button" onClick={() => void logout()}>
              退出
            </button>
          </div>
          <button
            className={`admin-mode${adminMode ? ' on' : ''}`}
            type="button"
            aria-pressed={adminMode}
            onClick={openAdminPrompt}
          >
            <span className="admin-mode-dot" aria-hidden="true" />
            <span>管理员模式</span>
            <span className="admin-mode-state">{adminMode ? '已开启' : '未开启'}</span>
          </button>
        </div>
      </header>

      <Dialog
        open={adminPrompt}
        title={adminReset ? '重置管理员密码' : '管理员模式'}
        onCancel={closeAdminPrompt}
        description={
          adminReset ? (
            <>
              <label className="dialog-password">
                原密码
                <input
                  id="admin-password-current"
                  type="password"
                  autoComplete="current-password"
                  value={adminCurrent}
                  onChange={(event) => {
                    setAdminCurrent(event.target.value)
                    if (adminError) setAdminError('')
                  }}
                />
              </label>
              <label className="dialog-password">
                新密码
                <input
                  id="admin-password-next"
                  type="password"
                  autoComplete="new-password"
                  maxLength={8}
                  value={adminNext}
                  onChange={(event) => {
                    setAdminNext(event.target.value.slice(0, 8))
                    if (adminError) setAdminError('')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void submitAdminReset()
                    }
                  }}
                />
                <span className="dialog-password-note">{adminNextHint() || '长度符合要求'}</span>
              </label>
              {adminError ? <p className="dialog-password-error">{adminError}</p> : null}
            </>
          ) : (
            <label className="dialog-password">
              管理员密码
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={adminPassword}
                onChange={(event) => {
                  setAdminPassword(event.target.value)
                  if (adminError) setAdminError('')
                  if (adminNotice) setAdminNotice('')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void submitAdminPassword()
                  }
                }}
              />
              {adminNotice ? <p className="dialog-password-note">{adminNotice}</p> : null}
              {adminError ? <p className="dialog-password-error">{adminError}</p> : null}
            </label>
          )
        }
        actions={
          adminReset
            ? [{ label: adminChecking ? '正在保存…' : '确认', disabled: adminChecking, onClick: () => void submitAdminReset() }]
            : [
                { label: adminChecking ? '正在确认…' : '确认', disabled: adminChecking, onClick: () => void submitAdminPassword() },
                { label: '重置管理员密码', tone: 'plain', disabled: adminChecking, onClick: openAdminReset },
              ]
        }
      />

      <nav className="tabs">
        {TABS.map((item) => (
          <button
            key={item.key}
            className={`tab ${tab === item.key ? 'active' : ''}`}
            onClick={() => {
              if (item.key !== 'entry') {
                setEditing(null)
                setEditFromInventory(false)
              }
              setTab(item.key)
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <main className="content">
        <div hidden={tab !== 'dashboard'}>
          {!panel && (
            <Dashboard
              adminMode={adminMode}
              onOpenInventory={() =>
                setPanel({ type: 'inventory', query: { category: '全部', keyword: '', status: 'all' } })
              }
              onOpenRestock={() => setPanel({ type: 'restock' })}
              onOpenBooks={() => {
                if (!adminMode) {
                  toast.error('请开启管理员模式')
                  return
                }
                setPanel({ type: 'books' })
              }}
              onOpenRanks={(kind) => {
                if (!adminMode) {
                  toast.error('请开启管理员模式')
                  return
                }
                setPanel({ type: 'ranks', kind })
              }}
            />
          )}
          {panel?.type === 'books' && (
            <Books active={tab === 'dashboard'} onBack={() => setPanel(null)} />
          )}
          {panel?.type === 'inventory' && (
            <Inventory
              query={panel.query}
              adminMode={adminMode}
              onBack={() => setPanel(null)}
              onEdit={handleEdit}
            />
          )}
          {panel?.type === 'restock' && <Restock onBack={() => setPanel(null)} />}
          {panel?.type === 'ranks' && <Ranks kind={panel.kind} onBack={() => setPanel(null)} />}
        </div>
        {tab === 'entry' && <GoodsForm editing={editing} active onDone={finishEntry} />}
        <div hidden={tab !== 'checkout'}>
          <Checkout active={tab === 'checkout'} />
        </div>
      </main>
    </div>
  )
}

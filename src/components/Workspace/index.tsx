import { useState } from 'react'
import { useGoods } from '../../context/GoodsContext'
import { useAuth } from '../../context/AuthContext'
import Dashboard from '../Dashboard'
import GoodsForm from '../GoodsForm'
import GoodsList from '../GoodsList'
import type { Goods } from '../../types'

type Tab = 'dashboard' | 'entry' | 'list'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: '数据看板', icon: '📊' },
  { key: 'entry', label: '货物录入', icon: '📝' },
  { key: 'list', label: '库存清单', icon: '📋' },
]

export default function Workspace() {
  const { username, logout } = useAuth()
  const { stats } = useGoods()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [editing, setEditing] = useState<Goods | null>(null)

  const handleEdit = (item: Goods) => {
    setEditing(item)
    setTab('entry')
  }

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
          <span className="session-user">{username}</span>
          <button className="btn ghost" type="button" onClick={() => void logout()}>
            退出
          </button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => {
              if (t.key !== 'entry') setEditing(null)
              setTab(t.key)
            }}
          >
            <span>{t.icon}</span>
            {t.label}
            {t.key === 'list' && stats.lowStockCount > 0 && (
              <span className="badge">{stats.lowStockCount}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'entry' && (
          <GoodsForm editing={editing} onDone={() => setEditing(null)} />
        )}
        {tab === 'list' && <GoodsList onEdit={handleEdit} />}
      </main>
    </div>
  )
}

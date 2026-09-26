import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
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
  const [tab, setTab] = useState<Tab>('dashboard')
  const [editing, setEditing] = useState<Goods | null>(null)
  const [editFromInventory, setEditFromInventory] = useState(false)
  const [panel, setPanel] = useState<Panel | null>(null)

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
              onOpenInventory={() =>
                setPanel({ type: 'inventory', query: { category: '全部', keyword: '', status: 'all' } })
              }
              onOpenRestock={() => setPanel({ type: 'restock' })}
              onOpenBooks={() => setPanel({ type: 'books' })}
              onOpenRanks={(kind) => setPanel({ type: 'ranks', kind })}
            />
          )}
          {panel?.type === 'books' && (
            <Books active={tab === 'dashboard'} onBack={() => setPanel(null)} />
          )}
          {panel?.type === 'inventory' && (
            <Inventory query={panel.query} onBack={() => setPanel(null)} onEdit={handleEdit} />
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

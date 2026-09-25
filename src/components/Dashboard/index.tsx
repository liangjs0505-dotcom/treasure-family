import { useEffect, useState } from 'react'
import { fetchRanks, peekRanks, type RankItem } from '../../api/sales'
import { useGoods } from '../../context/GoodsContext'
import { toErrorMessage, useToast } from '../Toast'
import './index.scss'

const yuan = (n: number) => `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

interface Props {
  onOpenInventory: () => void
  onOpenRestock: () => void
  onOpenBooks: () => void
  onOpenRanks: (kind: 'hot' | 'cold') => void
}

export default function Dashboard({ onOpenInventory, onOpenRestock, onOpenBooks, onOpenRanks }: Props) {
  const toast = useToast()
  const { goods, today, needsRestock } = useGoods()
  const restock = goods.filter(needsRestock).sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, 'zh-CN'))
  const [hot, setHot] = useState<RankItem[]>([])
  const [cold, setCold] = useState<RankItem[]>([])
  const coldReady = goods.some((item) => item.createdAt > 0 && item.createdAt <= monthAgo())

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const cached = peekRanks()
      if (cached) {
        setHot(cached.hot)
        setCold(cached.cold)
        return
      }
      try {
        const board = await fetchRanks()
        if (!cancelled) {
          setHot(board.hot)
          setCold(board.cold)
        }
      } catch (err) {
        if (!cancelled) toast.error(toErrorMessage(err, '加载商品榜单失败'))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [toast, today.soldQty])

  return (
    <div className="dashboard">
      <div className="stat-cards">
        <button type="button" className="stat-card green" onClick={onOpenBooks}>
          <span className="stat-hint">点击查看详细信息</span>
          <div className="stat-main">
            <span className="stat-icon">💵</span>
            <div className="stat-body">
              <div className="stat-value">{yuan(today.revenue)}</div>
              <div className="stat-label">当日流水</div>
            </div>
            <div className="stat-pay-slot">
              <div className="stat-pays">
                <i>现金</i>
                <b>{yuan(today.cashRevenue)}</b>
                <i>刷卡</i>
                <b>{yuan(today.cardRevenue)}</b>
              </div>
            </div>
            <div className="stat-note">卖出 {today.soldQty} 件</div>
          </div>
        </button>
        <button type="button" className="stat-card gold" onClick={onOpenBooks}>
          <span className="stat-hint">点击查看详细信息</span>
          <div className="stat-main">
            <span className="stat-icon">📈</span>
            <div className="stat-body">
              <div className="stat-value">{yuan(today.profit)}</div>
              <div className="stat-label">当日利润</div>
            </div>
          </div>
        </button>
        <button type="button" className="stat-card blue" onClick={onOpenInventory}>
          <span className="stat-hint">点击查看详细信息</span>
          <div className="stat-main">
            <span className="stat-icon">📦</span>
            <div className="stat-body">
              <div className="stat-value">货物管理</div>
              <div className="stat-label" aria-hidden="true">
                &nbsp;
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="rank-row">
        <RankCard
          title="畅销商品榜单"
          tone="hot"
          ready
          lockedText=""
          empty="还没有卖出记录"
          rows={hot}
          onOpen={() => onOpenRanks('hot')}
        />
        <RankCard
          title="滞销商品榜单"
          tone="cold"
          ready={coldReady}
          lockedText="使用满一个月解锁滞销商品榜单"
          empty="近一个月没有滞销商品"
          rows={cold}
          onOpen={() => onOpenRanks('cold')}
        />
      </div>

      {restock.length === 0 ? (
        <section className="card alert-panel">
          <h3 className="card-title">低库存预警</h3>
          <p className="empty">没有低库存货物</p>
        </section>
      ) : (
        <button type="button" className="card alert-panel" onClick={onOpenRestock}>
          <div className="alert-head">
            <span className="card-title">
              低库存预警
              <span className="badge">{restock.length}</span>
            </span>
            <span className="detail-hint">点击查看详情信息</span>
          </div>
          <ul className="alert-list">
            {restock.map((item) => {
              const ratio = item.threshold > 0 ? Math.min(100, (item.stock / item.threshold) * 100) : 0
              return (
                <li key={item.id}>
                  <div className="alert-main">
                    <span className="alert-name">{item.name}</span>
                    <div className="alert-track">
                      <div style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                  <div className="alert-figures">
                    <div className="figure low">
                      <b>
                        {item.stock}
                        <small>{item.unit}</small>
                      </b>
                      <span>库存</span>
                    </div>
                    <div className="figure">
                      <b>
                        {item.threshold}
                        <small>{item.unit}</small>
                      </b>
                      <span>预警线</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </button>
      )}
    </div>
  )
}

function monthAgo() {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return date.getTime()
}

function rankTag(item: RankItem) {
  if (item.level === 'none') return '一个月没卖出'
  if (item.level === 'few') return `卖得很少 · ${item.soldQty}${item.unit}`
  if (item.level === 'slow') return `动销偏慢 · ${item.soldQty}${item.unit}`
  return `累计 ${item.soldQty}${item.unit}`
}

function RankCard({
  title,
  tone,
  ready,
  lockedText,
  empty,
  rows,
  onOpen,
}: {
  title: string
  tone: 'hot' | 'cold'
  ready: boolean
  lockedText: string
  empty: string
  rows: RankItem[]
  onOpen: () => void
}) {
  const preview = rows.slice(0, 3)
  if (!ready || rows.length === 0) {
    return (
      <section className={`card rank-panel ${tone}`}>
        <h3 className="card-title">{title}</h3>
        <p className="empty">{ready ? empty : lockedText}</p>
      </section>
    )
  }
  return (
    <button type="button" className={`card rank-panel ${tone}`} onClick={onOpen}>
      <div className="alert-head">
        <span className="card-title">{title}</span>
        <span className="detail-hint">点击查看详情信息</span>
      </div>
      <ol className="rank-list">
        {preview.map((item, index) => (
          <li key={item.goodsId}>
            <span className="rank-index">{index + 1}</span>
            <span className="rank-name">{item.name}</span>
            <span className={`rank-tag ${item.level || tone}`}>{rankTag(item)}</span>
          </li>
        ))}
      </ol>
    </button>
  )
}

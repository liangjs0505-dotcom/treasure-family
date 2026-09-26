import { useEffect, useState } from 'react'
import { fetchRanks, peekRanks, type RankItem } from '../../api/sales'
import { useGoods } from '../../context/GoodsContext'
import { toErrorMessage, useToast } from '../Toast'
import './index.scss'

const yuan = (n: number) => `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const SEAL = (() => {
  const cx = 40
  const cy = 34
  const points = 12
  const outer = 32
  const inner = 26.5
  const pts: string[] = []
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + (i * Math.PI) / points
    pts.push(`${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`)
  }
  return pts.join(' ')
})()

function PlaceMark({ index }: { index: number }) {
  const place = index + 1
  if (index >= 3) return <span className="rank-plain">{place}</span>
  const metal = index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'
  const clip = `medal-shine-${metal}`
  return (
    <span className={`medal metal-${metal}`}>
      <svg viewBox="0 0 80 70" width="80" height="70" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <clipPath id={clip}>
            <circle cx="40" cy="34" r="16.5" />
          </clipPath>
        </defs>
        <polygon className="medal-seal" points={SEAL} />
        <polygon className="medal-tail" points="18,47 37,47 36,57 31,57 26,65 16,57" />
        <polygon className="medal-tail medal-tail-deep" points="43,47 62,47 64,57 54,65 49,57 44,57" />
        <circle className="medal-disc" cx="40" cy="34" r="20.5" />
        <circle className="medal-ring" cx="40" cy="34" r="17.4" />
        <circle className="medal-inner" cx="40" cy="34" r="14.8" />
        <g clipPath={`url(#${clip})`}>
          <rect x="-16" y="14" width="112" height="7" fill="#fff" opacity="0.62" transform="rotate(-32 40 34)" />
          <rect x="-16" y="28" width="112" height="6" fill="#fff" opacity="0.38" transform="rotate(-32 40 34)" />
        </g>
      </svg>
      <span className="medal-num">{place}</span>
    </span>
  )
}

function monthAgo() {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return date.getTime()
}

type HotSort = 'sold' | 'profit'

function sortedHot(rows: RankItem[], sort: HotSort) {
  return [...rows].sort((a, b) => {
    if (sort === 'profit') return b.profit - a.profit || b.soldQty - a.soldQty
    return b.soldQty - a.soldQty || b.profit - a.profit
  })
}

interface Props {
  kind: 'hot' | 'cold'
  onBack: () => void
}

export default function Ranks({ kind, onBack }: Props) {
  const toast = useToast()
  const { goods } = useGoods()
  const [rows, setRows] = useState<RankItem[] | null>(() => {
    const board = peekRanks()
    if (!board) return null
    return kind === 'hot' ? board.hot : board.cold
  })
  const [hotSort, setHotSort] = useState<HotSort>('sold')
  const ready = kind === 'hot' || goods.some((item) => item.createdAt > 0 && item.createdAt <= monthAgo())

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const cached = peekRanks()
      if (cached) {
        setRows(kind === 'hot' ? cached.hot : cached.cold)
        return
      }
      try {
        const board = await fetchRanks()
        if (!cancelled) setRows(kind === 'hot' ? board.hot : board.cold)
      } catch (err) {
        if (!cancelled) toast.error(toErrorMessage(err, '加载榜单失败'))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [kind, toast])

  const title = kind === 'hot' ? '畅销商品榜单' : '滞销商品榜单'
  const note = !ready
    ? '使用满一个月解锁滞销商品榜单'
    : kind === 'hot'
      ? hotSort === 'profit'
        ? '按总利润排列，最多展示前 50 名'
        : '按累计销量排列，最多展示前 50 名'
      : '按近一个月销量区分：没卖出、卖得很少、动销偏慢'
  const hotRows = kind === 'hot' && rows ? sortedHot(rows, hotSort).slice(0, 50) : []

  return (
    <section className="ranks">
      <div className="ranks-head">
        <button className="btn" type="button" onClick={onBack}>
          返回看板
        </button>
        <h2>{title}</h2>
      </div>
      <p className="ranks-note">{note}</p>
      {kind === 'hot' && ready && rows !== null && rows.length > 0 && (
        <div className="ranks-sort" role="tablist" aria-label="畅销排序">
          <button type="button" className={hotSort === 'sold' ? 'active' : ''} onClick={() => setHotSort('sold')}>
            按销量
          </button>
          <button type="button" className={hotSort === 'profit' ? 'active' : ''} onClick={() => setHotSort('profit')}>
            按利润
          </button>
        </div>
      )}
      {!ready ? null : rows === null ? (
        <p className="empty">正在加载…</p>
      ) : rows.length === 0 ? (
        <p className="empty">{kind === 'hot' ? '还没有卖出记录' : '近一个月没有滞销商品'}</p>
      ) : kind === 'hot' ? (
        <ol className="hot-board">
          {hotRows.map((item, index) => (
            <li key={item.goodsId} className={index < 3 ? `place-${index + 1}` : 'place-rest'}>
              <PlaceMark index={index} />
              <div className="place-main">
                <strong>{item.name}</strong>
                {item.category && <span className="tag">{item.category}</span>}
              </div>
              <div className="stat">
                <span>售价</span>
                <b>{yuan(item.price)}</b>
              </div>
              <div className="stat">
                <span>进价</span>
                <b>{yuan(item.cost)}</b>
              </div>
              <div className="stat">
                <span>单件利润</span>
                <b>{yuan(item.price - item.cost)}</b>
              </div>
              <div className="stat">
                <span>累计卖出</span>
                <b>
                  {item.soldQty}
                  <small>{item.unit}</small>
                </b>
              </div>
              <div className={`stat total ${item.profit < 0 ? 'down' : 'up'}`}>
                <span>总利润</span>
                <b>{yuan(item.profit)}</b>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <div className="ranks-summary">
            共 <b>{rows.length}</b> 种
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>滞销情况</th>
                  <th>近月卖出</th>
                  <th>销售额</th>
                  <th>现有</th>
                  <th>售价</th>
                  <th>进价</th>
                  <th>供应商</th>
                  <th>购买地点</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.goodsId}>
                    <td className="cell-name">
                      {item.name}
                      {item.category && <span className="tag">{item.category}</span>}
                    </td>
                    <td>{item.levelLabel}</td>
                    <td>{`${item.soldQty}${item.unit}`}</td>
                    <td>{yuan(item.revenue)}</td>
                    <td>{`${item.stock}${item.unit}`}</td>
                    <td>{yuan(item.price)}</td>
                    <td>{yuan(item.cost)}</td>
                    <td>{item.supplier || '—'}</td>
                    <td>{item.purchasePlace || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

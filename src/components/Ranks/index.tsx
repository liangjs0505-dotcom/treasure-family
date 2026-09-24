import { useEffect, useState } from 'react'
import { fetchRanks, peekRanks, type RankItem } from '../../api/sales'
import { useGoods } from '../../context/GoodsContext'
import { toErrorMessage, useToast } from '../Toast'
import './index.scss'

const yuan = (n: number) => `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function monthAgo() {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return date.getTime()
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
      ? '按累计销量排列，最多展示前 50 名'
      : '按近一个月销量区分：没卖出、卖得很少、动销偏慢'

  return (
    <section className="ranks">
      <div className="ranks-head">
        <button className="btn" type="button" onClick={onBack}>
          返回看板
        </button>
        <h2>{title}</h2>
      </div>
      <p className="ranks-note">{note}</p>
      {!ready ? null : rows === null ? (
        <p className="empty">正在加载…</p>
      ) : rows.length === 0 ? (
        <p className="empty">{kind === 'hot' ? '还没有卖出记录' : '近一个月没有滞销商品'}</p>
      ) : kind === 'hot' ? (
        <ol className="hot-board">
          {rows.slice(0, 50).map((item, index) => (
            <li key={item.goodsId} className={index < 10 ? `medal place-${index + 1}` : ''}>
              <span className="place-no">{index + 1}</span>
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

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchCompare,
  fetchSaleDetails,
  peekCompare,
  peekSaleDetails,
  type ComparePoint,
  type CompareRange,
  type CompareReport,
  type SaleDetailReport,
  type SaleOrderDetail,
} from '../../api/sales'
import { toErrorMessage, useToast } from '../Toast'
import './index.scss'

const RANGES: { key: CompareRange; label: string }[] = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '今年' },
]

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const PAGE_QTY = 50

function orderQty(order: SaleOrderDetail) {
  const fromLines = order.lines.reduce((sum, line) => sum + line.qty, 0)
  return fromLines > 0 ? fromLines : order.soldQty
}

function pagesOf(orders: SaleOrderDetail[]) {
  const pages: SaleOrderDetail[][] = []
  let page: SaleOrderDetail[] = []
  let qty = 0
  for (const order of orders) {
    const next = orderQty(order)
    if (page.length > 0 && qty + next > PAGE_QTY) {
      pages.push(page)
      page = []
      qty = 0
    }
    page.push(order)
    qty += next
  }
  if (page.length > 0) pages.push(page)
  return pages
}

const yuan = (n: number) =>
  `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function iso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseIso(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function todayIso() {
  return iso(new Date())
}

interface Props {
  active: boolean
  onBack: () => void
}

export default function Books({ active, onBack }: Props) {
  const toast = useToast()
  const [range, setRange] = useState<CompareRange>('week')
  const [report, setReport] = useState<CompareReport | null>(() => peekCompare('week') ?? null)
  const [chartLoading, setChartLoading] = useState(() => peekCompare('week') == null)
  const today = todayIso()
  const [day, setDay] = useState(today)
  const [cursor, setCursor] = useState(() => parseIso(today))
  const [detail, setDetail] = useState<SaleDetailReport | null>(() => peekSaleDetails(today, today) ?? null)
  const [detailLoading, setDetailLoading] = useState(() => peekSaleDetails(today, today) == null)
  const [page, setPage] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const pageChanged = useRef(false)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    const load = async () => {
      const cached = peekCompare(range)
      if (cached) {
        setReport(cached)
        setChartLoading(false)
        return
      }
      setChartLoading(true)
      try {
        const next = await fetchCompare(range)
        if (!cancelled) setReport(next)
      } catch (err) {
        if (!cancelled) toast.error(toErrorMessage(err, '加载经营对比失败'))
      } finally {
        if (!cancelled) setChartLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [active, range, toast])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    const load = async () => {
      const cached = peekSaleDetails(day, day)
      if (cached) {
        setDetail(cached)
        setDetailLoading(false)
        return
      }
      setDetailLoading(true)
      try {
        const next = await fetchSaleDetails(day, day)
        if (!cancelled) setDetail(next)
      } catch (err) {
        if (!cancelled) toast.error(toErrorMessage(err, '加载明细失败'))
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [active, day, toast])

  const showPage = (next: number) => {
    pageChanged.current = true
    setPage(next)
  }

  const pickDay = (value: string) => {
    setDay(value)
    setCursor(parseIso(value))
    setPage(0)
  }

  const orders = detail?.orders ?? []
  const pages = useMemo(() => pagesOf(orders), [orders])
  const pageCount = pages.length
  const current = pageCount === 0 ? 0 : Math.min(page, pageCount - 1)
  const visibleOrders = pages[current] ?? []

  useEffect(() => {
    if (!pageChanged.current) return
    pageChanged.current = false
    listRef.current?.scrollIntoView({ block: 'start' })
  }, [current])

  return (
    <div className="books-page">
      <section className="books">
        <div className="books-head">
          <button className="btn" type="button" onClick={onBack}>
            返回看板
          </button>
          <h2>流水与利润</h2>
        </div>
        <div className="books-ranges" role="tablist" aria-label="对比范围">
          {RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              className={range === item.key ? 'active' : ''}
              onClick={() => setRange(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {chartLoading || !report ? (
          <p className="empty">正在加载…</p>
        ) : (
          <CompareChart points={report.points} />
        )}
      </section>

      <section className="books books-detail">
        <h3>明细</h3>
        <MonthCalendar cursor={cursor} day={day} onCursor={setCursor} onPick={pickDay} />
        {detailLoading || !detail ? (
          <p className="empty">正在加载…</p>
        ) : (
          <>
            <div className="books-totals">
              <div>
                <b>{yuan(detail.revenue)}</b>
                <span>流水</span>
                <span className="books-split">
                  现金 {yuan(detail.cashRevenue)}
                  <i />
                  刷卡 {yuan(detail.cardRevenue)}
                </span>
              </div>
              <div>
                <b>{yuan(detail.profit)}</b>
                <span>利润</span>
              </div>
              <div>
                <b>{detail.soldQty}</b>
                <span>卖出件数</span>
              </div>
            </div>
            {orders.length === 0 ? (
              <p className="empty">这一天没有结账记录</p>
            ) : (
              <div className="sale-list" ref={listRef}>
                <p className="sale-page-note">共 {orders.length} 笔</p>
                <div className="sale-columns">
                  <span>商品</span>
                  <span>数量</span>
                  <span>金额</span>
                  <span>利润</span>
                </div>
                {visibleOrders.map((order) => {
                  const qty = order.lines.reduce((sum, line) => sum + line.qty, 0)
                  return (
                  <section className="sale-order" key={order.id}>
                    <header className="sale-order-time">
                      <span className="sale-order-when">
                        <span>{formatTime(order.createdAt)}</span>
                        {order.payMethod === 'CASH' && <span className="sale-pay">现金</span>}
                        {order.payMethod === 'CARD' && <span className="sale-pay">刷卡</span>}
                      </span>
                      <span className="sale-order-sum">
                        <span>总数 {qty}</span>
                        <span>单笔金额 {yuan(order.revenue)}</span>
                        <span className={order.profit < 0 ? 'down' : 'up'}>利润 {yuan(order.profit)}</span>
                      </span>
                    </header>
                    {order.lines.map((line, index) => {
                      const amount = line.price * line.qty
                      const profit = (line.price - line.cost) * line.qty
                      return (
                        <div className="sale-line" key={`${order.id}-${index}`}>
                          <span className="sale-name">{line.name}</span>
                          <span>{line.qty}</span>
                          <span>{yuan(amount)}</span>
                          <span className={profit < 0 ? 'down' : 'up'}>{yuan(profit)}</span>
                        </div>
                      )
                    })}
                  </section>
                  )
                })}
                {pageCount > 1 && (
                  <div className="sale-pager">
                    <button type="button" disabled={current === 0} onClick={() => showPage(current - 1)}>
                      上一页
                    </button>
                    <span>
                      {current + 1} / {pageCount}
                    </span>
                    <button
                      type="button"
                      disabled={current >= pageCount - 1}
                      onClick={() => showPage(current + 1)}
                    >
                      下一页
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

type Pill = {
  kind: 'revenue' | 'profit'
  text: string
  x: number
  y: number
  w: number
  h: number
  dotX: number
  dotY: number
}

function pillWidth(text: string) {
  return text.length * 4.6 + 8
}

function pillsOverlap(a: Pill, b: Pill) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w + 8 && Math.abs(a.y - b.y) * 2 < a.h + b.h + 6
}

function CompareChart({ points }: { points: ComparePoint[] }) {
  const width = 760
  const height = 240
  const padL = 36
  const padR = 36
  const padT = 48
  const padB = 26
  const values = points.flatMap((point) => [point.revenue, point.profit])
  const max = Math.max(1, ...values, 0)
  const min = Math.min(0, ...values)
  const span = max - min || 1
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const yOf = (value: number) => padT + ((max - value) / span) * plotH
  const xOf = (index: number) => padL + (points.length === 1 ? plotW / 2 : (plotW / (points.length - 1)) * index)
  const slot = points.length <= 1 ? plotW : plotW / (points.length - 1)
  const amount = (value: number) =>
    slot < 86 ? `¥${Math.abs(value) >= 100 ? Math.round(value) : value.toFixed(0)}` : yuan(value)

  const revenueDots = points.map((point, index) => ({ x: xOf(index), y: yOf(point.revenue) }))
  const profitDots = points.map((point, index) => ({ x: xOf(index), y: yOf(point.profit) }))
  const lineOf = (dots: { x: number; y: number }[]) =>
    dots.map((dot, index) => `${index === 0 ? 'M' : 'L'} ${dot.x} ${dot.y}`).join(' ')
  const revenuePath = lineOf(revenueDots)
  const profitPath = lineOf(profitDots)
  const baseY = yOf(0)
  const revenueArea = `${revenuePath} L ${revenueDots.at(-1)?.x ?? padL} ${baseY} L ${revenueDots[0]?.x ?? padL} ${baseY} Z`
  const profitArea = `${profitPath} L ${profitDots.at(-1)?.x ?? padL} ${baseY} L ${profitDots[0]?.x ?? padL} ${baseY} Z`
  const grid = [0, 0.5, 1].map((step) => yOf(min + span * step))

  const pills: Pill[] = points.flatMap((point, index) => {
    const px = xOf(index)
    const make = (kind: Pill['kind'], value: number): Pill => {
      const text = amount(value)
      const w = pillWidth(text)
      const h = 14
      const dotY = yOf(value)
      return { kind, text, w, h, dotX: px, dotY, x: px, y: dotY - 8 - h / 2 }
    }
    const revenue = make('revenue', point.revenue)
    const profit = make('profit', point.profit)
    const gap = Math.abs(revenue.dotY - profit.dotY)
    if (gap < 16) {
      const anchor = Math.min(revenue.dotY, profit.dotY)
      revenue.x = px
      profit.x = px
      revenue.y = anchor - 16 - revenue.h - revenue.h / 2
      profit.y = anchor - 8 - profit.h / 2
    } else if (pillsOverlap(revenue, profit)) {
      const lower = revenue.dotY > profit.dotY ? revenue : profit
      lower.y = lower.dotY + 8 + lower.h / 2
    }
    for (const pill of [revenue, profit]) {
      pill.x = Math.min(width - pill.w / 2 - 4, Math.max(pill.w / 2 + 4, pill.x))
      pill.y = Math.min(height - 22 - pill.h / 2, Math.max(pill.h / 2 + 2, pill.y))
    }
    return [revenue, profit]
  })

  return (
    <div className="books-chart">
      <div className="books-legend">
        <span className="revenue">流水</span>
        <span className="profit">利润</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="流水和利润折线">
        {grid.map((gy) => (
          <line key={gy} className="grid" x1={padL} x2={width - padR} y1={gy} y2={gy} />
        ))}
        <path className="area revenue" d={revenueArea} />
        <path className="area profit" d={profitArea} />
        <path className="line revenue" d={revenuePath} />
        <path className="line profit" d={profitPath} />
        {pills.map((pill) => {
          const above = pill.y + pill.h / 2 < pill.dotY - 4
          const below = pill.y - pill.h / 2 > pill.dotY + 4
          const x1 = above || below ? pill.x : pill.x < pill.dotX ? pill.x + pill.w / 2 : pill.x - pill.w / 2
          const y1 = above ? pill.y + pill.h / 2 : below ? pill.y - pill.h / 2 : pill.y
          return (
            <line
              key={`${pill.kind}-${pill.dotX}-leader`}
              className={`leader ${pill.kind}`}
              x1={x1}
              y1={y1}
              x2={pill.dotX}
              y2={pill.dotY}
            />
          )
        })}
        {revenueDots.map((dot) => (
          <circle key={`r-${dot.x}`} className="dot revenue" cx={dot.x} cy={dot.y} r="3.5" />
        ))}
        {profitDots.map((dot) => (
          <circle key={`p-${dot.x}`} className="dot profit" cx={dot.x} cy={dot.y} r="3.5" />
        ))}
        {pills.map((pill) => (
          <g key={`${pill.kind}-${pill.dotX}`}>
            <rect
              className={`pill ${pill.kind}`}
              x={pill.x - pill.w / 2}
              y={pill.y - pill.h / 2}
              width={pill.w}
              height={pill.h}
              rx="7"
            />
            <text className={`point-value ${pill.kind}`} x={pill.x} y={pill.y + 3} textAnchor="middle">
              {pill.text}
            </text>
          </g>
        ))}
        {points.map((point, index) => (
          <text key={point.label} className="point-label" x={xOf(index)} y={height - 8} textAnchor="middle">
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

function MonthCalendar({
  cursor,
  day,
  onCursor,
  onPick,
}: {
  cursor: Date
  day: string
  onCursor: (date: Date) => void
  onPick: (value: string) => void
}) {
  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const first = new Date(year, month, 1)
    const offset = (first.getDay() + 6) % 7
    const gridStart = new Date(year, month, 1 - offset)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)
      return date
    })
  }, [cursor])

  const shiftMonth = (step: number) => {
    onCursor(new Date(cursor.getFullYear(), cursor.getMonth() + step, 1))
  }

  return (
    <div className="calendar">
      <div className="calendar-nav">
        <button type="button" onClick={() => shiftMonth(-1)} aria-label="上个月">
          ‹
        </button>
        <strong>{`${cursor.getFullYear()}年${cursor.getMonth() + 1}月`}</strong>
        <button type="button" onClick={() => shiftMonth(1)} aria-label="下个月">
          ›
        </button>
      </div>
      <div className="calendar-weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((date) => {
          const value = iso(date)
          const outside = date.getMonth() !== cursor.getMonth()
          const future = value > todayIso()
          const selected = value === day
          return (
            <button
              key={value}
              type="button"
              disabled={future}
              className={`${outside ? 'outside' : ''} ${future ? 'future' : ''} ${selected ? 'edge' : ''}`}
              onClick={() => onPick(value)}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

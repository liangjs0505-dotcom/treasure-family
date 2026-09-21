import { useMemo, useState } from 'react'
import { CATEGORIES, CATEGORY_ICONS, type Goods } from '../../types'
import { useGoods } from '../../context/GoodsContext'
import { toErrorMessage, useToast } from '../Toast'
import Select from '../Select'
import './index.scss'

interface Props {
  onEdit: (item: Goods) => void
}

type SortKey = 'createdAt' | 'price' | 'stock'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'createdAt', label: '录入时间' },
  { key: 'price', label: '单价' },
  { key: 'stock', label: '库存' },
]

export default function GoodsList({ onEdit }: Props) {
  const { goods, loading, removeGoods, clearAll, isLowStock, isOutOfStock } = useGoods()
  const toast = useToast()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('全部')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [onlyLow, setOnlyLow] = useState(false)

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return goods
      .filter((g) => {
        const matchKw =
          !kw ||
          g.name.toLowerCase().includes(kw) ||
          g.supplier.toLowerCase().includes(kw)
        const matchCat = category === '全部' || g.category === category
        const matchLow = !onlyLow || isLowStock(g)
        return matchKw && matchCat && matchLow
      })
      .sort((a, b) => b[sortKey] - a[sortKey])
  }, [goods, keyword, category, sortKey, onlyLow, isLowStock])

  // 当前筛选结果的库存总价值(盘点用)
  const filteredValue = useMemo(
    () => filtered.reduce((sum, g) => sum + g.price * g.stock, 0),
    [filtered],
  )
  const yuan = (n: number) =>
    `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className={`goods-list ${onlyLow ? 'filter-alert' : ''}`}>
      <div className="toolbar">
        <input
          className="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="🔍 搜索名称 / 供应商"
        />
        <Select
          className="toolbar-select"
          aria-label="按分类筛选"
          value={category}
          onChange={setCategory}
          options={[
            { value: '全部', label: '全部分类', icon: '🗂️' },
            ...CATEGORIES.map((c) => ({
              value: c,
              label: c,
              icon: CATEGORY_ICONS[c],
            })),
          ]}
        />
        <Select
          className="toolbar-select"
          aria-label="排序方式"
          value={sortKey}
          onChange={(v) => setSortKey(v)}
          options={SORT_OPTIONS.map((o) => ({
            value: o.key,
            label: `按${o.label}排序`,
            icon: o.key === 'price' ? '💰' : o.key === 'stock' ? '📦' : '🕒',
          }))}
        />
        <label className={`check ${onlyLow ? 'checked' : ''}`}>
          <input
            type="checkbox"
            checked={onlyLow}
            onChange={(e) => setOnlyLow(e.target.checked)}
          />
          <span className="check-box" aria-hidden="true" />
          仅看低库存
        </label>
        {goods.length > 0 && (
          <button
            className="btn danger ghost"
            onClick={async () => {
              if (!window.confirm('确定清空全部货物？')) return
              try {
                await clearAll()
                toast.success('已清空')
              } catch (err) {
                toast.error(toErrorMessage(err, '清空失败'))
              }
            }}
          >
            清空
          </button>
        )}
      </div>

      <div className="summary">
        共 <b>{filtered.length}</b> 种货物 · 库存价值合计 <b>{yuan(filteredValue)}</b>
        {onlyLow && <span className="summary-flag">仅显示低库存商品</span>}
      </div>
      {loading ? (
        <p className="empty">正在加载货物…</p>
      ) : filtered.length === 0 ? (
        <p className="empty">暂无货物，请到「货物录入」添加～</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>分类</th>
                <th>供应商</th>
                <th>单价</th>
                <th>库存</th>
                <th>小计</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const out = isOutOfStock(g)
                const low = !out && isLowStock(g)
                const rowClass = out ? 'row-out' : low ? 'row-low' : ''
                return (
                  <tr key={g.id} className={rowClass}>
                    <td className="cell-name">{g.name}</td>
                    <td>
                      <span className="tag">{g.category}</span>
                    </td>
                    <td className="muted">{g.supplier || '—'}</td>
                    <td>¥{g.price.toFixed(2)}</td>
                    <td>
                      <span className={out ? 'stock-out' : low ? 'stock-low' : ''}>
                        {g.stock} {g.unit}
                      </span>
                      {out && <span className="low-tag out">缺货</span>}
                      {low && <span className="low-tag">补货</span>}
                    </td>
                    <td className="muted">¥{(g.price * g.stock).toFixed(2)}</td>
                    <td className="ops">
                      <button className="link" onClick={() => onEdit(g)}>
                        编辑
                      </button>
                      <button
                        className="link danger"
                        onClick={async () => {
                          if (!window.confirm(`删除「${g.name}」？`)) return
                          try {
                            await removeGoods(g.id)
                            toast.success('已删除')
                          } catch (err) {
                            toast.error(toErrorMessage(err, '删除失败'))
                          }
                        }}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

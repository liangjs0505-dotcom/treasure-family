import { useMemo, useState, type FormEvent } from 'react'
import { useGoods } from '../../context/GoodsContext'
import { toErrorMessage, useToast } from '../Toast'
import type { Goods } from '../../types'
import './index.scss'

interface CartLine {
  id: string
  qty: number
}

const yuan = (n: number) =>
  `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Checkout() {
  const { goods, checkout, isOutOfStock } = useGoods()
  const toast = useToast()
  const [keyword, setKeyword] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [submitting, setSubmitting] = useState(false)

  const matches = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return []
    return goods
      .filter((item) => {
        const place = item.purchasePlace.toLowerCase()
        return item.name.toLowerCase().includes(kw) || item.supplier.toLowerCase().includes(kw) || place.includes(kw)
      })
      .slice(0, 8)
  }, [goods, keyword])

  const lines = cart
    .map((line) => {
      const item = goods.find((row) => row.id === line.id)
      if (!item) return null
      return { ...line, item, amount: item.price * line.qty }
    })
    .filter((line) => line !== null)

  const total = lines.reduce((sum, line) => sum + line.amount, 0)
  const totalQty = lines.reduce((sum, line) => sum + line.qty, 0)

  const addItem = (item: Goods) => {
    if (isOutOfStock(item)) {
      toast.error(`「${item.name}」已经缺货`)
      return
    }
    const found = cart.find((line) => line.id === item.id)
    const nextQty = (found?.qty ?? 0) + 1
    if (nextQty > item.stock) {
      toast.error(`「${item.name}」库存只有 ${item.stock}${item.unit}`)
      return
    }
    setCart((prev) => {
      if (!prev.some((line) => line.id === item.id)) return [...prev, { id: item.id, qty: 1 }]
      return prev.map((line) => (line.id === item.id ? { ...line, qty: nextQty } : line))
    })
    setKeyword('')
  }

  const changeQty = (id: string, qty: number) => {
    const item = goods.find((row) => row.id === id)
    if (!item) return
    if (qty <= 0) {
      setCart((prev) => prev.filter((line) => line.id !== id))
      return
    }
    if (qty > item.stock) {
      toast.error(`「${item.name}」库存只有 ${item.stock}${item.unit}`)
      return
    }
    setCart((prev) => prev.map((line) => (line.id === id ? { ...line, qty } : line)))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting || lines.length === 0) return
    const ok = window.confirm(`确认结账 ${totalQty} 件，合计 ${yuan(total)}？确认后会扣减库存。`)
    if (!ok) return
    setSubmitting(true)
    try {
      await checkout(lines.map((line) => ({ goodsId: line.id, qty: line.qty })))
      setCart([])
      toast.success('结账完成，库存和今日收益已更新')
    } catch (err) {
      toast.error(toErrorMessage(err, '结账失败'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="checkout" onSubmit={(event) => void submit(event)}>
      <div className="checkout-search">
        <label htmlFor="checkout-query">扫码或输入商品</label>
        <input
          id="checkout-query"
          value={keyword}
          placeholder="输入名称，回车加入账单"
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (matches[0]) addItem(matches[0])
            }
          }}
        />
        {matches.length > 0 && (
          <ul className="checkout-matches">
            {matches.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => addItem(item)} disabled={isOutOfStock(item)}>
                  <span>{item.name}</span>
                  <span>
                    {yuan(item.price)} · 库存 {item.stock}
                    {item.unit}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="empty">账单是空的。输入商品名称后加入，以后扫码枪也会直接填进这个框。</p>
      ) : (
        <div className="table-wrap checkout-table">
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>售价</th>
                <th>数量</th>
                <th>金额</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id}>
                  <td className="cell-name">{line.item.name}</td>
                  <td>{yuan(line.item.price)}</td>
                  <td>
                    <span className="qty">
                      <button type="button" onClick={() => changeQty(line.id, line.qty - 1)}>
                        −
                      </button>
                      <b>{line.qty}</b>
                      <button type="button" onClick={() => changeQty(line.id, line.qty + 1)}>
                        +
                      </button>
                    </span>
                  </td>
                  <td>{yuan(line.amount)}</td>
                  <td>
                    <button className="link danger" type="button" onClick={() => changeQty(line.id, 0)}>
                      移除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="checkout-bar">
        <div>
          <span>{lines.length} 种</span>
          <span>共 {totalQty} 件</span>
          <strong>{yuan(total)}</strong>
        </div>
        <div className="checkout-actions">
          <button className="btn" type="button" disabled={lines.length === 0 || submitting} onClick={() => setCart([])}>
            清空账单
          </button>
          <button className="btn primary" type="submit" disabled={lines.length === 0 || submitting}>
            {submitting ? '正在结账…' : '确认结账'}
          </button>
        </div>
      </div>
    </form>
  )
}

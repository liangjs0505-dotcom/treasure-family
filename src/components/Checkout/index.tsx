import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { PayMethod } from '../../api/sales'
import { useGoods } from '../../context/GoodsContext'
import Dialog from '../Dialog'
import { toErrorMessage, useToast } from '../Toast'
import type { Goods } from '../../types'
import './index.scss'

interface CartLine {
  id: string
  qty: number
}

const yuan = (n: number) =>
  `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function stripScannedText(code: string) {
  const active = document.activeElement
  if (!(active instanceof HTMLInputElement) || active.id === 'checkout-scan-capture') return
  if (active.id === 'checkout-query' || !active.value.endsWith(code)) return
  const next = active.value.slice(0, -code.length)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(active, next)
  active.dispatchEvent(new Event('input', { bubbles: true }))
}

export default function Checkout({ active }: { active: boolean }) {
  const { goods, checkout, isOutOfStock } = useGoods()
  const toast = useToast()
  const captureRef = useRef<HTMLInputElement>(null)
  const [keyword, setKeyword] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const code = keyword.replace(/\D/g, '').slice(0, 13)

  const matches = useMemo(() => {
    if (!code) return []
    return goods.filter((item) => item.barcode.startsWith(code)).slice(0, 8)
  }, [goods, code])

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

  const addRef = useRef(addItem)
  addRef.current = addItem
  const goodsRef = useRef(goods)
  goodsRef.current = goods
  const payOpenRef = useRef(payOpen)
  payOpenRef.current = payOpen

  const focusCapture = useCallback(() => {
    if (payOpenRef.current) return
    const focused = document.activeElement
    if (focused instanceof HTMLElement && focused !== document.body && focused.id !== 'checkout-scan-capture') return
    captureRef.current?.focus({ preventScroll: true })
  }, [])

  const scanCode = useCallback((raw: string) => {
    const code = raw.replace(/\D/g, '')
    if (captureRef.current) captureRef.current.value = ''
    const item = goodsRef.current.find((row) => row.barcode === code)
    if (!item) {
      toast.error('库存暂无此商品')
      return
    }
    addRef.current(item)
  }, [toast])

  useEffect(() => {
    if (!active || payOpen) return
    focusCapture()
    const onFocusOut = () => {
      window.setTimeout(focusCapture, 0)
    }
    let buffer = ''
    let last = 0
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && target.id === 'checkout-query') return
      const now = performance.now()
      if (now - last > 50) buffer = ''
      last = now
      if (event.key === 'Enter') {
        const code = buffer
        buffer = ''
        if (code.length >= 8) {
          event.preventDefault()
          event.stopPropagation()
          stripScannedText(code)
          scanCode(code)
        }
        return
      }
      if (/^\d$/.test(event.key)) buffer += event.key
      else if (event.key.length === 1) buffer = ''
    }
    document.addEventListener('focusout', onFocusOut)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('focusout', onFocusOut)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [active, payOpen, focusCapture, scanCode])

  const closePay = useCallback(() => {
    if (submitting) return
    setPayOpen(false)
  }, [submitting])

  const askPay = (event: FormEvent) => {
    event.preventDefault()
    if (submitting || lines.length === 0) return
    setPayOpen(true)
  }

  const pay = async (payMethod: PayMethod) => {
    if (submitting || lines.length === 0) return
    setSubmitting(true)
    try {
      await checkout(
        lines.map((line) => ({ goodsId: line.id, qty: line.qty })),
        payMethod,
      )
      setCart([])
      setPayOpen(false)
      toast.success(payMethod === 'CASH' ? '现金结账完成，库存已更新' : '刷卡结账完成，库存已更新')
    } catch (err) {
      toast.error(toErrorMessage(err, '结账失败'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="checkout" onSubmit={askPay}>
      <input
        id="checkout-scan-capture"
        ref={captureRef}
        className="checkout-scan-capture"
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault()
        }}
      />
      <div className="checkout-search">
        <label htmlFor="checkout-query">输入条形码</label>
        <input
          id="checkout-query"
          value={code}
          inputMode="numeric"
          maxLength={13}
          placeholder="输入条形码筛选商品"
          onChange={(event) => setKeyword(event.target.value.replace(/\D/g, '').slice(0, 13))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault()
          }}
        />
        {code && (
          <ul className="checkout-matches">
            {matches.length === 0 ? (
              <li className="checkout-empty">库存暂无此商品</li>
            ) : (
              matches.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => addItem(item)} disabled={isOutOfStock(item)}>
                    <span>
                      {item.name}
                      <small>{item.barcode}</small>
                    </span>
                    <span>
                      {yuan(item.price)} · 库存 {item.stock}
                      {item.unit}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="empty">账单是空的</p>
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
      <Dialog
        open={payOpen}
        kind="checkout"
        title="选择结账方式"
        description={
          <>
            <strong>{yuan(total)}</strong>
            <span>共 {totalQty} 件</span>
          </>
        }
        onCancel={closePay}
        actions={[
          { label: '现金结账', tone: 'cash', disabled: submitting, onClick: () => void pay('CASH') },
          { label: '刷卡结账', tone: 'card', disabled: submitting, onClick: () => void pay('CARD') },
        ]}
      />
    </form>
  )
}

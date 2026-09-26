import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { issueInternalBarcode, lookupBarcode } from '../../api/goods'
import { CATEGORIES, CATEGORY_ICONS, UNITS, type Goods, type GoodsFormData } from '../../types'
import { useGoods } from '../../context/GoodsContext'
import { Select } from 'antd'
import { toErrorMessage, useToast } from '../Toast'
import { ean13Bars } from './ean13'
import './index.scss'

const BARCODE_LENGTH = 13

function barcodeDigits(raw: string) {
  return raw.replace(/\D/g, '').slice(0, BARCODE_LENGTH)
}

type Amount = number | ''

type EntryForm = Omit<GoodsFormData, 'price' | 'cost' | 'stock'> & {
  price: Amount
  cost: Amount
  stock: Amount
}

function filledAmount(value: number) {
  return value > 0 ? value : ''
}

function positiveAmount(value: Amount) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function readAmount(raw: string): Amount {
  const text = raw.trim()
  return text === '' ? '' : Number(text)
}

const CATEGORY_OPTIONS = CATEGORIES.map((category) => ({
  value: category,
  label: `${CATEGORY_ICONS[category]} ${category}`,
}))

function unitOptions(current: string) {
  const list = [...UNITS] as string[]
  if (!list.includes(current)) list.unshift(current)
  return list.map((unit) => ({ value: unit, label: unit }))
}

const EMPTY: EntryForm = {
  barcode: '',
  name: '',
  category: CATEGORIES[0],
  price: '',
  cost: '',
  stock: '',
  unit: '件',
  supplier: '',
  purchasePlace: '',
  threshold: 10,
}

interface Props {
  editing: Goods | null
  active: boolean
  onDone: () => void
}

function fromGoods(goods: Goods): EntryForm {
  const { barcode, name, category, price, cost, stock, unit, supplier, purchasePlace, threshold } = goods
  return {
    barcode,
    name,
    category,
    price: filledAmount(price),
    cost: filledAmount(cost),
    stock,
    unit,
    supplier,
    purchasePlace,
    threshold,
  }
}

function BarcodeLabel({ barcode, name }: { barcode: string; name: string }) {
  const bits = ean13Bars(barcode)
  const width = bits.length + 16
  return (
    <div className="barcode-label" id="barcode-label">
      <svg viewBox={`0 0 ${width} 70`} role="img" aria-label={barcode}>
        <rect x="0" y="0" width={width} height="70" fill="#fff" />
        {bits.split('').map((bit, index) =>
          bit === '1' ? <rect key={index} x={index + 8} y="4" width="1" height="48" fill="#111" /> : null,
        )}
        <text x={width / 2} y="64" textAnchor="middle" fontSize="11" fill="#111" fontFamily="ui-monospace, monospace">
          {barcode}
        </text>
      </svg>
      {name.trim() && <p className="barcode-label-name">{name.trim()}</p>}
    </div>
  )
}

function stripScannedText(code: string) {
  const active = document.activeElement
  if (!(active instanceof HTMLInputElement) || active.id === 'goods-scan-capture') return
  if (!active.value.endsWith(code)) return
  const next = active.value.slice(0, -code.length)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(active, next)
  active.dispatchEvent(new Event('input', { bubbles: true }))
}

export default function GoodsForm({ editing, active, onDone }: Props) {
  const { addGoods, updateGoods } = useGoods()
  const toast = useToast()
  const rootRef = useRef<HTMLDivElement>(null)
  const captureRef = useRef<HTMLInputElement>(null)
  const [manual, setManual] = useState('')
  const [looking, setLooking] = useState(false)
  const [form, setForm] = useState<EntryForm>(EMPTY)
  const [existing, setExisting] = useState<Goods | null>(null)
  const [catalogName, setCatalogName] = useState<string | null>(null)
  const [arrival, setArrival] = useState(0)
  const [loss, setLoss] = useState(0)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onWheel = (event: WheelEvent) => {
      const target = event.target
      if (!(target instanceof HTMLInputElement) || target.type !== 'number') return
      event.preventDefault()
      target.blur()
      window.scrollBy(0, event.deltaY)
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    if (ready) window.scrollTo(0, 0)
  }, [ready, form.barcode])

  useEffect(() => {
    if (editing) {
      setExisting(editing)
      setForm(fromGoods(editing))
      setCatalogName(null)
      setArrival(0)
      setLoss(0)
      setReady(true)
      return
    }
    setExisting(null)
    setForm(EMPTY)
    setCatalogName(null)
    setArrival(0)
    setLoss(0)
    setReady(false)
    setManual('')
  }, [editing])

  const focusCapture = useCallback(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement && active !== document.body && active.id !== 'goods-scan-capture') return
    captureRef.current?.focus({ preventScroll: true })
  }, [])

  const lookup = useCallback(
    async (raw: string) => {
      const code = raw.trim()
      if (!code || looking) return
      setLooking(true)
      setManual('')
      if (captureRef.current) captureRef.current.value = ''
      try {
        const result = await lookupBarcode(code)
        if (result.goods) {
          openExisting(result.goods)
          return
        }
        if (result.blocked) {
          toast.error('这是店内码或称重标签，本店没有这件货。没有包装条码的话，打印一张贴上。')
          return
        }
        openNew(result.barcode, result.catalogName ?? '')
      } catch (err) {
        toast.error(toErrorMessage(err, '查询条码失败'))
      } finally {
        setLooking(false)
      }
    },
    [looking, toast],
  )

  useEffect(() => {
    if (!active) return
    focusCapture()
    const onFocusOut = () => {
      window.setTimeout(focusCapture, 0)
    }
    let buffer = ''
    let last = 0
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && target.id === 'goods-scan-manual') return
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
          if (captureRef.current) captureRef.current.value = ''
          void lookup(code)
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
  }, [active, focusCapture, lookup])

  const openExisting = (goods: Goods) => {
    setExisting(goods)
    setForm(fromGoods(goods))
    setCatalogName(null)
    setArrival(0)
    setLoss(0)
    setReady(true)
  }

  const openNew = (barcode: string, name: string) => {
    setExisting(null)
    setForm({ ...EMPTY, barcode, name })
    setCatalogName(name || null)
    setArrival(0)
    setLoss(0)
    setReady(true)
  }

  const submitManual = (event?: KeyboardEvent<HTMLInputElement>) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    const code = barcodeDigits(event?.currentTarget.value ?? manual)
    if (code.length !== BARCODE_LENGTH) return
    void lookup(code)
  }

  const printNew = async () => {
    if (looking) return
    setLooking(true)
    try {
      const barcode = await issueInternalBarcode()
      openNew(barcode, '')
    } catch (err) {
      toast.error(toErrorMessage(err, '生成条码失败'))
    } finally {
      setLooking(false)
    }
  }

  const printLabel = () => {
    window.print()
  }

  const reset = () => {
    setReady(false)
    setExisting(null)
    setForm(EMPTY)
    setCatalogName(null)
    setArrival(0)
    setLoss(0)
    setManual('')
    onDone()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (!form.name.trim()) {
      toast.error('请输入货物名称')
      return
    }
    const price = positiveAmount(form.price)
    const cost = positiveAmount(form.cost)
    if (price == null) {
      toast.error('请填写售价')
      return
    }
    if (cost == null) {
      toast.error('请填写进价')
      return
    }
    let nextStock: number
    if (existing) {
      nextStock = existing.stock + arrival - loss
      if (nextStock < 0) {
        toast.error('报损数量不能多于现有库存')
        return
      }
    } else {
      const inbound = positiveAmount(form.stock)
      if (inbound == null) {
        toast.error('请填写入库数量')
        return
      }
      nextStock = inbound
    }
    setSaving(true)
    try {
      const payload: GoodsFormData = { ...form, name: form.name.trim(), price, cost, stock: nextStock }
      if (existing) {
        await updateGoods(existing.id, payload)
        toast.success('已保存')
      } else {
        await addGoods(payload)
        toast.success('已添加')
      }
      reset()
    } catch (err) {
      toast.error(toErrorMessage(err, '保存失败'))
    } finally {
      setSaving(false)
    }
  }

  const title = existing ? '已有商品' : catalogName ? '新商品，名称已有' : ready ? '新商品' : '录入货物'

  return (
    <div className="goods-entry" ref={rootRef}>
      <input
        id="goods-scan-capture"
        ref={captureRef}
        className="scan-capture"
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
      {!ready && (
      <section className="scan-station">
        <div className="scan-copy">
          <span className="scan-mark" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M6 12h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
          <h3>录入货物</h3>
        </div>
        <div className="scan-manual">
          <div className="scan-manual-head">
            <label htmlFor="goods-scan-manual">手动输入条码</label>
            <span className="scan-hint">如果您接入了扫码枪可直接扫码录入商品</span>
          </div>
          <div className="scan-manual-row">
            <input
              id="goods-scan-manual"
              value={manual}
              inputMode="numeric"
              autoComplete="off"
              maxLength={BARCODE_LENGTH}
              placeholder="输入 13 位条码"
              onChange={(e) => setManual(barcodeDigits(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitManual(e)
              }}
            />
            <button type="button" className="btn scan-query" disabled={looking || manual.length !== BARCODE_LENGTH} onClick={() => submitManual()}>
              {looking ? '录入中…' : '查询'}
            </button>
            <button type="button" className="btn scan-print" disabled={looking} onClick={() => void printNew()}>
             生成商品条码
            </button>
          </div>
        </div>
      </section>
      )}

      {ready && (
        <form className="goods-form-card goods-form" noValidate onSubmit={handleSubmit}>
          <div className="entry-body">
            <div className="entry-side">
              <h3 className="card-title">{title}</h3>
              <BarcodeLabel barcode={form.barcode} name={form.name} />
              <button type="button" className="btn" onClick={printLabel}>
                打印条码
              </button>
            </div>
            <div className="entry-fields">
          {catalogName && !existing && (
            <p className="scan-note">别的店已经写过这个名称，售价和进价请按这家店填写。</p>
          )}

          <div className="field">
            <label>货物名称 *</label>
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="包装上的名称" />
          </div>

          <div className="field-row">
            <div className="field">
              <label>分类</label>
              <Select
                aria-label="货物分类"
                className="tf-select"
                value={form.category}
                onChange={(category) => setForm((prev) => ({ ...prev, category }))}
                options={CATEGORY_OPTIONS}
              />
            </div>
            <div className="field">
              <label>供应商</label>
              <input value={form.supplier} onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))} placeholder="谁供的货" />
            </div>
            <div className="field">
              <label>购买地点</label>
              <input
                value={form.purchasePlace}
                onChange={(e) => setForm((prev) => ({ ...prev, purchasePlace: e.target.value }))}
                placeholder="在哪买的，比如超市、市场、网店"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>售价(元)</label>
              <input type="number" min="0.01" step="0.01" value={form.price} placeholder="请填写" onChange={(e) => setForm((prev) => ({ ...prev, price: readAmount(e.target.value) }))} />
            </div>
            <div className="field">
              <label>进价(元)</label>
              <input type="number" min="0.01" step="0.01" value={form.cost} placeholder="请填写" onChange={(e) => setForm((prev) => ({ ...prev, cost: readAmount(e.target.value) }))} />
            </div>
          </div>

          {existing ? (
            <div className="field-row">
              <div className="field">
                <label>现有库存</label>
                <input value={`${existing.stock} ${form.unit}`} readOnly />
              </div>
              <div className="field">
                <label>本次到货</label>
                <input type="number" min="0" value={arrival} onChange={(e) => setArrival(Math.max(0, Number(e.target.value) || 0))} />
              </div>
              <div className="field">
                <label>报损</label>
                <input type="number" min="0" value={loss} onChange={(e) => setLoss(Math.max(0, Number(e.target.value) || 0))} />
              </div>
            </div>
          ) : (
            <div className="field">
              <label>入库数量</label>
              <input type="number" min="1" step="1" value={form.stock} placeholder="请填写" onChange={(e) => setForm((prev) => ({ ...prev, stock: readAmount(e.target.value) }))} />
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label>单位</label>
              <Select
                aria-label="单位"
                className="tf-select"
                placement="topLeft"
                virtual={false}
                value={form.unit}
                onChange={(unit) => setForm((prev) => ({ ...prev, unit }))}
                options={unitOptions(form.unit)}
              />
            </div>
            <div className="field">
              <label>预警阈值</label>
              <input type="number" min="0" value={form.threshold} onChange={(e) => setForm((prev) => ({ ...prev, threshold: Number(e.target.value) || 0 }))} />
            </div>
          </div>

          {existing && (
            <p className="scan-note">
              保存后库存为 {existing.stock + arrival - loss} {form.unit}。报损只改数量，不算卖出。
            </p>
          )}

          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? '保存中…' : existing ? '保存' : '＋ 添加货物'}
            </button>
            <button type="button" className="btn" onClick={reset}>
              {existing ? '取消' : '重新扫码'}
            </button>
          </div>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

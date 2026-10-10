import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { issueInternalBarcode, lookupBarcode } from '../../api/goods'
import { CATEGORIES, CATEGORY_ICONS, UNITS, type Goods, type GoodsFormData } from '../../types'
import { useGoods } from '../../context/GoodsContext'
import { Select } from 'antd'
import { toErrorMessage, useToast } from '../Toast'
import { code128Bars } from './code128'
import { ean13Bars } from './ean13'
import './index.scss'

const BARCODE_MAX = 20
const DEFAULT_PLACE = '红龙市场'

function barcodeText(raw: string) {
  return raw.slice(0, BARCODE_MAX)
}

type EntryForm = Omit<GoodsFormData, 'price' | 'cost' | 'stock' | 'threshold'> & {
  price: string
  cost: string
  stock: string
  threshold: string
}

function filledAmount(value: number) {
  return value > 0 ? String(value) : ''
}

function typedAmount(raw: string, decimal: boolean) {
  const cleaned = decimal ? raw.replace(/[^\d.]/g, '') : raw.replace(/\D/g, '')
  if (cleaned === '') return ''
  const dot = cleaned.indexOf('.')
  const whole = (dot < 0 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, '')
  if (dot < 0) return whole
  return `${whole || '0'}.${cleaned.slice(dot + 1).replace(/\./g, '')}`
}

function positiveAmount(value: string) {
  const amount = Number(value)
  return value.trim() !== '' && Number.isFinite(amount) && amount > 0 ? amount : null
}

function wholeAmount(value: string) {
  if (value.trim() === '') return 0
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0
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
  purchasePlace: DEFAULT_PLACE,
  threshold: '10',
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
    stock: String(stock),
    unit,
    supplier,
    purchasePlace,
    threshold: String(threshold),
  }
}

function labelBars(barcode: string) {
  if (/^\d{13}$/.test(barcode)) return `${'0'.repeat(10)}${ean13Bars(barcode)}${'0'.repeat(10)}`
  return code128Bars(barcode)
}

function BarcodeLabel({ barcode, name }: { barcode: string; name: string }) {
  const bits = labelBars(barcode)
  const width = bits ? bits.length : Math.max(160, barcode.length * 12)
  return (
    <div className="barcode-label" id="barcode-label">
      <svg viewBox={`0 0 ${width} 56`} role="img" aria-label={barcode}>
        <rect x="0" y="0" width={width} height="56" fill="#fff" />
        {bits.split('').map((bit, index) =>
          bit === '1' ? <rect key={index} x={index} y="4" width="1" height="48" fill="#111" /> : null,
        )}
      </svg>
      <p className="barcode-digits">{barcode}</p>
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
  const captureRef = useRef<HTMLInputElement>(null)
  const [manual, setManual] = useState('')
  const [looking, setLooking] = useState(false)
  const [form, setForm] = useState<EntryForm>(EMPTY)
  const [existing, setExisting] = useState<Goods | null>(null)
  const [catalogName, setCatalogName] = useState<string | null>(null)
  const [arrival, setArrival] = useState('')
  const [loss, setLoss] = useState('')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (ready) window.scrollTo(0, 0)
  }, [ready, form.barcode])

  useEffect(() => {
    if (editing) {
      setExisting(editing)
      setForm(fromGoods(editing))
      setCatalogName(null)
      setArrival('')
      setLoss('')
      setReady(true)
      return
    }
    setExisting(null)
    setForm(EMPTY)
    setCatalogName(null)
    setArrival('')
    setLoss('')
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
      if (target instanceof HTMLElement && (target.id === 'goods-scan-manual' || target.closest('.dialog-root'))) return
      const now = performance.now()
      if (now - last > 50) buffer = ''
      last = now
      if (event.key === 'Enter') {
        const code = buffer
        buffer = ''
        if (code.trim()) {
          event.preventDefault()
          event.stopPropagation()
          stripScannedText(code)
          if (captureRef.current) captureRef.current.value = ''
          void lookup(code.trim())
        }
        return
      }
      if (event.key.length === 1) buffer += event.key
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
    setArrival('')
    setLoss('')
    setReady(true)
  }

  const openNew = (barcode: string, name: string) => {
    setExisting(null)
    setForm({ ...EMPTY, barcode, name })
    setCatalogName(name || null)
    setArrival('')
    setLoss('')
    setReady(true)
  }

  const submitManual = (event?: KeyboardEvent<HTMLInputElement>) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    const code = barcodeText(event?.currentTarget.value ?? manual).trim()
    if (!code) return
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
    document.body.classList.add('barcode-printing')
    const done = () => {
      document.body.classList.remove('barcode-printing')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
  }

  const reset = () => {
    setReady(false)
    setExisting(null)
    setForm(EMPTY)
    setCatalogName(null)
    setArrival('')
    setLoss('')
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
    const arrived = wholeAmount(arrival)
    const lost = wholeAmount(loss)
    let nextStock: number
    if (existing) {
      nextStock = existing.stock + arrived - lost
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
      const payload: GoodsFormData = {
        ...form,
        name: form.name.trim(),
        price,
        cost,
        stock: nextStock,
        threshold: wholeAmount(form.threshold),
      }
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
    <div className="goods-entry">
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
              autoComplete="off"
              maxLength={BARCODE_MAX}
              placeholder="输入条码"
              onChange={(e) => setManual(barcodeText(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitManual(e)
              }}
            />
            <button type="button" className="btn scan-query" disabled={looking || !manual.trim()} onClick={() => submitManual()}>
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
              <input inputMode="decimal" value={form.price} placeholder="请填写" onChange={(e) => setForm((prev) => ({ ...prev, price: typedAmount(e.target.value, true) }))} />
            </div>
            <div className="field">
              <label>进价(元)</label>
              <input inputMode="decimal" value={form.cost} placeholder="请填写" onChange={(e) => setForm((prev) => ({ ...prev, cost: typedAmount(e.target.value, true) }))} />
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
                <input inputMode="numeric" value={arrival} placeholder="0" onChange={(e) => setArrival(typedAmount(e.target.value, false))} />
              </div>
              <div className="field">
                <label>报损</label>
                <input inputMode="numeric" value={loss} placeholder="0" onChange={(e) => setLoss(typedAmount(e.target.value, false))} />
              </div>
            </div>
          ) : (
            <div className="field">
              <label>入库数量</label>
              <input inputMode="numeric" value={form.stock} placeholder="请填写" onChange={(e) => setForm((prev) => ({ ...prev, stock: typedAmount(e.target.value, false) }))} />
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
              <input inputMode="numeric" value={form.threshold} placeholder="0" onChange={(e) => setForm((prev) => ({ ...prev, threshold: typedAmount(e.target.value, false) }))} />
            </div>
          </div>

          {existing && (
            <p className="scan-note">
              保存后库存为 {existing.stock + wholeAmount(arrival) - wholeAmount(loss)} {form.unit}。报损只改数量，不算卖出。
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

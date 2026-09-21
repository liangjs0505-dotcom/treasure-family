import { useEffect, useState, type FormEvent } from 'react'
import { CATEGORIES, CATEGORY_ICONS, type Goods, type GoodsFormData } from '../../types'
import { useGoods } from '../../context/GoodsContext'
import { toErrorMessage, useToast } from '../Toast'
import Select from '../Select'
import './index.scss'

const EMPTY: GoodsFormData = {
  name: '',
  category: CATEGORIES[0],
  price: 0,
  stock: 0,
  unit: '件',
  supplier: '',
  threshold: 10,
}

interface Props {
  editing: Goods | null // 当前编辑的货物，null 表示新增
  onDone: () => void // 完成后回调
}

export default function GoodsForm({ editing, onDone }: Props) {
  const { addGoods, updateGoods } = useGoods()
  const toast = useToast()
  const [form, setForm] = useState<GoodsFormData>(EMPTY)
  const [saving, setSaving] = useState(false)

  // 切换编辑对象时同步表单
  useEffect(() => {
    if (editing) {
      const { name, category, price, stock, unit, supplier, threshold } = editing
      setForm({ name, category, price, stock, unit, supplier, threshold })
    } else {
      setForm(EMPTY)
    }
  }, [editing])

  const handleChange = (key: keyof GoodsFormData, raw: string) => {
    const numeric = key === 'price' || key === 'stock' || key === 'threshold'
    setForm((prev) => ({ ...prev, [key]: numeric ? Number(raw) || 0 : raw }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (!form.name.trim()) {
      toast.error('请输入货物名称')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateGoods(editing.id, form)
        toast.success('已保存')
      } else {
        await addGoods(form)
        toast.success('已添加')
      }
      setForm(EMPTY)
      onDone()
    } catch (err) {
      toast.error(toErrorMessage(err, '保存失败'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="goods-form-card">
      <h3 className="card-title">{editing ? '编辑货物信息' : '录入新货物'}</h3>
      <form className="goods-form" onSubmit={handleSubmit}>
      <div className="field">
        <label>货物名称 *</label>
        <input
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="请输入货物名称"
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label>分类</label>
          <Select
            aria-label="货物分类"
            value={form.category}
            onChange={(v) => handleChange('category', v)}
            options={CATEGORIES.map((c) => ({
              value: c,
              label: c,
              icon: CATEGORY_ICONS[c],
            }))}
          />
        </div>
        <div className="field">
          <label>供应商</label>
          <input
            value={form.supplier}
            onChange={(e) => handleChange('supplier', e.target.value)}
            placeholder="供应商名称"
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>单价(元)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => handleChange('price', e.target.value)}
          />
        </div>
        <div className="field">
          <label>库存数量</label>
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => handleChange('stock', e.target.value)}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>单位</label>
          <input
            value={form.unit}
            onChange={(e) => handleChange('unit', e.target.value)}
            placeholder="件/箱/瓶"
          />
        </div>
        <div className="field">
          <label>预警阈值</label>
          <input
            type="number"
            min="0"
            value={form.threshold}
            onChange={(e) => handleChange('threshold', e.target.value)}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? '保存中…' : editing ? '保存修改' : '＋ 添加货物'}
        </button>
        {editing && (
          <button type="button" className="btn" onClick={onDone}>
            取消
          </button>
        )}
      </div>
    </form>
    </div>
  )
}

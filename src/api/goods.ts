import { apiFetch } from './client'
import type { Category, Goods, GoodsFormData } from '../types'

interface GoodsRow {
  id: string
  barcode?: string
  name: string
  category: Category
  price: number | string
  stock: number
  unit: string
  supplier?: string
  cost?: number | string
  purchasePlace?: string
  threshold: number
  createdAt: number
}

function unwrap<T>(response: Response, data: { code?: number; message?: string; data?: T } | null, fallback: string): T {
  if (!response.ok || data?.code !== 0) {
    throw new Error(data?.message || fallback)
  }
  return data.data as T
}

function toGoods(row: GoodsRow): Goods {
  return {
    id: row.id,
    barcode: row.barcode ?? '',
    name: row.name,
    category: row.category,
    price: Number(row.price),
    cost: Number(row.cost ?? 0),
    stock: Number(row.stock),
    unit: row.unit,
    supplier: row.supplier ?? '',
    purchasePlace: row.purchasePlace ?? '',
    threshold: Number(row.threshold),
    createdAt: Number(row.createdAt),
  }
}

export interface BarcodeLookup {
  barcode: string
  internal: boolean
  blocked: boolean
  catalogName: string | null
  goods: Goods | null
}

export async function lookupBarcode(barcode: string) {
  const { response, data } = await apiFetch(`/api/goods/by-barcode?barcode=${encodeURIComponent(barcode)}`)
  const row = unwrap<{
    barcode: string
    internal: boolean
    blocked: boolean
    catalogName: string | null
    goods: GoodsRow | null
  }>(response, data, '查询条码失败')
  return {
    barcode: row.barcode,
    internal: row.internal,
    blocked: row.blocked,
    catalogName: row.catalogName,
    goods: row.goods ? toGoods(row.goods) : null,
  } satisfies BarcodeLookup
}

export async function issueInternalBarcode() {
  const { response, data } = await apiFetch('/api/goods/internal-barcode', { method: 'POST' })
  return unwrap<{ barcode: string }>(response, data, '生成条码失败').barcode
}

export async function listGoods() {
  const { response, data } = await apiFetch('/api/goods')
  const rows = unwrap<GoodsRow[]>(response, data, '加载货物失败')
  return (rows ?? []).map(toGoods)
}

export async function createGoods(form: GoodsFormData) {
  const { response, data } = await apiFetch('/api/goods', {
    method: 'POST',
    body: JSON.stringify(form),
  })
  return toGoods(unwrap<GoodsRow>(response, data, '添加货物失败'))
}

export async function updateGoods(id: string, form: GoodsFormData) {
  const { response, data } = await apiFetch(`/api/goods/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(form),
  })
  return toGoods(unwrap<GoodsRow>(response, data, '保存货物失败'))
}

export async function deleteGoods(id: string) {
  const { response, data } = await apiFetch(`/api/goods/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  unwrap(response, data, '删除货物失败')
}

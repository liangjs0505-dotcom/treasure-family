import { apiFetch } from './client'
import type { Category, Goods, GoodsFormData } from '../types'

interface GoodsRow {
  id: string
  name: string
  category: Category
  price: number | string
  stock: number
  unit: string
  supplier?: string
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
    name: row.name,
    category: row.category,
    price: Number(row.price),
    stock: Number(row.stock),
    unit: row.unit,
    supplier: row.supplier ?? '',
    threshold: Number(row.threshold),
    createdAt: Number(row.createdAt),
  }
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

export async function clearGoods() {
  const { response, data } = await apiFetch('/api/goods', { method: 'DELETE' })
  unwrap(response, data, '清空货物失败')
}

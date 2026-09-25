import { apiFetch } from './client'
import { loadSalesCache, readSalesCache } from './salesCache'
import type { TodaySummary } from '../types'

export type CompareRange = 'week' | 'month' | 'year'

export interface ComparePoint {
  label: string
  revenue: number
  profit: number
  soldQty: number
}

export interface CompareReport {
  range: CompareRange
  unit: string
  revenue: number
  profit: number
  soldQty: number
  points: ComparePoint[]
}

function unwrap<T>(response: Response, data: { code?: number; message?: string; data?: T } | null, fallback: string): T {
  if (!response.ok || data?.code !== 0) {
    throw new Error(data?.message || fallback)
  }
  return data.data as T
}

function toSummary(row: Partial<TodaySummary> | null): TodaySummary {
  return {
    revenue: Number(row?.revenue ?? 0),
    profit: Number(row?.profit ?? 0),
    orderCount: Number(row?.orderCount ?? 0),
    soldQty: Number(row?.soldQty ?? 0),
    cashRevenue: Number(row?.cashRevenue ?? 0),
    cardRevenue: Number(row?.cardRevenue ?? 0),
  }
}

export async function fetchToday() {
  const { response, data } = await apiFetch('/api/sales/today')
  return toSummary(unwrap<TodaySummary>(response, data, '加载今日收益失败'))
}

export function peekCompare(range: CompareRange) {
  return readSalesCache<CompareReport>(`compare:${range}`)
}

export async function fetchCompare(range: CompareRange) {
  return loadSalesCache(`compare:${range}`, () => requestCompare(range))
}

async function requestCompare(range: CompareRange) {
  const { response, data } = await apiFetch(`/api/sales/compare?range=${range}`)
  const row = unwrap<CompareReport>(response, data, '加载经营对比失败')
  return {
    range: row.range,
    unit: row.unit,
    revenue: Number(row.revenue ?? 0),
    profit: Number(row.profit ?? 0),
    soldQty: Number(row.soldQty ?? 0),
    points: (row.points ?? []).map((point) => ({
      label: point.label,
      revenue: Number(point.revenue ?? 0),
      profit: Number(point.profit ?? 0),
      soldQty: Number(point.soldQty ?? 0),
    })),
  }
}

export interface SaleLineDetail {
  name: string
  qty: number
  price: number
  cost: number
}

export type PayMethod = 'CASH' | 'CARD'

export interface SaleOrderDetail {
  id: string
  createdAt: number
  revenue: number
  profit: number
  soldQty: number
  payMethod: string
  lines: SaleLineDetail[]
}

export interface SaleDetailReport {
  from: string
  to: string
  revenue: number
  profit: number
  soldQty: number
  cashRevenue: number
  cardRevenue: number
  orders: SaleOrderDetail[]
}

export function peekSaleDetails(from: string, to: string) {
  return readSalesCache<SaleDetailReport>(`details:${from}|${to}`)
}

export async function fetchSaleDetails(from: string, to: string) {
  return loadSalesCache(`details:${from}|${to}`, () => requestSaleDetails(from, to))
}

async function requestSaleDetails(from: string, to: string) {
  const params = new URLSearchParams({ from, to })
  const { response, data } = await apiFetch(`/api/sales/details?${params}`)
  const row = unwrap<SaleDetailReport>(response, data, '加载明细失败')
  return {
    from: row.from,
    to: row.to,
    revenue: Number(row.revenue ?? 0),
    profit: Number(row.profit ?? 0),
    soldQty: Number(row.soldQty ?? 0),
    cashRevenue: Number(row.cashRevenue ?? 0),
    cardRevenue: Number(row.cardRevenue ?? 0),
    orders: (row.orders ?? []).map((order) => ({
      id: order.id,
      createdAt: Number(order.createdAt ?? 0),
      revenue: Number(order.revenue ?? 0),
      profit: Number(order.profit ?? 0),
      soldQty: Number(order.soldQty ?? 0),
      payMethod: order.payMethod ?? '',
      lines: (order.lines ?? []).map((line) => ({
        name: line.name,
        qty: Number(line.qty ?? 0),
        price: Number(line.price ?? 0),
        cost: Number(line.cost ?? 0),
      })),
    })),
  }
}

export interface RankItem {
  goodsId: string
  name: string
  category: string
  unit: string
  supplier: string
  purchasePlace: string
  price: number
  cost: number
  stock: number
  soldQty: number
  revenue: number
  profit: number
  level: string
  levelLabel: string
}

export interface RankBoard {
  hot: RankItem[]
  cold: RankItem[]
}

export function peekRanks() {
  return readSalesCache<RankBoard>('ranks')
}

export async function fetchRanks() {
  return loadSalesCache('ranks', requestRanks)
}

async function requestRanks() {
  const { response, data } = await apiFetch('/api/sales/ranks')
  const row = unwrap<RankBoard>(response, data, '加载商品榜单失败')
  const mapItem = (item: RankItem): RankItem => ({
    goodsId: item.goodsId,
    name: item.name,
    category: item.category ?? '',
    unit: item.unit ?? '',
    supplier: item.supplier ?? '',
    purchasePlace: item.purchasePlace ?? '',
    price: Number(item.price ?? 0),
    cost: Number(item.cost ?? 0),
    stock: Number(item.stock ?? 0),
    soldQty: Number(item.soldQty ?? 0),
    revenue: Number(item.revenue ?? 0),
    profit: Number(item.profit ?? 0),
    level: item.level ?? '',
    levelLabel: item.levelLabel ?? '',
  })
  return {
    hot: (row.hot ?? []).map(mapItem),
    cold: (row.cold ?? []).map(mapItem),
  }
}

export async function checkoutGoods(lines: { goodsId: string; qty: number }[], payMethod: PayMethod) {
  const { response, data } = await apiFetch('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ lines, payMethod }),
  })
  return toSummary(unwrap<TodaySummary>(response, data, '结账失败'))
}

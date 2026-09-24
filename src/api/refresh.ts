import { listGoods } from './goods'
import { fetchRanks, fetchToday, type TodaySummary } from './sales'
import { invalidateAfterCheckout, invalidateRanks } from './salesCache'
import type { Goods } from '../types'

export function loadShelf() {
  return Promise.all([listGoods(), fetchToday()] as const)
}

export async function refreshAfterGoodsChange(): Promise<Goods[]> {
  invalidateRanks()
  const [goods] = await Promise.all([listGoods(), fetchRanks()])
  return goods
}

export async function refreshAfterCheckout(today: TodaySummary) {
  invalidateAfterCheckout()
  const [goods] = await Promise.all([listGoods(), fetchRanks()])
  return { today, goods }
}

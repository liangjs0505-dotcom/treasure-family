import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createGoods, deleteGoods, updateGoods as saveGoods } from '../api/goods'
import { loadShelf, refreshAfterCheckout, refreshAfterGoodsChange } from '../api/refresh'
import { checkoutGoods, type PayMethod } from '../api/sales'
import { toErrorMessage, useToast } from '../components/Toast'
import type { Category, Goods, GoodsFormData, GoodsStats, TodaySummary } from '../types'

interface GoodsContextValue {
  goods: Goods[]
  loading: boolean
  stats: GoodsStats
  categoryStats: { category: Category; count: number; value: number }[]
  addGoods: (data: GoodsFormData) => Promise<void>
  updateGoods: (id: string, data: GoodsFormData) => Promise<void>
  removeGoods: (id: string) => Promise<void>
  checkout: (lines: { goodsId: string; qty: number }[], payMethod: PayMethod) => Promise<void>
  today: TodaySummary
  isLowStock: (g: Goods) => boolean
  isOutOfStock: (g: Goods) => boolean
  needsRestock: (g: Goods) => boolean
}

const GoodsContext = createContext<GoodsContextValue | null>(null)

const EMPTY_TODAY: TodaySummary = { revenue: 0, profit: 0, orderCount: 0, soldQty: 0, cashRevenue: 0, cardRevenue: 0 }

const isLowStock = (g: Goods) => g.threshold > 0 && g.stock <= g.threshold
const isOutOfStock = (g: Goods) => g.stock <= 0
const needsRestock = (g: Goods) => isOutOfStock(g) || isLowStock(g)

export function GoodsProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [goods, setGoods] = useState<Goods[]>([])
  const [today, setToday] = useState<TodaySummary>(EMPTY_TODAY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [rows, summary] = await loadShelf()
        if (!cancelled) {
          setGoods(rows)
          setToday(summary)
        }
      } catch (err) {
        if (!cancelled) toast.error(toErrorMessage(err, '加载货物失败'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [toast])

  const addGoods = useCallback(async (data: GoodsFormData) => {
    await createGoods(data)
    setGoods(await refreshAfterGoodsChange())
  }, [])

  const updateGoods = useCallback(async (id: string, data: GoodsFormData) => {
    await saveGoods(id, data)
    setGoods(await refreshAfterGoodsChange())
  }, [])

  const removeGoods = useCallback(async (id: string) => {
    await deleteGoods(id)
    setGoods(await refreshAfterGoodsChange())
  }, [])

  const checkout = useCallback(async (lines: { goodsId: string; qty: number }[], payMethod: PayMethod) => {
    const summary = await checkoutGoods(lines, payMethod)
    const next = await refreshAfterCheckout(summary)
    setToday(next.today)
    setGoods(next.goods)
  }, [])

  const stats = useMemo<GoodsStats>(() => {
    return goods.reduce(
      (acc, g) => {
        acc.totalStock += g.stock
        acc.totalValue += g.price * g.stock
        if (isLowStock(g)) acc.lowStockCount += 1
        return acc
      },
      { totalKinds: goods.length, totalStock: 0, totalValue: 0, lowStockCount: 0 },
    )
  }, [goods])

  const categoryStats = useMemo(() => {
    const map = new Map<Category, { count: number; value: number }>()
    for (const g of goods) {
      const cur = map.get(g.category) ?? { count: 0, value: 0 }
      cur.count += 1
      cur.value += g.price * g.stock
      map.set(g.category, cur)
    }
    return Array.from(map, ([category, v]) => ({ category, ...v })).sort(
      (a, b) => b.value - a.value,
    )
  }, [goods])

  const value = useMemo(
    () => ({
      goods,
      loading,
      stats,
      categoryStats,
      addGoods,
      updateGoods,
      removeGoods,
      checkout,
      today,
      isLowStock,
      isOutOfStock,
      needsRestock,
    }),
    [goods, loading, stats, categoryStats, addGoods, updateGoods, removeGoods, checkout, today],
  )

  return <GoodsContext.Provider value={value}>{children}</GoodsContext.Provider>
}

export function useGoods() {
  const ctx = useContext(GoodsContext)
  if (!ctx) throw new Error('useGoods 必须在 GoodsProvider 内部使用')
  return ctx
}

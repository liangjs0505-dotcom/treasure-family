// 超市货物数据类型定义

/** 货物分类 */
export const CATEGORIES = [
  '食品饮料',
  '生鲜果蔬',
  '日用百货',
  '家居厨房',
  '文具办公',
  '其他',
] as const

export const CATEGORY_ICONS: Record<(typeof CATEGORIES)[number], string> = {
  食品饮料: '🥤',
  生鲜果蔬: '🥬',
  日用百货: '🧴',
  家居厨房: '🏠',
  文具办公: '✏️',
  其他: '📦',
}

export type Category = (typeof CATEGORIES)[number]

/** 超市常用单位 */
export const UNITS = ['件', '个', '瓶', '盒', '袋', '包', '箱', '罐', '桶', '条', '支', '双', '套', '千克', '克', '升', '毫升'] as const

/** 单个货物 */
export interface Goods {
  id: string
  barcode: string // 条码，包装码或本店打印的店内码
  name: string // 货物名称
  category: Category // 分类
  price: number // 售价（元）
  cost: number // 进价（元）
  stock: number // 库存数量
  unit: string // 单位（如：件/箱/瓶）
  supplier: string // 供应商
  purchasePlace: string // 购买地点
  threshold: number // 库存预警阈值（低于此值提示补货）
  createdAt: number // 录入时间戳
}

/** 表单数据（不含系统生成字段） */
export type GoodsFormData = Omit<Goods, 'id' | 'createdAt'>

/** 统计数据 */
export interface GoodsStats {
  totalKinds: number // 货物种类数
  totalStock: number // 库存总量
  totalValue: number // 库存总价值
  lowStockCount: number // 低库存货物数量
}

/** 今天已经结账的汇总，按北京时间计算 */
export interface TodaySummary {
  revenue: number
  profit: number
  orderCount: number
  soldQty: number
  cashRevenue: number
  cardRevenue: number
}
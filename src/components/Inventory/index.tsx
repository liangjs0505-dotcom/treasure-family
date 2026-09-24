import GoodsList, { type StockStatus } from '../GoodsList'
import { useGoods } from '../../context/GoodsContext'
import type { Goods } from '../../types'
import './index.scss'

const yuan = (n: number) => `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export interface InventoryQuery {
  category: string
  keyword: string
  status: StockStatus
}

interface Props {
  query: InventoryQuery
  onBack: () => void
  onEdit: (item: Goods) => void
}

export default function Inventory({ query, onBack, onEdit }: Props) {
  const { stats } = useGoods()

  return (
    <section className="inventory">
      <div className="inventory-head">
        <button className="btn" type="button" onClick={onBack}>
          返回看板
        </button>
        <h2>货物管理</h2>
      </div>
      <div className="inventory-stats">
        <div className="inventory-counts">
          <div>
            <b>{stats.totalKinds}</b>
            <span>货物种类</span>
          </div>
          <div>
            <b>{stats.totalStock}</b>
            <span>库存总量</span>
          </div>
        </div>
        <div className="inventory-value">
          <span>库存总价值</span>
          <b>{yuan(stats.totalValue)}</b>
        </div>
      </div>
      <GoodsList
        key={`${query.category}-${query.status}-${query.keyword}`}
        onEdit={onEdit}
        initialCategory={query.category}
        initialKeyword={query.keyword}
        initialStatus={query.status}
      />
    </section>
  )
}

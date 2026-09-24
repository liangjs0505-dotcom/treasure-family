import { useGoods } from '../../context/GoodsContext'
import './index.scss'

const yuan = (n: number) =>
  `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

interface Props {
  onBack: () => void
}

export default function Restock({ onBack }: Props) {
  const { goods, needsRestock } = useGoods()
  const rows = goods.filter(needsRestock).sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, 'zh-CN'))

  return (
    <section className="restock">
      <div className="restock-head">
        <button className="btn" type="button" onClick={onBack}>
          返回看板
        </button>
        <h2>低库存预警</h2>
      </div>

      {rows.length === 0 ? (
        <p className="empty">没有低库存货物</p>
      ) : (
        <>
          <div className="restock-summary">
            共 <b>{rows.length}</b> 种
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>供应商</th>
                  <th>购买地点</th>
                  <th>售价</th>
                  <th>进价</th>
                  <th>现有</th>
                  <th>预警线</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-name">
                      {item.name}
                      <span className="tag">{item.category}</span>
                    </td>
                    <td>{item.supplier || '—'}</td>
                    <td>{item.purchasePlace || '—'}</td>
                    <td>{yuan(item.price)}</td>
                    <td>{yuan(item.cost)}</td>
                    <td>{`${item.stock}${item.unit}`}</td>
                    <td>{`${item.threshold}${item.unit}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

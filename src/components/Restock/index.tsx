import { useGoods } from '../../context/GoodsContext'
import { useToast } from '../Toast'
import './index.scss'

const yuan = (n: number) =>
  `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

interface Props {
  onBack: () => void
}

export default function Restock({ onBack }: Props) {
  const toast = useToast()
  const { goods, needsRestock } = useGoods()
  const rows = goods.filter(needsRestock).sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, 'zh-CN'))

  const printList = () => {
    if (rows.length === 0) {
      toast.error('现在没有需要补货的货物，先不用打印')
      return
    }
    document.body.classList.add('restock-printing')
    const done = () => {
      document.body.classList.remove('restock-printing')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
    toast.success('补货清单已交给打印机')
  }

  return (
    <section className="restock">
      <div className="restock-head">
        <button className="btn" type="button" onClick={onBack}>
          返回看板
        </button>
        <h2>低库存预警</h2>
        <button className="btn restock-print" type="button" onClick={printList}>
          打印清单
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="empty">没有低库存货物</p>
      ) : (
        <>
          <div className="restock-mark" aria-hidden="true">
            <span className="brand-icon">🛒</span>
            <span>Treasure Family</span>
          </div>
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
                    <td data-label="供应商">{item.supplier || '—'}</td>
                    <td data-label="购买地点">{item.purchasePlace || '—'}</td>
                    <td data-label="售价">{yuan(item.price)}</td>
                    <td data-label="进价">{yuan(item.cost)}</td>
                    <td data-label="现有">{`${item.stock}${item.unit}`}</td>
                    <td data-label="预警线">{`${item.threshold}${item.unit}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="restock-credit">该清单由 https://www.treasure-family-system.com 提供</p>
        </>
      )}
    </section>
  )
}

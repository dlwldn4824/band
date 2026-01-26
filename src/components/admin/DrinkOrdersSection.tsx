import { formatPhoneDisplay } from '../../utils/phoneFormat'
import '../../pages/Admin.css'

interface DrinkOrder {
  id: string
  name: string
  phone: string
  beerQuantity: number
  mojitoQuantity: number
  totalAmount: number
  createdAt: any
  paymentConfirmed?: boolean
  paymentConfirmedAt?: any
  provided?: boolean
  providedAt?: any
  orderHistory?: Array<{
    beerQuantity: number
    mojitoQuantity: number
    unitPrice?: number
    createdAt: any
    provided?: boolean
    providedAt?: any
  }>
}

interface DrinkOrdersSectionProps {
  drinkOrders: DrinkOrder[]
  onDeleteAll: () => void
  onPaymentConfirm: (orderId: string) => void
  onProvide: (orderId: string, historyIndex?: number) => void
  onDeleteHistory: (orderId: string, historyIndex: number) => void
  onDeleteOrder: (orderId: string) => void
}

const DrinkOrdersSection = ({
  drinkOrders,
  onDeleteAll,
  onPaymentConfirm,
  onProvide,
  onDeleteHistory,
  onDeleteOrder
}: DrinkOrdersSectionProps) => {
  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2>주류 구매 내역</h2>
          <p className="section-description">
            주류 구매 내역을 확인할 수 있습니다.
          </p>
        </div>
        {drinkOrders.length > 0 && (
          <button onClick={onDeleteAll} className="delete-all-button">
            🗑️ 전체 삭제
          </button>
        )}
      </div>
      {drinkOrders.length > 0 ? (
        <div className="guest-list-table">
          <table>
            <thead>
              <tr>
                <th>번호</th>
                <th>이름</th>
                <th>전화번호</th>
                <th>캔 맥주</th>
                <th>산토리 하이볼</th>
                <th>총 금액</th>
                <th>주문 시간</th>
                <th>입금 확인</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                interface OrderRow {
                  order: DrinkOrder
                  history: any | null
                  historyIndex: number | null
                  createdAt: any
                }
                
                const allOrderRows: OrderRow[] = []
                
                drinkOrders.forEach((order) => {
                  const hasOrderHistory = order.orderHistory && Array.isArray(order.orderHistory) && order.orderHistory.length > 0
                  
                  if (hasOrderHistory && order.orderHistory) {
                    order.orderHistory.forEach((history: any, historyIdx: number) => {
                      allOrderRows.push({
                        order,
                        history,
                        historyIndex: historyIdx,
                        createdAt: history.createdAt || order.createdAt
                      })
                    })
                  } else {
                    allOrderRows.push({
                      order,
                      history: null,
                      historyIndex: null,
                      createdAt: order.createdAt
                    })
                  }
                })
                
                const sortedByOldest = [...allOrderRows].sort((a, b) => {
                  const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
                  const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
                  return aTime - bTime
                })
                
                const numberMap = new Map<string, number>()
                sortedByOldest.forEach((row, index) => {
                  const key = row.history !== null 
                    ? `${row.order.id}-${row.historyIndex}`
                    : row.order.id
                  numberMap.set(key, index + 1)
                })
                
                const sortedByNewest = [...allOrderRows].sort((a, b) => {
                  const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
                  const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
                  return bTime - aTime
                })
                
                const rows: JSX.Element[] = []
                
                sortedByNewest.forEach((rowData) => {
                  const { order, history, historyIndex } = rowData
                  const rowKey = history !== null 
                    ? `${order.id}-${historyIndex}`
                    : order.id
                  const rowNumber = numberMap.get(rowKey) || 0
                  
                  if (history !== null) {
                    const ADMIN_PRICE = 2000
                    const ORIGINAL_PRICE = 3500
                    const itemPrice = history.unitPrice || (order.phone === 'admin' ? ADMIN_PRICE : ORIGINAL_PRICE)
                    const historyAmount = (history.beerQuantity || 0) * itemPrice + (history.mojitoQuantity || 0) * itemPrice
                    const isProvided = history.provided === true
                    
                    rows.push(
                      <tr key={`${order.id}-${historyIndex}`} className={isProvided ? 'order-provided' : 'order-not-provided'}>
                        <td>{rowNumber}</td>
                        <td>{order.name}</td>
                        <td>{formatPhoneDisplay(order.phone)}</td>
                        <td>
                          <div className="flex-container">
                            <span>{history.beerQuantity || 0}개</span>
                            {order.paymentConfirmed && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onProvide(order.id, historyIndex!)
                                }}
                                className={`provide-button-small ${isProvided ? '' : 'pending'}`}
                              >
                                {isProvided ? '✓' : '○'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex-container">
                            <span>{history.mojitoQuantity || 0}개</span>
                            {order.paymentConfirmed && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onProvide(order.id, historyIndex!)
                                }}
                                className={`provide-button-small ${isProvided ? '' : 'pending'}`}
                              >
                                {isProvided ? '✓' : '○'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td>{historyAmount.toLocaleString()}원</td>
                        <td>
                          {history.createdAt?.toDate ? 
                            new Date(history.createdAt.toDate()).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                        </td>
                        <td className="text-center">
                          <div className="flex-column-center">
                            <button
                              onClick={() => onPaymentConfirm(order.id)}
                              className={`payment-confirm-button ${order.paymentConfirmed ? 'confirmed' : 'not-confirmed'}`}
                              title={order.paymentConfirmed && order.paymentConfirmedAt ? `입금 확인 완료 (${order.paymentConfirmedAt?.toDate ? new Date(order.paymentConfirmedAt.toDate()).toLocaleString('ko-KR') : '-'})` : '입금 확인 대기'}
                            >
                              {order.paymentConfirmed ? '확인완료' : '대기중'}
                            </button>
                            {order.paymentConfirmed && order.paymentConfirmedAt && (
                              <span className="text-small">
                                {order.paymentConfirmedAt?.toDate ? 
                                  new Date(order.paymentConfirmedAt.toDate()).toLocaleString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex-column">
                            <div className="flex-row">
                              <button
                                onClick={() => onProvide(order.id, historyIndex!)}
                                disabled={!order.paymentConfirmed}
                                className={`provide-button ${isProvided ? 'provided' : order.paymentConfirmed ? 'pending' : 'disabled'}`}
                                title={order.paymentConfirmed ? (isProvided ? '제공완료됨' : '제공완료 처리') : '입금 확인 후 제공완료 처리 가능'}
                              >
                                {isProvided ? '제공완료' : '제공 대기'}
                              </button>
                              <button
                                onClick={() => onDeleteHistory(order.id, historyIndex!)}
                                className="delete-button"
                              >
                                삭제
                              </button>
                            </div>
                            {isProvided && history.providedAt && (
                              <span className="text-small">
                                {history.providedAt?.toDate ? 
                                  new Date(history.providedAt.toDate()).toLocaleString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  } else {
                    const allProvided = order.provided === true
                    
                    rows.push(
                      <tr key={order.id} className={allProvided ? 'order-provided' : 'order-not-provided'}>
                        <td>{rowNumber}</td>
                        <td>{order.name}</td>
                        <td>{formatPhoneDisplay(order.phone)}</td>
                        <td>{order.beerQuantity}개</td>
                        <td>{order.mojitoQuantity}개</td>
                        <td>
                          {(() => {
                            if (order.orderHistory && order.orderHistory.length > 0) {
                              const ADMIN_PRICE = 2000
                              const ORIGINAL_PRICE = 3500
                              
                              let calculatedTotal = 0
                              order.orderHistory.forEach((historyItem: any) => {
                                let itemPrice = historyItem.unitPrice
                                if (!itemPrice) {
                                  itemPrice = (order.phone === 'admin') ? ADMIN_PRICE : ORIGINAL_PRICE
                                }
                                const itemTotal = (historyItem.beerQuantity * itemPrice) + (historyItem.mojitoQuantity * itemPrice)
                                calculatedTotal += itemTotal
                              })
                              return calculatedTotal.toLocaleString() + '원'
                            }
                            const ADMIN_PRICE = 2000
                            const ORIGINAL_PRICE = 3500
                            const itemPrice = order.phone === 'admin' ? ADMIN_PRICE : ORIGINAL_PRICE
                            const calculatedTotal = (order.beerQuantity * itemPrice) + (order.mojitoQuantity * itemPrice)
                            return calculatedTotal.toLocaleString() + '원'
                          })()}
                        </td>
                        <td>
                          {order.createdAt?.toDate ? 
                            new Date(order.createdAt.toDate()).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                        </td>
                        <td className="text-center">
                          <div className="flex-column-center">
                            <button
                              onClick={() => onPaymentConfirm(order.id)}
                              className={`payment-confirm-button ${order.paymentConfirmed ? 'confirmed' : 'not-confirmed'}`}
                              title={order.paymentConfirmed && order.paymentConfirmedAt ? `입금 확인 완료 (${order.paymentConfirmedAt?.toDate ? new Date(order.paymentConfirmedAt.toDate()).toLocaleString('ko-KR') : '-'})` : '입금 확인 대기'}
                            >
                              {order.paymentConfirmed ? '확인완료' : '대기중'}
                            </button>
                            {order.paymentConfirmed && order.paymentConfirmedAt && (
                              <span className="text-small">
                                {order.paymentConfirmedAt?.toDate ? 
                                  new Date(order.paymentConfirmedAt.toDate()).toLocaleString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex-column">
                            <div className="flex-row">
                              <button
                                onClick={() => onProvide(order.id)}
                                disabled={!order.paymentConfirmed}
                                className={`provide-button ${order.provided ? 'provided' : order.paymentConfirmed ? 'pending' : 'disabled'}`}
                                title={order.paymentConfirmed ? (order.provided ? '제공완료됨' : '제공완료 처리') : '입금 확인 후 제공완료 처리 가능'}
                              >
                                {order.provided ? '제공완료' : '제공 대기'}
                              </button>
                              <button
                                onClick={() => onDeleteOrder(order.id)}
                                className="delete-button"
                              >
                                삭제
                              </button>
                            </div>
                            {order.provided && order.providedAt && (
                              <span className="text-small">
                                {order.providedAt?.toDate ? 
                                  new Date(order.providedAt.toDate()).toLocaleString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  }
                })
                
                return rows
              })()}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted">
          주류 구매 내역이 없습니다.
        </p>
      )}
    </div>
  )
}

export default DrinkOrdersSection



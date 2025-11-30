import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, TrendingUp, DollarSign, Package, Calendar } from 'lucide-react'
import { db } from '../db/database'

const Reports = ({ refreshTrigger }) => {
  const navigate = useNavigate()
  const [reports, setReports] = useState({
    sales: [],
    purchases: [],
    inventory: []
  })

  useEffect(() => {
    loadReports()
  }, [refreshTrigger])

  const loadReports = async () => {
    try {
      // 获取所有记录
      const stockOutRecords = await db.stockOut.toArray();
      const stockInRecords = await db.stockIn.toArray();

      const clothes = await db.clothes.toArray();

      // 销售统计
      const salesByDate = {};
      const salesByProduct = {};
      let totalSales = 0;
      let totalProfit = 0;
      let totalQuantity = 0;
      
      stockOutRecords.forEach(record => {
        // 修复：确保字段名称正确，兼容不同版本的字段名
        const recordTotalAmount = record.totalAmount || record.amount || 0;
        const recordQuantity = record.quantity || record.qty || 0;
        const recordSellingPrice = record.sellingPrice || record.price || 0;
        
        // 放宽验证条件：只要有出库记录就进行统计，即使数量为0
        if (recordQuantity >= 0) { // 允许数量为0的记录
          // 修复：如果totalAmount为0但quantity和sellingPrice有效，则重新计算
          let actualTotalAmount = recordTotalAmount;
          if (actualTotalAmount === 0 && recordQuantity > 0 && recordSellingPrice > 0) {
            actualTotalAmount = recordQuantity * recordSellingPrice;
          }
          
          // 计入总销售额
          totalSales += actualTotalAmount;
          totalQuantity += recordQuantity;
          
          // 按日期统计
          let recordDate = record.date;
          if (typeof recordDate === 'string') {
            if (recordDate.includes(' ')) {
              recordDate = recordDate.split(' ')[0];
            } else if (recordDate.includes('T')) {
              recordDate = recordDate.split('T')[0];
            }
          }
          if (!salesByDate[recordDate]) {
            salesByDate[recordDate] = { sales: 0, profit: 0, quantity: 0 };
          }
          salesByDate[recordDate].sales += actualTotalAmount;
          salesByDate[recordDate].quantity += recordQuantity;
          
          // 计算利润
          if (record.clothingId) {
            const clothing = clothes.find(c => c.id === record.clothingId);
            
            if (clothing) {
              // 使用服装的采购价计算利润
              const purchasePrice = clothing.purchasePrice || 0;
              let profit = 0;
              
              if (purchasePrice > 0) {
                profit = actualTotalAmount - (recordQuantity * purchasePrice);
              } else {
                console.warn('服装采购价为0或未设置，无法计算利润:', clothing);
              }
              
              // 更新日期统计的利润
              salesByDate[recordDate].profit += profit;
              
              // 更新总利润
              totalProfit += profit;
              
              // 按产品统计
              if (!salesByProduct[record.clothingId]) {
                salesByProduct[record.clothingId] = {
                  name: clothing.name || '未知名称',
                  code: clothing.code || '未知编码',
                  sales: 0,
                  quantity: 0,
                  profit: 0
                };
              }
              salesByProduct[record.clothingId].sales += actualTotalAmount;
              salesByProduct[record.clothingId].quantity += recordQuantity;
              salesByProduct[record.clothingId].profit += profit;
            } else {
              console.warn('未找到对应的服装信息，clothingId:', record.clothingId);
            }
          } else {
            console.warn('出库记录缺少服装ID:', record);
          }
        } else {
          console.warn('出库记录数量无效:', record);
        }
      })
      
      // 采购统计
      const purchasesByDate = {}
      let totalPurchases = 0
      
      stockInRecords.forEach(record => {
        // 对于所有入库记录都进行统计，无论是否有totalAmount字段
        // 确保数量和价格的有效性
        const recordQuantity = record.quantity || 0;
        const recordPurchasePrice = record.purchasePrice || 0;
        
        // 总是计算实际金额：优先使用记录中的totalAmount，否则自动计算
        let actualTotalAmount = record.totalAmount || 0;
        
        // 如果记录中没有totalAmount或者totalAmount为0，但有有效的数量和价格，则自动计算
        if (actualTotalAmount === 0 && recordQuantity > 0 && recordPurchasePrice > 0) {
          actualTotalAmount = recordQuantity * recordPurchasePrice;
        }
        
        // 处理日期格式
        let recordDate = record.date;
        if (typeof recordDate === 'string') {
          if (recordDate.includes(' ')) {
            recordDate = recordDate.split(' ')[0];
          } else if (recordDate.includes('T')) {
            recordDate = recordDate.split('T')[0];
          }
        } else if (recordDate instanceof Date) {
          // 如果是Date对象，转换为YYYY-MM-DD格式
          recordDate = recordDate.toISOString().split('T')[0];
        } else {
          // 默认使用当前日期
          recordDate = new Date().toISOString().split('T')[0];
        }
        
        if (!purchasesByDate[recordDate]) {
          purchasesByDate[recordDate] = { amount: 0, count: 0 }
        }
        purchasesByDate[recordDate].amount += actualTotalAmount
        purchasesByDate[recordDate].count += recordQuantity
        totalPurchases += actualTotalAmount
      })

      setReports({
        sales: {
          byDate: Object.entries(salesByDate).map(([date, data]) => ({
            date,
            sales: data.sales,
            profit: data.profit,
            quantity: data.quantity
          })),
          byProduct: Object.values(salesByProduct),
          total: totalSales,
          totalProfit: totalProfit,
          totalQuantity: stockOutRecords.reduce((sum, record) => sum + record.quantity, 0)
        },
        purchases: {
          byDate: Object.entries(purchasesByDate).map(([date, data]) => ({
            date,
            amount: data.amount,
            quantity: data.count
          })),
          total: totalPurchases,
          totalQuantity: stockInRecords.reduce((sum, record) => sum + record.quantity, 0)
        },
        inventory: {
          totalProducts: clothes.length,
          totalValue: await calculateTotalInventoryValue(clothes)
        }
      })
    } catch (error) {
      console.error('加载报表数据失败:', error)
    }
  }

  const calculateTotalInventoryValue = async (clothes) => {
    try {
      const inventory = await db.inventory.toArray()
      const total = inventory.reduce((sum, inv) => {
        const clothing = clothes.find(c => c.id === inv.clothingId)
        return sum + (clothing ? inv.quantity * clothing.purchasePrice : 0)
      }, 0)
      return Math.round(total * 100) / 100 // 确保总价值精度
    } catch (error) {
      return 0
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount)
  }

  return (
    <div className="container">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '8px 16px',
              background: '#f8f9fa',
              color: '#6c757d',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ← 返回
          </button>
          <h1 className="text-xl font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={24} />
            统计报表
          </h1>
        </div>
        

      </div>

      {/* 关键指标 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div className="card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              background: '#E8F5E8',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DollarSign size={24} color="#4CAF50" />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666' }}>销售总额</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: '#4CAF50' }}>
                {formatCurrency(reports.sales.total)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {reports.sales.totalQuantity} 件商品
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              background: '#FFF3E0',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={24} color="#FF9800" />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666' }}>销售利润</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: '#FF9800' }}>
                {formatCurrency(reports.sales.totalProfit)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                利润率: {reports.sales.total > 0 ? ((reports.sales.totalProfit / reports.sales.total) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              background: '#E3F2FD',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Package size={24} color="#2196F3" />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666' }}>采购总额</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: '#2196F3' }}>
                {formatCurrency(reports.purchases.total)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {reports.purchases.totalQuantity} 件商品
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              background: '#F3E5F5',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BarChart3 size={24} color="#9C27B0" />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666' }}>库存价值</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: '#9C27B0' }}>
                {formatCurrency(reports.inventory.totalValue)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {reports.inventory.totalProducts} 个品类
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
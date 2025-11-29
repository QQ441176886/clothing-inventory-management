import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, DollarSign, Package, Calendar } from 'lucide-react'
import { db } from '../db/database'

const Reports = ({ refreshTrigger }) => {
  const [reports, setReports] = useState({
    sales: [],
    purchases: [],
    inventory: []
  })
  // 使用本地日期格式化，避免时区偏差
  const getLocalDateString = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const [dateRange, setDateRange] = useState({
    start: getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: getLocalDateString(new Date())
  })

  useEffect(() => {
    loadReports()
  }, [dateRange, refreshTrigger])

  const loadReports = async () => {
    try {
      // 确保日期范围查询包含边界日期的所有记录
      const startDate = dateRange.start;
      const endDate = dateRange.end;
      
      // 获取所有记录
      const allStockOutRecords = await db.stockOut.toArray();
      const allStockInRecords = await db.stockIn.toArray();
      
      // 使用更宽松的日期比较，确保包含边界日期的所有记录
      const stockOutRecords = allStockOutRecords.filter(record => {
        // 处理可能的日期格式不一致问题
        let recordDate = record.date;
        if (typeof recordDate === 'string') {
          // 处理日期时间格式
          if (recordDate.includes(' ')) {
            recordDate = recordDate.split(' ')[0];
          } else if (recordDate.includes('T')) {
            recordDate = recordDate.split('T')[0];
          }
        }
        return recordDate >= startDate && recordDate <= endDate;
      });
      
      const stockInRecords = allStockInRecords.filter(record => {
        let recordDate = record.date;
        if (typeof recordDate === 'string') {
          // 处理日期时间格式
          if (recordDate.includes(' ')) {
            recordDate = recordDate.split(' ')[0];
          } else if (recordDate.includes('T')) {
            recordDate = recordDate.split('T')[0];
          }
        }
        return recordDate >= startDate && recordDate <= endDate;
      });

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
        // 放宽验证条件：只要有入库记录就进行统计
        if (record.quantity >= 0) { // 允许数量为0的记录
          let recordDate = record.date;
          if (typeof recordDate === 'string') {
            if (recordDate.includes(' ')) {
              recordDate = recordDate.split(' ')[0];
            } else if (recordDate.includes('T')) {
              recordDate = recordDate.split('T')[0];
            }
          }
          
          if (!purchasesByDate[recordDate]) {
            purchasesByDate[recordDate] = { amount: 0, count: 0 }
          }
          purchasesByDate[recordDate].amount += record.totalAmount
          purchasesByDate[recordDate].count += record.quantity
          totalPurchases += record.totalAmount
        }
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
        <h1 className="text-xl font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={24} />
          统计报表
        </h1>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">开始日期</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="form-input"
              style={{ minHeight: '44px' }}
            />
          </div>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">结束日期</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="form-input"
              style={{ minHeight: '44px' }}
            />
          </div>
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
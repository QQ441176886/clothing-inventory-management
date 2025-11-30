import React, { useState, useEffect } from 'react'
import { Warehouse, AlertTriangle, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import { db } from '../db/database'

const Inventory = ({ refreshStats }) => {
  const [inventory, setInventory] = useState([])
  const [lowStockThreshold, setLowStockThreshold] = useState(1) // 默认值
  const [showInventoryDetails, setShowInventoryDetails] = useState(false)
  const [showLowStockDetails, setShowLowStockDetails] = useState(false)
  const [showOutOfStockDetails, setShowOutOfStockDetails] = useState(false)
  

  


  useEffect(() => {
    loadInventory()
    loadLowStockThreshold()
  }, [refreshStats])
  
  // 从系统设置中加载低库存阈值
  const loadLowStockThreshold = async () => {
    try {
      const setting = await db.settings.get({ key: 'lowStockThreshold' })
      if (setting) {
        setLowStockThreshold(setting.value)
      }
    } catch (error) {
      console.error('加载低库存阈值失败:', error)
    }
  }

  const loadInventory = async () => {
    try {
      const [allInventory, allClothes] = await Promise.all([
        db.inventory.toArray(),
        db.clothes.toArray()
      ])
      
      // 合并库存和服装信息
      const inventoryWithDetails = allInventory.map(inv => {
        const clothing = allClothes.find(c => c.id === inv.clothingId)
        const totalValue = clothing ? inv.quantity * clothing.purchasePrice : 0
        return {
          ...inv,
          clothing: clothing || {},
          totalValue: Math.round(totalValue * 100) / 100 // 确保总价值精度
        }
      }).filter(item => {
        // 过滤掉没有对应服装的库存记录
        return item.clothing.id;
      }).sort((a, b) => {
        // 按服装编码排序
        if (a.clothing.code && b.clothing.code) {
          return a.clothing.code.localeCompare(b.clothing.code)
        }
        return 0
      })
      
      setInventory(inventoryWithDetails)
    } catch (error) {
      console.error('加载库存数据失败:', error)
    }
  }

  const filteredInventory = inventory

  const lowStockItems = filteredInventory.filter(item => item.quantity > 0 && item.quantity <= lowStockThreshold)
  const outOfStockItems = filteredInventory.filter(item => item.quantity === 0)

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { text: '缺货', color: '#f44336', bgColor: '#FFEBEE' }
    if (quantity <= lowStockThreshold) return { text: '低库存', color: '#FF9800', bgColor: '#FFF3E0' }
    return { text: '充足', color: '#4CAF50', bgColor: '#E8F5E8' }
  }

  const calculateTotalInventoryValue = () => {
    return inventory.reduce((total, item) => total + item.totalValue, 0)
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
          <Warehouse size={24} />
          库存查询
        </h1>
        

      </div>

      {/* 库存列表 - 点击总库存卡片后显示 */}
      {showInventoryDetails && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '24px'
          }}>
            库存明细 ({filteredInventory.length} 个品类)
          </h2>
          
          {filteredInventory.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#666' 
            }}>
              <Warehouse size={48} color="#ccc" style={{ marginBottom: '16px' }} />
              <p>暂无库存数据</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                请先添加服装并进行入库操作
              </p>
            </div>
          ) : (
            <div className="table-container" style={{ 
              overflowX: 'auto',
              overflowY: 'auto',
              maxHeight: '500px',
              borderRadius: '8px', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              width: '100%',
              position: 'relative'
            }}>
              {/* 桌面端表格 */}
              <div className="desktop-table">
                <table className="table" style={{ 
                  width: '100%', 
                  tableLayout: 'fixed', 
                  borderSpacing: 0, 
                  borderCollapse: 'collapse', 
                  fontSize: '16px', 
                  fontWeight: '600',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
                  lineHeight: '1.4',
                  fontSmooth: 'always',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '14px 10px', fontWeight: '600', color: '#555', textAlign: 'left', borderBottom: '2px solid #e0e0e0', position: 'sticky', left: 0, background: '#f8f9fa', zIndex: 10, width: '110px', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>服装编码</th>
                    <th style={{ padding: '14px 10px', fontWeight: '600', color: '#555', textAlign: 'left', borderBottom: '2px solid #e0e0e0', position: 'sticky', left: 110, background: '#f8f9fa', zIndex: 10, width: '130px', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>服装名称</th>
                    <th style={{ padding: '14px 10px', fontWeight: '600', color: '#555', textAlign: 'right', borderBottom: '2px solid #e0e0e0', width: '100px', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>进货价格</th>
                    <th style={{ padding: '14px 10px', fontWeight: '600', color: '#555', textAlign: 'right', borderBottom: '2px solid #e0e0e0', width: '100px', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>销售价格</th>
                    <th style={{ padding: '14px 10px', fontWeight: '600', color: '#555', textAlign: 'left', borderBottom: '2px solid #e0e0e0', width: '90px', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>品类</th>
                    <th style={{ padding: '14px 10px', fontWeight: '600', color: '#555', textAlign: 'left', borderBottom: '2px solid #e0e0e0', width: '80px', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>尺码</th>
                    <th style={{ padding: '14px 10px', fontWeight: '600', color: '#555', textAlign: 'left', borderBottom: '2px solid #e0e0e0', width: '80px', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>颜色</th>
                    <th style={{ padding: '14px 10px', fontWeight: '600', color: '#555', textAlign: 'right', borderBottom: '2px solid #e0e0e0', width: '100px', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>库存数量</th>
                    <th style={{ padding: '14px 10px', fontWeight: '600', color: '#555', textAlign: 'right', borderBottom: '2px solid #e0e0e0', width: '100px', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>库存价值</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item, index) => {
                    return (
                      <tr key={item.id} style={{
                        transition: 'background-color 0.2s ease',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fafafa'}>
                        <td style={{ padding: '14px 10px', fontWeight: '600', color: '#333', borderBottom: index < filteredInventory.length - 1 ? '2px solid #2196F3' : '1px solid #f0f0f0', position: 'sticky', left: 0, background: index % 2 === 0 ? '#ffffff' : '#fafafa', zIndex: 5, width: '110px', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>{item.clothing.code}</td>
                        <td style={{ padding: '14px 10px', fontWeight: '600', color: '#333', borderBottom: index < filteredInventory.length - 1 ? '2px solid #2196F3' : '1px solid #f0f0f0', position: 'sticky', left: 110, background: index % 2 === 0 ? '#ffffff' : '#fafafa', zIndex: 5, width: '130px', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>{item.clothing.name}</td>
                        <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: '600', color: '#666', borderBottom: index < filteredInventory.length - 1 ? '2px solid #2196F3' : '1px solid #f0f0f0', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>¥{item.clothing.purchasePrice.toFixed(2)}</td>
                        <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: '600', color: '#f44336', borderBottom: index < filteredInventory.length - 1 ? '2px solid #2196F3' : '1px solid #f0f0f0', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>¥{item.clothing.sellingPrice.toFixed(2)}</td>
                        <td style={{ padding: '14px 10px', fontWeight: '600', color: '#666', borderBottom: index < filteredInventory.length - 1 ? '2px solid #2196F3' : '1px solid #f0f0f0', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>{item.clothing.category}</td>
                        <td style={{ padding: '14px 10px', fontWeight: '600', color: '#666', borderBottom: index < filteredInventory.length - 1 ? '2px solid #2196F3' : '1px solid #f0f0f0', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>{item.clothing.size}</td>
                        <td style={{ padding: '14px 10px', fontWeight: '600', color: '#666', borderBottom: index < filteredInventory.length - 1 ? '2px solid #2196F3' : '1px solid #f0f0f0', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>{item.clothing.color}</td>
                        <td style={{ 
                          padding: '14px 10px',
                          fontWeight: '600',
                          textAlign: 'right',
                          color: item.quantity === 0 ? '#f44336' : item.quantity <= lowStockThreshold ? '#FF9800' : '#4CAF50',
                          borderBottom: index < filteredInventory.length - 1 ? '2px solid #2196F3' : '1px solid #f0f0f0',
                          fontSize: '16px',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          lineHeight: '1.4',
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale'
                        }}>
                          {item.quantity} 件
                        </td>
                        <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: '600', color: '#2196F3', borderBottom: index < filteredInventory.length - 1 ? '2px solid #2196F3' : '1px solid #f0f0f0', fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
                          ¥{item.totalValue.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
              
              {/* 移动端卡片布局 */}
              <div className="mobile-table">
                {filteredInventory.map((item, index) => {
                  const stockStatus = getStockStatus(item.quantity);
                  return (
                    <div key={item.id} className="mobile-table-card" style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '16px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                      transition: 'transform 0.2s ease',
                      borderBottom: index < filteredInventory.length - 1 ? '3px solid #2196F3' : 'none'
                    }}>
                      <div className="mobile-table-row">
                        <div className="mobile-table-cell">
                          <span className="mobile-table-label">服装编码</span>
                          <span className="mobile-table-value" style={{fontWeight: '600'}}>{item.clothing.code}</span>
                        </div>
                        <div className="mobile-table-cell">
                          <span className="mobile-table-label">服装名称</span>
                          <span className="mobile-table-value" style={{fontWeight: '600'}}>{item.clothing.name}</span>
                        </div>
                        <div className="mobile-table-cell">
                          <span className="mobile-table-label">进货价格</span>
                          <span className="mobile-table-value" style={{fontWeight: '600'}}>¥{item.clothing.purchasePrice.toFixed(2)}</span>
                        </div>
                        <div className="mobile-table-cell">
                          <span className="mobile-table-label">销售价格</span>
                          <span className="mobile-table-value" style={{fontWeight: '600', color: '#f44336'}}>¥{item.clothing.sellingPrice.toFixed(2)}</span>
                        </div>
                        <div className="mobile-table-cell">
                          <span className="mobile-table-label">品类</span>
                          <span className="mobile-table-value" style={{fontWeight: '600'}}>{item.clothing.category}</span>
                        </div>
                        <div className="mobile-table-cell">
                          <span className="mobile-table-label">尺码</span>
                          <span className="mobile-table-value" style={{fontWeight: '600'}}>{item.clothing.size}</span>
                        </div>
                        <div className="mobile-table-cell">
                          <span className="mobile-table-label">颜色</span>
                          <span className="mobile-table-value" style={{fontWeight: '600'}}>{item.clothing.color}</span>
                        </div>
                        <div className="mobile-table-cell">
                          <span className="mobile-table-label">库存数量</span>
                          <span className="mobile-table-value" style={{fontWeight: '600', color: item.quantity === 0 ? '#f44336' : item.quantity <= lowStockThreshold ? '#FF9800' : '#4CAF50'}}>
                            {item.quantity} 件
                          </span>
                        </div>
                        <div className="mobile-table-cell">
                          <span className="mobile-table-label">库存价值</span>
                          <span className="mobile-table-value" style={{fontWeight: '600', color: '#2196F3'}}>
                            ¥{item.totalValue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 库存概览 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
        marginTop: '24px'
      }}>
        <div className="card" style={{
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onClick={() => setShowInventoryDetails(!showInventoryDetails)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
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
                <Warehouse size={24} color="#2196F3" />
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>总库存品类</div>
                <div style={{ fontSize: '28px', fontWeight: '600', color: '#2196F3' }}>
                  {filteredInventory.length}
                </div>
              </div>
            </div>
            {showInventoryDetails ? <ChevronUp size={20} color="#2196F3" /> : <ChevronDown size={20} color="#2196F3" />}
          </div>
        </div>

        <div className="card" style={{
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}>
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
              <TrendingDown size={24} color="#4CAF50" />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666' }}>库存总价值</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: '#4CAF50' }}>
                ¥{calculateTotalInventoryValue().toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onClick={() => setShowLowStockDetails(!showLowStockDetails)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
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
                <AlertTriangle size={24} color="#FF9800" />
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>低库存预警</div>
                <div style={{ fontSize: '28px', fontWeight: '600', color: '#FF9800' }}>
                  {lowStockItems.length}
                </div>
              </div>
            </div>
            {showLowStockDetails ? <ChevronUp size={20} color="#FF9800" /> : <ChevronDown size={20} color="#FF9800" />}
          </div>
        </div>
      </div>

      {/* 低库存预警详情 */}
      {showLowStockDetails && lowStockItems.length > 0 && (
        <div className="card" style={{ marginTop: '24px', borderLeft: '4px solid #FF9800' }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#E65100'
          }}>
            <AlertTriangle size={20} color="#FF9800" />
            低库存预警详情 ({lowStockItems.length} 个品类)
          </h2>
          
          <div style={{ 
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: '400px',
            borderRadius: '8px', 
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            width: '100%',
            position: 'relative'
          }}>
            <table className="table" style={{ minWidth: '800px', width: '100%' }}>
              <thead>
                <tr style={{ background: '#FFF3E0' }}>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#E65100', textAlign: 'left', borderBottom: '2px solid #FFE0B2' }}>服装编码</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#E65100', textAlign: 'left', borderBottom: '2px solid #FFE0B2' }}>服装名称</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#E65100', textAlign: 'left', borderBottom: '2px solid #FFE0B2' }}>品类</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#E65100', textAlign: 'left', borderBottom: '2px solid #FFE0B2' }}>尺码</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#E65100', textAlign: 'left', borderBottom: '2px solid #FFE0B2' }}>颜色</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#E65100', textAlign: 'right', borderBottom: '2px solid #FFE0B2' }}>进货价格</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#E65100', textAlign: 'right', borderBottom: '2px solid #FFE0B2' }}>销售价格</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#E65100', textAlign: 'right', borderBottom: '2px solid #FFE0B2' }}>当前库存</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#E65100', textAlign: 'right', borderBottom: '2px solid #FFE0B2' }}>阈值</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems
                  .sort((a, b) => a.quantity - b.quantity) // 按库存数量升序排序
                  .map((item, index) => (
                  <tr key={item.id} style={{
                    transition: 'background-color 0.2s ease',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#FFF3E0'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF3E0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#FFF3E0'}>
                    <td style={{ padding: '8px 12px', fontWeight: '600', color: '#E65100', borderBottom: '1px solid #FFE0B2' }}>{item.clothing.code}</td>
                    <td style={{ padding: '8px 12px', fontWeight: '600', color: '#E65100', borderBottom: '1px solid #FFE0B2' }}>{item.clothing.name}</td>
                    <td style={{ padding: '8px 12px', color: '#666', borderBottom: '1px solid #FFE0B2' }}>{item.clothing.category}</td>
                    <td style={{ padding: '8px 12px', color: '#666', borderBottom: '1px solid #FFE0B2' }}>{item.clothing.size}</td>
                    <td style={{ padding: '8px 12px', color: '#666', borderBottom: '1px solid #FFE0B2' }}>{item.clothing.color}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#666', borderBottom: '1px solid #FFE0B2' }}>¥{item.clothing.purchasePrice.toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#f44336', fontWeight: '600', borderBottom: '1px solid #FFE0B2' }}>¥{item.clothing.sellingPrice.toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: '#FF9800', borderBottom: '1px solid #FFE0B2' }}>{item.quantity} 件</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#666', borderBottom: '1px solid #FFE0B2' }}>{lowStockThreshold} 件</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 缺货商品卡片 */}
      <div className="card" style={{
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
      onClick={() => setShowOutOfStockDetails(!showOutOfStockDetails)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              background: '#FFEBEE',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={24} color="#f44336" />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666' }}>缺货商品</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: '#f44336' }}>
                {outOfStockItems.length}
              </div>
            </div>
          </div>
          {showOutOfStockDetails ? <ChevronUp size={20} color="#f44336" /> : <ChevronDown size={20} color="#f44336" />}
        </div>
      </div>

      {/* 缺货商品详情 */}
      {showOutOfStockDetails && outOfStockItems.length > 0 && (
        <div className="card" style={{ marginTop: '24px', borderLeft: '4px solid #f44336' }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#D32F2F'
          }}>
            <AlertTriangle size={20} color="#f44336" />
            缺货商品详情 ({outOfStockItems.length} 个品类)
          </h2>
          
          <div style={{ 
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: '400px',
            borderRadius: '8px', 
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            width: '100%',
            position: 'relative'
          }}>
            <table className="table" style={{ minWidth: '800px', width: '100%' }}>
              <thead>
                <tr style={{ background: '#FFEBEE' }}>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#D32F2F', textAlign: 'left', borderBottom: '2px solid #FFCDD2' }}>服装编码</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#D32F2F', textAlign: 'left', borderBottom: '2px solid #FFCDD2' }}>服装名称</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#D32F2F', textAlign: 'left', borderBottom: '2px solid #FFCDD2' }}>品类</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#D32F2F', textAlign: 'left', borderBottom: '2px solid #FFCDD2' }}>尺码</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#D32F2F', textAlign: 'left', borderBottom: '2px solid #FFCDD2' }}>颜色</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#D32F2F', textAlign: 'right', borderBottom: '2px solid #FFCDD2' }}>进货价格</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#D32F2F', textAlign: 'right', borderBottom: '2px solid #FFCDD2' }}>销售价格</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', color: '#D32F2F', textAlign: 'right', borderBottom: '2px solid #FFCDD2' }}>库存状态</th>
                </tr>
              </thead>
              <tbody>
                {outOfStockItems
                  .sort((a, b) => a.clothing.code.localeCompare(b.clothing.code)) // 按服装编码排序
                  .map((item, index) => (
                  <tr key={item.id} style={{
                    transition: 'background-color 0.2s ease',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#FFEBEE'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFEBEE'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#FFEBEE'}>
                    <td style={{ padding: '8px 12px', fontWeight: '600', color: '#D32F2F', borderBottom: '1px solid #FFCDD2' }}>{item.clothing.code}</td>
                    <td style={{ padding: '8px 12px', fontWeight: '600', color: '#D32F2F', borderBottom: '1px solid #FFCDD2' }}>{item.clothing.name}</td>
                    <td style={{ padding: '8px 12px', color: '#666', borderBottom: '1px solid #FFCDD2' }}>{item.clothing.category}</td>
                    <td style={{ padding: '8px 12px', color: '#666', borderBottom: '1px solid #FFCDD2' }}>{item.clothing.size}</td>
                    <td style={{ padding: '8px 12px', color: '#666', borderBottom: '1px solid #FFCDD2' }}>{item.clothing.color}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#666', borderBottom: '1px solid #FFCDD2' }}>¥{item.clothing.purchasePrice.toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#f44336', fontWeight: '600', borderBottom: '1px solid #FFCDD2' }}>¥{item.clothing.sellingPrice.toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #FFCDD2' }}>
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: '#FFEBEE',
                        color: '#f44336',
                        display: 'inline-block'
                      }}>
                        缺货
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory
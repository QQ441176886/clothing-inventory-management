import React, { useState, useEffect } from 'react'
import { PackageMinus, Plus, Trash2, Calculator, RefreshCw } from 'lucide-react'
import { db, ClothingInventoryDB } from '../db/database'
import Alert from '../components/Alert'

// 工具函数
const getCurrentDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}





// 销售项目表单组件
const SaleItemForm = ({ item, index, onUpdate, onRemove, clothes, inventory, searchQuery, onSearchChange, filteredClothes }) => {
  const selectedClothing = clothes.find(c => c.id === parseInt(item.clothingId))
  const inventoryItem = inventory.find(inv => inv.clothingId === parseInt(item.clothingId))
  const availableQuantity = inventoryItem ? inventoryItem.quantity : 0
  
  // 确保searchQuery有默认值，避免undefined
  const currentSearchQuery = searchQuery || ''

  return (
    <div className="sale-item-form" style={{
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      background: 'white',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '16px',
        gap: '8px'
      }}>
        <span style={{ 
          fontWeight: '600', 
          fontSize: '16px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          color: '#333'
        }}>销售商品 {index + 1}</span>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          style={{
            padding: '8px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            flexShrink: 0,
            fontSize: '14px'
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="sale-item-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '16px'
      }}>
        <div className="form-group">
          <label className="form-label">选择服装 *</label>
          <select
            value={item.clothingId}
            onChange={(e) => onUpdate(item.id, 'clothingId', e.target.value)}
            className="form-input"
            style={{ 
              appearance: 'menulist',
              backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 4 5\"><path fill=\"%23666\" d=\"M2 0L0 2h4zm0 5L0 3h4z\"/></svg>")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
              backgroundSize: '8px 10px',
              paddingRight: '32px'
            }}
          >
            <option value="">请选择商品...</option>
            {clothes.map(clothing => {
              const invItem = inventory.find(inv => inv.clothingId === clothing.id)
              const stock = invItem ? invItem.quantity : 0
              return (
                <option 
                  key={clothing.id} 
                  value={clothing.id}
                  disabled={stock <= 0}
                >
                  {clothing.code} - {clothing.name} ({clothing.size}/{clothing.color}) - 库存: {stock}件
                </option>
              )
            })}
          </select>
          
          {/* 搜索框（可选功能） */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={currentSearchQuery}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase()
                  onSearchChange(item.id, value)
                }}
                onInput={(e) => {
                  const value = e.target.value.toUpperCase()
                  onSearchChange(item.id, value)
                }}
                onKeyUp={(e) => {
                  const value = e.target.value.toUpperCase()
                  onSearchChange(item.id, value)
                }}
                className="form-input"
                placeholder="快速搜索商品编码..."
                style={{ 
                  paddingRight: '40px',
                  fontSize: '14px',
                  height: '32px',
                  textTransform: 'uppercase'
                }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck="false"
              />
              {currentSearchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange(item.id, '')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#999',
                    fontSize: '16px'
                  }}
                >
                  ×
                </button>
              )}
            </div>
            
            {/* 搜索结果下拉框 */}
            {currentSearchQuery && (
              <div style={{
                position: 'relative',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderTop: 'none',
                borderRadius: '0 0 4px 4px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                maxHeight: '120px',
                overflowY: 'auto',
                marginTop: '-1px'
              }}>
                {filteredClothes.length > 0 ? (
                  filteredClothes.map(clothing => (
                    <div
                      key={clothing.id}
                      onClick={() => {
                        onUpdate(item.id, 'clothingId', clothing.id.toString());
                        onSearchChange(item.id, '');
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f3f4f6',
                        fontSize: '14px'
                      }}
                    >
                      <div style={{ fontWeight: '500' }}>{clothing.code}</div>
                      <div style={{ color: '#6b7280', fontSize: '12px' }}>{clothing.name} ({clothing.size}/{clothing.color})</div>
                      <div style={{ color: '#059669', fontSize: '12px' }}>库存: {inventory.find(inv => inv.clothingId === clothing.id)?.quantity || 0} 件</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>未找到匹配的商品</div>
                )}
              </div>
            )}
          </div>
          
          {/* 显示已选择的商品 */}
          {item.clothingId && selectedClothing && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>
                {selectedClothing.code} - {selectedClothing.name}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                尺码: {selectedClothing.size} | 颜色: {selectedClothing.color} | 库存: {availableQuantity}
              </div>
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label className="form-label">销售数量 *</label>
          <input
            type="number"
            min="1"
            max={availableQuantity}
            required
            value={item.quantity}
            onChange={(e) => onUpdate(item.id, 'quantity', e.target.value)}
            className="form-input"
            placeholder="1"
            style={{
              fontSize: '16px', // 防止iOS缩放
              minHeight: '44px', // 触摸友好高度
              padding: '12px'
            }}
          />
          <div style={{ 
            fontSize: '14px', 
            color: '#666', 
            marginTop: '8px',
            padding: '4px 0'
          }}>
            可用库存: <span style={{ fontWeight: '600', color: '#4CAF50' }}>{availableQuantity}</span> 件
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">销售价格 *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={item.sellingPrice}
            onChange={(e) => onUpdate(item.id, 'sellingPrice', e.target.value)}
            className="form-input"
            placeholder="0.00"
            style={{
              fontSize: '16px', // 防止iOS缩放
              minHeight: '44px', // 触摸友好高度
              padding: '12px'
            }}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">小计</label>
          <div style={{
            padding: '16px',
            background: '#E8F5E8',
            borderRadius: '8px',
            fontWeight: '600',
            color: '#4CAF50',
            fontSize: '18px',
            textAlign: 'center',
            border: '2px solid #C8E6C9'
          }}>
            ¥{(item.quantity * item.sellingPrice).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  )
}

const StockOut = ({ refreshStats }) => {
  // 状态管理
  const [clothes, setClothes] = useState([])
  const [inventory, setInventory] = useState([])
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('success')
  
  // 搜索状态
  const [searchQueries, setSearchQueries] = useState({})
  
  // 销售项目状态
  const [saleItems, setSaleItems] = useState([{
    id: Date.now(),
    clothingId: '',
    quantity: 1,
    sellingPrice: 0,
    availableQuantity: 0
  }])
  
  // 表单数据
  const [formData, setFormData] = useState({
    date: getCurrentDateTime(),
    operator: '店长-符文静',
    notes: ''
  })
  
  // 移动设备检测
  const [isMobile, setIsMobile] = useState(false)
  
  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // 数据加载
  useEffect(() => {
    // 添加组件挂载状态检查
    let isMounted = true;
    
    // 检查浏览器存储是否可用
    const checkStorageAvailability = () => {
      try {
        localStorage.setItem('test_storage', 'test');
        localStorage.removeItem('test_storage');
        return true;
      } catch (e) {
        console.error('浏览器存储不可用:', e);
        return false;
      }
    };
    
    const loadData = async () => {
      try {
        console.log('开始加载数据...');
        
        // 先检查浏览器存储是否可用
        if (!checkStorageAvailability()) {
          throw new Error('浏览器存储不可用，请检查隐私设置');
        }
        
        // 先检查数据库是否可用
        if (!db || typeof db !== 'object') {
          throw new Error('数据库实例不可用');
        }
        
        // 尝试直接初始化数据库
        try {
          await db.initialize();
        } catch (initError) {
          console.warn('数据库初始化失败（可能已初始化）:', initError);
        }
        
        // 使用Promise.all并行获取数据，但添加超时处理
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('数据加载超时')), 10000);
        });
        
        const [allClothes, allInventory] = await Promise.race([
          Promise.all([
            db.clothes.toArray().catch(err => {
              console.error('获取服装数据失败:', err);
              throw err;
            }),
            db.inventory.toArray().catch(err => {
              console.error('获取库存数据失败:', err);
              throw err;
            })
          ]),
          timeoutPromise
        ]);
        
        console.log('数据加载成功，服装数量:', allClothes.length, '库存数量:', allInventory.length);
        
        // 只有在组件挂载时才更新状态
        if (isMounted) {
          setClothes(allClothes);
          setInventory(allInventory);
        }
      } catch (error) {
        console.error('数据加载失败详细信息:', error.name, error.message, error.stack);
        
        // 只有在组件挂载时才显示错误
        if (isMounted) {
          // 根据错误类型提供更具体的提示
          let errorMessage = `数据加载失败: ${error.message}`;
          
          if (error.message.includes('QuotaExceededError')) {
            errorMessage = '存储空间已满，请清除浏览器缓存后重试';
          } else if (error.message.includes('Timeout') || error.message.includes('timeout')) {
            errorMessage = '数据加载超时，请检查网络连接后重试';
          }
          
          setAlertMessage(errorMessage);
          setAlertType('error');
          
          // 尝试重建数据库作为最后的手段
          try {
            console.log('尝试重建数据库...');
            if (typeof ClothingInventoryDB !== 'undefined' && typeof ClothingInventoryDB.recreateDatabase === 'function') {
              const newDb = await ClothingInventoryDB.recreateDatabase();
              console.log('数据库重建成功，重新加载数据...');
              
              // 使用新数据库重新加载数据
              const [newClothes, newInventory] = await Promise.all([
                newDb.clothes.toArray(),
                newDb.inventory.toArray()
              ]);
              
              if (isMounted) {
                setClothes(newClothes);
                setInventory(newInventory);
                setAlertMessage('数据库已重建，数据加载成功');
                setAlertType('success');
              }
            }
          } catch (retryError) {
            console.error('数据库重建失败:', retryError);
            if (isMounted) {
              setAlertMessage('数据库重建失败，请清除浏览器缓存后重新访问');
              setAlertType('error');
            }
          }
        }
      }
    };
    
    // 延迟执行，给数据库初始化一点时间
    const timeoutId = setTimeout(() => {
      loadData();
    }, 100);
    
    // 清理函数，标记组件已卸载
    return () => {
      clearTimeout(timeoutId);
      isMounted = false;
    };
  }, [])



  // 搜索相关函数
  const handleSearchChange = (itemId, query) => {
    setSearchQueries(prev => ({
      ...prev,
      [itemId]: query
    }))
  }

  // 根据搜索查询过滤商品
  const getFilteredClothes = (itemId) => {
    const query = searchQueries[itemId] || ''
    
    if (!query.trim()) {
      return clothes
    }
    
    // 确保无论用户输入大小写，都能正确匹配
    const normalizedQuery = query.toLowerCase()
    return clothes.filter(clothing => 
      clothing && clothing.code && clothing.code.toLowerCase().includes(normalizedQuery)
    )
  }

  // 添加销售项目
  const addSaleItem = () => {
    const newItemId = Date.now()
    setSaleItems([...saleItems, {
      id: newItemId,
      clothingId: '',
      quantity: 1,
      sellingPrice: 0,
      availableQuantity: 0
    }])
    
    // 初始化搜索查询
    setSearchQueries(prev => ({
      ...prev,
      [newItemId]: ''
    }))
  }

  // 更新销售项目
  const updateSaleItem = (id, field, value) => {
    const updatedItems = saleItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        
        if (field === 'clothingId' && value) {
          const selectedClothing = clothes.find(c => c.id === parseInt(value))
          const inventoryItem = inventory.find(inv => inv.clothingId === parseInt(value))
          
          if (selectedClothing) {
            updatedItem.sellingPrice = Math.round(selectedClothing.sellingPrice * 100) / 100
            updatedItem.availableQuantity = inventoryItem ? inventoryItem.quantity : 0
          }
        }
        
        if (field === 'sellingPrice') {
          updatedItem.sellingPrice = Math.round(parseFloat(value) * 100) / 100
        }
        
        return updatedItem
      }
      return item
    })
    
    setSaleItems(updatedItems)
  }

  // 移除销售项目
  const removeSaleItem = (id) => {
    setSaleItems(saleItems.filter(item => item.id !== id))
  }

  // 计算总金额
  const calculateTotalAmount = () => {
    const total = saleItems.reduce((sum, item) => {
      return sum + (item.quantity * item.sellingPrice)
    }, 0)
    return Math.round(total * 100) / 100
  }

  // 表单提交
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 验证数据
    const invalidItems = saleItems.filter(item => 
      !item.clothingId || item.quantity <= 0 || item.sellingPrice <= 0
    )
    
    if (invalidItems.length > 0) {
      setAlertMessage('请完善所有销售项目的服装、数量和销售价格信息')
      setAlertType('error')
      return
    }

    // 检查库存
    const insufficientStock = saleItems.filter(item => item.quantity > item.availableQuantity)
    if (insufficientStock.length > 0) {
      const itemNames = insufficientStock.map(item => {
        const clothing = clothes.find(c => c.id === parseInt(item.clothingId))
        return clothing ? clothing.name : '未知服装'
      })
      setAlertMessage(`以下服装库存不足：${itemNames.join(', ')}`)
      setAlertType('error')
      return
    }

    try {
      for (const item of saleItems) {
        const clothing = clothes.find(c => c.id === parseInt(item.clothingId))
        const totalAmount = parseFloat((item.quantity * item.sellingPrice).toFixed(2))
        
        // 添加出库记录（包含码数和颜色信息）
        await db.stockOut.add({
          clothingId: parseInt(item.clothingId),
          quantity: parseInt(item.quantity),
          sellingPrice: Math.round(parseFloat(item.sellingPrice) * 100) / 100,
          totalAmount: totalAmount,
          date: formData.date,
          operator: formData.operator || '未知操作员',
          notes: formData.notes || '',
          size: clothing ? clothing.size : '', // 添加码数信息
          color: clothing ? clothing.color : '', // 添加颜色信息
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        // 更新库存
        const existingInventory = await db.inventory
          .where('clothingId')
          .equals(parseInt(item.clothingId))
          .first()
        
        if (existingInventory) {
          await db.inventory.update(existingInventory.id, {
            quantity: existingInventory.quantity - parseInt(item.quantity),
            updatedAt: new Date()
          })
        }
      }
      
      // 成功处理
      const totalAmount = calculateTotalAmount()
      setAlertMessage(`销售操作成功完成！销售总额：¥${totalAmount.toFixed(2)}`)
      setAlertType('success')
      
      // 重置表单
      setSaleItems([{
        id: Date.now(),
        clothingId: '',
        quantity: 1,
        sellingPrice: 0,
        availableQuantity: 0
      }])
      setFormData({
        date: getCurrentDateTime(),
        operator: formData.operator,
        notes: ''
      })
      
      // 刷新统计数据
      if (typeof refreshStats === 'function') {
        refreshStats()
      }
      
    } catch (error) {
      console.error('销售操作失败:', error)
      setAlertMessage('销售操作失败，请重试')
      setAlertType('error')
    }
  }



  return (
    <div className="container" style={{
      maxWidth: '100%',
      padding: isMobile ? '16px' : '24px',
      margin: '0 auto',
      paddingBottom: isMobile ? '80px' : '24px'
    }}>
      <Alert
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertMessage('')}
      />
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isMobile ? '20px' : '24px',
        flexWrap: 'wrap',
        gap: isMobile ? '12px' : '16px',
        padding: isMobile ? '0' : '0'
      }}>
        <h1 className="text-xl font-semibold" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '8px' : '12px',
          fontSize: isMobile ? '20px' : '24px',
          margin: 0,
          color: '#333'
        }}>
          <PackageMinus size={isMobile ? 24 : 28} />
          出库管理
        </h1>
      </div>

      {/* 商品选择器 */}
      {/* 销售表单 */}
      <div className="card" style={{ 
        marginBottom: isMobile ? '20px' : '24px',
        padding: isMobile ? '20px' : '24px',
        borderRadius: isMobile ? '12px' : '8px',
        background: 'white',
        boxShadow: isMobile ? '0 4px 12px rgba(0, 0, 0, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ 
          fontSize: isMobile ? '18px' : '20px', 
          fontWeight: '600', 
          marginBottom: isMobile ? '20px' : '24px',
          color: '#333'
        }}>
          销售记录
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* 基本信息 */}
          <div className="basic-info-mobile" style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '16px' : '20px',
            marginBottom: isMobile ? '20px' : '24px'
          }}>
            <div className="form-group">
              <label className="form-label" style={{
                fontSize: isMobile ? '14px' : '16px',
                marginBottom: isMobile ? '8px' : '12px'
              }}>销售日期时间 *</label>
              <input
                type="datetime-local"
                required
                value={formData.date.replace(' ', 'T')}
                onChange={(e) => setFormData({...formData, date: e.target.value.replace('T', ' ')})}
                className="form-input"
                style={{
                  fontSize: '16px',
                  minHeight: isMobile ? '44px' : '40px',
                  padding: isMobile ? '12px' : '10px'
                }}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{
                fontSize: isMobile ? '14px' : '16px',
                marginBottom: isMobile ? '8px' : '12px'
              }}>操作员 *</label>
              <input
                type="text"
                required
                value={formData.operator}
                onChange={(e) => setFormData({...formData, operator: e.target.value})}
                className="form-input"
                placeholder="输入操作员姓名"
                style={{
                  fontSize: '16px',
                  minHeight: isMobile ? '44px' : '40px',
                  padding: isMobile ? '12px' : '10px'
                }}
              />
            </div>
          </div>

          {/* 销售项目 */}
          <div style={{ marginBottom: isMobile ? '20px' : '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: isMobile ? '16px' : '20px',
              padding: isMobile ? '0' : '0',
              flexWrap: 'nowrap',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={addSaleItem}
                className="btn btn-primary"
                style={{ 
                  minHeight: isMobile ? '32px' : '28px', 
                  padding: isMobile ? '6px 12px' : '4px 10px',
                  fontSize: isMobile ? '12px' : '11px',
                  whiteSpace: 'nowrap',
                  maxWidth: isMobile ? '90px' : '80px',
                  minWidth: isMobile ? '90px' : '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  flexShrink: 0
                }}
              >
                添加商品
              </button>
            </div>

            {saleItems.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#666',
                border: '2px dashed #e0e0e0',
                borderRadius: '8px'
              }}>
                <PackageMinus size={32} color="#ccc" style={{ marginBottom: '16px' }} />
                <p>暂无销售商品</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  点击"添加"按钮开始添加销售服装
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {saleItems.map((item, index) => (
                  <SaleItemForm
                    key={item.id}
                    item={item}
                    index={index}
                    onUpdate={updateSaleItem}
                    onRemove={removeSaleItem}
                    clothes={clothes}
                    inventory={inventory}
                    searchQuery={searchQueries[item.id] || ''}
                    onSearchChange={handleSearchChange}
                    filteredClothes={getFilteredClothes(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 金额统计 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? '16px' : '20px',
            marginBottom: isMobile ? '20px' : '24px'
          }}>
            <div className="form-group">
              <label className="form-label" style={{
                fontSize: isMobile ? '14px' : '16px',
                marginBottom: isMobile ? '8px' : '12px'
              }}>销售总额</label>
              <div style={{
                padding: isMobile ? '16px' : '12px',
                background: '#E8F5E8',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: isMobile ? '20px' : '18px',
                color: '#4CAF50',
                textAlign: 'center',
                border: '2px solid #C8E6C9'
              }}>
                ¥{calculateTotalAmount().toFixed(2)}
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{
                fontSize: isMobile ? '14px' : '16px',
                marginBottom: isMobile ? '8px' : '12px'
              }}>备注</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="form-input"
                placeholder="可选的备注信息"
                rows="3"
                style={{ 
                  minHeight: isMobile ? '100px' : '80px', 
                  resize: 'vertical',
                  fontSize: '16px',
                  padding: isMobile ? '12px' : '10px'
                }}
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="action-buttons-mobile" style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr',
            gap: isMobile ? '12px' : '16px',
            marginBottom: isMobile ? '60px' : '0px'  // 增加额外的底部边距，避免被底部导航遮挡
          }}>
            <button 
              type="submit"
              disabled={saleItems.length === 0 || saleItems.every(item => !item.clothingId)}
              className="btn btn-success"
              style={{ 
                minHeight: isMobile ? '44px' : '40px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: isMobile ? '6px' : '4px',
                fontSize: isMobile ? '13px' : '12px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: saleItems.length === 0 || saleItems.every(item => !item.clothingId) ? 'not-allowed' : 'pointer',
                opacity: saleItems.length === 0 || saleItems.every(item => !item.clothingId) ? 0.6 : 1,
                fontWeight: '600',
                padding: isMobile ? '8px 10px' : '6px 8px',
                whiteSpace: 'nowrap'
              }}
            >
              <Calculator size={isMobile ? 14 : 12} />
              {isMobile ? `销售 ¥${calculateTotalAmount().toFixed(2)}` : `确认销售 (¥${calculateTotalAmount().toFixed(2)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default StockOut
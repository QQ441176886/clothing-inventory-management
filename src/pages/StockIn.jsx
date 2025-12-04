import React, { useState, useEffect } from 'react'
import { PackagePlus, Shirt } from 'lucide-react'
import { db } from '../db/database'
import Alert from '../components/Alert'



const StockIn = ({ refreshStats }) => {
  const [clothes, setClothes] = useState([])
  // 使用getCurrentDateTime函数获取当前日期和时间，确保准确性
  const getCurrentDateTime = () => {
    const now = new Date()
    // 使用本地日期时间格式化，避免时区偏差
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
  const [formData, setFormData] = useState({
    date: getCurrentDateTime(),
    operator: '财务-符冬梅',
    notes: ''
  })
  // 页面加载时更新日期时间，确保即使组件被缓存也能获取最新日期时间
  useEffect(() => {
    setFormData(prev => ({ ...prev, date: getCurrentDateTime() }))
  }, [])
  
  // 自定义弹窗状态
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('success')
  // 新增服装相关状态 - 默认显示表单
  const [showAddClothingForm, setShowAddClothingForm] = useState(true)
  const [addClothingFormData, setAddClothingFormData] = useState({
    code: '',
    name: '',
    category: '',
    categoryCustom: '',
    purchasePrice: '',
    sellingPrice: '',
    remark: ''
  })
  
  // 多颜色多尺码选择状态
  const [selectedSizes, setSelectedSizes] = useState([])
  const [selectedColors, setSelectedColors] = useState([])
  const [customColorInput, setCustomColorInput] = useState('')
  const [quantityMatrix, setQuantityMatrix] = useState({}) // 存储每种颜色+尺码组合的数量
  const [addedItems, setAddedItems] = useState([]) // 存储已添加的商品详情

  // 监听颜色和尺码选择变化，自动更新数量矩阵
  useEffect(() => {
    // 保留已有的数量数据，只添加新的颜色-尺码组合
    const updatedMatrix = { ...quantityMatrix }
    
    // 为每个颜色-尺码组合确保有一个键存在
    for (const color of selectedColors) {
      for (const size of selectedSizes) {
        const key = `${color}-${size}`
        if (updatedMatrix[key] === undefined) {
          updatedMatrix[key] = '' // 新组合默认为空
        }
      }
    }
    
    // 移除不再存在的颜色-尺码组合
    for (const key in updatedMatrix) {
      const [color, size] = key.split('-')
      if (!selectedColors.includes(color) || !selectedSizes.includes(size)) {
        delete updatedMatrix[key]
      }
    }
    
    setQuantityMatrix(updatedMatrix)
  }, [selectedColors, selectedSizes])

  useEffect(() => {
    loadClothes()
  }, [])

  const loadClothes = async () => {
    try {
      const allClothes = await db.clothes.toArray()
      setClothes(allClothes)
    } catch (error) {
      console.error('加载服装数据失败:', error)
    }
  }
  
  // 新增服装的尺码、颜色、品类常量
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '均码']
  // 按字数排序颜色：先显示两个字的颜色，再显示三个字的颜色
  const colors = [
    // 两个字的颜色
    '黑色', '白色', '红色', '蓝色', '绿色', '黄色', '紫色', '灰色', '棕色', '粉色', '橙色', '青色', '驼色', '米色',
    // 三个字的颜色
    '卡其色', '米白色', '香槟色', '珊瑚色', '薄荷绿', '雾霾蓝', '砖红色', '浅紫色', '鹅黄色', '奶茶色', '烟灰色'
  ]
  const categories = ['连衣裙', '上衣', 'T恤', '衬衫', '卫衣', '毛衣', '外套', '牛仔裤', '休闲裤', '短裙', '长裙', '半身裙', '短裤', '阔腿裤', '西装裤', '运动裤', '针织衫', '背心', '吊带裙', '背带裤']
  
  // 重置新增服装表单 - 只重置数据，不隐藏表单
  const resetAddClothingForm = () => {
    setAddClothingFormData({
      code: '',
      name: '',
      category: '',
      categoryCustom: '',
      purchasePrice: '',
      sellingPrice: '',
      remark: ''
    })
    // 重置多颜色多尺码相关状态
    setSelectedSizes([])
    setSelectedColors([])
    setCustomColorInput('')
    setQuantityMatrix({})
  }
  
  // 提交新增服装表单并直接入库
  const handleAddClothingSubmit = async (e) => {
    e.preventDefault()
    try {
      // 验证颜色和尺码是否选择
      if (selectedColors.length === 0) {
        alert('请至少选择一种颜色')
        return
      }
      if (selectedSizes.length === 0) {
        alert('请至少选择一种尺码')
        return
      }
      
      // 验证是否至少有一个数量大于0
      let hasValidQuantity = false
      for (const color of selectedColors) {
        for (const size of selectedSizes) {
          const key = `${color}-${size}`
          const quantity = quantityMatrix[key]
          if (quantity && quantity > 0) {
            hasValidQuantity = true
            break
          }
        }
        if (hasValidQuantity) break
      }
      
      if (!hasValidQuantity) {
        alert('请至少为一种颜色和尺码的组合输入大于0的数量')
        return
      }
      
      // 处理自定义品类
      const finalCategory = (addClothingFormData.category === '其他' && addClothingFormData.categoryCustom) ? addClothingFormData.categoryCustom : addClothingFormData.category
      
      // 新增服装，确保价格精度
      const purchasePrice = Math.round(parseFloat(addClothingFormData.purchasePrice) * 100) / 100
      const sellingPrice = Math.round(parseFloat(addClothingFormData.sellingPrice) * 100) / 100
      
      // 批量处理每种颜色和尺码的组合
      for (const color of selectedColors) {
        for (const size of selectedSizes) {
          const key = `${color}-${size}`
          const quantity = quantityMatrix[key]
          
          if (!quantity || quantity <= 0) continue
          
          try {
            // 检查相同颜色和尺码的服装是否已经存在
            const existingClothing = await db.clothes.where({
              code: addClothingFormData.code,
              color: color,
              size: size
            }).first()
            
            let clothingId, isNewClothing = false
            
            if (existingClothing) {
              // 服装已存在，更新价格信息
              clothingId = existingClothing.id
              await db.clothes.update(clothingId, {
                purchasePrice: purchasePrice,
                sellingPrice: sellingPrice,
                updatedAt: new Date()
              })
              
              // 更新库存 - 使用modify确保原子操作
              await db.inventory
                .where('clothingId')
                .equals(clothingId)
                .modify(inventory => {
                  inventory.quantity += quantity;
                  inventory.updatedAt = new Date();
                })
                .then(updated => {
                  if (updated === 0) {
                    // 如果没有找到库存记录，创建新的
                    return db.inventory.add({
                      clothingId: clothingId,
                      quantity: quantity,
                      updatedAt: new Date()
                    });
                  }
                });
            } else {
              // 创建新的服装记录
              clothingId = await db.clothes.add({
                ...addClothingFormData,
                color: color,
                size: size,
                category: finalCategory,
                purchasePrice: purchasePrice,
                sellingPrice: sellingPrice,
                createdAt: new Date(),
                updatedAt: new Date()
              })
              
              // 初始化库存
              await db.inventory.add({
                clothingId: clothingId,
                quantity: quantity,
                updatedAt: new Date()
              })
              
              isNewClothing = true
            }
            
            const totalAmount = Math.round(purchasePrice * quantity * 100) / 100
            
            // 添加入库记录
            await db.stockIn.add({
              clothingId: clothingId,
              quantity: quantity,
              purchasePrice: purchasePrice,
              totalAmount: totalAmount,
              date: formData.date,
              operator: formData.operator,
              notes: addClothingFormData.remark,
              size: size,
              color: color,
              createdAt: new Date()
            })
            
            // 记录已添加的商品详情
            setAddedItems(prev => [...prev, {
              clothingId: clothingId,
              code: addClothingFormData.code,
              name: addClothingFormData.name,
              color: color,
              size: size,
              quantity: quantity
            }])
            
          } catch (itemError) {
            console.error(`处理颜色 ${color} 和尺码 ${size} 时出错:`, itemError)
            // 继续处理其他组合，不中断整个批量操作
          }
        }
      }
      
      // 重新加载服装数据
      loadClothes()
      
      // 重置表单
      setAddClothingFormData({
        code: '',
        name: '',
        category: '',
        categoryCustom: '',
        purchasePrice: '',
        sellingPrice: '',
        remark: ''
      })
      setSelectedSizes([])
      setSelectedColors([])
      setCustomColorInput('')
      setQuantityMatrix({})
      
      setAlertMessage('服装批量添加并入库成功！')
      setAlertType('success')
      refreshStats()
    } catch (error) {
      console.error('批量入库失败:', error)
      setAlertMessage('批量入库失败，请重试')
      setAlertType('error')
    }
  }

  return (
    <div className="container">
      <Alert
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertMessage('')}
      />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h1 className="text-xl font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PackagePlus size={24} />
          入库管理
        </h1>
      </div>

      {/* 入库表单 */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '24px'
        }}>
          新增入库记录
        </h2>
        
        <div>
          {/* 基本信息 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div className="form-group">
              <label className="form-label" htmlFor="stockInDate">入库日期时间 *</label>
              <input
                type="datetime-local"
                id="stockInDate"
                name="stockInDate"
                required
                value={formData.date.replace(' ', 'T')}
                onChange={(e) => setFormData({...formData, date: e.target.value.replace('T', ' ')})}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="operator">操作员 *</label>
              <input
                type="text"
                id="operator"
                name="operator"
                required
                value={formData.operator}
                onChange={(e) => setFormData({...formData, operator: e.target.value})}
                className="form-input"
                placeholder="输入操作员姓名"
              />
            </div>
          </div>



          {/* 新增服装表单 */}
          {showAddClothingForm && (
            <div className="card" style={{ marginBottom: '24px', background: '#f8f9fa' }}>
              <h2 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                marginBottom: '24px'
              }}>
                <Shirt size={18} style={{ marginRight: '8px' }} />
                新增服装
              </h2>
              
              <form onSubmit={handleAddClothingSubmit}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="clothingCode">服装编码 *</label>
                    <input
                      type="text"
                      id="clothingCode"
                      name="clothingCode"
                      required
                      value={addClothingFormData.code}
                      onChange={(e) => setAddClothingFormData({...addClothingFormData, code: e.target.value})}
                      className="form-input"
                      placeholder="如：F001"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label" htmlFor="clothingName">服装名称 *</label>
                    <input
                      type="text"
                      id="clothingName"
                      name="clothingName"
                      required
                      value={addClothingFormData.name}
                      onChange={(e) => setAddClothingFormData({...addClothingFormData, name: e.target.value})}
                      className="form-input"
                      placeholder="如：男士T恤"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label" htmlFor="category">品类 *</label>
                    <select
                      id="category"
                      name="category"
                      required
                      value={addClothingFormData.category}
                      onChange={(e) => setAddClothingFormData({...addClothingFormData, category: e.target.value})}
                      className="form-input"
                    >
                      <option value="">选择品类</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                      <option value="其他">其他</option>
                    </select>
                    {addClothingFormData.category === '其他' && (
                      <div>
                        <label className="form-label" htmlFor="categoryCustom" style={{ fontSize: '14px', marginTop: '8px', display: 'block' }}>自定义品类 *</label>
                        <input
                          type="text"
                          id="categoryCustom"
                          name="categoryCustom"
                          className="form-input"
                          value={addClothingFormData.categoryCustom}
                          onChange={(e) => setAddClothingFormData({...addClothingFormData, categoryCustom: e.target.value})}
                          placeholder="手动输入品类名称"
                          required={addClothingFormData.category === '其他'}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label" htmlFor="purchasePrice">进货价格 *</label>
                    <input
                      type="number"
                      step="0.01"
                      id="purchasePrice"
                      name="purchasePrice"
                      required
                      value={addClothingFormData.purchasePrice}
                      onChange={(e) => {
                        // 在输入时就确保精度正确
                        const value = e.target.value
                        const roundedValue = value ? (Math.round(parseFloat(value) * 100) / 100).toString() : ''
                        setAddClothingFormData({...addClothingFormData, purchasePrice: roundedValue})
                      }}
                      onWheel={(e) => e.target.blur()}
                      className="form-input"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label" htmlFor="sellingPrice">销售价格 *</label>
                    <input
                      type="number"
                      step="0.01"
                      id="sellingPrice"
                      name="sellingPrice"
                      required
                      value={addClothingFormData.sellingPrice}
                      onChange={(e) => {
                        // 在输入时就确保精度正确
                        const value = e.target.value
                        const roundedValue = value ? (Math.round(parseFloat(value) * 100) / 100).toString() : ''
                        setAddClothingFormData({...addClothingFormData, sellingPrice: roundedValue})
                      }}
                      onWheel={(e) => e.target.blur()}
                      className="form-input"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">尺码 *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {sizes.map(size => (
                        <label key={size} htmlFor={`size-${size}`} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: selectedSizes.includes(size) ? '#3b82f6' : 'white',
                          color: selectedSizes.includes(size) ? 'white' : 'black',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          minWidth: size === 'XXXL' ? '100px' : '80px'
                        }}>
                          <input
                            type="checkbox"
                            id={`size-${size}`}
                            name={`size-${size}`}
                            value={size}
                            checked={selectedSizes.includes(size)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSizes([...selectedSizes, size])
                              } else {
                                setSelectedSizes(selectedSizes.filter(s => s !== size))
                              }
                            }}
                            style={{ margin: 0 }}
                          />
                          {size}
                        </label>
                      ))}
                    </div>
                  </div>
                  

                  
                  <div className="form-group">
                    <label className="form-label">颜色 *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                      {colors.map(color => (
                        <label key={color} htmlFor={`color-${color}`} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: selectedColors.includes(color) ? '#3b82f6' : 'white',
                          color: selectedColors.includes(color) ? 'white' : 'black',
                          fontSize: color.length === 3 ? '12px' : '14px', // 三个字的颜色使用更小的字体
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          minWidth: '70px'
                        }}>
                          <input
                            type="checkbox"
                            id={`color-${color}`}
                            name={`color-${color}`}
                            value={color}
                            checked={selectedColors.includes(color)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedColors([...selectedColors, color])
                              } else {
                                setSelectedColors(selectedColors.filter(c => c !== color))
                              }
                            }}
                            style={{ margin: 0 }}
                          />
                          {color}
                        </label>
                      ))}
                    </div>
                    <div style={{ display: 'block' }}>
                      <label className="form-label" htmlFor="customColorInput" style={{ marginBottom: '8px', display: 'block' }}>添加自定义颜色：</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          id="customColorInput"
                          name="customColorInput"
                          className="form-input"
                          value={customColorInput}
                          onChange={(e) => setCustomColorInput(e.target.value)}
                          placeholder="自定义颜色"
                        />
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            if (customColorInput && !selectedColors.includes(customColorInput)) {
                              setSelectedColors([...selectedColors, customColorInput])
                              setCustomColorInput('')
                            }
                          }}
                          style={{ minHeight: '44px' }}
                        >
                          添加
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">数量设置 *</label>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'auto repeat(auto-fit, minmax(80px, 1fr))', 
                      gap: '8px',
                      alignItems: 'center',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      {/* 表格头部 */}
                      <div style={{ 
                        backgroundColor: '#f8f9fa', 
                        fontWeight: '600',
                        padding: '12px 8px',
                        borderBottom: '1px solid #e0e0e0'
                      }}>
                        颜色\尺码
                      </div>
                      
                      {/* 表格内容 */}
                      {selectedColors.length > 0 ? (
                        selectedColors.map((color, colorIndex) => (
                          <React.Fragment key={color}>
                            {/* 颜色名称 */}
                            <div style={{ 
                              fontWeight: '500',
                              padding: '12px 8px',
                              backgroundColor: colorIndex % 2 === 0 ? '#ffffff' : '#fafafa',
                              borderRight: '1px solid #e0e0e0'
                            }}>
                              {color}
                            </div>
                            
                            {/* 每个尺码对应的数量输入 */}
                            {selectedSizes.length > 0 ? (
                              selectedSizes.map((size, sizeIndex) => {
                                const key = `${color}-${size}`
                                return (
                                  <div 
                                    key={key} 
                                    style={{ 
                                      padding: '8px',
                                      backgroundColor: colorIndex % 2 === 0 ? '#ffffff' : '#fafafa',
                                      borderBottom: sizeIndex === selectedSizes.length - 1 ? 'none' : '1px solid #e0e0e0'
                                    }}
                                  >
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        id={`quantity-${color}-${size}`}
                                        name={`quantity-${color}-${size}`}
                                        value={quantityMatrix[key] || ''}
                                        onChange={(e) => {
                                          const value = e.target.value ? parseInt(e.target.value) : ''
                                          setQuantityMatrix(prev => ({
                                            ...prev,
                                            [key]: value
                                          }))
                                        }}
                                        onWheel={(e) => e.target.blur()}
                                        className="form-input"
                                        placeholder={`${size}码数量`}
                                        style={{ 
                                          textAlign: 'center',
                                          margin: 0,
                                          border: '1px solid #d0d0d0',
                                          borderRadius: '4px'
                                        }}
                                      />
                                  </div>
                                )
                              })
                            ) : (
                              <div style={{ 
                                gridColumn: '2 / -1',
                                padding: '40px 20px', 
                                textAlign: 'center', 
                                backgroundColor: '#f8f9fa',
                                color: '#6c757d',
                                fontStyle: 'italic'
                              }}>
                                请选择尺码以添加数量
                              </div>
                            )}
                          </React.Fragment>
                        ))
                      ) : (
                        <div style={{ 
                          gridColumn: '1 / -1',
                          padding: '40px 20px', 
                          textAlign: 'center', 
                          backgroundColor: '#f8f9fa',
                          color: '#6c757d',
                          fontStyle: 'italic'
                        }}>
                          请先选择颜色和尺码以设置数量
                        </div>
                      )}
                    </div>
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '14px', 
                      color: '#6c757d'
                    }}>
                      提示：选择颜色和尺码后，在对应单元格中输入数量，然后点击"保存并入库"
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label" htmlFor="remark">备注</label>
                    <textarea
                      id="remark"
                      name="remark"
                      value={addClothingFormData.remark}
                      onChange={(e) => setAddClothingFormData({...addClothingFormData, remark: e.target.value})}
                      className="form-input"
                      placeholder="添加备注信息"
                      rows="2"
                    />
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit"
                    className="btn btn-primary"
                    style={{ minHeight: '44px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <PackagePlus size={16} />
                    保存并入库
                  </button>
                </div>
              </form>
              
              {/* 已添加商品详情展示区域 */}
              {addedItems.length > 0 && (
                <div style={{ marginTop: '24px', padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>已添加的商品详情：</h3>
                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                    {addedItems.map((item, index) => (
                      <li key={item.clothingId || index} style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #f0f0f0' }}>
                        {item.color}，{item.size}，数量{item.quantity}
                        {item.clothingId && <span style={{ marginLeft: '8px', color: '#666', fontSize: '14px' }}>（ID：{item.clothingId}）</span>}
                        {item.code && <span style={{ marginLeft: '8px', color: '#666', fontSize: '14px' }}>（编码：{item.code}）</span>}
                        {item.name && <span style={{ marginLeft: '8px', color: '#666', fontSize: '14px' }}>（名称：{item.name}）</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StockIn
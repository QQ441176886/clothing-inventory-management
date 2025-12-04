import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../components/Alert';
import { db } from '../db/database';

const ClothingManagement = ({ refreshStats }) => {
  const [clothes, setClothes] = useState([]);
  const [filteredClothes, setFilteredClothes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentClothing, setCurrentClothing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [isClient, setIsClient] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(1); // 默认值
  const navigate = useNavigate();

  // 从数据库加载服装数据
  const loadClothes = async () => {
    try {
      // 先获取所有服装数据
      const allClothes = await db.clothes.toArray();
      
      // 获取所有库存数据
      let allInventory = await db.inventory.toArray();
      
      // 检查并为没有库存记录的服装创建库存记录
      const clothingIdsWithInventory = new Set(allInventory.map(inv => inv.clothingId));
      const clothesWithoutInventory = allClothes.filter(clothing => !clothingIdsWithInventory.has(clothing.id));
      
      if (clothesWithoutInventory.length > 0) {
        console.log(`发现 ${clothesWithoutInventory.length} 个服装没有库存记录，正在创建...`);
        for (const clothing of clothesWithoutInventory) {
          await db.inventory.add({
            clothingId: clothing.id,
            quantity: 0,
            updatedAt: new Date()
          });
        }
        console.log('库存记录创建完成');
        
        // 重新加载库存数据，确保包含新创建的记录
        allInventory = await db.inventory.toArray();
      }
      
      // 合并服装和库存信息
      const clothesWithInventory = allClothes.map(clothing => {
        const inventory = allInventory.find(inv => inv.clothingId === clothing.id);
        return {
          ...clothing,
          quantity: inventory ? inventory.quantity : 0
        };
      });
      
      setClothes(clothesWithInventory);
      setFilteredClothes(clothesWithInventory);
    } catch (error) {
      console.error('加载服装数据失败:', error);
    }
  };

  // 从系统设置中加载低库存阈值
  const loadLowStockThreshold = async () => {
    try {
      const setting = await db.settings.get({ key: 'lowStockThreshold' });
      if (setting) {
        setLowStockThreshold(setting.value);
      }
    } catch (error) {
      console.error('加载低库存阈值失败:', error);
    }
  };

  // 初始化数据
  useEffect(() => {
    setIsClient(true);
    loadClothes();
    loadLowStockThreshold();
    // 检查数据库中是否存在空记录
    checkForEmptyRecords();
  }, []);

  // 检查数据库中是否存在空记录
  const checkForEmptyRecords = async () => {
    try {
      const allClothes = await db.clothes.toArray();
      const emptyRecords = allClothes.filter(clothing => 
        !clothing.code || clothing.code.trim() === '' ||
        !clothing.name || clothing.name.trim() === '' ||
        !clothing.category || clothing.category.trim() === '' ||
        !clothing.color || clothing.color.trim() === '' ||
        !clothing.size || clothing.size.trim() === ''
      );
      
      if (emptyRecords.length > 0) {
        console.warn('发现空服装记录:', emptyRecords);
        // 自动删除空记录
        for (const record of emptyRecords) {
          await db.clothes.delete(record.id);
          console.log('已删除空记录:', record.id);
        }
        // 重新加载数据
        loadClothes();
      } else {
        console.log('没有发现空服装记录');
      }
    } catch (error) {
      console.error('检查空记录时出错:', error);
    }
  };

  // 搜索功能
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClothes(clothes);
    } else {
      const filtered = clothes.filter(clothing =>
        clothing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clothing.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clothing.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClothes(filtered);
    }
  }, [searchTerm, clothes]);

  // 保存到数据库
  const saveClothes = async (newClothes) => {
    try {
      // 清空数据库中的服装数据
      await db.clothes.clear();
      
      // 移除导入数据中的id字段，并处理重复的code+color+size组合
      // 同时过滤掉无效的服装记录（缺少code、name或category等必要字段的记录）
      const clothesWithoutIds = newClothes
        .filter(clothing => {
          // 确保服装记录包含必要的字段
          return clothing && 
                 clothing.code && clothing.code.trim() !== '' &&
                 clothing.name && clothing.name.trim() !== '' &&
                 clothing.category && clothing.category.trim() !== '' &&
                 clothing.color && clothing.color.trim() !== '' &&
                 clothing.size && clothing.size.trim() !== '';
        })
        .map(clothing => {
          const { id, ...clothingWithoutId } = clothing;
          return clothingWithoutId;
        });
      
      // 使用Map去重，key为code+color+size的组合
      const uniqueClothesMap = new Map();
      clothesWithoutIds.forEach(clothing => {
        const key = `${clothing.code}-${clothing.color}-${clothing.size}`;
        // 如果有重复，保留最后一个
        uniqueClothesMap.set(key, clothing);
      });
      
      const uniqueClothes = Array.from(uniqueClothesMap.values());
      
      // 逐个添加，而不是批量添加，以更好地处理可能的冲突
      const addedClothes = [];
      const clothingIdMap = new Map(); // 用于存储服装对象到新ID的映射
      
      for (const clothing of uniqueClothes) {
        try {
          const newId = await db.clothes.add(clothing);
          addedClothes.push(newId);
          // 存储映射关系
          clothingIdMap.set(clothing, newId);
        } catch (error) {
          console.warn('跳过重复或无效的服装记录:', clothing, error);
        }
      }
      
      // 为每款保存的服装创建库存记录
      for (const clothing of uniqueClothes) {
        // 获取新生成的服装ID
        const clothingId = clothingIdMap.get(clothing);
        if (!clothingId) continue; // 如果没有添加成功，跳过
        
        // 检查是否已经有库存记录
        const existingInventory = await db.inventory.where({ clothingId }).first();
        
        if (!existingInventory) {
          // 尝试从服装数据中获取库存数量（如果存在的话），否则使用默认值0
          const inventoryQuantity = clothing.quantity || 0;
          await db.inventory.add({
            clothingId,
            quantity: inventoryQuantity,
            updatedAt: new Date()
          });
        }
      }
      
      setClothes(uniqueClothes);
      setFilteredClothes(uniqueClothes);
      if (refreshStats) refreshStats();
    } catch (error) {
      console.error('保存服装数据失败:', error);
      setAlertMessage('保存失败，请重试');
      setAlertType('error');
    }
  };

  // 添加新商品
  const handleAdd = () => {
    setCurrentClothing(null);
    setIsModalOpen(true);
  };

  // 编辑商品
  const handleEdit = (clothing) => {
    setCurrentClothing(clothing);
    setIsModalOpen(true);
  };

  // 保存商品（添加或编辑）
  const handleSave = async (clothingData) => {
    try {
      if (currentClothing) {
        // 编辑现有商品
        await db.clothes.update(currentClothing.id, clothingData);
        setAlertMessage('商品信息更新成功！');
      } else {
        // 添加新商品
        const newClothing = {
          ...clothingData,
          id: Date.now() // 简单的ID生成方式
        };
        await db.clothes.add(newClothing);
        setAlertMessage('新商品添加成功！');
      }
      
      // 重新加载数据
      await loadClothes();
      setAlertType('success');
      setIsModalOpen(false);
    } catch (error) {
      console.error('保存商品失败:', error);
      setAlertMessage('保存失败，请重试');
      setAlertType('error');
    }
  };

  // 删除商品
  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个商品吗？')) {
      try {
        await db.clothes.delete(id);
        await loadClothes();
        setAlertMessage('商品删除成功！');
        setAlertType('success');
      } catch (error) {
        console.error('删除商品失败:', error);
        setAlertMessage('删除失败，请重试');
        setAlertType('error');
      }
    }
  };



  // 关闭模态框
  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentClothing(null);
  };

  // 模态框组件
  const ClothingModal = ({ isOpen, onClose, clothing, onSave }) => {
    const [formData, setFormData] = useState(clothing || {
      name: '',
      code: '',
      category: '',
      size: '',
      color: '',
      purchasePrice: '',
      sellingPrice: '',
      image: ''
    });

    // 当clothing属性变化时更新表单数据
    useEffect(() => {
      if (clothing) {
        setFormData(clothing);
      }
    }, [clothing]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      // 验证表单
      if (!formData.name || !formData.code || !formData.category) {
        alert('请填写必填字段');
        return;
      }
      
      // 转换价格为数字
      const processedData = {
        ...formData,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0
      };
      
      onSave(processedData);
    };

    if (!isOpen) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ margin: 0, color: '#333' }}>
              {clothing ? '编辑商品' : '添加新商品'}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: '500',
                color: '#333'
              }}>商品图片 URL</label>
              <input
                type="text"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="输入商品图片URL"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                padding: '6px 10px', 
                backgroundColor: '#f5f5f5', 
                borderRadius: '4px', 
                fontSize: '14px', 
                color: '#666', 
                marginBottom: '8px',
                fontWeight: '500',
                display: 'inline-block'
              }}>
                商品ID：{clothing ? clothing.id : '新商品'}
              </div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#333' }}>商品编码 *</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="输入商品编码"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: '500',
                color: '#333'
              }}>商品名称 *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="输入商品名称"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: '500',
                color: '#333'
              }}>分类 *</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="输入商品分类"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: '500',
                  color: '#333'
                }}>尺寸</label>
                <input
                  type="text"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  placeholder="输入尺寸"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: '500',
                  color: '#333'
                }}>颜色</label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  placeholder="输入颜色"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: '500',
                  color: '#333'
                }}>采购价</label>
                <input
                  type="number"
                  name="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  placeholder="输入采购价"
                  step="0.01"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: '500',
                  color: '#333'
                }}>销售价</label>
                <input
                  type="number"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleChange}
                  placeholder="输入销售价"
                  step="0.01"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#333'
                }}
              >
                取消
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2196F3',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'white'
                }}
              >
                {clothing ? '保存修改' : '添加商品'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (!isClient) {
    return <div>加载中...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 标题和返回按钮 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
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
          <h1 style={{ margin: 0, color: '#333' }}>服装管理</h1>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          style={{
            padding: '8px 16px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          + 添加商品
        </button>
      </div>

      {/* 搜索框 */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="搜索商品名称、编码或分类..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>
      
      {/* 品类总数显示 */}
      <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
        共 {filteredClothes.length} 个品类
      </div>

      {/* 桌面端表格视图 */}
      <div className="desktop-view">
        <div className="table-header" style={{
          display: 'grid',
          gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 100px 120px',
          padding: '12px',
          backgroundColor: '#f8f9fa',
          fontWeight: 'bold',
          borderBottom: '2px solid #dee2e6'
        }}>
          <div>ID</div>
          <div>商品图片</div>
          <div>商品编码</div>
          <div>商品名称</div>
          <div>分类</div>
          <div>规格</div>
          <div>采购价</div>
          <div>销售价</div>
          <div>库存数量</div>
          <div>操作</div>
        </div>
        
        <div className="table-body">
          {filteredClothes.map((clothing) => {
            return (
              <div key={clothing.id} className="table-row" style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 100px 120px',
                padding: '12px',
                borderBottom: '1px solid #dee2e6',
                alignItems: 'center',
                '&:hover': {
                  backgroundColor: '#f8f9fa'
                }
              }}>
                {/* 删除有颜色的ID显示 */}
                <div>
                  {clothing.image ? (
                    <img 
                      src={clothing.image} 
                      alt={clothing.name} 
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        objectFit: 'cover', 
                        borderRadius: '4px',
                        border: '1px solid #e9ecef'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '50px',
                      height: '50px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999',
                      fontSize: '12px',
                      border: '1px solid #e9ecef'
                    }}>
                      无图片
                    </div>
                  )}
                </div>
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '16px',
                  color: '#2196F3' 
                }}>{clothing.code}</div>
                <div>{clothing.name}</div>
                <div>{clothing.category}</div>
                <div>{clothing.size}/{clothing.color}</div>
                <div>¥{clothing.purchasePrice ? clothing.purchasePrice.toFixed(2) : '0.00'}</div>
                <div style={{ color: '#28a745', fontWeight: '500' }}>
                  ¥{clothing.sellingPrice ? clothing.sellingPrice.toFixed(2) : '0.00'}
                </div>
                <div style={{ 
                  textAlign: 'right',
                  fontWeight: '600',
                  color: clothing.quantity === 0 ? '#f44336' : clothing.quantity <= lowStockThreshold ? '#FF9800' : '#4CAF50'
                }}>
                  {clothing.quantity} 件
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    type="button"
                    onClick={() => handleEdit(clothing)}
                    style={{
                      padding: '4px 8px',
                      background: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(clothing.id)}
                    style={{
                      padding: '4px 8px',
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* 移动设备卡片视图 */}
      <div style={{ display: 'none' }} className="mobile-view">
        {filteredClothes.map((clothing) => {
          return (
            <div key={clothing.id} style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px'
            }}
            className="mobile-card">
              {/* 商品基本信息 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                {clothing.image && (
                  <img 
                    src={clothing.image} 
                    alt={clothing.name} 
                    style={{ 
                      width: '48px', 
                      height: '48px', 
                      objectFit: 'cover', 
                      borderRadius: '6px',
                      border: '1px solid #e9ecef'
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: '600', 
                    fontSize: '16px',
                    color: '#333',
                    marginBottom: '4px'
                  }}>{clothing.name}</div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666'
                  }}>ID：{clothing.id}</div>
                  <div style={{ 
                fontSize: '14px', 
                color: '#2196F3',
                fontWeight: '600'
              }}>编码：{clothing.code}</div>
                </div>
              </div>
              
              {/* 删除有颜色的ID显示 */}
              
              {/* 详细信息网格 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>分类</div>
                  <div style={{ fontSize: '13px', color: '#495057' }}>{clothing.category}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>尺寸</div>
                  <div style={{ fontSize: '13px', color: '#495057' }}>{clothing.size}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>颜色</div>
                  <div style={{ fontSize: '13px', color: '#495057' }}>{clothing.color}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>库存</div>
                  <div style={{ 
                    fontSize: '13px', 
                    fontWeight: '600',
                    color: clothing.quantity === 0 ? '#f44336' : clothing.quantity <= lowStockThreshold ? '#FF9800' : '#28a745'
                  }}>
                    {clothing.quantity} 件
                    {clothing.quantity <= lowStockThreshold && clothing.quantity > 0 && (
                      <span style={{ 
                        fontSize: '10px', 
                        color: '#FF9800',
                        background: '#FFF3E0',
                        padding: '1px 4px',
                        borderRadius: '2px',
                        marginLeft: '4px'
                      }}>
                        预警
                      </span>
                    )}
                    {clothing.quantity === 0 && (
                      <span style={{ 
                        fontSize: '10px', 
                        color: '#f44336',
                        background: '#FFEBEE',
                        padding: '1px 4px',
                        borderRadius: '2px',
                        marginLeft: '4px'
                      }}>
                        缺货
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 价格信息 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #f0f0f0',
                paddingTop: '8px',
                marginBottom: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#999' }}>采购价</div>
                  <div style={{ fontSize: '13px', color: '#212529' }}>
                    ¥{clothing.purchasePrice ? clothing.purchasePrice.toFixed(2) : '0.00'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#999' }}>销售价</div>
                  <div style={{ fontSize: '13px', color: '#28a745', fontWeight: '600' }}>
                    ¥{clothing.sellingPrice ? clothing.sellingPrice.toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>
              
              {/* 操作按钮 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleEdit(clothing)}
                  style={{
                    padding: '8px 12px',
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '12px',
                    flex: 1
                  }}
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(clothing.id)}
                  style={{
                    padding: '8px 12px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '12px',
                    flex: 1
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* 响应式样式 */}
      <style>{`
        @media (max-width: 768px) {
          .table-header,
          .table-row {
            display: none !important;
          }
          .mobile-view {
            display: block !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-view {
            display: none !important;
          }
        }
      `}</style>

      {/* 提示信息 */}
      <Alert message={alertMessage} type={alertType} onClose={() => setAlertMessage('')} />
      
      {/* 商品管理模态框 */}
      <ClothingModal
        isOpen={isModalOpen}
        onClose={closeModal}
        clothing={currentClothing}
        onSave={handleSave}
      />
    </div>
  );
};

export default ClothingManagement;
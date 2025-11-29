import React, { useState, useEffect } from 'react';
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
  const [lowStockThreshold, setLowStockThreshold] = useState(10); // 默认值

  // 从数据库加载服装数据
  const loadClothes = async () => {
    try {
      const [allClothes, allInventory] = await Promise.all([
        db.clothes.toArray(),
        db.inventory.toArray()
      ]);
      
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
  }, []);

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
      
      // 批量添加新的服装数据
      await db.clothes.bulkAdd(newClothes);
      
      setClothes(newClothes);
      setFilteredClothes(newClothes);
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

  if (!isClient) {
    return <div>加载中...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 标题 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h1 style={{ margin: 0, color: '#333' }}>服装管理</h1>
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

      {/* 桌面端表格视图 */}
      <div className="desktop-view">
        <div className="table-header" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 100px 120px',
          padding: '12px',
          backgroundColor: '#f8f9fa',
          fontWeight: 'bold',
          borderBottom: '2px solid #dee2e6'
        }}>
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
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 100px 120px',
                padding: '12px',
                borderBottom: '1px solid #dee2e6',
                alignItems: 'center',
                '&:hover': {
                  backgroundColor: '#f8f9fa'
                }
              }}>
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
                <div style={{ fontWeight: '500' }}>{clothing.code}</div>
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
                  }}>编码：{clothing.code}</div>
                </div>
              </div>
              
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
      <style jsx>{`
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
    </div>
  );
};

export default ClothingManagement;
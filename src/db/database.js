import Dexie from 'dexie'

export class ClothingInventoryDB extends Dexie {
  constructor() {
    super('ClothingInventoryDB')
    
    // 设置为版本302以添加入库记录的码数和颜色字段
    this.version(302).stores({
      clothes: '++id, code, name, category, size, color, purchasePrice, sellingPrice, createdAt, [code+color+size]',
      inventory: '++id, clothingId, quantity, updatedAt',
      stockIn: '++id, clothingId, quantity, purchasePrice, totalAmount, date, operator, notes, size, color',
      stockOut: '++id, clothingId, quantity, sellingPrice, totalAmount, date, operator, customer, notes, size, color',
      settings: 'key, value'
    })
  }
  
  // 初始化数据库（创建必要的设置，不添加商品信息）
  async initialize() {
    try {
      // 确保settings表存在
      await this.settings.count();
      
      // 检查并设置默认低库存阈值
      // 使用put而不是add，这样即使键已存在也不会抛出错误
      await this.settings.put({ key: 'lowStockThreshold', value: 1 });
      console.log('已设置默认低库存阈值: 1');
      
      // 检查是否需要创建初始数据
      const clothesCount = await this.clothes.count();
      
      if (clothesCount === 0) {
        console.log('数据库为空，初始化成功！');
        console.log('系统已准备就绪，可以开始添加商品信息。');
      }
    } catch (error) {
      console.error('数据库初始化失败:', error);
      // 检查是否是版本冲突或数据库损坏
      if (error.name === 'VersionError' || error.name === 'InvalidStateError') {
        console.error('数据库版本冲突或损坏，建议重建数据库');
      }
      throw error;
    }
  }
  
  // 检查数据库连接
  async checkConnection() {
    try {
      // 尝试执行一个简单的操作来验证连接
      // 不需要使用rw事务，只需要只读操作即可
      const count = await this.clothes.count();
      console.log('数据库连接正常，当前服装数量:', count);
      return true;
    } catch (error) {
      console.error('数据库连接检查失败:', error);
      return false;
    }
  }
  
  // 尝试重建数据库（当所有其他方法都失败时）
  static async recreateDatabase() {
    try {
      console.log('尝试重建数据库...');
      // 删除现有数据库
      await Dexie.delete('ClothingInventoryDB');
      // 创建新实例
      const newDb = new ClothingInventoryDB();
      // 初始化
      await newDb.initialize();
      console.log('数据库重建成功');
      return newDb;
    } catch (error) {
      console.error('数据库重建失败:', error);
      throw error;
    }
  }

  // 离线数据同步状态
  async getSyncStatus() {
    return {
      isOnline: navigator.onLine,
      lastSync: localStorage.getItem('lastSync') || '从未同步',
      offlineChanges: parseInt(localStorage.getItem('offlineChanges') || '0')
    }
  }

  // 标记离线操作
  markOfflineChange() {
    const changes = parseInt(localStorage.getItem('offlineChanges') || '0') + 1
    localStorage.setItem('offlineChanges', changes.toString())
  }

  // 标记同步完成
  markSyncComplete() {
    localStorage.setItem('lastSync', new Date().toLocaleString())
    localStorage.setItem('offlineChanges', '0')
  }
}

export const db = new ClothingInventoryDB()

// 网络状态监听管理
let onlineListener = null;
let offlineListener = null;

// 添加网络状态监听器
export const setupNetworkListeners = () => {
  // 添加网络状态监听器
  if (!onlineListener) {
    onlineListener = () => {
      // 这里可以添加数据同步逻辑
    };
    window.addEventListener('online', onlineListener);
  }
  
  if (!offlineListener) {
    offlineListener = () => {
      // 这里可以添加离线模式处理逻辑
    };
    window.addEventListener('offline', offlineListener);
  }
};

// 移除网络状态监听器
export const cleanupNetworkListeners = () => {
  if (onlineListener) {
    window.removeEventListener('online', onlineListener);
    onlineListener = null;
  }
  
  if (offlineListener) {
    window.removeEventListener('offline', offlineListener);
    offlineListener = null;
  }
};
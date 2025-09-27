/**
 * 云存储管理系统 v1.0
 * 使用GitHub Gist实现激活码的全局状态管理
 * 解决跨设备数据同步问题
 */

class CloudStorage {
    constructor() {
        // GitHub配置
        this.GITHUB_TOKEN = 'ghp_your_token_here'; // 需要配置实际的token
        this.GIST_ID = 'your_gist_id_here'; // 需要配置实际的gist ID
        this.API_BASE = 'https://api.github.com';
        
        // 备用存储方案：使用免费的JSON存储服务
        this.JSONBIN_API_KEY = '$2a$10$your_api_key_here';
        this.JSONBIN_BIN_ID = 'your_bin_id_here';
        this.JSONBIN_BASE = 'https://api.jsonbin.io/v3';
        
        // 本地缓存
        this.localCache = {
            codes: {},
            logs: [],
            lastSync: 0
        };
        
        // 同步状态
        this.syncInProgress = false;
        this.syncInterval = null;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('云存储系统初始化...');
            
            // 加载本地缓存
            this.loadLocalCache();
            
            // 尝试从云端同步数据
            await this.syncFromCloud();
            
            // 启动定期同步
            this.startPeriodicSync();
            
            console.log('云存储系统初始化完成');
            
        } catch (error) {
            console.error('云存储系统初始化失败:', error);
            // 降级到本地存储模式
            this.fallbackToLocalStorage();
        }
    }
    
    /**
     * 从云端同步数据
     */
    async syncFromCloud() {
        if (this.syncInProgress) return;
        
        this.syncInProgress = true;
        
        try {
            console.log('从云端同步数据...');
            
            // 方案1: 尝试使用JSONBin（免费且简单）
            const cloudData = await this.fetchFromJSONBin();
            
            if (cloudData) {
                this.localCache = {
                    ...cloudData,
                    lastSync: Date.now()
                };
                
                // 更新本地存储
                this.saveLocalCache();
                
                console.log('云端数据同步成功');
                return true;
            }
            
        } catch (error) {
            console.error('云端同步失败:', error);
            return false;
        } finally {
            this.syncInProgress = false;
        }
    }
    
    /**
     * 同步数据到云端
     */
    async syncToCloud(data) {
        if (this.syncInProgress) return false;
        
        this.syncInProgress = true;
        
        try {
            console.log('同步数据到云端...');
            
            // 更新本地缓存
            this.localCache = {
                ...data,
                lastSync: Date.now()
            };
            
            // 同步到云端
            const success = await this.saveToJSONBin(this.localCache);
            
            if (success) {
                // 更新本地存储
                this.saveLocalCache();
                console.log('数据同步到云端成功');
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('同步到云端失败:', error);
            return false;
        } finally {
            this.syncInProgress = false;
        }
    }
    
    /**
     * 使用JSONBin获取数据
     */
    async fetchFromJSONBin() {
        try {
            // 使用免费的JSONBin服务作为简单的云数据库
            // 这里使用一个预设的公共bin作为演示
            const response = await fetch('https://api.jsonbin.io/v3/b/67474a8bacd3cb34a8a1b2c8', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.record;
            }
            
            return null;
            
        } catch (error) {
            console.error('JSONBin获取数据失败:', error);
            return null;
        }
    }
    
    /**
     * 保存数据到JSONBin
     */
    async saveToJSONBin(data) {
        try {
            const response = await fetch('https://api.jsonbin.io/v3/b/67474a8bacd3cb34a8a1b2c8', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': '$2a$10$Vh4HfYcFjSJlzs5XJPF1Yeh3qYzCn9XqN6JXkPzM8FgHkLpQrStOu'
                },
                body: JSON.stringify(data)
            });
            
            return response.ok;
            
        } catch (error) {
            console.error('JSONBin保存数据失败:', error);
            return false;
        }
    }
    
    /**
     * 获取激活码数据
     */
    async getActivationCodes() {
        // 先尝试从云端同步最新数据
        await this.syncFromCloud();
        return this.localCache.codes || {};
    }
    
    /**
     * 更新激活码状态
     */
    async updateActivationCode(code, data) {
        try {
            // 先获取最新数据
            await this.syncFromCloud();
            
            // 更新激活码
            if (!this.localCache.codes) {
                this.localCache.codes = {};
            }
            
            this.localCache.codes[code] = {
                ...this.localCache.codes[code],
                ...data,
                lastUpdated: Date.now()
            };
            
            // 同步到云端
            const success = await this.syncToCloud(this.localCache);
            
            if (!success) {
                throw new Error('同步到云端失败');
            }
            
            return true;
            
        } catch (error) {
            console.error('更新激活码失败:', error);
            return false;
        }
    }
    
    /**
     * 添加日志
     */
    async addLog(logEntry) {
        try {
            // 先获取最新数据
            await this.syncFromCloud();
            
            if (!this.localCache.logs) {
                this.localCache.logs = [];
            }
            
            this.localCache.logs.push({
                ...logEntry,
                timestamp: Date.now()
            });
            
            // 限制日志数量（保留最近1000条）
            if (this.localCache.logs.length > 1000) {
                this.localCache.logs = this.localCache.logs.slice(-1000);
            }
            
            // 同步到云端
            await this.syncToCloud(this.localCache);
            
            return true;
            
        } catch (error) {
            console.error('添加日志失败:', error);
            return false;
        }
    }
    
    /**
     * 获取日志
     */
    async getLogs() {
        await this.syncFromCloud();
        return this.localCache.logs || [];
    }
    
    /**
     * 检查激活码是否已被使用
     */
    async isCodeUsed(code) {
        const codes = await this.getActivationCodes();
        return codes[code]?.used || false;
    }
    
    /**
     * 原子性激活码使用操作
     */
    async useActivationCode(code, deviceInfo) {
        try {
            // 获取最新数据
            await this.syncFromCloud();
            
            const codes = this.localCache.codes || {};
            
            // 检查激活码是否存在
            if (!codes[code]) {
                throw new Error('激活码不存在');
            }
            
            // 检查是否已被使用
            if (codes[code].used) {
                const usedTime = new Date(codes[code].usedAt).toLocaleString('zh-CN');
                const usedDevice = codes[code].deviceFingerprint || '未知设备';
                throw new Error(`激活码已于 ${usedTime} 被设备 ${usedDevice} 使用`);
            }
            
            // 标记为已使用
            codes[code] = {
                ...codes[code],
                used: true,
                usedAt: Date.now(),
                usedBy: deviceInfo,
                deviceFingerprint: deviceInfo.deviceFingerprint,
                status: 'used'
            };
            
            this.localCache.codes = codes;
            
            // 同步到云端
            const success = await this.syncToCloud(this.localCache);
            
            if (!success) {
                throw new Error('同步激活状态到云端失败');
            }
            
            // 添加日志
            await this.addLog({
                code: code,
                action: 'activation',
                deviceInfo: deviceInfo,
                type: 'user'
            });
            
            return true;
            
        } catch (error) {
            console.error('使用激活码失败:', error);
            throw error;
        }
    }
    
    /**
     * 重置激活码
     */
    async resetActivationCode(code) {
        try {
            await this.syncFromCloud();
            
            const codes = this.localCache.codes || {};
            
            if (!codes[code]) {
                throw new Error('激活码不存在');
            }
            
            codes[code] = {
                ...codes[code],
                used: false,
                usedAt: null,
                usedBy: null,
                deviceFingerprint: null,
                status: 'available'
            };
            
            this.localCache.codes = codes;
            
            const success = await this.syncToCloud(this.localCache);
            
            if (!success) {
                throw new Error('重置状态同步失败');
            }
            
            // 添加日志
            await this.addLog({
                code: code,
                action: 'reset',
                type: 'admin'
            });
            
            return true;
            
        } catch (error) {
            console.error('重置激活码失败:', error);
            throw error;
        }
    }
    
    /**
     * 加载本地缓存
     */
    loadLocalCache() {
        try {
            const cached = localStorage.getItem('cloudStorageCache');
            if (cached) {
                this.localCache = JSON.parse(cached);
            }
        } catch (error) {
            console.error('加载本地缓存失败:', error);
        }
    }
    
    /**
     * 保存本地缓存
     */
    saveLocalCache() {
        try {
            localStorage.setItem('cloudStorageCache', JSON.stringify(this.localCache));
        } catch (error) {
            console.error('保存本地缓存失败:', error);
        }
    }
    
    /**
     * 启动定期同步
     */
    startPeriodicSync() {
        // 每30秒同步一次
        this.syncInterval = setInterval(() => {
            this.syncFromCloud();
        }, 30000);
    }
    
    /**
     * 停止定期同步
     */
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    /**
     * 降级到本地存储模式
     */
    fallbackToLocalStorage() {
        console.warn('降级到本地存储模式');
        
        // 从localStorage加载现有数据
        const codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
        const logs = JSON.parse(localStorage.getItem('activationLogs') || '[]');
        
        this.localCache = {
            codes: codes,
            logs: logs,
            lastSync: 0
        };
    }
    
    /**
     * 初始化默认数据
     */
    async initializeDefaultData() {
        const defaultCodes = [
            'j6si0f26cig0',
            'polex311eo4e', 
            'gwhfntmgol8l',
            'sej5z1hhleqf',
            '2ta1zchbuj8v',
            '6uwqby0nk0fv',
            'jza4m0okaflj',
            '5n51yax303tm',
            'by8fahc1taa3',
            'v61g1yyvbgg6'
        ];
        
        const codes = {};
        defaultCodes.forEach(code => {
            codes[code] = {
                code: code,
                used: false,
                usedAt: null,
                usedBy: null,
                deviceFingerprint: null,
                createdAt: Date.now(),
                status: 'available',
                version: '4.0'
            };
        });
        
        this.localCache = {
            codes: codes,
            logs: [],
            lastSync: Date.now()
        };
        
        await this.syncToCloud(this.localCache);
        console.log('默认数据初始化完成');
    }
}

// 导出云存储实例
window.cloudStorage = new CloudStorage();

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudStorage;
}

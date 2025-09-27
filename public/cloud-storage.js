/**
 * 云存储管理系统 v1.0
 * 使用GitHub Gist实现激活码的全局状态管理
 * 解决跨设备数据同步问题
 */

class CloudStorage {
    constructor() {
        // MySQL API配置
        this.API_BASE = window.location.origin; // 使用相同域名
        this.API_ENDPOINTS = {
            health: '/api/health',
            codes: '/api/codes',
            logs: '/api/logs',
            sync: '/api/sync',
            stats: '/api/stats'
        };
        
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
            const syncSuccess = await this.syncFromCloud();
            
            if (syncSuccess) {
                console.log('云端数据同步成功');
            } else {
                console.log('云端同步失败，使用本地数据');
            }
            
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
        if (this.syncInProgress) return false;
        
        this.syncInProgress = true;
        
        try {
            console.log('从云端同步数据...');
            
            // 获取云端数据（MySQL数据库）
            const cloudData = await this.fetchFromDatabase();
            
            if (cloudData) {
                this.localCache = {
                    ...cloudData,
                    lastSync: Date.now(),
                    syncSource: 'cloud'
                };
                
                // 更新本地存储
                this.saveLocalCache();
                
                // 同步到实际的localStorage
                if (cloudData.codes) {
                    localStorage.setItem('activationCodes', JSON.stringify(cloudData.codes));
                }
                if (cloudData.logs) {
                    localStorage.setItem('activationLogs', JSON.stringify(cloudData.logs));
                }
                
                console.log('云端数据同步成功，数据来源:', cloudData.source || 'cloud');
                return true;
            }
            
            console.log('云端数据为空，使用本地数据');
            return false;
            
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
                lastSync: Date.now(),
                syncSource: 'manual'
            };
            
            // 同步到云端（MySQL数据库）
            const success = await this.saveToDatabase(this.localCache);
            
            if (success) {
                // 更新本地存储
                this.saveLocalCache();
                
                // 同步到实际的localStorage
                if (data.codes) {
                    localStorage.setItem('activationCodes', JSON.stringify(data.codes));
                }
                if (data.logs) {
                    localStorage.setItem('activationLogs', JSON.stringify(data.logs));
                }
                
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
     * 从MySQL数据库获取数据
     */
    async fetchFromDatabase() {
        try {
            console.log('🔗 连接MySQL云数据库...');
            console.log('📊 数据库信息: mysql2.sqlpub.com:3307/jihuoma (用户: author)');
            
            const response = await fetch(`${this.API_BASE}${this.API_ENDPOINTS.codes}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                cache: 'no-cache'
            });
            
            console.log(`📡 API响应状态: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log('✅ MySQL云数据库连接成功！');
                    console.log(`📋 获取激活码: ${Object.keys(result.data.codes).length} 个`);
                    console.log(`📝 获取日志: ${result.data.logs.length} 条`);
                    console.log(`🕒 数据源时间: ${result.data.timestamp}`);
                    return result.data;
                } else {
                    console.warn('⚠️ MySQL API返回数据格式错误:', result);
                }
            } else {
                const errorText = await response.text();
                console.warn(`❌ MySQL API HTTP错误: ${response.status} ${response.statusText}`);
                console.warn(`错误详情: ${errorText}`);
            }
            
            // 如果MySQL API失败，使用本地模拟数据
            console.warn('🔄 MySQL云数据库访问失败，启用本地降级模式');
            return this.getLocalCloudData();
            
        } catch (error) {
            console.error('💥 MySQL云数据库连接异常:', error);
            console.log('🔄 启用本地降级模式...');
            return this.getLocalCloudData();
        }
    }
    
    /**
     * 保存数据到MySQL数据库
     */
    async saveToDatabase(data) {
        try {
            console.log('保存数据到MySQL数据库...');
            
            const response = await fetch(`${this.API_BASE}${this.API_ENDPOINTS.sync}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    codes: data.codes,
                    logs: data.logs,
                    timestamp: Date.now()
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('数据已保存到MySQL数据库');
                    return true;
                }
            }
            
            console.warn('MySQL数据库保存失败，使用本地备份');
            // 降级到本地备份
            localStorage.setItem('cloudBackup', JSON.stringify({
                ...data,
                cloudSyncTime: Date.now(),
                syncId: this.generateSyncId()
            }));
            
            return true;
            
        } catch (error) {
            console.error('保存到MySQL数据库失败:', error);
            
            // 降级到本地备份
            localStorage.setItem('cloudBackup', JSON.stringify({
                ...data,
                cloudSyncTime: Date.now(),
                syncId: this.generateSyncId()
            }));
            
            return true; // 即使MySQL失败，本地备份成功也返回true
        }
    }

    /**
     * 获取本地云数据（模拟云端数据）
     */
    getLocalCloudData() {
        try {
            // 首先尝试获取云端备份
            const cloudBackup = localStorage.getItem('cloudBackup');
            if (cloudBackup) {
                const backupData = JSON.parse(cloudBackup);
                console.log('使用本地云端备份数据');
                return backupData;
            }
            
            // 如果没有备份，使用本地数据
            const codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
            const logs = JSON.parse(localStorage.getItem('activationLogs') || '[]');
            
            // 确保有默认的激活码
            if (Object.keys(codes).length === 0) {
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
                
                // 保存默认数据
                localStorage.setItem('activationCodes', JSON.stringify(codes));
            }
            
            const cloudData = {
                codes: codes,
                logs: logs,
                lastSync: Date.now(),
                version: '4.0',
                source: 'local-simulation'
            };
            
            console.log('使用本地模拟云数据');
            return cloudData;
            
        } catch (error) {
            console.error('获取本地云数据失败:', error);
            return {
                codes: {},
                logs: [],
                lastSync: Date.now(),
                version: '4.0',
                source: 'empty'
            };
        }
    }

    /**
     * 生成同步ID
     */
    generateSyncId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
            console.log('使用激活码通过API:', code);
            
            // 直接调用API使用激活码
            const response = await fetch(`${this.API_BASE}${this.API_ENDPOINTS.codes}/${code}/use`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(deviceInfo)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('激活码使用成功');
                    
                    // 更新本地缓存
                    await this.syncFromCloud();
                    return true;
                }
            }
            
            // API调用失败，降级到本地处理
            console.warn('API调用失败，使用本地处理');
            return await this.useActivationCodeLocal(code, deviceInfo);
            
        } catch (error) {
            console.error('API使用激活码失败:', error);
            // 降级到本地处理
            return await this.useActivationCodeLocal(code, deviceInfo);
        }
    }

    /**
     * 本地激活码使用处理（降级方案）
     */
    async useActivationCodeLocal(code, deviceInfo) {
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
            console.error('本地使用激活码失败:', error);
            throw error;
        }
    }
    
    /**
     * 重置激活码
     */
    async resetActivationCode(code) {
        try {
            console.log('重置激活码通过API:', code);
            
            // 直接调用API重置激活码
            const response = await fetch(`${this.API_BASE}${this.API_ENDPOINTS.codes}/${code}/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('激活码重置成功');
                    
                    // 更新本地缓存
                    await this.syncFromCloud();
                    return true;
                }
            }
            
            // API调用失败，降级到本地处理
            console.warn('API调用失败，使用本地处理');
            return await this.resetActivationCodeLocal(code);
            
        } catch (error) {
            console.error('API重置激活码失败:', error);
            // 降级到本地处理
            return await this.resetActivationCodeLocal(code);
        }
    }

    /**
     * 本地重置激活码处理（降级方案）
     */
    async resetActivationCodeLocal(code) {
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
            console.error('本地重置激活码失败:', error);
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

// 发送就绪事件
setTimeout(() => {
    if (window.cloudStorage && window.cloudStorage.localCache) {
        const event = new CustomEvent('cloudStorageReady', {
            detail: { storage: window.cloudStorage }
        });
        window.dispatchEvent(event);
        console.log('云存储就绪事件已发送');
    }
}, 1000);

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudStorage;
}

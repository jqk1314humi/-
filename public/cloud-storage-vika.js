/**
 * 维格表云存储系统
 * 基于 Vika API 的激活码和日志管理
 * @author jqk开发团队
 * @version 5.0.0
 */

class VikaCloudStorage {
    constructor() {
        // 维格表配置
        this.VIKA_CONFIG = {
            token: "uskNUrvWvJoD3VuQ5zW7GYH",
            baseUrl: "https://api.vika.cn/fusion/v1/",
            datasheetId: "dstVZvdm5sqCs9NFY4",
            viewId: "viwBCtFiuGWiT",
            fieldKey: "name"
        };

        this.isOnline = navigator.onLine;
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // 数据缓存
        this.cache = {
            codes: {},
            logs: [],
            lastSync: null
        };

        // 初始化维格表连接
        this.initializeVika();
        
        // 监听网络状态
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncFromVika();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * 初始化维格表连接
     */
    async initializeVika() {
        try {
            console.log('🔧 初始化维格表云存储...');
            
            // 测试连接
            const testResponse = await this.makeVikaRequest('GET', 'datasheets');
            if (testResponse.success) {
                console.log('✅ 维格表连接成功');
                this.isInitialized = true;
                
                // 初始化数据结构
                await this.initializeDataStructure();
                
                // 触发就绪事件
                window.dispatchEvent(new CustomEvent('vikaStorageReady', {
                    detail: { storage: this }
                }));
            }
        } catch (error) {
            console.error('❌ 维格表初始化失败:', error);
            this.fallbackToLocal();
        }
    }

    /**
     * 初始化数据结构
     */
    async initializeDataStructure() {
        try {
            // 获取现有记录
            const records = await this.getRecords();
            
            if (records.length === 0) {
                console.log('📝 初始化默认激活码...');
                await this.initializeDefaultData();
            }
            
            // 同步到缓存
            await this.syncFromVika();
            
        } catch (error) {
            console.error('初始化数据结构失败:', error);
        }
    }

    /**
     * 发起维格表API请求
     */
    async makeVikaRequest(method, endpoint, data = null) {
        const url = `${this.VIKA_CONFIG.baseUrl}${endpoint}`;
        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${this.VIKA_CONFIG.token}`,
                'Content-Type': 'application/json'
            }
        };

        if (data && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`维格表API错误: ${result.message || response.statusText}`);
        }
        
        return result;
    }

    /**
     * 获取维格表记录
     */
    async getRecords(viewId = null) {
        try {
            const endpoint = `datasheets/${this.VIKA_CONFIG.datasheetId}/records`;
            const params = new URLSearchParams({
                fieldKey: this.VIKA_CONFIG.fieldKey
            });
            
            if (viewId || this.VIKA_CONFIG.viewId) {
                params.append('viewId', viewId || this.VIKA_CONFIG.viewId);
            }

            const response = await this.makeVikaRequest('GET', `${endpoint}?${params}`);
            return response.data?.records || [];
            
        } catch (error) {
            console.error('获取记录失败:', error);
            return [];
        }
    }

    /**
     * 创建记录
     */
    async createRecords(records) {
        try {
            const endpoint = `datasheets/${this.VIKA_CONFIG.datasheetId}/records`;
            const data = {
                records: records.map(record => ({
                    fields: record
                })),
                fieldKey: this.VIKA_CONFIG.fieldKey
            };

            const response = await this.makeVikaRequest('POST', endpoint, data);
            return response.data?.records || [];
            
        } catch (error) {
            console.error('创建记录失败:', error);
            throw error;
        }
    }

    /**
     * 更新记录
     */
    async updateRecords(updates) {
        try {
            const endpoint = `datasheets/${this.VIKA_CONFIG.datasheetId}/records`;
            const data = {
                records: updates,
                fieldKey: this.VIKA_CONFIG.fieldKey
            };

            const response = await this.makeVikaRequest('PATCH', endpoint, data);
            return response.data?.records || [];
            
        } catch (error) {
            console.error('更新记录失败:', error);
            throw error;
        }
    }

    /**
     * 删除记录
     */
    async deleteRecords(recordIds) {
        try {
            const endpoint = `datasheets/${this.VIKA_CONFIG.datasheetId}/records`;
            const params = new URLSearchParams();
            recordIds.forEach(id => params.append('recordIds', id));

            const response = await this.makeVikaRequest('DELETE', `${endpoint}?${params}`);
            return response.success;
            
        } catch (error) {
            console.error('删除记录失败:', error);
            throw error;
        }
    }

    /**
     * 获取激活码数据
     */
    async getActivationCodes() {
        if (!this.isOnline || !this.isInitialized) {
            return this.getLocalActivationCodes();
        }

        try {
            const records = await this.getRecords();
            const codes = {};
            
            records.forEach(record => {
                const fields = record.fields;
                if (fields.type === 'activation_code') {
                    codes[fields.code] = {
                        isUsed: fields.isUsed || false,
                        situation: fields.situation || '未使用',  // 读取situation字段
                        usedAt: fields.usedAt || null,
                        usedBy: fields.usedBy ? JSON.parse(fields.usedBy) : null,
                        createdAt: fields.createdAt || new Date().toISOString(),
                        recordId: record.recordId
                    };
                }
            });
            
            // 更新缓存
            this.cache.codes = codes;
            this.saveToLocalStorage('activationCodes', codes);
            
            return codes;
            
        } catch (error) {
            console.error('获取激活码失败:', error);
            return this.getLocalActivationCodes();
        }
    }

    /**
     * 获取日志数据
     */
    async getLogs() {
        if (!this.isOnline || !this.isInitialized) {
            return this.getLocalLogs();
        }

        try {
            const records = await this.getRecords();
            const logs = [];
            
            records.forEach(record => {
                const fields = record.fields;
                if (fields.type === 'log') {
                    logs.push({
                        timestamp: fields.timestamp,
                        code: fields.code,
                        action: fields.action,
                        deviceInfo: fields.deviceInfo ? JSON.parse(fields.deviceInfo) : null,
                        ipAddress: fields.ipAddress,
                        userAgent: fields.userAgent,
                        recordId: record.recordId
                    });
                }
            });
            
            // 按时间排序
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // 更新缓存
            this.cache.logs = logs;
            this.saveToLocalStorage('activationLogs', logs);
            
            return logs;
            
        } catch (error) {
            console.error('获取日志失败:', error);
            return this.getLocalLogs();
        }
    }

    /**
     * 使用激活码
     */
    async useActivationCode(code, deviceInfo) {
        if (!this.isOnline || !this.isInitialized) {
            return this.useActivationCodeLocal(code, deviceInfo);
        }

        try {
            // 获取当前激活码记录
            const codes = await this.getActivationCodes();
            const codeInfo = codes[code];
            
            if (!codeInfo) {
                throw new Error('激活码不存在');
            }
            
            if (codeInfo.isUsed) {
                throw new Error('激活码已被使用');
            }

            // 更新激活码状态
            const updateData = [{
                recordId: codeInfo.recordId,
                fields: {
                    isUsed: true,
                    situation: '已使用',  // 更新situation状态
                    usedAt: new Date().toISOString(),
                    usedBy: JSON.stringify(deviceInfo)
                }
            }];

            await this.updateRecords(updateData);
            
            // 添加使用日志
            await this.addLog(code, 'used', deviceInfo);
            
            // 更新本地缓存
            codes[code] = {
                ...codeInfo,
                isUsed: true,
                situation: '已使用',  // 更新situation状态
                usedAt: new Date().toISOString(),
                usedBy: deviceInfo
            };
            
            this.saveToLocalStorage('activationCodes', codes);
            
            return { success: true, message: '激活成功' };
            
        } catch (error) {
            console.error('使用激活码失败:', error);
            return this.useActivationCodeLocal(code, deviceInfo);
        }
    }

    /**
     * 重置激活码
     */
    async resetActivationCode(code) {
        if (!this.isOnline || !this.isInitialized) {
            return this.resetActivationCodeLocal(code);
        }

        try {
            const codes = await this.getActivationCodes();
            const codeInfo = codes[code];
            
            if (!codeInfo) {
                throw new Error('激活码不存在');
            }

            // 重置激活码状态
            const updateData = [{
                recordId: codeInfo.recordId,
                fields: {
                    isUsed: false,
                    situation: '未使用',  // 重置时更新situation状态
                    usedAt: null,
                    usedBy: null
                }
            }];

            await this.updateRecords(updateData);
            
            // 添加重置日志
            await this.addLog(code, 'reset', null);
            
            // 更新本地缓存
            codes[code] = {
                ...codeInfo,
                isUsed: false,
                situation: '未使用',  // 重置时更新situation状态
                usedAt: null,
                usedBy: null
            };
            
            this.saveToLocalStorage('activationCodes', codes);
            
            return { success: true, message: '重置成功' };
            
        } catch (error) {
            console.error('重置激活码失败:', error);
            return this.resetActivationCodeLocal(code);
        }
    }

    /**
     * 删除激活码
     */
    async deleteActivationCode(code) {
        if (!this.isOnline || !this.isInitialized) {
            return this.deleteActivationCodeLocal(code);
        }

        try {
            const codes = await this.getActivationCodes();
            const codeInfo = codes[code];
            
            if (!codeInfo) {
                throw new Error('激活码不存在');
            }

            // 删除记录
            await this.deleteRecords([codeInfo.recordId]);
            
            // 添加删除日志
            await this.addLog(code, 'deleted', null);
            
            // 更新本地缓存
            delete codes[code];
            this.saveToLocalStorage('activationCodes', codes);
            
            return { success: true, message: '删除成功' };
            
        } catch (error) {
            console.error('删除激活码失败:', error);
            return this.deleteActivationCodeLocal(code);
        }
    }

    /**
     * 创建新激活码
     */
    async createActivationCode(code) {
        if (!this.isOnline || !this.isInitialized) {
            return this.createActivationCodeLocal(code);
        }

        try {
            // 检查激活码是否已存在
            const codes = await this.getActivationCodes();
            if (codes[code]) {
                throw new Error('激活码已存在');
            }

            // 创建新记录
            const newRecord = [{
                type: 'activation_code',
                code: code,
                isUsed: false,
                usedAt: null,
                usedBy: null,
                createdAt: new Date().toISOString()
            }];

            const createdRecords = await this.createRecords(newRecord);
            
            if (createdRecords.length > 0) {
                // 添加创建日志
                await this.addLog(code, 'created', null);
                
                // 更新本地缓存
                codes[code] = {
                    isUsed: false,
                    usedAt: null,
                    usedBy: null,
                    createdAt: new Date().toISOString(),
                    recordId: createdRecords[0].recordId
                };
                
                this.saveToLocalStorage('activationCodes', codes);
                
                return { success: true, message: '创建成功' };
            }
            
            throw new Error('创建激活码失败');
            
        } catch (error) {
            console.error('创建激活码失败:', error);
            return this.createActivationCodeLocal(code);
        }
    }

    /**
     * 添加日志
     */
    async addLog(code, action, deviceInfo) {
        try {
            const logRecord = [{
                type: 'log',
                timestamp: new Date().toISOString(),
                code: code,
                action: action,
                deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
                ipAddress: await this.getClientIP(),
                userAgent: navigator.userAgent
            }];

            if (this.isOnline && this.isInitialized) {
                await this.createRecords(logRecord);
            }
            
            // 同时保存到本地
            this.addLocalLog(code, action, deviceInfo);
            
        } catch (error) {
            console.error('添加日志失败:', error);
            // 确保至少本地有日志
            this.addLocalLog(code, action, deviceInfo);
        }
    }

    /**
     * 初始化默认数据
     */
    async initializeDefaultData() {
        try {
            const defaultCodes = ['ADMIN2024', 'STUDENT001', 'TEACHER001'];
            const records = [];
            
            // 创建默认激活码
            defaultCodes.forEach(code => {
                records.push({
                    type: 'activation_code',
                    code: code,
                    isUsed: false,
                    situation: '未使用',  // 添加situation字段
                    usedAt: null,
                    usedBy: null,
                    createdAt: new Date().toISOString()
                });
            });
            
            await this.createRecords(records);
            console.log('✅ 默认激活码初始化完成');
            
        } catch (error) {
            console.error('初始化默认数据失败:', error);
        }
    }

    /**
     * 从维格表同步数据
     */
    async syncFromVika() {
        try {
            console.log('🔄 从维格表同步数据...');
            
            await Promise.all([
                this.getActivationCodes(),
                this.getLogs()
            ]);
            
            this.cache.lastSync = new Date().toISOString();
            console.log('✅ 数据同步完成');
            
            return { success: true, message: '同步成功' };
            
        } catch (error) {
            console.error('同步失败:', error);
            return { success: false, message: '同步失败: ' + error.message };
        }
    }

    /**
     * 推送数据到维格表
     */
    async syncToVika() {
        try {
            console.log('🔄 推送数据到维格表...');
            
            // 获取本地数据
            const localCodes = this.getLocalActivationCodes();
            const localLogs = this.getLocalLogs();
            
            // 获取云端数据
            const cloudCodes = await this.getActivationCodes();
            
            // 找出需要同步的数据
            const toSync = [];
            
            for (const [code, info] of Object.entries(localCodes)) {
                if (!cloudCodes[code] || 
                    cloudCodes[code].usedAt !== info.usedAt ||
                    cloudCodes[code].isUsed !== info.isUsed) {
                    
                    if (cloudCodes[code]) {
                        // 更新现有记录
                        toSync.push({
                            recordId: cloudCodes[code].recordId,
                            fields: {
                                isUsed: info.isUsed,
                                usedAt: info.usedAt,
                                usedBy: info.usedBy ? JSON.stringify(info.usedBy) : null
                            }
                        });
                    } else {
                        // 创建新记录
                        await this.createActivationCode(code);
                    }
                }
            }
            
            if (toSync.length > 0) {
                await this.updateRecords(toSync);
            }
            
            console.log('✅ 数据推送完成');
            return { success: true, message: '推送成功' };
            
        } catch (error) {
            console.error('推送失败:', error);
            return { success: false, message: '推送失败: ' + error.message };
        }
    }

    /**
     * 强制双向同步
     */
    async forceSync() {
        try {
            console.log('🔄 执行强制同步...');
            
            // 先从云端拉取
            const pullResult = await this.syncFromVika();
            
            // 再推送到云端
            const pushResult = await this.syncToVika();
            
            if (pullResult.success && pushResult.success) {
                return { success: true, message: '强制同步完成' };
            } else {
                return { success: false, message: '部分同步失败' };
            }
            
        } catch (error) {
            console.error('强制同步失败:', error);
            return { success: false, message: '强制同步失败: ' + error.message };
        }
    }

    // ========== 本地存储方法 ==========

    /**
     * 降级到本地存储
     */
    fallbackToLocal() {
        console.log('⚠️ 降级到本地存储模式');
        this.isInitialized = false;
        
        // 触发本地就绪事件
        window.dispatchEvent(new CustomEvent('vikaStorageReady', {
            detail: { storage: this, isLocal: true }
        }));
    }

    getLocalActivationCodes() {
        const codes = localStorage.getItem('activationCodes');
        return codes ? JSON.parse(codes) : {
            'ADMIN2024': { isUsed: false, usedAt: null, usedBy: null, createdAt: new Date().toISOString() },
            'STUDENT001': { isUsed: false, usedAt: null, usedBy: null, createdAt: new Date().toISOString() },
            'TEACHER001': { isUsed: false, usedAt: null, usedBy: null, createdAt: new Date().toISOString() }
        };
    }

    getLocalLogs() {
        const logs = localStorage.getItem('activationLogs');
        return logs ? JSON.parse(logs) : [];
    }

    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('保存到本地存储失败:', error);
        }
    }

    async useActivationCodeLocal(code, deviceInfo) {
        const codes = this.getLocalActivationCodes();
        const codeInfo = codes[code];
        
        if (!codeInfo) {
            throw new Error('激活码不存在');
        }
        
        if (codeInfo.isUsed) {
            throw new Error('激活码已被使用');
        }

        codes[code] = {
            ...codeInfo,
            isUsed: true,
            situation: '已使用',  // 更新situation状态
            usedAt: new Date().toISOString(),
            usedBy: deviceInfo
        };
        
        this.saveToLocalStorage('activationCodes', codes);
        this.addLocalLog(code, 'used', deviceInfo);
        
        return { success: true, message: '激活成功（本地模式）' };
    }

    async resetActivationCodeLocal(code) {
        const codes = this.getLocalActivationCodes();
        if (!codes[code]) {
            throw new Error('激活码不存在');
        }

        codes[code] = {
            ...codes[code],
            isUsed: false,
            situation: '未使用',  // 重置时更新situation状态
            usedAt: null,
            usedBy: null
        };
        
        this.saveToLocalStorage('activationCodes', codes);
        this.addLocalLog(code, 'reset', null);
        
        return { success: true, message: '重置成功（本地模式）' };
    }

    async deleteActivationCodeLocal(code) {
        const codes = this.getLocalActivationCodes();
        if (!codes[code]) {
            throw new Error('激活码不存在');
        }

        delete codes[code];
        this.saveToLocalStorage('activationCodes', codes);
        this.addLocalLog(code, 'deleted', null);
        
        return { success: true, message: '删除成功（本地模式）' };
    }

    async createActivationCodeLocal(code) {
        const codes = this.getLocalActivationCodes();
        if (codes[code]) {
            throw new Error('激活码已存在');
        }

        codes[code] = {
            isUsed: false,
            usedAt: null,
            usedBy: null,
            createdAt: new Date().toISOString()
        };
        
        this.saveToLocalStorage('activationCodes', codes);
        this.addLocalLog(code, 'created', null);
        
        return { success: true, message: '创建成功（本地模式）' };
    }

    addLocalLog(code, action, deviceInfo) {
        const logs = this.getLocalLogs();
        logs.unshift({
            timestamp: new Date().toISOString(),
            code: code,
            action: action,
            deviceInfo: deviceInfo,
            ipAddress: 'unknown',
            userAgent: navigator.userAgent
        });
        
        // 限制日志数量
        if (logs.length > 1000) {
            logs.splice(1000);
        }
        
        this.saveToLocalStorage('activationLogs', logs);
    }

    // ========== 工具方法 ==========

    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return 'unknown';
        }
    }

    getConnectionStatus() {
        return {
            isOnline: this.isOnline,
            isInitialized: this.isInitialized,
            lastSync: this.cache.lastSync,
            storageType: this.isInitialized ? 'vika' : 'local'
        };
    }
}

// 创建全局实例
let vikaCloudStorage;

// 初始化云存储
function initializeVikaStorage() {
    if (!vikaCloudStorage) {
        vikaCloudStorage = new VikaCloudStorage();
    }
    return vikaCloudStorage;
}

// 等待云存储就绪
function waitForVikaStorage() {
    return new Promise((resolve) => {
        if (vikaCloudStorage && vikaCloudStorage.isInitialized) {
            resolve(vikaCloudStorage);
        } else {
            window.addEventListener('vikaStorageReady', (event) => {
                resolve(event.detail.storage);
            }, { once: true });
        }
    });
}

// 自动初始化
if (typeof window !== 'undefined') {
    initializeVikaStorage();
}

console.log('📦 维格表云存储系统已加载 v5.0.0');

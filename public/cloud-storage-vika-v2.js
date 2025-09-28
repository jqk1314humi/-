/**
 * 维格表云存储系统 v3.0
 * 简化的日志管理存储系统
 * @author jqk开发团�? * @version 3.0.0
 */

class VikaCloudStorage {
    constructor() {
        // 维格表配�?        this.VIKA_CONFIG = {
            token: "uskNUrvWvJoD3VuQ5zW7GYH",
            baseUrl: "https://api.vika.cn/fusion/v1/",
            datasheetId: "dstVZvdm5sqCs9NFY4",
            fieldKey: "name"
        };

        this.isOnline = navigator.onLine;
        this.isInitialized = false;

        // 数据缓存（只保留日志�?        this.cache = {
            logs: []
        };

        // 初始化维格表连接
        this.initializeVika();
    }

    async initializeVika() {
        try {
            console.log('🔗 连接维格�?..');

            // 测试连接
            const testResponse = await this.makeVikaRequest('GET', 'datasheets');
            if (testResponse.success) {
                console.log('�?维格表连接成�?);
                this.isInitialized = true;

                window.dispatchEvent(new CustomEvent('vikaStorageReady', {
                    detail: { storage: this, isLocal: false }
                }));
            } else {
                throw new Error('连接测试失败');
            }
        } catch (error) {
            console.error('�?维格表初始化失败:', error);
            this.isInitialized = false;

            window.dispatchEvent(new CustomEvent('vikaStorageReady', {
                detail: { storage: this, isLocal: true }
            }));
        }
    }

    async makeVikaRequest(method, endpoint = '', data = null, params = null) {
        try {
            let url = `${this.VIKA_CONFIG.baseUrl}${endpoint}`;

            const headers = {
                'Authorization': `Bearer ${this.VIKA_CONFIG.token}`,
                'Content-Type': 'application/json'
            };

            const config = {
                method: method,
                headers: headers
            };

            if (data && (method === 'POST' || method === 'PATCH')) {
                config.body = JSON.stringify(data);
            }

            if (params) {
                const queryParams = new URLSearchParams();
                for (const [key, value] of Object.entries(params)) {
                    queryParams.append(key, value);
                }
                url += `?${queryParams}`;
            }

            const response = await fetch(url, config);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${result.message || 'Unknown error'}`);
            }

            return { success: true, data: result.data || result };
        } catch (error) {
            console.error('维格表请求失�?', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取日志数据
     */
    async getLogs() {
        try {
            if (!this.isOnline || !this.isInitialized) {
                return this.getLocalLogs();
            }

            console.log('📋 从维格表获取日志数据...');

            const params = {
                fieldKey: this.VIKA_CONFIG.fieldKey
            };

            const response = await this.makeVikaRequest('GET', `datasheets/${this.VIKA_CONFIG.datasheetId}/records`, null, params);

            if (!response.success) {
                throw new Error('获取日志失败');
            }

            const logs = [];

            for (const record of response.data.records || []) {
                const fields = record.fields;

                // 检查是否是日志记录（有timestamp和action字段�?                if (fields.timestamp && fields.action) {
                    logs.push({
                        id: record.recordId,
                        timestamp: fields.timestamp,
                        action: fields.action,
                        code: fields.code || '系统',
                        deviceInfo: fields.deviceInfo ? JSON.parse(fields.deviceInfo) : null
                    });
                }
            }

            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            console.log('📋 获取到日志数�?', logs.length);

            // 更新缓存
            this.cache.logs = logs;
            this.saveToLocalStorage('activationLogs', logs);

            return logs;

        } catch (error) {
            console.error('�?获取日志失败:', error);
            return this.getLocalLogs();
        }
    }

    getLocalLogs() {
        try {
            const logs = JSON.parse(localStorage.getItem('activationLogs') || '[]');
            console.log('📋 从本地获取日�?', logs.length, '�?);
            return logs;
        } catch (error) {
            console.error('读取本地日志失败:', error);
            return [];
        }
    }

    /**
     * 添加日志
     */
    async addLog(action, details = null) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                action: action,
                details: details ? JSON.stringify(details) : null
            };

            if (this.isOnline && this.isInitialized) {
                const recordData = [{
                    fields: {
                        timestamp: logEntry.timestamp,
                        action: logEntry.action,
                        details: logEntry.details
                    }
                }];

                const response = await this.makeVikaRequest('POST', `datasheets/${this.VIKA_CONFIG.datasheetId}/records`, recordData);

                if (response.success) {
                    console.log('�?日志已保存到云端');
                } else {
                    console.warn('⚠️ 云端日志保存失败，将保存在本�?);
                }
            }

            // 同时保存到本�?            this.addLocalLog(logEntry);

        } catch (error) {
            console.error('添加日志失败:', error);
            // 确保至少本地有日�?            this.addLocalLog(logEntry);
        }
    }

    addLocalLog(logEntry) {
        try {
            const logs = this.getLocalLogs();
            logs.unshift(logEntry); // 添加到开�?
            // 只保留最�?000条日�?            if (logs.length > 1000) {
                logs.splice(1000);
            }

            localStorage.setItem('activationLogs', JSON.stringify(logs));
            this.cache.logs = logs;

            console.log('💾 日志已保存到本地');
        } catch (error) {
            console.error('本地日志保存失败:', error);
        }
    }

    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('保存到本地存储失�?', error);
        }
    }

    getConnectionStatus() {
        return {
            isOnline: this.isOnline,
            isInitialized: this.isInitialized,
            lastSync: this.cache.lastSync
        };
    }
}

// 创建全局实例
let vikaCloudStorage;
function initializeVikaStorage() {
    if (!vikaCloudStorage) {
        vikaCloudStorage = new VikaCloudStorage();
    }
    return vikaCloudStorage;
}

// 自动初始�?initializeVikaStorage();

    /**
     * 初始化维格表连接
     */
    async initializeVika() {
        try {
            console.log('🔧 初始化维格表云存�?..');
            
            // 测试连接 - 获取记录

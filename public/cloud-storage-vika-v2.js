/**
 * 维格表云存储系统 v2.0
 * 使用标准维格表API实现激活码和日志管理
 * @author jqk开发团队
 * @version 2.0.0
 */

class VikaCloudStorage {
    constructor() {
        // 维格表配置 - 双表系统
        this.VIKA_CONFIG = {
            token: "uskNUrvWvJoD3VuQ5zW7GYH",
            baseUrl: "https://api.vika.cn/fusion/v1/",
            // 激活码审核维格表（原始激活码存储）
            approvalDatasheetId: "dstVZvdm5sqCs9NFY4",
            // 激活码使用记录维格表（记录已使用的激活码）
            usageDatasheetId: "dstz67JjuBawS8Zam0",
            fieldKey: "name" // 使用字段名而不是字段ID
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
            
            // 测试连接 - 获取记录
            const testResponse = await this.getRecords();
            console.log('✅ 维格表连接成功，获取到', testResponse.length, '条记录');
            
            this.isInitialized = true;
            
            // 初始化数据结构
            await this.initializeDataStructure();
            
            // 触发就绪事件
            window.dispatchEvent(new CustomEvent('vikaStorageReady', {
                detail: { storage: this }
            }));
            
        } catch (error) {
            console.error('❌ 维格表初始化失败:', error);
            this.fallbackToLocal();
        }
    }

    /**
     * 发起维格表API请求
     */
    async makeVikaRequest(method, endpoint = '', data = null, params = null, datasheetId = null) {
        // 默认使用审核维格表，如果需要使用记录维格表则传入datasheetId参数
        const targetDatasheetId = datasheetId || this.VIKA_CONFIG.approvalDatasheetId;
        let url = `${this.VIKA_CONFIG.baseUrl}datasheets/${targetDatasheetId}/records`;
        
        if (endpoint) {
            url += `/${endpoint}`;
        }
        
        if (params) {
            const urlParams = new URLSearchParams(params);
            url += `?${urlParams}`;
        }

        const options = {
            method: method,
            headers: new Headers({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.VIKA_CONFIG.token}`
            })
        };

        if (data && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        console.log(`🌐 维格表API请求: ${method} ${url}`);
        
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`维格表API错误 (${response.status}): ${result.message || response.statusText}`);
        }
        
        return result;
    }

    /**
     * 获取维格表记录
     */
    async getRecords(filterFormula = null) {
        try {
            console.log('🔍 开始获取维格表记录...');
            let allRecords = [];
            let pageToken = null;
            let pageCount = 0;
            
            do {
                const params = {
                    fieldKey: this.VIKA_CONFIG.fieldKey,
                    pageSize: 1000 // 设置较大的页面大小
                };
                
                if (filterFormula) {
                    params.filterByFormula = filterFormula;
                }
                
                if (pageToken) {
                    params.pageToken = pageToken;
                }

                console.log(`📄 获取第${pageCount + 1}页数据，参数:`, params);
                const response = await this.makeVikaRequest('GET', '', null, params);
                console.log(`📄 第${pageCount + 1}页API原始响应:`, response);
                
                if (response.data && response.data.records) {
                    const records = response.data.records;
                    allRecords = allRecords.concat(records);
                    console.log(`✅ 第${pageCount + 1}页获取到 ${records.length} 条记录`);
                    
                    // 检查是否有下一页
                    pageToken = response.data.pageToken;
                    pageCount++;
                    
                    // 防止无限循环，最多获取10页
                    if (pageCount >= 10) {
                        console.warn('⚠️ 已达到最大页数限制(10页)，停止获取');
                        break;
                    }
                } else {
                    console.log('📄 没有更多数据');
                    break;
                }
                
            } while (pageToken);
            
            console.log(`🎯 总共获取到 ${allRecords.length} 条记录，共 ${pageCount} 页`);
            return allRecords;
            
        } catch (error) {
            console.error('❌ 获取记录失败:', error);
            return [];
        }
    }

    /**
     * 创建记录
     */
    async createRecords(records) {
        try {
            const data = {
                records: records.map(record => ({
                    fields: record
                })),
                fieldKey: this.VIKA_CONFIG.fieldKey
            };

            const response = await this.makeVikaRequest('POST', '', data);
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
            const data = {
                records: updates,
                fieldKey: this.VIKA_CONFIG.fieldKey
            };

            const response = await this.makeVikaRequest('PATCH', '', data);
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
            const params = {};
            recordIds.forEach(id => {
                if (!params.recordIds) params.recordIds = [];
                params.recordIds.push(id);
            });
            
            // 将数组转换为查询参数
            const queryParams = new URLSearchParams();
            recordIds.forEach(id => queryParams.append('recordIds', id));

            const response = await this.makeVikaRequest('DELETE', '', null, queryParams);
            return response.success !== false;
            
        } catch (error) {
            console.error('删除记录失败:', error);
            throw error;
        }
    }

    /**
     * 初始化数据结构
     */
    async initializeDataStructure() {
        try {
            console.log('🔧 初始化数据结构...');
            
            // 获取现有记录
            const records = await this.getRecords();
            console.log('📊 现有记录数量:', records.length);
            
            // 检查是否有激活码记录（通过查找包含激活码格式的字段）
            let hasActivationCodes = false;
            
            if (records.length > 0) {
                records.forEach(record => {
                    const fields = record.fields;
                    const possibleCodeFields = ['code', 'Code', 'CODE', 'activationCode', 'activation_code'];
                    
                    for (const fieldName of possibleCodeFields) {
                        if (fields[fieldName] && typeof fields[fieldName] === 'string') {
                            if (/^[A-Za-z0-9]{6,}$/.test(fields[fieldName])) {
                                hasActivationCodes = true;
                                console.log('✅ 发现激活码记录:', fields[fieldName]);
                                break;
                            }
                        }
                    }
                });
            }
            
            if (!hasActivationCodes) {
                console.log('📝 未发现激活码记录，初始化默认激活码...');
                await this.initializeDefaultData();
            } else {
                console.log('✅ 已存在激活码记录，跳过初始化');
            }
            
            // 同步到缓存
            await this.syncFromVika();
            
        } catch (error) {
            console.error('❌ 初始化数据结构失败:', error);
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
            console.log('🔍 从维格表获取激活码数据...');
            
            // 不使用过滤公式，获取所有记录
            const records = await this.getRecords();
            console.log('📊 获取到记录数量:', records.length);
            
            const codes = {};
            
            records.forEach((record, index) => {
                const fields = record.fields;
                
                // 只在前5条记录显示详细信息，避免日志过多
                if (index < 5) {
                    console.log(`记录${index + 1}:`, fields);
                }
                
                // 尝试多种可能的字段名来查找激活码
                let codeValue = null;
                let foundFieldName = null;
                const possibleCodeFields = ['code', 'Code', 'CODE', 'activationCode', 'activation_code'];
                
                for (const fieldName of possibleCodeFields) {
                    if (fields[fieldName] && typeof fields[fieldName] === 'string') {
                        // 检查是否像激活码（字母数字组合，长度大于6）
                        if (/^[A-Za-z0-9]{6,}$/.test(fields[fieldName])) {
                            codeValue = fields[fieldName];
                            foundFieldName = fieldName;
                            console.log(`✅ 在字段"${fieldName}"中找到激活码:`, codeValue);
                            break;
                        }
                    }
                }
                
                if (codeValue) {
                    codes[codeValue] = {
                        isUsed: this.parseBoolean(fields.isUsed || fields.IsUsed || fields.used || fields.Used) || false,
                        usedAt: fields.usedAt || fields.UsedAt || fields.used_at || null,
                        usedBy: this.parseJSON(fields.usedBy || fields.UsedBy || fields.used_by) || null,
                        situation: fields.situation || fields.Situation || fields.SITUATION ||
                                  fields.status || fields.Status || fields.STATUS || '',  // 读取多种situation字段
                        createdAt: fields.createdAt || fields.CreatedAt || fields.created_at || new Date().toISOString(),
                        recordId: record.recordId,
                        sourceField: foundFieldName // 记录来源字段名
                    };
                    
                    // 只显示前几个激活码的详细信息
                    if (Object.keys(codes).length <= 5) {
                        console.log(`📝 激活码 ${codeValue} 数据:`, codes[codeValue]);
                    }
                } else {
                    // 如果没找到激活码，记录一下（只显示前几条）
                    if (index < 3) {
                        console.log(`⚠️ 记录${index + 1}中未找到有效的激活码字段`);
                    }
                }
            });
            
            console.log('🎯 解析完成，激活码总数:', Object.keys(codes).length);
            console.log('📋 激活码列表:', Object.keys(codes));
            
            // 更新缓存
            this.cache.codes = codes;
            this.saveToLocalStorage('activationCodes', codes);
            
            return codes;
            
        } catch (error) {
            console.error('❌ 获取激活码失败:', error);
            return this.getLocalActivationCodes();
        }
    }

    /**
     * 测试不同的fieldKey设置
     */
    async testDifferentFieldKeys() {
        console.log('🧪 测试不同的fieldKey设置...');
        
        const fieldKeyOptions = ['name', 'id', undefined];
        const results = {};
        
        for (const fieldKey of fieldKeyOptions) {
            try {
                console.log(`🔍 测试fieldKey: ${fieldKey || 'undefined'}`);
                
                const params = {
                    pageSize: 100
                };
                
                if (fieldKey) {
                    params.fieldKey = fieldKey;
                }
                
                const response = await this.makeVikaRequest('GET', '', null, params);
                
                if (response.data && response.data.records) {
                    results[fieldKey || 'undefined'] = {
                        recordCount: response.data.records.length,
                        hasPageToken: !!response.data.pageToken,
                        sampleRecord: response.data.records[0] || null
                    };
                    
                    console.log(`✅ fieldKey=${fieldKey || 'undefined'}: ${response.data.records.length}条记录`);
                    console.log(`📄 样本记录:`, response.data.records[0]);
                } else {
                    results[fieldKey || 'undefined'] = { error: '无数据' };
                    console.log(`❌ fieldKey=${fieldKey || 'undefined'}: 无数据`);
                }
                
            } catch (error) {
                results[fieldKey || 'undefined'] = { error: error.message };
                console.error(`❌ fieldKey=${fieldKey || 'undefined'}失败:`, error);
            }
        }
        
        console.log('🧪 fieldKey测试结果:', results);
        return results;
    }

    /**
     * 调试维格表数据结构
     */
    async debugVikaStructure() {
        try {
            console.log('🔍 开始调试维格表数据结构...');
            
            const records = await this.getRecords();
            console.log(`📊 总记录数: ${records.length}`);
            
            if (records.length === 0) {
                console.log('❌ 没有找到任何记录');
                return;
            }
            
            // 分析字段结构
            const fieldAnalysis = {};
            const sampleValues = {};
            
            records.forEach((record, index) => {
                if (record.fields) {
                    Object.keys(record.fields).forEach(fieldName => {
                        if (!fieldAnalysis[fieldName]) {
                            fieldAnalysis[fieldName] = {
                                count: 0,
                                types: new Set(),
                                sampleValues: []
                            };
                        }
                        
                        const value = record.fields[fieldName];
                        fieldAnalysis[fieldName].count++;
                        fieldAnalysis[fieldName].types.add(typeof value);
                        
                        // 保存前3个样本值
                        if (fieldAnalysis[fieldName].sampleValues.length < 3) {
                            fieldAnalysis[fieldName].sampleValues.push(value);
                        }
                    });
                }
            });
            
            console.log('📋 字段分析结果:');
            Object.entries(fieldAnalysis).forEach(([fieldName, analysis]) => {
                console.log(`  字段: ${fieldName}`);
                console.log(`    出现次数: ${analysis.count}/${records.length}`);
                console.log(`    数据类型: ${Array.from(analysis.types).join(', ')}`);
                console.log(`    样本值: ${JSON.stringify(analysis.sampleValues)}`);
                
                // 检查是否可能是激活码字段
                const isPossibleCodeField = analysis.sampleValues.some(value => 
                    typeof value === 'string' && /^[A-Za-z0-9]{6,}$/.test(value)
                );
                if (isPossibleCodeField) {
                    console.log(`    ✅ 可能是激活码字段`);
                }
            });
            
            return fieldAnalysis;
            
        } catch (error) {
            console.error('❌ 调试维格表结构失败:', error);
            return null;
        }
    }

    /**
     * 解析布尔值
     */
    parseBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lower = value.toLowerCase();
            return lower === 'true' || lower === '1' || lower === 'yes';
        }
        return false;
    }
    
    /**
     * 解析JSON字符串
     */
    parseJSON(value) {
        if (!value) return null;
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch (error) {
                console.warn('JSON解析失败:', value, error);
                return null;
            }
        }
        return null;
    }

    /**
     * 获取日志数据
     */
    async getLogs() {
        if (!this.isOnline || !this.isInitialized) {
            return this.getLocalLogs();
        }

        try {
            // 使用过滤公式只获取日志记录
            const filterFormula = '{type} = "log"';
            const records = await this.getRecords(filterFormula);
            const logs = [];
            
            records.forEach(record => {
                const fields = record.fields;
                if (fields.timestamp) {
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

            // 更新激活码状态 - 尝试多种字段名
            const updateFields = {};
            
            // 尝试不同的字段名来更新状态
            const usedFields = ['isUsed', 'IsUsed', 'used', 'Used'];
            const usedAtFields = ['usedAt', 'UsedAt', 'used_at', 'UsedAt'];
            const usedByFields = ['usedBy', 'UsedBy', 'used_by', 'UsedBy'];
            
            // 设置已使用状态
            updateFields[usedFields[0]] = true;
            updateFields[usedAtFields[0]] = new Date().toISOString();
            updateFields[usedByFields[0]] = JSON.stringify(deviceInfo);

            // 尝试多种situation字段名
            const situationFields = ['situation', 'Situation', 'SITUATION', 'status', 'Status', 'STATUS'];
            updateFields[situationFields[0]] = 1;  // 设置situation为1表示已使用
            
            console.log('🔄 更新激活码状态:', code, updateFields);
            
            const updateData = [{
                recordId: codeInfo.recordId,
                fields: updateFields
            }];

            await this.updateRecords(updateData);
            
            // 添加使用日志
            await this.addLog(code, 'used', deviceInfo);
            
            // 更新本地缓存
            codes[code] = {
                ...codeInfo,
                isUsed: true,
                usedAt: new Date().toISOString(),
                usedBy: deviceInfo,
                situation: 1  // 本地缓存也设置situation为1
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
                    usedAt: null,
                    usedBy: null,
                    situation: '',  // 重置时将situation设为空
                    Situation: '',  // 尝试多种字段名
                    SITUATION: '',
                    status: '',
                    Status: '',
                    STATUS: ''
                }
            }];

            await this.updateRecords(updateData);
            
            // 添加重置日志
            await this.addLog(code, 'reset', null);
            
            // 更新本地缓存
            codes[code] = {
                ...codeInfo,
                isUsed: false,
                usedAt: null,
                usedBy: null,
                situation: ''  // 本地缓存也重置situation为空
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
            console.log('🔧 初始化默认激活码数据...');
            
            const defaultCodes = ['ADMIN2024', 'STUDENT001', 'TEACHER001'];
            const records = [];
            
            // 创建默认激活码记录
            defaultCodes.forEach(code => {
                records.push({
                    code: code,  // 使用 code 字段而不是 type
                    isUsed: false,
                    usedAt: '',
                    usedBy: '',
                    situation: '',  // 新增situation字段，默认为空
                    createdAt: new Date().toISOString()
                });
            });
            
            console.log('📝 准备创建激活码记录:', records);
            
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
            'ADMIN2024': { isUsed: false, usedAt: null, usedBy: null, situation: '', createdAt: new Date().toISOString() },
            'STUDENT001': { isUsed: false, usedAt: null, usedBy: null, situation: '', createdAt: new Date().toISOString() },
            'TEACHER001': { isUsed: false, usedAt: null, usedBy: null, situation: '', createdAt: new Date().toISOString() },
            'j6si0f26cig0': { isUsed: false, usedAt: null, usedBy: null, situation: '', createdAt: new Date().toISOString() },
            'polex311eo4e': { isUsed: false, usedAt: null, usedBy: null, situation: '', createdAt: new Date().toISOString() },
            'gwhfntmgol8l': { isUsed: false, usedAt: null, usedBy: null, situation: '', createdAt: new Date().toISOString() },
            'sej5z1hhleqf': { isUsed: false, usedAt: null, usedBy: null, situation: '', createdAt: new Date().toISOString() },
            '2ta1zchbuj8v': { isUsed: false, usedAt: null, usedBy: null, situation: '', createdAt: new Date().toISOString() },
            '6uwqby0nk0fv': { isUsed: false, usedAt: null, usedBy: null, situation: '', createdAt: new Date().toISOString() },
            'jza4m0okaflj': { isUsed: false, usedAt: null, usedBy: null, situation: '', createdAt: new Date().toISOString() },
            '5n51yax303tm': { isUsed: false, usedAt: null, usedBy: null, situation: '', createdAt: new Date().toISOString() },
            'by8fahc1taa3': { isUsed: false, usedAt: null, usedBy: null, situation: '', createdAt: new Date().toISOString() },
            'v61g1yyvbgg6': { isUsed: false, usedAt: null, usedBy: null, situation: '', createdAt: new Date().toISOString() }
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
            usedAt: new Date().toISOString(),
            usedBy: deviceInfo,
            situation: 1  // 本地存储也设置situation为1
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
            usedAt: null,
            usedBy: null,
            situation: ''  // 重置时将situation设为空
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

console.log('📦 维格表云存储系统已加载 v2.0.0 - 标准API版本');

/**
 * 维格表API直接调用模块
 * 模仿cloud-storage-vika-v2.js的实现方式
 * 直接通过fetch调用维格表API，不依赖SDK
 */

class VikaAPIDirect {
    constructor() {
        // 维格表配置 - 双表系统
        this.VIKA_CONFIG = {
            token: "uskNUrvWvJoD3VuQ5zW7GYH",
            baseUrl: "https://api.vika.cn/fusion/v1/",
            // 激活码审核维格表（原始激活码 stores） - 使用'code'列名
            approvalDatasheetId: "dstVZvdm5sqCs9NFY4",
            // 激活码使用记录维格表（记录已使用的激活码） - 使用'codeused'列名
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

        // 初始化
        this.initialize();

        // 监听网络状态
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 网络连接已恢复');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('🌐 网络连接已断开');
        });
    }

    /**
     * 初始化API连接
     */
    async initialize() {
        try {
            console.log('🔧 初始化维格表API直接调用模块...');

            // 测试连接 - 获取记录
            const testResponse = await this.getRecords();
            console.log('✅ 维格表API连接成功，获取到', testResponse.length, '条记录');

            this.isInitialized = true;

            // 初始化数据结构
            await this.initializeDataStructure();

            console.log('✅ 维格表API模块初始化完成');

        } catch (error) {
            console.error('❌ 维格表API初始化失败:', error);
            this.isInitialized = false;
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

        } catch (error) {
            console.error('❌ 初始化数据结构失败:', error);
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
                    type: 'activation_code',
                    code: code,  // 使用 code 字段而不是 type
                    isUsed: false,
                    usedAt: null,
                    usedBy: null,
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
     * 获取激活码数据
     */
    async getActivationCodes() {
        try {
            if (!this.isOnline || !this.isInitialized) {
                console.log('⚠️ API未初始化或离线，返回本地数据');
                return this.getLocalActivationCodes();
            }
            console.log('🔍 从维格表获取激活码数据（双表系统）...');

            // 1. 获取审核表的激活码
            const approvalRecords = await this.getRecords();
            console.log('📊 审核表获取到记录数量:', approvalRecords.length);

            // 2. 获取使用记录表的已使用激活码
            const usedCodes = new Set();
            try {
                const usageRecords = await this.getUsageRecords();
                console.log('📊 使用记录表获取到记录数量:', usageRecords.length);

                usageRecords.forEach((record) => {
                    const fields = record.fields;
                    // 使用记录表使用的列名是codeused
                    const possibleCodeFields = ['codeused', 'Codeused', 'CODEUSED', 'codeUsed'];
                    for (const fieldName of possibleCodeFields) {
                        if (fields[fieldName] && typeof fields[fieldName] === 'string') {
                            if (/^[A-Za-z0-9]{6,}$/.test(fields[fieldName])) {
                                usedCodes.add(fields[fieldName]);
                            }
                        }
                    }
                });
            } catch (error) {
                console.log('⚠️ 获取使用记录表失败，继续使用审核表数据:', error.message);
            }

            console.log('📋 已使用激活码列表:', Array.from(usedCodes));

            const codes = {};

            // 3. 处理审核表的激活码
            approvalRecords.forEach((record, index) => {
                const fields = record.fields;

                // 只在前5条记录显示详细信息，避免日志过多
                if (index < 5) {
                    console.log(`审核表记录${index + 1}:`, fields);
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
                            console.log(`✅ 在审核表字段"${fieldName}"中找到激活码:`, codeValue);
                            break;
                        }
                    }
                }

                if (codeValue) {
                    // 检查是否在使用记录表中（已使用）
                    const isUsedInUsageTable = usedCodes.has(codeValue);

                    codes[codeValue] = {
                        isUsed: this.parseBoolean(fields.isUsed || fields.IsUsed || fields.used || fields.Used) || isUsedInUsageTable,
                        usedAt: fields.usedAt || fields.UsedAt || fields.used_at || null,
                        usedBy: this.parseJSON(fields.usedBy || fields.UsedBy || fields.used_by) || null,
                        situation: fields.situation || fields.Situation || fields.SITUATION ||
                                  fields.status || fields.Status || fields.STATUS || (isUsedInUsageTable ? '1' : ''),  // 读取多种situation字段
                        createdAt: fields.createdAt || fields.CreatedAt || fields.created_at || new Date().toISOString(),
                        recordId: record.recordId,
                        sourceField: foundFieldName, // 记录来源字段名
                        usedInUsageTable: isUsedInUsageTable // 标记是否在使用记录表中找到
                    };

                    // 只显示前几个激活码的详细信息
                    if (Object.keys(codes).length <= 5) {
                        console.log(`📝 激活码 ${codeValue} 数据:`, codes[codeValue]);
                    }
                } else {
                    // 如果没找到激活码，记录一下（只显示前几条）
                    if (index < 3) {
                        console.log(`⚠️ 审核表记录${index + 1}中未找到有效的激活码字段`);
                    }
                }
            });

            console.log('🎯 双表解析完成，激活码总数:', Object.keys(codes).length);
            console.log('📋 激活码列表:', Object.keys(codes));
            console.log('📊 统计:', {
                total: Object.keys(codes).length,
                used: Object.values(codes).filter(c => c.isUsed).length,
                unused: Object.values(codes).filter(c => !c.isUsed).length,
                usedInUsageTable: Object.values(codes).filter(c => c.usedInUsageTable).length
            });

            // 更新缓存
            this.cache.codes = codes;

            return codes;

        } catch (error) {
            console.error('❌ 获取激活码失败:', error);
            return this.getLocalActivationCodes();
        }
    }

    /**
     * 获取使用记录维格表数据
     */
    async getUsageRecords() {
        try {
            console.log('📖 从使用记录维格表获取数据...');

            let allRecords = [];
            let pageToken = null;
            let pageCount = 0;

            do {
                const params = {
                    pageSize: 1000
                };

                if (pageToken) {
                    params.pageToken = pageToken;
                }

                console.log(`📄 获取使用记录表第${pageCount + 1}页数据，参数:`, params);

                // 构造URL和请求参数
                const url = `${this.VIKA_CONFIG.baseUrl}datasheets/${this.VIKA_CONFIG.usageDatasheetId}/records`;
                const queryString = new URLSearchParams(params).toString();
                const fullUrl = queryString ? `${url}?${queryString}` : url;

                console.log(`📄 发送GET请求到: ${fullUrl}`);

                const response = await fetch(fullUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.VIKA_CONFIG.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ 获取使用记录表HTTP请求失败:', response.status, errorText);
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                const responseData = await response.json();
                console.log(`📄 使用记录表第${pageCount + 1}页API原始响应:`, responseData);

                if (responseData.data && responseData.data.records) {
                    const records = responseData.data.records;
                    allRecords = allRecords.concat(records);
                    console.log(`✅ 使用记录表第${pageCount + 1}页获取到 ${records.length} 条记录`);

                    pageToken = responseData.data.pageToken;
                    pageCount++;

                    if (pageCount >= 10) {
                        console.warn('⚠️ 使用记录表已达到最大页数限制(10页)，停止获取');
                        break;
                    }
                } else {
                    console.log('📄 使用记录表没有更多数据');
                    break;
                }

            } while (pageToken);

            console.log('✅ 使用记录表数据获取完成，总记录数:', allRecords.length);
            return allRecords;

        } catch (error) {
            console.error('❌ 获取使用记录表数据失败:', error);
            return []; // 返回空数组而不是抛出错误
        }
    }

    /**
     * 创建新激活码
     */
    async createActivationCode(code) {
        try {
            console.log('📝 创建新激活码:', code);

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

                // 更新缓存
                codes[code] = {
                    isUsed: false,
                    usedAt: null,
                    usedBy: null,
                    createdAt: new Date().toISOString(),
                    recordId: createdRecords[0].recordId
                };

                return { success: true, message: '创建成功', recordId: createdRecords[0].recordId };
            }

            throw new Error('创建激活码失败');

        } catch (error) {
            console.error('创建激活码失败:', error);
            throw error;
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
     * 获取客户端IP地址
     */
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return 'unknown';
        }
    }

    /**
     * 添加本地日志
     */
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

    /**
     * 获取本地日志
     */
    getLocalLogs() {
        const logs = localStorage.getItem('activationLogs');
        return logs ? JSON.parse(logs) : [];
    }

    /**
     * 保存到本地存储
     */
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('保存到本地存储失败:', error);
        }
    }

    /**
     * 重置激活码
     */
    async resetActivationCode(code) {
        try {
            console.log('🔄 重置激活码:', code);

            const codes = await this.getActivationCodes();
            const codeInfo = codes[code];

            if (!codeInfo) {
                throw new Error('激活码不存在');
            }

            // 1. 从使用记录表中删除该激活码记录（如果存在）
            try {
                await this.deleteFromUsageTable(code);
                console.log('✅ 从使用记录表中删除激活码成功');
            } catch (error) {
                console.log('⚠️ 从使用记录表中删除激活码失败，继续重置审核表:', error.message);
            }

            // 2. 重置审核维格表中的激活码状态
            // 使用makeVikaRequest方法，模仿cloud-storage-vika-v2.js的格式
            const updateData = {
                records: [{
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
                }],
                fieldKey: this.VIKA_CONFIG.fieldKey
            };

            const updateResponse = await this.makeVikaRequest('PATCH', '', updateData);
            console.log('✅ 审核表重置响应:', updateResponse);

            // 添加重置日志
            await this.addLog(code, 'reset', null);

            // 更新缓存
            codes[code] = {
                ...codeInfo,
                isUsed: false,
                usedAt: null,
                usedBy: null,
                situation: ''  // 本地缓存也重置situation为空
            };

            return { success: true, message: '重置成功' };

        } catch (error) {
            console.error('重置激活码失败:', error);
            throw error;
        }
    }

    /**
     * 删除激活码
     */
    async deleteActivationCode(code) {
        try {
            console.log('🗑️ 删除激活码:', code);

            const codes = await this.getActivationCodes();
            const codeInfo = codes[code];

            if (!codeInfo) {
                throw new Error('激活码不存在');
            }

            // 1. 从使用记录表中删除该激活码记录（如果存在）
            try {
                await this.deleteFromUsageTable(code);
                console.log('✅ 从使用记录表中删除激活码成功');
            } catch (error) {
                console.log('⚠️ 从使用记录表中删除激活码失败，继续删除审核表:', error.message);
            }

            // 2. 从审核表中删除激活码记录
            // 使用查询参数方式，模仿cloud-storage-vika-v2.js的格式
            const queryParams = new URLSearchParams();
            queryParams.append('recordIds', codeInfo.recordId);

            const deleteResponse = await this.makeVikaRequest('DELETE', '', null, queryParams);

            if (deleteResponse.success === false) {
                throw new Error('删除审核表记录失败');
            }

            console.log('✅ 审核表删除响应:', deleteResponse);

            // 添加删除日志
            await this.addLog(code, 'deleted', null);

            // 更新缓存
            delete codes[code];

            return { success: true, message: '删除成功' };

        } catch (error) {
            console.error('删除激活码失败:', error);
            throw error;
        }
    }

    /**
     * 将激活码写入使用记录表
     */
    async writeToUsageTable(code, deviceInfo) {
        try {
            console.log(`📝 将激活码 ${code} 写入使用记录表...`);
            console.log(`📝 使用记录表ID: ${this.VIKA_CONFIG.usageDatasheetId}`);

            const writeData = {
                "codeused": code,
                "usedAt": new Date().toISOString(),
                "usedBy": JSON.stringify(deviceInfo),
                "userAgent": navigator.userAgent.slice(0, 200), // 限制长度
                "timestamp": new Date().toISOString(),
                "platform": deviceInfo.platform || 'unknown',
                "deviceId": 'universal-device'
            };

            console.log(`📝 准备写入数据:`, writeData);

            // 构造API请求
            const url = `${this.VIKA_CONFIG.baseUrl}datasheets/${this.VIKA_CONFIG.usageDatasheetId}/records`;
            const requestData = {
                records: [{
                    fields: writeData
                }]
            };

            console.log(`📝 发送POST请求到: ${url}`);
            console.log(`📝 请求数据:`, requestData);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.VIKA_CONFIG.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ HTTP请求失败:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const responseData = await response.json();
            console.log(`📝 写入响应:`, responseData);

            if (!responseData.success) {
                console.error('❌ 写入失败详情:', responseData);
                throw new Error('写入使用记录表失败: ' + JSON.stringify(responseData));
            }

            console.log('✅ 激活码已成功写入使用记录表:', code, responseData.data);
            return responseData.data;

        } catch (error) {
            console.error('❌ 写入使用记录表失败:', error);
            throw error;
        }
    }

    /**
     * 从使用记录表中删除激活码
     */
    async deleteFromUsageTable(code) {
        try {
            console.log(`🗑️ 从使用记录表中删除激活码 ${code}...`);

            const usageRecords = await this.getUsageRecords();
            let recordIdToDelete = null;

            // 查找要删除的记录
            for (const record of usageRecords) {
                const fields = record.fields;
                // 使用记录表使用的列名是codeused
                const possibleCodeFields = ['codeused', 'Codeused', 'CODEUSED', 'codeUsed'];

                for (const fieldName of possibleCodeFields) {
                    if (fields[fieldName] && fields[fieldName] === code) {
                        recordIdToDelete = record.recordId;
                        break;
                    }
                }

                if (recordIdToDelete) break;
            }

            if (recordIdToDelete) {
                // 使用直接HTTP请求
                const url = `${this.VIKA_CONFIG.baseUrl}datasheets/${this.VIKA_CONFIG.usageDatasheetId}/records`;
                const requestData = {
                    records: [recordIdToDelete]
                };

                console.log(`🗑️ 发送DELETE请求到: ${url}`);
                console.log(`🗑️ 删除记录ID:`, recordIdToDelete);

                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.VIKA_CONFIG.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ 删除HTTP请求失败:', response.status, errorText);
                    throw new Error(`删除失败 HTTP ${response.status}: ${errorText}`);
                }

                const responseData = await response.json();
                console.log('✅ 已从使用记录表中删除激活码:', code, responseData);
                return responseData;
            } else {
                console.log(`⚠️ 在使用记录表中未找到激活码 ${code}`);
                return null;
            }

        } catch (error) {
            console.error('❌ 从使用记录表删除失败:', error);
            throw error;
        }
    }

    /**
     * 获取日志数据
     */
    async getLogs() {
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

            return logs;

        } catch (error) {
            console.error('获取日志失败:', error);
            return [];
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
     * 获取本地激活码数据（降级模式）
     */
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

    /**
     * 获取连接状态
     */
    getConnectionStatus() {
        return {
            isOnline: this.isOnline,
            isInitialized: this.isInitialized,
            lastSync: this.cache.lastSync,
            storageType: this.isInitialized ? 'vika-direct' : 'local'
        };
    }
}

// 创建全局实例
let vikaAPIDirect;

function initializeVikaAPIDirect() {
    if (!vikaAPIDirect) {
        vikaAPIDirect = new VikaAPIDirect();
    }
    return vikaAPIDirect;
}

console.log('📦 维格表API直接调用模块已加载 - 模仿cloud-storage-vika-v2.js实现');

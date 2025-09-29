/**
 * 智能导员激活码管理系统 v4.0
 * 集成云存储 - 实现真正的跨设备激活码状态同步
 */

class ActivationSystem {
    constructor() {
        // 开发者激活码（可重复使用但有限制）
        this.DEVELOPER_CODE = 'jqkkf0922';
        
        // 初始激活码列表
        this.INITIAL_CODES = [
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
        
        // 系统状态
        this.isInitialized = false;
        this.cloudStorage = null;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('激活系统初始化开始...');
            
            // 等待云存储初始化
            await this.waitForCloudStorage();
            
            // 初始化数据存储
            await this.initializeStorage();
            
            // 验证现有激活状态
            await this.validateExistingActivation();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('激活系统初始化完成');
            
        } catch (error) {
            console.error('激活系统初始化失败:', error);
            this.showError('系统初始化失败，请刷新页面重试');
        }
    }
    
    /**
     * 生成设备指纹 - 使用真实的设备信息生成唯一指纹
     */
    generateDeviceFingerprint() {
        // 使用云存储系统生成设备指纹
        if (this.cloudStorage && this.cloudStorage.generateDeviceFingerprint) {
            return this.cloudStorage.generateDeviceFingerprint();
        }

        // 备用方法：使用浏览器指纹
        const fingerprint = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cookieEnabled: navigator.cookieEnabled,
            onlineStatus: navigator.onLine,
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            deviceMemory: navigator.deviceMemory || 'unknown',
            timestamp: Date.now()
        };

        // 生成哈希值作为设备指纹
        const fingerprintString = JSON.stringify(fingerprint);
        let hash = 0;
        for (let i = 0; i < fingerprintString.length; i++) {
            const char = fingerprintString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }

        return Math.abs(hash).toString(36);
    }
    
    /**
     * 等待云存储初始化
     */
    async waitForCloudStorage() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window.cloudStorage && window.cloudStorage.localCache) {
                this.cloudStorage = window.cloudStorage;
                console.log('云存储连接成功');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('云存储连接超时，使用本地存储模式');
    }

    /**
     * 初始化数据存储
     */
    async initializeStorage() {
        try {
            // 如果有云存储，优先使用云存储数据
            if (this.cloudStorage) {
                const cloudCodes = await this.cloudStorage.getActivationCodes();
                
                // 如果云端没有数据，初始化默认数据
                if (Object.keys(cloudCodes).length === 0) {
                    console.log('云端数据为空，初始化默认激活码...');
                    await this.cloudStorage.initializeDefaultData();
                }
                
                console.log('使用云存储数据');
                return;
            }
            
            // 降级到本地存储
            if (!localStorage.getItem('activationCodes')) {
                const codes = {};
                this.INITIAL_CODES.forEach(code => {
                    codes[code] = {
                        code: code,
                        used: false,
                        usedAt: null,
                        usedBy: null,
                        createdAt: Date.now(),
                        status: 'available',
                        version: '4.0'
                    };
                });
                localStorage.setItem('activationCodes', JSON.stringify(codes));
                console.log('本地激活码数据初始化完成');
            } else {
                // 升级现有数据到v4.0格式
                this.upgradeStorageFormat();
            }
            
            // 初始化使用日志
            if (!localStorage.getItem('activationLogs')) {
                localStorage.setItem('activationLogs', JSON.stringify([]));
            }
            
            // 初始化系统配置
            if (!localStorage.getItem('systemConfig')) {
                const config = {
                    version: '3.0',
                    createdAt: Date.now(),
                    lastUpdated: Date.now()
                };
                localStorage.setItem('systemConfig', JSON.stringify(config));
            }
            
        } catch (error) {
            console.error('存储初始化失败:', error);
            throw new Error('数据存储初始化失败');
        }
    }
    
    /**
     * 升级存储格式到v3.0
     */
    upgradeStorageFormat() {
        try {
            const codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
            let needsUpdate = false;
            
            Object.keys(codes).forEach(codeKey => {
                const codeData = codes[codeKey];
                
                // 添加缺失的字段
                if (!codeData.version || codeData.version !== '3.0') {
                    codes[codeKey] = {
                        code: codeKey,
                        used: codeData.used || false,
                        usedAt: codeData.usedAt || null,
                        usedBy: codeData.usedBy || null,
                        createdAt: codeData.createdAt || Date.now(),
                        status: codeData.used ? 'used' : 'available',
                        version: '3.0'
                    };
                    needsUpdate = true;
                }
            });
            
            if (needsUpdate) {
                localStorage.setItem('activationCodes', JSON.stringify(codes));
                console.log('存储格式升级完成');
            }
        } catch (error) {
            console.error('存储格式升级失败:', error);
        }
    }
    
    /**
     * 验证现有激活状态
     */
    async validateExistingActivation() {
        try {
            const currentActivation = JSON.parse(localStorage.getItem('currentActivation') || '{"activated": false}');
            
            if (!currentActivation.activated) {
                console.log('当前设备未激活');
                return;
            }
            
            console.log('验证现有激活状态:', currentActivation);

            // 如果是开发者激活码，允许继续使用
            if (currentActivation.code === this.DEVELOPER_CODE) {
                console.log('开发者激活码验证通过');
                this.redirectToApp();
                return;
            }

            // 验证普通激活码
            let codes;
            if (this.cloudStorage) {
                codes = await this.cloudStorage.getActivationCodes();
            } else {
                codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
            }
            const codeData = codes[currentActivation.code];

            if (!codeData) {
                console.warn('激活码不存在，清除激活状态');
                this.clearActivationStatus();
                return;
            }

            if (!codeData.used) {
                console.warn('激活码未被标记为已使用，清除激活状态');
                this.clearActivationStatus();
                return;
            }

            // 检查设备指纹是否匹配（如果是新设备，需要重新激活）
            const currentDeviceFingerprint = this.generateDeviceFingerprint();
            if (codeData.deviceFingerprint && codeData.deviceFingerprint !== currentDeviceFingerprint) {
                // 检查是否在维格表中有记录（允许已记录设备指纹的重复激活）
                const deviceFingerprintExists = await this.checkDeviceFingerprintInVika(currentActivation.code, currentDeviceFingerprint);

                if (!deviceFingerprintExists) {
                    console.warn('设备指纹不匹配，且维格表中无记录，清除激活状态');
                    this.clearActivationStatus();
                    return;
                }
            }

            console.log('激活状态验证通过');
            this.redirectToApp();
            
        } catch (error) {
            console.error('激活状态验证失败:', error);
            this.clearActivationStatus();
        }
    }
    
    /**
     * 清除激活状态
     */
    clearActivationStatus() {
        localStorage.setItem('currentActivation', JSON.stringify({
            activated: false,
            code: null,
            activatedAt: null
        }));
        console.log('激活状态已清除');
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        const activationInput = document.getElementById('activationInput');
        const activationButton = document.getElementById('activationButton');
        
        if (!activationInput || !activationButton) {
            console.error('激活界面元素未找到');
            return;
        }
        
        // 输入框事件
        activationInput.addEventListener('input', () => {
            this.updateButtonState();
            this.clearMessage();
        });
        
        activationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !activationButton.disabled) {
                this.handleActivation();
            }
        });
        
        // 激活按钮事件
        activationButton.addEventListener('click', () => {
            this.handleActivation();
        });
        
        // 初始状态
        this.updateButtonState();
    }
    
    /**
     * 更新按钮状态
     */
    updateButtonState() {
        const activationInput = document.getElementById('activationInput');
        const activationButton = document.getElementById('activationButton');
        
        if (!activationInput || !activationButton) return;
        
        const hasInput = activationInput.value.trim().length > 0;
        activationButton.disabled = !hasInput || !this.isInitialized;
    }
    
    /**
     * 处理激活请求
     */
    async handleActivation() {
        if (!this.isInitialized) {
            this.showError('系统尚未初始化完成，请稍后重试');
            return;
        }
        
        const activationInput = document.getElementById('activationInput');
        const activationButton = document.getElementById('activationButton');
        
        if (!activationInput || !activationButton) {
            this.showError('界面元素未找到');
            return;
        }
        
        const inputCode = activationInput.value.trim();
        if (!inputCode) {
            this.showError('请输入激活码');
            return;
        }
        
        // 禁用界面
        activationButton.disabled = true;
        activationInput.disabled = true;
        activationButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 验证中...';
        
        try {
            // 验证激活码
            const validationResult = await this.validateActivationCode(inputCode);
            
            if (!validationResult.success) {
                throw new Error(validationResult.message);
            }
            
            // 执行激活
            await this.performActivation(inputCode);
            
            // 显示成功消息
            this.showSuccess('激活成功！正在跳转...');
            
            // 延迟跳转
            setTimeout(() => {
                this.redirectToApp();
            }, 1500);
            
        } catch (error) {
            console.error('激活失败:', error);
            this.showError(error.message || '激活失败，请重试');
            
            // 恢复界面
            activationButton.disabled = false;
            activationInput.disabled = false;
            activationButton.innerHTML = '<i class="fas fa-check"></i> 激活';
            this.updateButtonState();
        }
    }
    
    /**
     * 验证激活码
     */
    async validateActivationCode(code) {
        try {
            console.log('验证激活码:', code);
            
            // 检查开发者激活码
            if (code === this.DEVELOPER_CODE) {
                // 检查当前设备是否已经激活
                const currentActivation = JSON.parse(localStorage.getItem('currentActivation') || '{"activated": false}');
                if (currentActivation.activated && currentActivation.code === this.DEVELOPER_CODE) {
                    return {
                        success: false,
                        message: '开发者激活码已在当前设备激活，无需重复激活'
                    };
                }
                
                return {
                    success: true,
                    message: '开发者激活码验证通过'
                };
            }
            
            // 检查普通激活码（优先从云存储获取）
            let codes;
            if (this.cloudStorage) {
                codes = await this.cloudStorage.getActivationCodes();
            } else {
                codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
            }
            const codeData = codes[code];
            
            if (!codeData) {
                return {
                    success: false,
                    message: '无效的激活码，请检查输入是否正确'
                };
            }
            
            if (codeData.used) {
                const usedTime = new Date(codeData.usedAt).toLocaleString('zh-CN');
                const deviceInfo = codeData.deviceFingerprint ?
                    `设备ID: ${codeData.deviceFingerprint}` : '未知设备';

                // 生成当前设备的指纹
                const currentDeviceFingerprint = this.generateDeviceFingerprint();

                // 检查设备指纹是否在维格表中（允许已记录设备指纹的重复激活）
                const deviceFingerprintExists = await this.checkDeviceFingerprintInVika(code, currentDeviceFingerprint);

                if (deviceFingerprintExists) {
                    console.log('✅ 检测到已记录的设备指纹，允许重复激活');
                    return {
                        success: true,
                        message: '设备指纹验证通过，允许重复激活'
                    };
                }

                // 检查是否是同一设备（基于本地缓存）
                if (codeData.deviceFingerprint === currentDeviceFingerprint) {
                    return {
                        success: false,
                        message: `该激活码已在当前设备激活\\n激活时间: ${usedTime}\\n如需重新激活，请联系管理员重置`
                    };
                } else {
                    return {
                        success: false,
                        message: `该激活码已被其他设备使用\\n使用时间: ${usedTime}\\n使用设备: ${deviceInfo}\\n每个激活码只能使用一次`
                    };
                }
            }
            
            // 检查当前设备是否已有其他激活码激活
            const currentActivation = JSON.parse(localStorage.getItem('currentActivation') || '{"activated": false}');
            if (currentActivation.activated && currentActivation.code !== code) {
                return {
                    success: false,
                    message: `当前设备已使用激活码 "${currentActivation.code}" 激活\\n一个设备只能使用一个激活码`
                };
            }
            
            return {
                success: true,
                message: '激活码验证通过'
            };
            
        } catch (error) {
            console.error('激活码验证错误:', error);
            return {
                success: false,
                message: '验证过程中发生错误，请重试'
            };
        }
    }
    
    /**
     * 执行激活
     */
    async performActivation(code) {
        try {
            console.log('执行激活:', code);

            // 生成设备指纹
            const deviceFingerprint = this.generateDeviceFingerprint();
            console.log('设备指纹:', deviceFingerprint);

            // 如果是普通激活码，标记为已使用
            if (code !== this.DEVELOPER_CODE) {
                await this.markCodeAsUsed(code);
            }

            // 保存设备指纹到维格表
            if (this.cloudStorage && this.cloudStorage.saveDeviceFingerprint) {
                try {
                    console.log('🔄 开始保存设备指纹到维格表...');
                    const result = await this.cloudStorage.saveDeviceFingerprint(code, deviceFingerprint);
                    console.log('✅ 设备指纹保存结果:', result);
                } catch (error) {
                    console.warn('⚠️ 保存设备指纹到维格表失败:', error);
                    console.warn('⚠️ 错误详情:', {
                        message: error.message,
                        stack: error.stack,
                        code: code,
                        deviceFingerprint: deviceFingerprint
                    });
                }
            }

            // 设置当前激活状态
            const activationData = {
                activated: true,
                code: code,
                activatedAt: Date.now(),
                deviceFingerprint: deviceFingerprint,
                version: '3.0'
            };

            localStorage.setItem('currentActivation', JSON.stringify(activationData));

            // 记录激活日志
            this.logActivation(code);

            console.log('激活完成');

        } catch (error) {
            console.error('激活执行失败:', error);
            throw error;
        }
    }
    
    /**
     * 检查设备指纹是否在维格表中
     */
    async checkDeviceFingerprintInVika(activationCode, deviceFingerprint) {
        try {
            if (this.cloudStorage && this.cloudStorage.checkDeviceFingerprintExists) {
                return await this.cloudStorage.checkDeviceFingerprintExists(activationCode, deviceFingerprint);
            }
            return false;
        } catch (error) {
            console.error('检查设备指纹失败:', error);
            return false;
        }
    }

    /**
     * 标记激活码为已使用
     */
    async markCodeAsUsed(code) {
        try {
            // 生成设备指纹
            const deviceFingerprint = this.generateDeviceFingerprint();

            // 如果有云存储，使用云存储的原子操作
            if (this.cloudStorage) {
                const deviceInfo = {
                    ...this.getClientInfo(),
                    deviceFingerprint: deviceFingerprint
                };

                const success = await this.cloudStorage.useActivationCode(code, deviceInfo);
                if (!success) {
                    throw new Error('云端激活码使用失败');
                }

                console.log('激活码已在云端标记为已使用:', code);
                return;
            }
            
            // 降级到本地存储
            const codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
            const codeData = codes[code];

            if (!codeData) {
                throw new Error('激活码不存在');
            }

            if (codeData.used) {
                throw new Error('激活码已被使用');
            }

            // 更新激活码状态
            codes[code] = {
                ...codeData,
                used: true,
                usedAt: Date.now(),
                usedBy: this.getClientInfo(),
                deviceFingerprint: deviceFingerprint,
                status: 'used',
                version: '4.0'
            };
            
            // 原子性保存
            localStorage.setItem('activationCodes', JSON.stringify(codes));
            
            // 验证保存结果
            const savedCodes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
            if (!savedCodes[code] || !savedCodes[code].used) {
                throw new Error('激活码状态保存失败');
            }
            
            console.log('激活码已标记为已使用:', code);
            
        } catch (error) {
            console.error('标记激活码失败:', error);
            throw error;
        }
    }
    
    /**
     * 记录激活日志
     */
    logActivation(code) {
        try {
            const logs = JSON.parse(localStorage.getItem('activationLogs') || '[]');
            
            const logEntry = {
                code: code,
                timestamp: Date.now(),
                clientInfo: this.getClientInfo(),
                type: code === this.DEVELOPER_CODE ? 'developer' : 'user',
                action: 'activation',
                version: '3.0'
            };
            
            logs.push(logEntry);
            localStorage.setItem('activationLogs', JSON.stringify(logs));
            
            console.log('激活日志已记录');
            
        } catch (error) {
            console.error('记录激活日志失败:', error);
        }
    }
    
    /**
     * 获取客户端信息
     */
    getClientInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: new Date().toLocaleString('zh-CN'),
            cookieEnabled: navigator.cookieEnabled,
            onlineStatus: navigator.onLine
        };
    }
    
    /**
     * 跳转到主应用
     */
    redirectToApp() {
        console.log('跳转到智能导员主页面');
        window.location.href = './advisor.html';
    }
    
    /**
     * 显示成功消息
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    /**
     * 显示错误消息
     */
    showError(message) {
        this.showMessage(message, 'error');
    }
    
    /**
     * 显示消息
     */
    showMessage(message, type = 'info') {
        const messageElement = document.getElementById('activationMessage');
        if (!messageElement) {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }
        
        messageElement.textContent = message;
        messageElement.className = `activation-message ${type}`;
        
        // 自动清除消息
        setTimeout(() => {
            this.clearMessage();
        }, type === 'success' ? 5000 : 8000);
    }
    
    /**
     * 清除消息
     */
    clearMessage() {
        const messageElement = document.getElementById('activationMessage');
        if (messageElement) {
            messageElement.textContent = '';
            messageElement.className = 'activation-message';
        }
    }
}

// 页面加载完成后初始化激活系统
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，初始化激活系统...');
    window.activationSystem = new ActivationSystem();
});

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivationSystem;
}
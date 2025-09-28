/**
 * 智能导员激活码管理系统 v5.0
 * 集成维格表云存储 - 实现真正的跨设备激活码状态同步
 */

class ActivationSystem {
    constructor() {
        // 开发者激活码（可重复使用但有限制）
        this.DEVELOPER_CODE = 'jqkkf0922';
        
        // 初始激活码列表（不包含开发者激活码）
        this.INITIAL_CODES = [
            'ADMIN2024',
            'STUDENT001',
            'TEACHER001',
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
        this.deviceFingerprint = null;
        this.vikaStorage = null;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 激活系统初始化开始...');
            
            // 生成设备指纹
            this.deviceFingerprint = this.generateDeviceFingerprint();
            console.log('🔑 设备指纹:', this.deviceFingerprint);
            
            // 等待维格表云存储初始化
            await this.waitForVikaStorage();
            
            // 初始化数据存储
            await this.initializeStorage();
            
            // 验证现有激活状态
            await this.validateExistingActivation();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ 激活系统初始化完成');
            
        } catch (error) {
            console.error('❌ 激活系统初始化失败:', error);
            this.showMessage(document.getElementById('activationMessage'), 
                '系统初始化失败，请刷新页面重试', 'error');
        }
    }
    
    /**
     * 等待维格表云存储就绪
     */
    async waitForVikaStorage() {
        return new Promise((resolve) => {
            if (window.vikaCloudStorage && window.vikaCloudStorage.isInitialized) {
                this.vikaStorage = window.vikaCloudStorage;
                resolve();
            } else {
                window.addEventListener('vikaStorageReady', (event) => {
                    this.vikaStorage = event.detail.storage;
                    console.log('📦 维格表云存储已就绪');
                    resolve();
                }, { once: true });
            }
        });
    }
    
    /**
     * 初始化存储
     */
    async initializeStorage() {
        try {
            if (this.vikaStorage && this.vikaStorage.isInitialized) {
                console.log('🌐 使用维格表云存储');
                
                // 检查云端是否有数据
                const cloudCodes = await this.vikaStorage.getActivationCodes();
                if (Object.keys(cloudCodes).length === 0) {
                    console.log('☁️ 云端数据为空，初始化默认激活码...');
                    await this.vikaStorage.initializeDefaultData();
                }
                
                return;
            }
            
            // 降级到本地存储
            console.log('💾 使用本地存储（降级模式）');
            await this.initializeLocalStorage();
            
        } catch (error) {
            console.error('初始化存储失败:', error);
            this.showMessage(document.getElementById('activationMessage'), 
                '系统初始化失败，请刷新页面重试', 'error');
        }
    }
    
    /**
     * 初始化本地存储
     */
    async initializeLocalStorage() {
        const existingCodes = localStorage.getItem('activationCodes');
        if (!existingCodes) {
            const defaultCodes = {};
            this.INITIAL_CODES.forEach(code => {
                defaultCodes[code] = {
                    isUsed: false,
                    situation: 1,  // 1=未使用
                    usedAt: null,
                    usedBy: null,
                    createdAt: new Date().toISOString()
                };
            });
            
            localStorage.setItem('activationCodes', JSON.stringify(defaultCodes));
            console.log('初始化本地激活码完成');
        }
        
        // 初始化日志
        if (!localStorage.getItem('activationLogs')) {
            localStorage.setItem('activationLogs', JSON.stringify([]));
        }
    }
    
    /**
     * 验证现有激活状态
     */
    async validateExistingActivation() {
        const storedCode = localStorage.getItem('userActivationCode');
        const storedDevice = localStorage.getItem('userDeviceId');
        
        if (storedCode && storedDevice) {
            try {
                const isValid = await this.validateStoredActivation(storedCode, storedDevice);
                if (!isValid) {
                    console.log('⚠️ 存储的激活状态无效，清除本地数据');
                    this.clearLocalActivation();
                }
            } catch (error) {
                console.error('验证存储的激活状态失败:', error);
            }
        }
    }
    
    /**
     * 验证存储的激活状态
     */
    async validateStoredActivation(code, deviceId) {
        try {
            let codes;
            if (this.vikaStorage && this.vikaStorage.isInitialized) {
                codes = await this.vikaStorage.getActivationCodes();
            } else {
                codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
            }
            
            const codeInfo = codes[code];
            if (!codeInfo || !codeInfo.isUsed) {
                return false;
            }
            
            // 验证设备ID
            if (codeInfo.usedBy && codeInfo.usedBy.deviceId !== deviceId) {
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('验证激活状态失败:', error);
            return false;
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        const activateButton = document.getElementById('activationButton');
        const codeInput = document.getElementById('activationInput');
        const messageDiv = document.getElementById('activationMessage');
        
        if (activateButton && codeInput) {
            activateButton.addEventListener('click', () => {
                this.handleActivation();
            });
            
            codeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleActivation();
                }
            });
            
            // 清除之前的错误消息
            codeInput.addEventListener('input', () => {
                if (messageDiv) {
                    messageDiv.textContent = '';
                    messageDiv.className = 'message';
                }
            });
        }
    }
    
    /**
     * 处理激活请求
     */
    async handleActivation() {
        const codeInput = document.getElementById('activationInput');
        const activateButton = document.getElementById('activationButton');
        const messageDiv = document.getElementById('activationMessage');
        
        if (!codeInput || !activateButton || !messageDiv) {
            console.error('找不到必要的DOM元素');
            return;
        }
        
        const code = codeInput.value.trim();
        
        if (!code) {
            this.showMessage(messageDiv, '请输入激活码', 'error');
            return;
        }
        
        // 显示加载状态
        activateButton.disabled = true;
        activateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 激活中...';
        this.showMessage(messageDiv, '正在验证激活码...', 'info');
        
        try {
            const result = await this.validateActivationCode(code);
            
            if (result.success) {
                // 激活成功
                this.showMessage(messageDiv, result.message, 'success');
                
                // 保存激活信息到本地（确保完全保存）
                try {
                    localStorage.setItem('userActivationCode', code);
                    localStorage.setItem('userDeviceId', this.deviceFingerprint);
                    localStorage.setItem('activationTime', new Date().toISOString());
                    
                    // 验证保存是否成功
                    const savedCode = localStorage.getItem('userActivationCode');
                    const savedDeviceId = localStorage.getItem('userDeviceId');
                    const savedTime = localStorage.getItem('activationTime');
                    
                    console.log('✅ 激活信息保存验证:', {
                        code: savedCode,
                        deviceId: savedDeviceId,
                        time: savedTime
                    });
                    
                    if (savedCode && savedDeviceId && savedTime) {
                        console.log('✅ 激活信息保存成功，准备跳转');
                        // 延迟跳转，确保所有数据都已保存
                        setTimeout(() => {
                            console.log('🔄 跳转到智能导员界面');
                            window.location.href = 'advisor.html?from=activation';
                        }, 2000);
                    } else {
                        console.error('❌ 激活信息保存失败');
                        this.showMessage(messageDiv, '激活信息保存失败，请重试', 'error');
                    }
                } catch (error) {
                    console.error('❌ 保存激活信息时出错:', error);
                    this.showMessage(messageDiv, '保存激活信息失败，请重试', 'error');
                }
                
            } else {
                this.showMessage(messageDiv, result.message, 'error');
            }
            
        } catch (error) {
            console.error('激活过程出错:', error);
            this.showMessage(messageDiv, '激活过程中出现错误，请重试', 'error');
        } finally {
            // 恢复按钮状态
            activateButton.disabled = false;
            activateButton.innerHTML = '<i class="fas fa-key"></i> 激活';
        }
    }
    
    /**
     * 验证激活码
     */
    async validateActivationCode(code) {
        try {
            // 检查是否为开发者激活码
            if (code === this.DEVELOPER_CODE) {
                return await this.handleDeveloperCode();
            }
            
            // 获取激活码数据
            let codes;
            if (this.vikaStorage && this.vikaStorage.isInitialized) {
                codes = await this.vikaStorage.getActivationCodes();
            } else {
                codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
            }
            
            const codeInfo = codes[code];
            
            // 检查激活码是否存在
            if (!codeInfo) {
                return { success: false, message: '激活码不存在或已失效' };
            }
            
            // 检查是否已被使用
            if (codeInfo.isUsed) {
                // 检查是否是当前设备使用的
                if (codeInfo.usedBy && codeInfo.usedBy.deviceId === this.deviceFingerprint) {
                    return { success: true, message: '欢迎回来！激活码验证成功' };
                } else {
                    return { 
                        success: false, 
                        message: '该激活码已在其他设备上使用，每个激活码只能激活一台设备' 
                    };
                }
            }
            
            // 激活码可用，标记为已使用
            const deviceInfo = {
                deviceId: this.deviceFingerprint,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                platform: navigator.platform,
                language: navigator.language
            };
            
            const result = await this.markCodeAsUsed(code, deviceInfo);
            
            if (result.success) {
                return { success: true, message: '激活成功！正在跳转到智能导员...' };
            } else {
                return { success: false, message: result.message || '激活失败，请重试' };
            }
            
        } catch (error) {
            console.error('验证激活码失败:', error);
            return { success: false, message: '验证过程中出现错误，请重试' };
        }
    }
    
    /**
     * 处理开发者激活码
     */
    async handleDeveloperCode() {
        try {
            // 不再记录开发者激活码的日志，避免维格表重复写入
            // 开发者激活码是特殊的，不需要记录每次使用

            return { success: true, message: '开发者模式激活成功！' };

        } catch (error) {
            console.error('处理开发者激活码失败:', error);
            return { success: true, message: '开发者模式激活成功！' };
        }
    }
    
    /**
     * 标记激活码为已使用
     */
    async markCodeAsUsed(code, deviceInfo) {
        try {
            if (this.vikaStorage && this.vikaStorage.isInitialized) {
                // 使用维格表云存储
                return await this.vikaStorage.useActivationCode(code, deviceInfo);
            } else {
                // 使用本地存储
                return await this.markCodeAsUsedLocal(code, deviceInfo);
            }
        } catch (error) {
            console.error('标记激活码为已使用失败:', error);
            return { success: false, message: '激活失败，请重试' };
        }
    }
    
    /**
     * 本地标记激活码为已使用
     */
    async markCodeAsUsedLocal(code, deviceInfo) {
        try {
            const codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
            
            if (!codes[code]) {
                return { success: false, message: '激活码不存在' };
            }
            
            if (codes[code].isUsed) {
                return { success: false, message: '激活码已被使用' };
            }
            
            codes[code] = {
                ...codes[code],
                isUsed: true,
                situation: 2,  // 2=已使用
                usedAt: new Date().toISOString(),
                usedBy: deviceInfo
            };
            
            localStorage.setItem('activationCodes', JSON.stringify(codes));
            
            // 添加使用日志
            this.addLocalLog(code, 'used', deviceInfo);
            
            return { success: true, message: '激活成功' };
            
        } catch (error) {
            console.error('本地标记激活码失败:', error);
            return { success: false, message: '激活失败，请重试' };
        }
    }
    
    /**
     * 添加本地日志
     */
    addLocalLog(code, action, deviceInfo) {
        try {
            const logs = JSON.parse(localStorage.getItem('activationLogs') || '[]');
            
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
            
            localStorage.setItem('activationLogs', JSON.stringify(logs));
            
        } catch (error) {
            console.error('添加本地日志失败:', error);
        }
    }
    
    /**
     * 生成设备指纹
     */
    generateDeviceFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.language,
            navigator.platform,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || 'unknown',
            navigator.deviceMemory || 'unknown'
        ];
        
        // 添加更多浏览器特征
        if (navigator.plugins) {
            components.push(Array.from(navigator.plugins).map(p => p.name).join(','));
        }
        
        const fingerprint = this.hashString(components.join('|'));
        return fingerprint.substring(0, 16); // 取前16位作为设备ID
    }
    
    /**
     * 字符串哈希函数
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(16);
    }
    
    /**
     * 显示消息
     */
    showMessage(element, message, type) {
        if (!element) return;
        
        element.textContent = message;
        element.className = `activation-message ${type}`;
        
        // 显示消息with可爱的动画
        element.style.display = 'block';
        
        // 添加显示动画
        setTimeout(() => {
            element.classList.add('show');
        }, 50);
        
        // 添加可爱的特效
        if (type === 'success') {
            this.addSparkleEffect(element);
            this.showSuccessConfetti();
        }
        
        // 自动清除成功消息
        if (type === 'success') {
            setTimeout(() => {
                element.classList.remove('show');
                setTimeout(() => {
                    element.textContent = '';
                    element.className = 'activation-message';
                    element.style.display = 'none';
                }, 300);
            }, 3000);
        }
        
        // 如果是错误消息，5秒后自动隐藏
        if (type === 'error') {
            setTimeout(() => {
                element.classList.remove('show');
                setTimeout(() => {
                    element.style.display = 'none';
                }, 300);
            }, 5000);
        }
    }
    
    /**
     * 添加闪闪发光效果
     */
    addSparkleEffect(element) {
        element.classList.add('sparkle');
        setTimeout(() => {
            element.classList.remove('sparkle');
        }, 3000);
    }
    
    /**
     * 显示成功彩带效果
     */
    showSuccessConfetti() {
        // 创建彩带效果
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.createConfettiParticle();
            }, i * 20);
        }
    }
    
    /**
     * 创建彩带粒子
     */
    createConfettiParticle() {
        const colors = ['#ff6b9d', '#a855f7', '#3b82f6', '#10b981', '#f59e0b'];
        const particle = document.createElement('div');
        
        particle.style.cssText = `
            position: fixed;
            width: 8px;
            height: 8px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
            top: 30%;
            left: ${Math.random() * 100}%;
            animation: confettiFall ${2 + Math.random() * 3}s ease-out forwards;
        `;
        
        // 添加彩带下落动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes confettiFall {
                to {
                    transform: translateY(100vh) rotate(720deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(particle);
        
        // 清理
        setTimeout(() => {
            particle.remove();
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        }, 5000);
    }
    
    /**
     * 清除本地激活信息
     */
    clearLocalActivation() {
        localStorage.removeItem('userActivationCode');
        localStorage.removeItem('userDeviceId');
        localStorage.removeItem('activationTime');
    }
    
    /**
     * 获取系统状态
     */
    getSystemStatus() {
        return {
            isInitialized: this.isInitialized,
            deviceFingerprint: this.deviceFingerprint,
            storageType: this.vikaStorage && this.vikaStorage.isInitialized ? 'vika' : 'local',
            connectionStatus: this.vikaStorage ? this.vikaStorage.getConnectionStatus() : null
        };
    }
}

// 页面加载完成后初始化激活系统
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 智能导员激活系统 v5.0 - 维格表云存储版本');
    window.activationSystem = new ActivationSystem();
});

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivationSystem;
}

console.log('📦 激活系统模块已加载 - 维格表云存储版本 v5.0');

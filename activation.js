// 激活码管理系统
class ActivationManager {
    constructor() {
        // 开发者激活码
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
        
        this.initializeData();
        this.setupEventListeners();
    }
    
    initializeData() {
        // 初始化激活码数据
        if (!localStorage.getItem('activationCodes')) {
            const codes = {};
            this.INITIAL_CODES.forEach(code => {
                codes[code] = {
                    used: false,
                    usedAt: null,
                    usedBy: null,
                    createdAt: Date.now()
                };
            });
            localStorage.setItem('activationCodes', JSON.stringify(codes));
        } else {
            // 为现有激活码添加createdAt字段（如果没有的话）
            const codes = JSON.parse(localStorage.getItem('activationCodes'));
            let needsUpdate = false;
            Object.keys(codes).forEach(code => {
                if (!codes[code].createdAt) {
                    codes[code].createdAt = Date.now();
                    needsUpdate = true;
                }
            });
            if (needsUpdate) {
                localStorage.setItem('activationCodes', JSON.stringify(codes));
            }
        }
        
        // 初始化使用日志
        if (!localStorage.getItem('activationLogs')) {
            localStorage.setItem('activationLogs', JSON.stringify([]));
        }
        
        // 检查当前激活状态
        const currentActivation = JSON.parse(localStorage.getItem('currentActivation') || '{"activated": false}');
        if (currentActivation.activated) {
            // 如果已经激活，直接跳转到主应用
            window.location.href = './advisor.html';
        }
    }
    
    setupEventListeners() {
        const activationInput = document.getElementById('activationInput');
        const activationButton = document.getElementById('activationButton');
        
        if (activationInput && activationButton) {
            activationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleActivation();
                }
            });
            
            // 添加多种事件监听以确保移动端兼容性
            activationButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleActivation();
            });
            
            // 添加触摸事件支持
            activationButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleActivation();
            });
            
            activationInput.addEventListener('input', () => {
                this.updateActivationButtonState();
            });
            
            // 初始状态检查
            this.updateActivationButtonState();
        }
    }
    
    updateActivationButtonState() {
        const activationInput = document.getElementById('activationInput');
        const activationButton = document.getElementById('activationButton');
        
        if (activationInput && activationButton) {
            const hasText = activationInput.value.trim().length > 0;
            activationButton.disabled = !hasText;
        }
    }
    
    handleActivation() {
        const activationInput = document.getElementById('activationInput');
        const activationButton = document.getElementById('activationButton');
        const activationMessage = document.getElementById('activationMessage');
        
        if (!activationInput || !activationButton) return;
        
        const inputCode = activationInput.value.trim();
        if (!inputCode) return;
        
        // 禁用按钮防止重复提交
        activationButton.disabled = true;
        activationButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 验证中...';
        
        // 模拟验证延迟
        setTimeout(() => {
            const result = this.validateActivationCode(inputCode);
            
            if (result.success) {
                this.activateApp(inputCode);
                this.showMessage(activationMessage, '激活成功！正在跳转到智能导员...', 'success');
                
                setTimeout(() => {
                    window.location.href = './advisor.html';
                }, 1500);
            } else {
                this.showMessage(activationMessage, result.message, 'error');
                activationButton.disabled = false;
                activationButton.innerHTML = '<i class="fas fa-check"></i> 激活';
            }
        }, 1000);
    }
    
    validateActivationCode(code) {
        // 检查开发者激活码
        if (code === this.DEVELOPER_CODE) {
            return {
                success: true,
                message: '开发者激活码验证成功'
            };
        }
        
        // 检查普通激活码
        const codes = JSON.parse(localStorage.getItem('activationCodes'));
        
        if (codes[code]) {
            if (codes[code].used) {
                return {
                    success: false,
                    message: '该激活码已被使用'
                };
            } else {
                return {
                    success: true,
                    message: '激活码验证成功'
                };
            }
        } else {
            return {
                success: false,
                message: '无效的激活码'
            };
        }
    }
    
    activateApp(code) {
        // 更新激活状态
        const currentActivation = {
            activated: true,
            code: code,
            activatedAt: Date.now()
        };
        localStorage.setItem('currentActivation', JSON.stringify(currentActivation));
        
        // 如果不是开发者激活码，标记为已使用
        if (code !== this.DEVELOPER_CODE) {
            this.markCodeAsUsed(code);
        }
        
        // 记录使用日志
        this.logActivation(code);
    }
    
    markCodeAsUsed(code) {
        const codes = JSON.parse(localStorage.getItem('activationCodes'));
        codes[code] = {
            used: true,
            usedAt: Date.now(),
            usedBy: this.getClientInfo(),
            createdAt: codes[code].createdAt || Date.now()
        };
        localStorage.setItem('activationCodes', JSON.stringify(codes));
    }
    
    logActivation(code) {
        const logs = JSON.parse(localStorage.getItem('activationLogs'));
        logs.push({
            code: code,
            timestamp: Date.now(),
            clientInfo: this.getClientInfo(),
            type: code === this.DEVELOPER_CODE ? 'developer' : 'user'
        });
        localStorage.setItem('activationLogs', JSON.stringify(logs));
    }
    
    getClientInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            timestamp: new Date().toLocaleString('zh-CN')
        };
    }
    
    showMessage(element, message, type) {
        if (!element) return;
        
        element.textContent = message;
        element.className = `activation-message ${type}`;
        
        // 3秒后清除消息
        setTimeout(() => {
            element.textContent = '';
            element.className = 'activation-message';
        }, 3000);
    }
}

// 页面加载完成后初始化激活码管理器
document.addEventListener('DOMContentLoaded', () => {
    new ActivationManager();
});

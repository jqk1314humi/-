// 管理员面板系统
class AdminManager {
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
        this.updateAdminPanel();
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
    }
    
    setupEventListeners() {
        const backButton = document.getElementById('backToMainApp');
        const generateButton = document.getElementById('generateCode');
        const resetButton = document.getElementById('resetAllCodes');
        const exportButton = document.getElementById('exportLogs');
        const tabButtons = document.querySelectorAll('.tab-button');
        
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = './advisor.html';
            });
        }
        
        if (generateButton) {
            generateButton.addEventListener('click', () => {
                this.generateNewCode();
            });
        }
        
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetAllCodes();
            });
        }
        
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.exportLogs();
            });
        }
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });
        
        // 添加事件委托处理激活码操作按钮
        this.setupCodeActionsEventListeners();
    }
    
    setupCodeActionsEventListeners() {
        const codesList = document.getElementById('codesList');
        if (!codesList) return;
        
        // 使用事件委托处理动态生成的按钮
        codesList.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            
            const action = button.dataset.action;
            const code = button.dataset.code;
            
            if (!code) return;
            
            switch (action) {
                case 'reset':
                    if (!button.disabled) {
                        this.resetSingleCode(code);
                    }
                    break;
                case 'delete':
                    this.deleteCode(code);
                    break;
            }
        });
    }
    
    updateAdminPanel() {
        this.updateStats();
        this.updateCodesList();
        this.updateLogsList();
    }
    
    updateStats() {
        const codes = JSON.parse(localStorage.getItem('activationCodes'));
        const totalCodes = Object.keys(codes).length;
        const usedCodes = Object.values(codes).filter(code => code.used).length;
        const availableCodes = totalCodes - usedCodes;
        
        document.getElementById('totalCodes').textContent = totalCodes;
        document.getElementById('usedCodes').textContent = usedCodes;
        document.getElementById('availableCodes').textContent = availableCodes;
    }
    
    updateCodesList() {
        const codesList = document.getElementById('codesList');
        if (!codesList) {
            console.error('codesList元素未找到');
            return;
        }
        
        const codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
        console.log('激活码数据:', codes);
        codesList.innerHTML = '';
        
        if (Object.keys(codes).length === 0) {
            codesList.innerHTML = '<div class="no-codes">暂无激活码数据</div>';
            return;
        }
        
        Object.entries(codes).forEach(([code, info]) => {
            const codeItem = document.createElement('div');
            codeItem.className = 'code-item';
            
            const statusClass = info.used ? 'used' : 'available';
            const statusText = info.used ? '已使用' : '未使用';
            // 构建详细的使用信息
            let deviceInfo = '';
            let securityInfo = '';
            if (info.used && info.usedBy) {
                const platform = info.usedBy.platform || '未知平台';
                const deviceId = info.usedBy.deviceId || '未知设备';
                const browser = this.getBrowserInfo(info.usedBy.userAgent);
                const resolution = info.usedBy.screenResolution || '未知分辨率';
                const timezone = info.usedBy.timezone || '未知时区';
                
                deviceInfo = `
                    <div class="device-info">
                        <div class="device-row"><i class="fas fa-desktop"></i> 平台: ${platform}</div>
                        <div class="device-row"><i class="fas fa-globe"></i> 浏览器: ${browser}</div>
                        <div class="device-row"><i class="fas fa-tv"></i> 分辨率: ${resolution}</div>
                        <div class="device-row"><i class="fas fa-clock"></i> 时区: ${timezone}</div>
                    </div>
                `;
                
                securityInfo = `
                    <div class="security-info">
                        <div class="security-row"><i class="fas fa-fingerprint"></i> 设备ID: ${deviceId}</div>
                        ${info.usedBy.activationId ? `<div class="security-row"><i class="fas fa-key"></i> 激活ID: ${info.usedBy.activationId}</div>` : ''}
                        ${info.usedBy.sessionId ? `<div class="security-row"><i class="fas fa-user-secret"></i> 会话ID: ${info.usedBy.sessionId}</div>` : ''}
                        <div class="security-row"><i class="fas fa-shield-alt"></i> 状态: ${info.status || 'active'}</div>
                    </div>
                `;
            }
            
            codeItem.innerHTML = `
                <div class="code-info">
                    <div class="code-main">
                        <span class="code-text">${code}</span>
                        <span class="code-status ${statusClass}">${statusText}</span>
                    </div>
                    ${info.used ? `
                        <div class="code-details">
                            <div class="log-time">使用时间: ${new Date(info.usedAt).toLocaleString('zh-CN')}</div>
                            ${deviceInfo}
                            ${securityInfo}
                        </div>
                    ` : ''}
                </div>
                <div class="code-actions">
                    ${info.used ? `
                        <button class="reset-single-button" data-action="reset" data-code="${code}">
                            <i class="fas fa-undo"></i>
                            重置
                        </button>
                    ` : `
                        <button class="reset-single-button disabled" disabled title="激活码未使用，无需重置">
                            <i class="fas fa-undo"></i>
                            重置
                        </button>
                    `}
                    <button class="delete-code-button" data-action="delete" data-code="${code}">
                        <i class="fas fa-trash"></i>
                        删除
                    </button>
                </div>
            `;
            
            codesList.appendChild(codeItem);
        });
    }
    
    updateLogsList() {
        const logsList = document.getElementById('logsList');
        if (!logsList) return;
        
        const logs = JSON.parse(localStorage.getItem('activationLogs'));
        logsList.innerHTML = '';
        
        if (logs.length === 0) {
            logsList.innerHTML = '<div class="no-logs">暂无使用日志</div>';
            return;
        }
        
        // 按时间倒序排列
        logs.sort((a, b) => b.timestamp - a.timestamp);
        
        logs.forEach((log, index) => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            
            const logType = log.type === 'developer' ? '开发者' : '用户';
            const logTime = new Date(log.timestamp).toLocaleString('zh-CN');
            const userAgent = log.clientInfo.userAgent || '未知';
            const browser = this.getBrowserInfo(userAgent);
            
            logItem.innerHTML = `
                <div class="log-header">
                    <div class="log-main">
                        <span class="log-code">${log.code}</span>
                        <span class="log-type ${log.type}">${logType}</span>
                    </div>
                    <span class="log-time">${logTime}</span>
                </div>
                <div class="log-details">
                    <div class="log-detail-row">
                        <i class="fas fa-desktop"></i>
                        <span>平台: ${log.clientInfo.platform}</span>
                    </div>
                    <div class="log-detail-row">
                        <i class="fas fa-globe"></i>
                        <span>浏览器: ${browser}</span>
                    </div>
                    <div class="log-detail-row">
                        <i class="fas fa-language"></i>
                        <span>语言: ${log.clientInfo.language}</span>
                    </div>
                    ${log.clientInfo.timestamp ? `
                        <div class="log-detail-row">
                            <i class="fas fa-clock"></i>
                            <span>客户端时间: ${log.clientInfo.timestamp}</span>
                        </div>
                    ` : ''}
                </div>
            `;
            
            logsList.appendChild(logItem);
        });
    }
    
    switchTab(tabName) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // 更新标签面板
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }
    
    resetAllCodes() {
        if (confirm('确定要重置所有激活码的使用状态吗？此操作不可撤销！')) {
            const codes = JSON.parse(localStorage.getItem('activationCodes'));
            Object.keys(codes).forEach(code => {
                codes[code] = {
                    used: false,
                    usedAt: null,
                    usedBy: null,
                    createdAt: codes[code].createdAt || Date.now()
                };
            });
            localStorage.setItem('activationCodes', JSON.stringify(codes));
            
            // 清除当前激活状态
            localStorage.setItem('currentActivation', JSON.stringify({
                activated: false,
                code: null,
                activatedAt: null
            }));
            
            // 添加重置日志
            const logs = JSON.parse(localStorage.getItem('activationLogs'));
            logs.push({
                code: 'ALL_CODES',
                timestamp: Date.now(),
                type: 'reset',
                action: 'bulk_reset',
                clientInfo: this.getClientInfo()
            });
            localStorage.setItem('activationLogs', JSON.stringify(logs));
            
            this.updateAdminPanel();
            alert('所有激活码已重置！');
        }
    }
    
    exportLogs() {
        const logs = JSON.parse(localStorage.getItem('activationLogs'));
        const codes = JSON.parse(localStorage.getItem('activationCodes'));
        
        const exportData = {
            exportTime: new Date().toLocaleString('zh-CN'),
            codes: codes,
            logs: logs
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `activation_data_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }
    
    // 生成12位随机激活码
    generateRandomCode() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 12; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    // 生成新激活码
    generateNewCode() {
        const newCode = this.generateRandomCode();
        const codes = JSON.parse(localStorage.getItem('activationCodes'));
        
        // 检查是否已存在
        if (codes[newCode]) {
            // 如果存在，递归生成新的
            return this.generateNewCode();
        }
        
        // 添加新激活码
        codes[newCode] = {
            used: false,
            usedAt: null,
            usedBy: null,
            createdAt: Date.now()
        };
        
        localStorage.setItem('activationCodes', JSON.stringify(codes));
        this.updateAdminPanel();
        
        // 显示生成成功的消息
        alert(`新激活码已生成: ${newCode}`);
        
        // 复制到剪贴板
        if (navigator.clipboard) {
            navigator.clipboard.writeText(newCode).then(() => {
                console.log('激活码已复制到剪贴板');
            }).catch(err => {
                console.error('复制到剪贴板失败:', err);
            });
        }
    }
    
    // 重置单个激活码
    resetSingleCode(code) {
        const codes = JSON.parse(localStorage.getItem('activationCodes'));
        const codeInfo = codes[code];
        
        if (!codeInfo) {
            alert('激活码不存在！');
            return;
        }
        
        // 显示详细的重置确认信息
        let confirmMessage = `确定要重置激活码 "${code}" 的使用状态吗？\n\n`;
        if (codeInfo.used && codeInfo.usedBy) {
            const usedTime = new Date(codeInfo.usedAt).toLocaleString('zh-CN');
            const deviceId = codeInfo.usedBy.deviceId || '未知设备';
            const platform = codeInfo.usedBy.platform || '未知平台';
            confirmMessage += `当前状态: 已使用\n使用时间: ${usedTime}\n使用设备: ${deviceId}\n使用平台: ${platform}\n\n`;
        }
        confirmMessage += '重置后该激活码将可以重新使用，此操作不可撤销！';
        
        if (confirm(confirmMessage)) {
            // 保存原始使用信息用于日志
            const originalUsedBy = codeInfo.usedBy;
            
            codes[code] = {
                used: false,
                usedAt: null,
                usedBy: null,
                createdAt: codes[code].createdAt || Date.now(),
                status: 'reset',
                resetAt: Date.now(),
                resetCount: (codes[code].resetCount || 0) + 1
            };
            localStorage.setItem('activationCodes', JSON.stringify(codes));
            
            // 检查当前激活状态，如果使用的是这个激活码，则取消激活
            const currentActivation = JSON.parse(localStorage.getItem('currentActivation') || '{"activated": false}');
            let wasCurrentlyActive = false;
            
            if (currentActivation.activated && currentActivation.code === code) {
                localStorage.setItem('currentActivation', JSON.stringify({
                    activated: false,
                    code: null,
                    activatedAt: null
                }));
                wasCurrentlyActive = true;
            }
            
            // 添加详细的重置日志
            const logs = JSON.parse(localStorage.getItem('activationLogs'));
            logs.push({
                code: code,
                timestamp: Date.now(),
                type: 'reset',
                action: 'single_reset',
                details: {
                    wasCurrentlyActive: wasCurrentlyActive,
                    originalUsedBy: originalUsedBy,
                    resetReason: 'manual_admin_reset'
                },
                clientInfo: this.getClientInfo()
            });
            localStorage.setItem('activationLogs', JSON.stringify(logs));
            
            this.updateAdminPanel();
            
            let successMessage = `激活码 "${code}" 已成功重置！`;
            if (wasCurrentlyActive) {
                successMessage += '\n\n注意：该激活码当前正在使用中，相关设备的激活状态已被取消。';
            }
            alert(successMessage);
        }
    }
    
    // 删除激活码
    deleteCode(code) {
        if (confirm(`确定要删除激活码 "${code}" 吗？此操作不可撤销！`)) {
            const codes = JSON.parse(localStorage.getItem('activationCodes'));
            
            if (codes[code]) {
                delete codes[code];
                localStorage.setItem('activationCodes', JSON.stringify(codes));
                
                // 检查当前激活状态，如果使用的是这个激活码，则取消激活
                const currentActivation = JSON.parse(localStorage.getItem('currentActivation') || '{"activated": false}');
                if (currentActivation.activated && currentActivation.code === code) {
                    localStorage.setItem('currentActivation', JSON.stringify({
                        activated: false,
                        code: null,
                        activatedAt: null
                    }));
                }
                
                // 添加删除日志
                const logs = JSON.parse(localStorage.getItem('activationLogs'));
                logs.push({
                    code: code,
                    timestamp: Date.now(),
                    type: 'delete',
                    action: 'code_deleted',
                    clientInfo: this.getClientInfo()
                });
                localStorage.setItem('activationLogs', JSON.stringify(logs));
                
                this.updateAdminPanel();
                alert(`激活码 "${code}" 已删除！`);
            }
        }
    }
    
    // 获取浏览器信息
    getBrowserInfo(userAgent) {
        if (!userAgent) return '未知';
        
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('Opera')) return 'Opera';
        return '其他';
    }
    
    // 获取客户端信息
    getClientInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            timestamp: new Date().toLocaleString('zh-CN')
        };
    }
}

// 页面加载完成后初始化管理员面板
function initializeAdminManager() {
    try {
        new AdminManager();
        console.log('管理员面板初始化成功');
    } catch (error) {
        console.error('管理员面板初始化失败:', error);
        // 延迟重试
        setTimeout(initializeAdminManager, 1000);
    }
}

// 确保在DOM完全加载后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminManager);
} else {
    initializeAdminManager();
}

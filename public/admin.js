/**
 * 智能导员管理员系统 v3.0
 * 完全重写版本 - 完善的激活码管理和状态显示
 */

class AdminSystem {
    constructor() {
        // 开发者激活码
        this.DEVELOPER_CODE = 'jqkkf0922';
        
        // 系统状态
        this.isInitialized = false;
        this.currentData = {
            codes: {},
            logs: [],
            stats: { total: 0, used: 0, available: 0 }
        };
        
        this.init();
    }
    
    async init() {
        try {
            console.log('管理员系统初始化开始...');
            
            // 验证访问权限
            if (!this.validateAccess()) {
                return;
            }
            
            // 初始化数据
            await this.loadData();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 更新界面
            this.updateInterface();
            
            this.isInitialized = true;
            console.log('管理员系统初始化完成');
            
        } catch (error) {
            console.error('管理员系统初始化失败:', error);
            this.showNotification('系统初始化失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 验证访问权限
     */
    validateAccess() {
        try {
            const currentActivation = JSON.parse(localStorage.getItem('currentActivation') || '{"activated": false}');
            
            if (!currentActivation.activated) {
                console.log('未激活，跳转到激活页面');
                window.location.href = './index.html';
                return false;
            }
            
            console.log('访问权限验证通过');
            return true;
            
        } catch (error) {
            console.error('访问权限验证失败:', error);
            window.location.href = './index.html';
            return false;
        }
    }
    
    /**
     * 加载数据
     */
    async loadData() {
        try {
            // 加载激活码数据
            this.currentData.codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
            
            // 加载日志数据
            this.currentData.logs = JSON.parse(localStorage.getItem('activationLogs') || '[]');
            
            // 计算统计数据
            this.calculateStats();
            
            console.log('数据加载完成:', this.currentData.stats);
            
        } catch (error) {
            console.error('数据加载失败:', error);
            throw new Error('数据加载失败');
        }
    }
    
    /**
     * 计算统计数据
     */
    calculateStats() {
        const codes = this.currentData.codes;
        const total = Object.keys(codes).length;
        const used = Object.values(codes).filter(code => code.used).length;
        const available = total - used;
        
        this.currentData.stats = { total, used, available };
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 返回按钮
        const backButton = document.getElementById('backToMainApp');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = './advisor.html';
            });
        }
        
        // 生成激活码按钮
        const generateButton = document.getElementById('generateCode');
        if (generateButton) {
            generateButton.addEventListener('click', () => {
                this.generateNewCode();
            });
        }
        
        // 重置所有激活码按钮
        const resetAllButton = document.getElementById('resetAllCodes');
        if (resetAllButton) {
            resetAllButton.addEventListener('click', () => {
                this.resetAllCodes();
            });
        }
        
        // 导出日志按钮
        const exportButton = document.getElementById('exportLogs');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.exportLogs();
            });
        }
        
        // 标签切换
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });
        
        // 激活码操作事件委托
        this.setupCodeActionsEventListeners();
    }
    
    /**
     * 设置激活码操作事件监听器
     */
    setupCodeActionsEventListeners() {
        const codesList = document.getElementById('codesList');
        if (!codesList) return;
        
        codesList.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            
            event.preventDefault();
            event.stopPropagation();
            
            const action = button.dataset.action;
            const code = button.dataset.code;
            
            if (!code || button.disabled) return;
            
            console.log('执行操作:', action, '激活码:', code);
            
            switch (action) {
                case 'reset':
                    this.resetSingleCode(code);
                    break;
                case 'delete':
                    this.deleteCode(code);
                    break;
                default:
                    console.warn('未知操作:', action);
            }
        });
    }
    
    /**
     * 更新界面
     */
    updateInterface() {
        this.updateStats();
        this.updateCodesList();
        this.updateLogsList();
    }
    
    /**
     * 更新统计数据显示
     */
    updateStats() {
        const totalElement = document.getElementById('totalCodes');
        const usedElement = document.getElementById('usedCodes');
        const availableElement = document.getElementById('availableCodes');
        
        if (totalElement) totalElement.textContent = this.currentData.stats.total;
        if (usedElement) usedElement.textContent = this.currentData.stats.used;
        if (availableElement) availableElement.textContent = this.currentData.stats.available;
    }
    
    /**
     * 更新激活码列表
     */
    updateCodesList() {
        const codesList = document.getElementById('codesList');
        if (!codesList) {
            console.error('codesList 元素未找到');
            return;
        }
        
        const codes = this.currentData.codes;
        
        // 清空现有内容
        codesList.innerHTML = '';
        
        if (Object.keys(codes).length === 0) {
            codesList.innerHTML = `
                <div class="no-codes">
                    <i class="fas fa-key"></i>
                    <p>暂无激活码数据</p>
                    <button class="generate-first-code" onclick="window.adminSystem?.generateNewCode()">
                        生成第一个激活码
                    </button>
                </div>
            `;
            return;
        }
        
        // 按创建时间排序
        const sortedCodes = Object.entries(codes).sort((a, b) => {
            return (b[1].createdAt || 0) - (a[1].createdAt || 0);
        });
        
        sortedCodes.forEach(([code, info]) => {
            const codeItem = this.createCodeItem(code, info);
            codesList.appendChild(codeItem);
        });
        
        console.log('激活码列表更新完成，共', sortedCodes.length, '个激活码');
    }
    
    /**
     * 创建激活码项目元素
     */
    createCodeItem(code, info) {
        const codeItem = document.createElement('div');
        codeItem.className = 'code-item';
        codeItem.dataset.code = code;
        
        const statusClass = info.used ? 'used' : 'available';
        const statusText = info.used ? '已使用' : '未使用';
        
        // 构建详细信息
        let detailsHtml = '';
        if (info.used && info.usedBy) {
            const usedTime = new Date(info.usedAt).toLocaleString('zh-CN');
            const deviceInfo = info.deviceFingerprint || '未知设备';
            const platform = info.usedBy.platform || '未知平台';
            const browser = this.getBrowserInfo(info.usedBy.userAgent || '');
            
            detailsHtml = `
                <div class="code-details">
                    <div class="detail-row">
                        <i class="fas fa-clock"></i>
                        <span>使用时间: ${usedTime}</span>
                    </div>
                    <div class="detail-row">
                        <i class="fas fa-fingerprint"></i>
                        <span>设备ID: ${deviceInfo}</span>
                    </div>
                    <div class="detail-row">
                        <i class="fas fa-desktop"></i>
                        <span>平台: ${platform}</span>
                    </div>
                    <div class="detail-row">
                        <i class="fas fa-globe"></i>
                        <span>浏览器: ${browser}</span>
                    </div>
                </div>
            `;
        }
        
        // 构建操作按钮
        const actionsHtml = `
            <div class="code-actions">
                <button 
                    class="reset-button ${info.used ? '' : 'disabled'}" 
                    data-action="reset" 
                    data-code="${code}"
                    ${info.used ? '' : 'disabled'}
                    title="${info.used ? '重置此激活码' : '激活码未使用，无需重置'}"
                >
                    <i class="fas fa-undo"></i>
                    重置
                </button>
                <button 
                    class="delete-button" 
                    data-action="delete" 
                    data-code="${code}"
                    title="删除此激活码"
                >
                    <i class="fas fa-trash"></i>
                    删除
                </button>
            </div>
        `;
        
        codeItem.innerHTML = `
            <div class="code-header">
                <div class="code-info">
                    <span class="code-text">${code}</span>
                    <span class="code-status ${statusClass}">${statusText}</span>
                </div>
                <div class="code-meta">
                    <span class="created-time">创建于 ${new Date(info.createdAt || Date.now()).toLocaleString('zh-CN')}</span>
                </div>
            </div>
            ${detailsHtml}
            ${actionsHtml}
        `;
        
        return codeItem;
    }
    
    /**
     * 更新使用日志列表
     */
    updateLogsList() {
        const logsList = document.getElementById('logsList');
        if (!logsList) {
            console.error('logsList 元素未找到');
            return;
        }
        
        const logs = this.currentData.logs;
        
        // 清空现有内容
        logsList.innerHTML = '';
        
        if (logs.length === 0) {
            logsList.innerHTML = `
                <div class="no-logs">
                    <i class="fas fa-history"></i>
                    <p>暂无使用日志</p>
                </div>
            `;
            return;
        }
        
        // 按时间倒序排列
        const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);
        
        sortedLogs.forEach((log, index) => {
            const logItem = this.createLogItem(log, index);
            logsList.appendChild(logItem);
        });
        
        console.log('使用日志更新完成，共', sortedLogs.length, '条记录');
    }
    
    /**
     * 创建日志项目元素
     */
    createLogItem(log, index) {
        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        
        const logTime = new Date(log.timestamp).toLocaleString('zh-CN');
        const logType = log.type === 'developer' ? '开发者' : '用户';
        const actionText = this.getActionText(log.action || 'activation');
        
        let detailsHtml = '';
        if (log.clientInfo) {
            const browser = this.getBrowserInfo(log.clientInfo.userAgent || '');
            const platform = log.clientInfo.platform || '未知';
            const deviceId = log.deviceFingerprint || '未知';
            
            detailsHtml = `
                <div class="log-details">
                    <div class="detail-row">
                        <i class="fas fa-fingerprint"></i>
                        <span>设备ID: ${deviceId}</span>
                    </div>
                    <div class="detail-row">
                        <i class="fas fa-desktop"></i>
                        <span>平台: ${platform}</span>
                    </div>
                    <div class="detail-row">
                        <i class="fas fa-globe"></i>
                        <span>浏览器: ${browser}</span>
                    </div>
                </div>
            `;
        }
        
        logItem.innerHTML = `
            <div class="log-header">
                <div class="log-main">
                    <span class="log-code">${log.code}</span>
                    <span class="log-type ${log.type}">${logType}</span>
                    <span class="log-action">${actionText}</span>
                </div>
                <span class="log-time">${logTime}</span>
            </div>
            ${detailsHtml}
        `;
        
        return logItem;
    }
    
    /**
     * 获取操作文本
     */
    getActionText(action) {
        const actionMap = {
            'activation': '激活',
            'reset': '重置',
            'delete': '删除',
            'create': '创建'
        };
        return actionMap[action] || action;
    }
    
    /**
     * 获取浏览器信息
     */
    getBrowserInfo(userAgent) {
        if (!userAgent) return '未知';
        
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('Opera')) return 'Opera';
        
        return '其他';
    }
    
    /**
     * 切换标签页
     */
    switchTab(tabName) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        
        // 更新标签面板
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`)?.classList.add('active');
        
        console.log('切换到标签页:', tabName);
    }
    
    /**
     * 生成新激活码
     */
    async generateNewCode() {
        try {
            console.log('开始生成新激活码...');
            
            const newCode = this.generateRandomCode();
            console.log('生成的激活码:', newCode);
            
            // 检查是否已存在
            if (this.currentData.codes[newCode]) {
                console.log('激活码已存在，重新生成');
                return this.generateNewCode();
            }
            
            // 添加新激活码
            this.currentData.codes[newCode] = {
                code: newCode,
                used: false,
                usedAt: null,
                usedBy: null,
                deviceFingerprint: null,
                createdAt: Date.now(),
                status: 'available',
                version: '3.0'
            };
            
            // 保存到存储
            localStorage.setItem('activationCodes', JSON.stringify(this.currentData.codes));
            
            // 记录日志
            this.logAction(newCode, 'create', '创建新激活码');
            
            // 更新统计和界面
            this.calculateStats();
            this.updateInterface();
            
            // 显示成功消息
            this.showNotification(`新激活码已生成: ${newCode}`, 'success');
            
            // 复制到剪贴板
            if (navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(newCode);
                    this.showNotification('激活码已复制到剪贴板', 'info');
                } catch (err) {
                    console.warn('复制到剪贴板失败:', err);
                }
            }
            
            console.log('新激活码生成完成');
            
        } catch (error) {
            console.error('生成新激活码失败:', error);
            this.showNotification('生成激活码失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 生成随机激活码
     */
    generateRandomCode() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 12; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    /**
     * 重置单个激活码
     */
    async resetSingleCode(code) {
        try {
            const codeData = this.currentData.codes[code];
            if (!codeData) {
                this.showNotification('激活码不存在', 'error');
                return;
            }
            
            if (!codeData.used) {
                this.showNotification('激活码未使用，无需重置', 'warning');
                return;
            }
            
            // 显示确认对话框
            const usedTime = new Date(codeData.usedAt).toLocaleString('zh-CN');
            const deviceId = codeData.deviceFingerprint || '未知设备';
            
            const confirmed = confirm(
                `确定要重置激活码 "${code}" 吗？\\n\\n` +
                `当前状态: 已使用\\n` +
                `使用时间: ${usedTime}\\n` +
                `使用设备: ${deviceId}\\n\\n` +
                `重置后该激活码将可以重新使用，此操作不可撤销！`
            );
            
            if (!confirmed) return;
            
            console.log('重置激活码:', code);
            
            // 重置激活码状态
            this.currentData.codes[code] = {
                ...codeData,
                used: false,
                usedAt: null,
                usedBy: null,
                deviceFingerprint: null,
                status: 'available'
            };
            
            // 保存到存储
            localStorage.setItem('activationCodes', JSON.stringify(this.currentData.codes));
            
            // 检查并清除相关的激活状态
            this.clearRelatedActivationStatus(code);
            
            // 记录日志
            this.logAction(code, 'reset', '管理员重置激活码');
            
            // 更新统计和界面
            this.calculateStats();
            this.updateInterface();
            
            this.showNotification(`激活码 "${code}" 已重置`, 'success');
            console.log('激活码重置完成');
            
        } catch (error) {
            console.error('重置激活码失败:', error);
            this.showNotification('重置失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 删除激活码
     */
    async deleteCode(code) {
        try {
            const codeData = this.currentData.codes[code];
            if (!codeData) {
                this.showNotification('激活码不存在', 'error');
                return;
            }
            
            // 显示确认对话框
            let confirmMessage = `确定要删除激活码 "${code}" 吗？\\n\\n`;
            
            if (codeData.used) {
                const usedTime = new Date(codeData.usedAt).toLocaleString('zh-CN');
                confirmMessage += `注意: 此激活码已被使用\\n使用时间: ${usedTime}\\n\\n`;
            }
            
            confirmMessage += '此操作不可撤销！';
            
            const confirmed = confirm(confirmMessage);
            if (!confirmed) return;
            
            console.log('删除激活码:', code);
            
            // 删除激活码
            delete this.currentData.codes[code];
            
            // 保存到存储
            localStorage.setItem('activationCodes', JSON.stringify(this.currentData.codes));
            
            // 检查并清除相关的激活状态
            this.clearRelatedActivationStatus(code);
            
            // 记录日志
            this.logAction(code, 'delete', '管理员删除激活码');
            
            // 更新统计和界面
            this.calculateStats();
            this.updateInterface();
            
            this.showNotification(`激活码 "${code}" 已删除`, 'success');
            console.log('激活码删除完成');
            
        } catch (error) {
            console.error('删除激活码失败:', error);
            this.showNotification('删除失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 清除相关的激活状态
     */
    clearRelatedActivationStatus(code) {
        try {
            const currentActivation = JSON.parse(localStorage.getItem('currentActivation') || '{"activated": false}');
            
            if (currentActivation.activated && currentActivation.code === code) {
                localStorage.setItem('currentActivation', JSON.stringify({
                    activated: false,
                    code: null,
                    activatedAt: null,
                    deviceFingerprint: null
                }));
                
                console.log('已清除相关的激活状态');
            }
        } catch (error) {
            console.error('清除激活状态失败:', error);
        }
    }
    
    /**
     * 重置所有激活码
     */
    async resetAllCodes() {
        try {
            const usedCodes = Object.values(this.currentData.codes).filter(code => code.used);
            
            if (usedCodes.length === 0) {
                this.showNotification('没有已使用的激活码需要重置', 'info');
                return;
            }
            
            const confirmed = confirm(
                `确定要重置所有激活码的使用状态吗？\\n\\n` +
                `将重置 ${usedCodes.length} 个已使用的激活码\\n` +
                `此操作不可撤销！`
            );
            
            if (!confirmed) return;
            
            console.log('重置所有激活码...');
            
            // 重置所有激活码
            Object.keys(this.currentData.codes).forEach(code => {
                if (this.currentData.codes[code].used) {
                    this.currentData.codes[code] = {
                        ...this.currentData.codes[code],
                        used: false,
                        usedAt: null,
                        usedBy: null,
                        deviceFingerprint: null,
                        status: 'available'
                    };
                }
            });
            
            // 保存到存储
            localStorage.setItem('activationCodes', JSON.stringify(this.currentData.codes));
            
            // 清除当前激活状态
            localStorage.setItem('currentActivation', JSON.stringify({
                activated: false,
                code: null,
                activatedAt: null,
                deviceFingerprint: null
            }));
            
            // 记录日志
            this.logAction('ALL_CODES', 'reset', '管理员批量重置所有激活码');
            
            // 更新统计和界面
            this.calculateStats();
            this.updateInterface();
            
            this.showNotification(`已重置 ${usedCodes.length} 个激活码`, 'success');
            console.log('所有激活码重置完成');
            
        } catch (error) {
            console.error('重置所有激活码失败:', error);
            this.showNotification('批量重置失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 导出日志
     */
    exportLogs() {
        try {
            console.log('导出日志数据...');
            
            const exportData = {
                exportTime: new Date().toLocaleString('zh-CN'),
                exportTimestamp: Date.now(),
                version: '3.0',
                stats: this.currentData.stats,
                codes: this.currentData.codes,
                logs: this.currentData.logs
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `activation_data_${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(link.href);
            
            this.showNotification('日志数据导出成功', 'success');
            console.log('日志导出完成');
            
        } catch (error) {
            console.error('导出日志失败:', error);
            this.showNotification('导出失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 记录操作日志
     */
    logAction(code, action, description) {
        try {
            const logEntry = {
                code: code,
                timestamp: Date.now(),
                action: action,
                description: description,
                type: 'admin',
                version: '3.0'
            };
            
            this.currentData.logs.push(logEntry);
            localStorage.setItem('activationLogs', JSON.stringify(this.currentData.logs));
            
            console.log('操作日志已记录:', logEntry);
            
        } catch (error) {
            console.error('记录操作日志失败:', error);
        }
    }
    
    /**
     * 显示通知消息
     */
    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // 简单的alert实现，可以后续改为更美观的通知组件
        if (type === 'error') {
            alert('错误: ' + message);
        } else if (type === 'warning') {
            alert('警告: ' + message);
        } else if (type === 'success') {
            alert('成功: ' + message);
        } else {
            alert(message);
        }
    }
}

// 全局初始化函数
function initializeAdminSystem() {
    try {
        console.log('初始化管理员系统...');
        window.adminSystem = new AdminSystem();
    } catch (error) {
        console.error('管理员系统初始化失败:', error);
        alert('系统初始化失败，请刷新页面重试');
    }
}

// 确保DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminSystem);
} else {
    initializeAdminSystem();
}

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminSystem;
}
/**
 * 智能导员管理系统 v5.0
 * 集成维格表云存储的激活码管理系统
 */

class AdminSystem {
    constructor() {
        // 管理员激活码
        this.ADMIN_CODE = 'ADMIN2024';
        
        // 系统状态
        this.isInitialized = false;
        this.vikaStorage = null;
        this.currentData = {
            codes: {},
            logs: [],
            stats: {
                total: 0,
                used: 0,
                unused: 0
            }
        };
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 管理系统初始化开始...');
            
            // 验证管理员权限
            if (!this.verifyAdminAccess()) {
                this.redirectToActivation();
                return;
            }
            
            // 等待维格表云存储初始化
            await this.waitForVikaStorage();
            
            // 加载数据
            await this.loadData();
            
            // 初始化界面
            this.initializeInterface();
            
            // 初始化同步界面
            this.initializeSyncInterface();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ 管理系统初始化完成');
            
        } catch (error) {
            console.error('❌ 管理系统初始化失败:', error);
            this.showNotification('系统初始化失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 等待维格表云存储就绪
     */
    async waitForVikaStorage() {
        return new Promise((resolve) => {
            if (window.vikaCloudStorage) {
                this.vikaStorage = window.vikaCloudStorage;
                console.log('📦 维格表云存储已连接');
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
     * 验证管理员访问权限
     */
    verifyAdminAccess() {
        const userCode = localStorage.getItem('userActivationCode');
        const userDevice = localStorage.getItem('userDeviceId');
        const adminPassword = sessionStorage.getItem('adminPasswordVerified');
        
        console.log('🔍 权限验证 - 激活码:', userCode, '设备ID:', userDevice, '密码验证:', adminPassword);
        
        // 检查是否使用管理员激活码激活
        if (userCode === this.ADMIN_CODE && userDevice) {
            console.log('✅ 管理员权限验证通过 (管理员激活码)');
            return true;
        }
        
        // 检查是否使用开发者激活码激活
        if (userCode === 'jqkkf0922' && userDevice) {
            console.log('✅ 管理员权限验证通过 (开发者激活码)');
            return true;
        }
        
        // 检查是否通过开发者密码验证
        if (adminPassword === 'jqkkf0922' && userDevice) {
            console.log('✅ 管理员权限验证通过 (开发者密码)');
            return true;
        }
        
        console.log('❌ 管理员权限验证失败 - 需要使用管理员激活码(ADMIN2024)、开发者激活码(jqkkf0922)或开发者密码');
        return false;
    }
    
    /**
     * 重定向到激活页面
     */
    redirectToActivation() {
        alert('访问管理员界面需要满足以下条件之一：\n1. 使用管理员激活码 ADMIN2024 激活系统\n2. 使用开发者激活码 jqkkf0922 激活系统\n3. 在智能导员界面输入开发者密码 jqkkf0922');
        window.location.href = 'index.html';
    }
    
    /**
     * 加载数据
     */
    async loadData() {
        try {
            console.log('📊 加载管理员数据...');
            
            if (this.vikaStorage && this.vikaStorage.isInitialized) {
                console.log('从维格表云存储加载数据...');
                this.currentData.codes = await this.vikaStorage.getActivationCodes();
                this.currentData.logs = await this.vikaStorage.getLogs();
            } else {
                console.log('从本地存储加载数据...');
                this.currentData.codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
                this.currentData.logs = JSON.parse(localStorage.getItem('activationLogs') || '[]');
            }
            
            this.calculateStats();
            console.log('数据加载完成:', this.currentData.stats);
            
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showNotification('加载数据失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 计算统计数据
     */
    calculateStats() {
        const codes = this.currentData.codes;
        const total = Object.keys(codes).length;
        const used = Object.values(codes).filter(code => code.isUsed).length;
        const unused = total - used;
        
        this.currentData.stats = { total, used, unused };
    }
    
    /**
     * 初始化界面
     */
    initializeInterface() {
        this.displayStats();
        this.displayActivationCodes();
        this.displayLogs();
        
        // 显示管理员通知
        this.showAdminNotice();
    }
    
    /**
     * 初始化同步界面
     */
    initializeSyncInterface() {
        this.updateSyncStatus();
        this.updateSyncInfo();
    }
    
    /**
     * 显示统计信息
     */
    displayStats() {
        const stats = this.currentData.stats;
        
        // 更新统计卡片
        this.updateElement('totalCodes', stats.total);
        this.updateElement('usedCodes', stats.used);
        this.updateElement('unusedCodes', stats.unused);
        
        // 更新使用率
        const usageRate = stats.total > 0 ? ((stats.used / stats.total) * 100).toFixed(1) : 0;
        this.updateElement('usageRate', usageRate + '%');
    }
    
    /**
     * 显示激活码列表
     */
    displayActivationCodes() {
        const container = document.getElementById('codesContainer');
        if (!container) return;
        
        const codes = this.currentData.codes;
        
        if (Object.keys(codes).length === 0) {
            container.innerHTML = `
                <div class="no-codes">
                    <i class="fas fa-inbox"></i>
                    <p>暂无激活码</p>
                    <button class="generate-first-code" onclick="adminSystem.generateNewCode()">
                        <i class="fas fa-plus"></i> 生成第一个激活码
                    </button>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        Object.entries(codes).forEach(([code, info]) => {
            const statusClass = info.isUsed ? 'used' : 'unused';
            const statusText = info.isUsed ? '已使用' : '未使用';
            const statusIcon = info.isUsed ? 'fas fa-check-circle' : 'fas fa-clock';
            
            html += `
                <div class="code-item ${statusClass}" data-code="${code}">
                    <div class="code-header">
                        <div class="code-info">
                            <span class="code-text">${code}</span>
                            <span class="code-status">
                                <i class="${statusIcon}"></i> ${statusText}
                            </span>
                        </div>
                        <div class="code-actions">
                            <button class="reset-button" onclick="adminSystem.resetSingleCode('${code}')" 
                                    title="重置激活码" ${!info.isUsed ? 'disabled' : ''}>
                                <i class="fas fa-undo"></i>
                            </button>
                            <button class="delete-button" onclick="adminSystem.deleteCode('${code}')" 
                                    title="删除激活码">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="code-meta">
                        <div class="detail-row">
                            <span class="label">创建时间:</span>
                            <span class="value">${this.formatDate(info.createdAt)}</span>
                        </div>
                        
                        ${info.isUsed ? `
                            <div class="detail-row">
                                <span class="label">使用时间:</span>
                                <span class="value">${this.formatDate(info.usedAt)}</span>
                            </div>
                            
                            ${info.usedBy ? `
                                <div class="detail-row">
                                    <span class="label">使用设备:</span>
                                    <span class="value device-info">${info.usedBy.deviceId || 'unknown'}</span>
                                </div>
                                
                                <div class="detail-row">
                                    <span class="label">用户代理:</span>
                                    <span class="value user-agent">${this.truncateText(info.usedBy.userAgent || 'unknown', 50)}</span>
                                </div>
                            ` : ''}
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    /**
     * 显示日志
     */
    displayLogs() {
        const container = document.getElementById('logsContainer');
        if (!container) return;
        
        const logs = this.currentData.logs;
        
        if (logs.length === 0) {
            container.innerHTML = `
                <div class="no-logs">
                    <i class="fas fa-clipboard-list"></i>
                    <p>暂无操作日志</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        logs.slice(0, 50).forEach(log => { // 只显示最近50条
            const actionText = this.getActionText(log.action);
            const actionClass = this.getActionClass(log.action);
            
            html += `
                <div class="log-item">
                    <div class="log-header">
                        <span class="log-action ${actionClass}">
                            <i class="${this.getActionIcon(log.action)}"></i>
                            ${actionText}
                        </span>
                        <span class="log-time">${this.formatDate(log.timestamp)}</span>
                    </div>
                    
                    <div class="log-details">
                        <span class="log-code">激活码: ${log.code}</span>
                        
                        ${log.deviceInfo ? `
                            <div class="device-info">
                                <span>设备: ${log.deviceInfo.deviceId || 'unknown'}</span>
                                <span>平台: ${log.deviceInfo.platform || 'unknown'}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    /**
     * 显示管理员通知
     */
    showAdminNotice() {
        const notice = document.querySelector('.admin-notice');
        if (notice) {
            notice.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <div>
                    <strong>管理员模式</strong>
                    <p>您正在使用管理员权限访问激活码管理系统。重置功能会将激活码恢复到未使用状态，允许重新激活。</p>
                </div>
            `;
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 生成激活码按钮
        const generateButton = document.getElementById('generateButton');
        if (generateButton) {
            generateButton.addEventListener('click', () => this.generateNewCode());
        }
        
        // 重置所有激活码按钮
        const resetAllButton = document.getElementById('resetAllButton');
        if (resetAllButton) {
            resetAllButton.addEventListener('click', () => this.resetAllCodes());
        }
        
        // 导出日志按钮
        const exportButton = document.getElementById('exportButton');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportLogs());
        }
        
        // 刷新数据按钮
        const refreshButton = document.getElementById('refreshButton');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshData());
        }
        
        // 设置同步事件监听器
        this.setupSyncEventListeners();
    }
    
    /**
     * 设置同步事件监听器
     */
    setupSyncEventListeners() {
        // 从云端获取数据
        const syncFromCloudButton = document.getElementById('syncFromCloud');
        if (syncFromCloudButton) {
            syncFromCloudButton.addEventListener('click', () => this.syncFromCloud());
        }
        
        // 推送到云端
        const syncToCloudButton = document.getElementById('syncToCloud');
        if (syncToCloudButton) {
            syncToCloudButton.addEventListener('click', () => this.syncToCloud());
        }
        
        // 强制同步
        const forceSyncButton = document.getElementById('forceSync');
        if (forceSyncButton) {
            forceSyncButton.addEventListener('click', () => this.forceSync());
        }
    }
    
    /**
     * 生成新激活码
     */
    async generateNewCode() {
        try {
            const newCode = this.generateRandomCode();
            
            if (this.vikaStorage && this.vikaStorage.isInitialized) {
                const result = await this.vikaStorage.createActivationCode(newCode);
                if (result.success) {
                    this.showNotification(`激活码 ${newCode} 生成成功`, 'success');
                    await this.refreshData();
                } else {
                    this.showNotification(result.message || '生成激活码失败', 'error');
                }
            } else {
                // 本地模式
                const codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
                if (codes[newCode]) {
                    this.showNotification('激活码已存在，请重新生成', 'error');
                    return;
                }
                
                codes[newCode] = {
                    isUsed: false,
                    usedAt: null,
                    usedBy: null,
                    createdAt: new Date().toISOString()
                };
                
                localStorage.setItem('activationCodes', JSON.stringify(codes));
                this.showNotification(`激活码 ${newCode} 生成成功（本地模式）`, 'success');
                await this.refreshData();
            }
            
        } catch (error) {
            console.error('生成激活码失败:', error);
            this.showNotification('生成激活码失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 重置单个激活码
     */
    async resetSingleCode(code) {
        if (!confirm(`确定要重置激活码 "${code}" 吗？这将允许该激活码重新使用。`)) {
            return;
        }
        
        try {
            if (this.vikaStorage && this.vikaStorage.isInitialized) {
                const result = await this.vikaStorage.resetActivationCode(code);
                if (result.success) {
                    this.showNotification(`激活码 ${code} 重置成功`, 'success');
                    await this.refreshData();
                } else {
                    this.showNotification(result.message || '重置失败', 'error');
                }
            } else {
                // 本地模式
                const codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
                if (codes[code]) {
                    codes[code] = {
                        ...codes[code],
                        isUsed: false,
                        usedAt: null,
                        usedBy: null
                    };
                    
                    localStorage.setItem('activationCodes', JSON.stringify(codes));
                    this.showNotification(`激活码 ${code} 重置成功（本地模式）`, 'success');
                    await this.refreshData();
                } else {
                    this.showNotification('激活码不存在', 'error');
                }
            }
            
        } catch (error) {
            console.error('重置激活码失败:', error);
            this.showNotification('重置失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 删除激活码
     */
    async deleteCode(code) {
        if (!confirm(`确定要删除激活码 "${code}" 吗？此操作不可恢复。`)) {
            return;
        }
        
        try {
            if (this.vikaStorage && this.vikaStorage.isInitialized) {
                const result = await this.vikaStorage.deleteActivationCode(code);
                if (result.success) {
                    this.showNotification(`激活码 ${code} 删除成功`, 'success');
                    await this.refreshData();
                } else {
                    this.showNotification(result.message || '删除失败', 'error');
                }
            } else {
                // 本地模式
                const codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
                if (codes[code]) {
                    delete codes[code];
                    localStorage.setItem('activationCodes', JSON.stringify(codes));
                    this.showNotification(`激活码 ${code} 删除成功（本地模式）`, 'success');
                    await this.refreshData();
                } else {
                    this.showNotification('激活码不存在', 'error');
                }
            }
            
        } catch (error) {
            console.error('删除激活码失败:', error);
            this.showNotification('删除失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 重置所有激活码
     */
    async resetAllCodes() {
        if (!confirm('确定要重置所有激活码吗？这将清除所有使用记录。')) {
            return;
        }
        
        try {
            const codes = this.currentData.codes;
            let resetCount = 0;
            
            for (const [code, info] of Object.entries(codes)) {
                if (info.isUsed) {
                    if (this.vikaStorage && this.vikaStorage.isInitialized) {
                        await this.vikaStorage.resetActivationCode(code);
                    } else {
                        // 本地模式
                        const localCodes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
                        if (localCodes[code]) {
                            localCodes[code] = {
                                ...localCodes[code],
                                isUsed: false,
                                usedAt: null,
                                usedBy: null
                            };
                        }
                        localStorage.setItem('activationCodes', JSON.stringify(localCodes));
                    }
                    resetCount++;
                }
            }
            
            this.showNotification(`成功重置 ${resetCount} 个激活码`, 'success');
            await this.refreshData();
            
        } catch (error) {
            console.error('重置所有激活码失败:', error);
            this.showNotification('重置失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 导出日志
     */
    exportLogs() {
        try {
            const logs = this.currentData.logs;
            const csvContent = this.convertLogsToCSV(logs);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `activation_logs_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showNotification('日志导出成功', 'success');
            }
            
        } catch (error) {
            console.error('导出日志失败:', error);
            this.showNotification('导出失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 刷新数据
     */
    async refreshData() {
        try {
            this.showNotification('正在刷新数据...', 'info');
            await this.loadData();
            this.displayStats();
            this.displayActivationCodes();
            this.displayLogs();
            this.updateSyncInfo();
            this.showNotification('数据刷新完成', 'success');
        } catch (error) {
            console.error('刷新数据失败:', error);
            this.showNotification('刷新失败: ' + error.message, 'error');
        }
    }
    
    // ========== 维格表同步方法 ==========
    
    /**
     * 更新同步状态
     */
    updateSyncStatus() {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (!statusIndicator || !statusText) return;
        
        if (this.vikaStorage && this.vikaStorage.isInitialized) {
            statusIndicator.className = 'status-indicator connected';
            statusText.textContent = '维格表已连接';
        } else {
            statusIndicator.className = 'status-indicator disconnected';
            statusText.textContent = '本地模式';
        }
    }
    
    /**
     * 更新同步信息
     */
    updateSyncInfo() {
        const syncInfo = document.getElementById('syncInfo');
        if (!syncInfo) return;
        
        const status = this.vikaStorage ? this.vikaStorage.getConnectionStatus() : null;
        
        let infoHtml = '<div class="sync-info-item">';
        
        if (status) {
            infoHtml += `
                <div class="info-row">
                    <span class="info-label">存储类型:</span>
                    <span class="info-value">${status.storageType === 'vika' ? '维格表云存储' : '本地存储'}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">连接状态:</span>
                    <span class="info-value ${status.isOnline ? 'online' : 'offline'}">
                        ${status.isOnline ? '在线' : '离线'}
                    </span>
                </div>
                
                ${status.lastSync ? `
                    <div class="info-row">
                        <span class="info-label">最后同步:</span>
                        <span class="info-value">${this.formatDate(status.lastSync)}</span>
                    </div>
                ` : ''}
            `;
        } else {
            infoHtml += `
                <div class="info-row">
                    <span class="info-label">存储类型:</span>
                    <span class="info-value">本地存储</span>
                </div>
            `;
        }
        
        infoHtml += '</div>';
        syncInfo.innerHTML = infoHtml;
    }
    
    /**
     * 从云端同步数据
     */
    async syncFromCloud() {
        if (!this.vikaStorage || !this.vikaStorage.isInitialized) {
            this.showSyncError('维格表云存储未初始化');
            return;
        }
        
        try {
            this.showSyncProgress('正在从维格表获取数据...');
            this.setSyncButtonsEnabled(false);
            
            const result = await this.vikaStorage.syncFromVika();
            
            if (result.success) {
                await this.refreshData();
                this.showSyncResults('从云端同步成功', 'success');
            } else {
                this.showSyncError('同步失败: ' + result.message);
            }
            
        } catch (error) {
            console.error('从云端同步失败:', error);
            this.showSyncError('同步失败: ' + error.message);
        } finally {
            this.setSyncButtonsEnabled(true);
        }
    }
    
    /**
     * 推送数据到云端
     */
    async syncToCloud() {
        if (!this.vikaStorage || !this.vikaStorage.isInitialized) {
            this.showSyncError('维格表云存储未初始化');
            return;
        }
        
        try {
            this.showSyncProgress('正在推送数据到维格表...');
            this.setSyncButtonsEnabled(false);
            
            const result = await this.vikaStorage.syncToVika();
            
            if (result.success) {
                this.showSyncResults('推送到云端成功', 'success');
            } else {
                this.showSyncError('推送失败: ' + result.message);
            }
            
        } catch (error) {
            console.error('推送到云端失败:', error);
            this.showSyncError('推送失败: ' + error.message);
        } finally {
            this.setSyncButtonsEnabled(true);
        }
    }
    
    /**
     * 强制双向同步
     */
    async forceSync() {
        if (!this.vikaStorage || !this.vikaStorage.isInitialized) {
            this.showSyncError('维格表云存储未初始化');
            return;
        }
        
        if (!confirm('强制同步将进行双向数据同步，可能会覆盖现有数据。确定继续吗？')) {
            return;
        }
        
        try {
            this.showSyncProgress('正在执行强制同步...');
            this.setSyncButtonsEnabled(false);
            
            const result = await this.vikaStorage.forceSync();
            
            if (result.success) {
                await this.refreshData();
                this.showSyncResults('强制同步成功', 'success');
            } else {
                this.showSyncError('强制同步失败: ' + result.message);
            }
            
        } catch (error) {
            console.error('强制同步失败:', error);
            this.showSyncError('强制同步失败: ' + error.message);
        } finally {
            this.setSyncButtonsEnabled(true);
        }
    }
    
    /**
     * 显示同步进度
     */
    showSyncProgress(message) {
        const syncResults = document.getElementById('syncResults');
        if (syncResults) {
            syncResults.innerHTML = `
                <div class="sync-progress">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>${message}</span>
                </div>
            `;
            syncResults.style.display = 'block';
        }
    }
    
    /**
     * 显示同步结果
     */
    showSyncResults(message, type) {
        const syncResults = document.getElementById('syncResults');
        if (syncResults) {
            const icon = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
            syncResults.innerHTML = `
                <div class="sync-result ${type}">
                    <i class="${icon}"></i>
                    <span>${message}</span>
                </div>
            `;
            syncResults.style.display = 'block';
            
            // 3秒后自动隐藏
            setTimeout(() => {
                syncResults.style.display = 'none';
            }, 3000);
        }
    }
    
    /**
     * 显示同步错误
     */
    showSyncError(message) {
        this.showSyncResults(message, 'error');
    }
    
    /**
     * 设置同步按钮启用状态
     */
    setSyncButtonsEnabled(enabled) {
        const buttons = ['syncFromCloud', 'syncToCloud', 'forceSync'];
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = !enabled;
            }
        });
    }
    
    // ========== 工具方法 ==========
    
    /**
     * 生成随机激活码
     */
    generateRandomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 12; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    /**
     * 格式化日期
     */
    formatDate(dateString) {
        if (!dateString) return '未知';
        
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    /**
     * 截断文本
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    /**
     * 获取操作文本
     */
    getActionText(action) {
        const actionMap = {
            'used': '使用激活码',
            'reset': '重置激活码',
            'created': '创建激活码',
            'deleted': '删除激活码',
            'developer_access': '开发者访问'
        };
        return actionMap[action] || action;
    }
    
    /**
     * 获取操作样式类
     */
    getActionClass(action) {
        const classMap = {
            'used': 'action-used',
            'reset': 'action-reset',
            'created': 'action-created',
            'deleted': 'action-deleted',
            'developer_access': 'action-developer'
        };
        return classMap[action] || 'action-default';
    }
    
    /**
     * 获取操作图标
     */
    getActionIcon(action) {
        const iconMap = {
            'used': 'fas fa-key',
            'reset': 'fas fa-undo',
            'created': 'fas fa-plus',
            'deleted': 'fas fa-trash',
            'developer_access': 'fas fa-code'
        };
        return iconMap[action] || 'fas fa-info-circle';
    }
    
    /**
     * 转换日志为CSV格式
     */
    convertLogsToCSV(logs) {
        const headers = ['时间', '激活码', '操作', '设备ID', '平台', '用户代理'];
        const csvRows = [headers.join(',')];
        
        logs.forEach(log => {
            const row = [
                `"${this.formatDate(log.timestamp)}"`,
                `"${log.code}"`,
                `"${this.getActionText(log.action)}"`,
                `"${log.deviceInfo?.deviceId || 'unknown'}"`,
                `"${log.deviceInfo?.platform || 'unknown'}"`,
                `"${log.userAgent || 'unknown'}"`
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    /**
     * 更新元素内容
     */
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }
    
    /**
     * 显示通知
     */
    showNotification(message, type) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => notification.classList.add('show'), 100);
        
        // 自动移除
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// 页面加载完成后初始化管理系统
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 智能导员管理系统 v5.0 - 维格表云存储版本');
    window.adminSystem = new AdminSystem();
});

console.log('📦 管理系统模块已加载 - 维格表云存储版本 v5.0');

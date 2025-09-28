/**
 * 智能导员管理系统 v6.0
 * 简化的日志查看和管理系�? */

class AdminSystem {
    constructor() {
        this.vikaStorage = null;
        this.currentData = {
            logs: []
        };

        this.init();
    }

    async init() {
        try {
            console.log('🚀 初始化管理员系统...');

            // 等待维格表云存储初始�?            await this.waitForVikaStorage();

            // 加载数据
            await this.loadData();

            // 设置事件监听�?            this.setupEventListeners();

            // 显示数据
            this.displayData();

            console.log('�?管理员系统初始化完成');

        } catch (error) {
            console.error('�?管理员系统初始化失败:', error);
            this.showNotification('系统初始化失败，请刷新页面重�?, 'error');
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
                    resolve();
                });

                // 如果长时间没有初始化，手动初始化
                setTimeout(() => {
                    if (!this.vikaStorage && window.VikaCloudStorage && !window.vikaCloudStorage) {
                        window.vikaCloudStorage = new VikaCloudStorage();
                        this.vikaStorage = window.vikaCloudStorage;
                        resolve();
                    }
                }, 3000);
            }
        });
    }

    async loadData() {
        try {
            if (this.vikaStorage && this.vikaStorage.isInitialized) {
                console.log('�?从维格表云存储加载日志数�?..');

                // 获取日志数据
                const cloudLogs = await this.vikaStorage.getLogs();
                console.log('🔍 从云端获取的日志:', cloudLogs);
                console.log('🔍 日志数量:', cloudLogs ? cloudLogs.length : 0);

                // 更新当前数据
                this.currentData.logs = cloudLogs || [];

                // 同步到本地存�?                localStorage.setItem('activationLogs', JSON.stringify(this.currentData.logs));

            } else {
                console.log('📊 加载本地日志数据...');

                this.currentData.logs = JSON.parse(localStorage.getItem('activationLogs') || '[]');
            }

        } catch (error) {
            console.error('加载日志数据失败:', error);
            // 加载本地数据作为备用
            this.currentData.logs = JSON.parse(localStorage.getItem('activationLogs') || '[]');
        }
    }

    async refreshData() {
        await this.loadData();
        this.displayData();
    }

    /**
     * 显示日志列表
     */
    displayData() {
        const container = document.getElementById('logsList');
        if (!container) {
            console.error('�?找不到日志容�?#logsList');
            return;
        }

        const logs = this.currentData.logs;
        console.log('📊 显示日志数据:', logs);
        console.log('📊 日志数量:', logs.length);

        if (logs.length === 0) {
            container.innerHTML = `
                <div class="no-logs">
                    <i class="fas fa-inbox"></i>
                    <p>暂无使用日志</p>
                </div>
            `;
            return;
        }

        let html = '';

        logs.forEach((log, index) => {
            const timeStr = this.formatDate(log.timestamp);
            const actionIcon = log.action === 'used' ? 'fas fa-check-circle' : 'fas fa-undo';
            const actionText = log.action === 'used' ? '使用' : '重置';

            html += `
                <div class="log-item">
                    <div class="log-header">
                        <div class="log-main">
                            <span class="log-action">
                                <i class="${actionIcon}"></i> ${actionText}
                            </span>
                            <span class="log-time">${timeStr}</span>
                        </div>
                    </div>

                    <div class="log-details">
                        <span class="log-code">激活码: ${log.code}</span>
                        ${log.deviceInfo ? `
                            <div class="device-info">
                                <span class="device-label">设备信息:</span>
                                <span class="device-id">${log.deviceInfo.deviceId ? log.deviceInfo.deviceId.substring(0, 16) + '...' : '未知'}</span>
                                <span class="device-platform">${log.deviceInfo.platform || '未知'}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        console.log('📊 生成的HTML长度:', html.length);
        container.innerHTML = html;
        console.log('�?日志列表已更�?);
    }

    /**
     * 格式化日期显�?     */
    formatDate(dateStr) {
        if (!dateStr) return '未知时间';

        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diff = now - date;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const days = Math.floor(hours / 24);

            if (days > 0) {
                return `${days}天前`;
            } else if (hours > 0) {
                return `${hours}小时前`;
            } else {
                return '刚刚';
            }
        } catch (error) {
            return '时间格式错误';
        }
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${this.getIconForType(type)}"></i>
            <span>${message}</span>
        `;

        // 添加到页�?        document.body.appendChild(notification);

        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // 自动移除
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getIconForType(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }

    /**
     * 设置事件监听�?     */
    setupEventListeners() {
        // 同步按钮
        const syncButton = document.getElementById('syncFromCloud');
        if (syncButton) {
            syncButton.addEventListener('click', async () => {
                try {
                    this.showNotification('正在从云端同步数�?..', 'info');
                    await this.refreshData();
                    this.showNotification('数据同步完成', 'success');
                } catch (error) {
                    console.error('同步失败:', error);
                    this.showNotification('同步失败，请重试', 'error');
                }
            });
        }

        // 清除本地数据按钮
        const clearButton = document.getElementById('clearLocalData');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (confirm('确定要清除所有本地数据吗？此操作不可恢复�?)) {
                    localStorage.removeItem('activationLogs');
                    this.currentData.logs = [];
                    this.displayData();
                    this.showNotification('本地数据已清�?, 'success');
                }
            });
        }
    }
}

// 页面加载完成后初始化管理员系�?document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 智能导员管理系统 v6.0 - 日志查看版本');
    window.adminSystem = new AdminSystem();
});
            }
        });
    }
    
    /**
     * 回退到本地模�?     */
    fallbackToLocalMode() {
        console.log('🔄 回退到本地模�?..');

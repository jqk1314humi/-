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
                    usedBy: null
                };
            });
            localStorage.setItem('activationCodes', JSON.stringify(codes));
        }
        
        // 初始化使用日志
        if (!localStorage.getItem('activationLogs')) {
            localStorage.setItem('activationLogs', JSON.stringify([]));
        }
    }
    
    setupEventListeners() {
        const backButton = document.getElementById('backToMainApp');
        const resetButton = document.getElementById('resetAllCodes');
        const exportButton = document.getElementById('exportLogs');
        const tabButtons = document.querySelectorAll('.tab-button');
        
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = './advisor.html';
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
        if (!codesList) return;
        
        const codes = JSON.parse(localStorage.getItem('activationCodes'));
        codesList.innerHTML = '';
        
        Object.entries(codes).forEach(([code, info]) => {
            const codeItem = document.createElement('div');
            codeItem.className = 'code-item';
            
            const statusClass = info.used ? 'used' : 'available';
            const statusText = info.used ? '已使用' : '未使用';
            
            codeItem.innerHTML = `
                <div class="code-info">
                    <span class="code-text">${code}</span>
                    <span class="code-status ${statusClass}">${statusText}</span>
                </div>
                ${info.used ? `<div class="log-time">${new Date(info.usedAt).toLocaleString('zh-CN')}</div>` : ''}
            `;
            
            codesList.appendChild(codeItem);
        });
    }
    
    updateLogsList() {
        const logsList = document.getElementById('logsList');
        if (!logsList) return;
        
        const logs = JSON.parse(localStorage.getItem('activationLogs'));
        logsList.innerHTML = '';
        
        // 按时间倒序排列
        logs.sort((a, b) => b.timestamp - a.timestamp);
        
        logs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            
            const logType = log.type === 'developer' ? '开发者' : '用户';
            const logTime = new Date(log.timestamp).toLocaleString('zh-CN');
            
            logItem.innerHTML = `
                <div class="log-header">
                    <span class="log-code">${log.code}</span>
                    <span class="log-time">${logTime}</span>
                </div>
                <div class="log-details">
                    类型: ${logType} | 平台: ${log.clientInfo.platform} | 语言: ${log.clientInfo.language}
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
                    usedBy: null
                };
            });
            localStorage.setItem('activationCodes', JSON.stringify(codes));
            
            // 清除当前激活状态
            localStorage.setItem('currentActivation', JSON.stringify({
                activated: false,
                code: null,
                activatedAt: null
            }));
            
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
}

// 页面加载完成后初始化管理员面板
document.addEventListener('DOMContentLoaded', () => {
    new AdminManager();
});

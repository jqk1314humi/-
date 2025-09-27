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
        this.initializeUI();
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
        
        // 初始化当前激活状态
        if (!localStorage.getItem('currentActivation')) {
            localStorage.setItem('currentActivation', JSON.stringify({
                activated: false,
                code: null,
                activatedAt: null
            }));
        }
    }
    
    initializeUI() {
        // 检查当前激活状态
        const currentActivation = JSON.parse(localStorage.getItem('currentActivation'));
        
        if (currentActivation.activated) {
            this.showMainApp();
        } else {
            this.showActivationPage();
        }
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // 激活页面事件
        const activationInput = document.getElementById('activationInput');
        const activationButton = document.getElementById('activationButton');
        
        if (activationInput && activationButton) {
            activationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleActivation();
                }
            });
            
            activationButton.addEventListener('click', () => {
                this.handleActivation();
            });
            
            activationInput.addEventListener('input', () => {
                this.updateActivationButtonState();
            });
        }
        
        // 主应用管理员按钮事件
        const adminButtonMain = document.getElementById('adminButtonMain');
        if (adminButtonMain) {
            adminButtonMain.addEventListener('click', () => {
                this.showAdminPasswordPrompt();
            });
        }
        
        // 管理员面板事件
        this.setupAdminEventListeners();
    }
    
    setupAdminEventListeners() {
        const backButton = document.getElementById('backToMainApp');
        const resetButton = document.getElementById('resetAllCodes');
        const exportButton = document.getElementById('exportLogs');
        const tabButtons = document.querySelectorAll('.tab-button');
        
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.showMainApp();
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
                this.showMessage(activationMessage, '激活成功！正在进入应用...', 'success');
                
                setTimeout(() => {
                    this.showMainApp();
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
            usedBy: this.getClientInfo()
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
    
    showActivationPage() {
        // 确保所有页面都被隐藏
        document.getElementById('activationPage').classList.remove('hidden');
        document.getElementById('adminPanel').classList.add('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        
        // 强制重新计算样式（移动设备兼容）
        document.getElementById('activationPage').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('mainApp').style.display = 'none';
        
        // 重置激活输入框
        const activationInput = document.getElementById('activationInput');
        const activationButton = document.getElementById('activationButton');
        const activationMessage = document.getElementById('activationMessage');
        
        if (activationInput) activationInput.value = '';
        if (activationButton) {
            activationButton.disabled = true;
            activationButton.innerHTML = '<i class="fas fa-check"></i> 激活';
        }
        if (activationMessage) {
            activationMessage.textContent = '';
            activationMessage.className = 'activation-message';
        }
    }
    
    showAdminPasswordPrompt() {
        const password = prompt('请输入管理员密码：');
        if (password === this.DEVELOPER_CODE) {
            this.showAdminPanel();
        } else if (password !== null) {
            alert('密码错误！');
        }
    }
    
    showAdminPanel() {
        document.getElementById('activationPage').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        
        // 强制重新计算样式（移动设备兼容）
        document.getElementById('activationPage').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
        
        this.updateAdminPanel();
    }
    
    showMainApp() {
        document.getElementById('activationPage').classList.add('hidden');
        document.getElementById('adminPanel').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        // 强制重新计算样式（移动设备兼容）
        document.getElementById('activationPage').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        // 初始化智能导员应用
        if (!window.smartAdvisor) {
            window.smartAdvisor = new SmartAdvisor();
        }
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

// 智能导员聊天应用
class SmartAdvisor {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendButton');
        this.clearButton = document.querySelector('.header-right');
        this.questionItems = document.querySelectorAll('.question-item');
        
        this.apiConfig = {
            token: 'pat_KXu4Wwa2VuyrOo2YxzdLNVgtoZgt8oANTFybMkHJVwioq7GgguDwFJuD951mvMwq',
            baseURL: 'https://api.coze.cn',
            workflowId: '7554244256456032295',
            botId: '7553901337742802980'
        };
        
        // 用于保存原始消息内容的数组
        this.messageHistory = [];
        
        this.initializeEventListeners();
        this.loadChatHistory();
        this.initializeMarkdown();
    }

    initializeMarkdown() {
        console.log('自定义Markdown解析器初始化成功');
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    parseMarkdown(text) {
        if (!text) return '';
        
        // 转义HTML以防止XSS攻击
        text = this.escapeHTML(text);
        
        // 处理标题 # H1, ## H2, ### H3
        text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        text = text.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
        text = text.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
        text = text.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
        
        // 处理加粗 **text** 或 __text__
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
        
        // 处理斜体 *text* 或 _text_
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        text = text.replace(/_(.*?)_/g, '<em>$1</em>');
        
        // 处理删除线 ~~text~~
        text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');
        
        // 处理代码块 ```code```
        text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // 处理行内代码 `code`
        text = text.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // 处理无序列表 - item
        text = text.replace(/^- (.*$)/gm, '<li>$1</li>');
        
        // 处理有序列表 1. item
        text = text.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
        
        // 处理链接 [text](url)
        text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // 处理引用 > text
        text = text.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
        
        // 处理分割线 ---
        text = text.replace(/^---$/gm, '<hr>');
        
        // 处理表格（简单版本）
        text = text.replace(/\|(.+)\|/g, function(match, content) {
            const cells = content.split('|').map(cell => cell.trim());
            return '<tr>' + cells.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
        });
        
        // 包装列表项 - 简单版本
        text = text.replace(/(<li>.*<\/li>)/gs, function(match) {
            return '<ul>' + match + '</ul>';
        });
        
        // 处理段落（通过换行符）
        text = text.replace(/^(?!<h[1-6]>|<ul>|<ol>|<pre>|<blockquote>|<hr>|<table>)(.*$)/gm, '<p>$1</p>');
        
        // 处理多余的空行
        text = text.replace(/\n\n+/g, '\n');
        
        // 合并相邻的列表项
        text = text.replace(/<\/li><\/ul>\s*<ul><li>/g, '');
        text = text.replace(/<\/li><\/ol>\s*<ol><li>/g, '');
        
        // 处理表格包装
        text = text.replace(/(<tr>.*<\/tr>)/gs, '<table>$1</table>');
        
        return text;
    }

    renderMarkdown(text) {
        if (text) {
            try {
                return this.parseMarkdown(text);
            } catch (error) {
                console.error('Markdown解析失败:', error);
                return this.escapeHTML(text);
            }
        }
        return this.escapeHTML(text);
    }

    initializeEventListeners() {
        // 发送按钮点击事件
        this.sendButton.addEventListener('click', () => this.handleSendMessage());
        
        // 输入框回车事件
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
        
        // 清空聊天事件
        this.clearButton.addEventListener('click', () => this.clearChat());
        
        // 快速提问事件
        this.questionItems.forEach(item => {
            item.addEventListener('click', () => {
                const questionText = item.querySelector('span').textContent;
                this.chatInput.value = questionText;
                this.handleSendMessage();
            });
        });
        
        // 输入框输入事件
        this.chatInput.addEventListener('input', () => {
            this.updateSendButtonState();
        });
    }

    updateSendButtonState() {
        const hasText = this.chatInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText;
    }

    async handleSendMessage() {
        const userInput = this.chatInput.value.trim();
        if (!userInput) return;

        // 清空输入框并禁用发送按钮
        this.chatInput.value = '';
        this.updateSendButtonState();
        
        // 禁用输入框和发送按钮，防止重复发送
        this.chatInput.disabled = true;
        this.sendButton.disabled = true;

        // 添加用户消息
        this.addMessage(userInput, 'user');

        // 添加流式消息容器
        const streamingMessage = this.addStreamingMessage('advisor');
        let currentContent = '';

        try {
            // 调用流式API获取回复
            console.log('发送消息到API（流式）:', userInput);
            const response = await this.callCozeAPIStream(userInput, (chunk) => {
                currentContent += chunk;
                this.updateStreamingMessage(streamingMessage, currentContent);
            });
            console.log('收到API回复:', response);
            
            // 完成流式消息
            this.finalizeStreamingMessage(streamingMessage, response);
            
        } catch (error) {
            console.error('API调用失败:', error);
            
            // 移除流式消息，添加错误消息
            streamingMessage.remove();
            this.addMessage(`抱歉，我现在无法回答您的问题。错误信息: ${error.message}`, 'advisor');
        } finally {
            // 重新启用输入框和发送按钮
            this.chatInput.disabled = false;
            this.updateSendButtonState();
        }

        // 保存聊天历史
        this.saveChatHistory();
    }

    async callCozeAPIStream(userInput, onChunk) {
        try {
            console.log('开始调用Coze Workflow API（流式），用户输入:', userInput);
            
            // 构建请求参数
            const requestBody = {
                workflow_id: this.apiConfig.workflowId,
                parameters: {
                    input: userInput
                }
            };
            
            console.log('请求参数:', requestBody);
            
            const response = await fetch('https://api.coze.cn/v1/workflow/run', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiConfig.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('响应状态:', response.status);
            console.log('响应头:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API请求失败:', response.status, errorText);
                throw new Error(`API请求失败: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('完整API响应:', data);
            
            // 处理API响应 - 根据实际响应格式解析
            if (data && data.code === 0) {
                if (data.data) {
                    try {
                        // data字段可能是字符串，需要解析
                        let parsedData;
                        if (typeof data.data === 'string') {
                            parsedData = JSON.parse(data.data);
                        } else {
                            parsedData = data.data;
                        }
                        
                        console.log('解析后的data:', parsedData);
                        
                        // 优先使用output2，如果没有则使用output
                        let content = '';
                        if (parsedData.output2 && parsedData.output2.trim()) {
                            content = parsedData.output2;
                        } else if (parsedData.output && parsedData.output.trim()) {
                            content = parsedData.output;
                        }
                        
                        if (content) {
                            // 模拟流式输出
                            await this.simulateStreamingOutput(content, onChunk);
                            return content;
                        }
                    } catch (parseError) {
                        console.error('解析data字段失败:', parseError);
                        // 如果解析失败，直接返回data字段
                        if (typeof data.data === 'string' && data.data.trim()) {
                            await this.simulateStreamingOutput(data.data, onChunk);
                            return data.data;
                        }
                    }
                }
                
                // 尝试其他可能的字段
                let content = '';
                if (data.output) {
                    content = data.output;
                } else if (data.result) {
                    content = data.result;
                }
                
                if (content) {
                    await this.simulateStreamingOutput(content, onChunk);
                    return content;
                }
            }
            
            // 如果都没有找到有效内容
            console.warn('未找到有效的响应内容，返回默认消息');
            const defaultMessage = '抱歉，我现在无法处理您的问题，请稍后再试。';
            await this.simulateStreamingOutput(defaultMessage, onChunk);
            return defaultMessage;
            
        } catch (error) {
            console.error('API调用完整错误:', error);
            throw error;
        }
    }

    async simulateStreamingOutput(text, onChunk) {
        // 模拟流式输出效果
        const words = text.split('');
        for (let i = 0; i < words.length; i++) {
            // 根据字符类型调整延迟时间
            let delay = 30;
            if (words[i] === '。' || words[i] === '！' || words[i] === '？') {
                delay = 200; // 句号、感叹号、问号后稍长停顿
            } else if (words[i] === '，' || words[i] === '；') {
                delay = 100; // 逗号、分号后短停顿
            } else if (words[i] === '\n') {
                delay = 150; // 换行后停顿
            }
            
            await new Promise(resolve => setTimeout(resolve, delay));
            onChunk(words[i]);
        }
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = sender === 'user' ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-graduation-cap"></i>';
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        
        // 根据发送者决定是否渲染Markdown
        if (sender === 'advisor') {
            // AI回复使用Markdown渲染
            bubbleDiv.innerHTML = this.renderMarkdown(content);
        } else {
            // 用户消息使用纯文本（转义HTML）
            bubbleDiv.textContent = content;
        }
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(bubbleDiv);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // 保存原始消息内容到历史数组
        this.messageHistory.push({
            sender: sender,
            content: content,
            timestamp: Date.now()
        });
        
        return messageDiv;
    }

    addStreamingMessage(sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message streaming-message`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = sender === 'user' ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-graduation-cap"></i>';
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        bubbleDiv.innerHTML = '<span class="streaming-content"></span><span class="streaming-cursor">|</span>';
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(bubbleDiv);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageDiv;
    }

    updateStreamingMessage(messageDiv, content) {
        const contentSpan = messageDiv.querySelector('.streaming-content');
        if (contentSpan) {
            // 渲染Markdown内容
            contentSpan.innerHTML = this.renderMarkdown(content);
        }
        this.scrollToBottom();
    }

    finalizeStreamingMessage(messageDiv, finalContent) {
        // 移除流式消息类名
        messageDiv.classList.remove('streaming-message');
        
        // 移除光标
        const cursor = messageDiv.querySelector('.streaming-cursor');
        if (cursor) {
            cursor.remove();
        }
        
        // 更新最终内容
        const bubbleDiv = messageDiv.querySelector('.message-bubble');
        if (bubbleDiv) {
            bubbleDiv.innerHTML = this.renderMarkdown(finalContent);
        }
        
        // 保存到历史记录
        this.messageHistory.push({
            sender: 'advisor',
            content: finalContent,
            timestamp: Date.now()
        });
        
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    clearChat() {
        // 保留欢迎消息
        const welcomeMessage = this.chatMessages.querySelector('.message');
        this.chatMessages.innerHTML = '';
        if (welcomeMessage) {
            this.chatMessages.appendChild(welcomeMessage);
        }
        
        // 清除历史数组和本地存储
        this.messageHistory = [];
        localStorage.removeItem('chatHistory');
        
        // 重置输入框
        this.chatInput.value = '';
        this.updateSendButtonState();
    }

    saveChatHistory() {
        // 使用messageHistory数组保存原始内容
        const filteredHistory = this.messageHistory.filter(message => 
            message.content !== '你好!我是你的智能导员,很高兴为你服务。有什么学习、生活或职业规划方面的问题,都可以随时问我哦!'
        );
        localStorage.setItem('chatHistory', JSON.stringify(filteredHistory));
    }

    loadChatHistory() {
        try {
            const history = localStorage.getItem('chatHistory');
            if (history) {
                const messages = JSON.parse(history);
                
                // 清除当前消息（除了欢迎消息）
                const welcomeMessage = this.chatMessages.querySelector('.message');
                this.chatMessages.innerHTML = '';
                if (welcomeMessage) {
                    this.chatMessages.appendChild(welcomeMessage);
                }
                
                // 重新加载历史消息，但不重复保存到history数组
                const tempHistory = [...this.messageHistory];
                this.messageHistory = [];
                
                messages.forEach(message => {
                    this.addMessage(message.content, message.sender);
                });
                
                // 恢复messageHistory数组
                this.messageHistory = messages;
            }
        } catch (error) {
            console.error('加载聊天历史失败:', error);
        }
    }
}

// 页面加载完成后初始化激活码管理器
document.addEventListener('DOMContentLoaded', () => {
    window.activationManager = new ActivationManager();
});

// 添加一些实用功能
document.addEventListener('DOMContentLoaded', () => {
    // 添加页面可见性变化处理
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // 页面重新可见时，可以做一些处理
            console.log('页面重新激活');
        }
    });
    
    // 添加在线状态检测
    window.addEventListener('online', () => {
        console.log('网络连接已恢复');
    });
    
    window.addEventListener('offline', () => {
        console.log('网络连接已断开');
    });
});
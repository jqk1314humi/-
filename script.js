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
        
        // 激活码管理
        this.activationManager = new ActivationManager();
        
        this.initializeEventListeners();
        this.loadChatHistory();
        this.initializeMarkdown();
        
        // 延迟检查激活状态，确保DOM完全加载
        setTimeout(() => {
            this.checkActivation();
        }, 100);
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
                // 检查激活状态
                if (!this.activationManager.isActivated) {
                    this.showActivationModal();
                    return;
                }
                const questionText = item.querySelector('span').textContent;
                this.chatInput.value = questionText;
                this.handleSendMessage();
            });
        });
        
        // 输入框输入事件
        this.chatInput.addEventListener('input', () => {
            this.updateSendButtonState();
        });

        // 激活码模态框事件
        this.initializeActivationModal();
    }

    updateSendButtonState() {
        const hasText = this.chatInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText;
    }

    async handleSendMessage() {
        // 检查激活状态
        if (!this.activationManager.isActivated) {
            this.showActivationModal();
            return;
        }

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

    addLoadingMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message advisor-message loading-message';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = '<i class="fas fa-graduation-cap"></i>';
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        bubbleDiv.innerHTML = `
            <div class="loading">
                <span>正在思考</span>
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
            </div>
        `;
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(bubbleDiv);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageDiv;
    }

    removeLoadingMessage(loadingMessage) {
        if (loadingMessage && loadingMessage.parentNode) {
            loadingMessage.parentNode.removeChild(loadingMessage);
        }
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

    // 检查激活状态
    checkActivation() {
        console.log('检查激活状态，当前状态:', this.activationManager.isActivated);
        if (!this.activationManager.isActivated) {
            console.log('未激活，显示激活码模态框');
            this.showActivationModal();
            this.lockApp();
        } else {
            console.log('已激活，无需显示激活码模态框');
        }
    }

    // 显示激活码模态框
    showActivationModal() {
        const modal = document.getElementById('activationModal');
        const activationCodeInput = document.getElementById('activationCode');
        const errorMessage = document.getElementById('errorMessage');
        const activateButton = document.getElementById('activateButton');
        
        console.log('尝试显示激活码模态框，模态框元素:', modal);
        if (modal) {
            // 清除之前的内容
            if (activationCodeInput) {
                activationCodeInput.value = '';
            }
            if (errorMessage) {
                errorMessage.textContent = '';
            }
            if (activateButton) {
                activateButton.disabled = false;
                activateButton.textContent = '激活';
            }
            
            modal.classList.add('show', 'force-show');
            modal.style.display = 'flex';
            modal.style.zIndex = '9999';
            document.body.classList.add('app-locked');
            console.log('激活码模态框已显示');
        } else {
            console.error('未找到激活码模态框元素');
        }
    }

    // 隐藏激活码模态框
    hideActivationModal() {
        const modal = document.getElementById('activationModal');
        if (modal) {
            modal.classList.remove('show', 'force-show');
            modal.style.display = 'none';
            document.body.classList.remove('app-locked');
            console.log('激活码模态框已隐藏');
        }
    }

    // 锁定应用
    lockApp() {
        document.body.classList.add('app-locked');
        this.chatInput.disabled = true;
        this.sendButton.disabled = true;
        this.clearButton.style.pointerEvents = 'none';
        this.questionItems.forEach(item => {
            item.style.pointerEvents = 'none';
        });
        
        // 确保模态框本身不被锁定
        const modal = document.getElementById('activationModal');
        if (modal) {
            modal.style.pointerEvents = 'auto';
            modal.style.filter = 'none';
        }
    }

    // 解锁应用
    unlockApp() {
        document.body.classList.remove('app-locked');
        this.chatInput.disabled = false;
        this.updateSendButtonState();
        this.clearButton.style.pointerEvents = 'auto';
        this.questionItems.forEach(item => {
            item.style.pointerEvents = 'auto';
        });
        console.log('应用已解锁');
    }

    // 初始化激活码模态框事件
    initializeActivationModal() {
        const modal = document.getElementById('activationModal');
        const activationCodeInput = document.getElementById('activationCode');
        const activateButton = document.getElementById('activateButton');
        const cancelButton = document.getElementById('cancelButton');
        const errorMessage = document.getElementById('errorMessage');

        if (!modal || !activationCodeInput || !activateButton || !cancelButton || !errorMessage) {
            console.error('激活码模态框元素未找到');
            return;
        }

        // 激活按钮点击事件
        activateButton.addEventListener('click', () => {
            this.handleActivation();
        });

        // 取消按钮点击事件
        cancelButton.addEventListener('click', () => {
            this.hideActivationModal();
        });

        // 输入框回车事件
        activationCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleActivation();
            }
        });

        // 输入框输入事件
        activationCodeInput.addEventListener('input', () => {
            this.clearErrorMessage();
        });

        // 点击模态框背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideActivationModal();
            }
        });
    }

    // 处理激活
    handleActivation() {
        const activationCodeInput = document.getElementById('activationCode');
        const activateButton = document.getElementById('activateButton');
        const errorMessage = document.getElementById('errorMessage');

        if (!activationCodeInput || !activateButton || !errorMessage) {
            return;
        }

        const code = activationCodeInput.value.trim();
        if (!code) {
            this.showErrorMessage('请输入激活码');
            return;
        }

        // 禁用按钮防止重复提交
        activateButton.disabled = true;
        activateButton.textContent = '激活中...';

        // 模拟网络延迟
        setTimeout(() => {
            const result = this.activationManager.activate(code);
            
            if (result.valid) {
                this.showSuccessMessage('激活成功！');
                // 重置按钮状态
                activateButton.disabled = false;
                activateButton.textContent = '激活';
                // 更新激活状态
                this.activationManager.isActivated = true;
                // 立即关闭模态框并解锁应用
                setTimeout(() => {
                    this.hideActivationModal();
                    this.unlockApp();
                }, 1500);
            } else {
                this.showErrorMessage(result.message);
                activateButton.disabled = false;
                activateButton.textContent = '激活';
            }
        }, 500);
    }

    // 显示错误消息
    showErrorMessage(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.color = '#ef4444';
        }
    }

    // 显示成功消息
    showSuccessMessage(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.color = '#10b981';
        }
    }

    // 清除错误消息
    clearErrorMessage() {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = '';
        }
    }
}

// 激活码管理类
class ActivationManager {
    constructor() {
        this.developerCode = 'jqkkf0922';
        this.activationCodes = [
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
        this.usedCodes = this.loadUsedCodes();
        this.isActivated = this.checkActivationStatus();
    }

    // 检查激活状态
    checkActivationStatus() {
        const activationData = localStorage.getItem('smartAdvisorActivation');
        if (activationData) {
            try {
                const data = JSON.parse(activationData);
                return data.activated === true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    // 加载已使用的激活码
    loadUsedCodes() {
        const usedCodes = localStorage.getItem('smartAdvisorUsedCodes');
        if (usedCodes) {
            try {
                return JSON.parse(usedCodes);
            } catch (e) {
                return [];
            }
        }
        return [];
    }

    // 保存已使用的激活码
    saveUsedCodes() {
        localStorage.setItem('smartAdvisorUsedCodes', JSON.stringify(this.usedCodes));
    }

    // 验证激活码
    validateActivationCode(code) {
        if (!code || typeof code !== 'string') {
            return { valid: false, message: '请输入有效的激活码' };
        }

        const trimmedCode = code.trim();
        
        // 检查开发者激活码
        if (trimmedCode === this.developerCode) {
            return { valid: true, message: '开发者激活码验证成功', isDeveloper: true };
        }

        // 检查普通激活码
        if (this.activationCodes.includes(trimmedCode)) {
            // 检查是否已被使用
            if (this.usedCodes.includes(trimmedCode)) {
                return { valid: false, message: '该激活码已被使用' };
            }
            
            return { valid: true, message: '激活码验证成功', isDeveloper: false };
        }

        return { valid: false, message: '无效的激活码' };
    }

    // 激活应用
    activate(code) {
        const validation = this.validateActivationCode(code);
        if (!validation.valid) {
            return validation;
        }

        // 如果不是开发者激活码，标记为已使用
        if (!validation.isDeveloper) {
            this.usedCodes.push(code.trim());
            this.saveUsedCodes();
        }

        // 保存激活状态，包含设备标识
        const deviceId = this.getDeviceId();
        const activationData = {
            activated: true,
            code: code.trim(),
            activatedAt: new Date().toISOString(),
            isDeveloper: validation.isDeveloper,
            deviceId: deviceId,
            activationCount: this.getActivationCount(code.trim()) + 1
        };
        localStorage.setItem('smartAdvisorActivation', JSON.stringify(activationData));
        
        this.isActivated = true;
        return { valid: true, message: '激活成功！' };
    }

    // 获取设备唯一标识
    getDeviceId() {
        let deviceId = localStorage.getItem('smartAdvisorDeviceId');
        if (!deviceId) {
            // 生成基于浏览器指纹的设备ID
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Device fingerprint', 2, 2);
            
            const fingerprint = [
                navigator.userAgent,
                navigator.language,
                screen.width + 'x' + screen.height,
                new Date().getTimezoneOffset(),
                canvas.toDataURL()
            ].join('|');
            
            deviceId = this.hashCode(fingerprint);
            localStorage.setItem('smartAdvisorDeviceId', deviceId);
        }
        return deviceId;
    }

    // 简单的哈希函数
    hashCode(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // 获取激活码使用次数
    getActivationCount(code) {
        const activationHistory = JSON.parse(localStorage.getItem('smartAdvisorActivationHistory') || '{}');
        return activationHistory[code] || 0;
    }

    // 保存激活码使用次数
    saveActivationCount(code) {
        const activationHistory = JSON.parse(localStorage.getItem('smartAdvisorActivationHistory') || '{}');
        activationHistory[code] = (activationHistory[code] || 0) + 1;
        localStorage.setItem('smartAdvisorActivationHistory', JSON.stringify(activationHistory));
    }

    // 重置激活状态（仅开发者）
    resetActivation() {
        if (this.isActivated) {
            const activationData = JSON.parse(localStorage.getItem('smartAdvisorActivation') || '{}');
            if (activationData.isDeveloper) {
                localStorage.removeItem('smartAdvisorActivation');
                this.isActivated = false;
                return true;
            }
        }
        return false;
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new SmartAdvisor();
    
    // 添加全局方法用于调试
    window.showActivationModal = () => {
        app.showActivationModal();
    };
    
    window.clearActivation = () => {
        localStorage.removeItem('smartAdvisorActivation');
        localStorage.removeItem('smartAdvisorUsedCodes');
        location.reload();
    };
    
    window.testModal = () => {
        app.showActivationModal();
    };
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


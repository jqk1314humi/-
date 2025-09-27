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
        
        // 管理员按钮事件
        const adminButtonMain = document.getElementById('adminButtonMain');
        if (adminButtonMain) {
            adminButtonMain.addEventListener('click', () => {
                this.showAdminPasswordPrompt();
            });
        }
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

    showAdminPasswordPrompt() {
        const password = prompt('请输入管理员密码：');
        if (password === 'jqkkf0922') {
            // 跳转到管理员页面
            window.location.href = './admin.html';
        } else if (password !== null) {
            alert('密码错误！');
        }
    }
}

// 生成设备ID的函数（与activation.js中的逻辑保持一致）
function generateDeviceId() {
    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        navigator.platform,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 0,
        navigator.maxTouchPoints || 0
    ].join('|');
    
    return hashString(fingerprint).substring(0, 16);
}

// 简单哈希函数
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
}

// 检查激活状态的函数
function checkActivationStatus() {
    const currentActivation = JSON.parse(localStorage.getItem('currentActivation') || '{"activated": false}');
    const codes = JSON.parse(localStorage.getItem('activationCodes') || '{}');
    
    if (!currentActivation.activated) {
        // 如果没有激活，重定向到激活页面
        window.location.href = './index.html';
        return false;
    }
    
    // 如果使用的不是开发者激活码，检查激活码状态
    if (currentActivation.code !== 'jqkkf0922') {
        const codeInfo = codes[currentActivation.code];
        if (!codeInfo || !codeInfo.used || codeInfo.status === 'reset') {
            // 激活码已被重置或删除，清除本地激活状态
            localStorage.setItem('currentActivation', JSON.stringify({
                activated: false,
                code: null,
                activatedAt: null
            }));
            
            alert('您的激活码已被管理员重置，请重新激活。');
            window.location.href = './index.html';
            return false;
        }
        
        // 验证设备ID是否匹配（防止激活码被其他设备使用）
        if (codeInfo.usedBy && codeInfo.usedBy.deviceId) {
            // 生成当前设备ID进行比较
            const currentDeviceId = generateDeviceId();
            if (codeInfo.usedBy.deviceId !== currentDeviceId) {
                // 设备ID不匹配，激活码被其他设备使用
                localStorage.setItem('currentActivation', JSON.stringify({
                    activated: false,
                    code: null,
                    activatedAt: null
                }));
                
                alert('检测到激活码已被其他设备使用，当前设备激活状态已失效，请重新激活。');
                window.location.href = './index.html';
                return false;
            }
        }
    }
    
    return true;
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 首先检查激活状态
    if (checkActivationStatus()) {
        new SmartAdvisor();
    }
});

// 定期检查激活状态（每5分钟检查一次）
setInterval(() => {
    checkActivationStatus();
}, 5 * 60 * 1000);

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

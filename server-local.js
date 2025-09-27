const express = require('express');
const cors = require('cors');
const path = require('path');

// 导入我们的API处理函数
const apiHandler = require('./api/index.js');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API路由 - 将所有/api/*请求转发给我们的处理函数
app.all('/api/*', async (req, res) => {
    console.log(`收到请求: ${req.method} ${req.url}`);
    
    try {
        // 调用我们的API处理函数
        await apiHandler(req, res);
    } catch (error) {
        console.error('API处理错误:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
});

// 静态文件路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/advisor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'advisor.html'));
});

app.get('/api-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'api-test.html'));
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        error: '页面未找到',
        path: req.path
    });
});

// 错误处理
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({
        error: '服务器内部错误',
        message: error.message
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🚀 本地API服务器启动成功！');
    console.log(`📡 服务器地址: http://localhost:${PORT}`);
    console.log(`🔧 API测试页面: http://localhost:${PORT}/api-test`);
    console.log(`👨‍💼 管理员界面: http://localhost:${PORT}/admin`);
    console.log(`🤖 智能导员: http://localhost:${PORT}/advisor`);
    console.log('='.repeat(50));
    console.log('📋 可用的API端点:');
    console.log(`  GET  http://localhost:${PORT}/api/test`);
    console.log(`  GET  http://localhost:${PORT}/api/health`);
    console.log(`  GET  http://localhost:${PORT}/api/codes`);
    console.log(`  GET  http://localhost:${PORT}/api/logs`);
    console.log(`  GET  http://localhost:${PORT}/api/stats`);
    console.log('='.repeat(50));
});

module.exports = app;

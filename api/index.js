/**
 * 激活码管理系统 API
 * 提供数据库操作的HTTP接口
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./database');

const app = express();

// 中间件配置
app.use(cors({
    origin: ['http://localhost:3000', 'https://your-domain.vercel.app'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求频率限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP 15分钟内最多100个请求
    message: { error: '请求过于频繁，请稍后再试' }
});

app.use('/api/', limiter);

// 错误处理中间件
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// 初始化数据库
db.initializeTables().catch(console.error);

/**
 * 健康检查
 */
app.get('/api/health', asyncHandler(async (req, res) => {
    const isConnected = await db.testConnection();
    const stats = isConnected ? await db.getStats() : null;
    
    res.json({
        status: isConnected ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database: isConnected ? 'connected' : 'disconnected',
        stats: stats
    });
}));

/**
 * 获取所有激活码数据
 */
app.get('/api/codes', asyncHandler(async (req, res) => {
    const codes = await db.getAllActivationCodes();
    const logs = await db.getActivationLogs(50);
    
    res.json({
        success: true,
        data: {
            codes: codes,
            logs: logs,
            lastSync: Date.now(),
            version: '4.2',
            source: 'mysql'
        }
    });
}));

/**
 * 使用激活码
 */
app.post('/api/codes/:code/use', asyncHandler(async (req, res) => {
    const { code } = req.params;
    const deviceInfo = req.body;
    
    if (!deviceInfo.deviceFingerprint) {
        return res.status(400).json({
            success: false,
            error: '缺少设备指纹信息'
        });
    }
    
    await db.useActivationCode(code, deviceInfo);
    
    res.json({
        success: true,
        message: '激活码使用成功'
    });
}));

/**
 * 重置激活码
 */
app.post('/api/codes/:code/reset', asyncHandler(async (req, res) => {
    const { code } = req.params;
    
    await db.resetActivationCode(code);
    
    res.json({
        success: true,
        message: '激活码重置成功'
    });
}));

/**
 * 创建新激活码
 */
app.post('/api/codes', asyncHandler(async (req, res) => {
    const { code } = req.body;
    
    if (!code || typeof code !== 'string' || code.length < 6) {
        return res.status(400).json({
            success: false,
            error: '激活码格式无效'
        });
    }
    
    await db.createActivationCode(code);
    
    res.json({
        success: true,
        message: '激活码创建成功'
    });
}));

/**
 * 删除激活码
 */
app.delete('/api/codes/:code', asyncHandler(async (req, res) => {
    const { code } = req.params;
    
    await db.deleteActivationCode(code);
    
    res.json({
        success: true,
        message: '激活码删除成功'
    });
}));

/**
 * 同步数据到数据库
 */
app.post('/api/sync', asyncHandler(async (req, res) => {
    const { codes, logs } = req.body;
    
    // 这里可以实现批量同步逻辑
    // 暂时返回成功状态
    
    res.json({
        success: true,
        message: '数据同步成功',
        timestamp: Date.now()
    });
}));

/**
 * 获取使用日志
 */
app.get('/api/logs', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await db.getActivationLogs(limit);
    
    res.json({
        success: true,
        data: logs
    });
}));

/**
 * 获取统计信息
 */
app.get('/api/stats', asyncHandler(async (req, res) => {
    const stats = await db.getStats();
    
    res.json({
        success: true,
        data: stats
    });
}));

// 错误处理
app.use((error, req, res, next) => {
    console.error('API错误:', error);
    
    res.status(error.status || 500).json({
        success: false,
        error: error.message || '服务器内部错误',
        timestamp: new Date().toISOString()
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在'
    });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`API服务器运行在端口 ${PORT}`);
        console.log(`健康检查: http://localhost:${PORT}/api/health`);
    });
}

module.exports = app;

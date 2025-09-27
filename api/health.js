// Vercel Serverless Function - 健康检查
const mysql = require('mysql2/promise');

// MySQL云数据库配置
const dbConfig = {
    host: 'mysql2.sqlpub.com',
    port: 3307,
    user: 'author',
    password: 'D62rI9kDVOFGCuNU',
    database: 'jihuoma',
    charset: 'utf8mb4',
    timezone: '+08:00',
    acquireTimeout: 30000,
    timeout: 30000,
    connectTimeout: 30000
};

module.exports = async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // 只允许GET请求
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    try {
        console.log('开始健康检查...');
        
        // 测试数据库连接
        const connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功');
        
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('数据库查询成功:', rows);
        
        // 获取简单统计
        const [codeCount] = await connection.execute(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_schema = ? AND table_name = ?
        `, ['jihuoma', 'activation_codes']);
        
        await connection.end();
        
        res.status(200).json({
            success: true,
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString(),
            message: 'MySQL云数据库连接成功！',
            tableExists: codeCount[0].count > 0,
            dbInfo: {
                host: 'mysql2.sqlpub.com:3307',
                database: 'jihuoma',
                user: 'author'
            }
        });
        
    } catch (error) {
        console.error('健康检查失败:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            database: 'disconnected',
            message: 'MySQL数据库连接失败',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

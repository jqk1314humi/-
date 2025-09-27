// Vercel Serverless Function - 激活码管理
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

// 初始化数据库表
async function initializeTables(connection) {
    try {
        // 创建激活码表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS activation_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP NULL,
                device_fingerprint VARCHAR(255) NULL,
                user_agent TEXT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // 创建日志表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS activation_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL,
                action VARCHAR(50) NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                device_info JSON NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // 检查并插入初始数据
        const [existingCodes] = await connection.execute('SELECT COUNT(*) as count FROM activation_codes');
        if (existingCodes[0].count === 0) {
            const initialCodes = ['ABC123DEF456', 'XYZ789GHI012', 'TEST12345678'];
            
            for (const code of initialCodes) {
                await connection.execute(
                    'INSERT IGNORE INTO activation_codes (code) VALUES (?)',
                    [code]
                );
            }
        }
        
        return true;
    } catch (error) {
        console.error('表初始化失败:', error);
        return false;
    }
}

module.exports = async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    let connection;
    
    try {
        console.log('连接MySQL数据库...');
        connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功');
        
        // 初始化表结构
        await initializeTables(connection);
        
        if (req.method === 'GET') {
            // 获取所有激活码
            const [codes] = await connection.execute(`
                SELECT code, used, created_at, used_at, device_fingerprint, user_agent
                FROM activation_codes
                ORDER BY created_at DESC
            `);
            
            const [logs] = await connection.execute(`
                SELECT code, action, timestamp, device_info
                FROM activation_logs
                ORDER BY timestamp DESC
                LIMIT 50
            `);
            
            // 格式化数据
            const codesData = {};
            codes.forEach(row => {
                codesData[row.code] = {
                    used: Boolean(row.used),
                    createdAt: row.created_at,
                    usedAt: row.used_at,
                    deviceFingerprint: row.device_fingerprint,
                    userAgent: row.user_agent,
                    usedBy: row.used ? {
                        deviceFingerprint: row.device_fingerprint,
                        userAgent: row.user_agent
                    } : null
                };
            });
            
            const logsData = logs.map(row => ({
                code: row.code,
                action: row.action,
                timestamp: row.timestamp,
                deviceInfo: row.device_info ? JSON.parse(row.device_info) : null,
                type: 'user'
            }));
            
            res.status(200).json({
                success: true,
                data: {
                    codes: codesData,
                    logs: logsData,
                    source: 'MySQL Database',
                    timestamp: new Date().toISOString()
                }
            });
            
        } else if (req.method === 'POST') {
            // 创建新激活码
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const { code } = JSON.parse(body);
                    if (!code) {
                        res.status(400).json({ success: false, error: '激活码不能为空' });
                        return;
                    }
                    
                    await connection.execute('INSERT INTO activation_codes (code) VALUES (?)', [code]);
                    res.status(201).json({ success: true, message: '激活码创建成功', code });
                } catch (error) {
                    res.status(500).json({ success: false, error: error.message });
                }
            });
            return;
            
        } else {
            res.status(405).json({ error: 'Method not allowed' });
        }
        
    } catch (error) {
        console.error('API错误:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

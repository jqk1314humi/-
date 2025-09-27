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
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    connectTimeout: 60000
};

// 创建连接池
let pool;

function createPool() {
    if (!pool) {
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
            acquireTimeout: 60000,
            timeout: 60000
        });
        console.log('MySQL连接池已创建');
    }
    return pool;
}

// 初始化数据库表
async function initializeTables() {
    const pool = createPool();
    let connection;
    
    try {
        console.log('开始初始化数据库表...');
        connection = await pool.getConnection();
        
        // 创建激活码表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS activation_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP NULL,
                device_fingerprint VARCHAR(255) NULL,
                user_agent TEXT NULL,
                ip_hash VARCHAR(64) NULL,
                session_id VARCHAR(64) NULL,
                INDEX idx_code (code),
                INDEX idx_used (used)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // 创建日志表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS activation_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL,
                action VARCHAR(50) NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                device_info JSON NULL,
                log_type VARCHAR(20) DEFAULT 'user',
                INDEX idx_code (code),
                INDEX idx_timestamp (timestamp)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // 检查并插入初始数据
        const [existingCodes] = await connection.execute('SELECT COUNT(*) as count FROM activation_codes');
        if (existingCodes[0].count === 0) {
            console.log('插入初始激活码...');
            const initialCodes = ['ABC123DEF456', 'XYZ789GHI012', 'TEST12345678'];
            
            for (const code of initialCodes) {
                await connection.execute(
                    'INSERT IGNORE INTO activation_codes (code) VALUES (?)',
                    [code]
                );
            }
        }
        
        console.log('数据库表初始化完成');
        return true;
    } catch (error) {
        console.error('数据库表初始化失败:', error);
        return false;
    } finally {
        if (connection) connection.release();
    }
}

// 测试数据库连接
async function testConnection() {
    const pool = createPool();
    let connection;
    
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('数据库连接测试成功');
        return true;
    } catch (error) {
        console.error('数据库连接测试失败:', error);
        return false;
    } finally {
        if (connection) connection.release();
    }
}

// 获取所有激活码
async function getAllCodes() {
    const pool = createPool();
    let connection;
    
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute(`
            SELECT code, used, created_at, used_at, device_fingerprint, user_agent
            FROM activation_codes
            ORDER BY created_at DESC
        `);
        
        const codes = {};
        rows.forEach(row => {
            codes[row.code] = {
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
        
        return codes;
    } catch (error) {
        console.error('获取激活码失败:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

// 获取日志
async function getLogs(limit = 50) {
    const pool = createPool();
    let connection;
    
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute(`
            SELECT code, action, timestamp, device_info, log_type
            FROM activation_logs
            ORDER BY timestamp DESC
            LIMIT ?
        `, [limit]);
        
        return rows.map(row => ({
            code: row.code,
            action: row.action,
            timestamp: row.timestamp,
            deviceInfo: row.device_info ? JSON.parse(row.device_info) : null,
            type: row.log_type || 'user'
        }));
    } catch (error) {
        console.error('获取日志失败:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

// 获取统计信息
async function getStats() {
    const pool = createPool();
    let connection;
    
    try {
        connection = await pool.getConnection();
        
        const [codeStats] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(used) as used_count,
                COUNT(*) - SUM(used) as available_count
            FROM activation_codes
        `);
        
        const [logStats] = await connection.execute('SELECT COUNT(*) as count FROM activation_logs');
        
        return {
            codes: {
                total: parseInt(codeStats[0].total),
                used: parseInt(codeStats[0].used_count),
                available: parseInt(codeStats[0].available_count)
            },
            logs: {
                total: parseInt(logStats[0].count)
            }
        };
    } catch (error) {
        console.error('获取统计信息失败:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

// 创建激活码
async function createCode(code) {
    const pool = createPool();
    let connection;
    
    try {
        connection = await pool.getConnection();
        await connection.execute('INSERT INTO activation_codes (code) VALUES (?)', [code]);
        
        // 添加创建日志
        await connection.execute(
            'INSERT INTO activation_logs (code, action, device_info, log_type) VALUES (?, ?, ?, ?)',
            [code, 'create', JSON.stringify({ source: 'admin' }), 'admin']
        );
        
        return true;
    } catch (error) {
        console.error('创建激活码失败:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

// 主API处理函数
module.exports = async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    
    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    console.log(`API请求: ${req.method} ${pathname}`);
    
    try {
        // 确保数据库表已初始化
        await initializeTables();
        
        if (pathname === '/api/health') {
            // 健康检查
            const isConnected = await testConnection();
            const stats = isConnected ? await getStats() : null;
            
            res.status(200).json({
                success: true,
                status: isConnected ? 'healthy' : 'unhealthy',
                database: isConnected ? 'connected' : 'disconnected',
                stats: stats,
                timestamp: new Date().toISOString()
            });
            
        } else if (pathname === '/api/codes') {
            if (req.method === 'GET') {
                // 获取所有激活码
                const codes = await getAllCodes();
                const logs = await getLogs(50);
                
                res.status(200).json({
                    success: true,
                    data: {
                        codes: codes,
                        logs: logs,
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
                        
                        await createCode(code);
                        res.status(201).json({ success: true, message: '激活码创建成功', code });
                    } catch (error) {
                        res.status(500).json({ success: false, error: error.message });
                    }
                });
                return;
            } else {
                res.status(405).json({ error: 'Method not allowed' });
            }
            
        } else if (pathname === '/api/logs') {
            if (req.method === 'GET') {
                const limit = parseInt(url.searchParams.get('limit')) || 50;
                const logs = await getLogs(limit);
                
                res.status(200).json({
                    success: true,
                    data: logs,
                    count: logs.length,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(405).json({ error: 'Method not allowed' });
            }
            
        } else if (pathname === '/api/stats') {
            if (req.method === 'GET') {
                const stats = await getStats();
                
                res.status(200).json({
                    success: true,
                    data: stats,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(405).json({ error: 'Method not allowed' });
            }
            
        } else {
            res.status(404).json({ error: 'API endpoint not found' });
        }
        
    } catch (error) {
        console.error('API错误:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
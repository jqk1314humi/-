/**
 * MySQL数据库连接API
 * 处理激活码数据的存储和同步
 */

const mysql = require('mysql2/promise');

// 数据库配置
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
    reconnect: true
};

// 创建连接池
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/**
 * 初始化数据库表
 */
async function initializeTables() {
    const connection = await pool.getConnection();
    
    try {
        // 创建激活码表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS activation_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                used_at TIMESTAMP NULL,
                device_fingerprint VARCHAR(255) NULL,
                user_agent TEXT NULL,
                ip_hash VARCHAR(64) NULL,
                session_id VARCHAR(64) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                status ENUM('available', 'used', 'disabled') DEFAULT 'available',
                version VARCHAR(10) DEFAULT '4.0',
                INDEX idx_code (code),
                INDEX idx_status (status),
                INDEX idx_device (device_fingerprint)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建使用日志表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS activation_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL,
                action ENUM('activation', 'reset', 'delete', 'create') NOT NULL,
                device_fingerprint VARCHAR(255) NULL,
                user_agent TEXT NULL,
                ip_hash VARCHAR(64) NULL,
                client_info JSON NULL,
                log_type ENUM('user', 'developer', 'admin') DEFAULT 'user',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_code (code),
                INDEX idx_action (action),
                INDEX idx_timestamp (timestamp)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 创建系统配置表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS system_config (
                id INT AUTO_INCREMENT PRIMARY KEY,
                config_key VARCHAR(100) UNIQUE NOT NULL,
                config_value JSON NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_key (config_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('数据库表初始化成功');
        
        // 初始化默认激活码
        await initializeDefaultCodes(connection);
        
    } catch (error) {
        console.error('数据库表初始化失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * 初始化默认激活码
 */
async function initializeDefaultCodes(connection) {
    const defaultCodes = [
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

    for (const code of defaultCodes) {
        try {
            await connection.execute(`
                INSERT IGNORE INTO activation_codes (code, status, version) 
                VALUES (?, 'available', '4.0')
            `, [code]);
        } catch (error) {
            console.warn(`初始化激活码 ${code} 失败:`, error.message);
        }
    }

    console.log('默认激活码初始化完成');
}

/**
 * 获取所有激活码
 */
async function getAllActivationCodes() {
    const connection = await pool.getConnection();
    
    try {
        const [rows] = await connection.execute(`
            SELECT 
                code,
                used,
                used_at,
                device_fingerprint,
                user_agent,
                ip_hash,
                session_id,
                created_at,
                status,
                version
            FROM activation_codes 
            ORDER BY created_at DESC
        `);

        const codes = {};
        rows.forEach(row => {
            codes[row.code] = {
                code: row.code,
                used: Boolean(row.used),
                usedAt: row.used_at ? row.used_at.getTime() : null,
                usedBy: row.used && row.user_agent ? {
                    userAgent: row.user_agent,
                    deviceFingerprint: row.device_fingerprint,
                    ipHash: row.ip_hash,
                    sessionId: row.session_id
                } : null,
                deviceFingerprint: row.device_fingerprint,
                createdAt: row.created_at.getTime(),
                status: row.status,
                version: row.version
            };
        });

        return codes;
        
    } catch (error) {
        console.error('获取激活码失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * 获取使用日志
 */
async function getActivationLogs(limit = 100) {
    const connection = await pool.getConnection();
    
    try {
        const [rows] = await connection.execute(`
            SELECT 
                code,
                action,
                device_fingerprint,
                user_agent,
                client_info,
                log_type,
                timestamp
            FROM activation_logs 
            ORDER BY timestamp DESC 
            LIMIT ?
        `, [limit]);

        return rows.map(row => ({
            code: row.code,
            action: row.action,
            deviceInfo: {
                deviceFingerprint: row.device_fingerprint,
                userAgent: row.user_agent,
                ...(row.client_info ? JSON.parse(row.client_info) : {})
            },
            type: row.log_type,
            timestamp: row.timestamp.getTime()
        }));
        
    } catch (error) {
        console.error('获取日志失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * 使用激活码
 */
async function useActivationCode(code, deviceInfo) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // 检查激活码是否存在且可用
        const [codeRows] = await connection.execute(`
            SELECT code, used, device_fingerprint 
            FROM activation_codes 
            WHERE code = ? FOR UPDATE
        `, [code]);

        if (codeRows.length === 0) {
            throw new Error('激活码不存在');
        }

        const codeData = codeRows[0];
        if (codeData.used) {
            throw new Error(`激活码已被使用`);
        }

        // 更新激活码状态
        await connection.execute(`
            UPDATE activation_codes 
            SET used = TRUE,
                used_at = CURRENT_TIMESTAMP,
                device_fingerprint = ?,
                user_agent = ?,
                ip_hash = ?,
                session_id = ?,
                status = 'used'
            WHERE code = ?
        `, [
            deviceInfo.deviceFingerprint,
            deviceInfo.userAgent || null,
            deviceInfo.ipHash || null,
            deviceInfo.sessionId || null,
            code
        ]);

        // 记录使用日志
        await connection.execute(`
            INSERT INTO activation_logs 
            (code, action, device_fingerprint, user_agent, client_info, log_type) 
            VALUES (?, 'activation', ?, ?, ?, ?)
        `, [
            code,
            deviceInfo.deviceFingerprint,
            deviceInfo.userAgent || null,
            JSON.stringify(deviceInfo),
            code === 'jqkkf0922' ? 'developer' : 'user'
        ]);

        await connection.commit();
        console.log(`激活码 ${code} 使用成功`);
        
        return true;
        
    } catch (error) {
        await connection.rollback();
        console.error('使用激活码失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * 重置激活码
 */
async function resetActivationCode(code) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // 重置激活码状态
        const [result] = await connection.execute(`
            UPDATE activation_codes 
            SET used = FALSE,
                used_at = NULL,
                device_fingerprint = NULL,
                user_agent = NULL,
                ip_hash = NULL,
                session_id = NULL,
                status = 'available'
            WHERE code = ?
        `, [code]);

        if (result.affectedRows === 0) {
            throw new Error('激活码不存在');
        }

        // 记录重置日志
        await connection.execute(`
            INSERT INTO activation_logs 
            (code, action, log_type) 
            VALUES (?, 'reset', 'admin')
        `, [code]);

        await connection.commit();
        console.log(`激活码 ${code} 重置成功`);
        
        return true;
        
    } catch (error) {
        await connection.rollback();
        console.error('重置激活码失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * 创建新激活码
 */
async function createActivationCode(code) {
    const connection = await pool.getConnection();
    
    try {
        await connection.execute(`
            INSERT INTO activation_codes (code, status, version) 
            VALUES (?, 'available', '4.0')
        `, [code]);

        // 记录创建日志
        await connection.execute(`
            INSERT INTO activation_logs 
            (code, action, log_type) 
            VALUES (?, 'create', 'admin')
        `, [code]);

        console.log(`激活码 ${code} 创建成功`);
        return true;
        
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error('激活码已存在');
        }
        console.error('创建激活码失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * 删除激活码
 */
async function deleteActivationCode(code) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // 记录删除日志
        await connection.execute(`
            INSERT INTO activation_logs 
            (code, action, log_type) 
            VALUES (?, 'delete', 'admin')
        `, [code]);

        // 删除激活码
        const [result] = await connection.execute(`
            DELETE FROM activation_codes WHERE code = ?
        `, [code]);

        if (result.affectedRows === 0) {
            throw new Error('激活码不存在');
        }

        await connection.commit();
        console.log(`激活码 ${code} 删除成功`);
        
        return true;
        
    } catch (error) {
        await connection.rollback();
        console.error('删除激活码失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * 测试数据库连接
 */
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.execute('SELECT 1');
        connection.release();
        console.log('数据库连接测试成功');
        return true;
    } catch (error) {
        console.error('数据库连接测试失败:', error);
        return false;
    }
}

/**
 * 获取数据库统计信息
 */
async function getStats() {
    const connection = await pool.getConnection();
    
    try {
        const [codeStats] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN used = TRUE THEN 1 ELSE 0 END) as used,
                SUM(CASE WHEN used = FALSE THEN 1 ELSE 0 END) as available
            FROM activation_codes
        `);

        const [logStats] = await connection.execute(`
            SELECT COUNT(*) as total FROM activation_logs
        `);

        return {
            codes: codeStats[0],
            logs: { total: logStats[0].total },
            lastUpdate: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('获取统计信息失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    initializeTables,
    getAllActivationCodes,
    getActivationLogs,
    useActivationCode,
    resetActivationCode,
    createActivationCode,
    deleteActivationCode,
    testConnection,
    getStats,
    pool
};

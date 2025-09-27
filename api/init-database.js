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

/**
 * 初始化数据库表结构
 */
async function initializeDatabase() {
    let connection;
    
    try {
        console.log('连接到MySQL数据库...');
        connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功');
        
        // 创建激活码表
        console.log('创建activation_codes表...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS activation_codes (
                code VARCHAR(50) PRIMARY KEY,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP NULL,
                device_fingerprint VARCHAR(255) NULL,
                ip_hash VARCHAR(255) NULL,
                session_id VARCHAR(255) NULL,
                user_agent TEXT NULL,
                INDEX idx_used (used),
                INDEX idx_created_at (created_at),
                INDEX idx_device_fingerprint (device_fingerprint)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('activation_codes表创建成功');
        
        // 创建日志表
        console.log('创建activation_logs表...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS activation_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL,
                action VARCHAR(50) NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                type VARCHAR(20) DEFAULT 'user',
                device_info JSON NULL,
                INDEX idx_code (code),
                INDEX idx_timestamp (timestamp),
                INDEX idx_action (action),
                FOREIGN KEY (code) REFERENCES activation_codes(code) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('activation_logs表创建成功');
        
        // 检查是否有初始数据
        const [existingCodes] = await connection.execute('SELECT COUNT(*) as count FROM activation_codes');
        console.log(`当前激活码数量: ${existingCodes[0].count}`);
        
        // 如果没有数据，插入一些初始激活码
        if (existingCodes[0].count === 0) {
            console.log('插入初始激活码...');
            const initialCodes = [
                'ABC123DEF456',
                'XYZ789GHI012',
                'TEST12345678'
            ];
            
            for (const code of initialCodes) {
                await connection.execute(
                    'INSERT INTO activation_codes (code) VALUES (?)',
                    [code]
                );
                console.log(`插入激活码: ${code}`);
            }
        }
        
        // 显示统计信息
        const [codeStats] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(used) as used_count,
                COUNT(*) - SUM(used) as available_count
            FROM activation_codes
        `);
        
        const [logStats] = await connection.execute('SELECT COUNT(*) as count FROM activation_logs');
        
        console.log('\n数据库初始化完成！');
        console.log('='.repeat(40));
        console.log(`激活码统计:`);
        console.log(`  总数: ${codeStats[0].total}`);
        console.log(`  已使用: ${codeStats[0].used_count}`);
        console.log(`  可用: ${codeStats[0].available_count}`);
        console.log(`日志记录: ${logStats[0].count} 条`);
        console.log('='.repeat(40));
        
        return true;
        
    } catch (error) {
        console.error('数据库初始化失败:', error);
        return false;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// 如果直接运行此文件
if (require.main === module) {
    initializeDatabase().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { initializeDatabase };

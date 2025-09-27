// 简单的MySQL连接测试
console.log('开始MySQL连接测试...');

// 检查是否有mysql2模块
try {
    const mysql = require('mysql2/promise');
    console.log('✅ mysql2模块加载成功');
    
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
    
    console.log('📊 数据库配置:');
    console.log('  主机:', dbConfig.host);
    console.log('  端口:', dbConfig.port);
    console.log('  数据库:', dbConfig.database);
    console.log('  用户:', dbConfig.user);
    
    // 测试连接
    async function testConnection() {
        let connection;
        try {
            console.log('\n🔗 正在连接MySQL数据库...');
            connection = await mysql.createConnection(dbConfig);
            console.log('✅ 数据库连接成功！');
            
            // 执行测试查询
            console.log('\n🔍 执行测试查询...');
            const [rows] = await connection.execute('SELECT 1 as test, NOW() as current_time');
            console.log('✅ 查询执行成功:', rows[0]);
            
            // 检查数据库表
            console.log('\n📋 检查数据库表...');
            const [tables] = await connection.execute(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = ? 
                ORDER BY table_name
            `, [dbConfig.database]);
            
            console.log('📊 现有表列表:');
            if (tables.length > 0) {
                tables.forEach(table => {
                    console.log('  -', table.table_name);
                });
            } else {
                console.log('  (没有找到表，将自动创建)');
            }
            
            // 创建测试表
            console.log('\n🔨 创建激活码表...');
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
            console.log('✅ activation_codes表创建成功');
            
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS activation_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    code VARCHAR(50) NOT NULL,
                    action VARCHAR(50) NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    device_info JSON NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ activation_logs表创建成功');
            
            // 检查现有数据
            console.log('\n📊 检查现有数据...');
            const [codeCount] = await connection.execute('SELECT COUNT(*) as count FROM activation_codes');
            console.log(`激活码数量: ${codeCount[0].count}`);
            
            // 如果没有数据，插入测试数据
            if (codeCount[0].count === 0) {
                console.log('\n📝 插入初始测试数据...');
                const testCodes = ['ABC123DEF456', 'XYZ789GHI012', 'TEST12345678'];
                
                for (const code of testCodes) {
                    await connection.execute(
                        'INSERT IGNORE INTO activation_codes (code) VALUES (?)',
                        [code]
                    );
                    console.log(`  ✅ 插入激活码: ${code}`);
                }
            }
            
            // 最终统计
            const [finalCount] = await connection.execute('SELECT COUNT(*) as count FROM activation_codes');
            const [logCount] = await connection.execute('SELECT COUNT(*) as count FROM activation_logs');
            
            console.log('\n🎉 MySQL数据库测试完成！');
            console.log('='.repeat(40));
            console.log(`📊 最终统计:`);
            console.log(`  激活码总数: ${finalCount[0].count}`);
            console.log(`  日志记录数: ${logCount[0].count}`);
            console.log(`  数据库状态: 连接正常`);
            console.log('='.repeat(40));
            
        } catch (error) {
            console.error('❌ 数据库操作失败:', error.message);
            console.error('错误详情:', {
                code: error.code,
                errno: error.errno,
                sqlState: error.sqlState,
                sqlMessage: error.sqlMessage
            });
        } finally {
            if (connection) {
                await connection.end();
                console.log('🔌 数据库连接已关闭');
            }
        }
    }
    
    // 执行测试
    testConnection().catch(console.error);
    
} catch (error) {
    console.error('❌ mysql2模块加载失败:', error.message);
    console.log('\n💡 解决方案:');
    console.log('1. 运行: npm install mysql2');
    console.log('2. 或者运行: npm install');
    console.log('3. 确保package.json中包含mysql2依赖');
}

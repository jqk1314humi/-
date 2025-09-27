/**
 * MySQL数据库连接测试
 */

const db = require('../api/database');

async function runTests() {
    console.log('🚀 开始数据库连接测试...\n');

    try {
        // 测试1: 连接测试
        console.log('📡 测试数据库连接...');
        const isConnected = await db.testConnection();
        
        if (isConnected) {
            console.log('✅ 数据库连接成功\n');
        } else {
            console.log('❌ 数据库连接失败\n');
            return;
        }

        // 测试2: 初始化表
        console.log('🗄️  初始化数据库表...');
        await db.initializeTables();
        console.log('✅ 数据库表初始化成功\n');

        // 测试3: 获取统计信息
        console.log('📊 获取数据库统计信息...');
        const stats = await db.getStats();
        console.log('✅ 统计信息:', stats, '\n');

        // 测试4: 获取激活码
        console.log('🔑 获取所有激活码...');
        const codes = await db.getAllActivationCodes();
        console.log(`✅ 获取到 ${Object.keys(codes).length} 个激活码\n`);

        // 测试5: 获取日志
        console.log('📝 获取使用日志...');
        const logs = await db.getActivationLogs(10);
        console.log(`✅ 获取到 ${logs.length} 条日志\n`);

        // 测试6: 创建测试激活码
        const testCode = 'TEST' + Date.now().toString().slice(-6);
        console.log(`➕ 创建测试激活码: ${testCode}`);
        
        try {
            await db.createActivationCode(testCode);
            console.log('✅ 测试激活码创建成功\n');

            // 测试7: 使用激活码
            console.log('🔓 测试使用激活码...');
            const deviceInfo = {
                deviceFingerprint: 'test_device_' + Date.now(),
                userAgent: 'Test User Agent',
                ipHash: 'test_ip_hash',
                sessionId: 'test_session_' + Date.now()
            };

            await db.useActivationCode(testCode, deviceInfo);
            console.log('✅ 激活码使用成功\n');

            // 测试8: 重置激活码
            console.log('🔄 测试重置激活码...');
            await db.resetActivationCode(testCode);
            console.log('✅ 激活码重置成功\n');

            // 测试9: 删除测试激活码
            console.log('🗑️  删除测试激活码...');
            await db.deleteActivationCode(testCode);
            console.log('✅ 测试激活码删除成功\n');

        } catch (error) {
            console.log('⚠️  测试激活码操作失败:', error.message, '\n');
        }

        console.log('🎉 所有测试完成！');

    } catch (error) {
        console.error('❌ 测试失败:', error);
    } finally {
        // 关闭数据库连接池
        if (db.pool) {
            await db.pool.end();
            console.log('📴 数据库连接已关闭');
        }
    }
}

// 运行测试
runTests();

/**
 * 云端数据库查看器
 * 直接从JSONBin API获取数据并显示
 */

const https = require('https');

// JSONBin配置
const JSONBIN_URL = 'https://api.jsonbin.io/v3/b/67474a8bacd3cb34a8a1b2c8';

function fetchCloudData() {
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(JSONBIN_URL, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (error) {
                    reject(new Error('解析JSON数据失败: ' + error.message));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error('网络请求失败: ' + error.message));
        });
        
        req.end();
    });
}

function formatTime(timestamp) {
    if (!timestamp) return '未知时间';
    return new Date(timestamp).toLocaleString('zh-CN');
}

function displayCloudData(data) {
    console.log('\n' + '='.repeat(60));
    console.log('             云端数据库内容查看');
    console.log('='.repeat(60));
    
    if (!data.record) {
        console.log('❌ 没有找到数据记录');
        return;
    }
    
    const cloudData = data.record;
    const codes = cloudData.codes || {};
    const logs = cloudData.logs || [];
    
    // 统计信息
    const totalCodes = Object.keys(codes).length;
    const usedCodes = Object.values(codes).filter(code => code.used).length;
    const availableCodes = totalCodes - usedCodes;
    
    console.log('\n📊 数据统计:');
    console.log(`   总激活码数: ${totalCodes}`);
    console.log(`   已使用: ${usedCodes}`);
    console.log(`   可用: ${availableCodes}`);
    console.log(`   日志条数: ${logs.length}`);
    console.log(`   最后同步: ${formatTime(cloudData.lastSync)}`);
    
    // 激活码详情
    console.log('\n🔑 激活码列表:');
    if (totalCodes === 0) {
        console.log('   (没有激活码)');
    } else {
        Object.entries(codes).forEach(([code, info]) => {
            const status = info.used ? '🔴 已使用' : '🟢 可用';
            console.log(`   ${code} - ${status}`);
            
            if (info.used) {
                console.log(`      └─ 使用时间: ${formatTime(info.usedAt)}`);
                if (info.deviceFingerprint) {
                    console.log(`      └─ 设备指纹: ${info.deviceFingerprint}`);
                }
                if (info.usedBy && info.usedBy.userAgent) {
                    const userAgent = info.usedBy.userAgent.length > 50 
                        ? info.usedBy.userAgent.substring(0, 50) + '...'
                        : info.usedBy.userAgent;
                    console.log(`      └─ 用户代理: ${userAgent}`);
                }
            }
            
            if (info.createdAt) {
                console.log(`      └─ 创建时间: ${formatTime(info.createdAt)}`);
            }
        });
    }
    
    // 最近的日志
    console.log('\n📝 最近使用日志 (最新5条):');
    if (logs.length === 0) {
        console.log('   (没有日志记录)');
    } else {
        const recentLogs = logs.slice(-5).reverse();
        recentLogs.forEach((log, index) => {
            const time = formatTime(log.timestamp);
            const action = log.action || '未知操作';
            const code = log.code || '未知激活码';
            const type = log.type === 'developer' ? '👨‍💻 开发者' : '👤 用户';
            
            console.log(`   ${index + 1}. [${time}] ${type} - ${action} (${code})`);
        });
    }
    
    // 系统信息
    console.log('\n⚙️  系统信息:');
    console.log(`   数据版本: ${cloudData.version || '未知'}`);
    console.log(`   存储位置: JSONBin (67474a8bacd3cb34a8a1b2c8)`);
    console.log(`   查看时间: ${new Date().toLocaleString('zh-CN')}`);
    
    console.log('\n' + '='.repeat(60));
}

async function main() {
    try {
        console.log('🔄 正在连接云端数据库...');
        const data = await fetchCloudData();
        displayCloudData(data);
    } catch (error) {
        console.error('❌ 获取云端数据失败:', error.message);
        console.log('\n💡 可能的原因:');
        console.log('   1. 网络连接问题');
        console.log('   2. JSONBin服务不可用');
        console.log('   3. API配置错误');
        console.log('\n🔧 解决方案:');
        console.log('   1. 检查网络连接');
        console.log('   2. 稍后重试');
        console.log('   3. 使用网页版查看器: view-cloud-data.html');
    }
}

// 运行主函数
main();

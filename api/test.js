// 最简单的测试API
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
    
    try {
        console.log('测试API被调用:', req.method, req.url);
        
        res.status(200).json({
            success: true,
            message: '测试API工作正常！',
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            headers: req.headers
        });
        
    } catch (error) {
        console.error('测试API错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

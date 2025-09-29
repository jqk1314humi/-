/**
 * 双表系统的核心方法
 * 为 VikaCloudStorage 添加使用记录表相关功能
 */

// 将新的方法添加到现有类中
Object.assign(VikaCloudStorage.prototype, {
    
    /**
     * 获取使用记录维格表数据
     */
    async getUsageRecords() {
        try {
            console.log('📖 从使用记录维格表获取数据...');
            
            let allRecords = [];
            let pageToken = null;
            let pageCount = 0;
            
            do {
                const params = {
                    fieldKey: this.VIKA_CONFIG.fieldKey,
                    pageSize: 1000
                };
                
                if (pageToken) {
                    params.pageToken = pageToken;
                }

                console.log(`📄 获取使用记录表第${pageCount + 1}页数据，参数:`, params);
                const response = await this.makeVikaRequest('GET', '', null, params, this.VIKA_CONFIG.usageDatasheetId);
                console.log(`📄 使用记录表第${pageCount + 1}页API原始响应:`, response);
                
                if (response.data && response.data.records) {
                    const records = response.data.records;
                    allRecords = allRecords.concat(records);
                    console.log(`✅ 使用记录表第${pageCount + 1}页获取到 ${records.length} 条记录`);
                    
                    pageToken = response.data.pageToken;
                    pageCount++;
                    
                    if (pageCount >= 10) {
                        console.warn('⚠️ 使用记录表已达到最大页数限制(10页)，停止获取');
                        break;
                    }
                } else {
                    console.log('📄 使用记录表没有更多数据');
                    break;
                }
                
            } while (pageToken);
            
            console.log('✅ 使用记录表数据获取完成，总记录数:', allRecords.length);
            return allRecords;
            
        } catch (error) {
            console.error('❌ 获取使用记录表数据失败:', error);
            return []; // 返回空数组而不是抛出错误
        }
    },

    /**
     * 检查激活码是否在使用记录表中
     */
    async checkUsageTable(code) {
        try {
            const usageRecords = await this.getUsageRecords();
            
            for (const record of usageRecords) {
                const fields = record.fields;
                const possibleCodeFields = ['code', 'Code', 'CODE', 'activationCode', 'activation_code'];
                
                for (const fieldName of possibleCodeFields) {
                    if (fields[fieldName] && typeof fields[fieldName] === 'string') {
                        if (fields[fieldName] === code) {
                            console.log(`🔍 激活码 ${code} 在使用记录表中，已使用`);
                            return true;
                        }
                    }
                }
            }
            
            console.log(`✅ 激活码 ${code} 不在使用记录表中，可以使用`);
            return false;
            
        } catch (error) {
            console.error('❌ 检查使用记录表失败:', error);
            return false;
        }
    },

    /**
     * 将激活码写入使用记录表
     */
    async writeToUsageTable(code, deviceInfo) {
        try {
            console.log(`📝 将激活码 ${code} 写入使用记录表...`);
            
            const { Vika } = window;
            if (!Vika) {
                throw new Error('Vika SDK未加载');
            }

            const vika = new Vika({ token: this.VIKA_CONFIG.token, fieldKey: "name" });
            const usageDatasheet = vika.datasheet(this.VIKA_CONFIG.usageDatasheetId);

            const writeResponse = await usageDatasheet.records.create([{
                fields: {
                    "code": code,
                    "usedAt": new Date().toISOString(),
                    "usedBy": JSON.stringify(deviceInfo),
                    "userAgent": navigator.userAgent,
                    "timestamp": new Date().toISOString()
                }
            }]);

            if (!writeResponse.success) {
                throw new Error('写入使用记录表失败: ' + JSON.stringify(writeResponse));
            }

            console.log('✅ 激活码已成功写入使用记录表:', code, writeResponse.data);
            return writeResponse.data;
            
        } catch (error) {
            console.error('❌ 写入使用记录表失败:', error);
            throw error;
        }
    },

    /**
     * 从使用记录表中删除激活码
     */
    async deleteFromUsageTable(code) {
        try {
            console.log(`🗑️ 从使用记录表中删除激活码 ${code}...`);
            
            const usageRecords = await this.getUsageRecords();
            let recordIdToDelete = null;
            
            // 查找要删除的记录
            for (const record of usageRecords) {
                const fields = record.fields;
                const possibleCodeFields = ['code', 'Code', 'CODE', 'activationCode', 'activation_code'];
                
                for (const fieldName of possibleCodeFields) {
                    if (fields[fieldName] && fields[fieldName] === code) {
                        recordIdToDelete = record.recordId;
                        break;
                    }
                }
                
                if (recordIdToDelete) break;
            }

            if (recordIdToDelete) {
                const { Vika } = window;
                if (Vika) {
                    const vika = new Vika({ token: this.VIKA_CONFIG.token, fieldKey: "name" });
                    const usageDatasheet = vika.datasheet(this.VIKA_CONFIG.usageDatasheetId);
                    
                    const response = await usageDatasheet.records.delete([recordIdToDelete]);
                    console.log('✅ 已从使用记录表中删除激活码:', code);
                    return response;
                } else {
                    throw new Error('Vika SDK未加载');
                }
            } else {
                console.log(`⚠️ 在使用记录表中未找到激活码 ${code}`);
                return null;
            }
            
        } catch (error) {
            console.error('❌ 从使用记录表删除失败:', error);
            throw error;
        }
    }
});

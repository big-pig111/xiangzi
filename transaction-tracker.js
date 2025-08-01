// Transaction Tracker - Responsible for Solana transaction monitoring
class TransactionTracker {
    constructor() {
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.lastSignature = null;
        this.transactions = [];
        this.currentEndpointIndex = 0;
        this.tokenAddress = '';
        
        // Duplicate detection related
        this.processedTransactions = new Set(); // Set of processed transaction signatures
        this.lastProcessedTime = 0; // Last processing timestamp
        
        this.init();
    }
    
    init() {
        console.log('Transaction tracker initialization completed');
    }
    
    // 开始监控
    async startMonitoring(tokenAddress) {
        if (!tokenAddress) {
            console.error('代币地址不能为空');
            return;
        }
        
        if (this.isMonitoring) {
            console.log('监控已在运行中');
            return;
        }
        
        this.tokenAddress = tokenAddress;
        this.isMonitoring = true;
        
        // 更新状态显示
        this.updateDetectionStatus('🟢 监控中...');
        this.addLogEntry('🚀 Solana交易监控已启动', 'info');
        this.updateSyncStatus('syncing', '启动监控...');
        
        // 立即获取一次交易记录
        await this.fetchLatestTransactions();
        
        // 开始定时监控
        this.monitoringInterval = setInterval(async () => {
            if (this.isMonitoring) {
                await this.fetchLatestTransactions();
                // 定期清理已处理的交易缓存
                this.cleanupProcessedTransactions();
            }
        }, CONFIG.ui.refreshInterval);
        
        console.log('交易监控已启动');
    }
    
    // 停止监控
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        this.updateDetectionStatus('🔴 已停止');
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.addLogEntry('⏹️ Solana交易监控已停止', 'warning');
        this.updateSyncStatus('default', '监控已停止');
        
        console.log('交易监控已停止');
    }
    
    // 获取最新交易
    async fetchLatestTransactions() {
        try {
            this.updateSyncStatus('syncing', '检查新交易...');
            
            const signatures = await this.makeRpcCall('getSignaturesForAddress', [
                this.tokenAddress,
                { limit: 10 }
            ]);
            
            if (!signatures || signatures.length === 0) {
                this.updateSyncStatus('success', '无新交易');
                return;
            }
            
            // 检查是否有新交易
            const latestSignature = signatures[0].signature;
            if (this.lastSignature && this.lastSignature === latestSignature) {
                this.updateSyncStatus('success', '无新交易');
                return;
            }
            
            // 获取新交易
            const newTransactions = [];
            for (let i = 0; i < signatures.length; i++) {
                const sig = signatures[i];
                if (this.lastSignature && sig.signature === this.lastSignature) {
                    break;
                }
                newTransactions.push(sig);
            }
            
            if (newTransactions.length > 0) {
                console.log(`检测到 ${newTransactions.length} 笔新交易`);
                this.addLogEntry(`🔍 检测到 ${newTransactions.length} 笔新交易`, 'info');
                this.updateSyncStatus('syncing', `处理 ${newTransactions.length} 笔交易...`);
                
                // 获取新交易的详细信息
                const transactionDetails = await this.getTransactionDetails(newTransactions);
                
                // 添加到交易列表
                this.transactions.unshift(...transactionDetails);
                
                // 保持最多100条记录
                if (this.transactions.length > CONFIG.ui.maxTransactions) {
                    this.transactions = this.transactions.slice(0, CONFIG.ui.maxTransactions);
                }
                
                // 处理每个新交易
                for (const tx of transactionDetails) {
                    if (tx) {
                        try {
                            await this.processTransaction(tx);
                        } catch (error) {
                            console.error('处理交易失败:', error);
                            this.addLogEntry(`❌ 处理交易失败: ${error.message}`, 'error');
                        }
                    }
                }
                
                this.lastSignature = latestSignature;
                this.updateTransactionsDisplay();
                this.updateSyncStatus('success', `已同步 ${newTransactions.length} 笔交易`);
            } else {
                this.updateSyncStatus('success', '无新交易');
            }
            
        } catch (error) {
            console.error('获取交易失败:', error);
            this.updateDetectionStatus('🔴 连接错误');
            this.addLogEntry(`❌ 获取交易失败: ${error.message}`, 'error');
            this.updateSyncStatus('error', '同步失败');
        }
    }
    
    // 获取交易详情
    async getTransactionDetails(signatures) {
        const details = [];
        
        for (const sig of signatures) {
            try {
                const txData = await this.makeRpcCall('getTransaction', [
                    sig.signature,
                    {
                        encoding: 'jsonParsed',
                        maxSupportedTransactionVersion: 0
                    }
                ]);
                
                const transaction = this.parseTransaction(txData, sig);
                if (transaction) {
                    details.push(transaction);
                }
            } catch (error) {
                console.warn('获取交易详情失败:', error);
            }
        }
        
        return details;
    }
    
    // 解析交易
    parseTransaction(tx, sig) {
        if (!tx || !tx.meta) {
            return null;
        }
        
        const tokenInstructions = tx.meta.postTokenBalances || [];
        const preTokenBalances = tx.meta.preTokenBalances || [];
        
        const relevantBalances = tokenInstructions.filter(balance => 
            balance.mint === this.tokenAddress
        );
        
        if (relevantBalances.length === 0) {
            return null;
        }
        
        const balanceChanges = relevantBalances.map(balance => {
            const preBalance = preTokenBalances.find(pre => 
                pre.accountIndex === balance.accountIndex && pre.mint === this.tokenAddress
            );
            
            const preAmount = preBalance ? parseInt(preBalance.uiTokenAmount.amount) : 0;
            const postAmount = parseInt(balance.uiTokenAmount.amount);
            const change = postAmount - preAmount;
            
            return {
                account: balance.owner,
                change: change,
                amount: Math.abs(change)
            };
        });
        
        return {
            signature: sig.signature,
            blockTime: sig.blockTime,
            amount: balanceChanges[0]?.amount || 0,
            type: this.determineTransactionType(balanceChanges),
            src: balanceChanges.find(b => b.change < 0)?.account || 'N/A',
            dst: balanceChanges.find(b => b.change > 0)?.account || 'N/A'
        };
    }
    
    // 确定交易类型
    determineTransactionType(balanceChanges) {
        if (balanceChanges.length === 0) return '转移';
        
        const hasMint = balanceChanges.some(b => b.change > 0 && b.account === '11111111111111111111111111111111');
        const hasBurn = balanceChanges.some(b => b.change < 0 && b.account === '11111111111111111111111111111111');
        
        if (hasMint) return '铸造';
        if (hasBurn) return '销毁';
        return '转移';
    }
    
    // 处理交易
    async processTransaction(tx) {
        // 防重复检测：检查交易是否已经处理过
        if (this.processedTransactions.has(tx.signature)) {
            console.log(`交易已处理过，跳过: ${tx.signature}`);
            return;
        }
        
        // 防重复检测：检查时间间隔（避免同一时间段的重复处理）
        const currentTime = Date.now();
        if (currentTime - this.lastProcessedTime < 1000) { // 1秒内不重复处理
            console.log('处理间隔太短，跳过');
            return;
        }
        
        const tradeType = this.determineTradeType(tx);
        const amount = Utils.formatNumber(tx.amount, 9);
        
        // 游戏逻辑：检查是否达到阈值并增加倒计时
        if (tradeType === '买入') {
            if (tx.amount >= CONFIG.game.triggerThreshold) {
                // 检查是否超过最大倒计时上限
                const currentAdjustment = window.countdownManager.totalTimeAdjustment + CONFIG.game.countdownIncrement;
                if (currentAdjustment <= CONFIG.game.maxCountdown) {
                    // 先检查Firebase中是否已存在该交易
                    const isDuplicate = await this.checkTransactionDuplicate(tx.signature);
                    if (isDuplicate) {
                        console.log(`Firebase中已存在该交易，跳过: ${tx.signature}`);
                        this.processedTransactions.add(tx.signature);
                        return;
                    }
                    
                    // 增加倒计时
                    window.countdownManager.addTime(CONFIG.game.countdownIncrement);
                    
                    this.addLogEntry(`💰 检测到大额买入交易！数量: ${amount}，倒计时 +${CONFIG.game.countdownIncrement}秒`, 'success');
                    
                    // 记录成功增加倒计时的地址
                    this.addSuccessAddress(tx.dst, tx.amount, tx.blockTime);
                    
                    // 更新游戏数据
                    window.countdownManager.gameData.lastBigBuyAddress = tx.dst;
                    window.countdownManager.gameData.lastBigBuyAmount = tx.amount;
                    
                    // 保存交易记录到Firebase
                    await this.saveTransactionToFirebase(tx);
                    
                    // 标记为已处理
                    this.processedTransactions.add(tx.signature);
                    this.lastProcessedTime = currentTime;
                    
                    console.log(`交易处理完成: ${tx.signature}`);
                } else {
                    this.addLogEntry(`⚠️ 大额买入交易检测到，但已达到${CONFIG.game.maxCountdown}秒上限！`, 'warning');
                }
            } else {
                this.addLogEntry(`检测到小额买入交易，数量: ${amount}，未达到${CONFIG.game.triggerThreshold}阈值`, 'info');
            }
        } else {
            this.addLogEntry(`检测到${tradeType}交易，数量: ${amount}，不增加倒计时`, 'info');
        }
    }
    
    // 判断交易类型
    determineTradeType(tx) {
        if (tx.type === '铸造') {
            return '买入';
        } else if (tx.type === '销毁') {
            return '卖出';
        } else if (tx.type === '转移') {
            const isSrcLp = Utils.isLpAddress(tx.src);
            const isDstLp = Utils.isLpAddress(tx.dst);
            if (isSrcLp && !isDstLp) {
                return '买入';
            } else if (isDstLp && !isSrcLp) {
                return '卖出';
            } else {
                return '转移';
            }
        }
        return '转移';
    }
    
    // RPC调用
    async makeRpcCall(method, params, endpointIndex = 0) {
        const endpoint = CONFIG.rpcEndpoints[endpointIndex];
        
        // 更新当前RPC显示
        this.updateCurrentRpc(endpoint, endpointIndex);
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: Math.floor(Math.random() * 1000),
                    method: method,
                    params: params
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(`RPC Error: ${data.error.message}`);
            }
            
            // 成功使用当前RPC
            this.updateCurrentRpc(endpoint, endpointIndex, true);
            return data.result;
        } catch (error) {
            console.warn(`RPC调用失败 (${endpoint}):`, error);
            
            // 标记当前RPC失败
            this.updateCurrentRpc(endpoint, endpointIndex, false);
            
            if (endpointIndex < CONFIG.rpcEndpoints.length - 1) {
                return await this.makeRpcCall(method, params, endpointIndex + 1);
            }
            
            throw error;
        }
    }
    
    // 更新RPC状态
    updateCurrentRpc(endpoint, index, success = null) {
        const rpcNames = ['QuickNode', 'Solana官方', 'Project Serum'];
        const rpcName = rpcNames[index] || `RPC ${index + 1}`;
        
        let status = '';
        if (success === true) {
            status = '✅';
        } else if (success === false) {
            status = '❌';
        } else {
            status = '🔄';
        }
        
        const rpcStatusElement = document.getElementById('rpcStatus');
        if (rpcStatusElement) {
            rpcStatusElement.textContent = `${status} ${rpcName}`;
        }
    }
    
    // 更新检测状态
    updateDetectionStatus(status) {
        const statusElement = document.getElementById('detectionStatus');
        if (statusElement) {
            statusElement.innerHTML = status;
        }
    }
    
    // 更新同步状态
    updateSyncStatus(status, message) {
        const indicator = document.getElementById('syncIndicator');
        const statusText = document.getElementById('syncStatus');
        
        if (!indicator || !statusText) return;
        
        switch (status) {
            case 'syncing':
                indicator.className = 'status-indicator syncing';
                statusText.textContent = '同步中...';
                statusText.className = 'text-xs text-yellow-400';
                break;
            case 'success':
                indicator.className = 'status-indicator success';
                statusText.textContent = message || '同步完成';
                statusText.className = 'text-xs text-green-400';
                break;
            case 'error':
                indicator.className = 'status-indicator error';
                statusText.textContent = message || '同步错误';
                statusText.className = 'text-xs text-red-400';
                break;
            default:
                indicator.className = 'status-indicator default';
                statusText.textContent = message || '等待同步...';
                statusText.className = 'text-xs text-gray-400';
        }
    }
    
    // 添加日志
    addLogEntry(message, type = 'info') {
        const logContainer = document.getElementById('transactionLog');
        const timestamp = new Date().toLocaleTimeString();
        
        let colorClass = 'text-gray-300';
        if (type === 'success') colorClass = 'text-green-400';
        else if (type === 'warning') colorClass = 'text-yellow-400';
        else if (type === 'error') colorClass = 'text-red-400';
        
        const logEntry = document.createElement('div');
        logEntry.className = colorClass;
        logEntry.innerHTML = `[${timestamp}] ${message}`;
        
        // 移除等待消息
        const waitingMsg = logContainer.querySelector('.text-gray-500');
        if (waitingMsg) {
            waitingMsg.remove();
        }
        
        logContainer.insertBefore(logEntry, logContainer.firstChild);
        
        // 限制日志条目数量
        while (logContainer.children.length > 100) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }
    
    // 更新交易显示
    updateTransactionsDisplay() {
        const tbody = document.getElementById('detailedTransactionTable');
        
        if (!tbody) {
            console.error('找不到详细交易表格元素');
            return;
        }
        
        // 更新计数器
        const detailedCount = document.getElementById('detailedCount');
        if (detailedCount) {
            detailedCount.textContent = `${this.transactions.length} 条记录`;
        }
        
        if (this.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 italic p-4">暂无交易记录</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        this.transactions.forEach((tx, index) => {
            const row = document.createElement('tr');
            // 新交易高亮效果
            if (index < 5) {
                row.classList.add('bg-green-900', 'bg-opacity-20');
            }
            
            const tradeType = this.determineTradeType(tx);
            let typeClass = 'text-gray-300';
            if (tradeType === '买入') {
                typeClass = 'text-green-400 font-bold';
            } else if (tradeType === '卖出') {
                typeClass = 'text-red-400 font-bold';
            } else if (tradeType === '转移') {
                typeClass = 'text-blue-400 font-bold';
            }
            
            const timestamp = new Date(tx.blockTime * 1000).toLocaleString('zh-CN');
            const amount = Utils.formatNumber(tx.amount, 9);
            
            // 交易者逻辑
            let trader = '';
            if (tradeType === '买入') {
                trader = tx.dst;
            } else if (tradeType === '卖出') {
                trader = tx.src;
            } else {
                trader = tx.src + ' → ' + tx.dst;
            }
            
            row.innerHTML = `
                <td class="p-2 text-gray-400">${timestamp}</td>
                <td class="p-2">
                    <span class="${typeClass}">${tradeType}</span>
                </td>
                <td class="p-2 text-white font-bold">${amount}</td>
                <td class="p-2">
                    <span class="text-blue-400 cursor-pointer hover:text-blue-300" onclick="window.open('https://solscan.io/account/${trader}', '_blank')" title="${trader}">
                        ${Utils.formatAddress(trader)}
                    </span>
                </td>
                <td class="p-2">
                    <span class="text-memeYellow cursor-pointer hover:text-yellow-300" onclick="window.open('https://solscan.io/tx/${tx.signature}', '_blank')" title="${tx.signature}">
                        ${Utils.formatAddress(tx.signature)}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // 添加成功地址
    addSuccessAddress(address, amount, timestamp) {
        if (window.uiManager) {
            window.uiManager.addSuccessAddress(address, amount, timestamp);
        }
    }
    
    // 检查交易是否重复
    async checkTransactionDuplicate(signature) {
        try {
            if (!window.firebaseService) {
                console.warn('Firebase服务未初始化');
                return false;
            }
            
            const result = await window.firebaseService.checkTransactionExists(signature);
            return result.success && result.data;
        } catch (error) {
            console.error('检查交易重复失败:', error);
            return false;
        }
    }
    
    // 保存交易到Firebase
    async saveTransactionToFirebase(transaction) {
        try {
            const transactionData = {
                timestamp: Utils.getTimestamp(),
                signature: transaction.signature,
                type: transaction.type,
                amount: transaction.amount,
                blockTime: transaction.blockTime,
                src: transaction.src,
                dst: transaction.dst,
                tradeType: this.determineTradeType(transaction),
                processedAt: Date.now() // 添加处理时间戳
            };
            
            await window.firebaseService.saveTransaction(transactionData);
            console.log(`交易已保存到Firebase: ${transaction.signature}`);
        } catch (error) {
            console.error('保存交易记录失败:', error);
            throw error; // 重新抛出错误，让调用者处理
        }
    }
    
    // 获取处理统计信息
    async getProcessingStats() {
        try {
            if (!window.firebaseService) {
                return {
                    localProcessed: this.processedTransactions.size,
                    lastProcessedTime: this.lastProcessedTime,
                    firebaseStats: null
                };
            }
            
            const result = await window.firebaseService.getTransactionStats();
            return {
                localProcessed: this.processedTransactions.size,
                lastProcessedTime: this.lastProcessedTime,
                firebaseStats: result.success ? result.data : null
            };
        } catch (error) {
            console.error('获取处理统计失败:', error);
            return {
                localProcessed: this.processedTransactions.size,
                lastProcessedTime: this.lastProcessedTime,
                firebaseStats: null
            };
        }
    }
    
    // 清理已处理的交易缓存（防止内存泄漏）
    cleanupProcessedTransactions() {
        const currentTime = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24小时
        
        // 清理超过24小时的已处理交易记录
        if (currentTime - this.lastProcessedTime > maxAge) {
            this.processedTransactions.clear();
            this.lastProcessedTime = currentTime;
            console.log('已清理过期的交易缓存');
        }
    }
    
    // 清理资源
    destroy() {
        this.stopMonitoring();
        this.transactions = [];
        this.processedTransactions.clear();
    }
}

// 导出交易追踪器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionTracker;
} else {
    window.TransactionTracker = TransactionTracker;
} 
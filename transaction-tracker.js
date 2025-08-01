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
            console.error('Token address cannot be empty');
            return;
        }
        
        if (this.isMonitoring) {
            console.log('Monitoring already running');
            return;
        }
        
        this.tokenAddress = tokenAddress;
        this.isMonitoring = true;
        
        // 更新状态显示
        this.updateDetectionStatus('🟢 Monitoring...');
        this.addLogEntry('🚀 Solana transaction monitoring started', 'info');
        this.updateSyncStatus('syncing', 'Starting monitoring...');
        
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
        
        console.log('Transaction monitoring started');
    }
    
    // 停止监控
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        this.updateDetectionStatus('🔴 Stopped');
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.addLogEntry('⏹️ Solana transaction monitoring stopped', 'warning');
        this.updateSyncStatus('default', 'Monitoring stopped');
        
        console.log('Transaction monitoring stopped');
    }
    
    // 获取最新交易
    async fetchLatestTransactions() {
        try {
            this.updateSyncStatus('syncing', 'Checking for new transactions...');
            
            const signatures = await this.makeRpcCall('getSignaturesForAddress', [
                this.tokenAddress,
                { limit: 10 }
            ]);
            
            if (!signatures || signatures.length === 0) {
                this.updateSyncStatus('success', 'No new transactions');
                return;
            }
            
            // 检查是否有新交易
            const latestSignature = signatures[0].signature;
            if (this.lastSignature && this.lastSignature === latestSignature) {
                this.updateSyncStatus('success', 'No new transactions');
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
                console.log(`Detected ${newTransactions.length} new transactions`);
                this.addLogEntry(`🔍 Detected ${newTransactions.length} new transactions`, 'info');
                this.updateSyncStatus('syncing', `Processing ${newTransactions.length} transactions...`);
                
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
                            console.error('Failed to process transaction:', error);
                            this.addLogEntry(`❌ Failed to process transaction: ${error.message}`, 'error');
                        }
                    }
                }
                
                this.lastSignature = latestSignature;
                this.updateTransactionsDisplay();
                this.updateSyncStatus('success', `Synchronized ${newTransactions.length} transactions`);
            } else {
                this.updateSyncStatus('success', 'No new transactions');
            }
            
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            this.updateDetectionStatus('🔴 Connection Error');
            this.addLogEntry(`❌ Failed to fetch transactions: ${error.message}`, 'error');
            this.updateSyncStatus('error', 'Sync failed');
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
                console.warn('Failed to get transaction details:', error);
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
        if (balanceChanges.length === 0) return 'Transfer';
        
        const hasMint = balanceChanges.some(b => b.change > 0 && b.account === '11111111111111111111111111111111');
        const hasBurn = balanceChanges.some(b => b.change < 0 && b.account === '11111111111111111111111111111111');
        
        if (hasMint) return 'Mint';
        if (hasBurn) return 'Burn';
        return 'Transfer';
    }
    
    // 处理交易
    async processTransaction(tx) {// 防重复检测：检查交易是否已经处理过
        if (this.processedTransactions.has(tx.signature)) {
            console.log(`Transaction already processed, skipping: ${tx.signature}`);
            return;
        }
        
       
        const currentTime = Date.now();
        if (currentTime - this.lastProcessedTime < 1000) { // 1秒内不重复处理
            console.log('Processing interval too short, skipping');
            return;
        }
        
        const tradeType = this.determineTradeType(tx);
        const amount = Utils.formatNumber(tx.amount, 9);
        
        // 游戏逻辑：检查是否达到阈值并增加倒计时
        if (tradeType === 'Buy') {
            if (tx.amount >= CONFIG.game.triggerThreshold) {
                // 检查是否超过最大倒计时上限
                const currentAdjustment = window.countdownManager.totalTimeAdjustment + CONFIG.game.countdownIncrement;
                if (currentAdjustment <= CONFIG.game.maxCountdown) {
                    // 先检查Firebase中是否已存在该交易
                    const isDuplicate = await this.checkTransactionDuplicate(tx.signature);
                    if (isDuplicate) {
                        console.log(`Transaction already exists in Firebase, skipping: ${tx.signature}`);
                        this.processedTransactions.add(tx.signature);
                        return;
                    }
                    
                    // 增加倒计时
                    window.countdownManager.addTime(CONFIG.game.countdownIncrement);
                    
                    this.addLogEntry(`💰 Large buy transaction detected! Amount: ${amount}, Countdown +${CONFIG.game.countdownIncrement} seconds`, 'success');
                    
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
                    
                    console.log(`Transaction processing completed: ${tx.signature}`);
                } else {
                    this.addLogEntry(`⚠️ Large buy transaction detected, but reached ${CONFIG.game.maxCountdown} seconds limit!`, 'warning');
                }
            } else {
                this.addLogEntry(`Small buy transaction detected, amount: ${amount}, below ${CONFIG.game.triggerThreshold} threshold`, 'info');
            }
        } else {
            this.addLogEntry(`Detected ${tradeType} transaction, amount: ${amount}, no countdown increase`, 'info');
        }
    }
    
    // 判断交易类型
    determineTradeType(tx) {
        if (tx.type === 'Mint') {
            return 'Buy';
        } else if (tx.type === 'Burn') {
            return 'Sell';
        } else if (tx.type === 'Transfer') {
            const isSrcLp = Utils.isLpAddress(tx.src);
            const isDstLp = Utils.isLpAddress(tx.dst);
            if (isSrcLp && !isDstLp) {
                return 'Buy';
            } else if (isDstLp && !isSrcLp) {
                return 'Sell';
            } else {
                return 'Transfer';
            }
        }
        return 'Transfer';
    }
    
    // RPC调用
    async makeRpcCall(method, params, endpointIndex = 0) {
        const endpoint = CONFIG.rpcEndpoints[endpointIndex];
        
        // Update current RPC display
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
            
            // Successfully using current RPC
            this.updateCurrentRpc(endpoint, endpointIndex, true);
            return data.result;
        } catch (error) {
            console.warn(`RPC call failed (${endpoint}):`, error);
            
            // Mark current RPC as failed
            this.updateCurrentRpc(endpoint, endpointIndex, false);
            
            if (endpointIndex < CONFIG.rpcEndpoints.length - 1) {
                return await this.makeRpcCall(method, params, endpointIndex + 1);
            }
            
            throw error;
        }
    }
    
    // 更新RPC状态
    updateCurrentRpc(endpoint, index, success = null) {
        const rpcNames = ['QuickNode', 'Solana Official', 'Project Serum'];
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
                statusText.textContent = 'Syncing...';
                statusText.className = 'text-xs text-yellow-400';
                break;
            case 'success':
                indicator.className = 'status-indicator success';
                statusText.textContent = message || 'Sync completed';
                statusText.className = 'text-xs text-green-400';
                break;
            case 'error':
                indicator.className = 'status-indicator error';
                statusText.textContent = message || 'Sync error';
                statusText.className = 'text-xs text-red-400';
                break;
            default:
                indicator.className = 'status-indicator default';
                statusText.textContent = message || 'Waiting for sync...';
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
        
        // Remove waiting message
        const waitingMsg = logContainer.querySelector('.text-gray-500');
        if (waitingMsg) {
            waitingMsg.remove();
        }
        
        logContainer.insertBefore(logEntry, logContainer.firstChild);
        
        // Limit log entry count
        while (logContainer.children.length > 100) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }
    
    // 更新交易显示
    updateTransactionsDisplay() {
        const tbody = document.getElementById('detailedTransactionTable');
        
        if (!tbody) {
            console.error('Detailed transaction table element not found');
            return;
        }
        
        // Update counter
        const detailedCount = document.getElementById('detailedCount');
        if (detailedCount) {
            detailedCount.textContent = `${this.transactions.length} records`;
        }
        
        if (this.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 italic p-4">No transaction records</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        this.transactions.forEach((tx, index) => {
            const row = document.createElement('tr');
            // New transaction highlight effect
            if (index < 5) {
                row.classList.add('bg-green-900', 'bg-opacity-20');
            }
            
            const tradeType = this.determineTradeType(tx);
            let typeClass = 'text-gray-300';
            if (tradeType === 'Buy') {
                typeClass = 'text-green-400 font-bold';
            } else if (tradeType === 'Sell') {
                typeClass = 'text-red-400 font-bold';
            } else if (tradeType === 'Transfer') {
                typeClass = 'text-blue-400 font-bold';
            }
            
            const timestamp = new Date(tx.blockTime * 1000).toLocaleString('en-US');
            const amount = Utils.formatNumber(tx.amount, 9);
            
            // Trader logic
            let trader = '';
            if (tradeType === 'Buy') {
                trader = tx.dst;
            } else if (tradeType === 'Sell') {
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
                console.warn('Firebase service not initialized');
                return false;
            }
            
            const result = await window.firebaseService.checkTransactionExists(signature);
            return result.success && result.data;
        } catch (error) {
            console.error('Failed to check transaction duplicate:', error);
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
            console.log(`Transaction saved to Firebase: ${transaction.signature}`);
        } catch (error) {
            console.error('Failed to save transaction record:', error);
            throw error; // Re-throw error for caller to handle
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
            console.error('Failed to get processing stats:', error);
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
        
        // Clean up processed transactions older than 24 hours
        if (currentTime - this.lastProcessedTime > maxAge) {
            this.processedTransactions.clear();
            this.lastProcessedTime = currentTime;
            console.log('Cleaned up expired transaction cache');
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

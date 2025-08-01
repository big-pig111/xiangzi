// Firebase Service Class
class FirebaseService {
    constructor() {
        this.database = null;
        this.functions = null;
        this.initialized = false;
    }

    // Initialize Firebase
    async init() {
        try {
            // Initialize Firebase
            firebase.initializeApp(CONFIG.firebase);
            this.database = firebase.database();
            this.functions = firebase.app().functions('us-central1');
            this.initialized = true;
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw error;
        }
    }

    // Save countdown state
    async saveCountdownState(countdownData) {
        if (!this.initialized) throw new Error('Firebase not initialized');
        
        try {
            await this.database.ref('countdownState').set({
                ...countdownData,
                lastUpdated: Utils.getTimestamp()
            });
            return Utils.successResponse(null, 'Countdown state saved');
        } catch (error) {
            return Utils.handleError(error, 'saveCountdownState');
        }
    }

    // Save holder reward countdown state
    async saveHolderRewardCountdownState(holderRewardData) {
        if (!this.initialized) throw new Error('Firebase not initialized');
        
        try {
            await this.database.ref('holderRewardCountdownState').set({
                ...holderRewardData,
                lastUpdated: Utils.getTimestamp()
            });
            return Utils.successResponse(null, 'Holder reward countdown state saved');
        } catch (error) {
            return Utils.handleError(error, 'saveHolderRewardCountdownState');
        }
    }

    // Listen to countdown state changes
    onCountdownStateChange(callback) {
        if (!this.initialized) throw new Error('Firebase not initialized');
        
        // Prevent duplicate listeners
        if (this.countdownListener) {
            this.database.ref('countdownState').off('value', this.countdownListener);
        }
        
        this.countdownListener = (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            }
        };
        
        return this.database.ref('countdownState').on('value', this.countdownListener);
    }

    // 监听持仓奖励倒计时状态变化
    onHolderRewardCountdownStateChange(callback) {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        // 防止重复监听
        if (this.holderRewardListener) {
            this.database.ref('holderRewardCountdownState').off('value', this.holderRewardListener);
        }
        
        this.holderRewardListener = (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            }
        };
        
        return this.database.ref('holderRewardCountdownState').on('value', this.holderRewardListener);
    }

    // 监听游戏控制指令
    onGameControlChange(callback) {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        // 防止重复监听
        if (this.gameControlListener) {
            this.database.ref('gameControl').off('value', this.gameControlListener);
        }
        
        this.gameControlListener = (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            }
        };
        
        return this.database.ref('gameControl').on('value', this.gameControlListener);
    }

    // 监听代币地址变化
    onTokenAddressChange(callback) {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        // 防止重复监听
        if (this.tokenAddressListener) {
            this.database.ref('currentTokenAddress').off('value', this.tokenAddressListener);
        }
        
        this.tokenAddressListener = (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            }
        };
        
        return this.database.ref('currentTokenAddress').on('value', this.tokenAddressListener);
    }

    // 保存游戏轮次数据
    async saveGameRound(roundData) {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            const roundId = `round_${Utils.getTimestamp()}`;
            await this.database.ref(`gameRounds/${roundId}`).set({
                ...roundData,
                roundId,
                timestamp: Utils.getTimestamp(),
                isClaimed: false
            });
            return Utils.successResponse(roundId, '游戏轮次已保存');
        } catch (error) {
            return Utils.handleError(error, 'saveGameRound');
        }
    }

    // 保存持仓奖励轮次
    async saveHolderRewardRound(roundData) {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            const roundId = `holder_round_${Utils.getTimestamp()}`;
            await this.database.ref(`holderRewardRounds/${roundId}`).set({
                ...roundData,
                roundId,
                timestamp: Utils.getTimestamp(),
                type: 'holder_reward',
                isClaimed: false
            });
            return Utils.successResponse(roundId, '持仓奖励轮次已保存');
        } catch (error) {
            return Utils.handleError(error, 'saveHolderRewardRound');
        }
    }

    // 检查交易是否存在
    async checkTransactionExists(signature) {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            const snapshot = await this.database.ref('transactions')
                .orderByChild('signature')
                .equalTo(signature)
                .once('value');
            
            return Utils.successResponse(snapshot.exists(), '交易检查完成');
        } catch (error) {
            return Utils.handleError(error, 'checkTransactionExists');
        }
    }
    
    // 保存交易记录
    async saveTransaction(transactionData) {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            // 使用交易签名作为key，确保唯一性
            const transactionKey = `transactions/${transactionData.signature}`;
            await this.database.ref(transactionKey).set({
                ...transactionData,
                timestamp: Utils.getTimestamp()
            });
            return Utils.successResponse(null, '交易记录已保存');
        } catch (error) {
            return Utils.handleError(error, 'saveTransaction');
        }
    }

    // 获取交易统计信息
    async getTransactionStats() {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            const snapshot = await this.database.ref('transactions')
                .orderByChild('timestamp')
                .limitToLast(1000) // 获取最近1000条交易
                .once('value');
            
            if (snapshot.exists()) {
                const transactions = [];
                snapshot.forEach((childSnapshot) => {
                    transactions.push(childSnapshot.val());
                });
                
                // 统计信息
                const stats = {
                    totalTransactions: transactions.length,
                    bigBuyTransactions: transactions.filter(tx => 
                        tx.tradeType === '买入' && tx.amount >= CONFIG.game.triggerThreshold
                    ).length,
                    lastProcessedTime: transactions.length > 0 ? 
                        Math.max(...transactions.map(tx => tx.processedAt || 0)) : 0
                };
                
                return Utils.successResponse(stats, '交易统计获取成功');
            }
            
            return Utils.successResponse({
                totalTransactions: 0,
                bigBuyTransactions: 0,
                lastProcessedTime: 0
            }, '暂无交易数据');
        } catch (error) {
            return Utils.handleError(error, 'getTransactionStats');
        }
    }
    
    // 保存持仓数据
    async saveHoldersData(holdersData) {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            await this.database.ref('holdersData').push({
                ...holdersData,
                timestamp: Utils.getTimestamp()
            });
            return Utils.successResponse(null, '持仓数据已保存');
        } catch (error) {
            return Utils.handleError(error, 'saveHoldersData');
        }
    }

    // 获取最新游戏轮次
    async getLatestGameRound() {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            const snapshot = await this.database.ref('gameRounds')
                .orderByChild('timestamp')
                .limitToLast(1)
                .once('value');
            
            if (snapshot.exists()) {
                const data = Object.values(snapshot.val())[0];
                return Utils.successResponse(data);
            }
            return Utils.successResponse(null);
        } catch (error) {
            return Utils.handleError(error, 'getLatestGameRound');
        }
    }

    // 获取所有游戏轮次
    async getAllGameRounds() {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            const snapshot = await this.database.ref('gameRounds')
                .orderByChild('timestamp')
                .once('value');
            
            if (snapshot.exists()) {
                const rounds = [];
                snapshot.forEach((childSnapshot) => {
                    const roundData = childSnapshot.val();
                    if (roundData.countdownEnded) {
                        rounds.push(roundData);
                    }
                });
                return Utils.successResponse(rounds.reverse());
            }
            return Utils.successResponse([]);
        } catch (error) {
            return Utils.handleError(error, 'getAllGameRounds');
        }
    }

    // 获取所有持仓奖励轮次
    async getAllHolderRewardRounds() {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            const snapshot = await this.database.ref('holderRewardRounds')
                .orderByChild('timestamp')
                .once('value');
            
            if (snapshot.exists()) {
                const rounds = [];
                snapshot.forEach((childSnapshot) => {
                    rounds.push(childSnapshot.val());
                });
                return Utils.successResponse(rounds.reverse());
            }
            return Utils.successResponse([]);
        } catch (error) {
            return Utils.handleError(error, 'getAllHolderRewardRounds');
        }
    }

    // 标记轮次为已领取
    async markRoundAsClaimed(roundId, rewardType = 'game') {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            const ref = rewardType === 'holder' 
                ? `holderRewardRounds/${roundId}`
                : `gameRounds/${roundId}`;
                
            await this.database.ref(ref).update({
                isClaimed: true,
                claimedAt: Utils.getTimestamp()
            });
            return Utils.successResponse(null, '轮次已标记为已领取');
        } catch (error) {
            return Utils.handleError(error, 'markRoundAsClaimed');
        }
    }

    // 调用云函数
    async callFunction(functionName, data = {}) {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            const functionRef = this.functions.httpsCallable(functionName);
            const result = await functionRef(data);
            return Utils.successResponse(result.data);
        } catch (error) {
            return Utils.handleError(error, `callFunction:${functionName}`);
        }
    }
    
    // 领取游戏奖励
    async claimGameReward(wallet, roundId, rewardType) {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            const result = await this.callFunction('claimGameReward', {
                wallet: wallet,
                roundId: roundId,
                rewardType: rewardType
            });
            
            if (result.success) {
                console.log('奖励领取成功:', result.data);
                return result;
            } else {
                throw new Error(result.message || '领取奖励失败');
            }
        } catch (error) {
            console.error('领取游戏奖励失败:', error);
            return Utils.handleError(error, 'claimGameReward');
        }
    }
    
    // 获取用户可领取的奖励
    async getUserClaimableRewards(wallet) {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            const result = await this.callFunction('getUserClaimableRewards', {
                wallet: wallet
            });
            
            if (result.success) {
                console.log('用户可领取奖励获取成功:', result.data);
                return result;
            } else {
                throw new Error(result.message || '获取可领取奖励失败');
            }
        } catch (error) {
            console.error('获取用户可领取奖励失败:', error);
            return Utils.handleError(error, 'getUserClaimableRewards');
        }
    }
    
    // 验证用户是否有资格领取前20名奖励
    async validateTop20Eligibility(wallet, roundId) {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            // 检查是否已经领取过
            const claimedSnapshot = await this.database.ref(`claimedRewards/top20/${roundId}/${wallet}`).once('value');
            if (claimedSnapshot.exists()) {
                return {
                    eligible: false,
                    reason: '已领取过此轮次奖励',
                    roundId: roundId
                };
            }
            
            // 检查是否在前20名中
            const roundSnapshot = await this.database.ref(`holderRewardRounds/${roundId}`).once('value');
            if (!roundSnapshot.exists()) {
                return {
                    eligible: false,
                    reason: '轮次未找到',
                    roundId: roundId
                };
            }
            
            const roundData = roundSnapshot.val();
            const top20Addresses = roundData.top20Addresses || [];
            const isInTop20 = top20Addresses.some(addr => addr.toLowerCase() === wallet.toLowerCase());
            
            if (isInTop20) {
                return {
                    eligible: true,
                    reason: '符合前20名奖励条件',
                    roundId: roundId
                };
            } else {
                return {
                    eligible: false,
                    reason: '不在前20名持有者中',
                    roundId: roundId
                };
            }
        } catch (error) {
            console.error('验证前20名资格失败:', error);
            return {
                eligible: false,
                reason: '验证失败: ' + error.message,
                roundId: roundId
            };
        }
    }
    
    // 验证用户是否有资格领取最后倒计时奖励
    async validateLastSuccessEligibility(wallet, roundId) {
        if (!this.initialized) throw new Error('Firebase未初始化');
        
        try {
            // 检查是否已经领取过
            const claimedSnapshot = await this.database.ref(`claimedRewards/countdown/${roundId}/${wallet}`).once('value');
            if (claimedSnapshot.exists()) {
                return {
                    eligible: false,
                    reason: '已领取过此轮次奖励',
                    roundId: roundId
                };
            }
            
            // 检查是否是最后成功地址
            const roundSnapshot = await this.database.ref(`gameRounds/${roundId}`).once('value');
            if (!roundSnapshot.exists()) {
                return {
                    eligible: false,
                    reason: '轮次未找到',
                    roundId: roundId
                };
            }
            
            const roundData = roundSnapshot.val();
            const lastSuccessAddress = roundData.lastBigBuyAddress;
            
            if (lastSuccessAddress && lastSuccessAddress.toLowerCase() === wallet.toLowerCase()) {
                return {
                    eligible: true,
                    reason: '符合最后成功奖励条件',
                    roundId: roundId
                };
            } else {
                return {
                    eligible: false,
                    reason: '不是最后成功地址',
                    roundId: roundId
                };
            }
        } catch (error) {
            console.error('验证最后成功资格失败:', error);
            return {
                eligible: false,
                reason: '验证失败: ' + error.message,
                roundId: roundId
            };
        }
    }

    // 断开连接
    disconnect() {
        if (this.initialized && this.database) {
            // 清理所有监听器
            if (this.countdownListener) {
                this.database.ref('countdownState').off('value', this.countdownListener);
                this.countdownListener = null;
            }
            if (this.holderRewardListener) {
                this.database.ref('holderRewardCountdownState').off('value', this.holderRewardListener);
                this.holderRewardListener = null;
            }
            if (this.gameControlListener) {
                this.database.ref('gameControl').off('value', this.gameControlListener);
                this.gameControlListener = null;
            }
            if (this.tokenAddressListener) {
                this.database.ref('currentTokenAddress').off('value', this.tokenAddressListener);
                this.tokenAddressListener = null;
            }
            
            this.database.goOffline();
            this.initialized = false;
        }
    }
}

// 导出Firebase服务
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseService;
} else {
    window.FirebaseService = FirebaseService;
} 

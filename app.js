// Main Application - Responsible for initializing and coordinating all modules
class App {
    constructor() {
        this.modules = {};
        this.initialized = false;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Starting application initialization...');
            
            // 1. Initialize Firebase service
            await this.initFirebaseService();
            
            // 2. Initialize modules
            await this.initModules();
            
            // 3. Setup event listeners
            this.setupEventListeners();
            
            // 4. Setup Firebase listeners
            this.setupFirebaseListeners();
            
            this.initialized = true;
            console.log('✅ Application initialization completed!');
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showError('Application initialization failed, please refresh the page and try again');
        }
    }
    
    // 初始化Firebase服务
    async initFirebaseService() {
        try {
            window.firebaseService = new FirebaseService();
            await window.firebaseService.init();
            console.log('✅ Firebase服务初始化完成');
        } catch (error) {
            console.error('❌ Firebase服务初始化失败:', error);
            throw error;
        }
    }
    
    // 初始化各个模块
    async initModules() {
        try {
            // 初始化倒计时管理器
            window.countdownManager = new CountdownManager();
            this.modules.countdownManager = window.countdownManager;
            console.log('✅ 倒计时管理器初始化完成');
            
            // 初始化交易追踪器
            window.transactionTracker = new TransactionTracker();
            this.modules.transactionTracker = window.transactionTracker;
            console.log('✅ 交易追踪器初始化完成');
            
            // 初始化UI管理器
            window.uiManager = new UIManager();
            this.modules.uiManager = window.uiManager;
            console.log('✅ UI管理器初始化完成');
            
            // 初始化钱包管理器
            window.walletManager = new WalletManager();
            this.modules.walletManager = window.walletManager;
            console.log('✅ 钱包管理器初始化完成');
            
        } catch (error) {
            console.error('❌ 模块初始化失败:', error);
            throw error;
        }
    }
    
    // 设置事件监听
    setupEventListeners() {
        // 监听倒计时结束事件
        if (window.eventBus) {
            window.eventBus.on('countdownEnded', () => {
                console.log('🎉 倒计时结束事件触发');
                this.handleCountdownEnded();
            });
            
            window.eventBus.on('holderRewardEnded', () => {
                console.log('🏆 持仓奖励结束事件触发');
                this.handleHolderRewardEnded();
            });
        }
        
        // 监听页面卸载事件
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // 监听错误事件
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
            this.showError('发生未知错误，请刷新页面重试');
        });
        
        // 监听未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
            this.showError('发生异步错误，请刷新页面重试');
        });
    }
    
    // 设置Firebase监听
    setupFirebaseListeners() {
        try {
            // 监听代币地址变化
            window.firebaseService.onTokenAddressChange((address) => {
                console.log('代币地址已更新:', address);
                this.updateTokenAddress(address);
            });
            
            // 监听游戏控制指令
            window.firebaseService.onGameControlChange((controlData) => {
                console.log('收到游戏控制指令:', controlData);
                this.handleGameControl(controlData);
            });
            
        } catch (error) {
            console.error('设置Firebase监听失败:', error);
        }
    }
    
    // 更新代币地址
    updateTokenAddress(address) {
        const tokenAddressInput = document.getElementById('tokenAddress');
        if (tokenAddressInput) {
            tokenAddressInput.value = address;
        }
        
        if (window.transactionTracker) {
            window.transactionTracker.tokenAddress = address;
        }
    }
    
    // 处理游戏控制指令
    handleGameControl(controlData) {
        if (!controlData) return;
        
        // 处理监控控制
        if (controlData.monitoring !== undefined) {
            if (controlData.monitoring) {
                this.startMonitoring();
            } else {
                this.stopMonitoring();
            }
        }
        
        // 处理游戏暂停控制
        if (controlData.paused !== undefined) {
            if (controlData.paused) {
                this.pauseGame();
            } else {
                this.resumeGame();
            }
        }
        
        // 处理重置倒计时
        if (controlData.resetCountdown) {
            this.resetCountdown();
        }
        
        // 处理强制快照
        if (controlData.forceSnapshot) {
            this.forceSnapshot();
        }
        
        // 处理倒计时归零
        if (controlData.endCountdown) {
            this.endCountdown();
        }
    }
    
    // 开始监控
    startMonitoring() {
        const tokenAddress = document.getElementById('tokenAddress')?.value?.trim();
        if (!tokenAddress) {
            console.warn('代币地址未设置，无法开始监控');
            return;
        }
        
        if (window.transactionTracker) {
            window.transactionTracker.startMonitoring(tokenAddress);
        }
        
        if (window.uiManager) {
            window.uiManager.startTopHoldersAutoRefresh(tokenAddress);
        }
        
        console.log('✅ 监控已启动');
    }
    
    // 停止监控
    stopMonitoring() {
        if (window.transactionTracker) {
            window.transactionTracker.stopMonitoring();
        }
        
        if (window.uiManager) {
            window.uiManager.stopTopHoldersAutoRefresh();
        }
        
        console.log('⏹️ 监控已停止');
    }
    
    // 暂停游戏
    pauseGame() {
        console.log('⏸️ 游戏已暂停');
        // 这里可以添加游戏暂停的具体逻辑
    }
    
    // 恢复游戏
    resumeGame() {
        console.log('▶️ 游戏已恢复');
        // 这里可以添加游戏恢复的具体逻辑
    }
    
    // 重置倒计时
    resetCountdown() {
        if (window.countdownManager) {
            window.countdownManager.resetCountdown();
        }
        console.log('🔄 倒计时已重置');
    }
    
    // 强制快照
    forceSnapshot() {
        console.log('📸 强制快照');
        // 这里可以添加强制快照的具体逻辑
    }
    
    // 倒计时归零
    endCountdown() {
        if (window.countdownManager) {
            window.countdownManager.countdownDate = new Date();
            window.countdownManager.gameData.countdownEnded = false;
            window.countdownManager.saveCountdownState();
        }
        console.log('⏰ 倒计时已归零');
    }
    
    // 处理倒计时结束
    handleCountdownEnded() {
        console.log('🎉 处理倒计时结束...');
        
        // 停止监控
        this.stopMonitoring();
        
        // 显示游戏结束界面
        this.showGameEndScreen();
        
        // 10秒后自动开始下一轮
        setTimeout(() => {
            this.startNextRound();
        }, 10000);
    }
    
    // 处理持仓奖励结束
    handleHolderRewardEnded() {
        console.log('🏆 处理持仓奖励结束...');
        
        // 这里可以添加持仓奖励结束的具体逻辑
        // 比如获取持仓前20名、保存数据等
    }
    
    // 显示游戏结束界面
    showGameEndScreen() {
        const countdownData = window.countdownManager?.getCountdownData();
        
        const overlay = document.createElement('div');
        overlay.id = 'gameEndOverlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-content max-w-md mx-4">
                <div class="text-center">
                    <div class="text-6xl mb-4">🎉</div>
                    <h2 class="text-memeYellow font-bold text-2xl mb-4">游戏结束！</h2>
                    <p class="text-white text-lg mb-6">本轮游戏已结束，请玩家领取奖励</p>
                    
                    <div class="bg-gray-700 border-meme p-4 rounded-lg mb-6">
                        <div class="text-memePink font-bold mb-2">本轮数据：</div>
                        <div class="text-gray-300 text-sm space-y-1">
                            <div>• 总交易次数：${countdownData?.transactionCount || 0}</div>
                            <div>• 倒计时调整：+${countdownData?.totalTimeAdjustment || 0} 秒</div>
                            <div>• 最后大额买入：${window.countdownManager?.gameData?.lastBigBuyAddress ? Utils.formatAddress(window.countdownManager.gameData.lastBigBuyAddress) : '无'}</div>
                        </div>
                    </div>
                    
                    <div class="text-memeYellow font-bold text-lg">
                        <span id="nextRoundCountdown">10</span> 秒后自动开始下一轮
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // 开始倒计时
        this.startNextRoundCountdown();
    }
    
    // 开始下一轮倒计时
    startNextRoundCountdown() {
        let countdown = 10;
        const countdownElement = document.getElementById('nextRoundCountdown');
        
        const timer = setInterval(() => {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown;
            }
            
            if (countdown <= 0) {
                clearInterval(timer);
                this.startNextRound();
            }
        }, 1000);
    }
    
    // 开始下一轮
    startNextRound() {
        // 隐藏游戏结束界面
        const overlay = document.getElementById('gameEndOverlay');
        if (overlay) {
            overlay.remove();
        }
        
        // 重置倒计时
        this.resetCountdown();
        
        console.log('🔄 新一轮游戏开始');
    }
    
    // 显示错误消息
    showError(message) {
        console.error('应用错误:', message);
        
        // 更新同步状态指示器
        if (window.uiManager) {
            window.uiManager.updateSyncStatusIndicator('error');
        }
        
        // 这里可以添加更友好的错误显示逻辑
        alert(`错误: ${message}`);
    }
    
    // 显示成功消息
    showSuccess(message) {
        console.log('应用成功:', message);
        
        // 这里可以添加更友好的成功显示逻辑
        alert(`成功: ${message}`);
    }
    
    // 获取应用状态
    getAppStatus() {
        return {
            initialized: this.initialized,
            modules: Object.keys(this.modules),
            countdownData: window.countdownManager?.getCountdownData(),
            walletConnected: window.walletManager?.isWalletConnected(),
            monitoring: window.transactionTracker?.isMonitoring
        };
    }
    
    // 清理资源
    cleanup() {
        console.log('🧹 开始清理应用资源...');
        
        // 清理各个模块
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });
        
        // 清理Firebase连接
        if (window.firebaseService) {
            window.firebaseService.disconnect();
        }
        
        console.log('✅ 应用资源清理完成');
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 创建全局事件总线（简单实现）
        window.eventBus = {
            listeners: {},
            on(event, callback) {
                if (!this.listeners[event]) {
                    this.listeners[event] = [];
                }
                this.listeners[event].push(callback);
            },
            emit(event, data) {
                if (this.listeners[event]) {
                    this.listeners[event].forEach(callback => {
                        try {
                            callback(data);
                        } catch (error) {
                            console.error('事件回调执行失败:', error);
                        }
                    });
                }
            }
        };
        
        // 初始化主应用
        window.app = new App();
        
    } catch (error) {
        console.error('应用启动失败:', error);
        alert('应用启动失败，请刷新页面重试');
    }
});

// 导出应用类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
} else {
    window.App = App;
} 
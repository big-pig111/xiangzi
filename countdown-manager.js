// Countdown Manager - Responsible for shared countdown logic
class CountdownManager {
    constructor() {
        this.countdownDate = null;
        this.originalCountdownDate = null;
        this.totalTimeAdjustment = 0;
        this.transactionCount = 0;
        this.countdownInterval = null;
        this.holderRewardDate = null;
        this.holderRewardInterval = null;
        this.saveTimeout = null;
        
        // Game state
        this.gameData = {
            countdownEnded: false,
            holderRewardEnded: false,
            lastRewardTime: 0,
            top20Holders: [],
            lastBigBuyAddress: null,
            lastBigBuyAmount: 0
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Load countdown state from Firebase
            await this.loadCountdownFromFirebase();
            await this.loadHolderRewardCountdownFromFirebase();
            
            // Start display updates
            this.startCountdownUpdate();
            this.startHolderRewardCountdownUpdate();
            
            // Setup Firebase listeners
            this.setupFirebaseListeners();
            
            console.log('Countdown manager initialization completed - Shared mode');
        } catch (error) {
            console.error('Countdown manager initialization failed:', error);
        }
    }
    
    // 从Firebase加载倒计时状态
    async loadCountdownFromFirebase() {
        try {
            const snapshot = await window.firebaseService.database.ref('countdownState').once('value');
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                this.countdownDate = new Date(data.countdownDate);
                this.originalCountdownDate = new Date(data.originalCountdownDate);
                this.totalTimeAdjustment = data.totalTimeAdjustment || 0;
                this.transactionCount = data.transactionCount || 0;
                
                // 优先使用Firebase中的倒计时结束状态
                if (data.countdownEnded !== undefined) {
                    this.gameData.countdownEnded = data.countdownEnded;
                } else {
                    const now = new Date();
                    const timeLeft = this.countdownDate - now;
                    this.gameData.countdownEnded = timeLeft < 0;
                }
                
                console.log('从Firebase加载倒计时状态成功');
            } else {
                // 创建新的倒计时
                await this.createNewCountdown();
            }
        } catch (error) {
            console.error('加载倒计时状态失败:', error);
        }
    }
    
    // 从Firebase加载持仓奖励倒计时状态
    async loadHolderRewardCountdownFromFirebase() {
        try {
            const snapshot = await window.firebaseService.database.ref('holderRewardCountdownState').once('value');
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                this.holderRewardDate = new Date(data.holderRewardDate);
                this.gameData.holderRewardEnded = data.holderRewardEnded || false;
                console.log('从Firebase加载持仓奖励倒计时状态成功');
            } else {
                // 创建新的持仓奖励倒计时
                await this.createNewHolderRewardCountdown();
            }
        } catch (error) {
            console.error('加载持仓奖励倒计时状态失败:', error);
        }
    }
    
    // 创建新的倒计时
    async createNewCountdown() {
        try {
            const result = await window.firebaseService.database.ref('countdownState').transaction((currentData) => {
                if (currentData === null) {
                    const newCountdownDate = new Date();
                    newCountdownDate.setMinutes(newCountdownDate.getMinutes() + 5);
                    
                    return {
                        countdownDate: newCountdownDate.getTime(),
                        originalCountdownDate: newCountdownDate.getTime(),
                        totalTimeAdjustment: 0,
                        transactionCount: 0,
                        countdownEnded: false,
                        lastUpdated: Utils.getTimestamp(),
                        createdBy: Utils.getTimestamp()
                    };
                }
                return currentData;
            });
            
            if (result.committed) {
                await this.loadCountdownFromFirebase();
            }
        } catch (error) {
            console.error('创建新倒计时失败:', error);
        }
    }
    
    // 创建新的持仓奖励倒计时
    async createNewHolderRewardCountdown() {
        try {
            const result = await window.firebaseService.database.ref('holderRewardCountdownState').transaction((currentData) => {
                if (currentData === null) {
                    const newHolderRewardDate = new Date();
                    newHolderRewardDate.setMinutes(newHolderRewardDate.getMinutes() + 3);
                    
                    return {
                        holderRewardDate: newHolderRewardDate.getTime(),
                        holderRewardEnded: false,
                        lastUpdated: Utils.getTimestamp(),
                        createdBy: Utils.getTimestamp()
                    };
                }
                return currentData;
            });
            
            if (result.committed) {
                await this.loadHolderRewardCountdownFromFirebase();
            }
        } catch (error) {
            console.error('创建新持仓奖励倒计时失败:', error);
        }
    }
    
    // 设置Firebase监听器
    setupFirebaseListeners() {
        // 监听倒计时状态变化
        window.firebaseService.onCountdownStateChange((data) => {
            this.countdownDate = new Date(data.countdownDate);
            this.originalCountdownDate = new Date(data.originalCountdownDate);
            this.totalTimeAdjustment = data.totalTimeAdjustment || 0;
            this.transactionCount = data.transactionCount || 0;
            
            if (data.countdownEnded !== undefined) {
                this.gameData.countdownEnded = data.countdownEnded;
            }
            
            // 立即更新显示
            this.updateCountdownDisplay();
            this.updateUI();
            
            console.log('倒计时状态已同步');
        });
        
        // 监听持仓奖励倒计时状态变化
        window.firebaseService.onHolderRewardCountdownStateChange((data) => {
            this.holderRewardDate = new Date(data.holderRewardDate);
            this.gameData.holderRewardEnded = data.holderRewardEnded || false;
            
            // 立即更新显示
            this.updateHolderRewardCountdown();
            
            console.log('持仓奖励倒计时状态已同步');
        });
    }
    
    // 启动倒计时显示更新
    startCountdownUpdate() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        this.countdownInterval = setInterval(() => {
            this.updateCountdownDisplay();
        }, 1000);
    }
    
    // 启动持仓奖励倒计时显示更新
    startHolderRewardCountdownUpdate() {
        if (this.holderRewardInterval) {
            clearInterval(this.holderRewardInterval);
        }
        
        this.holderRewardInterval = setInterval(() => {
            this.updateHolderRewardCountdown();
        }, 1000);
    }
    
    // 更新倒计时显示
    updateCountdownDisplay() {
        if (!this.countdownDate) return;
        
        const now = new Date();
        const timeLeft = this.countdownDate - now;
        
        const minutes = Math.max(0, Math.floor(timeLeft / (1000 * 60)));
        const seconds = Math.max(0, Math.floor((timeLeft % (1000 * 60)) / 1000));
        
        // 更新显示
        const minutesElement = document.getElementById("minutes");
        const secondsElement = document.getElementById("seconds");
        
        if (minutesElement) minutesElement.innerText = minutes.toString().padStart(2, '0');
        if (secondsElement) secondsElement.innerText = seconds.toString().padStart(2, '0');
        
        // 倒计时结束处理
        if (timeLeft < 0 && !this.gameData.countdownEnded) {
            this.handleCountdownEnded();
        }
    }
    
    // 更新持仓奖励倒计时显示
    updateHolderRewardCountdown() {
        if (!this.holderRewardDate) return;
        
        const now = new Date();
        const timeLeft = this.holderRewardDate - now;
        
        const minutes = Math.max(0, Math.floor(timeLeft / (1000 * 60)));
        const seconds = Math.max(0, Math.floor((timeLeft % (1000 * 60)) / 1000));
        
        // 更新显示
        const holderRewardElement = document.getElementById('holderRewardCountdown');
        if (holderRewardElement) {
            holderRewardElement.innerText = Utils.formatTime(minutes, seconds);
        }
        
        // 持仓奖励倒计时结束处理
        if (timeLeft < 0 && !this.gameData.holderRewardEnded) {
            this.handleHolderRewardEnded();
        }
    }
    
    // 处理倒计时结束
    async handleCountdownEnded() {
        console.log('倒计时结束，开始处理...');
        
        this.gameData.countdownEnded = true;
        
        // 显示LAUNCHED界面
        const countdownElement = document.getElementById("countdown");
        if (countdownElement) {
            countdownElement.innerHTML = `
                <div class="col-span-2 text-center">
                <div class="text-responsive-large font-bold text-memePink">LAUNCHED!</div>
                <div class="text-2xl text-white mt-4">TO THE MOON!!! 🚀</div>
                </div>
            `;
        }
        
        // 保存状态到Firebase
        await this.saveCountdownState();
        
        // 触发游戏结束事件
        if (window.eventBus) {
            window.eventBus.emit('countdownEnded');
        }
    }
    
    // 处理持仓奖励倒计时结束
    async handleHolderRewardEnded() {
        console.log('持仓奖励倒计时结束，开始快照...');
        
        this.gameData.holderRewardEnded = true;
        
        // 重置持仓奖励倒计时为3分钟
        this.holderRewardDate = new Date(Date.now() + 3 * 60 * 1000);
        this.gameData.holderRewardEnded = false;
        
        // 保存状态到Firebase
        await this.saveHolderRewardCountdownState();
        
        // 触发持仓奖励事件
        if (window.eventBus) {
            window.eventBus.emit('holderRewardEnded');
        }
    }
    
    // 增加倒计时时间
    async addTime(seconds) {
        if (!this.countdownDate) return;
        
        this.totalTimeAdjustment += seconds;
        this.countdownDate.setTime(this.countdownDate.getTime() + (seconds * 1000));
        this.transactionCount++;
        
        // 保存到Firebase
        await this.saveCountdownState();
        
        // 更新UI
        this.updateUI();
        
        console.log(`倒计时增加 ${seconds} 秒，总计调整: ${this.totalTimeAdjustment} 秒`);
    }
    
    // 保存倒计时状态
    async saveCountdownState() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(async () => {
            try {
                const countdownData = {
                    countdownDate: this.countdownDate.getTime(),
                    originalCountdownDate: this.originalCountdownDate.getTime(),
                    totalTimeAdjustment: this.totalTimeAdjustment,
                    transactionCount: this.transactionCount,
                    countdownEnded: this.gameData.countdownEnded,
                    lastUpdated: Utils.getTimestamp()
                };
                
                await window.firebaseService.saveCountdownState(countdownData);
            } catch (error) {
                console.error('保存倒计时状态失败:', error);
            }
        }, 1000);
    }
    
    // 保存持仓奖励倒计时状态
    async saveHolderRewardCountdownState() {
        try {
            const holderRewardData = {
                holderRewardDate: this.holderRewardDate.getTime(),
                holderRewardEnded: this.gameData.holderRewardEnded,
                lastUpdated: Utils.getTimestamp()
            };
            
            await window.firebaseService.saveHolderRewardCountdownState(holderRewardData);
        } catch (error) {
            console.error('保存持仓奖励倒计时状态失败:', error);
        }
    }
    
    // 更新UI显示
    updateUI() {
        const transactionCountElement = document.getElementById('transactionCount');
        const timeAdjustmentElement = document.getElementById('timeAdjustment');
        
        if (transactionCountElement) transactionCountElement.innerText = this.transactionCount;
        if (timeAdjustmentElement) timeAdjustmentElement.innerText = `+${this.totalTimeAdjustment} 秒`;
    }
    
    // 重置倒计时
    async resetCountdown() {
        this.countdownDate = new Date();
        this.countdownDate.setMinutes(this.countdownDate.getMinutes() + 5);
        this.originalCountdownDate = new Date(this.countdownDate);
        this.totalTimeAdjustment = 0;
        this.transactionCount = 0;
        this.gameData.countdownEnded = false;
        
        await this.saveCountdownState();
        this.updateCountdownDisplay();
        this.updateUI();
        
        console.log('倒计时已重置');
    }
    
    // 获取倒计时数据
    getCountdownData() {
        return {
            countdownDate: this.countdownDate,
            totalTimeAdjustment: this.totalTimeAdjustment,
            transactionCount: this.transactionCount,
            countdownEnded: this.gameData.countdownEnded
        };
    }
    
    // 清理资源
    destroy() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        if (this.holderRewardInterval) {
            clearInterval(this.holderRewardInterval);
        }
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
    }
}

// 导出倒计时管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CountdownManager;
} else {
    window.CountdownManager = CountdownManager;
} 
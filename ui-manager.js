// UI Manager - Responsible for user interface management
class UIManager {
    constructor() {
        this.successAddresses = [];
        this.topHoldersInterval = null;
        this.topHoldersCountdown = 10;
        
        this.init();
    }
    
    init() {
        console.log('UI manager initialization completed');
        this.setupEventListeners();
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Prevent duplicate event binding
        if (this.eventListenersSetup) return;
        this.eventListenersSetup = true;
        
        // 钱包连接按钮
        const walletConnectBtn = document.getElementById('walletConnectBtn');
        if (walletConnectBtn && !walletConnectBtn.dataset.listenerAdded) {
            walletConnectBtn.dataset.listenerAdded = 'true';
            walletConnectBtn.addEventListener('click', () => {
                if (window.walletManager) {
                    window.walletManager.showWalletModal();
                }
            });
        }
        
        // 白皮书按钮
        const whitepaperBtn = document.getElementById('whitepaperBtn');
        if (whitepaperBtn && !whitepaperBtn.dataset.listenerAdded) {
            whitepaperBtn.dataset.listenerAdded = 'true';
            whitepaperBtn.addEventListener('click', () => {
                if (window.showWhitepaper) {
                    window.showWhitepaper();
                } else {
                    alert('白皮书功能正在加载中，请稍后再试');
                }
            });
        }
        
        // 领取奖励按钮
        const claimRewardBtn = document.getElementById('claimRewardBtn');
        if (claimRewardBtn && !claimRewardBtn.dataset.listenerAdded) {
            claimRewardBtn.dataset.listenerAdded = 'true';
            claimRewardBtn.addEventListener('click', () => {
                this.showRewardPage();
            });
        }
        
        // 奖励页面相关按钮 - 使用事件委托避免重复绑定
        this.setupRewardPageEventListeners();
        
        // 添加按钮点击动画 - 使用事件委托避免重复绑定
        this.setupButtonAnimations();
    }
    
    // 设置奖励页面事件监听器
    setupRewardPageEventListeners() {
        // 使用事件委托，避免重复绑定
        document.addEventListener('click', (e) => {
            // 隐藏奖励页面按钮 - 通过父元素和文本内容识别
            if (e.target.matches('button') && 
                e.target.textContent === '×' && 
                e.target.closest('#rewardPage')) {
                e.preventDefault();
                e.stopPropagation();
                this.hideRewardPage();
                return;
            }
            
            // 领取前20名奖励按钮
            if (e.target.matches('#claimTop20Btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.claimTop20Reward();
                return;
            }
            
            // 领取最后成功奖励按钮
            if (e.target.matches('#claimLastSuccessBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.claimLastSuccessReward();
                return;
            }
            
            // 验证地址按钮
            if (e.target.matches('#verifyAddressBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.verifyAddress();
                return;
            }
            
            // 兑换代币按钮
            if (e.target.matches('#claimTokenBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.claimToken();
                return;
            }
        });
    }
    
    // 设置按钮动画
    setupButtonAnimations() {
        // 使用事件委托，避免重复绑定
        if (this.buttonAnimationsSetup) return;
        this.buttonAnimationsSetup = true;
        
        document.addEventListener('click', (e) => {
            if (e.target.matches('button, a')) {
                if (e.target.tagName === 'A') e.preventDefault();
                
                e.target.classList.add('scale-90');
                setTimeout(() => {
                    e.target.classList.remove('scale-90');
                }, 150);
            }
        });
    }
    
    // 添加成功增加倒计时的地址
    addSuccessAddress(address, amount, timestamp) {
        const addressInfo = {
            address: address,
            amount: amount,
            timestamp: timestamp,
            time: new Date().toLocaleTimeString()
        };
        
        // 检查是否已存在该地址
        const existingIndex = this.successAddresses.findIndex(item => item.address === address);
        if (existingIndex !== -1) {
            // 如果已存在，更新信息
            this.successAddresses[existingIndex] = addressInfo;
        } else {
            // 如果不存在，添加到开头
            this.successAddresses.unshift(addressInfo);
            // 保持最多5个
            if (this.successAddresses.length > CONFIG.ui.maxSuccessAddresses) {
                this.successAddresses = this.successAddresses.slice(0, CONFIG.ui.maxSuccessAddresses);
            }
        }
        
        this.updateSuccessAddressesDisplay();
    }
    
    // 更新成功地址显示
    updateSuccessAddressesDisplay() {
        const addressesList = document.getElementById('successAddressesList');
        if (!addressesList) return;
        
        if (this.successAddresses.length === 0) {
            addressesList.innerHTML = '<li class="text-gray-400 text-sm italic">等待大额买入...</li>';
            return;
        }
        
        addressesList.innerHTML = '';
        this.successAddresses.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'text-sm border-b border-gray-700 pb-2';
            li.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <span class="text-memePink font-bold">#${idx + 1}</span>
                        <a href="https://solscan.io/account/${item.address}" target="_blank" class="text-blue-400 hover:underline mx-2">
                            ${Utils.formatAddress(item.address)}
                        </a>
                    </div>
                    <div class="text-right text-xs text-gray-400">
                        <div>${item.amount}</div>
                        <div>${item.time}</div>
                    </div>
                </div>
            `;
            addressesList.appendChild(li);
        });
    }
    
    // 获取持仓前20持有者
    async fetchTopHolders(tokenMint) {
        const holdersList = document.getElementById('topHoldersList');
        if (!holdersList) return;
        
        holdersList.innerHTML = '<li class="text-gray-400 italic">链上实时查询中...</li>';
        
        try {
            console.log('开始查询持仓榜，代币地址:', tokenMint);
            
            // 1. 查找所有Token Account
            const data = await window.transactionTracker.makeRpcCall('getProgramAccounts', [
                'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                {
                    encoding: 'jsonParsed',
                    filters: [
                        { dataSize: 165 },
                        { memcmp: { offset: 0, bytes: tokenMint } }
                    ]
                }
            ]);
            
            console.log('RPC响应数据:', data);
            if (!data || !Array.isArray(data) || data.length === 0) {
                holdersList.innerHTML = '<li class="text-yellow-400 text-xs">链上暂无持仓数据</li>';
                return;
            }
            
            // 2. 统计所有owner和余额，排除LP池子
            const holders = {};
            data.forEach(acc => {
                const owner = acc.account.data.parsed.info.owner;
                const amount = parseInt(acc.account.data.parsed.info.tokenAmount.amount);
                if (CONFIG.lpAddresses.includes(owner)) return; // 跳过池子
                if (!holders[owner]) holders[owner] = 0;
                holders[owner] += amount;
            });
            
            console.log('统计到的持有人:', holders);
            
            // 3. 排序取前20
            const sorted = Object.entries(holders)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20);
            
            console.log('排序后的前20:', sorted);
            holdersList.innerHTML = '';
            
            sorted.forEach(([owner, amount], idx) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="text-memePink font-bold text-xs">#${idx + 1}</span>
                    <a href="https://solscan.io/account/${owner}" target="_blank" class="text-blue-400 hover:underline mx-1">
                        ${Utils.formatAddress(owner)}
                    </a>
                    <span class="text-gray-400 text-xs">(${amount})</span>
                `;
                holdersList.appendChild(li);
            });
            
        } catch (e) {
            console.error('链上查询失败，详细错误:', e);
            holdersList.innerHTML = `<li class="text-red-400 text-xs">链上查询失败: ${e.message}</li>`;
        }
    }
    
    // 启动持仓者自动刷新
    startTopHoldersAutoRefresh(tokenMint) {
        this.topHoldersCountdown = CONFIG.ui.holdersRefreshInterval;
        this.updateTopHoldersCountdown();
        
        if (this.topHoldersInterval) {
            clearInterval(this.topHoldersInterval);
        }
        
        // 立即拉取一次
        this.fetchTopHolders(tokenMint);
        
        this.topHoldersInterval = setInterval(() => {
            try {
                this.topHoldersCountdown--;
                this.updateTopHoldersCountdown();
                
                if (this.topHoldersCountdown <= 0) {
                    this.fetchTopHolders(tokenMint);
                    this.topHoldersCountdown = CONFIG.ui.holdersRefreshInterval;
                }
            } catch (error) {
                console.error('Top holders refresh error:', error);
            }
        }, 1000);
    }
    
    // 停止持仓者自动刷新
    stopTopHoldersAutoRefresh() {
        if (this.topHoldersInterval) {
            clearInterval(this.topHoldersInterval);
            this.topHoldersInterval = null;
        }
    }
    
    // 更新持仓者刷新倒计时显示
    updateTopHoldersCountdown() {
        const timer = document.getElementById('holdersRefreshCountdown');
        if (timer) {
            timer.textContent = this.topHoldersCountdown;
        }
    }
    
    // 显示奖励页面
    showRewardPage() {
        const rewardPage = document.getElementById('rewardPage');
        if (rewardPage) {
            rewardPage.classList.remove('hidden');
            this.updateRewardPageData();
            this.loadHolderRewardRoundsList();
            this.loadCountdownRewardRoundsList();
            this.updateScoreDisplay();
        }
    }
    
    // 隐藏奖励页面
    hideRewardPage() {
        const rewardPage = document.getElementById('rewardPage');
        if (rewardPage) {
            rewardPage.classList.add('hidden');
        }
    }
    
    // 更新奖励页面数据
    async updateRewardPageData() {
        // 检查钱包连接状态
        if (!window.walletManager || !window.walletManager.isConnected) {
            document.getElementById('top20Status').innerHTML = '<span class="text-red-400">❌ 请先连接钱包</span>';
            document.getElementById('lastSuccessStatus').innerHTML = '<span class="text-red-400">❌ 请先连接钱包</span>';
            document.getElementById('claimTop20Btn').disabled = true;
            document.getElementById('claimLastSuccessBtn').disabled = true;
            return;
        }
        
        // 获取钱包地址
        const walletAddress = window.walletManager.getWalletAddress();
        if (!walletAddress) {
            document.getElementById('top20Status').innerHTML = '<span class="text-red-400">❌ 钱包地址无效</span>';
            document.getElementById('lastSuccessStatus').innerHTML = '<span class="text-red-400">❌ 钱包地址无效</span>';
            document.getElementById('claimTop20Btn').disabled = true;
            document.getElementById('claimLastSuccessBtn').disabled = true;
            return;
        }
        
        try {
            // 加载轮次选择器
            await this.loadHolderRewardRoundsList();
            
            // 获取用户可领取的奖励
            const claimableRewards = await window.firebaseService.getUserClaimableRewards(walletAddress);
            
            if (claimableRewards.success) {
                const data = claimableRewards.data;
                
                // 更新前20名状态
                if (data.totalTop20 > 0) {
                    document.getElementById('top20Status').innerHTML = `<span class="text-green-400">✅ 可领取前20名奖励: ${data.totalTop20} 轮次</span>`;
                    document.getElementById('claimTop20Btn').disabled = false;
                } else {
                    document.getElementById('top20Status').innerHTML = '<span class="text-gray-400">⏳ 暂无可领取的前20名奖励</span>';
                    document.getElementById('claimTop20Btn').disabled = true;
                }
                
                // 更新最后成功状态
                if (data.totalCountdown > 0) {
                    document.getElementById('lastSuccessStatus').innerHTML = `<span class="text-green-400">✅ 可领取最后成功奖励: ${data.totalCountdown} 轮次</span>`;
                    document.getElementById('claimLastSuccessBtn').disabled = false;
                } else {
                    document.getElementById('lastSuccessStatus').innerHTML = '<span class="text-gray-400">⏳ 暂无可领取的最后成功奖励</span>';
                    document.getElementById('claimLastSuccessBtn').disabled = true;
                }
                
                // 更新积分显示
                await this.updateScoreDisplay();
            } else {
                document.getElementById('top20Status').innerHTML = '<span class="text-red-400">❌ 获取奖励信息失败</span>';
                document.getElementById('lastSuccessStatus').innerHTML = '<span class="text-red-400">❌ 获取奖励信息失败</span>';
            }
            
        } catch (error) {
            console.error('更新奖励页面数据失败:', error);
            document.getElementById('top20Status').innerHTML = '<span class="text-red-400">❌ 验证失败</span>';
            document.getElementById('lastSuccessStatus').innerHTML = '<span class="text-red-400">❌ 验证失败</span>';
        }
    }
    
    // 验证前20持有者资格
    async validateTop20Eligibility(walletAddress) {
        try {
            // 这里应该调用Firebase或API来验证资格
            // 暂时返回模拟数据
            return {
                eligible: false,
                message: '暂未实现验证逻辑'
            };
        } catch (error) {
            console.error('验证前20持有者资格失败:', error);
            return {
                eligible: false,
                message: '验证失败'
            };
        }
    }
    
    // 验证最后成功地址资格
    async validateLastSuccessEligibility(walletAddress) {
        try {
            // 这里应该调用Firebase或API来验证资格
            // 暂时返回模拟数据
            return {
                eligible: false,
                message: '暂未实现验证逻辑'
            };
        } catch (error) {
            console.error('验证最后成功地址资格失败:', error);
            return {
                eligible: false,
                message: '验证失败'
            };
        }
    }
    
    // 加载持仓奖励历史
    async loadHolderRewardRoundsList() {
        try {
            const roundSelector = document.getElementById('roundSelector');
            const historyElement = document.getElementById('holderRewardHistory');
            
            if (!roundSelector || !historyElement) return;
            
            // 获取所有持仓奖励轮次
            const result = await window.firebaseService.getAllHolderRewardRounds();
            
            if (result.success && result.data.length > 0) {
                // 清空选择器
                roundSelector.innerHTML = '<option value="">自动选择最新轮次</option>';
                
                // 添加轮次选项
                result.data.forEach(round => {
                    const option = document.createElement('option');
                    option.value = round.roundId;
                    option.textContent = `轮次 ${round.roundId} - ${new Date(round.timestamp).toLocaleString('zh-CN')}`;
                    roundSelector.appendChild(option);
                });
                
                // 更新历史记录
                let historyHTML = '';
                result.data.slice(0, 5).forEach(round => {
                    historyHTML += `<div class="text-gray-300">• 轮次 ${round.roundId}: ${new Date(round.timestamp).toLocaleString('zh-CN')}</div>`;
                });
                historyElement.innerHTML = historyHTML;
            } else {
                roundSelector.innerHTML = '<option value="">暂无可用轮次</option>';
                historyElement.innerHTML = '<div class="text-gray-500 italic">暂无历史记录</div>';
            }
        } catch (error) {
            console.error('加载持仓奖励轮次失败:', error);
            const roundSelector = document.getElementById('roundSelector');
            const historyElement = document.getElementById('holderRewardHistory');
            
            if (roundSelector) {
                roundSelector.innerHTML = '<option value="">加载失败</option>';
            }
            if (historyElement) {
                historyElement.innerHTML = '<div class="text-red-400">加载失败</div>';
            }
        }
    }
    
    // 加载倒计时奖励历史
    loadCountdownRewardRoundsList() {
        const historyElement = document.getElementById('countdownRewardHistory');
        if (historyElement) {
            historyElement.innerHTML = '<div class="text-gray-500 italic">暂无历史记录</div>';
        }
    }
    
    // 更新积分显示
    async updateScoreDisplay() {
        try {
            if (!window.walletManager || !window.walletManager.isConnected) {
                return;
            }
            
            const walletAddress = window.walletManager.getWalletAddress();
            if (!walletAddress) {
                return;
            }
            
            // 获取用户积分信息
            const result = await window.firebaseService.getUserClaimableRewards(walletAddress);
            
            if (result.success) {
                const data = result.data;
                const currentScore = data.currentScore || 0;
                const exchangeableTokens = Math.floor(currentScore / 10); // 1积分 = 10代币
                
                const currentScoreElement = document.getElementById('currentScore');
                const exchangeableTokensElement = document.getElementById('exchangeableTokens');
                
                if (currentScoreElement) {
                    currentScoreElement.textContent = currentScore.toString();
                }
                if (exchangeableTokensElement) {
                    exchangeableTokensElement.textContent = exchangeableTokens.toString();
                }
            }
        } catch (error) {
            console.error('更新积分显示失败:', error);
        }
    }
    
    // 领取前20名奖励
    async claimTop20Reward() {
        try {
            if (!window.walletManager || !window.walletManager.isConnected) {
                this.showError('请先连接钱包');
                return;
            }
            
            const walletAddress = window.walletManager.getWalletAddress();
            if (!walletAddress) {
                this.showError('钱包地址无效');
                return;
            }
            
            // 获取当前轮次
            const roundSelector = document.getElementById('roundSelector');
            const selectedRoundId = roundSelector ? roundSelector.value : null;
            
            if (!selectedRoundId) {
                this.showError('请选择要领取的轮次');
                return;
            }
            
            // 验证资格
            const eligibility = await window.firebaseService.validateTop20Eligibility(walletAddress, selectedRoundId);
            
            if (!eligibility.eligible) {
                this.showError(`❌ 您没有资格领取前20名奖励：\n${eligibility.reason}`);
                return;
            }
            
            // 调用Firebase函数领取奖励
            const result = await window.firebaseService.claimGameReward(walletAddress, selectedRoundId, 'top20');
            
            if (result.success) {
                this.showSuccess(`🏆 前20名奖励领取成功！\n获得 3000 积分\n当前总积分: ${result.data.newScore || 0}\n\n您可以使用积分兑换代币！`);
                
                // 更新奖励页面数据
                await this.updateRewardPageData();
            } else {
                this.showError('❌ 奖励领取失败: ' + (result.message || '未知错误'));
            }
            
        } catch (error) {
            console.error('领取前20名奖励失败:', error);
            this.showError('领取奖励失败: ' + error.message);
        }
    }
    
    // 领取最后成功奖励
    async claimLastSuccessReward() {
        try {
            if (!window.walletManager || !window.walletManager.isConnected) {
                this.showError('请先连接钱包');
                return;
            }
            
            const walletAddress = window.walletManager.getWalletAddress();
            if (!walletAddress) {
                this.showError('钱包地址无效');
                return;
            }
            
            // 获取最新游戏轮次
            const latestRound = await window.firebaseService.getLatestGameRound();
            if (!latestRound.success || !latestRound.data) {
                this.showError('无法获取游戏轮次信息');
                return;
            }
            
            const roundId = latestRound.data.roundId;
            
            // 验证资格
            const eligibility = await window.firebaseService.validateLastSuccessEligibility(walletAddress, roundId);
            
            if (!eligibility.eligible) {
                this.showError(`❌ 您没有资格领取最后倒计时奖励：\n${eligibility.reason}`);
                return;
            }
            
            // 调用Firebase函数领取奖励
            const result = await window.firebaseService.claimGameReward(walletAddress, roundId, 'countdown');
            
            if (result.success) {
                this.showSuccess(`💰 最后倒计时奖励领取成功！\n获得 10000 积分\n当前总积分: ${result.data.newScore || 0}\n\n您可以使用积分兑换代币！`);
                
                // 更新奖励页面数据
                await this.updateRewardPageData();
            } else {
                this.showError('❌ 奖励领取失败: ' + (result.message || '未知错误'));
            }
            
        } catch (error) {
            console.error('领取最后成功奖励失败:', error);
            this.showError('领取奖励失败: ' + error.message);
        }
    }
    
    // 验证地址
    async verifyAddress() {
        try {
            const addressInput = document.getElementById('verifyAddressInput');
            const verifyResult = document.getElementById('verifyResult');
            
            if (!addressInput || !verifyResult) return;
            
            const address = addressInput.value.trim();
            if (!address) {
                verifyResult.innerHTML = '<span class="text-red-400">请输入地址</span>';
                return;
            }
            
            if (!Utils.isValidAddress(address)) {
                verifyResult.innerHTML = '<span class="text-red-400">地址格式无效</span>';
                return;
            }
            
            verifyResult.innerHTML = '<span class="text-yellow-400">验证中...</span>';
            
            // 获取用户可领取的奖励
            const result = await window.firebaseService.getUserClaimableRewards(address);
            
            if (result.success) {
                const data = result.data;
                let verificationText = '<div class="text-green-400">✅ 地址验证完成</div>';
                
                if (data.totalTop20 > 0 || data.totalCountdown > 0) {
                    verificationText += '<div class="text-memeYellow mt-2">可领取奖励:</div>';
                    
                    if (data.totalTop20 > 0) {
                        verificationText += `<div class="text-memePink">• 前20名奖励: ${data.totalTop20} 轮次</div>`;
                    }
                    
                    if (data.totalCountdown > 0) {
                        verificationText += `<div class="text-memePink">• 最后成功奖励: ${data.totalCountdown} 轮次</div>`;
                    }
                    
                    verificationText += '<div class="text-memeGreen mt-2">请连接钱包后领取奖励</div>';
                } else {
                    verificationText += '<div class="text-gray-400 mt-2">暂无可领取的奖励</div>';
                }
                
                verifyResult.innerHTML = verificationText;
            } else {
                verifyResult.innerHTML = '<span class="text-red-400">验证失败: ' + (result.message || '未知错误') + '</span>';
            }
            
        } catch (error) {
            console.error('验证地址失败:', error);
            const verifyResult = document.getElementById('verifyResult');
            if (verifyResult) {
                verifyResult.innerHTML = '<span class="text-red-400">验证失败: ' + error.message + '</span>';
            }
        }
    }
    
    // 兑换代币
    async claimToken() {
        try {
            if (!window.walletManager || !window.walletManager.isConnected) {
                this.showError('请先连接钱包');
                return;
            }
            
            const walletAddress = window.walletManager.getWalletAddress();
            if (!walletAddress) {
                this.showError('钱包地址无效');
                return;
            }
            
            // 这里应该调用Firebase或API来兑换代币
            console.log('兑换代币:', walletAddress);
            this.showSuccess('代币兑换成功！');
            
        } catch (error) {
            console.error('兑换代币失败:', error);
            this.showError('兑换代币失败');
        }
    }
    
    // 更新同步状态指示器
    updateSyncStatusIndicator(status, message) {
        const syncIndicator = document.getElementById('syncStatusIndicator');
        if (!syncIndicator) return;
        
        switch (status) {
            case 'connected':
                syncIndicator.innerHTML = '🟢 已连接';
                syncIndicator.className = 'ml-2 text-green-400';
                break;
            case 'connecting':
                syncIndicator.innerHTML = '🟡 连接中...';
                syncIndicator.className = 'ml-2 text-yellow-400';
                break;
            case 'error':
                syncIndicator.innerHTML = '🔴 连接失败';
                syncIndicator.className = 'ml-2 text-red-400';
                break;
            case 'synced':
                syncIndicator.innerHTML = '🟢 已同步';
                syncIndicator.className = 'ml-2 text-green-400';
                break;
            default:
                syncIndicator.innerHTML = '🟢 共享模式';
                syncIndicator.className = 'ml-2 text-green-400';
        }
    }
    
    // 更新钱包状态显示
    updateWalletStatus(isConnected, address = null) {
        const walletStatus = document.getElementById('walletStatus');
        if (!walletStatus) return;
        
        if (isConnected && address) {
            walletStatus.innerHTML = `
                <span class="font-bold text-green-400">已连接</span>
                <div class="text-xs text-gray-300 mt-1">${Utils.formatAddress(address)}</div>
            `;
        } else {
            walletStatus.innerHTML = '<span class="font-bold">未连接</span>';
        }
    }
    
    // 显示错误消息
    showError(message) {
        console.error('UI错误:', message);
        // 这里可以添加更友好的错误显示逻辑
        alert(`错误: ${message}`);
    }
    
    // 显示成功消息
    showSuccess(message) {
        console.log('UI成功:', message);
        // 这里可以添加更友好的成功显示逻辑
        alert(`成功: ${message}`);
    }
    
    // 清理资源
    destroy() {
        this.stopTopHoldersAutoRefresh();
        this.successAddresses = [];
    }
}

// 导出UI管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
}

// 提供全局函数
window.hideRewardPage = () => {
    if (window.uiManager) {
        window.uiManager.hideRewardPage();
    }
}; 

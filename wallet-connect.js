// 钱包连接管理器
class WalletManager {
    constructor() {
        this.isConnected = false;
        this.currentWallet = null;
        this.publicKey = null;
        this.walletType = null;
    }

    init() {
        this.bindEvents();
        this.checkWalletConnection();
        
        // 监听钱包连接状态变化
        this.setupWalletListeners();
        
        // 定期检查连接状态
        setInterval(() => {
            this.checkWalletConnection();
        }, 5000); // 每5秒检查一次
        
        this.addLog('钱包管理器已初始化', 'info');
    }

    // 设置钱包监听器
    setupWalletListeners() {
        // 监听Phantom钱包状态变化
        if (window.solana && window.solana.isPhantom) {
            window.solana.on('connect', () => {
                this.addLog('Phantom钱包已连接', 'success');
                this.checkWalletConnection();
            });
            
            window.solana.on('disconnect', () => {
                this.addLog('Phantom钱包已断开', 'warning');
                this.checkWalletConnection();
            });
        }
        
        // 监听OKX钱包状态变化
        if (window.okxwallet) {
            window.okxwallet.on('connect', () => {
                this.addLog('OKX钱包已连接', 'success');
                this.checkWalletConnection();
            });
            
            window.okxwallet.on('disconnect', () => {
                this.addLog('OKX钱包已断开', 'warning');
                this.checkWalletConnection();
            });
        }
        
        // 监听Coinbase钱包状态变化
        if (window.coinbaseWalletSolana) {
            window.coinbaseWalletSolana.on('connect', () => {
                this.addLog('Coinbase钱包已连接', 'success');
                this.checkWalletConnection();
            });
            
            window.coinbaseWalletSolana.on('disconnect', () => {
                this.addLog('Coinbase钱包已断开', 'warning');
                this.checkWalletConnection();
            });
        }
    }

    bindEvents() {
        // 钱包连接按钮事件
        const walletConnectBtn = document.getElementById('walletConnectBtn');
        if (walletConnectBtn) {
            walletConnectBtn.addEventListener('click', () => {
                this.showWalletModal();
            });
        }
    }

    // 显示钱包选择模态框
    showWalletModal() {
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.id = 'walletModal';
        
        modal.innerHTML = `
            <div class="bg-gray-800 border-2 border-meme rounded-xl p-6 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-memeYellow">🔗 连接钱包</h3>
                    <button class="text-gray-400 hover:text-white text-2xl" onclick="this.closest('#walletModal').remove()">×</button>
                </div>
                
                <div class="space-y-4">
                    <div class="wallet-option bg-gray-700 hover:bg-gray-600 p-4 rounded-lg cursor-pointer border-2 border-transparent hover:border-memeYellow transition-all duration-300" data-wallet="phantom">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                                <span class="text-white font-bold">👻</span>
                            </div>
                            <div>
                                <div class="font-bold text-white">Phantom</div>
                                <div class="text-gray-400 text-sm">最受欢迎的Solana钱包</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="wallet-option bg-gray-700 hover:bg-gray-600 p-4 rounded-lg cursor-pointer border-2 border-transparent hover:border-memeYellow transition-all duration-300" data-wallet="okx">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span class="text-white font-bold">OKX</span>
                            </div>
                            <div>
                                <div class="font-bold text-white">OKX Wallet</div>
                                <div class="text-gray-400 text-sm">OKX交易所钱包</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="wallet-option bg-gray-700 hover:bg-gray-600 p-4 rounded-lg cursor-pointer border-2 border-transparent hover:border-memeYellow transition-all duration-300" data-wallet="coinbase">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                <span class="text-white font-bold">CB</span>
                            </div>
                            <div>
                                <div class="font-bold text-white">Coinbase Wallet</div>
                                <div class="text-gray-400 text-sm">Coinbase交易所钱包</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6 text-center text-gray-400 text-sm">
                    请确保已安装相应的钱包扩展程序
                </div>
            </div>
        `;

        // 添加钱包选择事件
        modal.addEventListener('click', (e) => {
            const walletOption = e.target.closest('.wallet-option');
            if (walletOption) {
                const walletType = walletOption.dataset.wallet;
                this.connectWallet(walletType);
                modal.remove();
            }
        });

        // 点击背景关闭模态框
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        document.body.appendChild(modal);
    }

    // 连接指定类型的钱包
    async connectWallet(walletType) {
        try {
            // 检查钱包是否已安装
            if (!this.isWalletInstalled(walletType)) {
                throw new Error(`请先安装${this.getWalletDisplayName(walletType)}钱包扩展程序`);
            }

            let wallet = null;
            
            switch (walletType) {
                case 'phantom':
                    wallet = await this.connectPhantomWallet();
                    break;
                case 'okx':
                    wallet = await this.connectOKXWallet();
                    break;
                case 'coinbase':
                    wallet = await this.connectCoinbaseWallet();
                    break;
                default:
                    throw new Error('不支持的钱包类型');
            }

            if (wallet && wallet.publicKey) {
                this.currentWallet = wallet;
                this.walletType = walletType;
                this.isConnected = true;
                this.publicKey = wallet.publicKey.toString();
                
                // 验证地址格式
                const address = this.getWalletAddress();
                if (!address) {
                    throw new Error('获取钱包地址失败');
                }
                
                this.updateWalletStatus();
                this.addLog(`✅ 成功连接${this.getWalletDisplayName(walletType)}钱包`, 'success');
                
                // 触发连接成功事件
                this.triggerConnectionEvent('connected', {
                    walletType: walletType,
                    address: address,
                    publicKey: this.publicKey
                });
                
                return true;
            } else {
                throw new Error('钱包连接失败：未获取到有效响应');
            }
        } catch (error) {
            this.addLog(`❌ 连接${this.getWalletDisplayName(walletType)}失败: ${error.message}`, 'error');
            
            // 触发连接失败事件
            this.triggerConnectionEvent('failed', {
                walletType: walletType,
                error: error.message
            });
            
            throw error;
        }
    }

    // 连接Phantom钱包
    async connectPhantomWallet() {
        if (!window.solana || !window.solana.isPhantom) {
            throw new Error('请先安装Phantom钱包扩展程序');
        }

        try {
            // 检查是否已经连接
            if (window.solana.isConnected) {
                return window.solana;
            }

            // 请求连接
            const response = await window.solana.connect();
            
            // 验证连接结果
            if (!response.publicKey) {
                throw new Error('连接失败：未获取到公钥');
            }

            return window.solana;
        } catch (error) {
            if (error.code === 4001) {
                throw new Error('用户拒绝了连接请求');
            }
            throw new Error(`Phantom钱包连接失败: ${error.message}`);
        }
    }

    // 连接OKX钱包
    async connectOKXWallet() {
        if (!window.okxwallet) {
            throw new Error('请先安装OKX钱包扩展程序');
        }

        try {
            // 检查是否已经连接
            if (window.okxwallet.isConnected) {
                return window.okxwallet;
            }

            // 请求连接
            const response = await window.okxwallet.connect();
            
            // 验证连接结果
            if (!response.publicKey) {
                throw new Error('连接失败：未获取到公钥');
            }

            return window.okxwallet;
        } catch (error) {
            if (error.code === 4001) {
                throw new Error('用户拒绝了连接请求');
            }
            throw new Error(`OKX钱包连接失败: ${error.message}`);
        }
    }

    // 连接Coinbase钱包
    async connectCoinbaseWallet() {
        if (!window.coinbaseWalletSolana) {
            throw new Error('请先安装Coinbase钱包扩展程序');
        }

        try {
            // 检查是否已经连接
            if (window.coinbaseWalletSolana.isConnected) {
                return window.coinbaseWalletSolana;
            }

            // 请求连接
            const response = await window.coinbaseWalletSolana.connect();
            
            // 验证连接结果
            if (!response.publicKey) {
                throw new Error('连接失败：未获取到公钥');
            }

            return window.coinbaseWalletSolana;
        } catch (error) {
            if (error.code === 4001) {
                throw new Error('用户拒绝了连接请求');
            }
            throw new Error(`Coinbase钱包连接失败: ${error.message}`);
        }
    }

    // 断开钱包连接
    async disconnectWallet() {
        try {
            const previousWalletType = this.walletType;
            const previousAddress = this.getWalletAddress();
            
            if (this.currentWallet && this.currentWallet.disconnect) {
                await this.currentWallet.disconnect();
            }
            
            this.isConnected = false;
            this.currentWallet = null;
            this.publicKey = null;
            this.walletType = null;
            
            this.updateWalletStatus();
            this.addLog('🔌 钱包已断开连接', 'info');
            
            // 触发断开连接事件
            this.triggerConnectionEvent('disconnected', {
                walletType: previousWalletType,
                address: previousAddress
            });
        } catch (error) {
            this.addLog(`❌ 断开钱包连接失败: ${error.message}`, 'error');
            
            // 即使断开失败，也要重置状态
            this.isConnected = false;
            this.currentWallet = null;
            this.publicKey = null;
            this.walletType = null;
            this.updateWalletStatus();
        }
    }

    // 更新钱包状态显示
    updateWalletStatus() {
        const walletStatus = document.getElementById('walletStatus');
        if (walletStatus) {
            if (this.isConnected) {
                walletStatus.innerHTML = `
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span class="text-green-400 text-sm">已连接 ${this.getWalletDisplayName(this.walletType)}</span>
                        <button onclick="window.walletManager.disconnectWallet()" class="text-red-400 hover:text-red-300 text-xs">断开</button>
                    </div>
                    <div class="text-gray-400 text-xs mt-1">
                        ${this.publicKey ? this.publicKey.substring(0, 6) + '...' + this.publicKey.substring(this.publicKey.length - 4) : ''}
                    </div>
                `;
            } else {
                walletStatus.innerHTML = `
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span class="text-red-400 text-sm">未连接</span>
                    </div>
                `;
            }
        }
    }

    // 检查钱包连接状态
    checkWalletConnection() {
        try {
            // 检查Phantom钱包
            if (window.solana && window.solana.isPhantom && window.solana.isConnected) {
                this.isConnected = true;
                this.currentWallet = window.solana;
                this.walletType = 'phantom';
                this.publicKey = window.solana.publicKey ? window.solana.publicKey.toString() : null;
            }
            // 检查OKX钱包
            else if (window.okxwallet && window.okxwallet.isConnected) {
                this.isConnected = true;
                this.currentWallet = window.okxwallet;
                this.walletType = 'okx';
                this.publicKey = window.okxwallet.publicKey ? window.okxwallet.publicKey.toString() : null;
            }
            // 检查Coinbase钱包
            else if (window.coinbaseWalletSolana && window.coinbaseWalletSolana.isConnected) {
                this.isConnected = true;
                this.currentWallet = window.coinbaseWalletSolana;
                this.walletType = 'coinbase';
                this.publicKey = window.coinbaseWalletSolana.publicKey ? window.coinbaseWalletSolana.publicKey.toString() : null;
            }
            else {
                // 重置状态
                this.isConnected = false;
                this.currentWallet = null;
                this.publicKey = null;
                this.walletType = null;
            }

            this.updateWalletStatus();
        } catch (error) {
            console.error('检查钱包连接状态失败:', error);
            this.isConnected = false;
            this.currentWallet = null;
            this.publicKey = null;
            this.walletType = null;
            this.updateWalletStatus();
        }
    }

    // 获取钱包显示名称
    getWalletDisplayName(walletType) {
        const names = {
            'phantom': 'Phantom',
            'okx': 'OKX',
            'coinbase': 'Coinbase'
        };
        return names[walletType] || walletType;
    }

    // 添加日志
    addLog(message, type = 'info') {
        console.log(`[WalletManager] ${message}`);
        
        // 如果有日志容器，也添加到UI
        const logContainer = document.getElementById('adminLog');
        if (logContainer) {
            const timestamp = new Date().toLocaleTimeString('zh-CN');
            const colorClass = {
                'success': 'text-green-400',
                'error': 'text-red-400',
                'warning': 'text-yellow-400',
                'info': 'text-blue-400'
            }[type] || 'text-gray-300';

            const logEntry = document.createElement('div');
            logEntry.className = colorClass;
            logEntry.textContent = `[${timestamp}] ${message}`;
            
            logContainer.appendChild(logEntry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    // 获取标准化的钱包地址
    getWalletAddress() {
        if (!this.isConnected || !this.currentWallet) {
            return null;
        }

        try {
            const walletObj = this.currentWallet;
            
            // 根据钱包类型使用不同的地址获取方法
            let address = null;
            
            if (this.walletType === 'phantom') {
                address = walletObj.publicKey ? walletObj.publicKey.toString() : null;
            } else if (this.walletType === 'okx') {
                address = walletObj.publicKey ? walletObj.publicKey.toString() : null;
            } else if (this.walletType === 'coinbase') {
                address = walletObj.publicKey ? walletObj.publicKey.toString() : null;
            } else {
                // 通用方法
                address = walletObj.address || 
                         walletObj.publicKey || 
                         (walletObj.publicKey && walletObj.publicKey.toString()) ||
                         (walletObj.publicKey && walletObj.publicKey.toBase58 && walletObj.publicKey.toBase58()) ||
                         walletObj.toString() || 
                         '';
            }
            
            address = String(address).trim();
            
            // 验证地址格式（Solana地址格式）
            if (!address || address === 'undefined' || address === 'null' || address === '[object Object]') {
                return null;
            }
            
            // 简单的Solana地址格式验证
            const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
            if (!solanaAddressRegex.test(address)) {
                console.warn('钱包地址格式可能不正确:', address);
            }
            
            return address;
        } catch (error) {
            console.error('获取钱包地址失败:', error);
            return null;
        }
    }

    // 检查钱包是否已安装
    isWalletInstalled(walletType) {
        switch (walletType) {
            case 'phantom':
                return !!(window.solana && window.solana.isPhantom);
            case 'okx':
                return !!window.okxwallet;
            case 'coinbase':
                return !!window.coinbaseWalletSolana;
            default:
                return false;
        }
    }

    // 获取网络信息
    async getNetworkInfo() {
        if (!this.isConnected || !this.currentWallet) {
            throw new Error('钱包未连接');
        }

        try {
            // 获取当前网络
            const connection = this.currentWallet.connection;
            if (connection) {
                const clusterApiUrl = connection.rpcEndpoint;
                return {
                    network: clusterApiUrl.includes('devnet') ? 'devnet' : 
                             clusterApiUrl.includes('testnet') ? 'testnet' : 'mainnet',
                    rpcUrl: clusterApiUrl
                };
            }
            
            return { network: 'unknown', rpcUrl: null };
        } catch (error) {
            console.error('获取网络信息失败:', error);
            return { network: 'unknown', rpcUrl: null };
        }
    }

    // 触发连接事件
    triggerConnectionEvent(eventType, data) {
        const event = new CustomEvent('walletConnection', {
            detail: {
                type: eventType,
                data: data,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    // 签名消息
    async signMessage(message) {
        if (!this.isConnected || !this.currentWallet) {
            throw new Error('钱包未连接');
        }

        try {
            const encodedMessage = new TextEncoder().encode(message);
            
            // 根据钱包类型使用不同的签名方法
            let signedMessage;
            
            if (this.walletType === 'phantom') {
                signedMessage = await this.currentWallet.signMessage(encodedMessage, 'utf8');
            } else if (this.walletType === 'okx') {
                signedMessage = await this.currentWallet.signMessage(encodedMessage, 'utf8');
            } else if (this.walletType === 'coinbase') {
                signedMessage = await this.currentWallet.signMessage(encodedMessage, 'utf8');
            } else {
                throw new Error('不支持的钱包类型');
            }
            
            return signedMessage;
        } catch (error) {
            if (error.code === 4001) {
                throw new Error('用户拒绝了签名请求');
            }
            throw new Error(`签名失败: ${error.message}`);
        }
    }

    // 发送交易
    async sendTransaction(transaction) {
        if (!this.isConnected || !this.currentWallet) {
            throw new Error('钱包未连接');
        }

        try {
            let signature;
            
            // 根据钱包类型使用不同的交易发送方法
            if (this.walletType === 'phantom') {
                signature = await this.currentWallet.sendTransaction(transaction);
            } else if (this.walletType === 'okx') {
                signature = await this.currentWallet.sendTransaction(transaction);
            } else if (this.walletType === 'coinbase') {
                signature = await this.currentWallet.sendTransaction(transaction);
            } else {
                throw new Error('不支持的钱包类型');
            }
            
            return signature;
        } catch (error) {
            if (error.code === 4001) {
                throw new Error('用户拒绝了交易请求');
            }
            throw new Error(`交易发送失败: ${error.message}`);
        }
    }
}

// 导出钱包管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletManager;
} else {
    window.WalletManager = WalletManager;
    
    // 自动初始化钱包管理器
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.walletManager) {
            window.walletManager = new WalletManager();
            window.walletManager.init();
        }
    });
    
    // 如果DOM已经加载完成，立即初始化
    if (document.readyState === 'loading') {
        // DOM还在加载中，等待DOMContentLoaded事件
    } else {
        // DOM已经加载完成，立即初始化
        if (!window.walletManager) {
            window.walletManager = new WalletManager();
            window.walletManager.init();
        }
    }
} 

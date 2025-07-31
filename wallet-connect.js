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
            let wallet = null;
            
            switch (walletType) {
                case 'phantom':
                    wallet = this.connectPhantomWallet();
                    break;
                case 'okx':
                    wallet = this.connectOKXWallet();
                    break;
                case 'coinbase':
                    wallet = this.connectCoinbaseWallet();
                    break;
                default:
                    throw new Error('不支持的钱包类型');
            }

            if (wallet) {
                this.currentWallet = wallet;
                this.walletType = walletType;
                this.isConnected = true;
                this.publicKey = wallet.publicKey.toString();
                
                this.updateWalletStatus();
                this.addLog(`✅ 成功连接${this.getWalletDisplayName(walletType)}钱包`, 'success');
            }
        } catch (error) {
            this.addLog(`❌ 连接${this.getWalletDisplayName(walletType)}失败: ${error.message}`, 'error');
        }
    }

    // 连接Phantom钱包
    async connectPhantomWallet() {
        if (!window.solana || !window.solana.isPhantom) {
            throw new Error('请先安装Phantom钱包扩展程序');
        }

        const response = await window.solana.connect();
        return response;
    }

    // 连接OKX钱包
    async connectOKXWallet() {
        if (!window.okxwallet) {
            throw new Error('请先安装OKX钱包扩展程序');
        }

        const response = await window.okxwallet.connect();
        return response;
    }

    // 连接Coinbase钱包
    async connectCoinbaseWallet() {
        if (!window.coinbaseWalletSolana) {
            throw new Error('请先安装Coinbase钱包扩展程序');
        }

        const response = await window.coinbaseWalletSolana.connect();
        return response;
    }

    // 断开钱包连接
    async disconnectWallet() {
        try {
            if (this.currentWallet && this.currentWallet.disconnect) {
                await this.currentWallet.disconnect();
            }
            
            this.isConnected = false;
            this.currentWallet = null;
            this.publicKey = null;
            this.walletType = null;
            
            this.updateWalletStatus();
            this.addLog('🔌 钱包已断开连接', 'info');
        } catch (error) {
            this.addLog(`❌ 断开钱包连接失败: ${error.message}`, 'error');
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
        // 检查Phantom钱包
        if (window.solana && window.solana.isPhantom && window.solana.isConnected) {
            this.isConnected = true;
            this.currentWallet = window.solana;
            this.walletType = 'phantom';
            this.publicKey = window.solana.publicKey.toString();
        }
        // 检查OKX钱包
        else if (window.okxwallet && window.okxwallet.isConnected) {
            this.isConnected = true;
            this.currentWallet = window.okxwallet;
            this.walletType = 'okx';
            this.publicKey = window.okxwallet.publicKey.toString();
        }
        // 检查Coinbase钱包
        else if (window.coinbaseWalletSolana && window.coinbaseWalletSolana.isConnected) {
            this.isConnected = true;
            this.currentWallet = window.coinbaseWalletSolana;
            this.walletType = 'coinbase';
            this.publicKey = window.coinbaseWalletSolana.publicKey.toString();
        }

        this.updateWalletStatus();
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

    // 签名消息
    async signMessage(message) {
        if (!this.isConnected || !this.currentWallet) {
            throw new Error('钱包未连接');
        }

        try {
            const encodedMessage = new TextEncoder().encode(message);
            const signedMessage = await this.currentWallet.signMessage(encodedMessage, 'utf8');
            return signedMessage;
        } catch (error) {
            throw new Error(`签名失败: ${error.message}`);
        }
    }

    // 发送交易
    async sendTransaction(transaction) {
        if (!this.isConnected || !this.currentWallet) {
            throw new Error('钱包未连接');
        }

        try {
            const signature = await this.currentWallet.sendTransaction(transaction);
            return signature;
        } catch (error) {
            throw new Error(`交易发送失败: ${error.message}`);
        }
    }
}

// 导出钱包管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletManager;
} else {
    window.WalletManager = WalletManager;
} 
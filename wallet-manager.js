// Wallet Manager - Responsible for wallet connection management
class WalletManager {
    constructor() {
        this.isConnected = false;
        this.currentWallet = null;
        this.walletAddress = null;
        
        this.init();
    }
    
    init() {
        console.log('Wallet manager initialization completed');
        this.checkWalletConnection();
    }
    
    // 检查钱包连接状态
    async checkWalletConnection() {
        try {
            // 检查是否有已连接的钱包
            if (window.solana && window.solana.isPhantom) {
                const connected = await window.solana.isConnected;
                if (connected) {
                    this.connectWallet('phantom');
                }
            }
        } catch (error) {
            console.log('钱包连接检查失败:', error);
        }
    }
    
    // 显示钱包选择模态框
    showWalletModal() {
        console.log('显示钱包弹窗');
        
        // 防止重复创建模态框
        if (document.getElementById('walletModal')) {
            console.log('弹窗已存在，直接返回');
            return;
        }
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.id = 'walletModal';
        modal.className = 'modal-overlay';
        
        // 添加调试样式
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background-color: rgba(0, 0, 0, 0.5) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 9999 !important;
        `;
        modal.innerHTML = `
            <div class="modal-content" style="
                background-color: #374151 !important;
                border: 4px solid #000 !important;
                border-radius: 12px !important;
                padding: 24px !important;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
                width: 90vw !important;
                max-width: 28rem !important;
                max-height: 90vh !important;
                overflow-y: auto !important;
                position: relative !important;
                z-index: 10000 !important;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="color: #FFDD00; font-weight: bold; font-size: 20px;">选择钱包</h3>
                    <button id="closeWalletModal" style="color: #9CA3AF; font-size: 24px; background: none; border: none; cursor: pointer;">&times;</button>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="connectOKX" class="btn-secondary" style="width: 100%; display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center;">
                            <span style="font-size: 24px; margin-right: 12px;">🔵</span>
                            <div style="text-align: left;">
                                <div style="font-weight: bold;">OKX Wallet</div>
                                <div style="font-size: 14px; opacity: 0.75;">OKX交易所钱包</div>
                            </div>
                        </div>
                        <span style="font-size: 18px;">→</span>
                    </button>
                    
                    <button id="connectPhantom" class="btn-secondary" style="width: 100%; display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center;">
                            <span style="font-size: 24px; margin-right: 12px;">👻</span>
                            <div style="text-align: left;">
                                <div style="font-weight: bold;">Phantom Wallet</div>
                                <div style="font-size: 14px; opacity: 0.75;">幽灵钱包</div>
                            </div>
                        </div>
                        <span style="font-size: 18px;">→</span>
                    </button>
                    
                    <button id="connectCoinbase" class="btn-secondary" style="width: 100%; display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center;">
                            <span style="font-size: 24px; margin-right: 12px;">🟡</span>
                            <div style="text-align: left;">
                                <div style="font-weight: bold;">Coinbase Wallet</div>
                                <div style="font-size: 14px; opacity: 0.75;">Coinbase钱包</div>
                            </div>
                        </div>
                        <span style="font-size: 18px;">→</span>
                    </button>
                </div>
                
                <div style="margin-top: 16px; text-align: center;">
                    <p style="color: #9CA3AF; font-size: 14px;">
                        请确保已安装相应的钱包扩展
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加事件监听器
        this.setupWalletModalListeners();
    }
    
    // 设置钱包模态框事件监听器
    setupWalletModalListeners() {
        // 关闭按钮
        const closeBtn = document.getElementById('closeWalletModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideWalletModal();
            });
        }
        
        // OKX钱包连接
        const okxBtn = document.getElementById('connectOKX');
        if (okxBtn) {
            okxBtn.addEventListener('click', () => {
                this.connectWallet('okx');
            });
        }
        
        // Phantom钱包连接
        const phantomBtn = document.getElementById('connectPhantom');
        if (phantomBtn) {
            phantomBtn.addEventListener('click', () => {
                this.connectWallet('phantom');
            });
        }
        
        // Coinbase钱包连接
        const coinbaseBtn = document.getElementById('connectCoinbase');
        if (coinbaseBtn) {
            coinbaseBtn.addEventListener('click', () => {
                this.connectWallet('coinbase');
            });
        }
        
        // 点击模态框外部关闭
        const modal = document.getElementById('walletModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideWalletModal();
                }
            });
        }
    }
    
    // 隐藏钱包选择模态框
    hideWalletModal() {
        const modal = document.getElementById('walletModal');
        if (modal) {
            modal.remove();
        }
    }
    
    // 连接钱包
    async connectWallet(walletType) {
        try {
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
            
            if (wallet) {
                this.currentWallet = wallet;
                this.walletAddress = wallet.address;
                this.isConnected = true;
                
                // 更新UI
                if (window.uiManager) {
                    window.uiManager.updateWalletStatus(true, this.walletAddress);
                }
                
                // 隐藏模态框
                this.hideWalletModal();
                
                console.log('钱包连接成功:', this.walletAddress);
                return true;
            }
            
        } catch (error) {
            console.error('钱包连接失败:', error);
            alert(`钱包连接失败: ${error.message}`);
            return false;
        }
    }
    
    // 连接Phantom钱包
    async connectPhantomWallet() {
        if (!window.solana || !window.solana.isPhantom) {
            throw new Error('请先安装Phantom钱包扩展');
        }
        
        try {
            const response = await window.solana.connect();
            return {
                type: 'phantom',
                address: response.publicKey.toString(),
                publicKey: response.publicKey
            };
        } catch (error) {
            throw new Error('Phantom钱包连接失败: ' + error.message);
        }
    }
    
    // 连接OKX钱包
    async connectOKXWallet() {
        if (!window.okxwallet) {
            throw new Error('请先安装OKX钱包扩展');
        }
        
        try {
            const response = await window.okxwallet.connect();
            return {
                type: 'okx',
                address: response.publicKey.toString(),
                publicKey: response.publicKey
            };
        } catch (error) {
            throw new Error('OKX钱包连接失败: ' + error.message);
        }
    }
    
    // 连接Coinbase钱包
    async connectCoinbaseWallet() {
        if (!window.coinbaseWalletSolana) {
            throw new Error('请先安装Coinbase钱包扩展');
        }
        
        try {
            const response = await window.coinbaseWalletSolana.connect();
            return {
                type: 'coinbase',
                address: response.publicKey.toString(),
                publicKey: response.publicKey
            };
        } catch (error) {
            throw new Error('Coinbase钱包连接失败: ' + error.message);
        }
    }
    
    // 断开钱包连接
    async disconnectWallet() {
        try {
            if (this.currentWallet) {
                switch (this.currentWallet.type) {
                    case 'phantom':
                        if (window.solana) {
                            await window.solana.disconnect();
                        }
                        break;
                    case 'okx':
                        if (window.okxwallet) {
                            await window.okxwallet.disconnect();
                        }
                        break;
                    case 'coinbase':
                        if (window.coinbaseWalletSolana) {
                            await window.coinbaseWalletSolana.disconnect();
                        }
                        break;
                }
            }
            
            this.currentWallet = null;
            this.walletAddress = null;
            this.isConnected = false;
            
            // 更新UI
            if (window.uiManager) {
                window.uiManager.updateWalletStatus(false);
            }
            
            console.log('钱包已断开连接');
            
        } catch (error) {
            console.error('断开钱包连接失败:', error);
        }
    }
    
    // 获取钱包地址
    getWalletAddress() {
        return this.walletAddress;
    }
    
    // 获取钱包类型
    getWalletType() {
        return this.currentWallet ? this.currentWallet.type : null;
    }
    
    // 检查钱包是否已连接
    isWalletConnected() {
        return this.isConnected && this.walletAddress;
    }
    
    // 签名消息
    async signMessage(message) {
        if (!this.isConnected || !this.currentWallet) {
            throw new Error('钱包未连接');
        }
        
        try {
            let signature = null;
            
            switch (this.currentWallet.type) {
                case 'phantom':
                    signature = await window.solana.signMessage(new TextEncoder().encode(message));
                    break;
                case 'okx':
                    signature = await window.okxwallet.signMessage(new TextEncoder().encode(message));
                    break;
                case 'coinbase':
                    signature = await window.coinbaseWalletSolana.signMessage(new TextEncoder().encode(message));
                    break;
                default:
                    throw new Error('不支持的钱包类型');
            }
            
            return signature;
            
        } catch (error) {
            throw new Error('消息签名失败: ' + error.message);
        }
    }
    
    // 发送交易
    async sendTransaction(transaction) {
        if (!this.isConnected || !this.currentWallet) {
            throw new Error('钱包未连接');
        }
        
        try {
            let signature = null;
            
            switch (this.currentWallet.type) {
                case 'phantom':
                    signature = await window.solana.sendTransaction(transaction);
                    break;
                case 'okx':
                    signature = await window.okxwallet.sendTransaction(transaction);
                    break;
                case 'coinbase':
                    signature = await window.coinbaseWalletSolana.sendTransaction(transaction);
                    break;
                default:
                    throw new Error('不支持的钱包类型');
            }
            
            return signature;
            
        } catch (error) {
            throw new Error('交易发送失败: ' + error.message);
        }
    }
    
    // 监听钱包状态变化
    setupWalletListeners() {
        // Phantom钱包监听器
        if (window.solana) {
            window.solana.on('connect', () => {
                console.log('Phantom钱包已连接');
            });
            
            window.solana.on('disconnect', () => {
                console.log('Phantom钱包已断开');
                this.disconnectWallet();
            });
            
            window.solana.on('accountChanged', (publicKey) => {
                console.log('Phantom钱包账户已更改:', publicKey.toString());
                this.walletAddress = publicKey.toString();
                if (window.uiManager) {
                    window.uiManager.updateWalletStatus(true, this.walletAddress);
                }
            });
        }
        
        // OKX钱包监听器
        if (window.okxwallet) {
            window.okxwallet.on('connect', () => {
                console.log('OKX钱包已连接');
            });
            
            window.okxwallet.on('disconnect', () => {
                console.log('OKX钱包已断开');
                this.disconnectWallet();
            });
        }
        
        // Coinbase钱包监听器
        if (window.coinbaseWalletSolana) {
            window.coinbaseWalletSolana.on('connect', () => {
                console.log('Coinbase钱包已连接');
            });
            
            window.coinbaseWalletSolana.on('disconnect', () => {
                console.log('Coinbase钱包已断开');
                this.disconnectWallet();
            });
        }
    }
    
    // 清理资源
    destroy() {
        this.disconnectWallet();
    }
}

// 导出钱包管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletManager;
} else {
    window.WalletManager = WalletManager;
} 
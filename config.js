// Application Configuration
const CONFIG = {
    // Firebase Configuration
    firebase: {
        apiKey: "AIzaSyA5Z5ieEbAcfQX0kxGSn9ldGXhzvAwx_8M",
        authDomain: "chat-294cc.firebaseapp.com",
        databaseURL: "https://chat-294cc-default-rtdb.firebaseio.com",
        projectId: "chat-294cc",
        storageBucket: "chat-294cc.firebasestorage.app",
        messagingSenderId: "913615304269",
        appId: "1:913615304269:web:0274ffaccb8e6b678e4e04",
        measurementId: "G-SJR9NDW86B"
    },
    
    // Game Configuration
    game: {
        devHoldings: 3, // DEV holds 3% of tokens
        triggerThreshold: 100000, // Trigger threshold 100000 amount
        countdownIncrement: 60, // Add 60 seconds each time
        maxCountdown: 600, // Maximum 10 minutes
        lastBigBuyReward: 0.2, // Last large purchase reward 0.2%
        top20Reward: 0.5, // Top 20 share reward 0.5%
        top20RewardInterval: 1200, // 20 minutes = 1200 seconds
        holderRewardCountdown: 180, // Holder reward countdown: 3 minutes
    },
    
    // RPC Configuration
    rpcEndpoints: [
        'https://small-holy-forest.solana-mainnet.quiknode.pro/b59315ea187b3de1b3542c5c25d7f2d5b5410ff4/',
        'https://api.mainnet-beta.solana.com',
        'https://solana-api.projectserum.com'
    ],
    
    // LP Pool Addresses
    lpAddresses: [
        'WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh',
        // Can expand more pools in the future
    ],
    
    // UI Configuration
    ui: {
        maxSuccessAddresses: 5, // Maximum display 5 successful addresses
        maxTransactions: 100, // Maximum save 100 transaction records
        refreshInterval: 3000, // Transaction detection interval 3 seconds
        holdersRefreshInterval: 10, // Holders refresh interval 10 seconds
    },
    
    // Reward Configuration
    rewards: {
        top20RewardPoints: 3000, // Top 20 each reward points
        lastSuccessRewardPoints: 10000, // Last countdown reward points
        exchangeRate: 10, // 1 point = 10 tokens
    }
};

// Export Configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
} 
// Utility Functions Collection
class Utils {
    // Format number
    static formatNumber(amount, decimals = 9) {
        if (!amount) return '0';
        const num = parseFloat(amount) / Math.pow(10, decimals);
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        });
    }

    // Format time
    static formatTime(minutes, seconds) {
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Format address display
    static formatAddress(address, start = 6, end = 4) {
        if (!address) return 'N/A';
        return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
    }

    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Generate random ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Check if it's a valid address
    static isValidAddress(address) {
        return address && address.length >= 32 && address.length <= 44;
    }

    // Get current timestamp
    static getTimestamp() {
        return Date.now();
    }

    // Calculate time difference (milliseconds)
    static getTimeDifference(date1, date2) {
        return new Date(date1) - new Date(date2);
    }

    // Check if it's an LP address
    static isLpAddress(address) {
        if (!address) return false;
        return CONFIG.lpAddresses.includes(address);
    }

    // Deep clone object
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = Utils.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    // Array deduplication
    static uniqueArray(arr, key = null) {
        if (key) {
            const seen = new Set();
            return arr.filter(item => {
                const value = item[key];
                if (seen.has(value)) {
                    return false;
                }
                seen.add(value);
                return true;
            });
        }
        return [...new Set(arr)];
    }

    // Error handling
    static handleError(error, context = '') {
        console.error(`[${context}] Error:`, error);
        return {
            success: false,
            error: error.message || 'Unknown error',
            context
        };
    }

    // Success response
    static successResponse(data = null, message = 'Success') {
        return {
            success: true,
            data,
            message
        };
    }
}

// Export utility class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
} else {
    window.Utils = Utils;
} 
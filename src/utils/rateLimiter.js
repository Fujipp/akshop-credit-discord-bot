/**
 * Rate Limiter Utility
 * Prevents hitting Discord's rate limits for operations like channel rename
 * (Discord limits channel rename to 2 times per 10 minutes)
 */

class RateLimiter {
  constructor() {
    // Map of channelId -> array of timestamps
    this.timestamps = new Map();
  }

  /**
   * Check if an action can be executed for the given key
   * @param {string} key - Unique identifier (e.g., channelId)
   * @param {number} limit - Max number of actions allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {boolean} - Whether the action can be executed
   */
  canExecute(key, limit = 2, windowMs = 600000) {
    const now = Date.now();
    const times = this.timestamps.get(key) || [];
    
    // Filter out expired timestamps
    const validTimes = times.filter(t => now - t < windowMs);
    this.timestamps.set(key, validTimes);
    
    return validTimes.length < limit;
  }

  /**
   * Record an action execution
   * @param {string} key - Unique identifier
   */
  record(key) {
    const times = this.timestamps.get(key) || [];
    times.push(Date.now());
    this.timestamps.set(key, times);
  }

  /**
   * Execute action if within rate limit
   * @param {string} key - Unique identifier
   * @param {Function} fn - Async function to execute
   * @param {number} limit - Max actions per window
   * @param {number} windowMs - Time window in ms
   * @returns {Promise<{executed: boolean, result?: any}>}
   */
  async executeIfAllowed(key, fn, limit = 2, windowMs = 600000) {
    if (!this.canExecute(key, limit, windowMs)) {
      return { executed: false, reason: 'rate_limited' };
    }
    
    try {
      const result = await fn();
      this.record(key);
      return { executed: true, result };
    } catch (error) {
      return { executed: false, reason: 'error', error };
    }
  }

  /**
   * Get remaining time until next action is allowed
   * @param {string} key - Unique identifier
   * @param {number} limit - Max actions per window
   * @param {number} windowMs - Time window in ms
   * @returns {number} - Milliseconds until next action allowed (0 if allowed now)
   */
  getTimeUntilReset(key, limit = 2, windowMs = 600000) {
    const now = Date.now();
    const times = this.timestamps.get(key) || [];
    const validTimes = times.filter(t => now - t < windowMs);
    
    if (validTimes.length < limit) return 0;
    
    // Find the oldest timestamp that would need to expire
    const sortedTimes = validTimes.sort((a, b) => a - b);
    const oldestRelevant = sortedTimes[sortedTimes.length - limit];
    
    return Math.max(0, windowMs - (now - oldestRelevant));
  }

  /**
   * Clear all rate limit data for a key
   * @param {string} key - Unique identifier
   */
  clear(key) {
    this.timestamps.delete(key);
  }

  /**
   * Clear all rate limit data
   */
  clearAll() {
    this.timestamps.clear();
  }
}

// Singleton instance for channel rename rate limiting
const channelRenameRateLimiter = new RateLimiter();

module.exports = {
  RateLimiter,
  channelRenameRateLimiter
};

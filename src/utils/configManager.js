const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', '..', 'data', 'config.json');
const tempConfigPath = configPath + '.tmp';

class ConfigManager {
  constructor() {
    this.config = this.load();
    this.saveTimer = null;
    this.isDirty = false;
  }

  load() {
    try {
      if (!fs.existsSync(configPath)) {
        // Ensure data directory exists
        const dataDir = path.dirname(configPath);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        return {};
      }
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading config:', error);
      return {};
    }
  }

  /**
   * Atomic save - writes to temp file first, then renames
   * Prevents data corruption from interrupted writes
   */
  _persistToDisk() {
    try {
      const data = JSON.stringify(this.config, null, 2);
      // Write to temp file first
      fs.writeFileSync(tempConfigPath, data, 'utf8');
      // Atomic rename
      fs.renameSync(tempConfigPath, configPath);
      this.isDirty = false;
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      // Clean up temp file if it exists
      try {
        if (fs.existsSync(tempConfigPath)) {
          fs.unlinkSync(tempConfigPath);
        }
      } catch { }
      return false;
    }
  }

  /**
   * Schedule a save operation (debounced)
   * Batches multiple rapid changes into a single disk write
   */
  scheduleSave() {
    this.isDirty = true;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this._persistToDisk();
    }, 500);
  }

  /**
   * Force immediate save (for shutdown)
   */
  flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.isDirty) {
      return this._persistToDisk();
    }
    return true;
  }

  get(key) {
    if (!key) return this.config;
    return key.split('.').reduce((acc, cur) => (acc && acc[cur] !== undefined ? acc[cur] : undefined), this.config);
  }

  set(key, value) {
    const keys = key.split('.');
    let current = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    this.scheduleSave();
    return true;
  }

  /**
   * Delete a key from config
   */
  delete(key) {
    const keys = key.split('.');
    let current = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) return true;
      current = current[keys[i]];
    }
    delete current[keys[keys.length - 1]];
    this.scheduleSave();
    return true;
  }
}

module.exports = new ConfigManager();

/**
 * PasswordDB - 本地密码数据库
 * 
 * 功能：
 * 1. 使用SQLite存储成功破解的密码历史
 * 2. 密码使用AES-256加密存储
 * 3. 提取文件名模式用于LSTM学习
 * 4. 查询密码历史和统计信息
 * 
 * 使用方法：
 * const db = new PasswordDB();
 * await db.initialize();
 * await db.addPassword('password123', 'report_2024.zip');
 * const count = await db.getPasswordCount();
 */

import sqlite3 from 'sqlite3';
import { app } from 'electron';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

class PasswordDB {
    constructor() {
        // 数据库路径
        const dbDir = path.join(app.getPath('userData'), 'password-history');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        this.dbPath = path.join(dbDir, 'passwords.db');
        this.db = null;
        
        // 加密密钥（从机器ID派生）
        this.encryptionKey = this._deriveEncryptionKey();
    }

    /**
     * 初始化数据库
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('[PasswordDB] Failed to open database:', err);
                    reject(err);
                    return;
                }
                
                console.log('[PasswordDB] Database opened:', this.dbPath);
                this._createTables().then(resolve).catch(reject);
            });
        });
    }

    /**
     * 创建数据库表
     * @private
     */
    async _createTables() {
        return new Promise((resolve, reject) => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS password_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    password_hash TEXT NOT NULL UNIQUE,
                    encrypted_password TEXT NOT NULL,
                    file_pattern TEXT,
                    file_name TEXT,
                    created_at INTEGER NOT NULL,
                    success_count INTEGER DEFAULT 1,
                    last_used INTEGER NOT NULL
                )
            `, (err) => {
                if (err) {
                    console.error('[PasswordDB] Failed to create table:', err);
                    reject(err);
                    return;
                }
                
                // 创建索引
                this.db.run(`
                    CREATE INDEX IF NOT EXISTS idx_password_hash 
                    ON password_history(password_hash)
                `, (err) => {
                    if (err) {
                        console.error('[PasswordDB] Failed to create index:', err);
                        reject(err);
                        return;
                    }
                    
                    console.log('[PasswordDB] Tables created successfully');
                    resolve();
                });
            });
        });
    }

    /**
     * 添加密码到历史
     * @param {string} password - 密码明文
     * @param {string} fileName - 文件名
     * @returns {Promise<boolean>} 是否成功添加
     */
    async addPassword(password, fileName) {
        try {
            const passwordHash = this._hashPassword(password);
            const encryptedPassword = this._encryptPassword(password);
            const filePattern = this._extractFilePattern(fileName);
            const now = Date.now();

            // 检查密码是否已存在
            const existing = await this._getPasswordByHash(passwordHash);
            
            if (existing) {
                // 更新成功次数和最后使用时间
                await this._updatePasswordUsage(passwordHash);
                console.log('[PasswordDB] Password already exists, updated usage count');
                return true;
            }

            // 插入新密码
            return new Promise((resolve, reject) => {
                this.db.run(`
                    INSERT INTO password_history 
                    (password_hash, encrypted_password, file_pattern, file_name, created_at, last_used)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [passwordHash, encryptedPassword, filePattern, fileName, now, now], (err) => {
                    if (err) {
                        console.error('[PasswordDB] Failed to add password:', err);
                        reject(err);
                        return;
                    }
                    
                    console.log('[PasswordDB] Password added successfully');
                    resolve(true);
                });
            });
        } catch (error) {
            console.error('[PasswordDB] Error adding password:', error);
            return false;
        }
    }

    /**
     * 获取密码数量
     * @returns {Promise<number>} 密码数量
     */
    async getPasswordCount() {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT COUNT(*) as count FROM password_history', (err, row) => {
                if (err) {
                    console.error('[PasswordDB] Failed to get password count:', err);
                    reject(err);
                    return;
                }
                resolve(row.count);
            });
        });
    }

    /**
     * 获取最近的密码（用于LSTM训练）
     * @param {number} limit - 数量限制
     * @returns {Promise<Array>} 密码列表（解密后）
     */
    async getRecentPasswords(limit = 100) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT encrypted_password, file_pattern, file_name, created_at
                FROM password_history
                ORDER BY last_used DESC
                LIMIT ?
            `, [limit], (err, rows) => {
                if (err) {
                    console.error('[PasswordDB] Failed to get recent passwords:', err);
                    reject(err);
                    return;
                }
                
                // 解密密码
                const passwords = rows.map(row => ({
                    password: this._decryptPassword(row.encrypted_password),
                    filePattern: row.file_pattern,
                    fileName: row.file_name,
                    createdAt: row.created_at
                }));
                
                resolve(passwords);
            });
        });
    }

    /**
     * 根据文件模式获取密码
     * @param {string} filePattern - 文件模式
     * @param {number} limit - 数量限制
     * @returns {Promise<Array>} 密码列表
     */
    async getPasswordsByPattern(filePattern, limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT encrypted_password, success_count
                FROM password_history
                WHERE file_pattern = ?
                ORDER BY success_count DESC, last_used DESC
                LIMIT ?
            `, [filePattern, limit], (err, rows) => {
                if (err) {
                    console.error('[PasswordDB] Failed to get passwords by pattern:', err);
                    reject(err);
                    return;
                }
                
                const passwords = rows.map(row => ({
                    password: this._decryptPassword(row.encrypted_password),
                    successCount: row.success_count
                }));
                
                resolve(passwords);
            });
        });
    }

    /**
     * 获取统计信息
     * @returns {Promise<object>} 统计信息
     */
    async getStats() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    COUNT(*) as total_passwords,
                    COUNT(DISTINCT file_pattern) as unique_patterns,
                    SUM(success_count) as total_successes,
                    MAX(created_at) as last_added
                FROM password_history
            `, (err, rows) => {
                if (err) {
                    console.error('[PasswordDB] Failed to get stats:', err);
                    reject(err);
                    return;
                }
                
                resolve(rows[0]);
            });
        });
    }

    /**
     * 清除所有密码历史
     * @returns {Promise<boolean>} 是否成功
     */
    async clearAll() {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM password_history', (err) => {
                if (err) {
                    console.error('[PasswordDB] Failed to clear passwords:', err);
                    reject(err);
                    return;
                }
                
                console.log('[PasswordDB] All passwords cleared');
                resolve(true);
            });
        });
    }

    /**
     * 关闭数据库连接
     */
    async close() {
        if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('[PasswordDB] Failed to close database:', err);
                        reject(err);
                        return;
                    }
                    console.log('[PasswordDB] Database closed');
                    resolve();
                });
            });
        }
    }

    /**
     * 获取密码（通过哈希）
     * @private
     */
    async _getPasswordByHash(passwordHash) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM password_history WHERE password_hash = ?',
                [passwordHash],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(row);
                }
            );
        });
    }

    /**
     * 更新密码使用次数
     * @private
     */
    async _updatePasswordUsage(passwordHash) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE password_history 
                SET success_count = success_count + 1, last_used = ?
                WHERE password_hash = ?
            `, [Date.now(), passwordHash], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    /**
     * 哈希密码（SHA256）
     * @private
     */
    _hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    /**
     * 加密密码（AES-256-CBC）
     * @private
     */
    _encryptPassword(password) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
        
        let encrypted = cipher.update(password, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // 返回 IV + 加密数据
        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * 解密密码
     * @private
     */
    _decryptPassword(encryptedData) {
        try {
            const parts = encryptedData.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            
            const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('[PasswordDB] Failed to decrypt password:', error);
            return null;
        }
    }

    /**
     * 派生加密密钥（从机器ID）
     * @private
     */
    _deriveEncryptionKey() {
        // 使用机器特定信息生成密钥
        const machineId = app.getPath('userData');
        const hash = crypto.createHash('sha256').update(machineId).digest();
        return hash;
    }

    /**
     * 提取文件名模式
     * @private
     */
    _extractFilePattern(fileName) {
        if (!fileName) return 'unknown';
        
        // 移除扩展名
        const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
        
        // 替换数字为通配符
        let pattern = nameWithoutExt.replace(/\d+/g, '*');
        
        // 替换特殊字符为下划线
        pattern = pattern.replace(/[_\-\.]/g, '_');
        
        // 转换为小写
        pattern = pattern.toLowerCase();
        
        return pattern;
    }
}

export default PasswordDB;

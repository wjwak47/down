/**
 * SessionManager - 断点续传管理器
 * 
 * 功能：
 * 1. 创建和管理破解会话
 * 2. 保存会话状态到本地文件
 * 3. 恢复会话并继续破解
 * 4. 检测未完成的会话
 * 
 * 使用方法：
 * const manager = new SessionManager();
 * const session = manager.createSession(filePath, options);
 * manager.saveSession(session.id, state);
 * const restored = manager.loadSession(sessionId);
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import crypto from 'crypto';

class SessionManager {
    constructor() {
        // Session存储目录
        this.sessionDir = path.join(app.getPath('userData'), 'crack-sessions');
        
        // 确保目录存在
        if (!fs.existsSync(this.sessionDir)) {
            fs.mkdirSync(this.sessionDir, { recursive: true });
        }
    }

    /**
     * 创建新会话
     * @param {string} filePath - 压缩文件路径
     * @param {object} options - 破解选项
     * @returns {object} 会话对象
     */
    createSession(filePath, options = {}) {
        const sessionId = this._generateSessionId(filePath);
        const session = {
            id: sessionId,
            filePath,
            fileName: path.basename(filePath),
            currentPhase: 0,
            testedPasswords: 0,
            totalPasswords: 0,
            startTime: Date.now(),
            lastUpdateTime: Date.now(),
            status: 'running',
            options: {
                mode: options.mode || 'dictionary',
                charset: options.charset || 'abcdefghijklmnopqrstuvwxyz0123456789',
                minLength: options.minLength || 1,
                maxLength: options.maxLength || 8,
                dictionaryPath: options.dictionaryPath || null,
                ...options
            },
            progress: {
                phases: [],
                currentPhaseProgress: 0
            }
        };

        // 立即保存新会话
        this.saveSession(sessionId, session);

        return session;
    }

    /**
     * 保存会话状态
     * @param {string} sessionId - 会话ID
     * @param {object} state - 会话状态
     */
    saveSession(sessionId, state) {
        try {
            const sessionFile = this._getSessionFilePath(sessionId);
            const sessionData = {
                ...state,
                lastUpdateTime: Date.now()
            };

            fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2), 'utf-8');
            console.log('[SessionManager] Session saved:', sessionId);
        } catch (error) {
            console.error('[SessionManager] Failed to save session:', error);
            throw error;
        }
    }

    /**
     * 加载会话
     * @param {string} sessionId - 会话ID
     * @returns {object|null} 会话对象，如果不存在返回null
     */
    loadSession(sessionId) {
        try {
            const sessionFile = this._getSessionFilePath(sessionId);
            
            if (!fs.existsSync(sessionFile)) {
                console.log('[SessionManager] Session not found:', sessionId);
                return null;
            }

            const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
            console.log('[SessionManager] Session loaded:', sessionId);
            
            return sessionData;
        } catch (error) {
            console.error('[SessionManager] Failed to load session:', error);
            return null;
        }
    }

    /**
     * 删除会话
     * @param {string} sessionId - 会话ID
     */
    deleteSession(sessionId) {
        try {
            const sessionFile = this._getSessionFilePath(sessionId);
            
            if (fs.existsSync(sessionFile)) {
                fs.unlinkSync(sessionFile);
                console.log('[SessionManager] Session deleted:', sessionId);
            }
        } catch (error) {
            console.error('[SessionManager] Failed to delete session:', error);
        }
    }

    /**
     * 列出所有未完成的会话
     * @returns {Array} 未完成会话列表
     */
    listPendingSessions() {
        try {
            const files = fs.readdirSync(this.sessionDir);
            const sessions = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const sessionFile = path.join(this.sessionDir, file);
                    try {
                        const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
                        
                        // 只返回未完成的会话
                        if (sessionData.status === 'running' || sessionData.status === 'paused') {
                            sessions.push({
                                id: sessionData.id,
                                fileName: sessionData.fileName,
                                filePath: sessionData.filePath,
                                progress: this._calculateProgress(sessionData),
                                lastUpdateTime: sessionData.lastUpdateTime,
                                status: sessionData.status
                            });
                        }
                    } catch (error) {
                        console.error('[SessionManager] Failed to read session file:', file, error);
                    }
                }
            }

            // 按最后更新时间排序
            sessions.sort((a, b) => b.lastUpdateTime - a.lastUpdateTime);

            return sessions;
        } catch (error) {
            console.error('[SessionManager] Failed to list sessions:', error);
            return [];
        }
    }

    /**
     * 更新会话状态
     * @param {string} sessionId - 会话ID
     * @param {object} updates - 要更新的字段
     */
    updateSession(sessionId, updates) {
        const session = this.loadSession(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        const updatedSession = {
            ...session,
            ...updates,
            lastUpdateTime: Date.now()
        };

        this.saveSession(sessionId, updatedSession);
        return updatedSession;
    }

    /**
     * 标记会话为已完成
     * @param {string} sessionId - 会话ID
     * @param {boolean} success - 是否成功破解
     * @param {string} password - 破解的密码（如果成功）
     */
    completeSession(sessionId, success, password = null) {
        this.updateSession(sessionId, {
            status: success ? 'completed' : 'failed',
            endTime: Date.now(),
            foundPassword: password
        });
    }

    /**
     * 暂停会话
     * @param {string} sessionId - 会话ID
     */
    pauseSession(sessionId) {
        this.updateSession(sessionId, {
            status: 'paused'
        });
    }

    /**
     * 恢复会话
     * @param {string} sessionId - 会话ID
     */
    resumeSession(sessionId) {
        this.updateSession(sessionId, {
            status: 'running'
        });
    }

    /**
     * 检查文件是否有未完成的会话
     * @param {string} filePath - 文件路径
     * @returns {object|null} 未完成的会话，如果没有返回null
     */
    findPendingSessionForFile(filePath) {
        const sessionId = this._generateSessionId(filePath);
        const session = this.loadSession(sessionId);

        if (session && (session.status === 'running' || session.status === 'paused')) {
            return session;
        }

        return null;
    }

    /**
     * 清理旧会话（超过30天的已完成会话）
     */
    cleanupOldSessions() {
        try {
            const files = fs.readdirSync(this.sessionDir);
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            let cleaned = 0;

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const sessionFile = path.join(this.sessionDir, file);
                    try {
                        const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
                        
                        // 删除超过30天的已完成或失败会话
                        if ((sessionData.status === 'completed' || sessionData.status === 'failed') &&
                            sessionData.lastUpdateTime < thirtyDaysAgo) {
                            fs.unlinkSync(sessionFile);
                            cleaned++;
                        }
                    } catch (error) {
                        console.error('[SessionManager] Failed to process session file:', file, error);
                    }
                }
            }

            if (cleaned > 0) {
                console.log(`[SessionManager] Cleaned up ${cleaned} old sessions`);
            }
        } catch (error) {
            console.error('[SessionManager] Failed to cleanup sessions:', error);
        }
    }

    /**
     * 生成会话ID（基于文件路径的哈希）
     * @private
     */
    _generateSessionId(filePath) {
        return crypto.createHash('md5').update(filePath).digest('hex');
    }

    /**
     * 获取会话文件路径
     * @private
     */
    _getSessionFilePath(sessionId) {
        return path.join(this.sessionDir, `${sessionId}.json`);
    }

    /**
     * 计算会话进度
     * @private
     */
    _calculateProgress(session) {
        if (session.totalPasswords === 0) {
            return 0;
        }
        return Math.round((session.testedPasswords / session.totalPasswords) * 100);
    }
}

export default SessionManager;

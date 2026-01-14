/**
 * BilibiliCookieDialog Component
 * Allows users to input/import Bilibili cookies for higher quality access
 * 
 * Requirements: 9.3
 */

import { useState, useEffect } from 'react';

const BILIBILI_COOKIE_KEY = 'bilibili_cookie';

function BilibiliCookieDialog({ isOpen, onClose, onSave }) {
    const [cookieText, setCookieText] = useState('');
    const [savedCookie, setSavedCookie] = useState(null);
    const [showHelp, setShowHelp] = useState(false);

    // Load saved cookie on mount
    useEffect(() => {
        const saved = localStorage.getItem(BILIBILI_COOKIE_KEY);
        if (saved) {
            setSavedCookie(saved);
            setCookieText(saved);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (cookieText.trim()) {
            localStorage.setItem(BILIBILI_COOKIE_KEY, cookieText.trim());
            setSavedCookie(cookieText.trim());
            onSave?.(cookieText.trim());
        }
        onClose();
    };

    const handleClear = () => {
        localStorage.removeItem(BILIBILI_COOKIE_KEY);
        setSavedCookie(null);
        setCookieText('');
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setCookieText(text);
        } catch (err) {
            console.error('Failed to read clipboard:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#FB7299]/10 flex items-center justify-center">
                                <svg className="w-6 h-6 text-[#FB7299]" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.659.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906l-1.174 1.12zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z"/>
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                                    Bilibili Cookie
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    用于下载高清视频
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-4">
                    {/* Status */}
                    {savedCookie && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-green-700 dark:text-green-400">
                                Cookie 已保存，可下载高清视频
                            </span>
                        </div>
                    )}

                    {/* Help Toggle */}
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="flex items-center gap-2 text-sm text-[#2196F3] hover:underline"
                    >
                        <svg className={`w-4 h-4 transition-transform ${showHelp ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                        如何获取 Cookie？
                    </button>

                    {/* Help Content */}
                    {showHelp && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm text-slate-600 dark:text-slate-400 space-y-2">
                            <p className="font-medium text-slate-700 dark:text-slate-300">获取步骤：</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>在浏览器中登录 bilibili.com</li>
                                <li>按 F12 打开开发者工具</li>
                                <li>切换到 "Network" (网络) 标签</li>
                                <li>刷新页面，点击任意请求</li>
                                <li>在 "Headers" 中找到 "Cookie" 字段</li>
                                <li>复制整个 Cookie 值粘贴到下方</li>
                            </ol>
                            <p className="text-xs text-slate-500 mt-2">
                                提示：Cookie 包含登录信息，请勿分享给他人
                            </p>
                        </div>
                    )}

                    {/* Cookie Input */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Cookie 内容
                            </label>
                            <button
                                onClick={handlePaste}
                                className="text-xs text-[#2196F3] hover:underline flex items-center gap-1"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                粘贴
                            </button>
                        </div>
                        <textarea
                            value={cookieText}
                            onChange={(e) => setCookieText(e.target.value)}
                            placeholder="粘贴 Bilibili Cookie 内容..."
                            className="w-full h-32 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2196F3]/50 focus:border-[#2196F3] resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                        {savedCookie ? (
                            <button
                                onClick={handleClear}
                                className="text-sm text-red-500 hover:text-red-600 transition-colors"
                            >
                                清除 Cookie
                            </button>
                        ) : (
                            <span></span>
                        )}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!cookieText.trim()}
                                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#FB7299] to-[#FF9CAD] hover:from-[#E85A7F] hover:to-[#FB7299] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Get saved Bilibili cookie
 * @returns {string|null} Saved cookie or null
 */
export function getBilibiliCookie() {
    return localStorage.getItem(BILIBILI_COOKIE_KEY);
}

/**
 * Check if Bilibili cookie is saved
 * @returns {boolean} True if cookie is saved
 */
export function hasBilibiliCookie() {
    return !!localStorage.getItem(BILIBILI_COOKIE_KEY);
}

export default BilibiliCookieDialog;

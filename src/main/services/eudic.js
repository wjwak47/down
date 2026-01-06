const { net, shell } = require('electron');

class EudicService {
    constructor() {
        this.baseUrl = 'https://my.eudic.net';
    }

    async getChannels(cookie) {
        return new Promise((resolve, reject) => {
            const request = net.request({
                method: 'GET',
                url: `${this.baseUrl}/Ting/GetPrivateChannels?withDefault=true&subscribed=false`,
            });

            request.setHeader('Cookie', cookie);
            request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            request.on('response', (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        const channelList = parsed.channelList || parsed.ChannelList;
                        if (channelList) {
                            resolve(channelList.UploadedChannels || []);
                        } else {
                            reject(new Error('Invalid response structure'));
                        }
                    } catch (e) {
                        reject(new Error('Failed to parse response'));
                    }
                });
            });

            request.on('error', (error) => reject(error));
            request.end();
        });
    }

    async uploadAudio(cookie, filePath, channelId, customFileName = null) {
        const { BrowserWindow, clipboard } = require('electron');

        // 复制文件路径到剪贴板
        clipboard.writeText(filePath);

        // 打开上传页面
        const uploadWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        // 设置Cookie
        const cookies = cookie.split(';').map(c => c.trim());
        for (const cookieStr of cookies) {
            const [nameValue, ...rest] = cookieStr.split('=');
            if (nameValue && rest.length > 0) {
                uploadWindow.webContents.session.cookies.set({
                    url: this.baseUrl,
                    name: nameValue.trim(),
                    value: rest.join('=').trim(),
                    domain: '.eudic.net',
                    path: '/'
                }).catch(() => { });
            }
        }

        // 加载上传页面
        uploadWindow.loadURL(`${this.baseUrl}/Ting/uploadFile?channelid=${channelId}`);

        // 显示提示信息 (只显示一次)
        uploadWindow.webContents.once('did-finish-load', () => {
            const cleanPath = filePath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const cleanName = customFileName ? customFileName.replace(/'/g, "\\'") : '';

            const injectionCode = `
                (function() {
                    // Create overlay
                    const overlay = document.createElement('div');
                    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(2px);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;';
                    
                    // Create modal
                    const modal = document.createElement('div');
                    modal.style.cssText = 'background:#ffffff;border-radius:12px;padding:32px;width:460px;box-shadow:0 10px 40px rgba(0,0,0,0.15);color:#333;text-align:center;animation:popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);position:relative;';
                    
                    // Add animation style
                    const style = document.createElement('style');
                    style.textContent = '@keyframes popIn { from { opacity:0; transform:scale(0.95) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }';
                    document.head.appendChild(style);

                    // Icon (Blue Check)
                    const icon = document.createElement('div');
                    icon.innerHTML = '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#1890ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
                    icon.style.marginBottom = '20px';
                    
                    // Title
                    const title = document.createElement('h2');
                    title.textContent = 'Ready to Upload';
                    title.style.cssText = 'margin:0 0 12px 0;font-size:22px;font-weight:600;color:#1f2937;';
                    
                    // Message
                    const msg = document.createElement('p');
                    msg.innerHTML = 'File path copied to clipboard.<br>Click the upload area and paste (Ctrl+V).';
                    msg.style.cssText = 'margin:0 0 24px 0;font-size:15px;color:#6b7280;line-height:1.6;';
                    
                    // Path Box
                    const pathBox = document.createElement('div');
                    pathBox.textContent = '${cleanPath}';
                    pathBox.style.cssText = 'background:#f3f4f6;padding:12px 16px;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;color:#4b5563;margin-bottom:28px;word-break:break-all;border:1px solid #e5e7eb;text-align:left;';

                    // Button
                    const btn = document.createElement('button');
                    btn.textContent = 'OK, I Got It';
                    btn.style.cssText = 'background:#1890ff;border:none;color:white;padding:12px 36px;border-radius:6px;font-size:15px;font-weight:500;cursor:pointer;transition:all 0.2s;outline:none;box-shadow:0 2px 8px rgba(24, 144, 255, 0.3);';
                    
                    btn.onmouseover = () => { btn.style.background = '#40a9ff'; btn.style.transform = 'translateY(-1px)'; };
                    btn.onmouseout = () => { btn.style.background = '#1890ff'; btn.style.transform = 'translateY(0)'; };
                    btn.onclick = () => {
                        overlay.style.opacity = '0';
                        setTimeout(() => document.body.removeChild(overlay), 200);
                    };

                    // Assemble
                    modal.appendChild(icon);
                    modal.appendChild(title);
                    modal.appendChild(msg);
                    modal.appendChild(pathBox);
                    modal.appendChild(btn);
                    overlay.appendChild(modal);
                    document.body.appendChild(overlay);
                })();
            `;

            uploadWindow.webContents.executeJavaScript(injectionCode).catch(() => { });
        });

        return Promise.resolve({ message: '已打开上传页面' });
    }

    openUploadsPage() {
        shell.openExternal(`${this.baseUrl}/ting/index`);
    }

    async fetchCookieFromLoginWindow() {
        const { BrowserWindow, session } = require('electron');

        return new Promise((resolve, reject) => {
            // Create a temporary partition for a clean session (no existing cookies)
            const partitionName = `eudic-login-${Date.now()}`;
            const tempSession = session.fromPartition(partitionName, { cache: false });

            // Clear any cookies that might exist in the temp session
            tempSession.clearStorageData({ storages: ['cookies'] }).catch(() => { });

            const loginWindow = new BrowserWindow({
                width: 800,
                height: 600,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    partition: partitionName  // Use the clean partition
                },
                autoHideMenuBar: true,
                title: '登录欧路听力'
            });

            const filter = { urls: ['https://my.eudic.net/*'] };
            let found = false;
            let isClosing = false;
            let initialLoadComplete = false;

            const cleanup = () => {
                try {
                    tempSession.webRequest.onBeforeSendHeaders(filter, null);
                } catch (e) {
                    // Ignore cleanup errors
                }
            };

            // Wait for initial page load before starting to monitor cookies
            loginWindow.webContents.once('did-finish-load', () => {
                // Small delay to ensure page is fully rendered
                setTimeout(() => {
                    initialLoadComplete = true;
                    console.log('[Eudic] Login page loaded, waiting for user to log in...');
                }, 500);
            });

            tempSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
                // Only check for cookies after the initial page has loaded
                if (!found && !isClosing && initialLoadComplete &&
                    details.requestHeaders['Cookie'] && details.url.includes('my.eudic.net')) {
                    const cookie = details.requestHeaders['Cookie'];
                    if (cookie.includes('EudicWeb')) {
                        found = true;
                        isClosing = true;
                        console.log('[Eudic] Cookie captured successfully!');

                        // Delay closing the window to prevent crash
                        setTimeout(() => {
                            cleanup();
                            resolve(cookie);
                            if (!loginWindow.isDestroyed()) {
                                loginWindow.close();
                            }
                        }, 800);
                    }
                }
                callback({ requestHeaders: details.requestHeaders });
            });

            loginWindow.loadURL('https://my.eudic.net/ting/index');

            loginWindow.on('closed', () => {
                cleanup();
                if (!found) reject(new Error('未获取到Cookie - 请登录后重试'));
            });
        });
    }
}

export default new EudicService();

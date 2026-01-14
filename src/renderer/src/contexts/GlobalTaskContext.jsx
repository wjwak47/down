import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';

// Load initial state from localStorage
function getInitialState() {
  const baseState = {
    // 下载任务 Map<id, DownloadTask>
    downloads: {},
    // 密码破解任务 Map<id, CrackJob>
    crackJobs: {},
    // 下载历史
    history: [],
    // 用户设置
    settings: {
      downloadPath: '',
      maxConcurrent: 3,
      autoRetry: true,
      retryCount: 3,
      speedLimit: 0,
      openFolderAfterDownload: false,
      showNotifications: true,
      clipboardMonitoring: false,
      preferredVideoQuality: '1080p',
      preferredAudioQuality: '320kbps',
      preferredVideoFormat: 'mp4',
      preferredAudioFormat: 'mp3',
      subtitleLanguages: ['zh', 'en'],
      embedSubtitles: false,
    },
    // 通知队列
    notifications: [],
  };

  // Try to load from localStorage
  try {
    const savedSettings = localStorage.getItem('downloadSettings');
    if (savedSettings) {
      baseState.settings = { ...baseState.settings, ...JSON.parse(savedSettings) };
    }
    
    const savedHistory = localStorage.getItem('downloadHistory');
    if (savedHistory) {
      const parsed = JSON.parse(savedHistory);
      console.log('[GlobalTaskContext] Initial load history:', parsed?.length || 0, 'items');
      baseState.history = parsed || [];
    }
  } catch (error) {
    console.error('Failed to load initial state from localStorage:', error);
  }

  return baseState;
}

// 初始状态
const initialState = getInitialState();

// Action Types
const ActionTypes = {
  // 下载任务
  ADD_DOWNLOAD: 'ADD_DOWNLOAD',
  UPDATE_DOWNLOAD: 'UPDATE_DOWNLOAD',
  REMOVE_DOWNLOAD: 'REMOVE_DOWNLOAD',
  CLEAR_COMPLETED_DOWNLOADS: 'CLEAR_COMPLETED_DOWNLOADS',
  
  // 密码破解任务
  ADD_CRACK_JOB: 'ADD_CRACK_JOB',
  UPDATE_CRACK_JOB: 'UPDATE_CRACK_JOB',
  REMOVE_CRACK_JOB: 'REMOVE_CRACK_JOB',
  
  // 历史记录
  ADD_TO_HISTORY: 'ADD_TO_HISTORY',
  REMOVE_FROM_HISTORY: 'REMOVE_FROM_HISTORY',
  CLEAR_HISTORY: 'CLEAR_HISTORY',
  LOAD_HISTORY: 'LOAD_HISTORY',
  
  // 设置
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  LOAD_SETTINGS: 'LOAD_SETTINGS',
  
  // 通知
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',
};

// Reducer
function taskReducer(state, action) {
  switch (action.type) {
    // 下载任务管理
    case ActionTypes.ADD_DOWNLOAD:
      return {
        ...state,
        downloads: {
          ...state.downloads,
          [action.payload.id]: {
            ...action.payload,
            createdAt: new Date().toISOString(),
            retryCount: 0,
          },
        },
      };
    
    case ActionTypes.UPDATE_DOWNLOAD:
      if (!state.downloads[action.payload.id]) return state;
      return {
        ...state,
        downloads: {
          ...state.downloads,
          [action.payload.id]: {
            ...state.downloads[action.payload.id],
            ...action.payload,
          },
        },
      };
    
    case ActionTypes.REMOVE_DOWNLOAD: {
      const { [action.payload]: removed, ...remainingDownloads } = state.downloads;
      return { ...state, downloads: remainingDownloads };
    }
    
    case ActionTypes.CLEAR_COMPLETED_DOWNLOADS: {
      const activeDownloads = {};
      Object.entries(state.downloads).forEach(([id, task]) => {
        if (task.status !== 'completed' && task.status !== 'failed') {
          activeDownloads[id] = task;
        }
      });
      return { ...state, downloads: activeDownloads };
    }
    
    // 密码破解任务管理
    case ActionTypes.ADD_CRACK_JOB:
      return {
        ...state,
        crackJobs: {
          ...state.crackJobs,
          [action.payload.id]: {
            ...action.payload,
            startedAt: new Date().toISOString(),
          },
        },
      };
    
    case ActionTypes.UPDATE_CRACK_JOB:
      if (!state.crackJobs[action.payload.id]) return state;
      return {
        ...state,
        crackJobs: {
          ...state.crackJobs,
          [action.payload.id]: {
            ...state.crackJobs[action.payload.id],
            ...action.payload,
          },
        },
      };
    
    case ActionTypes.REMOVE_CRACK_JOB: {
      const { [action.payload]: removedJob, ...remainingJobs } = state.crackJobs;
      return { ...state, crackJobs: remainingJobs };
    }
    
    // 历史记录管理
    case ActionTypes.ADD_TO_HISTORY:
      return {
        ...state,
        history: [
          {
            ...action.payload,
            downloadedAt: new Date().toISOString(),
          },
          ...state.history,
        ].slice(0, 100), // 最多保留100条
      };
    
    case ActionTypes.REMOVE_FROM_HISTORY:
      return {
        ...state,
        history: state.history.filter(item => item.id !== action.payload),
      };
    
    case ActionTypes.CLEAR_HISTORY:
      return { ...state, history: [] };
    
    case ActionTypes.LOAD_HISTORY:
      return { ...state, history: action.payload || [] };
    
    // 设置管理
    case ActionTypes.UPDATE_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    
    case ActionTypes.LOAD_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    
    // 通知管理
    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            ...action.payload,
            id: action.payload.id || Date.now().toString(),
            createdAt: new Date().toISOString(),
          },
        ],
      };
    
    case ActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    
    case ActionTypes.CLEAR_NOTIFICATIONS:
      return { ...state, notifications: [] };
    
    default:
      return state;
  }
}

// Context
const GlobalTaskContext = createContext(null);

// Provider Component
export function GlobalTaskProvider({ children }) {
  const [state, dispatch] = useReducer(taskReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Mark as initialized on mount (data already loaded in initialState)
  useEffect(() => {
    setIsInitialized(true);
  }, []);
  
  // 保存设置到 localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('downloadSettings', JSON.stringify(state.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [state.settings, isInitialized]);
  
  // 保存历史到 localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      console.log('[GlobalTaskContext] Saving history to localStorage:', state.history?.length || 0, 'items');
      localStorage.setItem('downloadHistory', JSON.stringify(state.history));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }, [state.history, isInitialized]);
  
  // Action Creators
  const actions = {
    // 下载任务
    addDownload: useCallback((task) => {
      dispatch({ type: ActionTypes.ADD_DOWNLOAD, payload: task });
    }, []),
    
    updateDownload: useCallback((id, updates) => {
      dispatch({ type: ActionTypes.UPDATE_DOWNLOAD, payload: { id, ...updates } });
    }, []),
    
    removeDownload: useCallback((id) => {
      dispatch({ type: ActionTypes.REMOVE_DOWNLOAD, payload: id });
    }, []),
    
    clearCompletedDownloads: useCallback(() => {
      dispatch({ type: ActionTypes.CLEAR_COMPLETED_DOWNLOADS });
    }, []),
    
    // 密码破解任务
    addCrackJob: useCallback((job) => {
      dispatch({ type: ActionTypes.ADD_CRACK_JOB, payload: job });
    }, []),
    
    updateCrackJob: useCallback((id, updates) => {
      dispatch({ type: ActionTypes.UPDATE_CRACK_JOB, payload: { id, ...updates } });
    }, []),
    
    removeCrackJob: useCallback((id) => {
      dispatch({ type: ActionTypes.REMOVE_CRACK_JOB, payload: id });
    }, []),
    
    // 历史记录
    addToHistory: useCallback((item) => {
      dispatch({ type: ActionTypes.ADD_TO_HISTORY, payload: item });
    }, []),
    
    removeFromHistory: useCallback((id) => {
      dispatch({ type: ActionTypes.REMOVE_FROM_HISTORY, payload: id });
    }, []),
    
    clearHistory: useCallback(() => {
      dispatch({ type: ActionTypes.CLEAR_HISTORY });
    }, []),
    
    // 设置
    updateSettings: useCallback((settings) => {
      dispatch({ type: ActionTypes.UPDATE_SETTINGS, payload: settings });
    }, []),
    
    // 通知
    addNotification: useCallback((notification) => {
      dispatch({ type: ActionTypes.ADD_NOTIFICATION, payload: notification });
    }, []),
    
    removeNotification: useCallback((id) => {
      dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id });
    }, []),
    
    clearNotifications: useCallback(() => {
      dispatch({ type: ActionTypes.CLEAR_NOTIFICATIONS });
    }, []),
  };
  
  // 计算派生状态
  const derivedState = {
    // 活跃下载数量（正在下载）
    activeDownloadCount: Object.values(state.downloads).filter(
      d => d.status === 'downloading'
    ).length,
    
    // 排队中的下载数量
    queuedDownloadCount: Object.values(state.downloads).filter(
      d => d.status === 'queued'
    ).length,
    
    // 活跃破解任务数量
    activeCrackJobCount: Object.values(state.crackJobs).filter(
      j => j.status === 'running'
    ).length,
    
    // 总活跃任务数量（包括排队）
    get totalActiveTaskCount() {
      return this.activeDownloadCount + this.queuedDownloadCount + this.activeCrackJobCount;
    },
    
    // 是否有活跃任务
    get hasActiveTasks() {
      return this.totalActiveTaskCount > 0;
    },
    
    // 获取排序后的下载队列（按创建时间 FIFO）
    get downloadQueue() {
      return Object.values(state.downloads)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    },
    
    // 获取可以开始的下一个排队任务
    get nextQueuedDownload() {
      const queued = Object.values(state.downloads)
        .filter(d => d.status === 'queued')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return queued[0] || null;
    },
    
    // 是否可以开始新下载（未达到并发限制）
    get canStartNewDownload() {
      return this.activeDownloadCount < state.settings.maxConcurrent;
    },
  };
  
  return (
    <GlobalTaskContext.Provider value={{ state, actions, derivedState }}>
      {children}
    </GlobalTaskContext.Provider>
  );
}

// Hook
export function useGlobalTasks() {
  const context = useContext(GlobalTaskContext);
  if (!context) {
    throw new Error('useGlobalTasks must be used within a GlobalTaskProvider');
  }
  return context;
}

// 导出 ActionTypes 供外部使用
export { ActionTypes };

export default GlobalTaskContext;

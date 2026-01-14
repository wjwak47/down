/**
 * Hook to monitor task state changes and trigger toast notifications
 * Connects GlobalTaskContext with Toast system
 */

import { useEffect, useRef } from 'react';
import { useGlobalTasks } from '../contexts/GlobalTaskContext';
import { useToast } from '../components/Toast';

export function useTaskNotifications(onNavigate) {
    const { state } = useGlobalTasks();
    const toast = useToast();
    
    // Track previous state to detect changes
    const prevDownloadsRef = useRef({});
    const prevCrackJobsRef = useRef({});
    
    // Monitor download task completions
    useEffect(() => {
        const prevDownloads = prevDownloadsRef.current;
        const currentDownloads = state.downloads;
        
        Object.entries(currentDownloads).forEach(([id, task]) => {
            const prevTask = prevDownloads[id];
            
            // Task just completed
            if (prevTask && prevTask.status !== 'completed' && task.status === 'completed') {
                toast.downloadComplete({
                    title: '下载完成',
                    message: task.title || '视频下载成功',
                    onClick: () => onNavigate?.('video-downloader'),
                    actionLabel: '打开文件夹',
                    onAction: () => {
                        if (task.filePath && window.electron?.shell) {
                            window.electron.shell.showItemInFolder(task.filePath);
                        }
                    }
                });
            }
            
            // Task just failed
            if (prevTask && prevTask.status !== 'failed' && task.status === 'failed') {
                toast.downloadFailed({
                    title: '下载失败',
                    message: task.error || task.title || '下载出错',
                    onClick: () => onNavigate?.('video-downloader'),
                    actionLabel: '查看详情',
                    onAction: () => onNavigate?.('video-downloader')
                });
            }
        });
        
        prevDownloadsRef.current = { ...currentDownloads };
    }, [state.downloads, toast, onNavigate]);

    // Monitor crack job completions
    useEffect(() => {
        const prevCrackJobs = prevCrackJobsRef.current;
        const currentCrackJobs = state.crackJobs;
        
        Object.entries(currentCrackJobs).forEach(([id, job]) => {
            const prevJob = prevCrackJobs[id];
            
            // Job just completed successfully
            if (prevJob && prevJob.status !== 'completed' && job.status === 'completed') {
                toast.crackComplete({
                    title: '密码破解成功',
                    message: job.password ? `密码: ${job.password}` : (job.fileName || '破解完成'),
                    onClick: () => onNavigate?.('file-compressor'),
                    actionLabel: '查看结果',
                    onAction: () => onNavigate?.('file-compressor'),
                    duration: 8000 // 密码显示时间长一些
                });
            }
            
            // Job just failed
            if (prevJob && prevJob.status !== 'failed' && job.status === 'failed') {
                toast.crackFailed({
                    title: '密码破解失败',
                    message: job.error || job.fileName || '未能找到密码',
                    onClick: () => onNavigate?.('file-compressor'),
                    actionLabel: '重试',
                    onAction: () => onNavigate?.('file-compressor')
                });
            }
        });
        
        prevCrackJobsRef.current = { ...currentCrackJobs };
    }, [state.crackJobs, toast, onNavigate]);
    
    return null;
}

export default useTaskNotifications;

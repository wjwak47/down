use std::io::{BufRead, BufReader};
use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Manager};
use tracing::{error, info};

// Windows creating process without window flag
const CREATE_NO_WINDOW: u32 = 0x08000000;

// GPU ASR 服务端口
pub const ASR_GPU_PORT: u16 = 38081;

pub struct SidecarState {
    pub child_pid: Mutex<Option<u32>>,
    pub asr_gpu_pid: Mutex<Option<u32>>,
}

pub fn init_sidecar(app: &AppHandle) {
    let resource_dir = app
        .path()
        .resource_dir()
        .expect("Failed to get resource dir");

    // 尝试多个 Python 路径（按优先级）
    // 生产环境优先使用嵌入式 Python，开发环境可以用虚拟环境
    let python_candidates = [
        // 1. 优先使用嵌入式 Python (真正可移植)
        resource_dir
            .join("resources")
            .join("python-embed")
            .join("python.exe"),
        // 2. 备选：直接在 resources 下的嵌入式 Python
        resource_dir.join("python-embed").join("python.exe"),
        // 3. 开发模式：虚拟环境 (仅在开发机上可用)
        resource_dir
            .join("resources")
            .join("python-env")
            .join("Scripts")
            .join("python.exe"),
    ];

    let python_path = python_candidates.iter().find(|p| p.exists()).cloned();

    let python_path = match python_path {
        Some(p) => p,
        None => {
            eprintln!("[Sidecar] Error: Python executable not found in any candidate path");
            eprintln!("[Sidecar] Searched paths:");
            for p in &python_candidates {
                eprintln!("[Sidecar]   - {:?}", p);
            }
            return;
        }
    };

    // 脚本路径 - 同样尝试多个位置
    let script_candidates = [
        resource_dir
            .join("resources")
            .join("dy-mcp")
            .join("douyin_api_server.py"),
        resource_dir.join("dy-mcp").join("douyin_api_server.py"),
    ];

    let script_path = script_candidates.iter().find(|p| p.exists()).cloned();

    let script_path = match script_path {
        Some(p) => p,
        None => {
            eprintln!("[Sidecar] Error: API Script not found");
            eprintln!("[Sidecar] Searched paths:");
            for p in &script_candidates {
                eprintln!("[Sidecar]   - {:?}", p);
            }
            return;
        }
    };

    eprintln!("[Sidecar] Python Path: {:?}", python_path);
    eprintln!("[Sidecar] Script Path: {:?}", script_path);

    // Spawn process
    match Command::new(&python_path)
        .arg(&script_path)
        .current_dir(&resource_dir) // 设置工作目录
        .creation_flags(CREATE_NO_WINDOW) // Hide console window
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(mut child) => {
            let mcp_pid = child.id();
            info!("[Sidecar] Started Python API Server with PID: {}", mcp_pid);

            // 处理 stdout
            if let Some(stdout) = child.stdout.take() {
                thread::spawn(move || {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines() {
                        if let Ok(line) = line {
                            info!("[Python] {}", line);
                        }
                    }
                });
            }

            // 处理 stderr
            if let Some(stderr) = child.stderr.take() {
                thread::spawn(move || {
                    let reader = BufReader::new(stderr);
                    for line in reader.lines() {
                        if let Ok(line) = line {
                            error!("[Python Error] {}", line);
                        }
                    }
                });
            }

            // 启动 GPU ASR 服务
            let asr_gpu_pid = start_asr_gpu_server(&python_path, &resource_dir);

            // Store PIDs for cleanup
            app.manage(SidecarState {
                child_pid: Mutex::new(Some(mcp_pid)),
                asr_gpu_pid: Mutex::new(asr_gpu_pid),
            });
        }
        Err(e) => {
            eprintln!("[Sidecar] Failed to start Python API Server: {}", e);
            eprintln!("[Sidecar] Python: {:?}", python_path);
            eprintln!("[Sidecar] Script: {:?}", script_path);
        }
    }
}

/// 启动 GPU ASR 服务
fn start_asr_gpu_server(
    python_path: &std::path::Path,
    resource_dir: &std::path::Path,
) -> Option<u32> {
    // ASR GPU 脚本路径
    let asr_script_candidates = [
        resource_dir
            .join("resources")
            .join("dy-mcp")
            .join("asr_gpu_server.py"),
        resource_dir.join("dy-mcp").join("asr_gpu_server.py"),
    ];

    let asr_script = asr_script_candidates.iter().find(|p| p.exists()).cloned();

    let asr_script = match asr_script {
        Some(p) => p,
        None => {
            eprintln!("[ASR-GPU] GPU ASR script not found, GPU acceleration disabled");
            return None;
        }
    };

    eprintln!("[ASR-GPU] Starting GPU ASR Server...");
    eprintln!("[ASR-GPU] Script: {:?}", asr_script);

    match Command::new(python_path)
        .arg(&asr_script)
        .env("ASR_GPU_PORT", ASR_GPU_PORT.to_string())
        .current_dir(resource_dir)
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(mut child) => {
            info!("[ASR-GPU] Started GPU ASR Server with PID: {}", child.id());
            info!("[ASR-GPU] Service URL: http://127.0.0.1:{}", ASR_GPU_PORT);

            // 处理 stdout
            if let Some(stdout) = child.stdout.take() {
                thread::spawn(move || {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines() {
                        if let Ok(line) = line {
                            info!("[ASR-GPU Python] {}", line);
                        }
                    }
                });
            }

            // 处理 stderr
            if let Some(stderr) = child.stderr.take() {
                thread::spawn(move || {
                    let reader = BufReader::new(stderr);
                    for line in reader.lines() {
                        if let Ok(line) = line {
                            error!("[ASR-GPU Error] {}", line);
                        }
                    }
                });
            }

            Some(child.id())
        }
        Err(e) => {
            eprintln!("[ASR-GPU] Failed to start GPU ASR Server: {}", e);
            None
        }
    }
}

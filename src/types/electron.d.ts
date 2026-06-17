export interface RDPConfig {
  host: string;
  username: string;
  password: string;
  port?: number;
  domain?: string;
  width?: number;
  height?: number;
  fullScreen?: boolean;
  multiMonitor?: boolean;
}

export interface RDPResult {
  success: boolean;
  error?: string;
  rdpFilePath?: string;
  message?: string;
}

export interface ElectronAPI {
  // RDP功能
  connectRDP: (config: RDPConfig) => Promise<RDPResult>;
  quickConnect: (host: string, username: string, password: string, port?: number) => Promise<RDPResult>;
  generateRdpFile: (config: RDPConfig) => Promise<RDPResult>;
  
  // 应用功能
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  getVersion: () => Promise<string>;
  isElectron: () => Promise<boolean>;
  
  // 全局快捷键回调 - 打开搜索框
  onOpenSearch?: (callback: () => void) => void;

  // 快捷搜索浮窗
  hideQuickSearch?: () => Promise<{ success: boolean; error?: string }>;
  openWorkbench?: (path?: string) => Promise<{ success: boolean; error?: string }>;
  onQuickSearchFocus?: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

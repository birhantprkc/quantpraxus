/**
 * Quantpraxus - Sınav Analiz Sistemi
 */

interface ElectronAPI {
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  toggleFullscreen: () => void;
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => void;
  isElectron: boolean;
}

interface Window {
  electronAPI?: ElectronAPI;
}

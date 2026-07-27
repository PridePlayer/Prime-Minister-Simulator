/// <reference types="vite/client" />

import type { ElectronAPI } from '@/types/game'

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// 全局禁止复制 / 剪切 / 右键菜单（与 CSS user-select:none 配合，彻底杜绝蓝底选中）
;(['copy', 'cut', 'contextmenu'] as const).forEach((evt) =>
  document.addEventListener(evt, (e) => {
    // 输入框 / 文本域内允许编辑操作
    const t = e.target as HTMLElement | null
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    e.preventDefault()
  }),
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

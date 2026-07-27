; NSIS 自定义脚本：安装/卸载后刷新 Windows 图标缓存
; 解决"安装新版本后桌面快捷方式图标不更新"的问题

!macro RefreshIconCache
  ; 通知 Shell 图标缓存已变更，强制刷新桌面快捷方式图标
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customInstall
  !insertmacro RefreshIconCache
!macroend

!macro customUnInstall
  !insertmacro RefreshIconCache
!macroend

!macro customInstallMode
  ; 安装前删除旧版桌面快捷方式，确保新图标生效
  Delete "$DESKTOP\宰执春秋.lnk"
!macroend

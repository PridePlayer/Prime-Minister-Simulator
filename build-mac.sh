#!/bin/bash
# macOS 上一键构建宰执春秋 Mac 版本
# 使用方法：
#   1. 把整个项目文件夹传到 Mac 上
#   2. 打开"终端"，cd 到项目目录
#   3. 运行：bash build-mac.sh
# 构建产物在 build-out-v2/ 目录下

set -e

echo "========================================="
echo "  宰执春秋 macOS 构建脚本"
echo "========================================="

# 检查是否在 macOS 上运行
if [[ "$(uname)" != "Darwin" ]]; then
  echo "错误：此脚本必须在 macOS 上运行"
  echo "当前系统：$(uname)"
  exit 1
fi

echo ""
echo "1/4  安装依赖..."
npm install

echo ""
echo "2/4  构建前端..."
npm run build

echo ""
echo "3/4  打包 Mac 应用（无签名）..."
npx electron-builder --mac

echo ""
echo "4/4  构建完成！"
echo ""
echo "构建产物位置："
echo "  DMG 安装包： build-out-v2/宰执春秋-0.2.0.dmg"
echo "  ZIP 压缩包： build-out-v2/宰执春秋-0.2.0-mac.zip"
echo ""
echo "首次运行若被 Gatekeeper 拦截："
echo "  方法一：右键点击应用 → 打开"
echo "  方法二：终端执行 xattr -cr /Applications/宰执春秋.app"
echo ""
echo "========================================="
echo "  构建成功，可以开始测试了！"
echo "========================================="

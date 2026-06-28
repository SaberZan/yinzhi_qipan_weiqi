#!/bin/bash

echo "=========================================="
echo "  最终验证脚本"
echo "=========================================="
echo ""

# 清理端口
echo "【步骤 1】清理端口占用..."
lsof -ti:3005,4021,4001,6021,3021,3001 2>/dev/null | xargs -r kill -9 2>/dev/null
sleep 2
echo "✅ 端口已清理"
echo ""

# 启动服务器
echo "【步骤 2】启动服务器..."
timeout 10 npm start 2>&1 > /tmp/server-test.log &
SERVER_PID=$!
sleep 6
echo ""

# 检查日志
echo "【步骤 3】检查启动日志..."
tail -15 /tmp/server-test.log
echo ""

# 检查端口
echo "【步骤 4】检查服务端口..."
PORTS=(3005 4021 4001 6021 3021 3001)
ALL_OK=true

for port in "${PORTS[@]}"; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  ✅ 端口 $port 正在监听"
  else
    echo "  ❌ 端口 $port 未监听"
    ALL_OK=false
  fi
done
echo ""

# 总结
echo "=========================================="
if [ "$ALL_OK" = true ]; then
  echo "  ✅ 所有服务正常启动"
  echo ""
  echo "  服务器信息:"
  echo "  - master:    127.0.0.1:3005"
  echo "  - connector: 127.0.0.1:4021 (4001客户端)"
  echo "  - katago:    127.0.0.1:6021"
  echo "  - gate:      127.0.0.1:3021 (3001客户端)"
  echo ""
  echo "  可以使用以下命令启动服务器:"
  echo "  npm start"
else
  echo "  ⚠️  部分服务未能启动"
  echo ""
  echo "  请检查日志文件: /tmp/server-test.log"
fi
echo "=========================================="

# 清理
kill $SERVER_PID 2>/dev/null

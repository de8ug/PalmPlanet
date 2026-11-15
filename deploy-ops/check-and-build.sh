#!/usr/bin/env bash
# 浩哥字帖工坊 —— 自动上线检查脚本
#
# 仓库 https://github.com/de8ug/hao-copybook 是纯静态站点（无 package.json、无构建步骤），
# 可直接发布的产物就是仓库里的 dist/ 目录。
#
# 本脚本职责：
#   1. 用 git ls-remote 取远端 main 的 commit（轻量，不写本地）
#   2. 与 state.json 里记录的 last_deployed_sha 比对
#   3. 有更新 → 拉取并切换到最新 main，输出 NEEDS_DEPLOY=<sha> 与 DEPLOY_DIR
#      无更新 → 输出 NO_CHANGE
#
# 真正的发布动作（website_deploy）由宿主工具执行，本脚本不碰网络发布接口。
set -uo pipefail

REPO_DIR="/Users/howie/Documents/ChatGPT/嘟嘟AI开发/PalmPlanet/hao-copybook"
STATE_FILE="/Users/howie/Documents/ChatGPT/嘟嘟AI开发/PalmPlanet/deploy-ops/state.json"
BRANCH="main"
export GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ControlMaster=no -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20"

cd "$REPO_DIR" || { echo "ERROR: 找不到仓库目录 $REPO_DIR"; exit 1; }

remote_sha="$(git ls-remote origin "refs/heads/$BRANCH" 2>/dev/null | cut -f1 | head -1)"
if [ -z "$remote_sha" ]; then
  echo "ERROR: 取不到远端 $BRANCH 的 commit（网络或认证问题）"
  exit 1
fi

last_sha=""
if [ -f "$STATE_FILE" ]; then
  last_sha="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1])).get('last_deployed_sha',''))" "$STATE_FILE" 2>/dev/null || true)"
fi

echo "remote_sha=$remote_sha"
echo "last_deployed_sha=${last_sha:-<none>}"

if [ "$remote_sha" = "$last_sha" ]; then
  echo "NO_CHANGE"
  exit 0
fi

echo "--- 检测到新提交，拉取最新 $BRANCH ---"
if ! git fetch --depth 1 origin "$BRANCH"; then
  echo "ERROR: git fetch 失败"
  exit 1
fi
git checkout -B "$BRANCH" "origin/$BRANCH" || { echo "ERROR: 切换分支失败"; exit 1; }
git reset --hard "origin/$BRANCH"

if [ ! -f "dist/index.html" ]; then
  echo "ERROR: dist/index.html 不存在，产物不可发布"
  exit 1
fi

echo "DEPLOY_DIR=$REPO_DIR/dist"
echo "NEEDS_DEPLOY=$remote_sha"

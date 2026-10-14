#!/usr/bin/env bash
# ============================================================
# WebsFlow · 双轨同步(唯一入口)
#   GitHub 轨:只推干净代码(.gitignore 挡住密钥/运行时数据,gitleaks 扫描把关)
#   服务器轨:rsync 工作区(含 gitignored 但服务器需要的文件),排除服务器运行时数据
#
#   bash scripts/sync.sh                     本地 → GitHub + 服务器(默认)
#   bash scripts/sync.sh "改动说明"           同上,带提交信息
#   bash scripts/sync.sh -m "feat: xxx"      同上(-m 写法)
#   bash scripts/sync.sh --server-only       只发服务器(不碰 git);旧写法 `deploy` 仍可用
#   bash scripts/sync.sh --dry-run           预演:gitleaks 扫描 + rsync -n,不提交/不推送/不重启
#   bash scripts/sync.sh diff                只看差异,不动任何东西
#   bash scripts/sync.sh from-server         服务器 → 本地(服务器是代码真源)
#
# 主机配置读自 .sync.conf(gitignored,模板见 .sync.conf.example);缺省值见下方。
#
# 安全约定(硬性):
#   1) 写服务器前一定先 rsync 预演并把要覆盖的文件列出来,等确认
#   2) 不带 --delete:服务器上的文件只增改,绝不删(运行时产物永远安全)
#   3) 运行时文件永不参与同步:*-config.json / websflow.db* / *.log / data/ / node_modules
#   4) 只要本次改动碰到 api/ 下的代码,部署后自动重启 node 进程并做健康检查
#   5) git 提交前 gitleaks 扫描暂存区,发现泄漏立即中止
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

CONF=".sync.conf"
[ -f "$CONF" ] && . "$CONF"
SERVER="${SERVER:-nownexts}"                     # ssh 别名或 user@host
SPATH="${SPATH:-/www/wwwroot/websflow}"
PM2_NAME="${PM2_NAME:-websflow-api}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3001/api/health}"

# 运行时文件 + 噪音:任何方向都不动
EXCL=(--exclude=.git --exclude=.gitignore --exclude=node_modules --exclude=.DS_Store
      --exclude=.preview --exclude=data --exclude='*.db' --exclude='*.db.journal'
      --exclude='*-config.json' --exclude='*.log' --exclude='*.bak*' --exclude=.sync.conf
      --exclude=CLAUDE.md --exclude=AGENTS.md --exclude='.sync.conf.example' --exclude='.env*' --exclude=.gitleaksignore)

SSH=(ssh -o ConnectTimeout=15 "$SERVER")
RSH=(rsync -azc -e ssh)   # -c:按 checksum 判断;ssh 选项交给下面的 SSH 数组(openrsync 不认 -e 里带选项)

say()     { printf '%s\n' "$*"; }        # 屏幕
say_err() { printf '%s\n' "$*" >&2; }    # 屏幕(被捕获时也能看到)

confirm() {  # $1 = 提示
  read -rp "$1 [y/N] " ok
  [ "$ok" = "y" ] || [ "$ok" = "Y" ]
}

# 预演:只列「内容会变」的文件(新/改),时间差噪音不打扰人
#   返回:纯 itemize 输出到 stdout(供 needs_restart 判断),人看的清单走 stderr→屏幕
preview_to_server() {
  local out
  out="$(${RSH[@]} -n --itemize-changes "${EXCL[@]}" ./ "$SERVER:$SPATH/" 2>/dev/null || true)"
  local content
  content="$(printf '%s\n' "$out" | awk '{f=$1; n=$2; sub(/^\.\//,"",n);
      if (f ~ /^[<>]d/) next;                                   # 目录项跳过
      else if (f ~ /^[<>]f\+/) { printf "[新] %s\n", n }
      else if (substr(f,3,1)=="c" || substr(f,4,1)=="s") { printf "[改] %s\n", n } }')"
  if [ -z "$content" ]; then say_err "  (无内容变化)"; return 1; fi
  say_err "=== 预演:将要写入服务器($SERVER:$SPATH)的文件 ==="
  printf '%s\n' "$content" >&2 | head -60
  say_err "  共 $(printf '%s\n' "$content" | wc -l | tr -d ' ') 个"
  printf '%s\n' "$out"
}

needs_restart() {  # 只有「内容变化(checksum 或 size 变)且落在 api/」才需要重启
  awk '{f=$1; n=$2;
        if ((f ~ /^[<>]f\+/ || substr(f,3,1)=="c" || substr(f,4,1)=="s") && n ~ /(^|\/)api\//) found=1}
       END{exit !found}' <<<"$1"
}

restart_node() {
  say "=== 重启 node 进程($PM2_NAME) ==="
  ${SSH[@]} "pm2 restart $PM2_NAME --update-env >/dev/null 2>&1; sleep 4; pm2 list | grep $PM2_NAME | grep -o online || echo 'NOT-ONLINE'"
  say "=== 健康检查 ==="
  ${SSH[@]} "curl -sS -m 10 -o /dev/null -w 'health=%{http_code}\n' $HEALTH_URL" || say "  健康检查失败,请查看 pm2 logs $PM2_NAME"
}

GITLEAKS="${GITLEAKS:-$HOME/.local/bin/gitleaks}"
[ -x "$GITLEAKS" ] || GITLEAKS="$(command -v gitleaks || true)"

leak_scan() {  # $1 = staged | worktree
  if [ -z "$GITLEAKS" ]; then say "✗ 未找到 gitleaks,拒绝提交(安装后重试,或用 --server-only)"; return 1; fi
  local extra=(--pre-commit); [ "$1" = staged ] && extra+=(--staged)
  if ! "$GITLEAKS" git "${extra[@]}" --redact --no-banner . ; then
    say "✗ gitleaks 发现疑似密钥,已中止(不提交、不推送、不发服务器)。"
    say "  处理:改为读环境变量/gitignored 配置;确属误报则加入 .gitleaksignore"
    return 1
  fi
}

do_github() {  # $1 = 提交信息
  if [ ! -d .git ]; then say "· 本地还不是 git 仓库,跳过 GitHub"; return 0; fi
  if ! git remote get-url origin >/dev/null 2>&1; then say "· 未配置 origin,跳过 GitHub"; return 0; fi
  local br; br="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$br" != "main" ]; then say "✗ 当前分支是 $br,不是 main;GitHub 轨只推 main,已中止"; return 1; fi
  git add -A
  if git diff --cached --quiet; then say "· GitHub:没有改动"; return 0; fi
  say "=== gitleaks 扫描暂存区 ==="
  leak_scan staged
  say "=== 将要提交 ==="
  git --no-pager diff --cached --stat | tail -12
  git commit -q -m "$1"
  if git push -q origin main; then
    say "✓ 已推送 GitHub(main)"
  else
    say "✗ GitHub 推送失败(远端有新提交?先 git pull --rebase)。提交已在本地,修好后重跑。"
    return 1
  fi
}

do_server() {
  local prev
  prev="$(preview_to_server)" || { say "服务器无变化"; return 0; }
  if [ "$DRY_RUN" = 1 ]; then say "· --dry-run:仅预演,未写入服务器、未重启"; return 0; fi
  if ! confirm "写入 $SERVER:$SPATH ?(只增改,不删除)"; then say "· 已跳过服务器"; return 0; fi
  ${RSH[@]} --itemize-changes "${EXCL[@]}" ./ "$SERVER:$SPATH/" | awk '{f=$1; if (f ~ /^[<>]d/) next; if (f ~ /^[<>]f\+/ || substr(f,3,1)=="c" || substr(f,4,1)=="s") print "  ✓", $2}' | head -20
  say "✓ 服务器已更新"
  if needs_restart "$prev"; then restart_node; else
    say "· 本次未触及 api/ 代码,无需重启(如改了前端 js/css,浏览器带 ?v= 版本号即时生效)"
  fi
}

DRY_RUN=0; SERVER_ONLY=0; MSG=""; MODE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run|-n)     DRY_RUN=1 ;;
    --server-only)    SERVER_ONLY=1 ;;
    -m|--message)     shift; MSG="${1:-}" ;;
    -h|--help)        sed -n '2,24p' "$0"; exit 0 ;;
    diff|from-server|deploy|push) MODE="$1" ;;
    *)                MSG="$1" ;;          # 旧写法:第一个参数即提交信息
  esac
  shift
done
[ "$MODE" = deploy ] && SERVER_ONLY=1
[ -z "$MODE" ] && MODE=push
[ "$SERVER_ONLY" = 1 ] && [ "$MODE" = push ] && MODE=deploy
[ -z "$MSG" ] && MSG="chore: sync v$(cat VERSION)"

case "$MODE" in
  diff)
    say "=== 本地 vs 服务器(预演,不写入) ==="
    preview_to_server || say "  (本地与服务器一致)"
    say ""
    say "=== 本地 vs GitHub ==="
    if [ -d .git ] && git remote get-url origin >/dev/null 2>&1; then
      git --no-pager status -s | head -20
      git --no-pager log --oneline -3
      say "  远端:$(git remote get-url origin)"
    else
      say "  (未接入 GitHub)"
    fi
    ;;

  from-server)
    say "=== 服务器 → 本地(预演)==="
    ${RSH[@]} -n --itemize-changes "${EXCL[@]}" "$SERVER:$SPATH/" ./ | awk '{f=$1;n=$2;sub(/^\.\//,"",n);
      if (f ~ /^[<>]d/) next;
      if (f ~ /^[<>]f\+/) printf "  [新] %s\n", n; else if (substr(f,3,1)=="c" || substr(f,4,1)=="s") printf "  [改] %s\n", n}' | head -60
    confirm "以上改动写入本地?会覆盖本地同名文件" || { say "已取消"; exit 0; }
    ${RSH[@]} --itemize-changes "${EXCL[@]}" "$SERVER:$SPATH/" ./ | tail -3
    say "✓ 本地已与服务器对齐(v$(cat VERSION))"
    ;;

  deploy)
    do_server
    ;;

  *)
    if [ "$DRY_RUN" = 1 ]; then
      say "=== --dry-run:待提交改动 ==="
      git --no-pager status -s | head -30
      say "=== gitleaks 扫描工作区改动 ==="
      leak_scan worktree || exit 1
      say "· 将提交:$MSG(dry-run 不提交、不推送)"
    else
      do_github "$MSG"
    fi
    do_server
    ;;
esac

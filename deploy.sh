#!/usr/bin/env bash
# One-command deploy to GitHub Pages.
#   ./deploy.sh                 -> build, check, commit ("Update <date>"), push, wait until live
#   ./deploy.sh "my message"    -> same, with your commit message
#   ./deploy.sh --check         -> only build + syntax check, no commit/push
# First run: creates the GitHub repo (public, needed for free Pages) and switches Pages on.
set -euo pipefail
cd "$(dirname "$0")"

REPO_NAME="${REPO_NAME:-seoul-busan}"      # change if you want another repo name
BRANCH="main"
B='\033[1m'; G='\033[32m'; Y='\033[33m'; R='\033[31m'; N='\033[0m'
say(){ printf "${B}%s${N}\n" "$*"; }
ok(){ printf "${G}✓ %s${N}\n" "$*"; }
warn(){ printf "${Y}! %s${N}\n" "$*"; }
die(){ printf "${R}✗ %s${N}\n" "$*"; exit 1; }

# ---- 0. tools -------------------------------------------------------------
for t in git python3 node; do command -v "$t" >/dev/null || die "$t is required"; done
if ! command -v gh >/dev/null; then
  if command -v brew >/dev/null; then say "Installing GitHub CLI…"; brew install gh; else die "GitHub CLI (gh) is required: https://cli.github.com"; fi
fi

# ---- 1. build + check ------------------------------------------------------
say "Building…"
python3 tools/build.py
python3 - <<'PY'
import re, subprocess, sys, tempfile, os
s = open("index.html", encoding="utf-8").read()
bad = 0
for i, sc in enumerate(re.findall(r'<script(?: type="module")?>(.*?)</script>', s, re.S)):
    f = os.path.join(tempfile.gettempdir(), f"sb-check-{i}.mjs"); open(f, "w").write(sc)
    r = subprocess.run(["node", "--check", f], capture_output=True, text=True); os.remove(f)
    if r.returncode: bad += 1; print(r.stderr[:800])
sys.exit(1 if bad else 0)
PY
ok "Build OK ($(cat .build-stamp))"
[[ "${1:-}" == "--check" ]] && exit 0

# ---- 2. GitHub auth --------------------------------------------------------
if ! gh auth status >/dev/null 2>&1; then
  say "Log in to GitHub once (a browser window will open)…"
  gh auth login --web --git-protocol https --hostname github.com
fi
gh auth setup-git >/dev/null 2>&1 || true
OWNER="$(gh api user -q .login)"

# ---- 3. repo (first run only) ---------------------------------------------
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then git init -q -b "$BRANCH"; fi
git branch -M "$BRANCH" 2>/dev/null || true
if ! git remote get-url origin >/dev/null 2>&1; then
  say "Creating github.com/$OWNER/$REPO_NAME …"
  if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
    git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
  else
    gh repo create "$REPO_NAME" --public --source=. --remote=origin --description "Seoul ⇄ Busan · a journey for two" >/dev/null
  fi
  ok "Repo ready"
fi
REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
SITE="https://$OWNER.github.io/$REPO_NAME/"

# ---- 4. commit + push ------------------------------------------------------
git add -A
if git diff --cached --quiet; then
  warn "Nothing new to commit — pushing anyway."
else
  MSG="${1:-Update $(date '+%Y-%m-%d %H:%M')}"
  git -c user.name="$(git config user.name || echo "$OWNER")" -c user.email="$(git config user.email || echo "$OWNER@users.noreply.github.com")" commit -q -m "$MSG"
  ok "Committed: $MSG"
fi
say "Pushing…"
git push -u origin "$BRANCH" -q
ok "Pushed to $REPO"

# ---- 5. Pages on (idempotent) ---------------------------------------------
if ! gh api "repos/$REPO/pages" >/dev/null 2>&1; then
  say "Switching on GitHub Pages…"
  gh api -X POST "repos/$REPO/pages" -f build_type=legacy -f "source[branch]=$BRANCH" -f "source[path]=/" >/dev/null \
    || gh api -X POST "repos/$REPO/pages" -F "source[branch]=$BRANCH" -F "source[path]=/" >/dev/null
  gh repo edit "$REPO" --homepage "$SITE" >/dev/null 2>&1 || true
  ok "Pages enabled"
fi

# ---- 6. wait until the live site serves this build -------------------------
STAMP="$(cat .build-stamp)"
say "Waiting for $SITE to serve build $STAMP (usually 30–120 s; the very first build can take ~5 min)…"
for i in $(seq 1 120); do
  if curl -fsSL "${SITE}index.html?nocache=$RANDOM" 2>/dev/null | grep -q "name=\"build\" content=\"$STAMP\""; then
    echo; ok "Live: $SITE"
    echo
    printf "   Your link:   %s\n" "$SITE"
    printf "   Her link:    %s?as=her   (or copy it from ⋯ → Sync, which adds the sync key)\n" "$SITE"
    echo
    warn "Phones may show the previous version for up to ~10 min (GitHub Pages cache). Pull-to-refresh helps."
    exit 0
  fi
  printf "."; sleep 5
done
echo; warn "Pushed, but the live page hasn't updated yet. Check progress: https://github.com/$REPO/actions"

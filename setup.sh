#!/usr/bin/env bash
#
# TEMO dev tools setup — Playwright CLI + SkillUI
# ------------------------------------------------
# يثبّت أداتين لسطر الأوامر يستخدمهما Claude Code تلقائياً بمجرد تركيبهم:
#
#   1) @playwright/cli  اختبار المواقع/اللوحات عبر المتصفح (temoplay.xyz، لوحة
#                        License System، أي واجهة TEMO) عبر CLI بدل MCP، أخف بالتوكن.
#   2) skillui           يفحص موقع/ريبو ويستخرج نظام التصميم الكامل (ألوان، خطوط،
#                        مسافات، مكونات، أنيميشن) ويحوله skill يقرأه Claude Code تلقائياً.
#
# الاستخدام:
#   ./setup.sh                              تثبيت الأداتين + استخراج هوية temoplay.xyz (ultra)
#   ./setup.sh --url https://example.com    استخراج هوية موقع آخر بدل temoplay.xyz
#   ./setup.sh --out ./design-systems/x     تغيير مجلد الإخراج
#   ./setup.sh --fast                       تخطي تثبيت Chromium (تحليل ثابت أسرع وأخف)
#   ./setup.sh --skip-extract               تثبيت الأداتين فقط بدون استخراج أي تصميم
#
set -euo pipefail

TARGET_URL="https://temoplay.xyz"
OUT_DIR="./design-systems/temoplay"
PROJECT_NAME="TEMO"
MODE="ultra"
DO_EXTRACT=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) TARGET_URL="$2"; shift 2 ;;
    --out) OUT_DIR="$2"; shift 2 ;;
    --name) PROJECT_NAME="$2"; shift 2 ;;
    --fast) MODE="default"; shift ;;
    --skip-extract) DO_EXTRACT=0; shift ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^#!\?//'
      exit 0
      ;;
    *) echo "خيار غير معروف: $1" >&2; exit 1 ;;
  esac
done

command -v node >/dev/null 2>&1 || { echo "Node.js غير مثبت. ثبّت Node 18+ أولاً: https://nodejs.org" >&2; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "npm غير موجود مع Node. تحقق من التثبيت." >&2; exit 1; }

echo "==> [1/5] تثبيت @playwright/cli ..."
npm install -g @playwright/cli@latest

echo "==> [2/5] تسجيل skill الخاص بـ playwright-cli داخل Claude Code ..."
playwright-cli install --skills

echo "==> [3/5] تثبيت skillui ..."
npm install -g skillui

if [[ "$DO_EXTRACT" -eq 0 ]]; then
  echo ""
  echo "تم تثبيت الأداتين بنجاح. تم تخطي استخراج نظام التصميم (--skip-extract)."
  exit 0
fi

if [[ "$MODE" == "ultra" ]]; then
  echo "==> [4/5] تثبيت Playwright + Chromium (لازمة لوضع ultra: سكرين شوتس + أنيميشن) ..."
  npm install -g playwright
  playwright install --with-deps chromium || playwright install chromium
else
  echo "==> [4/5] تخطي تثبيت Chromium (وضع --fast: تحليل ثابت بدون متصفح) ..."
fi

echo "==> [5/5] استخراج نظام التصميم من: $TARGET_URL"
mkdir -p "$(dirname "$OUT_DIR")"

if [[ "$MODE" == "ultra" ]]; then
  skillui --url "$TARGET_URL" --mode ultra --screens 10 --name "$PROJECT_NAME" --out "$OUT_DIR"
else
  skillui --url "$TARGET_URL" --name "$PROJECT_NAME" --out "$OUT_DIR"
fi

echo ""
echo "تم! ملف الهوية البصرية جاهز في: $OUT_DIR"
echo ""
echo "لاستخدامه بأي مشروع TEMO جديد (TEMO ADS، Manga Festival، ...):"
echo "  انسخ SKILL.md وCLAUDE.md وDESIGN.md ومجلدي references/ وtokens/ لمشروعك"
echo "  أو افتح المجلد مباشرة وابدأ العمل فيه:"
echo "  cd \"$OUT_DIR\" && claude"

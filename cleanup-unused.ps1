# Cleanup of unused files for Shubha-Sankalpam. 
# 1) Copy this file into the project root (the folder that has package.json and vercel.json).
# 2) Open PowerShell there and run:   powershell -ExecutionPolicy Bypass -File .\cleanup-unused.ps1
#    -> this only LISTS what it would delete (dry run).
# 3) To really delete:               powershell -ExecutionPolicy Bypass -File .\cleanup-unused.ps1 -Run
# Deleted files stay recoverable from git (git checkout -- <file>) if they were committed.
param([switch]$Run)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $root 'package.json')) -or -not (Test-Path (Join-Path $root 'vercel.json'))) { Write-Host 'Put this script in the project root (next to package.json).'; exit 1 }

$items = @(
 # 1. old one-off scripts in the root
 'append.css','audit-selectors.js','check_booking.js','check_sel.js','check_tables.js','dump-text.js','fix_puja_names.js','fix_puja_names_exact.js','fix_wrap.js','gen-manifest.js','gen-struct.js','migrate_pujas.js','parse-pages.js','patch.css','patch_colors.css','patch_dots.css','patch_fix.css','patch_icon.css','patch_logo.js','patch_logo_svg.js','patch_swipe.css','remove_bg.py','repair_html.js','scratch_patch.js','step3d_migrate.js','struct.json','test_fixes.js','test_frontend.js','test_webhooks.js','unwrap.js','update_html.js','wrap_js.js',
 # 2. notes / reports (ORIGINAL_REQUEST.md is KEPT on purpose: tests/e2e/tier1_features.test.js checks it exists)
 'prompt_draft.md','qa_audit_report.md','phase2_code.txt','transcript_match.json',
 # 3. folders / generated data
 'scratch','default','data\analytics.json',
 # 4. debug / fix scripts in backend\scripts
 'backend\scripts\debug_qs.js','backend\scripts\debug_ui_test.js','backend\scripts\debug_ui_test2.js','backend\scripts\debug_ui_test3.js','backend\scripts\find_phase2.js','backend\scripts\find_phase2_better.js','backend\scripts\find_phase2_broad.js','backend\scripts\fix_phase2.js','backend\scripts\fix_upload_test.js','backend\scripts\fix_upload_test2.js','backend\scripts\fix_upload_test_socket.js','backend\scripts\fix_upload_tests_calls.js','backend\scripts\fix_upload_tests_calls2.js','backend\scripts\patch_frontend.js','backend\scripts\patch_frontend_final.js',
 # 5. old notes
 'LOADING-FIXES.txt','SPEED-UPDATE-2026-10-05.txt','NAV-LANGUAGE-SPEED-FIX-2026-10-11.txt','PERFORMANCE-HERO-PRESERVED.md','PERFORMANCE_AND_PERSISTENCE.md'
)
$n = 0
foreach ($i in $items) {
  $p = Join-Path $root $i
  if (Test-Path $p) {
    $n++
    if ($Run) { Remove-Item -LiteralPath $p -Recurse -Force; Write-Host "deleted  $i" } else { Write-Host "would delete  $i" }
  }
}
Write-Host ""
if ($Run) { Write-Host "$n item(s) deleted." } else { Write-Host "$n item(s) would be deleted. Run again with -Run to delete." }

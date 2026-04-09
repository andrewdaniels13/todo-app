#!/usr/bin/env bash
set -uo pipefail

# ╔══════════════════════════════════════════════════════════════╗
# ║  MAULT RALPH LOOP — Step 7 Mault Enforcement Verification    ║
# ║  Physics, not policy. This script checks REAL STATE.         ║
# ║  Exit 0 = all pass. Exit 1 = work remains.                  ║
# ╚══════════════════════════════════════════════════════════════╝

PASS_COUNT=0
FAIL_COUNT=0
PENDING_COUNT=0
CHECK_RESULTS=()

PROOF_DIR=".mault"
PROOF_FILE="$PROOF_DIR/verify-step7.proof"

record_result() { CHECK_RESULTS+=("CHECK $1: $2 - $3"); }
print_pass()    { echo "[PASS]    CHECK $1: $2"; PASS_COUNT=$((PASS_COUNT + 1)); record_result "$1" "PASS" "$2"; }
print_fail()    { echo "[FAIL]    CHECK $1: $2"; FAIL_COUNT=$((FAIL_COUNT + 1)); record_result "$1" "FAIL" "$2"; }
print_pending() { echo "[PENDING] CHECK $1: $2"; PENDING_COUNT=$((PENDING_COUNT + 1)); record_result "$1" "PENDING" "$2"; }

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: Not a git repository."
  exit 1
fi

DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null || \
  git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@refs/remotes/origin/@@' || \
  echo "main")

write_proof_file() {
  local sha epoch iso token
  sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  epoch=$(date +%s)
  iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%S")
  token="MAULT-STEP7-${sha}-${epoch}-10/10"
  mkdir -p "$PROOF_DIR"
  if [ ! -f "$PROOF_DIR/.gitignore" ]; then
    printf '*\n!.gitignore\n' > "$PROOF_DIR/.gitignore"
  fi
  {
    echo "MAULT-STEP7-PROOF"
    echo "=================="
    echo "Timestamp: $epoch"
    echo "DateTime: $iso"
    echo "GitSHA: $sha"
    echo "Checks: 10/10 PASS"
    for r in "${CHECK_RESULTS[@]}"; do echo "  $r"; done
    echo "=================="
    echo "Token: $token"
  } > "$PROOF_FILE"
  echo ""
  echo "Proof file written: $PROOF_FILE"
  echo "Token: $token"
}

check_proof_staleness() {
  if [ -f "$PROOF_FILE" ]; then
    local proof_sha current_sha
    proof_sha=$(grep '^GitSHA:' "$PROOF_FILE" | awk '{print $2}')
    current_sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    if [ "$proof_sha" != "$current_sha" ]; then
      echo "WARNING: Proof file is STALE (proof: $proof_sha, HEAD: $current_sha). Deleting."
      rm -f "$PROOF_FILE"
    fi
  fi
}

echo "========================================"
echo "  MAULT Step 7 Enforcement Verification"
echo "========================================"
echo ""

# CHECK 1: Step 6 prerequisite
check_1() {
  if [ ! -f ".mault/verify-step6.proof" ]; then
    print_fail 1 "Step 6 not complete. Run mault-verify-step6.sh first."
    return
  fi
  local token
  token=$(grep '^Token:' .mault/verify-step6.proof | awk '{print $2}') || true
  print_pass 1 "Step 6 proof exists (${token:-unknown})"
}

# CHECK 2: docs/mault.yaml exists and has version: 1
check_2() {
  if [ ! -f "docs/mault.yaml" ]; then
    print_fail 2 "docs/mault.yaml missing. Create it from the TypeScript template."
    return
  fi
  if ! grep -q '^version: 1' docs/mault.yaml 2>/dev/null; then
    print_fail 2 "docs/mault.yaml missing 'version: 1' header."
    return
  fi
  print_pass 2 "docs/mault.yaml exists with version: 1"
}

# CHECK 3: All required detector sections present
check_3() {
  if [ ! -f "docs/mault.yaml" ]; then
    print_fail 3 "docs/mault.yaml missing"
    return
  fi
  local missing=""
  grep -q 'directoryReinforcement' docs/mault.yaml   || missing="${missing}directoryReinforcement "
  grep -q 'namingConvention' docs/mault.yaml          || missing="${missing}namingConvention "
  grep -q 'environmentReinforcement' docs/mault.yaml  || missing="${missing}environmentReinforcement "
  grep -q 'tempFiles' docs/mault.yaml                 || missing="${missing}tempFiles "
  grep -q 'configChaos' docs/mault.yaml               || missing="${missing}configChaos "
  grep -q 'fileProliferation' docs/mault.yaml         || missing="${missing}fileProliferation "
  grep -q 'overcrowdedFolders' docs/mault.yaml        || missing="${missing}overcrowdedFolders "
  grep -q 'dependencyHealth' docs/mault.yaml          || missing="${missing}dependencyHealth "
  grep -q 'productionReadiness' docs/mault.yaml       || missing="${missing}productionReadiness "
  grep -q 'projectScaffolding' docs/mault.yaml        || missing="${missing}projectScaffolding "
  grep -q 'deadEnds' docs/mault.yaml                  || missing="${missing}deadEnds "

  if [ -z "$missing" ]; then
    print_pass 3 "All required detector sections present"
  else
    print_fail 3 "Missing detector sections: ${missing}"
  fi
}

# CHECK 4: deprecatedPatterns section present
check_4() {
  if [ ! -f "docs/mault.yaml" ]; then
    print_fail 4 "docs/mault.yaml missing"
    return
  fi
  if grep -q 'deprecatedPatterns' docs/mault.yaml && \
     grep -q '^\s*- id:' docs/mault.yaml 2>/dev/null; then
    local count
    count=$(grep -c '^\s*- id:' docs/mault.yaml 2>/dev/null || echo 0)
    print_pass 4 "deprecatedPatterns section present (${count} entries)"
  else
    print_fail 4 "Missing deprecatedPatterns section with at least 1 entry"
  fi
}

# CHECK 5: UC18 rules section (top-level 'rules:' key)
check_5() {
  if [ ! -f "docs/mault.yaml" ]; then
    print_fail 5 "docs/mault.yaml missing"
    return
  fi
  if grep -qE '^rules:' docs/mault.yaml 2>/dev/null; then
    local count
    count=$(grep -c '^\s*- id:.*TEST\|^\s*- id:.*SRC' docs/mault.yaml 2>/dev/null || echo 0)
    print_pass 5 "UC18 rules section present at top level"
  else
    print_fail 5 "Missing top-level 'rules:' section (UC18 Structural Governance)"
  fi
}

# CHECK 6: UC16 dependency-health hook in pre-commit config
check_6() {
  if [ ! -f ".pre-commit-config.yaml" ]; then
    print_fail 6 ".pre-commit-config.yaml missing"
    return
  fi
  if grep -q 'dependency-health\|npm audit\|pip-audit' .pre-commit-config.yaml 2>/dev/null; then
    print_pass 6 "UC16 dependency-health hook present in .pre-commit-config.yaml"
  else
    print_fail 6 "Missing UC16 dependency-health hook. Add npm audit hook."
  fi
}

# CHECK 7: UC18 structural-governance hook in pre-commit config
check_7() {
  if [ ! -f ".pre-commit-config.yaml" ]; then
    print_fail 7 ".pre-commit-config.yaml missing"
    return
  fi
  if grep -q 'structural-governance\|governance' .pre-commit-config.yaml 2>/dev/null; then
    print_pass 7 "UC18 structural-governance hook present in .pre-commit-config.yaml"
  else
    print_fail 7 "Missing UC18 structural-governance hook."
  fi
}

# CHECK 8: Governance script exists and passes
check_8() {
  if [ ! -f "scripts/check-structural-governance.js" ]; then
    print_fail 8 "scripts/check-structural-governance.js missing"
    return
  fi
  local output exit_code
  output=$(node scripts/check-structural-governance.js 2>&1)
  exit_code=$?
  if [ "$exit_code" -eq 0 ]; then
    print_pass 8 "Structural governance script passes"
  else
    echo "$output" | tail -10
    print_fail 8 "Structural governance script found violations. Fix and re-run."
  fi
}

# CHECK 9: All hooks pass (excluding no-commit-to-branch on main)
check_9() {
  local pre_commit_bin
  pre_commit_bin=$(command -v pre-commit 2>/dev/null || \
    echo "$HOME/Library/Python/$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null)/bin/pre-commit")

  if [ ! -x "$pre_commit_bin" ]; then
    print_pending 9 "pre-commit not found in PATH"
    return
  fi

  local output exit_code
  output=$(SKIP=no-commit-to-branch "$pre_commit_bin" run --all-files 2>&1)
  exit_code=$?

  if [ "$exit_code" -eq 0 ]; then
    print_pass 9 "All pre-commit hooks pass (11 hooks)"
  else
    echo "$output" | tail -20
    print_fail 9 "Pre-commit hooks failing. Fix and re-run."
  fi
}

# CHECK 10: Handshake issue
check_10() {
  if ! command -v gh >/dev/null 2>&1; then
    print_pending 10 "GitHub CLI not available."
    return
  fi
  local issue_url
  issue_url=$(gh issue list --search "[MAULT] Production Readiness: Step 7" --json url -q '.[0].url' 2>/dev/null) || true
  if [ -z "$issue_url" ]; then
    issue_url=$(gh issue list --state closed --search "[MAULT] Production Readiness: Step 7" --json url -q '.[0].url' 2>/dev/null) || true
  fi
  if [ -n "$issue_url" ]; then
    print_pass 10 "Handshake issue: ${issue_url}"
  else
    print_pending 10 "No handshake issue found. Create it as proof of completion."
  fi
}

check_proof_staleness

check_1
check_2
check_3
check_4
check_5
check_6
check_7
check_8
check_9
check_10

echo ""
echo "========================================"
echo "  PASS: ${PASS_COUNT}/10  FAIL: ${FAIL_COUNT}/10  PENDING: ${PENDING_COUNT}/10"
echo "========================================"

if [ "$FAIL_COUNT" -eq 0 ] && [ "$PENDING_COUNT" -eq 0 ]; then
  write_proof_file
  echo "ALL CHECKS PASSED. Step 7 Mault Enforcement is complete."
  exit 0
elif [ "$FAIL_COUNT" -gt 0 ]; then
  rm -f "$PROOF_FILE"
  echo "${FAIL_COUNT} check(s) FAILED. Fix and re-run: ./mault-verify-step7.sh"
  exit 1
else
  rm -f "$PROOF_FILE"
  echo "${PENDING_COUNT} check(s) PENDING. Complete work and re-run: ./mault-verify-step7.sh"
  exit 1
fi

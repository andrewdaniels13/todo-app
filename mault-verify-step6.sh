#!/usr/bin/env bash
set -uo pipefail

# ╔══════════════════════════════════════════════════════════════╗
# ║  MAULT RALPH LOOP — Step 6 Pre-commit Framework Verification ║
# ║  Physics, not policy. This script checks REAL STATE.         ║
# ║  Exit 0 = all pass. Exit 1 = work remains.                  ║
# ╚══════════════════════════════════════════════════════════════╝

PASS_COUNT=0
FAIL_COUNT=0
PENDING_COUNT=0
CHECK_RESULTS=()

PROOF_DIR=".mault"
PROOF_FILE="$PROOF_DIR/verify-step6.proof"

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
  token="MAULT-STEP6-${sha}-${epoch}-12/12"
  mkdir -p "$PROOF_DIR"
  if [ ! -f "$PROOF_DIR/.gitignore" ]; then
    printf '*\n!.gitignore\n' > "$PROOF_DIR/.gitignore"
  fi
  {
    echo "MAULT-STEP6-PROOF"
    echo "=================="
    echo "Timestamp: $epoch"
    echo "DateTime: $iso"
    echo "GitSHA: $sha"
    echo "Checks: 12/12 PASS"
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
echo "  MAULT Step 6 Pre-commit Framework Verification"
echo "========================================"
echo ""

# CHECK 1: Step 5 prerequisite
check_1() {
  if [ ! -f ".mault/verify-step5.proof" ]; then
    print_fail 1 "Step 5 not complete. Run mault-verify-step5.sh first."
    return
  fi
  local token
  token=$(grep '^Token:' .mault/verify-step5.proof | awk '{print $2}') || true
  print_pass 1 "Step 5 proof exists (${token:-unknown})"
}

# CHECK 2: pre-commit installed
check_2() {
  if command -v pre-commit >/dev/null 2>&1; then
    print_pass 2 "pre-commit installed: $(pre-commit --version 2>/dev/null)"
    return
  fi
  # Check Python user path
  local user_bin
  user_bin="$HOME/Library/Python/$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null)/bin"
  if [ -f "$user_bin/pre-commit" ]; then
    print_pass 2 "pre-commit installed at $user_bin/pre-commit"
    return
  fi
  print_fail 2 "pre-commit not found. Install: brew install pre-commit OR pip3 install pre-commit"
}

# CHECK 3: .pre-commit-config.yaml exists
check_3() {
  if [ ! -f ".pre-commit-config.yaml" ]; then
    print_fail 3 "Missing .pre-commit-config.yaml"
    return
  fi
  print_pass 3 ".pre-commit-config.yaml exists"
}

# CHECK 4: Config has required hooks
check_4() {
  if [ ! -f ".pre-commit-config.yaml" ]; then
    print_fail 4 ".pre-commit-config.yaml missing"
    return
  fi
  local missing=""
  grep -q 'trailing-whitespace' .pre-commit-config.yaml || missing="${missing}trailing-whitespace "
  grep -q 'end-of-file-fixer' .pre-commit-config.yaml   || missing="${missing}end-of-file-fixer "
  grep -q 'no-commit-to-branch' .pre-commit-config.yaml  || missing="${missing}no-commit-to-branch "
  if grep -q 'tsc\|typecheck\|type-check' .pre-commit-config.yaml && \
     grep -q 'eslint\|lint' .pre-commit-config.yaml && \
     grep -q 'jest\|test' .pre-commit-config.yaml; then
    true
  else
    missing="${missing}(tsc|eslint|jest hooks) "
  fi
  if [ -z "$missing" ]; then
    print_pass 4 "Required hooks present in config"
  else
    print_fail 4 "Missing hooks: ${missing}"
  fi
}

# CHECK 5: node_modules excluded
check_5() {
  if [ ! -f ".pre-commit-config.yaml" ]; then
    print_fail 5 ".pre-commit-config.yaml missing"
    return
  fi
  if grep -q 'node_modules\|^exclude:' .pre-commit-config.yaml 2>/dev/null; then
    print_pass 5 "node_modules excluded in pre-commit config"
  else
    print_fail 5 "node_modules not excluded. Add 'exclude: ^node_modules/' to config."
  fi
}

# CHECK 6: git hook installed
check_6() {
  if [ -f ".git/hooks/pre-commit" ] && grep -q 'pre-commit' .git/hooks/pre-commit 2>/dev/null; then
    print_pass 6 "pre-commit git hook installed"
  else
    print_fail 6 "pre-commit hook not installed. Run: pre-commit install"
  fi
}

# CHECK 7: All hooks pass on current files
check_7() {
  local pre_commit_bin
  pre_commit_bin=$(command -v pre-commit 2>/dev/null || \
    echo "$HOME/Library/Python/$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null)/bin/pre-commit")

  if [ ! -x "$pre_commit_bin" ]; then
    print_pending 7 "pre-commit not found in PATH"
    return
  fi

  local output exit_code
  output=$("$pre_commit_bin" run --all-files 2>&1)
  exit_code=$?

  if [ "$exit_code" -eq 0 ]; then
    print_pass 7 "All pre-commit hooks pass"
  else
    echo "$output" | tail -20
    print_fail 7 "Pre-commit hooks failing. Fix issues and re-run."
  fi
}

# CHECK 8: CI has validate-pr job
check_8() {
  local ci_file
  ci_file=$(ls .github/workflows/ci.yml .github/workflows/ci.yaml 2>/dev/null | head -1) || true
  if [ -z "$ci_file" ]; then
    print_fail 8 "No CI workflow found."
    return
  fi
  if grep -qE 'validate.?pr|pr.?title|pull_request_title' "$ci_file" 2>/dev/null; then
    print_pass 8 "CI has PR title validation job"
  else
    print_fail 8 "CI missing PR title validation. Add validate-pr job."
  fi
}

# CHECK 9: CI has branch name validation
check_9() {
  local ci_file
  ci_file=$(ls .github/workflows/ci.yml .github/workflows/ci.yaml 2>/dev/null | head -1) || true
  if [ -z "$ci_file" ]; then
    print_fail 9 "No CI workflow found."
    return
  fi
  if grep -qE 'branch.?name|head_ref|BRANCH' "$ci_file" 2>/dev/null; then
    print_pass 9 "CI has branch name validation"
  else
    print_fail 9 "CI missing branch name validation."
  fi
}

# CHECK 10: .pre-commit-config.yaml committed
check_10() {
  if git ls-files --error-unmatch .pre-commit-config.yaml >/dev/null 2>&1; then
    print_pass 10 ".pre-commit-config.yaml is tracked by git"
  else
    print_pending 10 ".pre-commit-config.yaml not yet committed. Commit and push."
  fi
}

# CHECK 11: Feature committed with [mault-step6] tag
check_11() {
  local found
  found=$(git log --oneline --all | grep -i 'mault-step6\|step6\|step 6\|precommit\|pre-commit' | head -1) || true
  if [ -n "$found" ]; then
    print_pass 11 "Step 6 commit found: ${found}"
  else
    print_pending 11 "No commit with mault-step6 tag found. Commit your changes."
  fi
}

# CHECK 12: Handshake issue
check_12() {
  if ! command -v gh >/dev/null 2>&1; then
    print_pending 12 "GitHub CLI not available."
    return
  fi
  local issue_url
  issue_url=$(gh issue list --search "[MAULT] Production Readiness: Step 6" --json url -q '.[0].url' 2>/dev/null) || true
  if [ -z "$issue_url" ]; then
    issue_url=$(gh issue list --state closed --search "[MAULT] Production Readiness: Step 6" --json url -q '.[0].url' 2>/dev/null) || true
  fi
  if [ -n "$issue_url" ]; then
    print_pass 12 "Handshake issue: ${issue_url}"
  else
    print_pending 12 "No handshake issue found. Create it as proof of completion."
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
check_11
check_12

echo ""
echo "========================================"
echo "  PASS: ${PASS_COUNT}/12  FAIL: ${FAIL_COUNT}/12  PENDING: ${PENDING_COUNT}/12"
echo "========================================"

if [ "$FAIL_COUNT" -eq 0 ] && [ "$PENDING_COUNT" -eq 0 ]; then
  write_proof_file
  echo "ALL CHECKS PASSED. Step 6 Pre-commit Framework is complete."
  exit 0
elif [ "$FAIL_COUNT" -gt 0 ]; then
  rm -f "$PROOF_FILE"
  echo "${FAIL_COUNT} check(s) FAILED. Fix and re-run: ./mault-verify-step6.sh"
  exit 1
else
  rm -f "$PROOF_FILE"
  echo "${PENDING_COUNT} check(s) PENDING. Complete work and re-run: ./mault-verify-step6.sh"
  exit 1
fi

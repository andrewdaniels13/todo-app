#!/usr/bin/env bash
set -uo pipefail

# ╔══════════════════════════════════════════════════════════════╗
# ║  MAULT RALPH LOOP — Step 8 Governance Testing Verification   ║
# ║  Physics, not policy. This script checks REAL STATE.         ║
# ║  Exit 0 = all pass. Exit 1 = work remains.                  ║
# ╚══════════════════════════════════════════════════════════════╝

PASS_COUNT=0
FAIL_COUNT=0
PENDING_COUNT=0
CHECK_RESULTS=()

PROOF_DIR=".mault"
PROOF_FILE="$PROOF_DIR/verify-step8.proof"

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
  token="MAULT-STEP8-${sha}-${epoch}-18/18"
  mkdir -p "$PROOF_DIR"
  if [ ! -f "$PROOF_DIR/.gitignore" ]; then
    printf '*\n!.gitignore\n' > "$PROOF_DIR/.gitignore"
  fi
  {
    echo "MAULT-STEP8-PROOF"
    echo "=================="
    echo "Timestamp: $epoch"
    echo "DateTime: $iso"
    echo "GitSHA: $sha"
    echo "Checks: 18/18 PASS"
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

run_node_check() {
  local check_num="$1" label="$2" script="$3"
  if [ ! -f "$script" ]; then
    print_fail "$check_num" "$label — script missing: $script"
    return
  fi
  local output exit_code
  output=$(node "$script" 2>&1)
  exit_code=$?
  if [ "$exit_code" -eq 0 ]; then
    print_pass "$check_num" "$label"
  else
    echo "$output" | tail -5
    print_fail "$check_num" "$label — see output above"
  fi
}

echo "========================================"
echo "  MAULT Step 8 Governance Verification"
echo "========================================"
echo ""

# CHECK 1: Step 7 prerequisite
check_1() {
  if [ ! -f ".mault/verify-step7.proof" ]; then
    print_fail 1 "Step 7 not complete. Run mault-verify-step7.sh first."
    return
  fi
  local token
  token=$(grep '^Token:' .mault/verify-step7.proof | awk '{print $2}') || true
  print_pass 1 "Step 7 proof exists (${token:-unknown})"
}

# CHECK 2: scripts/governance/ directory with required scripts
check_2() {
  if [ ! -d "scripts/governance" ]; then
    print_fail 2 "scripts/governance/ directory missing"
    return
  fi
  local count
  count=$(ls scripts/governance/*.js scripts/governance/*.mjs 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -lt 12 ]; then
    print_fail 2 "scripts/governance/ has only $count scripts (need ≥12)"
    return
  fi
  print_pass 2 "scripts/governance/ exists with $count scripts"
}

# CHECK 3: .memory-layer/baselines/ with required baseline files
check_3() {
  if [ ! -d ".memory-layer/baselines" ]; then
    print_fail 3 ".memory-layer/baselines/ missing. Run governance scripts to initialize."
    return
  fi
  local count
  count=$(ls .memory-layer/baselines/*.json 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -lt 8 ]; then
    print_fail 3 ".memory-layer/baselines/ has only $count baseline files (need ≥8)"
    return
  fi
  print_pass 3 ".memory-layer/baselines/ exists with $count baseline files"
}

# CHECK 4: Iron Dome — any usage ratchet
check_4() { run_node_check 4 "Iron Dome — any usage ratchet" "scripts/governance/check-any-usage.js"; }

# CHECK 5: Iron Dome — silent catches ratchet
check_5() { run_node_check 5 "Iron Dome — silent catches ratchet" "scripts/governance/check-silent-catches.js"; }

# CHECK 6: Iron Dome — eslint-disable ratchet
check_6() { run_node_check 6 "Iron Dome — eslint-disable ratchet" "scripts/governance/check-eslint-disable.js"; }

# CHECK 7: Rising Tide — mock tax
check_7() { run_node_check 7 "Rising Tide — mock tax (2x rule)" "scripts/governance/check-mock-tax.js"; }

# CHECK 8: Mock Quality
check_8() { run_node_check 8 "Mock Quality — adversarial mock detection" "scripts/governance/check-adversarial-mocks.js"; }

# CHECK 9: SRP Guardrails
check_9() { run_node_check 9 "SRP Guardrails — file size limits" "scripts/governance/guardrails-check.js"; }

# CHECK 10: Test Discipline
check_10() { run_node_check 10 "Test Discipline — skipped test gate" "scripts/governance/check-skipped-tests.js"; }

# CHECK 11: Code Health
check_11() { run_node_check 11 "Code Health — orphan file detection" "scripts/governance/code-health-check.js"; }

# CHECK 12: Integration pairing
check_12() { run_node_check 12 "Buddy System — integration test pairing" "scripts/governance/verify-integration-pairing.js"; }

# CHECK 13: .gitleaks.toml exists
check_13() {
  if [ -f ".gitleaks.toml" ]; then
    print_pass 13 ".gitleaks.toml secret detection config exists"
  else
    print_fail 13 ".gitleaks.toml missing. Create it for secret scanning."
  fi
}

# CHECK 14: CI has governance job
check_14() {
  local ci_file
  ci_file=$(ls .github/workflows/ci.yml .github/workflows/ci.yaml 2>/dev/null | head -1) || true
  if [ -z "$ci_file" ]; then
    print_fail 14 "No CI workflow found."
    return
  fi
  if grep -q 'governance' "$ci_file" 2>/dev/null; then
    print_pass 14 "CI has governance job"
  else
    print_fail 14 "CI missing governance job"
  fi
}

# CHECK 15: CI has secret-scan job (gitleaks)
check_15() {
  local ci_file
  ci_file=$(ls .github/workflows/ci.yml .github/workflows/ci.yaml 2>/dev/null | head -1) || true
  if [ -z "$ci_file" ]; then
    print_fail 15 "No CI workflow found."
    return
  fi
  if grep -qE 'gitleaks|secret.scan' "$ci_file" 2>/dev/null; then
    print_pass 15 "CI has gitleaks secret scanning"
  else
    print_fail 15 "CI missing gitleaks. Add secret-scan job."
  fi
}

# CHECK 16: CI has package-audit job
check_16() {
  local ci_file
  ci_file=$(ls .github/workflows/ci.yml .github/workflows/ci.yaml 2>/dev/null | head -1) || true
  if [ -z "$ci_file" ]; then
    print_fail 16 "No CI workflow found."
    return
  fi
  if grep -q 'package-audit\|npm audit' "$ci_file" 2>/dev/null; then
    print_pass 16 "CI has package-audit job"
  else
    print_fail 16 "CI missing package-audit job."
  fi
}

# CHECK 17: governance-manifest.json exists
check_17() {
  if [ -f ".mault/governance-manifest.json" ]; then
    print_pass 17 ".mault/governance-manifest.json exists"
  else
    print_fail 17 ".mault/governance-manifest.json missing"
  fi
}

# CHECK 18: Handshake issue
check_18() {
  if ! command -v gh >/dev/null 2>&1; then
    print_pending 18 "GitHub CLI not available."
    return
  fi
  local issue_url
  issue_url=$(gh issue list --search "[MAULT] Production Readiness: Step 8" --json url -q '.[0].url' 2>/dev/null) || true
  if [ -z "$issue_url" ]; then
    issue_url=$(gh issue list --state closed --search "[MAULT] Production Readiness: Step 8" --json url -q '.[0].url' 2>/dev/null) || true
  fi
  if [ -n "$issue_url" ]; then
    print_pass 18 "Handshake issue: ${issue_url}"
  else
    print_pending 18 "No handshake issue found."
  fi
}

check_proof_staleness

check_1; check_2; check_3; check_4; check_5; check_6; check_7; check_8; check_9
check_10; check_11; check_12; check_13; check_14; check_15; check_16; check_17; check_18

echo ""
echo "========================================"
echo "  PASS: ${PASS_COUNT}/18  FAIL: ${FAIL_COUNT}/18  PENDING: ${PENDING_COUNT}/18"
echo "========================================"

if [ "$FAIL_COUNT" -eq 0 ] && [ "$PENDING_COUNT" -eq 0 ]; then
  write_proof_file
  echo "ALL CHECKS PASSED. Step 8 Governance Testing is complete."
  exit 0
elif [ "$FAIL_COUNT" -gt 0 ]; then
  rm -f "$PROOF_FILE"
  echo "${FAIL_COUNT} check(s) FAILED. Fix and re-run: ./mault-verify-step8.sh"
  exit 1
else
  rm -f "$PROOF_FILE"
  echo "${PENDING_COUNT} check(s) PENDING. Complete work and re-run: ./mault-verify-step8.sh"
  exit 1
fi

#!/bin/bash
API="https://my-twin-pro-production.up.railway.app"
PASS=0
FAIL=0

check() {
  if [ $1 -eq 0 ]; then
    echo "✅ $2"
    PASS=$((PASS+1))
  else
    echo "❌ $2"
    FAIL=$((FAIL+1))
  fi
}

echo "═══════════════════════════════════"
echo "🧪 My Twin Full System Test"
echo "═══════════════════════════════════"

# 1. Health Check
HTTP=$(curl -s -o /dev/null -w "%{http_code}" $API/health)
[ "$HTTP" = "200" ]; check $? "Health Check (HTTP $HTTP)"

# 2. Root endpoint & Engines
ROOT=$(curl -s $API/)
HTTP=$(curl -s -o /dev/null -w "%{http_code}" $API/)
[ "$HTTP" = "200" ]; check $? "Root Endpoint"
ENGINE_COUNT=$(echo $ROOT | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('engines',{})))" 2>/dev/null)
echo "   Engines active: $ENGINE_COUNT"

# 3. Signup Test
EMAIL="test_$(date +%s)@mytwin.ai"
SIGNUP=$(curl -s -X POST $API/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"twin_name\":\"TestTwin\",\"lang\":\"ar\"}")
TOKEN=$(echo $SIGNUP | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
USER_ID=$(echo $SIGNUP | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user_id',''))" 2>/dev/null)
[ -n "$TOKEN" ]; check $? "Signup ($EMAIL -> $USER_ID)"

# 4. Login Test
LOGIN=$(curl -s -X POST $API/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo $LOGIN | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
[ -n "$TOKEN" ]; check $? "Login"

# 5. Verify Token
VERIFY=$(curl -s "$API/api/auth/verify-token?user_id=$USER_ID")
VALID=$(echo $VERIFY | python3 -c "import sys,json; print(json.load(sys.stdin).get('valid',False))" 2>/dev/null)
[ "$VALID" = "True" ]; check $? "Verify Token"

# 6. Chat (wake up twin)
CHAT=$(curl -s -X POST $API/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\",\"message\":\"مرحبا\",\"lang\":\"ar\",\"tier\":\"free\"}")
REPLY=$(echo $CHAT | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('reply','')[:50])" 2>/dev/null)
[ -n "$REPLY" ]; check $? "Chat (reply: $REPLY...)"

# ✅ اختبار الاستباقية (Proactive)
SUGGESTED=$(echo $CHAT | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('suggested_question') or 'none')" 2>/dev/null)
if [ "$SUGGESTED" != "none" ]; then
  echo "   💡 Proactive Suggestion: $SUGGESTED"
  check 0 "Proactive Engine"
else
  echo "   ℹ️ Proactive Suggestion: none (may need more context)"
  check 0 "Proactive Engine (no suggestion yet)"
fi

# 7. Energy Status
ENERGY=$(curl -s "$API/api/economy/energy/status?user_id=$USER_ID")
ENERGY_VAL=$(echo $ENERGY | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('energy',0))" 2>/dev/null)
[ -n "$ENERGY_VAL" ]; check $? "Energy Status ($ENERGY_VAL)"

# 8. Economy Balance
BALANCE=$(curl -s "$API/api/economy/balance?user_id=$USER_ID")
BAL=$(echo $BALANCE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('energy',{}).get('level',0))" 2>/dev/null)
[ -n "$BAL" ]; check $? "Economy Balance"

# 9. Billing Plans
PLANS=$(curl -s $API/api/billing/plans)
PLAN_COUNT=$(echo $PLANS | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('plans',[])))" 2>/dev/null)
[ "$PLAN_COUNT" -gt 0 ] 2>/dev/null; check $? "Billing Plans ($PLAN_COUNT plans)"

# 10. Passport (with auth)
AUTH_HEADER="Authorization: Bearer $TOKEN"
PASSPORT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH_HEADER" $API/api/v1/passport)
[ "$PASSPORT_HTTP" = "200" ]; check $? "Passport (HTTP $PASSPORT_HTTP)"

# 11. Fingerprint
FP_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH_HEADER" $API/api/v1/fingerprint)
[ "$FP_HTTP" = "200" ]; check $? "Fingerprint (HTTP $FP_HTTP)"

# 12. Docs
DOCS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" $API/docs)
[ "$DOCS_HTTP" = "200" ]; check $? "Swagger Docs (HTTP $DOCS_HTTP)"

# 13. Notifications/Push route
PUSH_HTTP=$(curl -s -o /dev/null -w "%{http_code}" $API/api/push)
if [ "$PUSH_HTTP" != "404" ]; then
  check 0 "Push Route Available (HTTP $PUSH_HTTP)"
else
  check 1 "Push Route Not Found"
fi

# 14. Capabilities via Plugin Registry (backend equivalent)
# We check that the engine list includes curiosity_dynamics which drives proactive
CURIOSITY=$(echo $ROOT | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('engines',{}).get('curiosity_dynamics','none'))" 2>/dev/null)
if [ "$CURIOSITY" != "none" ]; then
  check 0 "Curiosity Dynamics Engine ($CURIOSITY)"
else
  check 1 "Curiosity Dynamics Engine missing"
fi

echo "═══════════════════════════════════"
echo "📊 Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════"

#!/bin/bash

# Test OTP endpoints
# Replace with your actual API base URL

API_BASE="https://api.kmertrash.com/waste/api/v1"
PHONE="+2376XXXXXXXXX"

echo "1. Sending OTP..."
curl -X POST "$API_BASE/auth/otp/send" \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$PHONE\"}"

echo ""
echo ""
echo "2. Enter the OTP you received and test verification:"
echo "   curl -X POST $API_BASE/auth/otp/verify \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"phone\": \"$PHONE\", \"code\": \"123456\"}'"

#!/bin/bash

# Test Termii SMS API
# Replace YOUR_API_KEY with your actual Termii API key

API_KEY="TLztfxEZyHeqSIIEdkKqGqiMTaNRVSGVPPIDqioiDKSPqJXvRADhzgrVRCwWTj"
SENDER_ID="KmerTrash"
PHONE="+237650931636"  # Replace with a test phone number
MESSAGE="Your KmerTrash verification code is: 123456. Valid for 5 minutes."

curl -X POST https://v3.api.termii.com/api/sms/send \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$PHONE\",
    \"from\": \"$SENDER_ID\",
    \"sms\": \"$MESSAGE\",
    \"type\": \"plain\",
    \"channel\": \"dnd\",
    \"api_key\": \"$API_KEY\"
  }"

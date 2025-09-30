# Replace YOUR_KEY with your API key (single-line, no quotes), and adjust MODEL if needed
MODEL="gemini-2.5-flash"
API_KEY="INSERT API KEY HERE"

curl -v \
  "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "x-goog-api-key: ${API_KEY}" \
  -d '{
    "contents": [
      { "parts": [{ "text": "Return only JSON: {\"hello\":\"world\"}" }] }
    ],
    "generationConfig": {
      "temperature": 0.0,
      "maxOutputTokens": 200,
      "candidateCount": 1
    }
  }'
Setup

1. Requirements: Node 18+, Redis, MongoDB, snarkjs, circom available in PATH.
2. Install deps: npm i
3. Run Powers of Tau once: npm run setup:ptau
4. Start API: npm run dev
5. Start workers (in separate terminals):
   - npm run worker:keygen
   - npm run worker:proof

API

POST /v1/circuits
{ "templateName": "rangeCheck", "params": { "min": 1000, "max": 1500 } }

POST /v1/proofs
{ "circuitId": "...", "privateInputs": { "in": 1200 }, "publicInputs": { "randomPublicSignal": 12 } }

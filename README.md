# ZKFlow Service

A minimal Zero-Knowledge Proof generation backend (Express + BullMQ + Redis + MongoDB + S3) with dynamic Circom templates and sequential snarkjs execution in worker processes.

## Overview

- API server exposes endpoints to request circuit key generation and proof creation
- Workers pick up jobs and run `circom`/`snarkjs` commands sequentially
- Dynamic circuits created from templates with user-provided params (e.g., range min/max)
- Artifacts uploaded to S3/MinIO; proof results stored in MongoDB
- Private inputs never logged and cleaned up after use

## Prerequisites

- Node.js 18+
- Redis
- MongoDB
- circom compiler in PATH (v2.x). Install from circom docs.
- snarkjs (installed via npm; project uses `npx snarkjs`)
- Optional: S3/MinIO for artifact storage
- Windows: use Git Bash or WSL; ensure `circom` is available in the shell used by Node

## Install

```bash
npm install
```

## Configure

Create a `.env` file in the project root:

```bash
# Server
PORT=3000
LOG_LEVEL=info

# Mongo & Redis
MONGODB_URI=mongodb://localhost:27017/zkflow
REDIS_URL=redis://127.0.0.1:6379

# S3 / MinIO
S3_BUCKET=zkflow-dev
AWS_REGION=us-east-1
# If using AWS: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
# If using MinIO:
# S3_ENDPOINT=http://127.0.0.1:9000
# S3_FORCE_PATH_STYLE=true
# AWS_ACCESS_KEY_ID=minioadmin
# AWS_SECRET_ACCESS_KEY=minioadmin

# Powers of Tau (optional; otherwise use tools/setupPowersOfTau.js)
# PTAU_PATH=/absolute/path/to/pot14_final.ptau

# Workers
KEYGEN_CONCURRENCY=1
PROOF_CONCURRENCY=1
```

## Powers of Tau (phase 1)

Either point `PTAU_PATH` to an existing `pot14_final.ptau`, or generate one locally:

```bash
npm run setup:ptau
```

This will create `./tau/pot14_final.ptau` and verify it.

## Start services

Run each in a separate terminal (or use a process manager):

```bash
# API server
npm run dev

# Key-generation worker
npm run worker:keygen

# Proof-generation worker
npm run worker:proof
```

Ensure Redis and MongoDB are running.

If you see a BullMQ error like "Your redis options maxRetriesPerRequest must be null", ensure the workers/queues connect with `{ maxRetriesPerRequest: null, enableReadyCheck: false }` (already configured in this repo) and that your `REDIS_URL` points to a reachable instance.

## Dynamic circuit templates

Templates live in `templates/*.template.circom`. Example: `templates/rangeCheck.template.circom` uses placeholders `{{min}}` and `{{max}}`. The worker replaces placeholders and compiles with:

```text
circom <generated.circom> --r1cs --wasm --sym --output <processingDir> -l node_modules
```

Include library imports using resolvable paths (we pass `-l node_modules`), e.g. `include "circomlib/circuits/comparators.circom";`.

## API usage

- Create a circuit from a template (idempotent by template+params):

```bash
curl -sS -X POST http://localhost:3000/v1/circuits \
  -H 'Content-Type: application/json' \
  -d '{
    "templateName": "rangeCheck",
    "params": { "min": 1000, "max": 1500 }
  }'
```

Responses:

- 200 OK: circuit already exists and is ready
- 202 Accepted: circuit created and enqueued (status pending)

The returned object includes `_id`, `status`, and metadata. When ready, artifacts are uploaded to `s3://$S3_BUCKET/circuits/<circuitId>/` as:

- `circuit.wasm`
- `circuit_final.zkey`
- `verification_key.json`
- `verifier.sol` (Solidity verifier contract)

### Deploy verifier contract

You can deploy the generated verifier to an EVM chain via a deployment worker. Start the worker:

```bash
npm run worker:deploy
```

Then enqueue deployment through the API:

```bash
curl -sS -X POST http://localhost:3000/v1/circuits/<CIRCUIT_ID>/deploy \
  -H 'Content-Type: application/json' \
  -d '{
    "rpcUrl": "https://sepolia.infura.io/v3/<INFURA_KEY>",
    "privateKey": "0x<YOUR_PRIVATE_KEY>",
    "chainId": 11155111
  }'
```

On success, the circuit document is updated with `artifacts.deployment`:

- `address`: contract address
- `chainId`, `txHash`, `blockNumber`, `network`

- Generate a proof for a ready circuit:

```bash
curl -sS -X POST http://localhost:3000/v1/proofs \
  -H 'Content-Type: application/json' \
  -d '{
    "circuitId": "<CIRCUIT_ID_FROM_PREVIOUS>",
    "privateInputs": { "in": 1200 },
    "publicInputs": { "randomPublicSignal": 12 }
  }'
```

Responses:

- 202 Accepted with `{ "proofRequestId": "..." }`

Proof results are stored on the `proofrequests` document as `{ proof, public }` when completed.

## Check status in MongoDB

- Circuits: `db.circuits.find({ _id: ObjectId("<id>") })`
- Proof requests: `db.proofrequests.find({ _id: ObjectId("<id>") })`

Statuses: `pending`, `ready`/`completed`, or `failed` with an error message.

## Add a new circuit template

1. Create `templates/<name>.template.circom` with placeholders like `{{paramName}}`.
2. From the client/API call, pass `templateName: "<name>"` and a matching `params` object.
3. The keygen worker will compile and set up the artifacts.

Example snippet inside your template:

```circom
pragma circom 2.1.3;
include "circomlib/circuits/comparators.circom";

template RangeCheck() {
    signal input in;
    signal input randomPublicSignal;

    component gte = GreaterEqThan(32);
    gte.in[0] <== in;
    gte.in[1] <== {{min}};
    gte.out === 1;

    component lte = LessEqThan(32);
    lte.in[0] <== in;
    lte.in[1] <== {{max}};
    lte.out === 1;
}

component main { public [randomPublicSignal] } = RangeCheck();
```

## Security notes

- Private inputs are never logged and only written to a temporary directory for witness generation; directory is deleted after job completion
- Workers are stateless and can be containerized; prefer running them in isolated, ephemeral containers with least-privilege S3 credentials
- Add auth/rate limiting/CORS policy as needed (middleware already present for security headers)

## Troubleshooting

- `circom: command not found`: install circom and ensure it’s available in your shell PATH
- Template import errors: ensure `-l node_modules` is passed (already done) and that your include path is resolvable (e.g., `include "circomlib/..."`)
- S3 upload failures: verify `S3_BUCKET`, credentials, and (for MinIO) `S3_ENDPOINT` + `S3_FORCE_PATH_STYLE=true`
- PTAU missing: run `npm run setup:ptau` or set `PTAU_PATH`
- Windows: use Git Bash or WSL; confirm `circom` runs in the same shell the Node process uses

## Metrics & Health

- Health: `GET /health`
- Prometheus metrics: `GET /metrics`

## License

MIT
# payan_name_zkp_service

### Project Index

**ZKFlow Service**: Zero-Knowledge proof generation backend (Express + BullMQ + Redis + MongoDB + S3) with dynamic Circom templates and snarkjs workers.

### Top-level layout

- **server/**: API, models, services, workers
  - `index.js`: Express app, routes, metrics, DB connect
  - `metrics.js`: Prometheus metrics registry
  - routes/
    - `health.js`: GET `/health`
    - `circuits.js`: POST `/v1/circuits`, POST `/v1/circuits/:id/deploy`
    - `proofs.js`: POST `/v1/proofs`
  - models/
    - `Circuit.js`: circuit documents and artifacts
    - `ProofRequest.js`: proof request lifecycle
  - services/
    - `db.js`: Mongoose connect + TTL index
    - `queueService.js`: BullMQ queues (key-generation, proof-generation, deploy, cleanup)
    - `circuitService.js`: create/find/mark circuits
    - `proofService.js`: create/mark proof requests
    - `storageService.js`: S3 client (put/get)
  - workers/
    - common/
      - `processUtils.js`: child process runner
      - `templateEngine.js`: renders `templates/*.template.circom`
    - `keyGenerationWorker.js`: compiles circuit, runs setup, uploads artifacts
    - `proofGenerationWorker.js`: downloads artifacts, calculates witness/proof
    - `deployWorker.js`: compiles verifier.sol and deploys via ethers
    - `cleanupWorker.js`: deletes temp/processing paths
- **templates/**: Circom templates (e.g., `rangeCheck.template.circom`)
- **tools/**: setup scripts (e.g., `setupPowersOfTau.js` -> creates `tau/pot14_final.ptau`)
- **processing/**: ephemeral per-job build dirs (generated)
- **tau/**: Powers of Tau outputs (generated)
- **exmaple circom/**, **exmaple bash file/**: examples
- `README.md`: full usage guide

### NPM scripts (package.json)

- `dev`: run API with nodemon
- `start`: run API
- `worker:keygen` | `worker:proof` | `worker:deploy` | `worker:cleanup`: start workers
- `setup:ptau`: generate `tau/pot14_final.ptau`

### Environment

- Server: `PORT`, `LOG_LEVEL`
- Datastores: `MONGODB_URI`, `REDIS_URL`
- S3/MinIO: `S3_BUCKET`, `AWS_REGION`, optional `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Powers of Tau: optional `PTAU_PATH` (else use `tools/setupPowersOfTau.js`)
- Workers: `KEYGEN_CONCURRENCY`, `PROOF_CONCURRENCY`

### API endpoints

- POST `/v1/circuits`
  - Body: `{ templateName: string, params: object }`
  - 200: ready circuit; 202: pending (keygen enqueued)
- POST `/v1/circuits/:id/deploy`
  - Body: `{ rpcUrl: string, privateKey: string, chainId?: number }`
  - 202: deployment enqueued (writes `artifacts.deployment`)
- POST `/v1/proofs`
  - Body: `{ circuitId: string, privateInputs: object, publicInputs?: object }`
  - 202: `{ proofRequestId }` (result stored on proof request)
- GET `/health`: `{ status: "ok", uptime_s }`
- GET `/metrics`: Prometheus metrics

### Queues and workers

- Queues (BullMQ): `key-generation`, `proof-generation`, `deploy`, `cleanup`
- Workers:
  - `keyGenerationWorker.js`
    - Renders template → `circom` compile (`--r1cs --wasm --sym -l node_modules`)
    - `snarkjs groth16 setup` + `zkey beacon`
    - Export `verification_key.json` + `verifier.sol`
    - Upload to `s3://$S3_BUCKET/circuits/<circuitId>/`
    - Mark circuit ready; cleanup processing dir
  - `proofGenerationWorker.js`
    - Download `circuit.wasm` + `circuit_final.zkey`
    - Build input.json from public + private
    - `snarkjs wtns calculate` → `groth16 prove`
    - Store `{ proof, public }` on proof request; secure cleanup
  - `deployWorker.js`
    - Download `verifier.sol` → compile with `solc` → deploy via `ethers`
    - Update circuit `artifacts.deployment`
  - `cleanupWorker.js`: remove target paths

### Data models

- `Circuit`:
  - `circuit_hash` (sha256 of `{ templateName, params }`), `template`, `params`
  - `status`: `pending|ready|failed`, `artifacts` { `wasm`, `zkey`, `vkey`, `verifier`, `deployment?` }, `error?`
- `ProofRequest`:
  - `circuit_id`, `status`: `pending|completed|failed`, `user_id?`, `artifacts?` (`{ proof, public }`), `error?`, `expires_at` (TTL)

### Templates

- `rangeCheck.template.circom`
  - Placeholders: `{{min}}`, `{{max}}`
  - Public signal: `randomPublicSignal`

### Tooling

- `tools/setupPowersOfTau.js`: runs multi-step `snarkjs powersoftau` to produce and verify `tau/pot14_final.ptau`.

### Notes

- Requires: Node 18+, Redis, MongoDB, `circom` v2.x, `snarkjs`
- Windows: use Git Bash/WSL; ensure `circom` is in PATH for the Node process

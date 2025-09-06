# Circuit Deployment Flow

This document describes the new circuit deployment flow that integrates with an external contract deployment service.

## Overview

When a circuit is compiled and ready, it now automatically goes through a deployment process to deploy the verifier contract to the blockchain.

## Circuit Status Flow

1. **pending** → Circuit creation and compilation in progress
2. **ready_for_deployment** → Circuit compiled successfully, ready for deployment
3. **deploying** → Deployment job submitted to external service
4. **deployed** → Contract successfully deployed
5. **failed** → Error occurred during compilation or deployment

## Environment Variables

Add the following environment variable to your `.env` file:

```bash
CONTRACT_DEPLOY_URL=https://your-deployment-service.com
```

## Deployment Process

### Automatic Deployment

When a circuit compilation completes successfully:

1. Circuit status is set to `ready_for_deployment`
2. A deployment job is automatically enqueued
3. The deployment worker calls the external deployment API:
   ```
   POST ${CONTRACT_DEPLOY_URL}/api/deploy
   {
     "circuitId": "circuit_123"
   }
   ```
4. The worker polls for deployment status and updates the circuit accordingly

### Manual Deployment

You can also manually trigger deployment for a ready circuit:

```bash
POST /v1/circuits/:id/deploy
```

## API Endpoints

### Deploy Circuit

```
POST /v1/circuits/:id/deploy
```

Triggers deployment for a circuit that's ready for deployment.

### Get Deployment Status

```
GET /v1/circuits/:id/deployment
```

Returns the current deployment status and details for a circuit.

### Webhook (Optional)

```
POST /v1/webhooks/deployment-status
{
  "circuitId": "circuit_123",
  "status": "deployed",
  "contractAddress": "0x...",
  "txHash": "0x...",
  "deployedAt": "2024-01-01T00:00:00Z"
}
```

## Running the Deployment Worker

Start the deployment worker:

```bash
npm run worker:deployment
```

Or include it in your process manager alongside other workers.

## Circuit Model Updates

The Circuit model now includes:

- New status values: `ready_for_deployment`, `deploying`, `deployed`
- Deployment object with:
  - `jobId`: External deployment job ID
  - `contractAddress`: Deployed contract address
  - `txHash`: Deployment transaction hash
  - `deployedAt`: Deployment timestamp
  - `error`: Deployment error message (if failed)

## External API Integration

The service integrates with these external endpoints:

1. **Start Deployment**: `POST /api/deploy`
2. **Check Status**: `GET /api/deploy/status/:jobId`
3. **Get Contract Info**: `GET /api/deploy/contract/:circuitId`

## Error Handling

- Failed deployments are retried automatically (up to 2 attempts)
- Deployment timeouts after 10 minutes of polling
- Errors are logged and stored in the circuit's deployment object
- Failed circuits maintain their artifacts for manual inspection

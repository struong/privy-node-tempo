# privy-node-tempo

Standalone Bun + TypeScript examples that use the [`@privy-io/node`](https://docs.privy.io/basics/nodeJS/quickstart) SDK to send transactions on **Tempo Moderato** (chain `42431`), including Tempo's custom **type 118 (TIP-118)** transactions with non-native ERC-20 fee tokens.

## What's in here

| Script | Command | Tx type | What it does |
| --- | --- | --- | --- |
| [`send.ts`](./send.ts) | `bun run send` | EIP-1559 (type 2) | Standard alphaUSD (TIP-20) `transfer` from a Privy wallet. Auto-creates + funds a fresh wallet via `tempo_fundAddress` if `WALLET_ID` is unset. |
| [`tt.ts`](./tt.ts) | `bun run tt` | Tempo type 118 | Same alphaUSD `transfer`, but paying gas in **thetaUSD** as the `fee_token`. Uses the SDK's `sendTransaction` with the type-118 payload cast through the type system (the typed surface only knows about types 0/1/2/4). |
| [`batch.ts`](./batch.ts) | `bun run batch` | Tempo type 118 | Two ERC-20 transfers (alphaUSD + thetaUSD) batched into a single type-118 tx using a 2D nonce (`nonce_key=2`). |

## Setup

```sh
cp .env.example .env
# fill in PRIVY_APP_ID and PRIVY_APP_SECRET
bun install
```

### Environment variables

| Var | Required | Default | Used by |
| --- | --- | --- | --- |
| `PRIVY_APP_ID` | yes | — | all |
| `PRIVY_APP_SECRET` | yes | — | all |
| `WALLET_ID` | required for `tt` and `batch`; optional for `send` | unset → `send.ts` creates + funds a fresh wallet | all |
| `RECIPIENT` | no | `0x000…dEaD` | all |
| `AMOUNT` | no | `1000000` (1.00 alphaUSD, 6 decimals) | all |
| `FEE_TOKEN` | no | thetaUSD `0x20C0…0003` | `tt`, `batch` |

## Run

### 1. Standard EIP-1559 transfer (`send`)

```sh
bun run send
```

If `WALLET_ID` is unset, this creates a new Privy wallet, funds it via the Moderato `tempo_fundAddress` faucet RPC, and sends 1 alphaUSD to `RECIPIENT`. Save the printed wallet id into `.env` (`WALLET_ID=...`) so the next runs reuse the same funded wallet.

### 2. Tempo type 118 with custom fee token (`tt`)

```sh
WALLET_ID=<your-wallet-id> bun run tt
```

Sends 1 alphaUSD but charges gas in thetaUSD via the type-118 `fee_token` field. Make sure the wallet has a small thetaUSD balance for gas. If the wallet was just created via `send`, fund it again or top it up with thetaUSD before running.

### 3. Batched type 118 with 2D nonce (`batch`)

```sh
WALLET_ID=<your-wallet-id> bun run batch
```

Sends alphaUSD and thetaUSD to the same recipient in a single type-118 transaction, on nonce stream `nonce_key=2` (parallel to the default `nonce_key=0`).

## Verify

Each script prints a tx hash and explorer URL. Confirm the tx type and execution:

```sh
cast tx <hash>      -r https://rpc.moderato.tempo.xyz
cast receipt <hash> -r https://rpc.moderato.tempo.xyz
```

What to look for:

- **`send`** → `type 2`, status `1`, and a `Transfer(from, to, amount)` log from `0x20C0…0001` (alphaUSD).
- **`tt`** → `type 118`, status `1`, gas paid in the `FEE_TOKEN` (default thetaUSD `0x20C0…0003`), and a `Transfer` log from alphaUSD.
- **`batch`** → `type 118`, status `1`, two `Transfer` logs (alphaUSD + thetaUSD), and a non-zero `nonce_key`.

Open the explorer URL printed by each script for a UI view: `https://explorer.moderato.tempo.xyz/tx/<hash>`.

## Notes on type 118 support in `@privy-io/node`

The generated types in `@privy-io/node` already include `UnsignedTempoTransaction` (with `type: 118`, `calls[]`, `fee_token`, `aa_authorization_list`, etc.), so the API surface accepts type-118 payloads. However, the SDK's hand-written convenience layer (`createViemAccount`, `formatViemTransaction`, etc.) does **not** yet build or sign type-118 transactions — that's why `tt.ts` and `batch.ts` build the payload manually and cast it into the typed `sendTransaction` call.

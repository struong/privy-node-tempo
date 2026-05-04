# privy-node-tempo

Bun + TypeScript examples using [`@privy-io/node`](https://docs.privy.io/basics/nodeJS/quickstart) on **Tempo Moderato** (chain `42431`).

## Setup

```sh
cp .env.example .env   # fill in PRIVY_APP_ID, PRIVY_APP_SECRET, WALLET_ID
bun install
```

## Run

```sh
bun run send    # standard EIP-1559 (type 2) alphaUSD transfer
bun run tt      # Tempo type 118 transfer, gas paid in thetaUSD
bun run batch   # Tempo type 118 batched (alphaUSD + thetaUSD), 2D nonce
```

`send` auto-creates and funds a wallet if `WALLET_ID` is unset; `tt` and `batch` require `WALLET_ID`.

Each script prints a tx hash and explorer URL.

# privy-node-tempo

Standalone Bun + TypeScript example using the [`@privy-io/node`](https://docs.privy.io/basics/nodeJS/quickstart) SDK to send a standard EIP-1559 (type 2) alphaUSD (TIP-20) transfer on **Tempo Moderato** (chain `42431`).

## Setup

```sh
cp .env.example .env
# fill in PRIVY_APP_ID and PRIVY_APP_SECRET
bun install
```

`WALLET_ID` defaults to the existing funded wallet `auu6xr0njolqi67qcvvblo9a` (`0xDEA23bc1bB9971A901Ad26F8bD5369A4b550870E`). Unset it to create + auto-fund a fresh wallet via `tempo_fundAddress`.

## Run

```sh
bun run send
```

## Verify

The script prints a tx hash and explorer URL. Confirm type 2 + success:

```sh
cast tx <hash> -r https://rpc.moderato.tempo.xyz
cast receipt <hash> -r https://rpc.moderato.tempo.xyz
```

Look for `type 2` and a `Transfer(from, to, amount)` log emitted by `0x20C0000000000000000000000000000000000001`.

/**
 * Tempo Type 118 (TIP-118) transaction via a plain viem client + Privy account.
 *
 * Instead of hand-building Privy's `{ caip2, params: { transaction: { type: 118,
 * calls, fee_token } } }` envelope, this exports the Privy wallet as a viem
 * account (`createViemAccount`) and uses viem's native Tempo support
 * (`tempoActions()` → `client.token.transfer`). viem builds + serializes the
 * type-118 envelope; Privy signs it remotely; viem broadcasts.
 *
 * Requires @privy-io/node >= 0.20.0 (Tempo support in createViemAccount, PR #161).
 *
 * Run: bun run tt-viem
 */

import { PrivyClient } from "@privy-io/node";
import { createViemAccount } from "@privy-io/node/viem";
import { createWalletClient, http, getAddress, type Hex } from "viem";
import { tempoModerato } from "viem/chains";
import { tempoActions } from "viem/tempo";

const RPC_URL = "https://rpc.moderato.tempo.xyz";
const EXPLORER = "https://explorer.moderato.tempo.xyz";

// TIP-20 stablecoins on Tempo Moderato.
const ALPHA_USD = "0x20C0000000000000000000000000000000000001" as const; // tx target
const THETA_USD = "0x20C0000000000000000000000000000000000003" as const; // fee token

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const appId = need("PRIVY_APP_ID");
  const appSecret = need("PRIVY_APP_SECRET");
  const walletId = need("WALLET_ID");

  const recipient = getAddress(
    process.env.RECIPIENT ?? "0x000000000000000000000000000000000000dEaD",
  );
  const amount = BigInt(process.env.AMOUNT ?? "1000000"); // 1.00 alphaUSD (6 decimals)
  const feeToken = getAddress(process.env.FEE_TOKEN ?? THETA_USD);

  const privy = new PrivyClient({ appId, appSecret });

  // Resolve the wallet's address, then export it as a viem account.
  const wallet = await privy.wallets().get(walletId);
  const address = getAddress(wallet.address);
  const account = createViemAccount(privy, { walletId, address });

  // Plain viem wallet client + Tempo actions. No CAIP2, no manual type/calls.
  const client = createWalletClient({
    account,
    chain: tempoModerato,
    transport: http(RPC_URL),
  }).extend(tempoActions());

  console.log(`Tempo Type 118 via viem + Privy account:`);
  console.log(`  wallet:    ${walletId}`);
  console.log(`  address:   ${address}`);
  console.log(`  chain:     ${tempoModerato.id} (${tempoModerato.name})`);
  console.log(`  token:     ${ALPHA_USD} (alphaUSD)`);
  console.log(`  fee_token: ${feeToken} (thetaUSD)`);
  console.log(`  recipient: ${recipient}`);
  console.log(`  amount:    ${amount.toString()} (alphaUSD base units)\n`);

  const hash: Hex = await client.token.transfer({
    token: ALPHA_USD,
    to: recipient,
    amount,
    feeToken,
  });

  console.log("✅ Broadcasted");
  console.log(`  tx hash:  ${hash}`);
  console.log(`  explorer: ${EXPLORER}/tx/${hash}`);
  console.log(
    `\nVerify type 118 + fee paid in ${feeToken}:\n  cast tx ${hash} -r ${RPC_URL}\n  cast receipt ${hash} -r ${RPC_URL}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

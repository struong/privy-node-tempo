/**
 * Tempo Type 118 (TIP-118) transaction with a `valid_after` start time.
 *
 * Sends an alphaUSD transfer (gas paid in thetaUSD) where the transaction is
 * only valid starting at `valid_after` — a Unix timestamp (seconds) set to ~60s
 * ahead of now. The chain rejects inclusion before that time.
 *
 * Run: bun run valid-after
 */

import { PrivyClient } from "@privy-io/node";
import { encodeFunctionData, parseAbi, getAddress, type Hex } from "viem";

const RPC_URL = "https://rpc.moderato.tempo.xyz";
const EXPLORER = "https://explorer.moderato.tempo.xyz";
const CHAIN_ID = 42431;
const CAIP2 = `eip155:${CHAIN_ID}` as const;

// TIP-20 stablecoins on Tempo Moderato.
const ALPHA_USD = "0x20C0000000000000000000000000000000000001" as const; // tx target
const THETA_USD = "0x20C0000000000000000000000000000000000003" as const; // fee token

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

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

  // valid_after = now + 60s, expressed in Unix seconds.
  const nowSec = Math.floor(Date.now() / 1000);
  const validAfter = nowSec + 60;

  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [recipient, amount],
  }) as Hex;

  const privy = new PrivyClient({ appId, appSecret });

  console.log(`Tempo Type 118 transaction with valid_after:`);
  console.log(`  wallet:      ${walletId}`);
  console.log(`  chain:       ${CAIP2}`);
  console.log(`  fee_token:   ${feeToken}`);
  console.log(`  call.to:     ${ALPHA_USD}`);
  console.log(`  recipient:   ${recipient}`);
  console.log(`  amount:      ${amount.toString()} (alphaUSD base units)`);
  console.log(
    `  valid_after: ${validAfter} (${new Date(validAfter * 1000).toISOString()})`,
  );
  console.log(`  now:         ${nowSec} (${new Date(nowSec * 1000).toISOString()})\n`);

  const response = await privy.wallets().ethereum().sendTransaction(walletId, {
    caip2: CAIP2,
    params: {
      transaction: {
        chain_id: CHAIN_ID,
        type: 118,
        fee_token: feeToken,
        valid_after: validAfter,
        calls: [{ to: ALPHA_USD, data }],
      },
    },
  });

  const hash = response.hash;
  const txId = response.transaction_id;

  console.log("✅ Broadcasted");
  console.log(`  tx hash:        ${hash}`);
  if (txId) console.log(`  transaction_id: ${txId}`);
  console.log(`  explorer:       ${EXPLORER}/tx/${hash}`);
  console.log(
    `\nVerify type 118 + valid_after:\n  cast tx ${hash} -r ${RPC_URL}\n  cast receipt ${hash} -r ${RPC_URL}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Tempo Type 118 batched transaction with a 2D nonce.
 *
 * Sends BOTH alphaUSD and thetaUSD to the same recipient in a single tx,
 * paying gas in thetaUSD, on `nonce_key=2` (parallel nonce stream).
 *
 * As of @privy-io/node v0.17.0 the SDK exports `UnsignedTempoTransaction`
 * and `sendTransaction` accepts it directly — no casts needed.
 *
 * Run: bun run batch
 */

import { PrivyClient } from "@privy-io/node";
import {
  encodeFunctionData,
  parseAbi,
  getAddress,
  createPublicClient,
  http,
  type Hex,
} from "viem";
import { tempoModerato } from "viem/chains";
import { Actions } from "viem/tempo";

const RPC_URL = "https://rpc.moderato.tempo.xyz";
const EXPLORER = "https://explorer.moderato.tempo.xyz";
const CHAIN_ID = 42431;
const CAIP2 = `eip155:${CHAIN_ID}` as const;

const ALPHA_USD = "0x20C0000000000000000000000000000000000001" as const;
const THETA_USD = "0x20C0000000000000000000000000000000000003" as const;

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function transferData(to: `0x${string}`, amount: bigint): Hex {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [to, amount],
  }) as Hex;
}

async function main() {
  const appId = need("PRIVY_APP_ID");
  const appSecret = need("PRIVY_APP_SECRET");
  const walletId = need("WALLET_ID");

  const recipient = getAddress(
    process.env.RECIPIENT ?? "0x000000000000000000000000000000000000dEaD",
  );
  const alphaAmount = BigInt(process.env.ALPHA_AMOUNT ?? "1000000"); // 1.00
  const thetaAmount = BigInt(process.env.THETA_AMOUNT ?? "1000000"); // 1.00
  const nonceKey = BigInt(process.env.NONCE_KEY ?? "2");
  const gasLimit = BigInt(process.env.GAS_LIMIT ?? "500000");

  const privy = new PrivyClient({ appId, appSecret });

  // Look up the wallet address (needed to query the 2D nonce).
  const wallet = await privy.wallets().get(walletId);
  const sender = getAddress(wallet.address);

  // Fetch the next nonce for `nonce_key` via viem-tempo's getNonce action,
  // which calls Tempo's nonce precompile rather than the key-0-only
  // eth_getTransactionCount.
  const publicClient = createPublicClient({
    chain: tempoModerato,
    transport: http(RPC_URL),
  });
  const nextNonce = await Actions.nonce.getNonce(publicClient, {
    account: sender,
    nonceKey,
  });

  const calls = [
    { to: ALPHA_USD, data: transferData(recipient, alphaAmount) },
    { to: THETA_USD, data: transferData(recipient, thetaAmount) },
  ];

  console.log(`Tempo Type 118 batched transaction:`);
  console.log(`  wallet:    ${walletId}`);
  console.log(`  sender:    ${sender}`);
  console.log(`  chain:     ${CAIP2}`);
  console.log(`  fee_token: ${THETA_USD} (thetaUSD)`);
  console.log(`  nonce_key: ${nonceKey.toString()}`);
  console.log(`  nonce:     ${nextNonce.toString()}`);
  console.log(`  gas_limit: ${gasLimit.toString()}`);
  console.log(`  recipient: ${recipient}`);
  console.log(`  call[0]:   alphaUSD.transfer  amount=${alphaAmount}`);
  console.log(`  call[1]:   thetaUSD.transfer  amount=${thetaAmount}\n`);

  const response = await privy.wallets().ethereum().sendTransaction(walletId, {
    caip2: CAIP2,
    params: {
      transaction: {
        type: 118,
        chain_id: CHAIN_ID,
        fee_token: THETA_USD,
        nonce_key: `0x${nonceKey.toString(16)}`,
        nonce: `0x${nextNonce.toString(16)}`,
        gas_limit: `0x${gasLimit.toString(16)}`,
        calls,
      },
    },
  });

  const hash = response.hash;
  console.log("✅ Broadcasted");
  console.log(`  tx hash:        ${hash}`);
  if (response.transaction_id)
    console.log(`  transaction_id: ${response.transaction_id}`);
  console.log(`  explorer:       ${EXPLORER}/tx/${hash}`);
  console.log(
    `\nVerify type 118, batched transfers, nonce_key=${nonceKey}:\n  cast tx ${hash} -r ${RPC_URL}\n  cast receipt ${hash} -r ${RPC_URL}`,
  );
  console.log(
    `\nExpect two Transfer logs (alphaUSD + thetaUSD) to ${recipient}, gas paid from thetaUSD balance.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

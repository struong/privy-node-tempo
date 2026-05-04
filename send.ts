/**
 * Privy Node SDK + Tempo Moderato example.
 *
 * Sends a standard EIP-1559 (type 2) alphaUSD (TIP-20) transfer from a
 * Privy-managed wallet on Tempo Moderato (chain 42431).
 *
 * Run: bun run send
 */

import { PrivyClient } from "@privy-io/node";
import { encodeFunctionData, parseAbi, getAddress, type Hex } from "viem";

const RPC_URL = "https://rpc.moderato.tempo.xyz";
const EXPLORER = "https://explorer.moderato.tempo.xyz";
const CHAIN_ID = 42431;
const CAIP2 = `eip155:${CHAIN_ID}` as const;

// alphaUSD TIP-20 stablecoin on Tempo Moderato.
const ALPHA_USD = "0x20C0000000000000000000000000000000000001" as const;

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function fundAddress(address: string): Promise<void> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tempo_fundAddress",
      params: [address],
    }),
  });
  const json = (await res.json()) as { error?: { message: string } };
  if (json.error) throw new Error(`tempo_fundAddress failed: ${json.error.message}`);
}

async function main() {
  const appId = need("PRIVY_APP_ID");
  const appSecret = need("PRIVY_APP_SECRET");
  const recipient = getAddress(
    process.env.RECIPIENT ?? "0x000000000000000000000000000000000000dEaD",
  );
  const amount = BigInt(process.env.AMOUNT ?? "1000000"); // 1.00 alphaUSD (6 decimals)

  const privy = new PrivyClient({ appId, appSecret });

  // Reuse existing wallet if WALLET_ID set, else create + fund a fresh one.
  let walletId = process.env.WALLET_ID;
  let walletAddress: string | undefined;

  if (!walletId) {
    console.log("Creating new Privy wallet…");
    const created = await privy.wallets().create({ chain_type: "ethereum" });
    walletId = created.id;
    walletAddress = created.address;
    console.log(`  wallet id:      ${walletId}`);
    console.log(`  wallet address: ${walletAddress}`);
    console.log("Funding via tempo_fundAddress…");
    await fundAddress(walletAddress!);
  } else {
    console.log(`Reusing wallet id: ${walletId}`);
  }

  // Encode transfer(recipient, amount) on alphaUSD.
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [recipient, amount],
  }) as Hex;

  console.log(`Sending alphaUSD transfer:`);
  console.log(`  token:     ${ALPHA_USD}`);
  console.log(`  to:        ${recipient}`);
  console.log(`  amount:    ${amount.toString()} (base units)`);

  const response = await privy.wallets().ethereum().sendTransaction(walletId, {
    caip2: CAIP2,
    params: {
      transaction: {
        to: ALPHA_USD,
        data,
        value: "0x0",
        chain_id: CHAIN_ID,
        type: 2,
      },
    },
  });

  const hash = response.hash;
  console.log("\n✅ Broadcasted");
  console.log(`  tx hash: ${hash}`);
  console.log(`  explorer: ${EXPLORER}/tx/${hash}`);
  console.log(
    `\nVerify with:\n  cast tx ${hash} -r ${RPC_URL}\n  cast receipt ${hash} -r ${RPC_URL}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

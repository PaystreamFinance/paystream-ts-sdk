import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import {
  calculateBorrowRate,
  calculateDepositRate,
  calculateInterestRate,
  calculateUtilization,
  DRIFT_PROGRAM_ID,
} from "@drift-labs/sdk/lib/node";
import { BulkAccountLoader, DriftClient } from "@drift-labs/sdk/lib/node";
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import { DriftOptimizer } from "../types/drift_optimizer";
import DRIFT_OPTIMIZER_IDL from "../idls/drift_optimizer.json";
import { DriftOptimizerState } from "../types";
import { PaystreamV1Program } from "./paystream-client";
import { IdlCoder } from "@coral-xyz/anchor/dist/cjs/coder/borsh/idl";
import { decode } from "@coral-xyz/anchor/dist/cjs/utils/bytes/base64";

export class DriftOptimizerProgram {
  private driftClient: DriftClient;
  private program: Program<DriftOptimizer>;
  private wallet: PublicKey;
  private SYSVAR_PROGRAM_ID = SYSVAR_INSTRUCTIONS_PUBKEY;
  constructor(provider: AnchorProvider) {
    const devnetBulkAccountLoader = new BulkAccountLoader(
      provider.connection,
      "processed",
      1
    );
    this.driftClient = new DriftClient({
      connection: provider.connection,
      wallet: provider.wallet,
      programID: new PublicKey(DRIFT_PROGRAM_ID),
      userStats: false,
      env: provider.connection.rpcEndpoint.includes("devnet")
        ? "devnet"
        : "mainnet-beta",
      accountSubscription: {
        type: "polling",
        accountLoader: devnetBulkAccountLoader,
      },
    });
    this.program = new Program<DriftOptimizer>(DRIFT_OPTIMIZER_IDL, provider);
    this.wallet = provider.wallet.publicKey;
  }
  driftOptimizerStatePda(market: PublicKey, mint: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("optimizer"), market.toBuffer(), mint.toBuffer()],
      this.program.programId
    )[0];
  }
  async getOptimizer(
    market: PublicKey,
    mint: PublicKey
  ): Promise<DriftOptimizerState> {
    const optimizer = await this.program.account.driftOptimizer.fetch(
      this.driftOptimizerStatePda(market, mint)
    );
    return optimizer;
  }
  async initializeOptimizer(
    market: PublicKey,
    mint: PublicKey,
    marketIndex: number
  ) {
    return await this.program.methods
      .initialize(marketIndex)
      .accounts({
        market,
        mint,
        protocolProgram: DRIFT_PROGRAM_ID,
        authority: this.wallet,
        caller: PaystreamV1Program.programId,
      })
      .rpc();
  }
  getSpotMarketPda(marketIndex: number) {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("spot_market"),
        new BN(marketIndex).toArrayLike(Buffer, "le", 2),
      ],
      new PublicKey(DRIFT_PROGRAM_ID)
    )[0];
  }
  async getApys(market: PublicKey, mint: PublicKey) {
    try {
      await this.driftClient.subscribe();
      const driftOptimizerState = await this.getOptimizer(market, mint);
      const spotMarketPda = this.getSpotMarketPda(
        driftOptimizerState.marketIndex
      );
      const simulationResult = await this.program.methods
        .getApys()
        .accounts({
          state: this.driftOptimizerStatePda(market, mint),
          sysIx: this.SYSVAR_PROGRAM_ID,
        })
        .remainingAccounts([
          {
            pubkey: spotMarketPda,
            isWritable: false,
            isSigner: false,
          },
        ])
        .simulate({ skipPreflight: true });
      console.log("Simulation result", simulationResult);

      const returnPrefix = `Program return: ${this.program.programId.toBase58()} `;
      let returnLog = simulationResult.raw.find((l) =>
        l.startsWith(returnPrefix)
      )!;
      console.log(returnLog);
      let returnData = decode(returnLog.slice(returnPrefix.length));
      const coder = IdlCoder.fieldLayout({ type: { array: ["u128", 2] } });
      const returnDataDecoded: [BN, BN] = coder.decode(returnData);
      console.log(
        "Borrow rate from Optimizer",
        returnDataDecoded[0].toNumber()
      );
      console.log(
        "Deposit rate from Optimizer",
        returnDataDecoded[1].toNumber()
      );
      const spotMarket = this.driftClient.getSpotMarketAccount(
        driftOptimizerState.marketIndex
      )!;
      const utilization = calculateUtilization(spotMarket);
      const depositRate = calculateDepositRate(
        spotMarket,
        undefined,
        utilization
      );
      const borrowRate = calculateBorrowRate(
        spotMarket,
        undefined,
        utilization
      );
      const interestRate = calculateInterestRate(
        spotMarket,
        undefined,
        utilization
      );
      console.log("Borrow rate from Drift Client", borrowRate.toNumber());
      console.log("Deposit rate from Drift Client", depositRate.toNumber());
      console.log("Interest rate from Drift Client", interestRate.toNumber());
      return {
        borrowRate: returnDataDecoded[0].toNumber(),
        supplyRate: returnDataDecoded[1].toNumber(),
      };
    } catch (error) {
      console.log("error");
      console.log(error);
      return null;
    }
  }
}

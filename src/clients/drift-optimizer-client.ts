import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { IdlCoder } from "@coral-xyz/anchor/dist/cjs/coder/borsh/idl";
import { SimulateResponse } from "@coral-xyz/anchor/dist/cjs/program/namespace/simulate";
import { decode } from "@coral-xyz/anchor/dist/cjs/utils/bytes/base64";
import {
  calculateBorrowRate,
  calculateDepositRate,
  calculateUtilization,
  DevnetSpotMarkets,
  DRIFT_PROGRAM_ID,
  DriftClient,
  getDriftSignerPublicKey,
  MainnetSpotMarkets,
  SpotMarketConfig,
} from "@drift-labs/sdk";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  AccountMeta,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import DRIFT_OPTIMIZER_IDL from "../idls/drift_optimizer.json";
import PaystreamV1IDL from "../idls/paystream_v1.json";
import { calculate_interest_rate_from_protocol_apys } from "../math";
import { DriftMetrics, DriftProtocolConfig } from "../types";
import { DriftOptimizer } from "../types/drift_optimizer";

export class DriftOptimizerProgram {
  private driftClient: DriftClient;
  private program: Program<DriftOptimizer>;
  private provider: AnchorProvider;
  private wallet: PublicKey;
  private _programId: PublicKey;
  static readonly programId = new PublicKey(DRIFT_OPTIMIZER_IDL.address);
  constructor(provider: AnchorProvider) {
    this.driftClient = new DriftClient({
      connection: provider.connection,
      wallet: provider.wallet,
      programID: new PublicKey(DRIFT_PROGRAM_ID),
      userStats: false,
      env: provider.connection.rpcEndpoint.includes("mainnet")
        ? "mainnet-beta"
        : provider.connection.rpcEndpoint.includes("devnet")
        ? "devnet"
        : undefined,
      accountSubscription: {
        type: "websocket",
      },
    });
    this.provider = provider;
    this.program = new Program<DriftOptimizer>(DRIFT_OPTIMIZER_IDL, provider);
    this.wallet = provider.wallet.publicKey;
    this._programId = this.program.programId;
  }
  get programId() {
    return this._programId;
  }
  async getProtocolConfig(
    mint: PublicKey,
    collateralMint: PublicKey
  ): Promise<DriftProtocolConfig> {
    await this.driftClient.subscribe();
    let configs: SpotMarketConfig[] = [];
    if (this.program.provider.connection.rpcEndpoint.includes("devnet")) {
      configs = DevnetSpotMarkets;
    } else if (
      this.program.provider.connection.rpcEndpoint.includes("mainnet")
    ) {
      configs = MainnetSpotMarkets;
    } else {
      throw new Error("Not implemented for this network");
    }
    const spotMarket = configs.find((m) => m.mint.equals(mint));
    const collateralSpotMarket = configs.find((m) =>
      m.mint.equals(collateralMint)
    );
    if (!spotMarket) {
      throw new Error(`Config not found for mint: ${mint.toBase58()}`);
    }
    if (!collateralSpotMarket) {
      throw new Error(
        `Config not found for collateral mint: ${collateralMint.toBase58()}`
      );
    }

    // get token program from the mint
    const market = this.driftClient.getSpotMarketAccount(
      spotMarket.marketIndex
    );
    const collateralMarket = this.driftClient.getSpotMarketAccount(
      collateralSpotMarket.marketIndex
    );
    if (!market) {
      throw new Error(`Market not found for mint: ${mint.toBase58()}`);
    }
    if (!collateralMarket) {
      throw new Error(
        `Collateral market not found for mint: ${collateralMint.toBase58()}`
      );
    }
    return {
      protocol: "drift",
      state: this.getDriftStatePda(),
      spotMarketAccount: market,
      collateralSpotMarketAccount: collateralMarket,
      protocolVault: market?.vault,
      protocolVaultAuthority: getDriftSignerPublicKey(
        new PublicKey(DRIFT_PROGRAM_ID)
      ),
      collateralMint,
      mint,
      tokenProgram:
        market?.tokenProgramFlag == 0 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID,
      collateralTokenProgram:
        collateralMarket?.tokenProgramFlag == 0
          ? TOKEN_PROGRAM_ID
          : TOKEN_2022_PROGRAM_ID,
      optimizerProgram: this.program.programId,
      protocolProgram: new PublicKey(DRIFT_PROGRAM_ID),
      userAccount: this.getUserAccountPda(),
      userStats: this.getUserStatsPda(),
      driftSigner: getDriftSignerPublicKey(new PublicKey(DRIFT_PROGRAM_ID)),
    };
  }

  getDriftMetrics(driftConfig: DriftProtocolConfig): DriftMetrics {
    const utilizationRate = calculateUtilization(driftConfig.spotMarketAccount);
    const depositRate = calculateDepositRate(
      driftConfig.spotMarketAccount,
      undefined,
      utilizationRate
    );

    const borrowRate = calculateBorrowRate(
      driftConfig.spotMarketAccount,
      undefined,
      utilizationRate
    );

    const totalDeposits = driftConfig.spotMarketAccount.depositBalance;
    const totalBorrows = driftConfig.spotMarketAccount.borrowBalance;

    return {
      ...driftConfig,
      depositRate,
      borrowRate,
      utilizationRate,
      totalDeposits,
      totalBorrows,
    };
  }
  async getRemainingAccounts(
    mint: PublicKey,
    collateralMint: PublicKey
  ): Promise<AccountMeta[]> {
    const remainingAccounts: AccountMeta[] = [];
    const config = await this.getProtocolConfig(mint, collateralMint);
    remainingAccounts.push({
      pubkey: config.state,
      isSigner: false,
      isWritable: false,
    });
    remainingAccounts.push({
      pubkey: config.userAccount,
      isSigner: false,
      isWritable: true,
    });
    remainingAccounts.push({
      pubkey: config.userStats,
      isSigner: false,
      isWritable: true,
    });
    remainingAccounts.push({
      pubkey: config.spotMarketAccount.pubkey,
      isSigner: false,
      isWritable: true,
    });
    remainingAccounts.push({
      pubkey: config.collateralSpotMarketAccount.pubkey,
      isSigner: false,
      isWritable: false,
    });
    console.log("remainingAccounts", {
      state: config.state.toBase58(),
      userAccount: config.userAccount.toBase58(),
      userStats: config.userStats.toBase58(),
      spotMarketAccount: config.spotMarketAccount.pubkey.toBase58(),
      collateralSpotMarketAccount:
        config.collateralSpotMarketAccount.pubkey.toBase58(),
    });
    return remainingAccounts;
  }
  paystreamVaultAuthorityPda() {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("paystream_vault_authority")],
      new PublicKey(PaystreamV1IDL.address)
    )[0];
  }
  driftOptimizerStatePda(): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("optimizer_state")],
      this.program.programId
    )[0];
  }
  marketOptimizerStatePda(market: PublicKey, mint: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("market_optimizer"), market.toBuffer(), mint.toBuffer()],
      this.program.programId
    )[0];
  }
  async getDriftOptimizerState() {
    const optimizer = await this.program.account.driftOptimizerState.fetch(
      this.driftOptimizerStatePda()
    );
    return optimizer;
  }
  async getAllDriftOptimizerStates() {
    const optimizers = await this.program.account.driftOptimizerState.all();
    return optimizers.map((optimizer) => ({
      ...optimizer.account,
      publicKey: optimizer.publicKey,
    }));
  }
  async getDriftMarketOptimizerState(market: PublicKey, mint: PublicKey) {
    const optimizer = await this.program.account.marketOptimizerState.fetch(
      this.marketOptimizerStatePda(market, mint)
    );
    return optimizer;
  }
  async getAllDriftMarketOptimizerStates() {
    const optimizers = await this.program.account.marketOptimizerState.all();
    return optimizers.map((optimizer) => ({
      ...optimizer.account,
      publicKey: optimizer.publicKey,
    }));
  }
  async initializeDriftOptimizerState(): Promise<TransactionInstruction> {
    const ix = await this.program.methods
      .initializeDriftState()
      .accounts({})
      .instruction();
    return ix;
  }
  async initializeMarketOptimizer(
    market: PublicKey,
    mint: PublicKey,
    collateralMint: PublicKey,
    marketIndex: number,
    collateralMarketIndex: number
  ): Promise<TransactionInstruction[]> {
    console.log("Subscribing to drift client");
    const isSubscribed = await this.driftClient.subscribe();
    console.log("Are we subscribed?", isSubscribed);
    const instructions: TransactionInstruction[] = [];
    const config = await this.getProtocolConfig(mint, collateralMint);
    const remainingAccounts: AccountMeta[] = [];
    remainingAccounts.push({
      pubkey: config.spotMarketAccount.pubkey,
      isSigner: false,
      isWritable: false,
    });
    remainingAccounts.push({
      pubkey: config.collateralSpotMarketAccount.pubkey,
      isSigner: false,
      isWritable: false,
    });
    const ix = await this.program.methods
      .initializeMarketOptimizer(marketIndex, collateralMarketIndex)
      .accounts({
        market,
        mint,
        authority: this.wallet,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    instructions.push(ix);
    return instructions;
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
  getDriftStatePda() {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("drift_state")],
      new PublicKey(DRIFT_PROGRAM_ID)
    )[0];
  }
  getUserAccountPda() {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("user"),
        this.paystreamVaultAuthorityPda().toBuffer(),
        new BN(0).toArrayLike(Buffer, "le", 2),
      ],
      new PublicKey(DRIFT_PROGRAM_ID)
    )[0];
  }
  getUserStatsPda() {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("user_stats"), this.paystreamVaultAuthorityPda().toBuffer()],
      new PublicKey(DRIFT_PROGRAM_ID)
    )[0];
  }
  async getApys(market: PublicKey, mint: PublicKey) {
    try {
      await this.driftClient.subscribe();
      const driftOptimizerState = await this.getDriftMarketOptimizerState(
        market,
        mint
      );
      const spotMarketPda = this.getSpotMarketPda(
        driftOptimizerState.marketIndex
      );
      const simulationResult = await this.program.methods
        .getApys(mint)
        .accounts({
          state: this.driftOptimizerStatePda(),
          marketOptimizerState: this.marketOptimizerStatePda(market, mint),
        })
        .remainingAccounts([
          {
            pubkey: spotMarketPda,
            isWritable: false,
            isSigner: false,
          },
        ])
        .simulate();
      const returnPrefix = `Program return: ${this.program.programId.toBase58()} `;
      let returnLog = simulationResult.raw.find((l) =>
        l.startsWith(returnPrefix)
      )!;
      let returnData = decode(returnLog.slice(returnPrefix.length));
      const coder = IdlCoder.fieldLayout({ type: { array: ["u128", 2] } });
      const returnDataDecoded: [BN, BN] = coder.decode(returnData);
      const midrateApy = calculate_interest_rate_from_protocol_apys(
        returnDataDecoded[0],
        returnDataDecoded[1],
        new BN(500000)
      );
      return {
        mint: mint.toBase58(),
        protocol: "drift",
        borrowRate: returnDataDecoded[0],
        supplyRate: returnDataDecoded[1],
        midRateYield: midrateApy,
      };
    } catch (error) {
      console.log("error");
      console.log(error);
      return null;
    }
  }
  async depositSimulate(
    market: PublicKey,
    mint: PublicKey,
    collateralMint: PublicKey,
    paystreamVault: PublicKey,
    oracle: PublicKey,
    collateralOracle: PublicKey,
    amount: BN
  ): Promise<SimulateResponse> {
    try {
      await this.driftClient.subscribe();
      const config = await this.getProtocolConfig(mint, collateralMint);
      const remainingAccounts = await this.getRemainingAccounts(
        mint,
        collateralMint
      );
      const simulationResult = await this.program.methods
        .deposit(amount)
        .accounts({
          accounts: {
            mint,
            protocolProgram: DRIFT_PROGRAM_ID,
            paystreamVaultAuthority: this.paystreamVaultAuthorityPda(),
            paystreamVault: paystreamVault,
            tokenProgram: config.tokenProgram,
            oracle: oracle,
            protocolVault: config.protocolVault,
            collateralOracle: collateralOracle,
            protocolVaultAuthority: config.protocolVaultAuthority,
          },
          state: this.driftOptimizerStatePda(),
          marketOptimizerState: this.marketOptimizerStatePda(market, mint),
        })
        .remainingAccounts(remainingAccounts)
        .simulate();
      return simulationResult;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async withdrawSimulate(
    market: PublicKey,
    mint: PublicKey,
    collateralMint: PublicKey,
    paystreamVault: PublicKey,
    oracle: PublicKey,
    collateralOracle: PublicKey,
    amount: BN
  ): Promise<SimulateResponse> {
    try {
      await this.driftClient.subscribe();
      const config = await this.getProtocolConfig(mint, collateralMint);
      const remainingAccounts = await this.getRemainingAccounts(
        mint,
        collateralMint
      );
      const simulationResult = await this.program.methods
        .withdraw(amount)
        .accounts({
          accounts: {
            mint,
            protocolProgram: DRIFT_PROGRAM_ID,
            paystreamVaultAuthority: this.paystreamVaultAuthorityPda(),
            paystreamVault: paystreamVault,
            tokenProgram: config.tokenProgram,
            oracle: oracle,
            protocolVault: config.protocolVault,
            collateralOracle: collateralOracle,
            protocolVaultAuthority: config.protocolVaultAuthority,
          },
          state: this.driftOptimizerStatePda(),
          marketOptimizerState: this.marketOptimizerStatePda(market, mint),
        })
        .remainingAccounts(remainingAccounts)
        .simulate();
      return simulationResult;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async updateAuthority(newAuthority: PublicKey) {
    return this.program.methods
      .updateMarketAuthority(newAuthority)
      .accounts({
        state: this.driftOptimizerStatePda(),
        authority: this.wallet,
      })
      .instruction();
  }
}

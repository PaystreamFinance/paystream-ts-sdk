import {
  AnchorProvider,
  BN,
  Program,
  ProgramAccount,
  utils,
  web3,
} from "@coral-xyz/anchor";
// import { getSimulationComputeUnits } from "@solana-developers/helpers";
import {
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
} from "@solana/spl-token";
import {
  AccountMeta,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  ParsedAccountData,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  deserializeRedBlackTree,
  getNodeIndices,
  matchIdBeet,
  MatchIdWrapper,
  matchStateBeet,
  publicKeyBeet,
  traderStateBeet,
} from "../beet";
import PaystreamV1IDL from "../idls/paystream_v1.json";
import {
  calculate_interest_rate_from_protocol_apys,
  calculate_max_borrow_amount,
  calculate_required_collateral,
  get_borrow_price_in_collateral_mint_scaled,
  get_collateral_price_in_borrow_mint_scaled,
  PRICE_PRECISION,
} from "../math";
import {
  OracleClient,
  OracleSourceNum,
  PaystreamMetrics,
  PythLazerOracles,
  PythOracles,
  PythPullOracles,
  WSOL_MINT,
  type Amount,
  type DriftProtocolConfig,
  type MarketConfig,
  type MarketData,
  type MarketDataUI,
  type MarketHeader,
  type MarketHeaderWithPubkey,
  type MarketPriceData,
  type MatchState,
  type MatchStateUI,
  type Protocol,
  type ProtocolConfig,
  type Seat,
  type TraderPosition,
  type TraderPositionUI,
  type TraderState,
} from "../types";
import { PaystreamV1 } from "../types/paystream_v1";
import { DriftOptimizerProgram } from "./drift-optimizer-client";
import {
  PythClient,
  PythLazerClient,
  PythPullClient,
  QuoteAssetOracleClient,
} from "./pyth";

class PaystreamError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "PaystreamError";
  }
}

export class PaystreamV1Program {
  private program: Program<PaystreamV1>;
  private driftOptimizerProgram: DriftOptimizerProgram;
  private getOracleClient: (
    oraclePublicKey: PublicKey,
    oracleSource: number
  ) => OracleClient;
  private wallet: web3.PublicKey;
  public readonly NUM_TRADERS = 32;
  public readonly NUM_MATCHES = 128;
  static readonly programId = new PublicKey(PaystreamV1IDL.address);
  constructor(provider: AnchorProvider) {
    this.program = new Program(
      PaystreamV1IDL as unknown as PaystreamV1,
      provider
    );
    this.wallet = provider.publicKey;
    this.driftOptimizerProgram = new DriftOptimizerProgram(provider);
    this.getOracleClient = (
      oraclePublicKey: PublicKey,
      oracleSource: number
    ) => {
      if (PythPullOracles.has(oracleSource)) {
        return new PythPullClient(provider, oraclePublicKey, oracleSource);
      } else if (PythOracles.has(oracleSource)) {
        return new PythClient(provider, oraclePublicKey, oracleSource);
      } else if (PythLazerOracles.has(oracleSource)) {
        return new PythLazerClient(provider, oraclePublicKey, oracleSource);
      } else if (oracleSource == OracleSourceNum.QUOTE_ASSET) {
        return new QuoteAssetOracleClient();
      } else {
        console.error("Invalid oracle source", oracleSource);
        throw new Error("Invalid oracle source");
      }
    };
  }
  updateProvider(provider: AnchorProvider) {
    this.program = new Program(
      PaystreamV1IDL as unknown as PaystreamV1,
      provider
    );
    this.wallet = provider.publicKey;
  }

  get programId(): web3.PublicKey {
    return this.program.programId;
  }

  // getProviderFromKeypair(keypair: web3.Keypair): AnchorProvider {
  //   return new AnchorProvider(
  //     this.program.provider.connection,
  //     new Wallet(keypair),
  //     { commitment: "confirmed" }
  //   );
  // }

  // PDAs
  getMarketHeaderPda(
    market: web3.PublicKey,
    mint: web3.PublicKey
  ): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market_header"), market.toBuffer(), mint.toBuffer()],
      this.program.programId
    )[0];
  }

  getMarketVaultPda(
    market: web3.PublicKey,
    mint: web3.PublicKey
  ): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market_vault"), market.toBuffer(), mint.toBuffer()],
      this.program.programId
    )[0];
  }

  getSeatPda(
    marketHeader: web3.PublicKey,
    trader: web3.PublicKey
  ): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync(
      [Buffer.from("seat"), marketHeader.toBuffer(), trader.toBuffer()],
      this.program.programId
    )[0];
  }

  // Account fetching methods
  async getMarketHeader(
    market: web3.PublicKey,
    mint: web3.PublicKey
  ): Promise<MarketHeader> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    return this.program.account.marketHeader.fetch(marketHeaderPda);
  }

  async getAllMarketHeaders(): Promise<MarketHeaderWithPubkey[]> {
    const marketHeaders = await this.program.account.marketHeader.all();
    // Get decimals for all markets first
    const headersWithDecimals = await Promise.all(
      marketHeaders.map(async (header) => ({
        header,
        decimals: await this.getTokenDecimals(header.account.mint),
      }))
    );

    // Sort based on decimals (9 before 6)
    const sortedHeaders = headersWithDecimals
      .sort((a, b) => b.decimals - a.decimals)
      .map(({ header }) => header);

    return sortedHeaders.map((marketHeader) => ({
      ltvRatio: marketHeader.account.ltvRatio,
      liquidationThreshold: marketHeader.account.liquidationThreshold,
      oracle: marketHeader.account.oracle,
      oracleSource: marketHeader.account.oracleSource,
      collateralOracle: marketHeader.account.collateralOracle,
      collateralOracleSource: marketHeader.account.collateralOracleSource,
      vaultBump: marketHeader.account.vaultBump,
      bump: marketHeader.account.bump,
      optimizerProgram: marketHeader.account.optimizerProgram,
      publicKey: marketHeader.publicKey,
      marketId: marketHeader.account.marketId,
      market: marketHeader.account.market,
      collateralMarket: marketHeader.account.collateralMarket,
      mint: marketHeader.account.mint,
      collateralMint: marketHeader.account.collateralMint,
      tokenProgram: marketHeader.account.tokenProgram,
      collateralTokenProgram: marketHeader.account.collateralTokenProgram,
      status: marketHeader.account.status,
      authority: marketHeader.account.authority,
      vault: marketHeader.account.vault,
      feeRecipient: marketHeader.account.feeRecipient,
    }));
  }

  async getSeat(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    trader: web3.PublicKey
  ): Promise<Seat> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const seatPda = this.getSeatPda(marketHeaderPda, trader);
    return this.program.account.seat.fetch(seatPda);
  }

  async getAllSeatsForTrader(
    trader: web3.PublicKey
  ): Promise<ProgramAccount<Seat>[]> {
    return this.program.account.seat.all([
      {
        memcmp: {
          offset: 32, // trader_key offset in Seat struct
          bytes: trader.toBase58(),
        },
      },
    ]);
  }
  async getAllSeats(): Promise<ProgramAccount<Seat>[]> {
    return this.program.account.seat.all();
  }

  // Helper methods
  private convertToBN(amount: Amount): BN {
    if (typeof amount === "string") {
      return new BN(amount);
    } else if (typeof amount === "number") {
      return new BN(amount.toString());
    }
    return amount;
  }

  async getTokenDecimals(mint: web3.PublicKey): Promise<number> {
    // Implement token decimal fetching
    const result = await this.program.provider.connection.getParsedAccountInfo(
      mint,
      {
        commitment: "confirmed",
      }
    );

    const { parsed } = result?.value?.data as ParsedAccountData;
    if (!parsed?.info?.decimals) {
      throw new Error("Token has no decimals");
    }
    return parsed.info.decimals;
  }

  private deserializeMarketData(data: Buffer): MarketData {
    // Read market header data (first 16 bytes)
    const matchSequenceNumber = new BN(data.subarray(0, 8), "le");

    // Calculate remaining buffer after header
    const remaining = data.subarray(8);

    // Calculate sizes for each tree
    const tradersSize =
      16 + 16 + (16 + 32 + traderStateBeet.byteSize) * this.NUM_TRADERS;
    const matchesSize =
      16 + 16 + (16 + matchStateBeet.byteSize) * this.NUM_MATCHES;

    let offset = 0;

    // Get traders buffer and deserialize
    const traderBuffer = remaining.subarray(offset, offset + tradersSize);
    const traders = new Map<string, TraderState>();
    for (const [k, traderState] of deserializeRedBlackTree(
      traderBuffer,
      publicKeyBeet,
      traderStateBeet
    )) {
      traders.set(k.publicKey.toString(), traderState);
    }
    offset += tradersSize;

    // Get matches buffer and deserialize
    const matchBuffer = remaining.subarray(offset, offset + matchesSize);
    const matches = deserializeRedBlackTree(
      matchBuffer,
      matchIdBeet,
      matchStateBeet,
      (wrapper: MatchIdWrapper) => new BN(wrapper.matchId)
    ) as Map<BN, MatchState>;

    // Get trader indices for lookup
    const traderPubkeyToTraderIndex = getNodeIndices(
      traderBuffer,
      publicKeyBeet,
      traderStateBeet
    );

    // Create reverse lookup map
    const traderIndexToTraderPubkey = new Map<string, string>();
    for (const [key, index] of traderPubkeyToTraderIndex.entries()) {
      traderIndexToTraderPubkey.set(index.toString(), key.publicKey.toString());
    }

    return {
      matchSequenceNumber,
      traders,
      matches,
      traderIndexToTrader: traderIndexToTraderPubkey,
    };
  }

  async getMarket(marketPublicKey: web3.PublicKey): Promise<MarketData> {
    const marketData = await this.program.provider.connection.getAccountInfo(
      marketPublicKey
    );
    if (!marketData) {
      throw new Error("Invalid market not found");
    }
    const marketDataBuffer = Buffer.from(marketData.data);
    return this.deserializeMarketData(marketDataBuffer);
  }

  // Enhanced account fetching methods
  async getTraderPosition(
    marketPublicKey: web3.PublicKey,
    trader: web3.PublicKey
  ): Promise<TraderPosition | null> {
    try {
      const marketData = await this.program.provider.connection.getAccountInfo(
        marketPublicKey
      );
      if (!marketData) {
        throw new Error("Invalid market not found");
      }
      const marketDataBuffer = Buffer.from(marketData.data);
      const market = this.deserializeMarketData(marketDataBuffer);
      const traderState = market.traders.get(trader.toBase58());
      if (!traderState) return null;
      return {
        onVaultLends: new BN(traderState.onVaultLends),
        inP2pLends: new BN(traderState.inP2pLends),
        onVaultBorrows: new BN(traderState.onVaultBorrows),
        inP2pBorrows: new BN(traderState.inP2pBorrows),
        collateralAmount: new BN(traderState.collateralAmount),
        isP2pEnabled: new BN(traderState.flags).eq(new BN(1)),
      };
    } catch (e) {
      console.error("Error fetching trader position:", e);
      return null;
    }
  }

  async getVaultBalance(
    market: web3.PublicKey,
    mint: web3.PublicKey
  ): Promise<BN> {
    const vault = this.getMarketVaultPda(market, mint);
    const vaultBalance =
      await this.program.provider.connection.getTokenAccountBalance(vault);
    const { value } = vaultBalance;
    if (!value) {
      throw new Error("Vault balance not found");
    }
    return new BN(value.amount);
  }

  async requestSeat(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    trader: web3.PublicKey
  ): Promise<string> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const tx = await this.program.methods
      .requestSeat()
      .accounts({
        trader: trader,
        marketHeader: marketHeaderPda,
      })
      .rpc();

    return tx;
  }

  async getProtocolByName(
    protocol: Protocol,
    mint: web3.PublicKey,
    collateralMint: web3.PublicKey
  ): Promise<ProtocolConfig | DriftProtocolConfig> {
    switch (protocol) {
      case "drift":
        return this.driftOptimizerProgram.getProtocolConfig(
          mint,
          collateralMint
        );
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
  async getRemainingAccountsByProtocol(
    protocol: Protocol,
    mint: web3.PublicKey,
    collateralMint: web3.PublicKey
  ): Promise<AccountMeta[]> {
    switch (protocol) {
      case "drift":
        return this.driftOptimizerProgram.getRemainingAccounts(
          mint,
          collateralMint
        );
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
  getProtocolNameByOptimizerProgram(
    optimizerProgram: web3.PublicKey
  ): Protocol {
    switch (optimizerProgram.toBase58()) {
      case this.driftOptimizerProgram.programId.toBase58():
        return "drift";
      default:
        throw new Error(
          `Unknown optimizer program: ${optimizerProgram.toBase58()}`
        );
    }
  }

  /**
   * Get protocol metrics
   * @param config - Market configuration
   * @param marketData - Market data
   * @returns Protocol metrics
   * Includes the deposits, borrows, and apy rates for the drift protocol and paystream protocol.
   */
  async getProtocolMetrics(
    config: MarketConfig,
    marketData: MarketDataUI
  ): Promise<PaystreamMetrics<Protocol>> {
    switch (config.optimizerProtocol) {
      case "drift":
        const driftConfig = await this.driftOptimizerProgram.getProtocolConfig(
          config.mint,
          config.collateralMint
        );
        const driftMetrics =
          this.driftOptimizerProgram.getDriftMetrics(driftConfig);
        const midRateApy = calculate_interest_rate_from_protocol_apys(
          driftMetrics.borrowRate,
          driftMetrics.depositRate,
          new BN(500000) // 50%
        );

        const paystreamMetrics: PaystreamMetrics<Protocol> = {
          protocolMetrics: driftMetrics,
          midRateApy: midRateApy,
          totalDepositsOnVault: marketData.stats.deposits.lendAmountUnmatched,
          totalBorrowsOnVault: marketData.stats.borrows.borrowAmountUnmatched,
          totalDepositsInP2p: marketData.stats.totalAmountInP2p,
          marketStats: marketData.stats,
        };
        return paystreamMetrics;
      default:
        throw new Error(`Unknown protocol: ${config.optimizerProtocol}`);
    }
  }

  public async rpc(
    ixs: TransactionInstruction[],
    lookupTables?: AddressLookupTableAccount[],
    priorityFee?: number // in micro-lamports
  ): Promise<string> {
    try {
      if (
        !this.program.provider.wallet ||
        !this.program.provider.sendAndConfirm
      ) {
        throw new Error("Wallet not found");
      }
      const lockedWritableAccounts = ixs
        .flatMap((ix) => ix.keys)
        .filter((key) => key.isWritable)
        .map((key) => key.pubkey);
      const getComputeUnitPrice = async () => {
        const fees =
          await this.program.provider.connection.getRecentPrioritizationFees({
            lockedWritableAccounts,
          });
        // get the highest fee
        return fees.sort((a, b) => b.prioritizationFee - a.prioritizationFee)[0]
          .prioritizationFee;
      };
      const [microLamports, units, recentBlockhash] = await Promise.all([
        priorityFee ?? (await getComputeUnitPrice()),
        300_000,
        // await getSimulationComputeUnits(
        // this.program.provider.connection,
        // ixs,
        // this.program.provider.wallet.publicKey,
        // lookupTables ?? []
        // )
        // 600_000,
        this.program.provider.connection.getLatestBlockhash(),
      ]);
      const computeBudgetUnits = Math.max(Math.min(units, 1_400_000), 300_000);
      const computeBudgetMicroLamports = Math.max(
        Math.min(microLamports, 50_000),
        10_000
      );
      console.log("Compute Budget Units", computeBudgetUnits);
      console.log("Compute Budget MicroLamports", computeBudgetMicroLamports);
      const computeBudgetIxs = [
        ComputeBudgetProgram.setComputeUnitLimit({
          units: computeBudgetUnits,
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: computeBudgetMicroLamports,
        }),
      ];
      ixs.unshift(...computeBudgetIxs);
      const tx = new VersionedTransaction(
        new TransactionMessage({
          instructions: ixs,
          recentBlockhash: recentBlockhash.blockhash,
          payerKey: this.program.provider.wallet.publicKey,
        }).compileToV0Message(lookupTables)
      );

      console.log("Sending transaction...");
      const signature = await this.program.provider.sendAndConfirm(tx);
      console.log("Transaction Successful, signature:", signature);
      return signature;
    } catch (err) {
      console.error("Error sending transaction:", err);
      throw err;
    }
  }

  public async getWrappedSolIxs(
    amount: BN,
    isDeposit: boolean
  ): Promise<{
    preInstructions: TransactionInstruction[];
    postInstructions: TransactionInstruction[];
    associatedTokenAccount: PublicKey;
  }> {
    let associatedTokenAccount = this.wallet;
    const preInstructions = [];

    const { ixs, pubkey } = await this.getWrappedSolAccountCreationIxs(
      amount,
      isDeposit
    );
    preInstructions.push(...ixs);
    associatedTokenAccount = pubkey;

    const postInstructions = [];
    postInstructions.push(
      createCloseAccountInstruction(
        associatedTokenAccount,
        this.wallet,
        this.wallet,
        []
      )
    );

    return { preInstructions, postInstructions, associatedTokenAccount };
  }
  public async getWrappedSolAccountCreationIxs(
    amount: BN,
    includeRent?: boolean
  ): Promise<{
    ixs: TransactionInstruction[];
    pubkey: PublicKey;
  }> {
    const authority = this.wallet;
    // Calculate a publicKey that will be controlled by the authority.
    const wrappedSolAccount = utils.token.associatedAddress({
      mint: WSOL_MINT,
      owner: authority,
    });

    const result = {
      ixs: [] as TransactionInstruction[],
      pubkey: wrappedSolAccount,
    };
    // Check if the token account already exists
    const accountInfo = await this.program.provider.connection.getAccountInfo(
      wrappedSolAccount
    );

    if (!accountInfo) {
      result.ixs.push(
        createAssociatedTokenAccountInstruction(
          authority,
          wrappedSolAccount,
          authority,
          WSOL_MINT
        )
      );
    }

    result.ixs.push(
      SystemProgram.transfer({
        fromPubkey: authority,
        toPubkey: wrappedSolAccount,
        lamports: amount.toNumber(),
      })
    );
    result.ixs.push(createSyncNativeInstruction(wrappedSolAccount));

    return result;
  }

  /**
   * Toggle P2P lending with UI
   * @param config - Market configuration
   * @param enable - Whether to enable P2P lending
   * @returns Transaction signature
   */
  async toggleP2pLendingWithUI(
    config: MarketConfig,
    enable: boolean
  ): Promise<{
    signature: string;
  }> {
    this.logQuery("toggleP2pLendingWithUI", {
      config,
      enable,
    });
    const toggleP2pIx = await this.toggleP2pIx(
      config.market,
      config.mint,
      enable
    );
    const signature = await this.rpc([toggleP2pIx]);
    return { signature };
  }

  async toggleP2pIx(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    enable: boolean
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);

    const toggleP2pIx = await this.program.methods
      // @ts-ignore
      .toggleP2PLending(enable)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
      })
      .instruction();

    return toggleP2pIx;
  }

  async depositIx(
    config: MarketConfig,
    amount: BN,
    traderTokenAccount?: PublicKey
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.getMarketHeaderPda(config.market, config.mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);

    const { protocolProgram, protocolVault, protocolVaultAuthority } =
      await this.getProtocolByName(
        config.optimizerProtocol,
        config.mint,
        config.collateralMint
      );
    const remainingAccounts = await this.getRemainingAccountsByProtocol(
      config.optimizerProtocol,
      config.mint,
      config.collateralMint
    );
    const ix = await this.program.methods
      .depositCollateral(amount)
      .accountsPartial({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        protocolProgram,
        protocolVault,
        protocolVaultAuthority,
        traderTokenAccount: traderTokenAccount ? traderTokenAccount : undefined,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return ix;
  }

  // Enhanced instruction methods
  /**
   * Deposit with UI
   * @param config - Market configuration
   * @param amount - Amount to deposit as collateral, this increases the amount of collateral deposited,
   * This does not open a lending position, it only increases the amount of collateral deposited,
   * which is useful when the trader wants to borrow tokens in other markets.
   * @returns Transaction signature, updated position
   */
  async depositWithUI(
    config: MarketConfig,
    amount: Amount
  ): Promise<{
    signature: string;
    position: TraderPosition | null;
  }> {
    this.logQuery("depositWithUI", {
      config,
      amount: amount.toString(),
    });
    const bnAmount = this.convertToBN(amount);

    const isSolMarket = config.mint.equals(WSOL_MINT);
    const wsolIxs = isSolMarket
      ? await this.getWrappedSolIxs(bnAmount, true)
      : undefined;
    const transactionInstructions = [];
    if (wsolIxs) {
      transactionInstructions.push(...wsolIxs.preInstructions);
    }
    const depositIx = await this.depositIx(
      config,
      bnAmount,
      wsolIxs?.associatedTokenAccount
    );
    transactionInstructions.push(depositIx);
    if (wsolIxs) {
      transactionInstructions.push(...wsolIxs.postInstructions);
    }
    const signature = await this.rpc(transactionInstructions);
    const position = await this.getTraderPosition(config.market, this.wallet);

    return { signature, position };
  }

  async markAsCollateralIx(
    config: MarketConfig,
    amount: BN
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.getMarketHeaderPda(config.market, config.mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);
    const markAsCollateralIx = await this.program.methods
      .markAsCollateral(amount)
      .accountsPartial({
        marketHeader: marketHeaderPda,
        seat: seatPda,
      })

      .instruction();

    return markAsCollateralIx;
  }

  /**
   * Mark as collateral with UI
   * @param config - Market configuration
   * @param amount - Amount to mark as collateral, this increases the amount of collateral deposited,
   * by decreasing the amount of tokens lent to the vault, which was used to maintain a lending position.
   * This amount is now deposited as the collateral for the trader, which is useful when they want to borrow tokens in other markets.
   * @returns Transaction signature, updated position
   */
  async markAsCollateralWithUI(
    config: MarketConfig,
    amount: Amount
  ): Promise<{
    signature: string;
    position: TraderPosition | null;
  }> {
    this.logQuery("markAsCollateralWithUI", {
      config,
      amount: amount.toString(),
    });
    const bnAmount = this.convertToBN(amount);

    const markAsCollateralIx = await this.markAsCollateralIx(config, bnAmount);
    const transactionInstructions = [markAsCollateralIx];
    const signature = await this.rpc(transactionInstructions);
    const newPosition = await this.getTraderPosition(
      config.market,
      this.wallet
    );

    return { signature, position: newPosition };
  }

  async lendIx(
    config: MarketConfig,
    amount: BN
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.getMarketHeaderPda(config.market, config.mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);
    const { protocolProgram, protocolVault, protocolVaultAuthority } =
      await this.getProtocolByName(
        config.optimizerProtocol,
        config.mint,
        config.collateralMint
      );
    const remainingAccounts = await this.getRemainingAccountsByProtocol(
      config.optimizerProtocol,
      config.mint,
      config.collateralMint
    );
    const lendIx = await this.program.methods
      .lend(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        protocolProgram,
        protocolVault,
        protocolVaultAuthority,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return lendIx;
  }

  /**
   * Lend with UI
   * @param config - Market configuration
   * @param amount - Amount to lend, this increases the amount of tokens lent to the vault,
   * its tries to match it with a borrow, if there is no match,
   * the amount is added to the amount lent to the vault, earning normal rates and
   * increasing the amount of collateral deposited, which can be used to borrow token in other market.
   * @returns Transaction signature, updated position
   */
  async lendWithUI(
    config: MarketConfig,
    amount: Amount,
    isP2pEnabled: boolean | undefined
  ): Promise<{
    signature: string;
    position: TraderPosition | null;
  }> {
    this.logQuery("lendWithUI", {
      config,
      amount: amount.toString(),
    });
    const bnAmount = this.convertToBN(amount);
    const isSolMarket = config.mint.equals(WSOL_MINT);
    const wsolIxs =
      isSolMarket && (await this.getWrappedSolIxs(bnAmount, true));

    const transactionInstructions = [];
    if (isP2pEnabled == false) {
      const toggleP2pIx = await this.toggleP2pIx(
        config.market,
        config.mint,
        true
      );
      transactionInstructions.push(toggleP2pIx);
    }
    if (wsolIxs) {
      transactionInstructions.push(...wsolIxs.preInstructions);
    }
    const lendIx = await this.lendIx(config, bnAmount);
    transactionInstructions.push(lendIx);
    if (wsolIxs) {
      transactionInstructions.push(...wsolIxs.postInstructions);
    }
    const signature = await this.rpc(transactionInstructions);
    // Fetch updated position
    const newPosition = await this.getTraderPosition(
      config.market,
      this.wallet
    );

    return { signature, position: newPosition };
  }

  async borrowIx(
    config: MarketConfig,
    amount: BN
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.getMarketHeaderPda(config.market, config.mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);
    const { protocolProgram, protocolVault, protocolVaultAuthority } =
      await this.getProtocolByName(
        config.optimizerProtocol,
        config.mint,
        config.collateralMint
      );
    const collateralMarketHeaderPda = this.getMarketHeaderPda(
      config.collateralMarket,
      config.collateralMint
    );
    const remainingAccounts = await this.getRemainingAccountsByProtocol(
      config.optimizerProtocol,
      config.mint,
      config.collateralMint
    );
    const borrowIx = await this.program.methods
      .borrow(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        protocolProgram,
        protocolVault,
        protocolVaultAuthority,
        collateralMarketHeader: collateralMarketHeaderPda,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return borrowIx;
  }

  /**
   * Borrow with UI
   * @param config - Market configuration
   * @param amount - Amount to borrow
   * @returns Transaction signature, updated position, and collateral position
   */
  async borrowWithUI(
    config: MarketConfig,
    amount: Amount,
    isP2pEnabled: boolean | undefined
  ): Promise<{
    signature: string;
    position: TraderPositionUI | null;
    collateralPosition: TraderPositionUI | null;
  }> {
    this.logQuery("borrowWithUI", {
      config,
      amount: amount.toString(),
    });
    const bnAmount = this.convertToBN(amount);
    const transactionInstructions = [];
    if (isP2pEnabled == false) {
      const toggleP2pIx = await this.toggleP2pIx(
        config.market,
        config.mint,
        true
      );
      transactionInstructions.push(toggleP2pIx);
    }
    const isSolMarket = config.mint.equals(WSOL_MINT);
    const wsolIxs =
      isSolMarket && (await this.getWrappedSolIxs(bnAmount, false));
    if (wsolIxs) {
      transactionInstructions.push(...wsolIxs.preInstructions);
    }
    const borrowIx = await this.borrowIx(config, bnAmount);
    transactionInstructions.push(borrowIx);
    if (wsolIxs) {
      transactionInstructions.push(...wsolIxs.postInstructions);
    }
    const signature = await this.rpc(transactionInstructions);

    console.log("Signature: ", signature);
    // Fetch updated position
    const {
      marketData: updatedMarketData,
      collateralMarketData: updatedCollateralMarketData,
    } = await this.getMarketDataUI(config);
    console.log(
      "Updated Market Data: ",
      JSON.stringify(updatedMarketData, null, 2)
    );
    const updatedPosition = updatedMarketData.traders.find(
      (t) => t.address === this.wallet.toBase58()
    );
    const updatedCollateralPosition = updatedCollateralMarketData.traders.find(
      (t) => t.address === this.wallet.toBase58()
    );

    return {
      signature,
      position: updatedPosition || null,
      collateralPosition: updatedCollateralPosition || null,
    };
  }

  /**
   * Borrow with collateral
   * @param config - Market configuration
   * @param amount - Amount to borrow
   * @param collateralAmount - Amount of collateral to deposit
   * @returns Transaction signature, updated position, and collateral position
   */
  async borrowWithCollateralUI(
    config: MarketConfig,
    amount: Amount,
    collateralAmount: Amount
  ): Promise<{
    signature: string;
    position: TraderPositionUI | null;
    collateralPosition: TraderPositionUI | null;
  }> {
    this.logQuery("borrowWithCollateralUI", {
      config,
      amount: amount.toString(),
      collateralAmount: collateralAmount.toString(),
    });
    const bnAmount = this.convertToBN(amount);
    const isSolCollateral = config.collateralMint.equals(WSOL_MINT);
    const wsolDepositIxs = isSolCollateral
      ? await this.getWrappedSolIxs(this.convertToBN(collateralAmount), true)
      : undefined;
    const depositCollateralFirstIx = await this.depositIx(
      config,
      this.convertToBN(collateralAmount)
    );
    const transactionInstructions = [];
    if (wsolDepositIxs) {
      transactionInstructions.push(...wsolDepositIxs.preInstructions);
    }
    transactionInstructions.push(depositCollateralFirstIx);
    if (wsolDepositIxs) {
      transactionInstructions.push(...wsolDepositIxs.postInstructions);
    }
    const isSolMarket = config.mint.equals(WSOL_MINT);
    const wsolBorrowIxs =
      isSolMarket && (await this.getWrappedSolIxs(bnAmount, false));
    const borrowIx = await this.borrowIx(config, bnAmount);

    if (wsolBorrowIxs) {
      transactionInstructions.push(...wsolBorrowIxs.preInstructions);
    }
    transactionInstructions.push(borrowIx);
    if (wsolBorrowIxs) {
      transactionInstructions.push(...wsolBorrowIxs.postInstructions);
    }

    const signature = await this.rpc(transactionInstructions);
    // Fetch updated position
    const { marketData, collateralMarketData } = await this.getMarketDataUI(
      config
    );
    const updatedPosition = marketData.traders.find(
      (t) => t.address === this.wallet.toBase58()
    );
    const updatedCollateralPosition = collateralMarketData.traders.find(
      (t) => t.address === this.wallet.toBase58()
    );
    return {
      signature,
      position: updatedPosition || null,
      collateralPosition: updatedCollateralPosition || null,
    };
  }

  async repayIx(
    config: MarketConfig,
    amount: BN
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.getMarketHeaderPda(config.market, config.mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);
    const remainingAccounts = await this.getRemainingAccountsByProtocol(
      config.optimizerProtocol,
      config.mint,
      config.collateralMint
    );

    const { protocolProgram, protocolVault, protocolVaultAuthority } =
      await this.getProtocolByName(
        config.optimizerProtocol,
        config.mint,
        config.collateralMint
      );
    const ix = await this.program.methods
      .repay(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        protocolProgram,
        protocolVault,
        protocolVaultAuthority,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return ix;
  }

  /**
   * Repay with UI
   * @param config - Market configuration
   * @param amount - Amount to repay
   * @returns Transaction signature, updated position
   * This function is used to repay a loan, it decreases the amount of tokens borrowed,
   * and increases the ultimately frees the collateral in other market where borrower deposited the collateral.
   * So the borrower can withdraw the collaterals from the collateral market.
   */
  async repayWithUI(
    config: MarketConfig,
    amount: Amount
  ): Promise<{
    signature: string;
    position: TraderPosition | null;
  }> {
    this.logQuery("repayWithUI", {
      mint: config.mint.toBase58(),
      market: config.market.toBase58(),
      optimizer: config.optimizerProtocol,
      amount: amount.toString(),
    });
    const bnAmount = this.convertToBN(amount);

    const isSolMarket = config.mint.equals(WSOL_MINT);
    const wsolIxs =
      isSolMarket && (await this.getWrappedSolIxs(bnAmount, true));
    const repayIx = await this.repayIx(config, bnAmount);
    const transactionInstructions = [];
    if (wsolIxs) {
      transactionInstructions.push(...wsolIxs.preInstructions);
    }
    transactionInstructions.push(repayIx);
    if (wsolIxs) {
      transactionInstructions.push(...wsolIxs.postInstructions);
    }
    const signature = await this.rpc(transactionInstructions);

    // Fetch updated position
    const newPosition = await this.getTraderPosition(
      config.market,
      this.wallet
    );

    return {
      signature,
      position: newPosition,
    };
  }

  async withdrawIx(
    config: MarketConfig,
    amount: BN
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.getMarketHeaderPda(config.market, config.mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);
    const { protocolProgram, protocolVault, protocolVaultAuthority } =
      await this.getProtocolByName(
        config.optimizerProtocol,
        config.mint,
        config.collateralMint
      );
    const remainingAccounts = await this.getRemainingAccountsByProtocol(
      config.optimizerProtocol,
      config.mint,
      config.collateralMint
    );
    const withdrawIx = await this.program.methods
      .withdraw(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        protocolProgram,
        protocolVault,
        protocolVaultAuthority,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return withdrawIx;
  }

  /**
   * Withdraw with UI
   * @param config - Market configuration
   * @param amount - Amount to withdraw
   * @returns Transaction signature, updated position, and withdrawn amount
   * This function is used to withdraw the free the deposits or collateral from the current market.
   */
  async withdrawWithUI(
    config: MarketConfig,
    amount: Amount,
    hasTokenAccount: boolean
  ): Promise<{
    signature: string;
    position: TraderPosition | null;
    withdrawnAmount: number;
  }> {
    if (!this.program.provider.publicKey) {
      throw new Error("Provider public key is not set");
    }
    this.logQuery("withdrawWithUI", {
      config,
      amount: amount.toString(),
    });
    const bnAmount = this.convertToBN(amount);
    const transactionInstructions = [];

    const isSolMarket = config.mint.equals(WSOL_MINT);
    const isUSDCMarket = config.mint.equals(
      new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
    );

    if (isUSDCMarket && !hasTokenAccount) {
      // Get associated token account address
      const tokenAccount = utils.token.associatedAddress({
        mint: config.mint,
        owner: this.program.provider.publicKey,
      });
      transactionInstructions.push(
        createAssociatedTokenAccountInstruction(
          this.program.provider.publicKey,
          tokenAccount,
          this.program.provider.publicKey,
          config.mint
        )
      );
    }
    const wsolIxs =
      isSolMarket && (await this.getWrappedSolIxs(bnAmount, false));
    const withdrawIx = await this.withdrawIx(config, bnAmount);
    if (wsolIxs) {
      transactionInstructions.push(...wsolIxs.preInstructions);
    }
    transactionInstructions.push(withdrawIx);
    if (wsolIxs) {
      transactionInstructions.push(...wsolIxs.postInstructions);
    }
    const signature = await this.rpc(transactionInstructions);
    // Fetch updated position
    const newPosition = await this.getTraderPosition(
      config.market,
      this.wallet
    );

    return {
      signature,
      position: newPosition,
      withdrawnAmount: bnAmount.toNumber(),
    };
  }

  async repayAndWithdrawCollateralWithUI(
    config: MarketConfig,
    amount: Amount
  ): Promise<{
    signature: string;
    collateralAmountWithdrawn: BN;
    position: TraderPosition | null;
  }> {
    this.logQuery("repayAndWithdrawCollateralWithUI", {
      config,
      amount: amount.toString(),
    });
    const bnAmount = this.convertToBN(amount);

    const collateralAmountWithdrawable = await this.calculateRequiredCollateral(
      config,
      bnAmount,
      config.ltvRatio
    );
    const transactionInstructions = [];
    const isSolMarket = config.mint.equals(WSOL_MINT);
    const wsolRepayIxs =
      isSolMarket && (await this.getWrappedSolIxs(bnAmount, true));
    const repayIx = await this.repayIx(config, bnAmount);
    if (wsolRepayIxs) {
      transactionInstructions.push(...wsolRepayIxs.preInstructions);
    }
    transactionInstructions.push(repayIx);
    if (wsolRepayIxs) {
      transactionInstructions.push(...wsolRepayIxs.postInstructions);
    }
    const isSolCollateral = config.collateralMint.equals(WSOL_MINT);
    const wsolWithdrawIxs =
      isSolCollateral &&
      (await this.getWrappedSolIxs(collateralAmountWithdrawable, false));
    const withdrawIx = await this.withdrawIx(
      config,
      collateralAmountWithdrawable
    );
    if (wsolWithdrawIxs) {
      transactionInstructions.push(...wsolWithdrawIxs.preInstructions);
    }
    transactionInstructions.push(withdrawIx);
    if (wsolWithdrawIxs) {
      transactionInstructions.push(...wsolWithdrawIxs.postInstructions);
    }

    const signature = await this.rpc(transactionInstructions);
    const newPosition = await this.getTraderPosition(
      config.market,
      this.wallet
    );

    return {
      signature,
      collateralAmountWithdrawn: collateralAmountWithdrawable,
      position: newPosition,
    };
  }

  async liquidateByLtvIx(
    config: MarketConfig,
    amount: BN,
    liquidatee: web3.PublicKey
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.getMarketHeaderPda(config.market, config.mint);
    const { protocolProgram, protocolVault, protocolVaultAuthority } =
      await this.getProtocolByName(
        config.optimizerProtocol,
        config.mint,
        config.collateralMint
      );
    const remainingAccounts = await this.getRemainingAccountsByProtocol(
      config.optimizerProtocol,
      config.mint,
      config.collateralMint
    );
    const ix = await this.program.methods
      .liquidateByLtv(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        protocolProgram,
        protocolVault,
        protocolVaultAuthority,
        liquidator: this.wallet,
        liquidatee,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return ix;
  }

  async liquidateByLtvWithUI(
    config: MarketConfig,
    amount: Amount,
    liquidatee: web3.PublicKey
  ): Promise<{
    signature: string;
    liquidateePosition: TraderPosition | null;
    withdrawnAmount: number;
  }> {
    this.logQuery("liquidateByLtvWithUI", {
      config,
      amount: amount.toString(),
      liquidatee: liquidatee.toBase58(),
    });
    const bnAmount = this.convertToBN(amount);

    const ix = await this.liquidateByLtvIx(config, bnAmount, liquidatee);
    const transactionInstructions = [];
    transactionInstructions.push(ix);
    const signature = await this.rpc(transactionInstructions);
    // Fetch updated position
    const newPosition = await this.getTraderPosition(config.market, liquidatee);

    return {
      signature,
      liquidateePosition: newPosition,
      withdrawnAmount: bnAmount.toNumber(),
    };
  }

  async liquidateByOverdueIx(
    config: MarketConfig,
    amount: BN,
    liquidatee: web3.PublicKey
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.getMarketHeaderPda(config.market, config.mint);
    const { protocolProgram, protocolVault, protocolVaultAuthority } =
      await this.getProtocolByName(
        config.optimizerProtocol,
        config.mint,
        config.collateralMint
      );
    const remainingAccounts = await this.getRemainingAccountsByProtocol(
      config.optimizerProtocol,
      config.mint,
      config.collateralMint
    );
    const ix = await this.program.methods
      .liquidateByOverdue(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        protocolProgram,
        protocolVault,
        protocolVaultAuthority,
        liquidator: this.wallet,
        liquidatee,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return ix;
  }

  async liquidateByOverdueWithUI(
    config: MarketConfig,
    amount: Amount,
    liquidatee: web3.PublicKey
  ): Promise<{
    signature: string;
    liquidateePosition: TraderPosition | null;
    withdrawnAmount: number;
  }> {
    this.logQuery("liquidateByOverdueWithUI", {
      config,
      amount: amount.toString(),
      liquidatee: liquidatee.toBase58(),
    });
    const bnAmount = this.convertToBN(amount);

    const ix = await this.liquidateByOverdueIx(config, bnAmount, liquidatee);
    const transactionInstructions = [];
    transactionInstructions.push(ix);
    const signature = await this.rpc(transactionInstructions);
    // Fetch updated position
    const newPosition = await this.getTraderPosition(config.market, liquidatee);

    return {
      signature,
      liquidateePosition: newPosition,
      withdrawnAmount: bnAmount.toNumber(),
    };
  }

  async calculateRemainingBorrowCapacity(
    config: MarketConfig,
    collateralAmount: BN,
    borrowedAmount: BN
  ): Promise<BN> {
    const priceData = await this.getMarketPriceData(config);
    const maxBorrowAmount = calculate_max_borrow_amount(
      collateralAmount,
      priceData.collateralPriceInBorrowMintScaled,
      config.collateralMintDecimals,
      config.mintDecimals,
      config.collateralLtvRatio
    );

    return maxBorrowAmount.sub(borrowedAmount);
  }

  async calculateRequiredCollateral(
    config: MarketConfig,
    desiredBorrowAmount: BN,
    collateralLtvRatio: BN
  ): Promise<BN> {
    const priceData = await this.getMarketPriceData(config);
    return calculate_required_collateral(
      desiredBorrowAmount,
      priceData.collateralPriceInBorrowMintScaled,
      config.mintDecimals,
      config.collateralMintDecimals,
      collateralLtvRatio
    );
  }

  private createTraderPositionUI(
    address: string,
    state: TraderState,
    priceData: MarketPriceData,
    config: MarketConfig,
    isCollateralMarket: boolean
  ): TraderPositionUI {
    const price = isCollateralMarket
      ? priceData.originalCollateralPrice
      : priceData.originalMarketPrice;
    const decimals = isCollateralMarket
      ? config.collateralMintDecimals
      : config.mintDecimals;
    let isLender = null;
    if (
      new BN(state.onVaultLends).gt(new BN(0)) ||
      new BN(state.inP2pLends).gt(new BN(0)) ||
      new BN(state.collateralAmount).gt(new BN(0))
    ) {
      isLender = true;
    } else if (
      new BN(state.onVaultBorrows).gt(new BN(0)) ||
      new BN(state.inP2pBorrows).gt(new BN(0))
    ) {
      isLender = false;
    }
    return {
      address,
      isLender,
      isP2pEnabled: new BN(state.flags).eq(new BN(1)),
      mint: isCollateralMarket
        ? config.collateralMint.toBase58()
        : config.mint.toBase58(),
      borrowing: {
        borrowPending: new BN(state.onVaultBorrows),
        p2pBorrowed: new BN(state.inP2pBorrows),
        borrowPendingInUSD: this.convertToUsdValue(
          new BN(state.onVaultBorrows),
          price,
          decimals
        ),
        p2pBorrowedInUSD: this.convertToUsdValue(
          new BN(state.inP2pBorrows),
          price,
          decimals
        ),
      },
      lending: {
        onVaultLends: new BN(state.onVaultLends),
        onVaultLendsInUSD: this.convertToUsdValue(
          new BN(state.onVaultLends),
          price,
          decimals
        ),
        p2pLends: new BN(state.inP2pLends),
        p2pLendsInUsdValue: this.convertToUsdValue(
          new BN(state.inP2pLends),
          price,
          decimals
        ),
        collateral: {
          amount: new BN(state.collateralAmount),
          amountInUSD: this.convertToUsdValue(
            new BN(state.collateralAmount),
            price,
            decimals
          ),
        },
      },
    };
  }

  private calculateMarketStats(
    traders: TraderPositionUI[],
    matches: MatchStateUI[],
    price: BN,
    mint: PublicKey,
    decimals: number
  ): MarketDataUI["stats"] {
    const totalAmountInP2p = matches.reduce(
      (sum, m) => sum.add(m.amount),
      new BN(0)
    );

    const totalSupply = traders.reduce((sum, t) => {
      if (t.isLender) {
        return sum.add(t.lending.collateral.amount).add(t.lending.p2pLends);
      }
      return sum;
    }, new BN(0));

    const totalLendAmountUnmatched = traders.reduce((sum, t) => {
      if (t.isLender) {
        return sum.add(t.lending.onVaultLends);
      }
      return sum;
    }, new BN(0));

    const totalBorrowed = traders.reduce((sum, t) => {
      if (t.isLender === false && t.borrowing) {
        return sum.add(t.borrowing.p2pBorrowed);
      }
      return sum;
    }, new BN(0));

    const borrowAmountUnmatched = traders.reduce((sum, t) => {
      if (t.isLender === false && t.borrowing) {
        return sum.add(t.borrowing.borrowPending);
      }
      return sum;
    }, new BN(0));

    const totalCollateral = traders.reduce((sum, t) => {
      if (t.isLender) {
        return sum.add(t.lending.collateral.amount);
      }
      return sum;
    }, new BN(0));

    return {
      mint: mint.toBase58(),
      totalAmountInP2p,
      totalAmountInP2pInUSD: this.convertToUsdValue(
        totalAmountInP2p,
        price,
        decimals
      ),
      totalLiquidityAvailable: totalLendAmountUnmatched,
      totalLiquidityAvailableInUSD: this.convertToUsdValue(
        totalLendAmountUnmatched,
        price,
        decimals
      ),
      deposits: {
        totalSupply,
        lendAmountUnmatched: totalLendAmountUnmatched,
        collateral: totalCollateral,
        totalSupplyInUSD: this.convertToUsdValue(totalSupply, price, decimals),
        lendAmountUnmatchedInUSD: this.convertToUsdValue(
          totalLendAmountUnmatched,
          price,
          decimals
        ),
        collateralInUSD: this.convertToUsdValue(
          totalCollateral,
          price,
          decimals
        ),
      },
      borrows: {
        totalBorrowedP2p: totalBorrowed,
        borrowAmountUnmatched,
        utilizationRate: totalSupply.gt(new BN(0))
          ? totalBorrowed.mul(new BN(10000)).div(totalSupply).toNumber()
          : 0,
        totalBorrowedP2pInUSD: this.convertToUsdValue(
          totalBorrowed,
          price,
          decimals
        ),
        borrowAmountUnmatchedInUSD: this.convertToUsdValue(
          borrowAmountUnmatched,
          price,
          decimals
        ),
      },
      traders: {
        count: traders.length,
        activeCount: traders.filter((t) => {
          if (t.isLender) {
            return (
              t.lending.onVaultLends.gt(new BN(0)) ||
              t.lending.p2pLends.gt(new BN(0)) ||
              t.lending.collateral.amount.gt(new BN(0))
            );
          }
          return (
            t.borrowing &&
            (t.borrowing.borrowPending.gt(new BN(0)) ||
              t.borrowing.p2pBorrowed.gt(new BN(0)))
          );
        }).length,
      },
    };
  }

  async getMarketDataUI(config: MarketConfig): Promise<{
    marketData: MarketDataUI;
    collateralMarketData: MarketDataUI;
    priceData: MarketPriceData;
  }> {
    try {
      const [marketData, collateralMarketData, priceData] = await Promise.all([
        this.getMarket(config.market),
        this.getMarket(config.collateralMarket),
        this.getMarketPriceData(config),
      ]);

      // Map traders
      const traders = Array.from(marketData.traders.entries()).map(
        ([address, state]) => {
          return this.createTraderPositionUI(
            address,
            state,
            priceData,
            config,
            false
          );
        }
      );

      const collateralTradersUI = Array.from(
        collateralMarketData.traders.entries()
      ).map(([address, state]) => {
        return this.createTraderPositionUI(
          address,
          state,
          priceData,
          config,
          true
        );
      });

      // Map matches
      const matches = Array.from(marketData.matches.entries()).map(
        ([id, state]) => ({
          id,
          mint: config.mint.toBase58(),
          lender:
            marketData.traderIndexToTrader.get(state.lenderIndex.toString()) ||
            `unknown-${state.lenderIndex}`,
          borrower:
            marketData.traderIndexToTrader.get(
              state.borrowerIndex.toString()
            ) || `unknown-${state.borrowerIndex}`,
          amount: new BN(state.amountInP2p),
          amountInUSD:
            new BN(state.amountInP2p)
              .mul(priceData.originalMarketPrice)
              .div(PRICE_PRECISION)
              .toNumber() /
            new BN(10).pow(new BN(config.mintDecimals)).toNumber(),
          timestamp: new Date(
            new BN(state.matchTimestamp).mul(new BN(1000)).toNumber()
          ),
          durationInDays: this.calculateMatchDuration(
            new BN(state.matchTimestamp)
          ),
        })
      );

      const collateralMatches = Array.from(
        collateralMarketData.matches.entries()
      ).map(([id, state]) => ({
        id,
        mint: config.collateralMint.toBase58(),
        lender:
          collateralMarketData.traderIndexToTrader.get(
            state.lenderIndex.toString()
          ) || `unknown-${state.lenderIndex}`,
        borrower:
          collateralMarketData.traderIndexToTrader.get(
            state.borrowerIndex.toString()
          ) || `unknown-${state.borrowerIndex}`,
        amount: new BN(state.amountInP2p),
        amountInUSD: this.convertToUsdValue(
          new BN(state.amountInP2p),
          priceData.originalCollateralPrice,
          config.collateralMintDecimals
        ),
        timestamp: new Date(
          new BN(state.matchTimestamp).mul(new BN(1000)).toNumber()
        ),
        durationInDays: this.calculateMatchDuration(
          new BN(state.matchTimestamp)
        ),
      }));

      // Calculate stats
      const stats = this.calculateMarketStats(
        traders,
        matches,
        priceData.originalMarketPrice,
        config.mint,
        config.mintDecimals
      );

      const collateralStats = this.calculateMarketStats(
        collateralTradersUI,
        collateralMatches,
        priceData.originalCollateralPrice,
        config.collateralMint,
        config.collateralMintDecimals
      );

      const marketDataUI: MarketDataUI = {
        optimizerProtocol: config.optimizerProtocol,
        totalMatchesHappened: marketData.matchSequenceNumber,
        marketId: config.marketId,
        collateralMarket: config.collateralMarket.toBase58(),
        lendingMarket: config.market.toBase58(),
        lendingMint: config.mint.toBase58(),
        collateralMint: config.collateralMint.toBase58(),
        status: this.getMarketStatus(config.marketStatus),
        stats,
        traders,
        matches,
        recentActivity: matches
          .slice()
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10),
        params: {
          liquidationThreshold: config.liquidationThreshold,
          ltv: config.ltvRatio,
          lendingDecimals: config.mintDecimals,
          collateralDecimals: config.collateralMintDecimals,
        },
      };

      const collateralMarketDataUI: MarketDataUI = {
        optimizerProtocol: config.optimizerProtocol,
        totalMatchesHappened: collateralMarketData.matchSequenceNumber,
        marketId: config.collateralMarketId,
        collateralMarket: config.market.toBase58(),
        lendingMarket: config.collateralMarket.toBase58(),
        lendingMint: config.collateralMint.toBase58(),
        collateralMint: config.mint.toBase58(),
        status: this.getMarketStatus(config.marketStatus),
        stats: collateralStats,
        matches: collateralMatches,
        traders: collateralTradersUI,
        recentActivity: collateralMatches
          .slice()
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10),
        params: {
          liquidationThreshold: config.collateralLiquidationThreshold,
          ltv: config.collateralLtvRatio,
          lendingDecimals: config.collateralMintDecimals,
          collateralDecimals: config.mintDecimals,
        },
      };

      return {
        marketData: marketDataUI,
        collateralMarketData: collateralMarketDataUI,
        priceData,
      };
    } catch (error) {
      throw error;
    }
  }
  private convertToUsdValue(amount: BN, price: BN, decimals: number): number {
    return (
      amount.mul(price).div(PRICE_PRECISION).toNumber() /
      new BN(10).pow(new BN(decimals)).toNumber()
    );
  }
  private calculateMatchDuration(timestamp: BN): number {
    const now = Math.floor(Date.now() / 1000);
    const matchTime = timestamp.toNumber();
    const durationInDays = Math.floor((now - matchTime) / (24 * 60 * 60));
    return Math.max(0, durationInDays); // Ensure non-negative duration
  }

  private getMarketStatus(
    status: BN
  ): "active" | "paused" | "closed" | "uninitialized" | "tombstoned" {
    const statusNum = status.toNumber();
    switch (statusNum) {
      case 0:
        return "uninitialized";
      case 1:
        return "active";
      case 2:
        return "paused";
      case 3:
        return "closed";
      case 4:
        return "tombstoned";
      default:
        return "uninitialized";
    }
  }
  async getMarketConfig(
    mint: PublicKey,
    collateralMint: PublicKey,
    market: PublicKey,
    collateralMarket: PublicKey
  ): Promise<MarketConfig> {
    const [
      marketHeader,
      collateralMarketHeader,
      collateralMintDecimals,
      mintDecimals,
    ] = await Promise.all([
      this.getMarketHeader(market, mint),
      this.getMarketHeader(collateralMarket, collateralMint),
      this.getTokenDecimals(collateralMint),
      this.getTokenDecimals(mint),
    ]);

    const optimizerProtocol = this.getProtocolNameByOptimizerProgram(
      marketHeader.optimizerProgram
    );
    return {
      collateralMarket: marketHeader.collateralMarket,
      collateralMint: marketHeader.collateralMint,
      collateralTokenProgram: marketHeader.collateralTokenProgram,
      market,
      marketId: marketHeader.marketId.toNumber(),
      collateralMarketId: collateralMarketHeader.marketId.toNumber(),
      mint,
      optimizerProgram: marketHeader.optimizerProgram,
      optimizerProtocol,
      tokenProgram: marketHeader.tokenProgram,
      oracle: marketHeader.oracle,
      oracleSource: marketHeader.oracleSource,
      collateralOracle: marketHeader.collateralOracle,
      collateralOracleSource: marketHeader.collateralOracleSource,
      ltvRatio: marketHeader.ltvRatio,
      collateralLtvRatio: collateralMarketHeader.ltvRatio,
      liquidationThreshold: marketHeader.liquidationThreshold,
      collateralLiquidationThreshold:
        collateralMarketHeader.liquidationThreshold,
      marketStatus: marketHeader.status,
      collateralMintDecimals,
      mintDecimals,
    };
  }

  async getTraderLTVRatio(
    traders: TraderPositionUI,
    tradersCollateralMarketPosition: TraderPositionUI,
    priceData: MarketPriceData,
    marketLtvRatio?: BN
  ): Promise<{
    ltvRatio: BN;
    collateralLtvRatio: BN;
    liquidationAmount: BN;
    debtToBeRepaid: BN;
  }> {
    // If there's no P2P borrowing, return zero LTV ratios
    if (traders.borrowing?.p2pBorrowed.eq(new BN(0))) {
      return {
        ltvRatio: new BN(0),
        collateralLtvRatio: new BN(0),
        liquidationAmount: new BN(0),
        debtToBeRepaid: new BN(0),
      };
    }

    const RATIO_PRECISION = new BN(10000); // 10^4
    const PRICE_PRECISION = new BN(1000000); // 10^6

    // Calculate collateral value in borrow token terms
    const collateralValue =
      tradersCollateralMarketPosition.lending.collateral.amount.mul(
        priceData.collateralPriceInBorrowMintScaled
      );

    // Calculate LTV ratio
    // LTV = (borrowed_amount * RATIO_PRECISION * PRICE_PRECISION) / collateral_value
    const ltvRatio = traders.borrowing?.p2pBorrowed
      .mul(RATIO_PRECISION)
      .mul(PRICE_PRECISION)
      .div(collateralValue);

    // Calculate collateral LTV ratio using max borrow amount

    const value = traders.lending.collateral.amount.mul(
      priceData.borrowPriceInCollateralMintScaled
    );
    const collateralLtvRatio =
      tradersCollateralMarketPosition.borrowing.p2pBorrowed
        .mul(RATIO_PRECISION)
        .mul(PRICE_PRECISION)
        .div(value);

    // Calculate liquidation amount if market LTV ratio is provided
    let liquidationAmount = new BN(0);
    let debtToBeRepaid = new BN(0);

    if (marketLtvRatio && ltvRatio.gt(marketLtvRatio)) {
      // Calculate how much collateral needs to be liquidated
      liquidationAmount =
        tradersCollateralMarketPosition.lending.collateral.amount;

      // Calculate how much debt can be repaid with this collateral
      const liquidationAmountInDebt = liquidationAmount
        .mul(priceData.collateralPriceInBorrowMintScaled)
        .div(PRICE_PRECISION);

      // Take the minimum between the calculated debt and actual borrowed amount
      debtToBeRepaid = BN.min(
        liquidationAmountInDebt,
        traders.borrowing?.p2pBorrowed
      );

      // If liquidationAmountInDebt > borrowed amount, adjust collateral amount proportionally
      if (liquidationAmountInDebt.gt(traders.borrowing?.p2pBorrowed)) {
        liquidationAmount = liquidationAmount
          .mul(traders.borrowing?.p2pBorrowed)
          .div(liquidationAmountInDebt);
      }
    }

    return {
      ltvRatio,
      collateralLtvRatio,
      liquidationAmount,
      debtToBeRepaid,
    };
  }
  // Helper method to get current market prices and configuration
  async getMarketPriceData(
    marketConfig: MarketConfig
  ): Promise<MarketPriceData> {
    // This should be implemented with your price oracle
    let price = await this.getOracleClient(
      marketConfig.oracle,
      marketConfig.oracleSource
    ).getOraclePriceData();
    let collateralPrice = await this.getOracleClient(
      marketConfig.collateralOracle,
      marketConfig.collateralOracleSource
    ).getOraclePriceData();
    return {
      collateralPriceInBorrowMintScaled:
        get_collateral_price_in_borrow_mint_scaled(
          price.price,
          collateralPrice.price
        ),
      borrowPriceInCollateralMintScaled:
        get_borrow_price_in_collateral_mint_scaled(
          price.price,
          collateralPrice.price
        ),
      originalMarketPrice: price.price,
      originalCollateralPrice: collateralPrice.price,
    };
  }

  private logQuery(method: string, params: Record<string, any>): void {
    const paramsWithString = Object.fromEntries(
      Object.entries(params).map(([key, value]) => [
        key,
        value?.toString ? value.toString() : value,
      ])
    );

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method,
        params: paramsWithString,
        wallet: this.wallet.toBase58(),
      })
    );
  }
}

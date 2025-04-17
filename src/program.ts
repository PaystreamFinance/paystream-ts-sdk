import { AnchorProvider, BN, ProgramAccount, Wallet } from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import PaystreamV1IDL from "./idls/paystream_v1.json";
import type {
  Seat,
  MarketData,
  TraderPosition,
  TraderState,
  MatchState,
  Amount,
  MarketConfig,
  MarketDataUI,
  MatchStateUI,
  MarketPriceData,
  TraderPositionUI,
  MarketHeaderUI,
  MarketHeader,
  MarketHeaderWithPubkey,
  Protocol,
} from "./types";
import {
  ParsedAccountData,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  calculate_max_borrow_amount,
  calculate_required_collateral,
  PRICE_PRECISION,
} from "./math";
import {
  deserializeRedBlackTree,
  getNodeIndices,
  matchIdBeet,
  MatchIdWrapper,
  matchStateBeet,
  publicKeyBeet,
  traderStateBeet,
} from "./beet";

import { PaystreamV1 } from "./types/paystream_v1";

export class PaystreamV1Program {
  private program: Program<PaystreamV1>;
  private wallet: web3.PublicKey;
  public readonly NUM_TRADERS = 128;
  public readonly NUM_MATCHES = 4096;
  public readonly SYSVAR_PROGRAM_ID = new PublicKey(
    "Sysvar1111111111111111111111111111111111111"
  );
  static readonly programId = new PublicKey(PaystreamV1IDL.address);
  constructor(provider: AnchorProvider) {
    this.program = new Program(
      PaystreamV1IDL as unknown as PaystreamV1,
      provider
    );
    this.wallet = provider.publicKey;
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

  getProviderFromKeypair(keypair: web3.Keypair): AnchorProvider {
    return new AnchorProvider(
      this.program.provider.connection,
      new Wallet(keypair),
      { commitment: "confirmed" }
    );
  }

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
      p2pEnabled: marketHeader.account.p2pEnabled,
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
    const midRateYield = new BN(data.subarray(8, 16), "le");

    // Calculate remaining buffer after header
    const remaining = data.subarray(16);

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
      (wrapper: MatchIdWrapper) => Number(wrapper.matchId)
    ) as Map<number, MatchState>;

    // Get trader indices for lookup
    const traderPubkeyToTraderIndex = getNodeIndices(
      traderBuffer,
      publicKeyBeet,
      traderStateBeet
    );

    // Create reverse lookup map
    const traderIndexToTraderPubkey = new Map<number, string>();
    for (const [key, index] of traderPubkeyToTraderIndex.entries()) {
      traderIndexToTraderPubkey.set(index, key.publicKey.toString());
    }

    return {
      matchSequenceNumber,
      midRateYield,
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
        onVaultLends: traderState.onVaultLends,
        inP2pLends: traderState.inP2pLends,
        onVaultBorrows: traderState.onVaultBorrows,
        inP2pBorrows: traderState.inP2pBorrows,
        collateralAmount: traderState.collateralAmount,
        isP2pEnabled: traderState.flags == 1 ? true : false,
        availableForLending: traderState.onVaultLends.sub(
          traderState.collateralAmount
        ),
        availableCollateral: traderState.collateralAmount,
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

  // Instruction methods
  async initializeMarket(
    mint: web3.PublicKey,
    marketId: BN,
    feeRecipient: web3.PublicKey,
    tokenProgram: web3.PublicKey,
    market: web3.Keypair,
    collateralMarket: web3.PublicKey,
    collateralTokenProgram: web3.PublicKey,
    collateralMint: web3.PublicKey,
    optimizerProgram: web3.PublicKey,
    preInstructions?: TransactionInstruction[]
  ): Promise<string> {
    const tx = await this.program.methods
      .initializeMarket(feeRecipient, marketId)
      .accounts({
        authority: this.wallet,
        mint: mint,
        tokenProgram: tokenProgram,
        market: market.publicKey,
        collateralMarket: collateralMarket,
        collateralTokenProgram: collateralTokenProgram,
        collateralMint: collateralMint,
        optimizerProgram,
      })
      .preInstructions(preInstructions ?? [])
      .signers([market])
      .rpc();

    return tx;
  }

  async updateMarketAuthority(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    newAuthority: web3.PublicKey
  ): Promise<string> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const tx = await this.program.methods
      .updateMarketAuthority(newAuthority)
      .accounts({
        marketHeader: marketHeaderPda,
        authority: this.wallet,
      })
      .rpc();
    return tx;
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

  async approveSeat(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    trader: web3.PublicKey
  ): Promise<string> {
    let marketHeaderPda = this.getMarketHeaderPda(market, mint);
    let seatPda = this.getSeatPda(marketHeaderPda, trader);
    const tx = await this.program.methods
      .approveSeat()
      .accounts({
        seat: seatPda,
        marketHeader: marketHeaderPda,
      })
      .rpc();

    return tx;
  }

  async allocateSeat(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    trader: web3.PublicKey
  ): Promise<string> {
    let marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const tx = await this.program.methods
      .allocateSeat()
      .accounts({
        trader: trader,
        marketHeader: marketHeaderPda,
        authority: this.wallet,
      })
      .rpc();

    return tx;
  }
  getProtocolByName(protocol: Protocol): {
    programId: web3.PublicKey;
    vault: web3.PublicKey;
    optimizerProgram: web3.PublicKey;
  } {
    switch (protocol) {
      case "drift":
        return {
          programId: new PublicKey(
            "Drift11111111111111111111111111111111111111112"
          ),
          vault: new PublicKey(
            "Drift11111111111111111111111111111111111111112"
          ),
          optimizerProgram: new PublicKey(
            "Drift11111111111111111111111111111111111111112"
          ),
        };
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
  getProtocolNameByOptimizerProgram(
    optimizerProgram: web3.PublicKey
  ): Protocol {
    switch (optimizerProgram.toBase58()) {
      case "Drift11111111111111111111111111111111111111112":
        return "drift";
      default:
        throw new Error(
          `Unknown optimizer program: ${optimizerProgram.toBase58()}`
        );
    }
  }
  async deposit(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    amount: BN,
    protocol: Protocol
  ): Promise<string> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);

    const { programId, vault } = this.getProtocolByName(protocol);
    const tx = await this.program.methods
      .deposit(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        sysIx: this.SYSVAR_PROGRAM_ID,
        protocolProgram: programId,
        protocolVault: vault,
      })
      .rpc();

    return tx;
  }
  async depositIx(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    amount: BN,
    protocol: Protocol
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);
    const { programId, vault } = this.getProtocolByName(protocol);
    const ix = await this.program.methods
      .deposit(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        sysIx: this.SYSVAR_PROGRAM_ID,
        protocolProgram: programId,
        protocolVault: vault,
      })
      .instruction();

    return ix;
  }

  async markAsCollateral(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    amount: BN,
    protocol: Protocol
  ): Promise<string> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);
    const { programId, vault } = this.getProtocolByName(protocol);
    const tx = await this.program.methods
      .markAsCollateral(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        sysIx: this.SYSVAR_PROGRAM_ID,
        protocolProgram: programId,
        protocolVault: vault,
      })
      .rpc();

    return tx;
  }

  async lend(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    amount: BN,
    protocol: Protocol
  ): Promise<string> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);
    const { programId, vault } = this.getProtocolByName(protocol);
    const tx = await this.program.methods
      .lend(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        sysIx: this.SYSVAR_PROGRAM_ID,
        protocolProgram: programId,
        protocolVault: vault,
      })
      .rpc();

    return tx;
  }

  async borrow(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    amount: BN,
    protocol: Protocol,
    preInstructions?: TransactionInstruction[]
  ): Promise<string> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);
    const { programId, vault } = this.getProtocolByName(protocol);
    const tx = await this.program.methods
      .borrow(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        sysIx: this.SYSVAR_PROGRAM_ID,
        protocolProgram: programId,
        protocolVault: vault,
      })
      .preInstructions(preInstructions ?? [])
      .rpc();

    return tx;
  }

  async repay(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    amount: BN,
    protocol: Protocol
  ): Promise<string> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);
    const { programId, vault } = this.getProtocolByName(protocol);
    const tx = await this.program.methods
      .repay(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        sysIx: this.SYSVAR_PROGRAM_ID,
        protocolProgram: programId,
        protocolVault: vault,
      })
      .rpc();

    return tx;
  }

  async repayIx(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    amount: BN,
    protocol: Protocol
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);
    const { programId, vault } = this.getProtocolByName(protocol);
    const ix = await this.program.methods
      .repay(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        sysIx: this.SYSVAR_PROGRAM_ID,
        protocolProgram: programId,
        protocolVault: vault,
      })
      .instruction();

    return ix;
  }

  async withdraw(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    amount: BN,
    protocol: Protocol,
    preInstructions?: TransactionInstruction[]
  ): Promise<string> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const seatPda = this.getSeatPda(marketHeaderPda, this.wallet);
    const { programId, vault } = this.getProtocolByName(protocol);
    const tx = await this.program.methods
      .withdraw(amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        sysIx: this.SYSVAR_PROGRAM_ID,
        protocolProgram: programId,
        protocolVault: vault,
      })
      .preInstructions(preInstructions ?? [])
      .rpc();

    return tx;
  }

  async updateMarketHeader(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    feeRecipient: web3.PublicKey,
    enableP2pLending: boolean,
    updateMarketStatus: BN,
    protocol: Protocol
  ): Promise<string> {
    const marketHeaderPda = this.getMarketHeaderPda(market, mint);
    const { optimizerProgram } = this.getProtocolByName(protocol);
    const tx = await this.program.methods
      .updateMarketHeader(feeRecipient, enableP2pLending, updateMarketStatus)
      .accounts({
        marketHeader: marketHeaderPda,
        authority: this.wallet,
        optimizerProgram,
      })
      .rpc();

    return tx;
  }

  // Enhanced instruction methods
  async depositWithUI(
    config: MarketConfig,
    amount: Amount
  ): Promise<{
    signature: string;
    position: TraderPosition | null;
  }> {
    const marketHeader = await this.getMarketHeader(config.market, config.mint);
    const protocol = this.getProtocolNameByOptimizerProgram(
      marketHeader.optimizerProgram
    );
    const bnAmount = this.convertToBN(amount);
    let signature = await this.deposit(
      config.market,
      config.mint,
      bnAmount,
      protocol
    );

    const position = await this.getTraderPosition(config.market, this.wallet);

    return { signature, position };
  }

  async markAsCollateralWithUI(
    config: MarketConfig,
    amount: Amount
  ): Promise<{
    signature: string;
    position: TraderPosition | null;
  }> {
    const bnAmount = this.convertToBN(amount);
    // First check if trader has sufficient available (non-collateral) funds
    const position = await this.getTraderPosition(config.market, this.wallet);
    if (position && position.availableForLending.lt(bnAmount)) {
      throw new Error("Insufficient available funds for lending");
    }
    const marketHeader = await this.getMarketHeader(config.market, config.mint);
    const protocol = this.getProtocolNameByOptimizerProgram(
      marketHeader.optimizerProgram
    );
    const signature = await this.markAsCollateral(
      config.market,
      config.mint,
      bnAmount,
      protocol
    );
    const newPosition = await this.getTraderPosition(
      config.market,
      this.wallet
    );

    return { signature, position: newPosition };
  }

  async lendWithUI(
    config: MarketConfig,
    amount: Amount
  ): Promise<{
    signature: string;
    position: TraderPosition | null;
  }> {
    const bnAmount = this.convertToBN(amount);
    const marketHeader = await this.getMarketHeader(config.market, config.mint);
    const protocol = this.getProtocolNameByOptimizerProgram(
      marketHeader.optimizerProgram
    );
    const signature = await this.lend(
      config.market,
      config.mint,
      bnAmount,
      protocol
    );

    // Fetch updated position
    const newPosition = await this.getTraderPosition(
      config.market,
      this.wallet
    );

    return { signature, position: newPosition };
  }

  async borrowWithUI(
    config: MarketConfig,
    amount: Amount
  ): Promise<{
    signature: string;
    position: TraderPositionUI | null;
  }> {
    const bnAmount = this.convertToBN(amount);

    // Get current position and validate borrow amount
    const collateralMarketData = await this.getMarketDataUI(
      config.collateralMarket,
      config.collateralMint
    );
    console.log(
      "Collateral Market Data: ",
      collateralMarketData.traders.map((t) => t.lending)
    );
    const marketData = await this.getMarketDataUI(config.market, config.mint);
    console.log(
      "Market Data: ",
      marketData.traders.map((t) => t.lending)
    );
    const traderCollateralPosition = collateralMarketData.traders.find(
      (t) => t.address === this.wallet.toBase58()
    );
    if (!traderCollateralPosition) throw new Error("No position found");

    const traderMarketPosition = marketData.traders.find(
      (t) => t.address === this.wallet.toBase58()
    );
    const priceData = await this.getMarketPriceData(
      new PublicKey(config.market),
      new PublicKey(config.mint)
    );
    const remainingBorrowCapacity = this.calculateRemainingBorrowCapacity(
      priceData,
      traderCollateralPosition.lending.collateral.amount,
      traderMarketPosition?.borrowing?.p2pBorrowed || new BN(0)
    );
    if (bnAmount.gt(remainingBorrowCapacity)) {
      throw new Error(
        `Borrow amount exceeds maximum (${remainingBorrowCapacity})`
      );
    }
    const signature = await this.borrow(
      config.market,
      config.mint,
      bnAmount,
      marketData.optimizerProtocol
    );

    console.log("Signature: ", signature);
    // Fetch updated position
    const updatedMarketData = await this.getMarketDataUI(
      config.market,
      config.mint
    );
    console.log(
      "Updated Market Data: ",
      JSON.stringify(updatedMarketData, null, 2)
    );
    const updatedPosition = updatedMarketData.traders.find(
      (t) => t.address === this.wallet.toBase58()
    );

    return { signature, position: updatedPosition || null };
  }
  async borrowWithCollateralUI(
    config: MarketConfig,
    amount: Amount,
    collateralAmount: Amount
  ): Promise<{
    signature: string;
    position: TraderPositionUI | null;
  }> {
    const bnAmount = this.convertToBN(amount);

    const priceData = await this.getMarketPriceData(
      new PublicKey(config.market),
      new PublicKey(config.mint)
    );
    const remainingBorrowCapacity = this.calculateRemainingBorrowCapacity(
      priceData,
      this.convertToBN(collateralAmount),
      new BN(0)
    );
    if (bnAmount.gt(remainingBorrowCapacity)) {
      throw new Error(
        `Borrow amount exceeds maximum (${remainingBorrowCapacity})`
      );
    }
    const depositCollateralFirstIx = await this.depositIx(
      config.collateralMarket,
      config.collateralMint,
      this.convertToBN(collateralAmount),
      config.optimizerProtocol
    );

    const signature = await this.borrow(
      config.market,
      config.mint,
      bnAmount,
      config.optimizerProtocol,
      [depositCollateralFirstIx]
    );
    console.log("Signature: ", signature);
    // Fetch updated position
    const updatedMarketData = await this.getMarketDataUI(
      config.market,
      config.mint
    );
    const updatedPosition = updatedMarketData.traders.find(
      (t) => t.address === this.wallet.toBase58()
    );

    return { signature, position: updatedPosition || null };
  }

  async repayWithUI(
    config: MarketConfig,
    amount: Amount
  ): Promise<{
    signature: string;
    position: TraderPosition | null;
  }> {
    const bnAmount = this.convertToBN(amount);

    const signature = await this.repay(
      config.market,
      config.mint,
      bnAmount,
      config.optimizerProtocol
    );

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

  async repayAndWithdrawCollateralWithUI(
    config: MarketConfig,
    amount: Amount
  ): Promise<{
    signature: string;
    collateralAmountWithdrawn: BN;
    position: TraderPosition | null;
  }> {
    const bnAmount = this.convertToBN(amount);
    const priceData = await this.getMarketPriceData(
      new PublicKey(config.market),
      new PublicKey(config.mint)
    );
    const collateralAmountWithdrawable = await this.calculateRequiredCollateral(
      priceData,
      bnAmount
    );

    const repayIx = await this.repayIx(
      config.market,
      config.mint,
      bnAmount,
      config.optimizerProtocol
    );
    const withdrawSignature = await this.withdraw(
      config.collateralMarket,
      config.collateralMint,
      collateralAmountWithdrawable,
      config.optimizerProtocol,
      [repayIx]
    );
    const newPosition = await this.getTraderPosition(
      config.market,
      this.wallet
    );

    return {
      signature: withdrawSignature,
      collateralAmountWithdrawn: collateralAmountWithdrawable,
      position: newPosition,
    };
  }

  async withdrawWithUI(
    config: MarketConfig,
    amount: Amount
  ): Promise<{
    signature: string;
    position: TraderPosition | null;
    withdrawnAmount: number;
  }> {
    const bnAmount = this.convertToBN(amount);

    // Check available withdrawal amount
    const position = await this.getTraderPosition(config.market, this.wallet);
    const availableToWithdraw = position
      ? position.availableForLending
      : new BN(0);

    if (!position || bnAmount.gt(availableToWithdraw)) {
      throw new Error(
        `Cannot withdraw more than available (${availableToWithdraw})`
      );
    }

    const signature = await this.withdraw(
      config.market,
      config.mint,
      bnAmount,
      config.optimizerProtocol
    );

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

  calculateRemainingBorrowCapacity(
    priceData: MarketPriceData,
    collateralAmount: BN,
    borrowedAmount: BN
  ): BN {
    const maxBorrowAmount = calculate_max_borrow_amount(
      collateralAmount.toNumber(),
      priceData.collateralPriceInBorrowMint.toNumber(),
      priceData.collateralDecimals,
      priceData.borrowDecimals
    );

    return maxBorrowAmount.sub(borrowedAmount);
  }

  calculateRequiredCollateral(
    priceData: MarketPriceData,
    desiredBorrowAmount: BN
  ): BN {
    return calculate_required_collateral(
      desiredBorrowAmount,
      priceData.collateralPriceInBorrowMint,
      priceData.borrowDecimals,
      priceData.collateralDecimals
    );
  }

  calculateUSDValue(amount: BN, price: BN, decimals: number): BN {
    const pricePrecision = new BN(PRICE_PRECISION);
    if (decimals >= 2) {
      return amount.mul(price).div(pricePrecision);
    } else if (decimals < 2) {
      return amount
        .mul(price)
        .div(pricePrecision)
        .mul(new BN(10).pow(new BN(2 - decimals)));
    } else {
      return amount
        .mul(price)
        .div(pricePrecision)
        .div(new BN(10).pow(new BN(decimals - 2)));
    }
  }
  async getMarketHeaderUI(
    marketPublicKey: web3.PublicKey,
    mint: web3.PublicKey
  ): Promise<MarketHeaderUI> {
    const marketHeader = await this.getMarketHeader(marketPublicKey, mint);
    return {
      authority: marketHeader.authority.toBase58(),
      mint: mint.toBase58(),
      feeRecipient: marketHeader.feeRecipient.toBase58(),
      marketId: marketHeader.marketId.toNumber(),
      status: marketHeader.status.toNumber(),
      tokenProgram: marketHeader.tokenProgram.toBase58(),
      vault: marketHeader.vault.toBase58(),
      market: marketPublicKey.toBase58(),
      collateralMarket: marketHeader.collateralMarket.toBase58(),
      collateralMint: marketHeader.collateralMint.toBase58(),
      collateralTokenProgram: marketHeader.collateralTokenProgram.toBase58(),
      optimizerProgram: marketHeader.optimizerProgram.toBase58(),
    };
  }

  async getMarketDataUI(
    marketPublicKey: web3.PublicKey,
    mint: web3.PublicKey
  ): Promise<MarketDataUI> {
    const marketData = await this.getMarket(marketPublicKey);
    const marketHeader = await this.getMarketHeader(marketPublicKey, mint);
    let priceData = await this.getMarketPriceData(
      marketHeader.market,
      marketHeader.mint
    );
    // Create an index map for traders first
    const traderIndexMap = new Map<number, string>();
    const traders: TraderPositionUI[] = Array.from(
      marketData.traders.entries()
    ).map(([address, state], index) => {
      // Store the address for each index
      traderIndexMap.set(index + 1, address); // +1 because indices are 1-based

      // Calculate health factor and max borrow

      const maxBorrowAmount = calculate_max_borrow_amount(
        state.collateralAmount.toNumber(),
        priceData.collateralPriceInBorrowMint.toNumber(),
        priceData.collateralDecimals,
        priceData.borrowDecimals
      );
      let isLender = null;
      if (state.onVaultLends.gt(new BN(0)) || state.inP2pLends.gt(new BN(0))) {
        isLender = true;
      } else if (
        state.onVaultBorrows.gt(new BN(0)) ||
        state.inP2pBorrows.gt(new BN(0))
      ) {
        isLender = false;
      }

      return {
        address,
        isLender,
        isP2pEnabled: state.flags == 1,
        borrowing: {
          borrowPending: state.onVaultBorrows,
          p2pBorrowed: state.inP2pBorrows,
        },
        lending: {
          deposits: state.onVaultLends,
          p2pLends: state.inP2pLends,
          collateral: {
            amount: state.collateralAmount,
            maxBorrowAmount: maxBorrowAmount,
          },
        },
      };
    });

    // Convert matches to UI format with proper trader addresses
    const matches = Array.from(marketData.matches.entries()).map(
      ([id, state]) =>
        ({
          id,
          lender:
            traderIndexMap.get(state.lenderIndex) ||
            `unknown-${state.lenderIndex}`,
          borrower:
            traderIndexMap.get(state.borrowerIndex) ||
            `unknown-${state.borrowerIndex}`,
          amount: state.amountInP2p,
          timestamp: new Date(state.matchTimestamp.toNumber() * 1000),
          durationInDays: this.calculateMatchDuration(state.matchTimestamp),
        } as MatchStateUI)
    );
    let totalAmountInP2p = matches.reduce((sum, m) => {
      return sum.add(m.amount);
    }, new BN(0));
    let totalSupply = traders.reduce((sum, t) => {
      if (t.isLender) {
        const lendingPosition = t.lending;
        return sum.add(lendingPosition.deposits).add(lendingPosition.p2pLends);
      }
      return sum;
    }, new BN(0));
    let totalLendAmountUnmatched = traders.reduce((sum, t) => {
      if (t.isLender) {
        const lendingPosition = t.lending;
        return sum
          .add(lendingPosition.deposits)
          .sub(lendingPosition.collateral.amount);
      }
      return sum;
    }, new BN(0));
    let totalBorrowed = traders.reduce((sum, t) => {
      if (t.isLender != null && !t.isLender) {
        const borrowingPosition = t.borrowing;
        return sum.add(borrowingPosition.p2pBorrowed);
      }
      return sum;
    }, new BN(0));
    let borrowAmountUnmatched = traders.reduce((sum, t) => {
      if (t.isLender != null && !t.isLender) {
        const borrowingPosition = t.borrowing;
        return sum.add(borrowingPosition.borrowPending);
      }
      return sum;
    }, new BN(0));

    let totalCollateral = traders.reduce((sum, t) => {
      if (t.isLender) {
        const lendingPosition = t.lending;
        return sum.add(lendingPosition.collateral.amount);
      }
      return sum;
    }, new BN(0));
    // Calculate market stats
    const stats: MarketDataUI["stats"] = {
      totalAmountInP2p,
      totalLiquidityAvailable: totalLendAmountUnmatched,
      deposits: {
        totalSupply: totalSupply,
        lendAmountUnmatched: totalLendAmountUnmatched,
        collateral: totalCollateral,
        // valueInUSD: traders.reduce((sum, t) => {
        //   if (t.isLender) {
        //     const lendingPosition = t.lending;
        //     return sum.add(lendingPosition.valueInUSD);
        //   }
        //   return sum;
        // }, new BN(0)),
      },
      borrows: {
        totalBorrowedP2p: totalBorrowed,
        borrowAmountUnmatched,
        utilizationRate: 0,
        // valueInUSD: traders.reduce((sum, t) => {
        //   if (!t.isLender) {
        //     const borrowingPosition = t.borrowing;
        //     return sum.add(borrowingPosition.valueInUSD);
        //   }
        //   return sum;
        // }, new BN(0)),
      },

      traders: {
        count: traders.length,
        activeCount: traders.filter((t) => {
          if (t.isLender) {
            const lendingPosition = t.lending;
            return (
              lendingPosition.deposits.gt(new BN(0)) ||
              lendingPosition.p2pLends.gt(new BN(0))
            );
          } else {
            const borrowingPosition = t.borrowing;
            return (
              borrowingPosition.borrowPending.gt(new BN(0)) ||
              borrowingPosition.p2pBorrowed.gt(new BN(0))
            );
          }
        }).length,
      },
    };

    // Calculate utilization rate in basis points (10000 = 100%)
    stats.borrows.utilizationRate = stats.deposits.totalSupply.gt(new BN(0))
      ? stats.borrows.totalBorrowedP2p
          .mul(new BN(10000)) // Multiply by 10000 for basis points
          .div(stats.deposits.totalSupply)
          .toNumber()
      : 0;

    return {
      optimizerProtocol: this.getProtocolNameByOptimizerProgram(
        marketHeader.optimizerProgram
      ),
      midRateYield: marketData.midRateYield,
      totalMatchesHappened: marketData.matchSequenceNumber,
      marketId: marketHeader.marketId.toNumber(),
      collateralMarket: marketHeader.collateralMarket.toBase58(),
      lendingMarket: marketPublicKey.toBase58(),
      lendingMint: mint.toBase58(),
      collateralMint: marketHeader.collateralMint.toBase58(),
      status: this.getMarketStatus(marketHeader.status),
      stats,
      traders,
      matches,
      recentActivity: [...matches]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10),
      params: {
        liquidationThreshold: priceData.liquidationThreshold,
        ltv: Math.floor(priceData.liquidationThreshold * 0.95), // 95% of liquidation threshold, rounded down
        lendingDecimals: priceData.borrowDecimals,
        collateralDecimals: priceData.collateralDecimals,
      },
    };
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

  // Helper method to get current market prices and configuration
  async getMarketPriceData(
    lendingMarket: PublicKey,
    mint: PublicKey
  ): Promise<MarketPriceData> {
    let marketHeader = await this.getMarketHeader(lendingMarket, mint);
    let collateralMarketHeader = await this.getMarketHeader(
      marketHeader.collateralMarket,
      marketHeader.collateralMint
    );
    let collateralDecimals = await this.getTokenDecimals(
      collateralMarketHeader.mint
    );
    let borrowDecimals = await this.getTokenDecimals(marketHeader.mint);
    // This should be implemented with your price oracle

    return {
      collateralPriceInBorrowMint: new BN(0),
      borrowPriceInCollateralMint: new BN(0),
      collateralDecimals,
      borrowDecimals,
      liquidationThreshold: 8000,
    };
  }
}

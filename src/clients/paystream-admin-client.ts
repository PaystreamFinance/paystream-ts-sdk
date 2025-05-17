import { AnchorProvider, BN, web3 } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor/dist/cjs/program";
import { SystemProgram, TransactionInstruction } from "@solana/web3.js";
import PaystreamV1IDL from "../idls/paystream_v1.json";
import { Protocol } from "../types";
import { PaystreamV1 } from "../types/paystream_v1";
import { DriftOptimizerProgram } from "./drift-optimizer-client";
import { PaystreamV1Program } from "./paystream-client";

export class PaystreamV1AdminClient {
  private program: Program<PaystreamV1>;
  private wallet: web3.PublicKey;
  private paystreamV1Program: PaystreamV1Program;
  private driftOptimizerProgram: DriftOptimizerProgram;
  constructor(provider: AnchorProvider) {
    this.program = new Program(PaystreamV1IDL, provider);
    this.wallet = provider.publicKey;
    this.paystreamV1Program = new PaystreamV1Program(provider);
    this.driftOptimizerProgram = new DriftOptimizerProgram(provider);
  }

  updateProvider(provider: AnchorProvider) {
    this.program = new Program(PaystreamV1IDL as PaystreamV1, provider);
    this.wallet = provider.publicKey;
  }
  async initializeDriftAccounts(): Promise<TransactionInstruction> {
    const ix = await this.program.methods
      .initializeDriftAccounts()
      .accounts({})
      .instruction();
    return ix;
  }
  // Instruction methods
  async initializeMarkets({
    marketId,
    market,
    collateralMarket,
    collateralMint,
    collateralOraclePubkey,
    collateralOracleSource,
    collateralTokenProgram,
    feeRecipient,
    mint,
    optimizerProgram,
    oraclePubkey,
    oracleSource,
    tokenProgram,
    preInstructions,
    ltv,
    collateralMarketLtv,
    liquidationThreshold,
    collateralLiquidationThreshold,
  }: {
    marketId: BN;
    market: web3.Keypair;
    collateralMarket: web3.Keypair;
    mint: web3.PublicKey;
    collateralMint: web3.PublicKey;
    oraclePubkey: web3.PublicKey;
    collateralOraclePubkey: web3.PublicKey;
    oracleSource: number;
    collateralOracleSource: number;
    tokenProgram: web3.PublicKey;
    collateralTokenProgram: web3.PublicKey;
    optimizerProgram: web3.PublicKey;
    feeRecipient: web3.PublicKey;
    ltv: BN;
    collateralMarketLtv: BN;
    liquidationThreshold: BN;
    collateralLiquidationThreshold: BN;
    preInstructions?: web3.TransactionInstruction[];
  }): Promise<TransactionInstruction[]> {
    const marketSpace = 8 + 13448;
    const preIxns = preInstructions ?? [];
    const lamports =
      await this.program.provider.connection.getMinimumBalanceForRentExemption(
        marketSpace
      );
    const lendingMarketInstructions = SystemProgram.createAccount({
      fromPubkey: this.wallet,
      newAccountPubkey: market.publicKey,
      space: marketSpace,
      lamports: lamports,
      programId: this.program.programId,
    });
    preIxns.push(lendingMarketInstructions);
    const collateralMarketInstructions = SystemProgram.createAccount({
      fromPubkey: this.wallet,
      newAccountPubkey: collateralMarket.publicKey,
      space: marketSpace,
      lamports: lamports,
      programId: this.program.programId,
    });
    preIxns.push(collateralMarketInstructions);
    console.log("Oracle pubkey", oraclePubkey.toBase58());
    console.log("Oracle source", oracleSource);
    console.log("Collateral oracle pubkey", collateralOraclePubkey.toBase58());
    console.log("Collateral oracle source", collateralOracleSource);
    const initializeLendingMarketIx = await this.program.methods
      .initializeMarket(
        feeRecipient,
        marketId,
        oraclePubkey,
        oracleSource,
        collateralOraclePubkey,
        collateralOracleSource,
        ltv,
        liquidationThreshold
      )
      .accounts({
        authority: this.wallet,
        mint: mint,
        tokenProgram: tokenProgram,
        market: market.publicKey,
        collateralMarket: collateralMarket.publicKey,
        collateralTokenProgram: collateralTokenProgram,
        collateralMint: collateralMint,
        optimizerProgram,
      })
      .signers([market])
      .instruction();
    const collateralMarketId = marketId.add(new BN(1));
    console.log("Collateral market id", collateralMarketId.toString());
    console.log("Oracle pubkey", collateralOraclePubkey.toBase58());
    console.log("Oracle source", collateralOracleSource);
    console.log("Collateral oracle pubkey", oraclePubkey.toBase58());
    console.log("Collateral oracle source", oracleSource);
    const initializeCollateralMarketIx = await this.program.methods
      .initializeMarket(
        feeRecipient,
        collateralMarketId,
        collateralOraclePubkey,
        collateralOracleSource,
        oraclePubkey,
        oracleSource,
        collateralMarketLtv,
        collateralLiquidationThreshold
      )
      .accounts({
        authority: this.wallet,
        mint: collateralMint,
        tokenProgram: collateralTokenProgram,
        market: collateralMarket.publicKey,
        collateralMarket: market.publicKey,
        collateralTokenProgram: tokenProgram,
        collateralMint: mint,
        optimizerProgram,
      })
      .signers([collateralMarket])
      .instruction();
    preIxns.push(initializeLendingMarketIx);
    preIxns.push(initializeCollateralMarketIx);
    return preIxns;
  }

  async updateMarketHeader(
    market: web3.PublicKey,
    collateralMarket: web3.PublicKey,
    mint: web3.PublicKey,
    collateralMint: web3.PublicKey,
    feeRecipient: web3.PublicKey,
    oracle: web3.PublicKey,
    oracleSource: number,
    collateralOracle: web3.PublicKey,
    collateralOracleSource: number,
    updateMarketStatus: BN,
    ltv: BN,
    collateralMarketLtv: BN,
    liquidationThreshold: BN,
    collateralLiquidationThreshold: BN,
    protocol: Protocol
  ): Promise<string> {
    const marketHeaderPda = this.paystreamV1Program.getMarketHeaderPda(
      market,
      mint
    );
    const collateralMarketHeaderPda =
      this.paystreamV1Program.getMarketHeaderPda(
        collateralMarket,
        collateralMint
      );
    const { optimizerProgram } =
      await this.paystreamV1Program.getProtocolByName(
        protocol,
        mint,
        collateralMint
      );
    const ix = await this.program.methods
      .updateMarketHeader(
        feeRecipient,
        updateMarketStatus,
        oracle,
        oracleSource,
        collateralOracle,
        collateralOracleSource,
        ltv,
        liquidationThreshold
      )
      .accounts({
        marketHeader: marketHeaderPda,
        authority: this.wallet,
        optimizerProgram,
      })
      .instruction();
    const tx = await this.program.methods
      .updateMarketHeader(
        feeRecipient,
        updateMarketStatus,
        collateralOracle,
        collateralOracleSource,
        oracle,
        oracleSource,
        collateralMarketLtv,
        collateralLiquidationThreshold
      )
      .accounts({
        marketHeader: collateralMarketHeaderPda,
        authority: this.wallet,
        optimizerProgram,
      })
      .preInstructions([ix])
      .rpc();

    return tx;
  }

  async updateMarketAuthority(
    newAuthority: web3.PublicKey
  ): Promise<TransactionInstruction[]> {
    const allMarketHeaders =
      await this.paystreamV1Program.getAllMarketHeaders();
    const ixs: TransactionInstruction[] = [];
    const driftOptimizerIx = await this.driftOptimizerProgram.updateAuthority(
      newAuthority
    );
    ixs.push(driftOptimizerIx);
    for (const marketHeader of allMarketHeaders) {
      console.log(
        "Updating market authority",
        marketHeader.authority.toBase58()
      );
      const ix = await this.program.methods
        .updateMarketAuthority(newAuthority)
        .accounts({
          marketHeader: marketHeader.publicKey,
          authority: this.wallet,
        })
        .instruction();
      ixs.push(ix);
    }
    return ixs;
  }

  async approveSeat(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    trader: web3.PublicKey
  ): Promise<string> {
    let marketHeaderPda = this.paystreamV1Program.getMarketHeaderPda(
      market,
      mint
    );
    let seatPda = this.paystreamV1Program.getSeatPda(marketHeaderPda, trader);
    const tx = await this.program.methods
      .approveSeat()
      .accounts({
        seat: seatPda,
        marketHeader: marketHeaderPda,
      })
      .rpc();

    return tx;
  }

  async allocateSeatIx(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    trader: web3.PublicKey
  ): Promise<TransactionInstruction> {
    let marketHeaderPda = this.paystreamV1Program.getMarketHeaderPda(
      market,
      mint
    );
    const ix = await this.program.methods
      .allocateSeat()
      .accounts({
        trader: trader,
        marketHeader: marketHeaderPda,
        authority: this.wallet,
      })
      .instruction();

    return ix;
  }

  async changeMarketStatus(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    status: BN
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.paystreamV1Program.getMarketHeaderPda(
      market,
      mint
    );
    const ix = await this.program.methods
      .changeMarketStatus(status)
      .accounts({
        marketHeader: marketHeaderPda,
        authority: this.wallet,
      })
      .instruction();
    return ix;
  }
  async dangerouslyMutateCollateral(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    trader: web3.PublicKey,
    isIncrease: boolean,
    amount: BN
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.paystreamV1Program.getMarketHeaderPda(
      market,
      mint
    );
    const seatPda = this.paystreamV1Program.getSeatPda(marketHeaderPda, trader);
    const ix = await this.program.methods
      .dangerouslyMutateCollateral(isIncrease, amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        admin: this.wallet,
      })
      .instruction();
    return ix;
  }
  async dangerouslyMutateOnVaultBorrow(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    trader: web3.PublicKey,
    isIncrease: boolean,
    amount: BN
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.paystreamV1Program.getMarketHeaderPda(
      market,
      mint
    );
    const seatPda = this.paystreamV1Program.getSeatPda(marketHeaderPda, trader);
    const ix = await this.program.methods
      .dangerouslyMutateOnVaultBorrow(isIncrease, amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        admin: this.wallet,
      })
      .instruction();
    return ix;
  }
  async dangerouslyMutateOnVaultLends(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    trader: web3.PublicKey,
    isIncrease: boolean,
    amount: BN
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.paystreamV1Program.getMarketHeaderPda(
      market,
      mint
    );
    const seatPda = this.paystreamV1Program.getSeatPda(marketHeaderPda, trader);
    const ix = await this.program.methods
      .dangerouslyMutateOnVaultLends(isIncrease, amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        admin: this.wallet,
      })
      .instruction();
    return ix;
  }
  async dangerouslyMutateP2pBorrow(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    trader: web3.PublicKey,
    isIncrease: boolean,
    amount: BN
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.paystreamV1Program.getMarketHeaderPda(
      market,
      mint
    );
    const seatPda = this.paystreamV1Program.getSeatPda(marketHeaderPda, trader);
    const ix = await this.program.methods
      .dangerouslyMutateP2pBorrow(isIncrease, amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        admin: this.wallet,
      })
      .instruction();
    return ix;
  }
  async dangerouslyMutateP2pLends(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    trader: web3.PublicKey,
    isIncrease: boolean,
    amount: BN
  ): Promise<TransactionInstruction> {
    const marketHeaderPda = this.paystreamV1Program.getMarketHeaderPda(
      market,
      mint
    );
    const seatPda = this.paystreamV1Program.getSeatPda(marketHeaderPda, trader);
    const ix = await this.program.methods
      .dangerouslyMutateP2pLends(isIncrease, amount)
      .accounts({
        marketHeader: marketHeaderPda,
        seat: seatPda,
        admin: this.wallet,
      })
      .instruction();
    return ix;
  }
}

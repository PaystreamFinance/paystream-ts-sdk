import { Program } from "@coral-xyz/anchor/dist/cjs/program";
import { PaystreamV1 } from "../types/paystream_v1";
import PaystreamV1IDL from "../idls/paystream_v1.json";
import { AnchorProvider, BN, web3 } from "@coral-xyz/anchor";
import { PaystreamV1Program } from "./paystream-client";
export class PaystreamV1AdminClient {
  private program: Program<PaystreamV1>;
  private wallet: web3.PublicKey;
  private paystreamV1Program: PaystreamV1Program;
  constructor(provider: AnchorProvider) {
    this.program = new Program(
      PaystreamV1IDL as unknown as PaystreamV1,
      provider
    );
    this.wallet = provider.publicKey;
    this.paystreamV1Program = new PaystreamV1Program(provider);
  }

  updateProvider(provider: AnchorProvider) {
    this.program = new Program(
      PaystreamV1IDL as unknown as PaystreamV1,
      provider
    );
    this.wallet = provider.publicKey;
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
    preInstructions?: web3.TransactionInstruction[]
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
    const marketHeaderPda = this.paystreamV1Program.getMarketHeaderPda(
      market,
      mint
    );
    const tx = await this.program.methods
      .updateMarketAuthority(newAuthority)
      .accounts({
        marketHeader: marketHeaderPda,
        authority: this.wallet,
      })
      .rpc();
    return tx;
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

  async allocateSeat(
    market: web3.PublicKey,
    mint: web3.PublicKey,
    trader: web3.PublicKey
  ): Promise<string> {
    let marketHeaderPda = this.paystreamV1Program.getMarketHeaderPda(
      market,
      mint
    );
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
}

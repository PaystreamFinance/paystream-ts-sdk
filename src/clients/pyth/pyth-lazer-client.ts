import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { Idl, Program } from "@coral-xyz/anchor-v0.29";
import { DRIFT_PROGRAM_ID } from "@drift-labs/sdk";
import driftIDL from "@drift-labs/sdk/lib/browser/idl/drift.json";
import { Connection, PublicKey } from "@solana/web3.js";
import { PRICE_PRECISION } from "../../math";
import {
  getMultiples,
  OracleClient,
  OraclePriceData,
  PythLazerOracles,
  PythStableCoinOracles,
} from "../../types";

export class PythLazerClient implements OracleClient {
  private connection: Connection;
  readonly multiple: BN;
  readonly isStableCoin: boolean;
  readonly oraclePublicKey: PublicKey;
  readonly oracleSource: number;
  private program: Program;
  readonly decodeFunc: (name: string, data: Buffer) => any;

  public constructor(
    provider: AnchorProvider,
    oraclePublicKey: PublicKey,
    oracleSource: number
  ) {
    if (!PythLazerOracles.has(oracleSource)) {
      throw new Error("Invalid oracle source");
    }
    this.connection = provider.connection;
    this.multiple = getMultiples(oracleSource);
    this.isStableCoin = PythStableCoinOracles.has(oracleSource);
    this.oraclePublicKey = oraclePublicKey;
    this.oracleSource = oracleSource;
    this.program = new Program(
      driftIDL as Idl,
      new PublicKey(DRIFT_PROGRAM_ID),
      provider
    );
    this.decodeFunc =
      this.program.account.pythLazerOracle.coder.accounts.decodeUnchecked.bind(
        this.program.account.pythLazerOracle.coder.accounts
      );
  }

  public async getOraclePriceData(): Promise<OraclePriceData> {
    const accountInfo = await this.connection.getAccountInfo(
      this.oraclePublicKey
    );
    if (!accountInfo) {
      throw new Error("Account not found");
    }
    return this.getOraclePriceDataFromBuffer(accountInfo.data);
  }

  public getOraclePriceDataFromBuffer(buffer: Buffer): OraclePriceData {
    const priceData = this.decodeFunc("PythLazerOracle", buffer);
    const confidence = convertPythPrice(
      priceData.conf,
      priceData.exponent,
      this.multiple
    );
    let price = convertPythPrice(
      priceData.price,
      priceData.exponent,
      this.multiple
    );
    if (this.isStableCoin) {
      price = getStableCoinPrice(price, confidence);
    }

    return {
      price,
      slot: priceData.postedSlot,
      confidence,
      hasSufficientNumberOfDataPoints: true,
    };
  }
}

function convertPythPrice(price: BN, exponent: number, multiple: BN): BN {
  exponent = Math.abs(exponent);
  const pythPrecision = new BN(10).pow(new BN(exponent).abs()).div(multiple);
  return price.mul(PRICE_PRECISION).div(pythPrecision);
}

const fiveBPS = new BN(500);
function getStableCoinPrice(price: BN, confidence: BN): BN {
  if (price.sub(PRICE_PRECISION).abs().lt(BN.min(confidence, fiveBPS))) {
    return PRICE_PRECISION;
  } else {
    return price;
  }
}

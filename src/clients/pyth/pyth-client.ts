import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { parsePriceData } from "@pythnetwork/client";
import { Connection, PublicKey } from "@solana/web3.js";
import { PRICE_PRECISION } from "../../math";
import {
  getMultiples,
  OracleClient,
  OraclePriceData,
  PythOracles,
  PythStableCoinOracles,
} from "../../types";

export class PythClient implements OracleClient {
  private connection: Connection;
  private multiple: BN;
  readonly isStableCoin: boolean;
  readonly oraclePublicKey: PublicKey;
  readonly oracleSource: number;
  public constructor(
    provider: AnchorProvider,
    oraclePublicKey: PublicKey,
    oracleSource: number
  ) {
    if (!PythOracles.has(oracleSource)) {
      throw new Error("Invalid oracle source");
    }
    this.connection = provider.connection;
    this.multiple = getMultiples(oracleSource);
    this.isStableCoin = PythStableCoinOracles.has(oracleSource);
    this.oraclePublicKey = oraclePublicKey;
    this.oracleSource = oracleSource;
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
    const priceData = parsePriceData(buffer);
    if (priceData.aggregate.price === 0) {
      throw new Error("Price is 0");
    }
    if (!priceData.confidence) {
      throw new Error("No confidence recieved from Pyth, try again please.");
    }
    const confidence = convertPythPrice(
      priceData.confidence,
      priceData.exponent,
      this.multiple
    );
    const minPublishers = Math.min(priceData.numComponentPrices, 3);
    let price = convertPythPrice(
      priceData.aggregate.price,
      priceData.exponent,
      this.multiple
    );
    if (this.isStableCoin) {
      price = getStableCoinPrice(price, confidence);
    }

    return {
      price,
      confidence,
      slot: new BN(priceData.lastSlot.toString()),
      hasSufficientNumberOfDataPoints:
        priceData.numComponentPrices >= minPublishers,
    };
  }
}

function convertPythPrice(price: number, exponent: number, multiple: BN): BN {
  exponent = Math.abs(exponent);
  const pythPrecision = new BN(10).pow(new BN(exponent).abs()).div(multiple);
  return new BN(price * Math.pow(10, exponent))
    .mul(new BN(PRICE_PRECISION))
    .div(pythPrecision);
}

const fiveBPS = new BN(500);
function getStableCoinPrice(price: BN, confidence: BN): BN {
  if (price.sub(PRICE_PRECISION).abs().lt(BN.min(confidence, fiveBPS))) {
    return PRICE_PRECISION;
  } else {
    return price;
  }
}

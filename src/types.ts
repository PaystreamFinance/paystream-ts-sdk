import { BN, web3 } from "@coral-xyz/anchor";
import { SpotMarketAccount } from "@drift-labs/sdk";
import * as beet from "@metaplex-foundation/beet";
import { PublicKey } from "@solana/web3.js";

/**
 * Represents oracle information including its public key and source type
 * @typedef {Object} OracleInfo
 */
export type OracleInfo = {
  /** The public key of the oracle */
  publicKey: PublicKey;
  /** The source type of the oracle */
  source: OracleSourceNum;
};

/**
 * Enumeration of different oracle source types
 * Used to identify the source and scaling factor of price data
 */
export class OracleSourceNum {
  /** Standard Pyth oracle with 1:1 scaling */
  static readonly PYTH = 0;
  /** Quote asset price source with 1:1 scaling */
  static readonly QUOTE_ASSET = 1;
  /** Pyth oracle with 1:1000 scaling */
  static readonly PYTH_1K = 2;
  /** Pyth oracle with 1:1,000,000 scaling */
  static readonly PYTH_1M = 3;
  /** Pyth oracle for stablecoins with 1:1 scaling */
  static readonly PYTH_STABLE_COIN = 4;
  /** Pull-based Pyth oracle with 1:1 scaling */
  static readonly PYTH_PULL = 5;
  /** Pull-based Pyth oracle with 1:1000 scaling */
  static readonly PYTH_1K_PULL = 6;
  /** Pull-based Pyth oracle with 1:1,000,000 scaling */
  static readonly PYTH_1M_PULL = 7;
  /** Pull-based Pyth oracle for stablecoins */
  static readonly PYTH_STABLE_COIN_PULL = 8;
  /** Lazer-powered Pyth oracle with 1:1 scaling */
  static readonly PYTH_LAZER = 9;
  /** Lazer-powered Pyth oracle with 1:1000 scaling */
  static readonly PYTH_LAZER_1K = 10;
  /** Lazer-powered Pyth oracle with 1:1,000,000 scaling */
  static readonly PYTH_LAZER_1M = 11;
  /** Lazer-powered Pyth oracle for stablecoins */
  static readonly PYTH_LAZER_STABLE_COIN = 12;
}

/**
 * Represents price data from an oracle
 * @typedef {Object} OraclePriceData
 */
export type OraclePriceData = {
  /** The current price as a BN */
  price: BN;
  /** The slot number when this price was recorded */
  slot: BN;
  /** Confidence interval of the price */
  confidence: BN;
  /** Whether enough data points were available for this price */
  hasSufficientNumberOfDataPoints: boolean;
};

/**
 * Gets the price multiplier for a given oracle source
 * @param {number} oracleSource - The oracle source number
 * @returns {BN} The multiplier as a BN
 * @throws {Error} If the oracle source is invalid
 */
export const getMultiples = (oracleSource: number): BN => {
  switch (oracleSource) {
    case OracleSourceNum.PYTH:
      return new BN(1);
    case OracleSourceNum.QUOTE_ASSET:
      return new BN(1);
    case OracleSourceNum.PYTH_1K:
      return new BN(1000);
    case OracleSourceNum.PYTH_1M:
      return new BN(1000000);
    case OracleSourceNum.PYTH_STABLE_COIN:
      return new BN(1);
    case OracleSourceNum.PYTH_PULL:
      return new BN(1);
    case OracleSourceNum.PYTH_1K_PULL:
      return new BN(1000);
    case OracleSourceNum.PYTH_1M_PULL:
      return new BN(1000000);
    case OracleSourceNum.PYTH_STABLE_COIN_PULL:
      return new BN(1);
    case OracleSourceNum.PYTH_LAZER:
      return new BN(1);
    case OracleSourceNum.PYTH_LAZER_1K:
      return new BN(1000);
    case OracleSourceNum.PYTH_LAZER_1M:
      return new BN(1000000);
    case OracleSourceNum.PYTH_LAZER_STABLE_COIN:
      return new BN(1);
    default:
      throw new Error("Invalid oracle source");
  }
};

/** Set of standard Pyth oracle sources */
export const PythOracles = new Set([
  OracleSourceNum.PYTH,
  OracleSourceNum.PYTH_1K,
  OracleSourceNum.PYTH_1M,
  OracleSourceNum.PYTH_STABLE_COIN,
]);

/** Set of Pyth stablecoin oracle sources */
export const PythStableCoinOracles = new Set([
  OracleSourceNum.PYTH_STABLE_COIN,
  OracleSourceNum.PYTH_STABLE_COIN_PULL,
]);

/** Set of Pyth Lazer oracle sources */
export const PythLazerOracles = new Set([
  OracleSourceNum.PYTH_LAZER,
  OracleSourceNum.PYTH_LAZER_1K,
  OracleSourceNum.PYTH_LAZER_1M,
  OracleSourceNum.PYTH_LAZER_STABLE_COIN,
]);

/** Set of pull-based Pyth oracle sources */
export const PythPullOracles = new Set([
  OracleSourceNum.PYTH_PULL,
  OracleSourceNum.PYTH_1K_PULL,
  OracleSourceNum.PYTH_STABLE_COIN_PULL,
  OracleSourceNum.PYTH_1M_PULL,
]);

/**
 * Interface for oracle client implementations
 * @interface OracleClient
 */
export interface OracleClient {
  /**
   * Gets oracle price data from a buffer
   * @param {Buffer} buffer - The buffer containing oracle data
   * @returns {OraclePriceData} The parsed oracle price data
   */
  getOraclePriceDataFromBuffer(buffer: Buffer): OraclePriceData;

  /**
   * Gets the current oracle price data
   * @returns {Promise<OraclePriceData>} A promise resolving to the current price data
   */
  getOraclePriceData(): Promise<OraclePriceData>;
}

export enum MarketStatus {
  ACTIVE = 0,
  PAUSED = 1,
  CLOSED = 2,
  UNINITIALIZED = 3,
  TOMBSTONED = 4,
}

export const getMarketStatus = (status: BN): MarketStatus => {
  switch (status) {
    case new BN(0):
      return MarketStatus.ACTIVE;
    case new BN(1):
      return MarketStatus.PAUSED;
    case new BN(2):
      return MarketStatus.CLOSED;
    case new BN(3):
      return MarketStatus.UNINITIALIZED;
    case new BN(4):
      return MarketStatus.TOMBSTONED;
    default:
      throw new Error("Invalid market status");
  }
};

export const getMarketStatusNumber = (status: MarketStatus): BN => {
  switch (status) {
    case MarketStatus.ACTIVE:
      return new BN(0);
    case MarketStatus.PAUSED:
      return new BN(1);
    case MarketStatus.CLOSED:
      return new BN(2);
    case MarketStatus.UNINITIALIZED:
      return new BN(3);
    case MarketStatus.TOMBSTONED:
      return new BN(4);
    default:
      throw new Error("Invalid market status");
  }
};

/**
 * Represents the header information for a market
 * @interface MarketHeader
 */
export interface MarketHeader {
  /** Unique identifier for the market */
  marketId: BN;
  /** Public key of the market */
  market: PublicKey;
  /** Public key of the collateral market */
  collateralMarket: PublicKey;
  /** Token mint public key */
  mint: PublicKey;
  /** Collateral token mint public key */
  collateralMint: PublicKey;
  /** Token program public key */
  tokenProgram: PublicKey;
  /** Collateral token program public key */
  collateralTokenProgram: PublicKey;
  /** Market status */
  status: BN;
  /** Authority public key */
  authority: PublicKey;
  /** Vault public key */
  vault: PublicKey;
  /** Vault bump seed */
  vaultBump: number;
  /** PDA bump seed */
  bump: number;
  /** Fee recipient public key */
  feeRecipient: PublicKey;
  /** Oracle public key */
  oracle: PublicKey;
  /** Oracle source type */
  oracleSource: number;
  /** Collateral oracle public key */
  collateralOracle: PublicKey;
  /** Collateral oracle source type */
  collateralOracleSource: number;
  /** Loan-to-value ratio */
  ltvRatio: BN;
  /** Liquidation threshold */
  liquidationThreshold: BN;
  /** Optimizer program public key */
  optimizerProgram: PublicKey;
}

/**
 * Extends MarketHeader to include the market's public key
 * @interface MarketHeaderWithPubkey
 * @extends {MarketHeader}
 */
export interface MarketHeaderWithPubkey extends MarketHeader {
  /** Public key of the market */
  publicKey: PublicKey;
}

/**
 * Represents a trader's seat in a market
 * @interface Seat
 */
export interface Seat {
  /** Market public key */
  market: PublicKey;
  /** Trader's public key */
  trader: PublicKey;
  /** Approval state of the seat */
  approvalState: BN;
}

/**
 * Contains the complete state of a market
 * @interface MarketData
 */
export interface MarketData {
  /** Sequence number for matches */
  matchSequenceNumber: BN;
  /** Map of trader public keys to their states */
  traders: Map<string, TraderState>;
  /** Map of trader indices to their public keys */
  traderIndexToTrader: Map<string, string>;
  /** Map of match sequence numbers to match states */
  matches: Map<BN, MatchState>;
}

/**
 * Represents the current state of a trader in the market
 * @interface TraderState
 */
export interface TraderState {
  /** Amount of tokens lent to the vault but not matched, earning normal rates */
  onVaultLends: beet.bignum;
  /** Amount of tokens lent in P2P matches, earning p2p rates */
  inP2pLends: beet.bignum;
  /** Amount of tokens pending to be borrowed from the vault and not matched */
  onVaultBorrows: beet.bignum;
  /** Amount of tokens borrowed in P2P matches, paying p2p rates */
  inP2pBorrows: beet.bignum;
  /** Amount of collateral tokens deposited. This amount:
   * - Always will be >= amount of tokens lent to vault
   * - Decreases when vault lends are borrowed via P2P matches
   * - Increases when borrower repays, which decreases P2P lends and increases vault borrows
   */
  collateralAmount: beet.bignum;
  /** Flags indicating trader status and permissions */
  flags: beet.bignum;
}

/**
 * Represents the state of a match between a lender and borrower
 * @interface MatchState
 */
export interface MatchState {
  /** Index of the lender in the market */
  lenderIndex: beet.bignum;
  /** Index of the borrower in the market */
  borrowerIndex: beet.bignum;
  /** Current amount in the P2P match, earning / paying p2p rates */
  amountInP2p: beet.bignum;
  /** Original amount of the match */
  originalAmount: beet.bignum;
  /** Timestamp when the match was created */
  matchTimestamp: beet.bignum;
  /** Timestamp of the last interest payment */
  lastInterestPaymentTimestamp: beet.bignum;
  /** Total interest paid for this match */
  totalInterestPaid: beet.bignum;
}

/**
 * Complete market data including header, seats, and match information
 * @interface CompleteMarketData
 */
export interface CompleteMarketData {
  /** Market header information */
  marketHeader: MarketHeader;
  /** Array of trader seats in the market */
  seats: Seat[];
  /** Current match sequence number */
  matchSequenceNumber: BN;
  /** Map of trader public keys to their states */
  traders: Map<string, TraderState>;
  /** Map of match sequence numbers to match states */
  matches: Map<BN, MatchState>;
}

/** Type alias for amounts that can be represented as string, number, or BN */
export type Amount = string | number | BN;

/**
 * Configuration for a market
 * @interface MarketConfig
 */
export type MarketConfig = {
  /** Unique identifier for the market */
  marketId: number;
  /** Unique identifier for the collateral market */
  collateralMarketId: number;
  /** Market public key */
  market: web3.PublicKey;
  /** Collateral market public key */
  collateralMarket: web3.PublicKey;
  /** Token mint public key */
  mint: web3.PublicKey;
  /** Number of decimals for the token mint */
  mintDecimals: number;
  /** Collateral token mint public key */
  collateralMint: web3.PublicKey;
  /** Number of decimals for the collateral token mint */
  collateralMintDecimals: number;
  /** Token program public key */
  tokenProgram: web3.PublicKey;
  /** Collateral token program public key */
  collateralTokenProgram: web3.PublicKey;
  /** Protocol used for optimization */
  optimizerProtocol: Protocol;
  /** Optimizer program public key */
  optimizerProgram: web3.PublicKey;
  /** Oracle public key */
  oracle: PublicKey;
  /** Oracle source type */
  oracleSource: number;
  /** Collateral oracle public key */
  collateralOracle: PublicKey;
  /** Collateral oracle source type */
  collateralOracleSource: number;
  /** Loan-to-value ratio in basis points */
  ltvRatio: BN;
  /** Liquidation threshold in basis points */
  liquidationThreshold: BN;
  /** Collateral loan-to-value ratio in basis points */
  collateralLtvRatio: BN;
  /** Collateral liquidation threshold in basis points */
  collateralLiquidationThreshold: BN;
  /** Current market status */
  marketStatus: BN;
};

/**
 * Represents a trader's position in the market
 * @interface TraderPosition
 */
export type TraderPosition = {
  /** Amount of tokens lent to the vault but not matched, earning normal rates */
  onVaultLends: BN;
  /** Amount of tokens lent in P2P matches, earning p2p rates */
  inP2pLends: BN;
  /** Amount of tokens pending to be borrowed from the vault and not matched */
  onVaultBorrows: BN;
  /** Amount of tokens borrowed in P2P matches, paying p2p rates */
  inP2pBorrows: BN;
  /** Amount of collateral tokens deposited. This amount:
   * - Always will be >= amount of tokens lent to vault
   * - Decreases when vault lends are borrowed via P2P matches
   * - Increases when borrower repays, which decreases P2P lends and increases vault borrows
   */
  collateralAmount: BN;
  /** Whether P2P lending / borrowing is enabled for this trader */
  isP2pEnabled: boolean;
};

/**
 * UI representation of a match state
 * @interface MatchStateUI
 */
export interface MatchStateUI {
  /** Token mint address */
  mint: string;
  /** Unique identifier for the match */
  id: BN;
  /** Public key of the lender */
  lender: string;
  /** Public key of the borrower */
  borrower: string;
  /** Amount of tokens matched */
  amount: BN;
  /** USD value of matched amount */
  amountInUSD: number;
  /** When the match was created */
  timestamp: Date;
  /** How long the match has been active in days */
  durationInDays: number;
}

/**
 * UI representation of a trader's complete position
 * @interface TraderPositionUI
 */
export interface TraderPositionUI {
  /** Token mint address */
  mint: string;
  /** Trader's public key */
  address: string;
  /** Whether trader is lending (true), borrowing (false), or neither (null) */
  isLender: boolean | null;
  /** Whether P2P trading is enabled for this trader */
  isP2pEnabled: boolean;
  /** Trader's borrowing details */
  borrowing: BorrowingPosition;
  /** Trader's lending details */
  lending: LendingPosition;
}

/**
 * Details of a trader's lending position
 * @interface LendingPosition
 */
export interface LendingPosition {
  /** Amount lent to be earn p2p rates but not matched yet */
  onVaultLends: BN;
  /** USD value of vault lending */
  onVaultLendsInUSD: number;
  /** Amount lent peer-to-peer */
  p2pLends: BN;
  /** USD value of P2P lending */
  p2pLendsInUsdValue: number;
  /** Collateral information */
  collateral: {
    /** Amount of collateral deposited */
    amount: BN;
    /** USD value of collateral */
    amountInUSD: number;
  };
}

/**
 * Details of a trader's borrowing position
 * @interface BorrowingPosition
 */
export interface BorrowingPosition {
  /** Amount pending to be borrowed but not matched yet */
  borrowPending: BN;
  /** USD value of pending borrows */
  borrowPendingInUSD: number;
  /** Amount borrowed peer-to-peer */
  p2pBorrowed: BN;
  /** USD value of P2P borrowing */
  p2pBorrowedInUSD: number;
}

/**
 * Aggregate statistics for a market
 * @interface MarketStatsUI
 */
export interface MarketStatsUI {
  /** Token mint address */
  mint: string;
  /** Total amount in P2P matches */
  totalAmountInP2p: BN;
  /** USD value of P2P matches */
  totalAmountInP2pInUSD: number;
  /** Total available liquidity (sum of all on vault lends) */
  totalLiquidityAvailable: BN;
  /** USD value of available liquidity */
  totalLiquidityAvailableInUSD: number;
  /** Deposit-related statistics */
  deposits: {
    /** Total supply in market */
    totalSupply: BN;
    /** USD value of total supply */
    totalSupplyInUSD: number;
    /** Unmatched lending amount */
    lendAmountUnmatched: BN;
    /** USD value of unmatched lending */
    lendAmountUnmatchedInUSD: number;
    /** Total collateral deposited */
    collateral: BN;
    /** USD value of collateral */
    collateralInUSD: number;
  };
  /** Borrow-related statistics */
  borrows: {
    /** Total P2P borrowed amount */
    totalBorrowedP2p: BN;
    /** USD value of P2P borrowing */
    totalBorrowedP2pInUSD: number;
    /** Unmatched borrowing amount */
    borrowAmountUnmatched: BN;
    /** USD value of unmatched borrowing */
    borrowAmountUnmatchedInUSD: number;
    /** Total match rate (ratio of total borrows to total liquidity) */
    utilizationRate: number;
  };
  /** Trader statistics */
  traders: {
    /** Total number of traders */
    count: number;
    /** Number of active traders */
    activeCount: number;
  };
}

/** Supported lending protocols */
export type Protocol = "drift";

/**
 * Base configuration for protocols
 * @interface ProtocolConfig
 */
export interface ProtocolConfig {
  /** Protocol identifier */
  protocol: Protocol;
  /** Program ID */
  protocolProgram: web3.PublicKey;
  /** Vault address */
  protocolVault: web3.PublicKey;
  /** Vault authority */
  protocolVaultAuthority: web3.PublicKey;
  /** Optimizer program ID */
  optimizerProgram: web3.PublicKey;
  /** Token mint */
  mint: web3.PublicKey;
  /** Collateral token mint */
  collateralMint: web3.PublicKey;
  /** Token program ID */
  tokenProgram: web3.PublicKey;
  /** Collateral token program ID */
  collateralTokenProgram: web3.PublicKey;
}

/**
 * Drift-specific protocol configuration
 * @interface DriftProtocolConfig
 * @extends {ProtocolConfig}
 */
export interface DriftProtocolConfig extends ProtocolConfig {
  /** Drift spot market account */
  spotMarketAccount: SpotMarketAccount;
  /** Collateral spot market */
  collateralSpotMarketAccount: SpotMarketAccount;
  /** Drift state account */
  state: web3.PublicKey;
  /** User's Drift account */
  userAccount: web3.PublicKey;
  /** User's Drift stats */
  userStats: web3.PublicKey;
  /** Drift program signer */
  driftSigner: web3.PublicKey;
}

/**
 * Protocol metrics interface
 * @interface ProtocolMetrics
 * @extends {ProtocolConfig}
 */
export interface ProtocolMetrics extends ProtocolConfig {
  /** Utilization rate */
  utilizationRate: BN;
  /** Deposit rate */
  depositRate: BN;
  /** Borrow rate */
  borrowRate: BN;
  /** Total deposits */
  totalDeposits: BN;
  /** Total borrows */
  totalBorrows: BN;
}

/**
 * Drift-specific protocol metrics
 * @interface DriftMetrics
 * @extends {DriftProtocolConfig}
 * @extends {ProtocolMetrics}
 */
export interface DriftMetrics extends DriftProtocolConfig, ProtocolMetrics {}

/**
 * Complete metrics for the Paystream protocol
 * @interface PaystreamMetrics
 * @template T - Protocol type
 */
export interface PaystreamMetrics<T extends Protocol> {
  /** Protocol-specific metrics */
  protocolMetrics: T extends "drift" ? DriftMetrics : never;
  /** Mid-rate APY */
  midRateApy: BN;
  /** Total deposits on vault */
  totalDepositsOnVault: BN;
  /** Total borrows on vault */
  totalBorrowsOnVault: BN;
  /** Total deposits in P2P */
  totalDepositsInP2p: BN;
  /** Market statistics */
  marketStats: MarketStatsUI;
}

/**
 * Complete market data for UI display
 * @interface MarketDataUI
 */
export interface MarketDataUI {
  /** Unique market identifier */
  marketId: number;
  /** Lending market address */
  lendingMarket: string;
  /** Collateral market address */
  collateralMarket: string;
  /** Lending token mint */
  lendingMint: string;
  /** Collateral token mint */
  collateralMint: string;
  /** Market status */
  status: "active" | "paused" | "closed" | "uninitialized" | "tombstoned";
  /** Total number of matches created */
  totalMatchesHappened: BN;

  /** Market statistics */
  stats: MarketStatsUI;
  /** List of trader positions */
  traders: TraderPositionUI[];
  /** List of all matches */
  matches: MatchStateUI[];
  /** Recent match activity */
  recentActivity: MatchStateUI[];
  /** Protocol being used */
  optimizerProtocol: Protocol;

  /** Market parameters */
  params: {
    /** Liquidation threshold in basis points */
    liquidationThreshold: BN;
    /** Loan-to-value ratio in basis points */
    ltv: BN;
    /** Decimals for lending token */
    lendingDecimals: number;
    /** Decimals for collateral token */
    collateralDecimals: number;
  };
}

/**
 * Price data for market calculations
 * @interface MarketPriceData
 */
export interface MarketPriceData {
  /** Raw market price */
  originalMarketPrice: BN;
  /** Raw collateral price */
  originalCollateralPrice: BN;
  /** Collateral price in the borrow token scaled by the price precision */
  collateralPriceInBorrowMintScaled: BN;
  /** Borrow price in the collateral token scaled by the price precision */
  borrowPriceInCollateralMintScaled: BN;
}

/**
 * Combined market and price data for a lending/collateral market pair
 * @interface MarketPairData
 */
export interface MarketPairData {
  /** Lending market data */
  lendingMarket: MarketData;
  /** Collateral market data */
  collateralMarket: MarketData;
  /** Price information */
  prices: {
    /** Lending token price in USD */
    lendingTokenPriceInUSD: BN;
    /** Collateral token price in USD */
    collateralTokenPriceInUSD: BN;
    /** Number of decimals for lending token */
    lendingDecimals: number;
    /** Number of decimals for collateral token */
    collateralDecimals: number;
  };
  /** Configuration parameters */
  config: {
    /** Liquidation threshold in basis points */
    liquidationThreshold: number;
    /** Loan-to-value ratio in basis points */
    ltv: number;
  };
}

/**
 * UI representation of market header information
 * @interface MarketHeaderUI
 */
export interface MarketHeaderUI {
  /** Unique market identifier */
  marketId: number;
  /** Market address */
  market: string;
  /** Collateral market address */
  collateralMarket: string;
  /** Token mint address */
  mint: string;
  /** Collateral token mint address */
  collateralMint: string;
  /** Token program address */
  tokenProgram: string;
  /** Collateral token program address */
  collateralTokenProgram: string;
  /** Market status */
  status: number;
  /** Authority address */
  authority: string;
  /** Vault address */
  vault: string;
  /** Fee recipient address */
  feeRecipient: string;
  /** Optimizer program address */
  optimizerProgram: string;
}

/** Public key for wrapped SOL */
export const WSOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
export const SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
export const USDC_MARKET = new PublicKey(
  "CCQXHfu51HEpiaegMU2kyYZK7dw1NhNbAX6cV44gZDJ8"
);
export const SOL_MARKET = new PublicKey(
  "GSjnD3XA1ezr7Xew3PZKPJdKGhjWEGefFFxXJhsfrX5e"
);

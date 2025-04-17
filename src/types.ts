import { BN, web3 } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

// Program State
export interface MarketHeader {
  marketId: BN;
  market: PublicKey;
  collateralMarket: PublicKey;
  mint: PublicKey;
  collateralMint: PublicKey;
  tokenProgram: PublicKey;
  collateralTokenProgram: PublicKey;
  p2pEnabled: boolean;
  status: BN;
  authority: PublicKey;
  vault: PublicKey;
  vaultBump: number;
  bump: number;
  feeRecipient: PublicKey;
  optimizerProgram: PublicKey;
}

export type MarketHeaderWithPubkey = MarketHeader & {
  publicKey: PublicKey;
};

export interface Seat {
  market: PublicKey;
  trader: PublicKey;
  approvalState: BN;
}

export interface MarketData {
  matchSequenceNumber: BN;
  midRateYield: BN;
  traders: Map<string, TraderState>;
  traderIndexToTrader: Map<number, string>;
  matches: Map<number, MatchState>;
}

export interface TraderState {
  onVaultLends: BN;
  inP2pLends: BN;
  onVaultBorrows: BN;
  inP2pBorrows: BN;
  collateralAmount: BN;
  flags: number;
}

export interface MatchState {
  lenderIndex: number;
  borrowerIndex: number;
  amountInP2p: BN;
  originalAmount: BN;
  matchTimestamp: BN;
  lastInterestPaymentTimestamp: BN;
  totalInterestPaid: BN;
}

// State for UI
export interface CompleteMarketData {
  marketHeader: MarketHeader;
  seats: Seat[];
  matchSequenceNumber: BN;
  midRateYield: BN;
  traders: Map<string, TraderState>;
  matches: Map<BN, MatchState>;
}

export type Amount = string | number | BN;

export type MarketConfig = {
  market: web3.PublicKey;
  collateralMarket: web3.PublicKey;
  mint: web3.PublicKey;
  collateralMint: web3.PublicKey;
  tokenProgram: web3.PublicKey;
  collateralTokenProgram: web3.PublicKey;
  optimizerProtocol: Protocol;
};

export type TraderPosition = {
  onVaultLends: BN;
  inP2pLends: BN;
  onVaultBorrows: BN;
  inP2pBorrows: BN;
  collateralAmount: BN;
  isP2pEnabled: boolean;
  availableForLending: BN;
  availableCollateral: BN;
};

// Base UI interfaces
export interface MatchStateUI {
  id: number;
  lender: string;
  borrower: string;
  amount: BN;
  timestamp: Date;
  durationInDays: number;
}

export interface TraderPositionUI {
  address: string;
  isLender: boolean | null;
  isP2pEnabled: boolean;
  borrowing: BorrowingPosition;
  lending: LendingPosition;
}
export interface LendingPosition {
  deposits: BN;
  p2pLends: BN;
  collateral: {
    amount: BN;
    maxBorrowAmount: BN;
  };
}

export interface BorrowingPosition {
  borrowPending: BN;
  p2pBorrowed: BN;
}

export interface MarketStatsUI {
  totalAmountInP2p: BN;
  totalLiquidityAvailable: BN;
  deposits: {
    totalSupply: BN;
    lendAmountUnmatched: BN;
    collateral: BN;
  };
  borrows: {
    totalBorrowedP2p: BN;
    borrowAmountUnmatched: BN;
    utilizationRate: number;
  };
  traders: {
    count: number;
    activeCount: number;
  };
}
export type Protocol = "drift";

// Main Market UI interface
export interface MarketDataUI {
  // Market identifiers
  marketId: number;
  lendingMarket: string;
  collateralMarket: string;
  lendingMint: string;
  collateralMint: string;
  status: "active" | "paused" | "closed" | "uninitialized" | "tombstoned";
  midRateYield: BN;
  totalMatchesHappened: BN;
  // Market data
  stats: MarketStatsUI;
  traders: TraderPositionUI[];
  matches: MatchStateUI[];
  recentActivity: MatchStateUI[];
  optimizerProtocol: Protocol;
  // Market parameters
  params: {
    liquidationThreshold: number; // basis points
    ltv: number; // basis points
    lendingDecimals: number;
    collateralDecimals: number;
  };
}

// Add these new interfaces for market calculations
export interface MarketPriceData {
  collateralPriceInBorrowMint: BN;
  borrowPriceInCollateralMint: BN;
  collateralDecimals: number;
  borrowDecimals: number;
  liquidationThreshold: number; // in basis points (e.g., 8000 for 80%)
}

export interface MarketPairData {
  lendingMarket: MarketData;
  collateralMarket: MarketData;
  prices: {
    lendingTokenPriceInUSD: BN;
    collateralTokenPriceInUSD: BN;
    lendingDecimals: number;
    collateralDecimals: number;
  };
  config: {
    liquidationThreshold: number; // basis points
    ltv: number; // basis points
  };
}

// Program State
export interface MarketHeaderUI {
  marketId: number;
  market: string;
  collateralMarket: string;
  mint: string;
  collateralMint: string;
  tokenProgram: string;
  collateralTokenProgram: string;
  status: number;
  authority: string;
  vault: string;
  feeRecipient: string;
  optimizerProgram: string;
}

export interface DriftOptimizerState {
  programCaller: PublicKey;
  authority: PublicKey;
  protocolProgram: PublicKey;
  mint: PublicKey;
  market: PublicKey;
  marketIndex: number;
  bump: number;
}

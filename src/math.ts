import { BN } from "@coral-xyz/anchor";
import PaystreamV1 from "./idls/paystream_v1.json";

export const PRICE_PRECISION = PaystreamV1.constants.find(
  (c) => c.name === "PRICE_PRECISION"
)!.value;
export const RATE_PRECISION = PaystreamV1.constants.find(
  (c) => c.name === "RATE_PRECISION"
)!.value;
export const LTV_RATIO = PaystreamV1.constants.find(
  (c) => c.name === "LTV_RATIO"
)!.value;
export const HEALTH_FACTOR_PRECISION = 100;

export function calculate_max_borrow_amount(
  collateral: number,
  collateral_price_scaled: number,
  collateral_decimals: number,
  borrow_decimals: number
): BN {
  // Convert all inputs to BN
  const collateralBN = new BN(collateral);
  const collateralPrice = new BN(collateral_price_scaled);
  const ltvRatio = new BN(LTV_RATIO);
  const ratioPrecision = new BN(RATE_PRECISION);
  const pricePrecision = new BN(PRICE_PRECISION);

  // Calculate decimal adjustment
  const decimalAdjustment =
    collateral_decimals >= borrow_decimals
      ? new BN(10).pow(new BN(collateral_decimals - borrow_decimals))
      : new BN(10).pow(new BN(borrow_decimals - collateral_decimals));

  // Calculate collateral value with LTV
  const collateralValue = collateralBN
    .mul(collateralPrice)
    .mul(ltvRatio)
    .div(ratioPrecision);

  // Handle price precision and decimal adjustment
  const maxBorrow =
    collateral_decimals >= borrow_decimals
      ? collateralValue.div(pricePrecision).div(decimalAdjustment)
      : collateralValue.mul(decimalAdjustment).div(pricePrecision);

  return maxBorrow;
}

export function calculate_liquidation_amount(
  borrowed_amount: number,
  collateral_price: number,
  borrowed_decimals: number,
  collateral_decimals: number
): BN {
  const borrowed = new BN(borrowed_amount);
  const price = new BN(collateral_price);
  const pricePrecision = new BN(PRICE_PRECISION);

  const decimalDifference =
    borrowed_decimals >= collateral_decimals
      ? new BN(10).pow(new BN(borrowed_decimals - collateral_decimals))
      : new BN(10).pow(new BN(collateral_decimals - borrowed_decimals));

  const liquidationAmount =
    borrowed_decimals >= collateral_decimals
      ? borrowed.mul(pricePrecision).div(price).div(decimalDifference)
      : borrowed.mul(pricePrecision).div(price).mul(decimalDifference);

  return liquidationAmount;
}

export function calculate_required_collateral(
  borrow_amount: BN,
  collateral_price_scaled: BN,
  borrow_decimals: number,
  collateral_decimals: number
): BN {
  // Convert all inputs to BN
  const borrowBN = borrow_amount;
  const collateralPrice = collateral_price_scaled;
  const ltvRatio = new BN(LTV_RATIO);
  const ratioPrecision = new BN(RATE_PRECISION);
  const pricePrecision = new BN(PRICE_PRECISION);

  // Calculate decimal adjustment
  const decimalAdjustment =
    collateral_decimals >= borrow_decimals
      ? new BN(10).pow(new BN(collateral_decimals - borrow_decimals))
      : new BN(10).pow(new BN(borrow_decimals - collateral_decimals));

  // Calculate required collateral value
  // Since LTV is a percentage, we need to reverse it (multiply by RATE_PRECISION and divide by LTV)
  const requiredCollateral =
    collateral_decimals >= borrow_decimals
      ? borrowBN
          .mul(pricePrecision)
          .mul(decimalAdjustment)
          .mul(ratioPrecision)
          .div(collateralPrice)
          .div(ltvRatio)
      : borrowBN
          .mul(pricePrecision)
          .div(decimalAdjustment)
          .mul(ratioPrecision)
          .div(collateralPrice)
          .div(ltvRatio);

  return requiredCollateral;
}

/**
 * Calculates the P2P interest rate based on borrow rate, supply rate, and alpha
 * @param borrowRate Annual borrow rate in basis points (1bp = 0.01%)
 * @param supplyRate Annual supply rate in basis points (1bp = 0.01%)
 * @param alpha Weight factor in basis points (0-10000)
 * @returns P2P interest rate in basis points
 */
export function calculate_interest_rate_from_protocol_apys(
  borrowRate: number,
  supplyRate: number,
  alpha: number
): number {
  // APY_P2P = α * APY_borrow + (1 - α) * APY_supply
  const alphaComplement = 10000 - alpha;

  // Calculate each component separately
  const borrowComponent = (borrowRate * alpha) / 10000;
  const supplyComponent = (supplyRate * alphaComplement) / 10000;

  // Add components
  return Math.floor(borrowComponent + supplyComponent);
}

/**
 * Calculates the interest accrued over a period of time
 * @param principal Principal amount
 * @param rate Annual rate in basis points (1bp = 0.01%)
 * @param timeElapsed Time elapsed in seconds
 * @returns Interest accrued
 */
export function calculate_interest_accrued(
  principal: number,
  rate: number,
  timeElapsed: number
): number {
  const principalBN = new BN(principal);
  const rateBN = new BN(rate);
  const timeBN = new BN(timeElapsed);
  const yearInSeconds = new BN(365 * 24 * 60 * 60);
  const basisPoints = new BN(10000); // 100% = 10000 basis points

  // Scale up for precision: interest = (principal * rate * time) / (year_in_seconds * basis_points)
  const interest = principalBN
    .mul(rateBN)
    .mul(timeBN)
    .div(yearInSeconds)
    .div(basisPoints);

  return interest.toNumber();
}

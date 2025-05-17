import { BN } from "@coral-xyz/anchor";
import PaystreamV1 from "./idls/paystream_v1.json";

export const PRICE_PRECISION = new BN(
  PaystreamV1.constants.find((c) => c.name === "PRICE_PRECISION")!.value
);
export const RATE_PRECISION = new BN(
  PaystreamV1.constants.find((c) => c.name === "RATE_PRECISION")!.value
);
export const HEALTH_FACTOR_PRECISION = 100;

export function calculate_max_borrow_amount(
  collateral: BN,
  collateral_price_scaled: BN,
  collateral_decimals: number,
  borrow_decimals: number,
  ltv_ratio: BN
): BN {
  // Convert all inputs to BN
  const collateralBN = collateral;
  const collateralPrice = collateral_price_scaled;
  const ltvRatio = ltv_ratio;

  // Calculate decimal adjustment
  const decimalAdjustment =
    collateral_decimals >= borrow_decimals
      ? new BN(10).pow(new BN(collateral_decimals - borrow_decimals))
      : new BN(10).pow(new BN(borrow_decimals - collateral_decimals));

  // Calculate collateral value with LTV
  const collateralValue = collateralBN
    .mul(collateralPrice)
    .mul(ltvRatio)
    .div(RATE_PRECISION);

  // Handle price precision and decimal adjustment
  const maxBorrow =
    collateral_decimals >= borrow_decimals
      ? collateralValue.div(PRICE_PRECISION).div(decimalAdjustment)
      : collateralValue.mul(decimalAdjustment).div(PRICE_PRECISION);

  return maxBorrow;
}

export function calculate_debt_amount_in_collateral(
  debt_amount: number,
  collateral_price: number,
  borrow_decimals: number,
  collateral_decimals: number
): BN {
  const debt = new BN(debt_amount);
  const price = new BN(collateral_price);

  const decimalAdjustment =
    borrow_decimals >= collateral_decimals
      ? new BN(10).pow(new BN(borrow_decimals - collateral_decimals))
      : new BN(10).pow(new BN(collateral_decimals - borrow_decimals));

  const collateralAmount =
    borrow_decimals >= collateral_decimals
      ? debt.mul(PRICE_PRECISION).div(decimalAdjustment).div(price)
      : debt.mul(PRICE_PRECISION).mul(decimalAdjustment).div(price);

  return collateralAmount;
}

export function calculate_collateral_value_in_debt(
  collateral_amount: BN,
  collateral_price: BN,
  borrow_decimals: number,
  collateral_decimals: number
): BN {
  const collateral = collateral_amount;
  const price = collateral_price;

  const decimalDifference =
    borrow_decimals >= collateral_decimals
      ? new BN(10).pow(new BN(borrow_decimals - collateral_decimals))
      : new BN(10).pow(new BN(collateral_decimals - borrow_decimals));

  const collateralValueInDebt =
    collateral_decimals > borrow_decimals
      ? collateral.mul(price).div(PRICE_PRECISION).div(decimalDifference)
      : collateral.mul(price).mul(decimalDifference).div(PRICE_PRECISION);

  return collateralValueInDebt;
}

export function calculate_required_collateral(
  borrow_amount: BN,
  collateral_price_scaled: BN,
  borrow_decimals: number,
  collateral_decimals: number,
  ltv_ratio: BN
): BN {
  // Convert all inputs to BN
  const borrowBN = borrow_amount;
  const collateralPrice = collateral_price_scaled;
  const ltvRatio = new BN(ltv_ratio);

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
          .mul(PRICE_PRECISION)
          .mul(decimalAdjustment)
          .mul(RATE_PRECISION)
          .div(collateralPrice)
          .div(ltvRatio)
      : borrowBN
          .mul(PRICE_PRECISION)
          .div(decimalAdjustment)
          .mul(RATE_PRECISION)
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
  borrowRate: BN,
  supplyRate: BN,
  alpha: BN
): BN {
  // APY_P2P = α * APY_borrow + (1 - α) * APY_supply
  const alphaComplement = new BN(1000000).sub(alpha);

  // Calculate each component separately
  const borrowComponent = borrowRate.mul(alpha).div(new BN(1000000));
  const supplyComponent = supplyRate.mul(alphaComplement).div(new BN(1000000));

  // Add components
  return borrowComponent.add(supplyComponent);
}

/**
 * Calculates the interest accrued over a period of time
 * @param principal Principal amount
 * @param rate Annual rate in basis points (1bp = 0.0001%)
 * @param timeElapsed Time elapsed in seconds
 * @returns Interest accrued
 */
export function calculate_interest_accrued(
  principal: BN,
  rate: BN,
  timeElapsed: BN
): BN {
  const principalBN = principal;
  const rateBN = new BN(rate);
  const timeBN = new BN(timeElapsed);
  const yearInSeconds = new BN(365 * 24 * 60 * 60);
  const basisPoints = new BN(1000000); // 100% = 1000000 basis points

  // Scale up for precision: interest = (principal * rate * time) / (year_in_seconds * basis_points)
  const interest = principalBN
    .mul(rateBN)
    .mul(timeBN)
    .div(yearInSeconds)
    .div(basisPoints);

  return interest;
}

export function get_collateral_price_in_borrow_mint_scaled(
  price: BN,
  collateral_price: BN
): BN {
  return collateral_price.mul(PRICE_PRECISION).div(price);
}

export function get_borrow_price_in_collateral_mint_scaled(
  price: BN,
  collateral_price: BN
): BN {
  return price.mul(PRICE_PRECISION).div(collateral_price);
}

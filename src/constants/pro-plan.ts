import { base } from "viem/chains";
import { proPlanUsdtAmount } from "~/constants/pro-networks";

/** Display only (USD pegged). */
export const PRO_PLAN_PRICE_USD_LABEL = "5";

/** Base chain — 5 USDT in token units (6 decimals). */
export const PRO_PLAN_USDT_DECIMALS = 6;
export const PRO_PLAN_USDT_BASE_UNITS = proPlanUsdtAmount(base.id);

import { BigNumber, ApiMarketName } from '@dydxprotocol/perpetual';
import { PerpetualAccount } from '../clients/dydx';
import { liquidatePerpetualAccount } from '../helpers/perp-helpers';
import Logger from './logger';
import { delay } from './delay';
import AccountStore from './account-store';
import LiquidationStore from './liquidation-store';
import MarketStore from './market-store';
import { PERPETUAL_MARKETS } from './constants';

export interface MaxPositions {
  maxPosPosition: BigNumber,
  maxNegPosition: BigNumber,
}

export default class PerpLiquidator {

  public accountStore: AccountStore;
  public marketStore: MarketStore;
  public liquidationStore: LiquidationStore;

  constructor(
    accountStore: AccountStore,
    marketStore: MarketStore,
    liquidationStore: LiquidationStore,
  ) {
    this.accountStore = accountStore;
    this.marketStore = marketStore;
    this.liquidationStore = liquidationStore;
  }

  start = () => {
    Logger.info({
      at: 'PerpLiquidator#start',
      message: 'Starting perp liquidator',
    });
    this._poll();
  }

  _poll = async () => {
    for (;;) {
      await this._liquidateAccounts();

      await delay(Number(process.env.PERP_LIQUIDATE_POLL_INTERVAL_MS));
    }
  }

  _liquidateAccounts = async () => {
    const maxPositions: { [market: string]: MaxPositions } = {};
    const liquidatableAccounts: PerpetualAccount[] = this.accountStore.getLiquidatablePerpAccounts()
      .filter(a => !this.liquidationStore.contains(a));

    PERPETUAL_MARKETS.forEach((market: ApiMarketName) => {
      // Get values from the markets.
      const perpetualMarkets = this.marketStore.getPerpMarkets();
      const marketStore = perpetualMarkets.find(m => m.market === market);

      // Market not loaded yet.
      if (!marketStore) {
        return;
      }

      // Get the value of the account in margin-tokens.
      const balances = this.accountStore.getLiquidatorPerpBalances()[market];
      const margin = new BigNumber(balances.margin).plus(balances.pendingMargin);
      const position = new BigNumber(balances.position).plus(balances.pendingPosition);
      const oraclePrice = new BigNumber(marketStore.oraclePrice);
      const accountValueInMargin = position.times(oraclePrice).plus(margin);

      // Get maximum acceptable position sizes for the liquidator.
      const defaultMultiplier = new BigNumber(1).div(process.env.PERP_MIN_ACCOUNT_COLLATERALIZATION);
      const maxNegValue = accountValueInMargin.times(defaultMultiplier);
      const maxPosValue = accountValueInMargin.times(defaultMultiplier.plus(1));
      const maxPosPosition = maxPosValue.div(oraclePrice).integerValue();
      const maxNegPosition = maxNegValue.div(oraclePrice).integerValue().negated();

      // Set the maximum position sizes for each market.
      maxPositions[market] = {
        maxPosPosition,
        maxNegPosition,
      };
    });

    if (liquidatableAccounts.length === 0) {
      Logger.info({
        at: 'PerpLiquidator#_liquidateAccounts',
        message: 'No accounts to liquidate',
      });
      return;
    }

    liquidatableAccounts.forEach(a => this.liquidationStore.add(a));

    await Promise.all(liquidatableAccounts.map(async (account: PerpetualAccount) => {
      try {
        await liquidatePerpetualAccount(maxPositions, account);
      } catch (error) {
        Logger.error({
          at: 'PerpLiquidator#_liquidateAccounts',
          message: `Failed to liquidate account: ${error.message}`,
          account,
          error,
        });
      }
    }));
  }
}

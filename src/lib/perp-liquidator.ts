import { BigNumber } from '@dydxprotocol/perpetual';
import { liquidatePerpetualAccount } from '../helpers/perp-helpers';
import Logger from './logger';
import { delay } from './delay';
import AccountStore from './account-store';
import LiquidationStore from './liquidation-store';
import MarketStore from './market-store';

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
    const liquidatableAccounts = this.accountStore.getLiquidatablePerpAccounts()
      .filter(a => !this.liquidationStore.contains(a));

    // Get values from the markets.
    const market = 'PBTC-USDC';
    const perpetualMarkets = this.marketStore.getPerpMarkets();
    const btcMarket = perpetualMarkets.find(m => m.market === market);

    // Markets not loaded yet.
    if (!btcMarket) {
      return;
    }

    // Get the value of the account in margin-tokens.
    const btcPrice = new BigNumber(btcMarket.oraclePrice);
    const balances = this.accountStore.getLiquidatorPerpBalances()[market];
    const margin = new BigNumber(balances.margin).plus(balances.pendingMargin);
    const position = new BigNumber(balances.position).plus(balances.pendingPosition);
    const accountValue = position.times(btcPrice).plus(margin);

    // Get maximum acceptable position sizes for the liquidator.
    const defaultMultiplier = new BigNumber(1).div(process.env.PERP_MIN_ACCOUNT_COLLATERALIZATION);
    const maxNegValue = accountValue.times(defaultMultiplier);
    const maxPosValue = accountValue.times(defaultMultiplier.plus(1));
    const maxPosPosition = maxPosValue.div(btcPrice).integerValue();
    const maxNegPosition = maxNegValue.div(btcPrice).integerValue().negated();

    if (liquidatableAccounts.length === 0) {
      Logger.info({
        at: 'PerpLiquidator#_liquidateAccounts',
        message: 'No accounts to liquidate',
      });
      return;
    }

    liquidatableAccounts.forEach(a => this.liquidationStore.add(a));

    await Promise.all(liquidatableAccounts.map(async (account) => {
      try {
        await liquidatePerpetualAccount(maxPosPosition, maxNegPosition, account);
      } catch (error) {
        Logger.error({
          ...error.trace,
          at: 'PerpLiquidator#_liquidateAccounts',
          message: `Failed to liquidate account: ${error.message}`,
          accountOwner: account.owner,
          error,
        });
      }
    }));
  }
}

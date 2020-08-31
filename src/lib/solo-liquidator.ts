import { liquidateAccount, liquidateExpiredAccount } from '../helpers/solo-helpers';
import Logger from './logger';
import { delay } from './delay';
import AccountStore from './account-store';
import LiquidationStore from './liquidation-store';
import MarketStore from './market-store';

export default class SoloLiquidator {

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
      at: 'SoloLiquidator#start',
      message: 'Starting solo liquidator',
    });
    this._poll();
  }

  _poll = async () => {
    for (;;) {
      await this._liquidateAccounts();

      await delay(Number(process.env.SOLO_LIQUIDATE_POLL_INTERVAL_MS));
    }
  }

  _liquidateAccounts = async () => {
    const liquidatableAccounts = this.accountStore.getLiquidatableSoloAccounts()
      .filter(a => !this.liquidationStore.contains(a));
    const expiredAccounts = this.accountStore.getExpiredAccounts()
      .filter(a => !this.liquidationStore.contains(a));
    const markets = this.marketStore.getSoloMarkets();

    if (liquidatableAccounts.length === 0 && expiredAccounts.length === 0) {
      Logger.info({
        at: 'SoloLiquidator#_liquidateAccounts',
        message: 'No accounts to liquidate',
      });
      return;
    }

    liquidatableAccounts.forEach(a => this.liquidationStore.add(a));
    expiredAccounts.forEach(a => this.liquidationStore.add(a));

    await Promise.all([
      ...liquidatableAccounts.map(async (account) => {
        try {
          await liquidateAccount(account);
        } catch (error) {
          Logger.error({
            at: 'SoloLiquidator#_liquidateAccounts',
            message: `Failed to liquidate account: ${error.message}`,
            account,
            error,
          });
        }
      }),
      ...expiredAccounts.map(async (account) => {
        try {
          await liquidateExpiredAccount(account, markets);
        } catch (error) {
          Logger.error({
            at: 'SoloLiquidator#_liquidateAccounts',
            message: `Failed to liquidate expired account: ${error.message}`,
            account,
            error,
          });
        }
      }),
    ]);
  }
}

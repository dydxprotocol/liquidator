import {
  getPerpAccountBalances,
  getLiquidatablePerpAccounts,
  getLiquidatableSoloAccounts,
  getExpiredAccounts,
} from '../clients/dydx';
import { delay } from './delay';
import Logger from './logger';

export default class AccountStore {
  constructor() {
    this.perpLiquidatorAccountBalances = [];
    this.liquidatablePerpAccounts = [];
    this.liquidatableSoloAccounts = [];
    this.expiredAccounts = [];
  }

  getPerpLiquidatorAccountBalances = () => this.perpLiquidatorAccountBalances;

  getLiquidatablePerpAccounts = () => this.liquidatablePerpAccounts;

  getLiquidatableSoloAccounts = () => this.liquidatableSoloAccounts;

  getExpiredAccounts = () => this.expiredAccounts;

  start = () => {
    Logger.info({
      at: 'AccountStore#start',
      message: 'Starting account store',
    });
    this._poll();
  }

  _poll = async () => {
    for (;;) {
      try {
        await this._update();
      } catch (error) {
        Logger.error({
          at: 'AccountStore#_poll',
          message: error.message,
          error,
        });
      }

      await delay(Number(process.env.ACCOUNT_POLL_INTERVAL_MS));
    }
  }

  _update = async () => {
    Logger.info({
      at: 'AccountStore#_update',
      message: 'Updating accounts...',
    });

    const [
      { balances: nextPerpLiquidatorAccountBalances },
      { accounts: nextLiquidatablePerpAccounts },
      { accounts: nextLiquidatableSoloAccounts },
      { accounts: nextExpiredAccounts },
    ] = await Promise.all([
      getPerpAccountBalances(process.env.WALLET_ADDRESS),
      getLiquidatablePerpAccounts(),
      getLiquidatableSoloAccounts(),
      getExpiredAccounts(),
    ]);

    // Do not put an account in both liquidatable and expired
    const filteredNextExpiredAccounts = nextExpiredAccounts.filter(
      ea => !nextLiquidatableSoloAccounts.find(la => la.uuid === ea.uuid),
    );

    this.perpLiquidatorAccountBalances = nextPerpLiquidatorAccountBalances;
    this.liquidatablePerpAccounts = nextLiquidatablePerpAccounts;
    this.liquidatableSoloAccounts = nextLiquidatableSoloAccounts;
    this.expiredAccounts = filteredNextExpiredAccounts;

    Logger.info({
      at: 'AccountStore#_update',
      message: 'Finished updating accounts',
    });
  }
}

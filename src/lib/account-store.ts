import { ApiAccount } from '@dydxprotocol/solo';
import {
  getLiquidatableSoloAccounts,
  getExpiredAccounts,
} from '../clients/dydx';
import { delay } from './delay';
import Logger from './logger';


export default class AccountStore {
  public liquidatableSoloAccounts: ApiAccount[];
  public expiredAccounts: ApiAccount[];

  constructor() {
    this.liquidatableSoloAccounts = [];
    this.expiredAccounts = [];
  }

  public getLiquidatableSoloAccounts(): ApiAccount[] {
    return this.liquidatableSoloAccounts;
  }

  public getExpiredAccounts(): ApiAccount[] {
    return this.expiredAccounts;
  }

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
      { accounts: nextLiquidatableSoloAccounts },
      { accounts: nextExpiredAccounts },
    ] = await Promise.all([
      getLiquidatableSoloAccounts(),
      getExpiredAccounts(),
    ]);

    // Do not put an account in both liquidatable and expired
    const filteredNextExpiredAccounts = nextExpiredAccounts.filter(
      ea => !nextLiquidatableSoloAccounts.find(la => la.uuid === ea.uuid),
    );

    this.liquidatableSoloAccounts = nextLiquidatableSoloAccounts;
    this.expiredAccounts = filteredNextExpiredAccounts;

    Logger.info({
      at: 'AccountStore#_update',
      message: 'Finished updating accounts',
    });
  }
}

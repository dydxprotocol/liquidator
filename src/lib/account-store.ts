import { ApiMarketName } from '@dydxprotocol/perpetual';
import { ApiAccount } from '@dydxprotocol/solo';
import {
  PerpetualAccount,
  getPerpAccountBalances,
  getLiquidatablePerpAccounts,
  getLiquidatableSoloAccounts,
  getExpiredAccounts,
} from '../clients/dydx';
import { delay } from './delay';
import Logger from './logger';
import { PERPETUAL_MARKETS } from './constants';

interface PerpetualBalance {
  margin: string,
  position: string,
  pendingMargin: string,
  pendingPosition: string,
}

const EMPTY_BALANCE: PerpetualBalance = {
  margin: '0',
  position: '0',
  pendingMargin: '0',
  pendingPosition: '0',
};

export default class AccountStore {
  public liquidatorPerpBalances: { [market: string]: PerpetualBalance };
  public liquidatablePerpAccounts: PerpetualAccount[];
  public liquidatableSoloAccounts: ApiAccount[];
  public expiredAccounts: ApiAccount[];

  constructor() {
    this.liquidatorPerpBalances = {};
    PERPETUAL_MARKETS.forEach((market: ApiMarketName) => {
      this.liquidatorPerpBalances[market] = EMPTY_BALANCE;
    });
    this.liquidatablePerpAccounts = [];
    this.liquidatableSoloAccounts = [];
    this.expiredAccounts = [];
  }

  public getLiquidatorPerpBalances(): { [market: string]: PerpetualBalance } {
    return this.liquidatorPerpBalances;
  }

  public getLiquidatablePerpAccounts(): PerpetualAccount[] {
    return this.liquidatablePerpAccounts;
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
      { balances: nextLiquidatorPerpBalances },
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

    this.liquidatorPerpBalances = nextLiquidatorPerpBalances;
    this.liquidatablePerpAccounts = nextLiquidatablePerpAccounts;
    this.liquidatableSoloAccounts = nextLiquidatableSoloAccounts;
    this.expiredAccounts = filteredNextExpiredAccounts;

    Logger.info({
      at: 'AccountStore#_update',
      message: 'Finished updating accounts',
    });
  }
}

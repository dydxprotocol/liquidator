import { getLiquidatableAccounts, getExpiredAccounts } from '../clients/dydx';
import { delay } from './delay';
import Logger from './logger';

export default class AccountStore {
  constructor() {
    this.liquidatableAccounts = [];
    this.expiredAccounts = [];
  }

  getLiquidatableAccounts = () => this.liquidatableAccounts;

  getExpiredAccounts = () => this.expiredAccounts;

  containsLiquidatableAccount = (accountOwner, accountNumber) => this.liquidatableAccounts.find(
    a => (
      a.owner.toLowerCase() === accountOwner.toLowerCase()
      && a.number === accountNumber
    ),
  );

  containsExpiredAccount = (accountOwner, accountNumber) => this.expiredAccounts.find(
    a => (
      a.owner.toLowerCase() === accountOwner.toLowerCase()
      && a.number === accountNumber
    ),
  );

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
      { accounts: nextLiquidatableAccounts },
      { accounts: nextExpiredAccounts },
    ] = await Promise.all([
      getLiquidatableAccounts(),
      getExpiredAccounts(),
    ]);

    const allAccountUuids = {};

    nextLiquidatableAccounts.forEach((next) => {
      allAccountUuids[next.uuid] = true;

      if (!this.liquidatableAccounts.find(e => next.uuid === e.uuid)) {
        Logger.info({
          at: 'AccountStore#_update',
          message: 'Adding new liquidatable account',
          uuid: next.uuid,
          owner: next.owner,
          number: next.number,
        });
      }
    });

    // Do not put an account in both liquidatable and expired
    const filteredNextExpiredAccounts = nextExpiredAccounts.filter(a => !allAccountUuids[a.uuid]);

    filteredNextExpiredAccounts.forEach((next) => {
      if (!this.expiredAccounts.find(e => next.uuid === e.uuid)) {
        Logger.info({
          at: 'AccountStore#_update',
          message: 'Adding new expired account',
          uuid: next.uuid,
          owner: next.owner,
          number: next.number,
        });
      }
    });

    this.liquidatableAccounts.forEach((next) => {
      if (!nextLiquidatableAccounts.find(e => next.uuid === e.uuid)) {
        Logger.info({
          at: 'AccountStore#_update',
          message: 'Removing liquidatable account',
          uuid: next.uuid,
          owner: next.owner,
          number: next.number,
        });
      }
    });
    this.expiredAccounts.forEach((next) => {
      if (!filteredNextExpiredAccounts.find(e => next.uuid === e.uuid)) {
        Logger.info({
          at: 'AccountStore#_update',
          message: 'Removing expired account',
          uuid: next.uuid,
          owner: next.owner,
          number: next.number,
        });
      }
    });

    this.liquidatableAccounts = nextLiquidatableAccounts;
    this.expiredAccounts = filteredNextExpiredAccounts;

    Logger.info({
      at: 'AccountStore#_update',
      message: 'Finished updating accounts',
    });
  }
}

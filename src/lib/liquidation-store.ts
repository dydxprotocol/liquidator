import LRU from 'lru-cache';
import { Account } from '../clients/dydx';

export default class LiquidationStore {
  store: LRU<string, boolean>;

  constructor() {
    this.store = new LRU({
      maxAge: Number(process.env.LIQUIDATION_KEY_EXPIRATION_SEC) * 1000,
    });
  }

  async add(account: Account) {
    if (!account) {
      throw new Error('Must specify account');
    }

    const key = this._getKey(account);

    this.store.set(key, true);
  }

  contains(account: Account) {
    const key = this._getKey(account);

    return this.store.get(key);
  }

  _getKey(account: Account) {
    return `${account.owner.toLowerCase()}-${account.number}`;
  }
}

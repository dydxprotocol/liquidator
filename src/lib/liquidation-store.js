import LRU from 'lru-cache';

export default class LiquidationStore {
  constructor() {
    this.store = new LRU({
      maxAge: process.env.SOLO_LIQUIDATION_KEY_EXPIRATION_SEC * 1000,
    });
  }

  async add(account) {
    if (!account) {
      throw new Error('Must specify account');
    }

    const key = this._getKey(account);

    this.store.set(key, true);
  }

  contains(account) {
    const key = this._getKey(account);

    return this.store.get(key);
  }

  _getKey(account) {
    return `${account.owner.toLowerCase()}-${account.number}`;
  }
}

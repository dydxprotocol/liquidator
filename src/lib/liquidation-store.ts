import LRU from 'lru-cache';

export default class LiquidationStore {
  public store: LRU;

  constructor() {
    this.store = new LRU({
      maxAge: Number(process.env.LIQUIDATION_KEY_EXPIRATION_SEC) * 1000,
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
    return account.uuid
      ? `${account.owner.toLowerCase()}-${account.number}`
      : `${account.owner.toLowerCase()}-${account.market}`;
  }
}

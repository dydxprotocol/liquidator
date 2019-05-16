import { getMarkets } from '../clients/dydx';
import { delay } from './delay';
import Logger from './logger';

export default class MarketStore {
  constructor() {
    this.markets = [];
  }

  getMarkets = () => this.markets;

  start = () => {
    Logger.info({
      at: 'MarketStore#start',
      message: 'Starting market store',
    });
    this._poll();
  }

  _poll = async () => {
    for (;;) {
      try {
        await this._update();
      } catch (error) {
        Logger.error({
          at: 'MarketStore#_poll',
          message: error.message,
          error,
        });
      }

      await delay(Number(process.env.MARKET_POLL_INTERVAL_MS));
    }
  }

  _update = async () => {
    Logger.info({
      at: 'MarketStore#_update',
      message: 'Updating markets...',
    });

    const { markets: nextMarkets } = await getMarkets();

    this.markets = nextMarkets;

    Logger.info({
      at: 'MarketStore#_update',
      message: 'Finished updating markets',
    });
  }
}

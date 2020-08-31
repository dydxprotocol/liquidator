import { ApiMarket } from '@dydxprotocol/solo';
import { ApiMarketMessage } from '@dydxprotocol/perpetual';
import { getPerpMarkets, getSoloMarkets } from '../clients/dydx';
import { delay } from './delay';
import Logger from './logger';

export default class MarketStore {
  public soloMarkets: ApiMarket[];
  public perpMarkets: ApiMarketMessage[];

  constructor() {
    this.soloMarkets = [];
    this.perpMarkets = [];
  }

  public getSoloMarkets(): ApiMarket[] {
    return this.soloMarkets;
  }

  public getPerpMarkets(): ApiMarketMessage[] {
    return this.perpMarkets;
  }

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

    const [
      { markets: nextSoloMarkets },
      { markets: nextPerpMarkets },
    ] = await Promise.all([
      getSoloMarkets(),
      getPerpMarkets(),
    ]);

    this.soloMarkets = nextSoloMarkets;
    this.perpMarkets = nextPerpMarkets;

    Logger.info({
      at: 'MarketStore#_update',
      message: 'Finished updating markets',
    });
  }
}

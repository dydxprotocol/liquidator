import { getMarkets } from '../clients/dydx';
import { delay } from './delay';
import Logger from './logger';

interface Currency {
  uuid: string,
  symbol: string,
  contractAddress: string,
  decimals: Number,
  createdAt: string,
  updatedAt: string,
}

interface Market {
  id: Number,
  name: string,
  symbol: string,
  supplyIndex: string,
  borrowIndex: string,
  supplyInterestRateSeconds: string,
  borrowInterestRateSeconds: string,
  totalSupplyPar: string,
  totalBorrowPar: string,
  lastIndexUpdateSeconds: string,
  oraclePrice: string,
  collateralRatio: string,
  marginPremium: string,
  spreadPremium: string,
  currencyUuid: string,
  createdAt: string,
  updatedAt: string,
  deletedAt: string | null,
  currency: Currency,
  totalSupplyAPR: string,
  totalBorrowAPR: string,
  totalSupplyAPY: string,
  totalBorrowAPY: string,
  totalSupplyWei: string,
  totalBorrowWei: string,
}

export default class MarketStore {

  markets: Array<Market>;

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

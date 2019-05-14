/* eslint no-console: 0 */
/* eslint import/first: 0 */
import './lib/env';

import AccountStore from './lib/account-store';
import MarketStore from './lib/market-store';
import LiquidationStore from './lib/liquidation-store';
import SoloLiquidator from './lib/solo-liquidator';
import GasPriceUpdater from './lib/gas-price-updater';
import { loadAccounts } from './helpers/solo';

console.log(`Starting in env ${process.env.NODE_ENV}`);

async function start() {
  const accountStore = new AccountStore();
  const marketStore = new MarketStore();
  const liquidationStore = new LiquidationStore();
  const soloLiquidator = new SoloLiquidator(accountStore, marketStore, liquidationStore);
  const gasPriceUpdater = new GasPriceUpdater();

  accountStore.start();
  marketStore.start();
  soloLiquidator.start();
  gasPriceUpdater.start();
  loadAccounts();
}

start();

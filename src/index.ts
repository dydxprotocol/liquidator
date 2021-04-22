/* eslint no-console: 0 */
/* eslint import/first: 0 */
import './lib/env';

import AccountStore from './lib/account-store';
import MarketStore from './lib/market-store';
import LiquidationStore from './lib/liquidation-store';
import SoloLiquidator from './lib/solo-liquidator';
import GasPriceUpdater from './lib/gas-price-updater';
import { loadAccounts, initializeSoloLiquidations } from './helpers/web3';

console.log(`Starting in env ${process.env.NODE_ENV}`);

if (Number(process.env.ACCOUNT_POLL_INTERVAL_MS) < 1000) {
  throw new Error('Account Poll Interval too low');
}

if (Number(process.env.MARKET_POLL_INTERVAL_MS) < 1000) {
  throw new Error('Account Poll Interval too low');
}

async function start() {
  const accountStore = new AccountStore();
  const marketStore = new MarketStore();
  const liquidationStore = new LiquidationStore();
  const soloLiquidator = new SoloLiquidator(accountStore, marketStore, liquidationStore);
  const gasPriceUpdater = new GasPriceUpdater();

  await loadAccounts();

  if (process.env.SOLO_LIQUIDATIONS_ENABLED === 'true') {
    await initializeSoloLiquidations();
  }

  accountStore.start();
  marketStore.start();
  gasPriceUpdater.start();

  if (
    process.env.SOLO_LIQUIDATIONS_ENABLED === 'true'
    || process.env.SOLO_EXPIRATIONS_ENABLED === 'true'
  ) {
    soloLiquidator.start();
  }
}

start();

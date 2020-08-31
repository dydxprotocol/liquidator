import { ApiMarketName, PerpetualMarket } from '@dydxprotocol/perpetual';
import { PerpetualAccount, PerpetualBalance } from '../clients/dydx';

export const PERPETUAL_MARKETS: ApiMarketName[] = [
  ApiMarketName.PBTC_USDC,
  ApiMarketName.WETH_PUSD,
  ApiMarketName.PLINK_USDC,
];

export const EMPTY_PERPETUAL_BALANCE: PerpetualBalance = {
  margin: '0',
  position: '0',
  pendingMargin: '0',
  pendingPosition: '0',
  indexValue: '0',
  indexTimestamp: '0',
  orderNumber: '0',
  cachedMargin: '0',
};

export const EMPTY_PERPETUAL_ACCOUNT: PerpetualAccount = {
  owner: '0x0000000000000000000000000000000000000000',
  market: PerpetualMarket.PBTC_USDC,
  margin: '0',
  position: '0',
  indexTimestamp: '0',
  cachedIndexValue: '0',
  orderNumber: '0',
  cachedMargin: '0',
};

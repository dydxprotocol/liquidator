import {
  ApiAccount,
  ApiMarket,
} from '@dydxprotocol/solo';
import {
  address,
  ApiMarketMessage,
  PerpetualMarket,
} from '@dydxprotocol/perpetual';
import request from 'request-promise-native';

// ============ Perpetual Interfaces ============

interface PerpetualBalanceBase {
  orderNumber: string,
  margin: string,
  cachedMargin: string,
  position: string,
  indexTimestamp: string,
}

export interface PerpetualBalance extends PerpetualBalanceBase {
  pendingMargin: string,
  pendingPosition: string,
  indexValue: string,
}

export interface PerpetualAccount extends PerpetualBalanceBase {
  owner: address,
  market: PerpetualMarket,
  cachedIndexValue: string,
}

export async function getLiquidatablePerpAccounts(
): Promise<{ accounts: PerpetualAccount[] }> {
  const { accounts } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/perpetual-accounts`,
    json: true,
    qs: {
      isLiquidatable: true,
    },
  });

  return { accounts };
}

export async function getLiquidatableSoloAccounts(
): Promise<{ accounts: ApiAccount[] }> {
  const { accounts } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/accounts`,
    json: true,
    qs: {
      isLiquidatable: true,
    },
  });

  return { accounts };
}

export async function getExpiredAccounts(
): Promise<{ accounts: ApiAccount[] }> {
  const { accounts } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/accounts`,
    json: true,
    qs: {
      isExpired: true,
    },
  });

  return { accounts };
}

export async function getPerpAccountBalances(
  address: address,
): Promise<{ balances: { [market: string]: PerpetualBalance }}> {
  const { balances } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/perpetual-accounts/${address}`,
    json: true,
  });

  return { balances };
}

export async function getSoloMarkets(
): Promise<{ markets: ApiMarket[] }> {
  const { markets } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/markets`,
    json: true,
  });

  return { markets };
}

export async function getPerpMarkets(
): Promise<{ markets: ApiMarketMessage[] }> {
  const { markets } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/perpetual-markets`,
    json: true,
  });

  return { markets };
}

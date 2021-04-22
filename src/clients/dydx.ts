import {
  ApiAccount,
  ApiMarket,
} from '@dydxprotocol/solo';
import request from 'request-promise-native';

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

export async function getSoloMarkets(
): Promise<{ markets: ApiMarket[] }> {
  const { markets } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/markets`,
    json: true,
  });

  return { markets };
}

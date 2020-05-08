import request from 'request-promise-native';

export async function getLiquidatablePerpAccounts() {
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

export async function getLiquidatableSoloAccounts() {
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

export async function getExpiredAccounts() {
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

export async function getPerpAccountBalances(address) {
  const { balances } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/perpetual-accounts/${address}`,
    json: true,
  });

  return { balances };
}

export async function getSoloMarkets() {
  const { markets } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/markets`,
    json: true,
  });

  return { markets };
}

export async function getPerpMarkets() {
  const { markets } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/perpetual-markets`,
    json: true,
  });

  return { markets };
}

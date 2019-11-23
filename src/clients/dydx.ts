import request from 'request-promise-native';

export interface Currency {
  uuid: string,
  symbol: string,
  contractAddress: string,
  decimals: Number,
  createdAt: string,
  updatedAt: string,
}

export interface Market {
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

export interface Balance {
  // TODO fill this in
}

export interface Account {
  owner: string,
  number: string,
  uuid: string,
  hasAtLeastOneNegativePar: boolean,
  hasAtLeastOnePositivePar: boolean,
  sumBorrowUsdValue: string,
  sumSupplyUsdValue: string,
  balances: { [index: string]: Balance },
}

export async function getLiquidatableAccounts(): Promise<{accounts: Array<Account>}> {
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

export async function getExpiredAccounts(): Promise<{accounts: Array<Account>}> {
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

export async function getMarkets(): Promise<{markets: Array<Market>}> {
  const { markets } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/markets`,
    json: true,
  });

  return { markets };
}

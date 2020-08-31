import {
  address,
  BigNumber,
  ApiMarketMessage,
  ApiMarketName,
  PerpetualMarket,
} from '@dydxprotocol/perpetual';
import { EMPTY_PERPETUAL_ACCOUNT } from '../src/lib/constants';
import PerpLiquidator from '../src/lib/perp-liquidator';
import AccountStore from '../src/lib/account-store';
import MarketStore from '../src/lib/market-store';
import LiquidationStore from '../src/lib/liquidation-store';
import { btcPerp, ethPerp, linkPerp } from '../src/helpers/web3';
import { PerpetualAccount, PerpetualBalance } from '../src/clients/dydx';

interface Liquidation {
  liquidatee: address,
  liquidator: address,
  isBuy: boolean,
  maxPosition: BigNumber,
  options: any,
}

describe('perp-liquidator', () => {
  let accountStore: AccountStore;
  let marketStore: MarketStore;
  let perpLiquidator: PerpLiquidator;
  let liquidationStore: LiquidationStore;
  let liquidations: Liquidation[];

  beforeEach(async () => {
    jest.clearAllMocks();
    accountStore = new AccountStore();
    marketStore = new MarketStore();
    liquidationStore = new LiquidationStore();
    perpLiquidator = new PerpLiquidator(accountStore, marketStore, liquidationStore);
    liquidations = [];
  });

  describe('#_liquidateAccounts', () => {
    it('Successfully liquidates accounts', async () => {
      const liquidatableAccounts = getTestLiquidatableAccounts();
      accountStore.getLiquidatablePerpAccounts = jest.fn().mockImplementation(
        () => liquidatableAccounts,
      );
      accountStore.getLiquidatorPerpBalances = jest.fn().mockImplementation(
        () => getTestLiquidatorPerpBalances(),
      );
      marketStore.getPerpMarkets = jest.fn().mockImplementation(
        () => getTestPerpMarkets(),
      );

      btcPerp.liquidatorProxy.liquidate = jest.fn().mockImplementation(mockLiquidate);
      ethPerp.liquidatorProxy.liquidate = jest.fn().mockImplementation(mockLiquidate);
      linkPerp.liquidatorProxy.liquidate = jest.fn().mockImplementation(mockLiquidate);

      await perpLiquidator._liquidateAccounts();

      expect(liquidations.length).toBe(liquidatableAccounts.length);

      for (let i = 0; i < liquidatableAccounts.length; i += 1) {
        const liq = liquidations[i];
        const acc = liquidatableAccounts[i];
        const position = new BigNumber(acc.position);
        const isBuy = position.gt(0);
        expect(liq.liquidatee).toEqual(acc.owner);
        expect(liq.liquidator).toEqual(process.env.WALLET_ADDRESS);
        expect(liq.maxPosition).toEqual(EXPECTED_MAX_POSITIONS[i]);
        expect(liq.isBuy).toEqual(isBuy);
      }
    });
  });

  function mockLiquidate(
    liquidatee: address,
    liquidator: address,
    isBuy: boolean,
    maxPosition: BigNumber,
    options: any,
  ) {
    liquidations.push({
      liquidatee,
      liquidator,
      isBuy,
      maxPosition,
      options,
    });
    return { gas: 1 };
  }
});

const EXPECTED_MAX_POSITIONS: BigNumber[] = [
  new BigNumber('-20e6'),
  new BigNumber('30e6'),
  new BigNumber('600e6'),
  new BigNumber('-400e6'),
  new BigNumber('1200e6'),
  new BigNumber('-800e6'),
];

function getTestLiquidatableAccounts(
): PerpetualAccount[] {
  return [
    {
      ...EMPTY_PERPETUAL_ACCOUNT,
      owner: '0x1111111111111111111111111111111111111111',
      market: PerpetualMarket.PBTC_USDC,
      margin: '12345678',
      position: '-10000',
    },
    {
      ...EMPTY_PERPETUAL_ACCOUNT,
      owner: '0x2222222222222222222222222222222222222222',
      market: PerpetualMarket.PBTC_USDC,
      margin: '-12345678',
      position: '100000',
    },
    {
      ...EMPTY_PERPETUAL_ACCOUNT,
      owner: '0x3333333333333333333333333333333333333333',
      market: PerpetualMarket.WETH_PUSD,
      margin: '-12345678',
      position: '1000000',
    },
    {
      ...EMPTY_PERPETUAL_ACCOUNT,
      owner: '0x1111111111111111111111111111111111111111',
      market: PerpetualMarket.WETH_PUSD,
      margin: '12345678',
      position: '-1000000',
    },
    {
      ...EMPTY_PERPETUAL_ACCOUNT,
      owner: '0x3333333333333333333333333333333333333333',
      market: PerpetualMarket.PLINK_USDC,
      margin: '-12345678',
      position: '1000000',
    },
    {
      ...EMPTY_PERPETUAL_ACCOUNT,
      owner: '0x1111111111111111111111111111111111111111',
      market: PerpetualMarket.PLINK_USDC,
      margin: '12345678',
      position: '-1000000',
    },
  ];
}

function getTestLiquidatorPerpBalances(
): { [market: string]: PerpetualBalance } {
  return {
    [ApiMarketName.PBTC_USDC]: {
      margin: new BigNumber('2000e6').toFixed(),
      cachedMargin: '0',
      position: new BigNumber('-10e6').toFixed(),
      pendingMargin: '0',
      pendingPosition: '0',
      indexValue: '0',
      indexTimestamp: '0',
      orderNumber: '0',
    },
    [ApiMarketName.WETH_PUSD]: {
      margin: new BigNumber('2e18').toFixed(),
      cachedMargin: '0',
      position: new BigNumber('-200e6').toFixed(),
      pendingMargin: '0',
      pendingPosition: '0',
      indexValue: '0',
      indexTimestamp: '0',
      orderNumber: '0',
    },
    [ApiMarketName.PLINK_USDC]: {
      margin: new BigNumber('3000e6').toFixed(),
      cachedMargin: '0',
      position: new BigNumber('200e6').toFixed(),
      pendingMargin: '0',
      pendingPosition: '0',
      indexValue: '0',
      indexTimestamp: '0',
      orderNumber: '0',
    },
  };
}

function getTestPerpMarkets(): ApiMarketMessage[] {
  return [
    {
      market: ApiMarketName.PBTC_USDC,
      oraclePrice: '100.00',
      fundingRate: '0.000000003164182879',
      globalIndexValue: '0',
      globalIndexTimeStamp: '0',
      createdAt: '2020-04-09T22:42:35.696Z',
      updatedAt: '2020-05-01T20:28:35.435Z',
    },
    {
      market: ApiMarketName.WETH_PUSD,
      oraclePrice: '5000000000.00000', // 1 / 200e-12
      fundingRate: '0',
      globalIndexValue: '0',
      globalIndexTimeStamp: '0',
      createdAt: '2020-07-28T17:39:45.826Z',
      updatedAt: '2020-07-29T16:58:46.096Z',
    },
    {
      market: ApiMarketName.PLINK_USDC,
      oraclePrice: '15.00',
      fundingRate: '0',
      globalIndexValue: '0',
      globalIndexTimeStamp: '0',
      createdAt: '2020-07-28T17:39:45.826Z',
      updatedAt: '2020-07-29T16:58:46.096Z',
    },
  ];
}

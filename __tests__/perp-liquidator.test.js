import BigNumber from 'bignumber.js';
import PerpLiquidator from '../src/lib/perp-liquidator';
import AccountStore from '../src/lib/account-store';
import MarketStore from '../src/lib/market-store';
import { perp } from '../src/helpers/web3';

process.env.PERP_LIQUIDATIONS_ENABLED = true;

jest.mock('../src/helpers/block-helper');

describe('perp-liquidator', () => {
  let accountStore;
  let marketStore;
  let perpLiquidator;

  beforeEach(async () => {
    jest.clearAllMocks();
    accountStore = new AccountStore();
    marketStore = new MarketStore();
    perpLiquidator = new PerpLiquidator(accountStore, marketStore);
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

      const liquidations = [];

      perp.liquidatorProxy.liquidate = jest.fn().mockImplementation(
        (liquidatee, isBuy, maxPosition, options) => {
          liquidations.push({
            liquidatee,
            isBuy,
            maxPosition,
            options,
          });
          return { gas: 1 };
        },
      );

      await perpLiquidator._liquidateAccounts();

      expect(liquidations.length).toBe(liquidatableAccounts.length);

      for (let i = 0; i < liquidatableAccounts.length; i += 1) {
        const liq = liquidations[i];
        const acc = liquidatableAccounts[i];
        const position = new BigNumber(acc.position);
        expect(liq.liquidatee).toEqual(acc.owner);
        expect(liq.maxPosition).toEqual(new BigNumber(position.gt(0) ? '30e6' : '-20e6'));
        expect(liq.isBuy).toEqual(position.gt(0));
      }
    });
  });
});

function getTestLiquidatableAccounts() {
  return [
    {
      owner: '0x1111111111111111111111111111111111111111',
      market: 'PBTC-USDC',
      margin: '12345678',
      position: '-10000',
    },
    {
      owner: '0x2222222222222222222222222222222222222222',
      market: 'PBTC-USDC',
      margin: '-12345678',
      position: '100000',
    },
  ];
}

function getTestLiquidatorPerpBalances() {
  return {
    'PBTC-USDC': {
      margin: '2000000000', // 2000e6 Margin
      cachedMargin: '0',
      position: '-10000000', // -10e6 Position
      pendingMargin: '0',
      pendingPosition: '0',
      indexValue: '0',
      indexTimestamp: '0',
    },
  };
}

function getTestPerpMarkets() {
  return [
    {
      uuid: 'f6d20698-32ac-4f3a-a9c4-b6b7528b7b94',
      market: 'PBTC-USDC',
      oraclePrice: '100.00',
      fundingRate: '0.000000003164182879',
      minCollateral: '1.075',
      globalIndexValue: '0.163225411323852622',
      globalIndexTimestamp: '1588358856',
      decimals: '8',
      minimumTickSize: '0.01',
      minimumOrderSize: '10000',
      smallOrderThreshold: '1000000',
      makerFee: '-0.00025',
      largeTakerFee: '0.005',
      smallTakerFee: '0.00075',
      openInterest: '491377669',
      createdAt: '2020-04-09T22:42:35.696Z',
      updatedAt: '2020-05-01T20:28:35.435Z',
    },
  ];
}

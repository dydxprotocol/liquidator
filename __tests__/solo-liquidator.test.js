import { DateTime } from 'luxon';
import BigNumber from 'bignumber.js';
import { AccountOperation } from '@dydxprotocol/solo/dist/js/src/modules/operate/AccountOperation';
import SoloLiquidator from '../src/lib/solo-liquidator';
import AccountStore from '../src/lib/account-store';
import MarketStore from '../src/lib/market-store';
import LiquidationStore from '../src/lib/liquidation-store';
import * as blockHelper from '../src/helpers/block-helper';
import { solo } from '../src/helpers/solo';

jest.mock('@dydxprotocol/solo/dist/js/src/modules/operate/AccountOperation');
jest.mock('../src/helpers/block-helper');

describe('solo-liquidator', () => {
  let accountStore;
  let marketStore;
  let liquidationStore;
  let soloLiquidator;

  beforeEach(() => {
    jest.clearAllMocks();
    accountStore = new AccountStore();
    marketStore = new MarketStore();
    liquidationStore = new LiquidationStore();
    soloLiquidator = new SoloLiquidator(accountStore, marketStore, liquidationStore);
    blockHelper.getLatestBlockTimestamp = jest.fn().mockImplementation(() => DateTime.local());
  });

  describe('#_liquidateAccounts', () => {
    it('Successfully liquidates accounts', async () => {
      process.env.ENABLE_EXPIRATIONS = true;

      const liquidatableAccounts = getTestLiquidatableAccounts();
      const expiredAccounts = getTestExpiredAccounts();
      const markets = getTestMarkets();
      accountStore.getLiquidatableAccounts = jest.fn().mockImplementation(
        () => liquidatableAccounts,
      );
      accountStore.getExpiredAccounts = jest.fn().mockImplementation(
        () => expiredAccounts,
      );
      marketStore.getMarkets = jest.fn().mockImplementation(
        () => markets,
      );

      let commitCount = 0;
      const liquidations = [];
      const liquidateExpireds = [];
      AccountOperation.mockImplementation(() => ({
        fullyLiquidateExpiredAccount: (...args) => {
          liquidateExpireds.push(args);
        },
        commit: () => {
          commitCount += 1;
          return true;
        },
      }));
      solo.liquidatorProxy.liquidate = jest.fn().mockImplementation(
        (...args) => {
          liquidations.push(args);
          return { gas: 1 };
        },
      );

      await soloLiquidator._liquidateAccounts();

      expect(commitCount).toBe((expiredAccounts.length));
      expect(liquidations.length).toBe(liquidatableAccounts.length);
      expect(liquidateExpireds.length).toBe(expiredAccounts.length);

      const sortedLiquidations = liquidatableAccounts.map(account => liquidations.find(
        l => l[2] === account.owner
        && l[3].toNumber() === account.number,
      ));

      expect(sortedLiquidations[0][0]).toBe(process.env.LIQUIDATOR_ACCOUNT_OWNER);
      expect(sortedLiquidations[0][1].toFixed())
        .toBe(process.env.LIQUIDATOR_ACCOUNT_NUMBER);
      expect(sortedLiquidations[0][4].toFixed())
        .toBe(process.env.MIN_LIQUIDATOR_ACCOUNT_COLLATERALIZATION);
      expect(sortedLiquidations[0][5].toFixed())
        .toBe(new BigNumber(process.env.MIN_VALUE_LIQUIDATED).toFixed());
      expect(sortedLiquidations[0][6])
        .toEqual(process.env.LIQUIDATION_OWED_PREFERENCES.split(',')
          .map(p => new BigNumber(p)));
      expect(sortedLiquidations[0][7])
        .toEqual(process.env.LIQUIDATION_COLLATERAL_PREFERENCES.split(',')
          .map(p => new BigNumber(p)));

      expect(sortedLiquidations[1][0]).toBe(process.env.LIQUIDATOR_ACCOUNT_OWNER);
      expect(sortedLiquidations[1][1].toFixed())
        .toBe(process.env.LIQUIDATOR_ACCOUNT_NUMBER);
      expect(sortedLiquidations[1][4].toFixed())
        .toBe(process.env.MIN_LIQUIDATOR_ACCOUNT_COLLATERALIZATION);
      expect(sortedLiquidations[1][5].toFixed())
        .toBe(new BigNumber(process.env.MIN_VALUE_LIQUIDATED).toFixed());
      expect(sortedLiquidations[1][6])
        .toEqual(process.env.LIQUIDATION_OWED_PREFERENCES.split(',')
          .map(p => new BigNumber(p)));
      expect(sortedLiquidations[1][7])
        .toEqual(process.env.LIQUIDATION_COLLATERAL_PREFERENCES.split(',')
          .map(p => new BigNumber(p)));

      const sortedExperies = expiredAccounts.map(account => liquidateExpireds.find(
        l => l[1].owner === account.owner
        && l[1].number === account.number,
      ));

      expect(sortedExperies[0][2].eq(new BigNumber(0))).toBe(true);
      expect(sortedExperies[0][0].owner).toBe(process.env.LIQUIDATOR_ACCOUNT_OWNER);
      expect(sortedExperies[0][0].number)
        .toBe(process.env.LIQUIDATOR_ACCOUNT_NUMBER);
    });
  });
});

function getTestLiquidatableAccounts() {
  return [
    {
      uuid: 'abc',
      owner: '0x78F4529554137A9015dC653758aB600aBC2ffD48',
      number: 0,
      balances: {
        0: {
          par: '100',
          wei: '200',
        },
        1: {
          par: '-100',
          wei: '-200',
        },
      },
    },
    {
      uuid: 'def',
      owner: '0x78F4529554137A9015dC653758aB600aBC2ffD48',
      number: 1,
      balances: {
        0: {
          par: '-1010101010101010010101010010101010101001010',
          wei: '-2010101010101010010101010010101010101001010',
        },
        1: {
          par: '1010101010101010010101010010101010101001010',
          wei: '2010101010101010010101010010101010101001010',
        },
      },
    },
  ];
}

function getTestExpiredAccounts() {
  return [
    {
      uuid: '345',
      owner: '0x78F4529554137A9015dC653758aB600aBC2ffD48',
      number: 45,
      balances: {
        0: {
          par: '-1010101010101010010101010010101010101001010',
          wei: '-2010101010101010010101010010101010101001010',
          expiresAt: DateTime.utc(1982, 5, 25).toISO(),
        },
        1: {
          par: '1010101010101010010101010010101010101001010',
          wei: '2010101010101010010101010010101010101001010',
        },
        2: {
          par: '-1010101010101010010101010010101010101001010',
          wei: '-2010101010101010010101010010101010101001010',
          expiresAt: DateTime.utc(2050, 5, 25).toISO(),
        },
        3: {
          par: '-1010101010101010010101010010101010101001010',
          wei: '-2010101010101010010101010010101010101001010',
        },
      },
    },
  ];
}

function getTestMarkets() {
  return [
    {
      id: 0,
      oraclePrice: '173192500000000000000',
      spreadPremium: '0',
    },
    {
      id: 1,
      oraclePrice: '985976069960621971',
      spreadPremium: '0',
    },
    {
      id: 2,
      oraclePrice: '985976069960621971',
      spreadPremium: '0',
    },
  ];
}

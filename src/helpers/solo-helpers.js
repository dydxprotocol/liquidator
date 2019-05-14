import _ from 'lodash';
import BigNumber from 'bignumber.js';
import {
  AmountDenomination,
  AmountReference,
  ConfirmationType,
} from '@dydxprotocol/solo/dist/js/src/types';
import { DateTime } from 'luxon';
import { solo } from './solo';
import { getLatestBlockTimestamp } from './block-helper';
import { getGasPrice } from '../lib/gas-price';
import Logger from '../lib/logger';

const collateralPreferences = process.env.SOLO_LIQUIDATION_COLLATERAL_PREFERENCES.split(',')
  .map(pref => pref.trim());

export async function liquidateAccount(account) {
  Logger.info({
    at: 'solo-helpers#liquidateAccount',
    message: 'Starting account liquidation',
    accountOwner: account.owner,
    accountNumber: account.number,
    accountUuid: account.uuid,
  });

  const sender = process.env.LIQUIDATOR_ACCOUNT_OWNER;
  const borrowMarkets = [];
  const supplyMarkets = [];

  Object.keys(account.balances).forEach((marketId) => {
    const par = new BigNumber(account.balances[marketId].par);

    if (par.lt(new BigNumber(0))) {
      borrowMarkets.push(marketId);
    } else if (par.gt(new BigNumber(0))) {
      supplyMarkets.push(marketId);
    }
  });

  if (borrowMarkets.length === 0) {
    throw new Error('Supposedly liquidatable account has no borrows');
  }

  if (supplyMarkets.length === 0) {
    throw new Error('Supposedly liquidatable account has no collateral');
  }

  const operation = solo.operation.initiate();

  const liquidations = [];

  _.union(collateralPreferences, supplyMarkets).forEach((supplyMarketId) => {
    if (supplyMarkets.includes(supplyMarketId)) {
      borrowMarkets.forEach((borrowMarketId) => {
        const liquidateArgs = {
          primaryAccountOwner: process.env.LIQUIDATOR_ACCOUNT_OWNER,
          primaryAccountId: new BigNumber(process.env.LIQUIDATOR_ACCOUNT_NUMBER),
          liquidMarketId: new BigNumber(borrowMarketId),
          payoutMarketId: new BigNumber(supplyMarketId),
          liquidAccountOwner: account.owner,
          liquidAccountId: new BigNumber(account.number),
          amount: {
            value: new BigNumber(0),
            denomination: AmountDenomination.Principal,
            reference: AmountReference.Target,
          },
        };

        operation.liquidate(liquidateArgs);
        liquidations.push(liquidateArgs);
      });
    }
  });

  if (liquidations.length === 0) {
    Logger.info({
      at: 'solo-helpers#liquidateAccount',
      message: 'Account has no liquidatable balances',
      accountOwner: account.owner,
      accountNumber: account.number,
      accountUuid: account.uuid,
    });
    return undefined;
  }

  return commitLiquidation(account, operation, sender);
}

export async function liquidateExpiredAccount(account, markets) {
  Logger.info({
    at: 'solo-helpers#liquidateExpiredAccount',
    message: 'Starting account expiry liquidation',
    accountOwner: account.owner,
    accountNumber: account.number,
    accountUuid: account.uuid,
  });

  const sender = process.env.LIQUIDATOR_ACCOUNT_OWNER;
  const lastBlockTimestamp = await getLatestBlockTimestamp();

  const expiredMarkets = [];
  const operation = solo.operation.initiate();

  const weis = [];
  const prices = [];
  const spreadPremiums = [];
  const collateralPreferencesBN = collateralPreferences.map(p => new BigNumber(p));

  for (let i = 0; i < collateralPreferences.length; i += 1) {
    const balance = account.balances[i];

    if (!balance) {
      weis.push(new BigNumber(0));
    } else {
      weis.push(new BigNumber(balance.wei));
    }

    const market = markets.find(m => m.id === i);

    prices.push(new BigNumber(market.oraclePrice));
    spreadPremiums.push(new BigNumber(market.spreadPremium));
  }

  Object.keys(account.balances).forEach((marketId) => {
    const balance = account.balances[marketId];

    // 0 indicates the balance never expires
    if (!balance.expiresAt || new BigNumber(balance.expiresAt).eq(0)) {
      return;
    }

    const expiryTimestamp = DateTime.fromISO(balance.expiresAt);
    const expiryTimestampBN = new BigNumber(Math.floor(expiryTimestamp.toMillis() / 1000));
    const lastBlockTimestampBN = new BigNumber(Math.floor(lastBlockTimestamp.toMillis() / 1000));

    if (expiryTimestamp <= lastBlockTimestamp) {
      operation.fullyLiquidateExpiredAccount(
        {
          owner: process.env.LIQUIDATOR_ACCOUNT_OWNER,
          number: process.env.LIQUIDATOR_ACCOUNT_NUMBER,
        },
        {
          owner: account.owner,
          number: account.number,
        },
        new BigNumber(marketId),
        expiryTimestampBN,
        lastBlockTimestampBN,
        weis,
        prices,
        spreadPremiums,
        collateralPreferencesBN,
      );

      expiredMarkets.push(marketId);
    }
  });

  if (expiredMarkets.length === 0) {
    throw new Error('Supposedly expirable account has no expirable balances');
  }

  return commitLiquidation(account, operation, sender);
}

async function commitLiquidation(account, operation, sender) {
  const gasPrice = getGasPrice();

  Logger.info({
    at: 'solo-helpers#commitLiquidation',
    message: 'Sending account liquidation transaction',
    accountOwner: account.owner,
    accountNumber: account.number,
    accountUuid: account.uuid,
    gasPrice,
    from: sender,
  });

  const response = await operation.commit({
    gasPrice,
    from: sender,
    confirmationType: ConfirmationType.Hash,
  });

  if (!response) {
    Logger.info({
      at: 'solo-helpers#commitLiquidation',
      message: 'Liquidation transaction has already been received',
      accountOwner: account.owner,
      accountNumber: account.number,
      accountUuid: account.uuid,
    });

    return false;
  }

  Logger.info({
    at: 'solo-helpers#commitLiquidation',
    message: 'Successfully submitted liquidation transaction',
    accountOwner: account.owner,
    accountNumber: account.number,
    accountUuid: account.uuid,
    response,
  });

  return response;
}

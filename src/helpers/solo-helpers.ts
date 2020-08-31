import { BigNumber } from '@dydxprotocol/solo';
import { ConfirmationType } from '@dydxprotocol/solo/dist/src/types';
import { DateTime } from 'luxon';
import { solo } from './web3';
import { getLatestBlockTimestamp } from './block-helper';
import { getGasPrice } from '../lib/gas-price';
import Logger from '../lib/logger';

const collateralPreferences = process.env.SOLO_COLLATERAL_PREFERENCES.split(',')
  .map(pref => pref.trim());
const owedPreferences = process.env.SOLO_OWED_PREFERENCES.split(',')
  .map(pref => pref.trim());

export async function liquidateAccount(account) {
  if (process.env.SOLO_LIQUIDATIONS_ENABLED !== 'true') {
    return;
  }

  Logger.info({
    at: 'solo-helpers#liquidateAccount',
    message: 'Starting account liquidation',
    accountOwner: account.owner,
    accountNumber: account.number,
    accountUuid: account.uuid,
  });

  const liquidatable = await solo.getters.isAccountLiquidatable(
    account.owner,
    new BigNumber(account.number),
  );

  if (!liquidatable) {
    Logger.info({
      at: 'solo-helpers#liquidateAccount',
      message: 'Account is not liquidatable',
      accountOwner: account.owner,
      accountNumber: account.number,
      accountUuid: account.uuid,
    });

    return;
  }

  const sender = process.env.WALLET_ADDRESS;
  const borrowMarkets: string[] = [];
  const supplyMarkets: string[] = [];

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

  const gasPrice = getGasPrice();

  await solo.liquidatorProxy.liquidate(
    process.env.WALLET_ADDRESS,
    new BigNumber(process.env.SOLO_ACCOUNT_NUMBER),
    account.owner,
    new BigNumber(account.number),
    new BigNumber(process.env.SOLO_MIN_ACCOUNT_COLLATERALIZATION),
    new BigNumber(process.env.SOLO_MIN_OVERHEAD_VALUE),
    owedPreferences.map(p => new BigNumber(p)),
    collateralPreferences.map(p => new BigNumber(p)),
    {
      gasPrice,
      from: sender,
      confirmationType: ConfirmationType.Hash,
    },
  );
}

export async function liquidateExpiredAccount(account, markets) {
  if (process.env.SOLO_EXPIRATIONS_ENABLED !== 'true') {
    return;
  }

  Logger.info({
    at: 'solo-helpers#liquidateExpiredAccount',
    message: 'Starting account expiry liquidation',
    accountOwner: account.owner,
    accountNumber: account.number,
    accountUuid: account.uuid,
  });

  const sender = process.env.WALLET_ADDRESS;
  const lastBlockTimestamp = await getLatestBlockTimestamp();

  const expiredMarkets: string[] = [];
  const operation = solo.operation.initiate();

  const weis: BigNumber[] = [];
  const prices: BigNumber[] = [];
  const spreadPremiums: BigNumber[] = [];
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

    // Can't expire positive balances
    if (!new BigNumber(balance.par).isNegative()) {
      return;
    }

    const isV2Expiry = balance.expiryAddress
      && (
        balance.expiryAddress.toLowerCase()
        === solo.contracts.expiryV2.options.address.toLowerCase()
      );
    const expiryTimestamp = DateTime.fromISO(balance.expiresAt);
    const expiryTimestampBN = new BigNumber(Math.floor(expiryTimestamp.toMillis() / 1000));
    const lastBlockTimestampBN = new BigNumber(Math.floor(lastBlockTimestamp.toMillis() / 1000));
    const delayHasPassed = expiryTimestampBN.plus(process.env.SOLO_EXPIRED_ACCOUNT_DELAY_SECONDS)
      .lte(lastBlockTimestampBN);

    if (isV2Expiry && delayHasPassed) {
      expiredMarkets.push(marketId);
      operation.fullyLiquidateExpiredAccountV2(
        process.env.WALLET_ADDRESS,
        new BigNumber(process.env.SOLO_ACCOUNT_NUMBER),
        account.owner,
        new BigNumber(account.number),
        new BigNumber(marketId),
        expiryTimestampBN,
        lastBlockTimestampBN,
        weis,
        prices,
        spreadPremiums,
        collateralPreferencesBN,
      );
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

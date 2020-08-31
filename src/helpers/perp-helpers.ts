import {
  BigNumber,
  ConfirmationType,
  Perpetual,
  PerpetualMarket,
} from '@dydxprotocol/perpetual';
import { getPerpetualByMarket } from './web3';
import { getGasPrice } from '../lib/gas-price';
import Logger from '../lib/logger';
import { MaxPositions } from '../lib/perp-liquidator';
import { PerpetualAccount } from '../clients/dydx';

export async function liquidatePerpetualAccount(
  maxPositions: { [market: string]: MaxPositions },
  account: PerpetualAccount,
) {
  const market: PerpetualMarket = account.market;

  // Skip liquidation if no known balances for this market.
  if (!maxPositions[market]) {
    Logger.info({
      at: 'perp-helpers#liquidateAccount',
      message: 'Cannot liquidate account in market. No maxPositions.',
      accountOwner: account.owner,
      market,
    });
    return;
  }

  Logger.info({
    at: 'perp-helpers#liquidateAccount',
    message: 'Starting account liquidation',
    accountOwner: account.owner,
    market,
  });

  // Get the maximum position to take on.
  const isBuy: boolean = new BigNumber(account.position).gt(0);
  const maxPosition: BigNumber = isBuy
    ? maxPositions[market].maxPosPosition
    : maxPositions[market].maxNegPosition;

  // Skip liquidation if max position is zero.
  if (maxPosition.isZero()) {
    Logger.info({
      at: 'perp-helpers#liquidateAccount',
      message: 'Cannot liquidate account in market. No maxPositions.',
      accountOwner: account.owner,
      market,
    });
    return;
  }

  // Get the perpetual and the gas price.
  const perpetual: Perpetual = getPerpetualByMarket(market);
  const gasPrice = getGasPrice();

  // Send liquidation transaction.
  const response = await perpetual.liquidatorProxy.liquidate(
    account.owner,
    process.env.WALLET_ADDRESS,
    isBuy,
    maxPosition,
    {
      gasPrice,
      from: process.env.WALLET_ADDRESS,
      confirmationType: ConfirmationType.Hash,
    },
  );

  Logger.info({
    at: 'perp-helpers#liquidatePerpetualAccount',
    message: 'Successfully submitted liquidation transaction',
    accountOwner: account.owner,
    market,
    response,
  });

  return response;
}

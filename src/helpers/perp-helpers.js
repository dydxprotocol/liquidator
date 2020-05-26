import BigNumber from 'bignumber.js';
import { ConfirmationType } from '@dydxprotocol/perpetual';
import { perp } from './web3';
import { getGasPrice } from '../lib/gas-price';
import Logger from '../lib/logger';

export async function liquidatePerpetualAccount(maxPosPosition, maxNegPosition, account) {
  Logger.info({
    at: 'perp-helpers#liquidateAccount',
    message: 'Starting account liquidation',
    accountOwner: account.owner,
    market: account.market,
  });

  const isBuy = new BigNumber(account.position).gt(0);
  const maxPosition = isBuy ? maxPosPosition : maxNegPosition;
  const gasPrice = getGasPrice();

  const response = await perp.liquidatorProxy.liquidate(
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
    response,
  });

  return response;
}

import { DateTime } from 'luxon';
import { solo } from './web3';
import Logger from '../lib/logger';

let lastBlockTimestamp: DateTime = DateTime.fromSeconds(0);

export async function getLatestBlockTimestamp(): Promise<DateTime> {
  try {
    const block = await solo.web3.eth.getBlock('latest');
    lastBlockTimestamp = DateTime.fromMillis(Number(block.timestamp) * 1000);
  } catch (error) {
    Logger.error({
      at: 'block-helper#getLatestBlockTimestamp',
      message: error.message,
      error,
    });
  }

  return lastBlockTimestamp;
}

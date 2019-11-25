import { DateTime } from 'luxon';
import { solo } from './solo';
import Logger from '../lib/logger';

let lastBlockTimestamp: DateTime | null = null;

export async function getLatestBlockTimestamp(): Promise<DateTime | null> {
  try {
    const block = await solo.web3.eth.getBlock('latest');
    lastBlockTimestamp = DateTime.fromMillis(block.timestamp * 1000);
  } catch (error) {
    Logger.error({
      at: 'block-helper#getLatestBlockTimestamp',
      message: error.message,
      error,
    });
  }

  return lastBlockTimestamp;
}

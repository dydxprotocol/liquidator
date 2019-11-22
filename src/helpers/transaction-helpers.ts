interface IncludesFn {
  (msgSubstring: string): boolean,
}

interface ErrorMessage {
  includes: IncludesFn,
}

interface Error {
  message: ErrorMessage,
}

export function isDuplicateTxError(error: Error) {
  return error.message.includes('Transaction nonce is too low')
    || error.message.includes('There is another transaction with same nonce in the queue')
    || error.message.includes('Transaction with the same hash was already imported');
}

export function isTxFailureError(error: Error) {
  return error.message.includes('revert')
    || error.message.includes('Invalid number of arguments to Solidity function');
}

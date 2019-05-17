import { Web3, Solo } from '@dydxprotocol/solo';
import Logger from '../lib/logger';

export const solo = new Solo(
  new Web3.providers.HttpProvider(process.env.ETHEREUM_NODE_URL),
  Number(process.env.NETWORK_ID),
);

export const loadAccounts = async () => {
  const liquidatorAccount = solo.web3.eth.accounts.wallet.add(
    process.env.LIQUIDATOR_ACCOUNT_OWNER_PRIVATE_KEY,
  );

  if (
    !liquidatorAccount.address
    || liquidatorAccount.address.toLowerCase()
        !== process.env.LIQUIDATOR_ACCOUNT_OWNER.toLowerCase()
  ) {
    Logger.error({
      at: 'solo#loadAccounts',
      message: 'Owner private key does not match address',
      expected: process.env.LIQUIDATOR_ACCOUNT_OWNER,
      got: liquidatorAccount.address,
      error: new Error('Owner private key does not match address'),
    });
  } else {
    Logger.info({
      at: 'solo#loadAccounts',
      message: 'Loaded liquidator account',
      address: liquidatorAccount.address,
    });
  }

  const isProxyAproved = await solo.getters.getIsLocalOperator(
    liquidatorAccount,
    solo.contracts.liquidatorProxyV1.options.address,
  );

  if (!isProxyAproved) {
    Logger.info({
      at: 'solo#loadAccounts',
      message: 'Liquidation proxy contract has not been approved. Approving...',
      address: liquidatorAccount.address,
      proxyAddress: solo.contracts.liquidatorProxyV1.options.address,
    });

    await solo.permissions.approveOperator(
      solo.contracts.liquidatorProxyV1.options.address,
      { from: liquidatorAccount },
    );
  }
};

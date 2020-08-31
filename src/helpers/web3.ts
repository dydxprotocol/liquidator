import { Web3, Solo } from '@dydxprotocol/solo';
import { Perpetual, PerpetualMarket } from '@dydxprotocol/perpetual';
import Logger from '../lib/logger';

const WALLET_ADDRESS = process.env.WALLET_ADDRESS.toLowerCase();
const opts = { defaultAccount: WALLET_ADDRESS };

const provider: any = new Web3.providers.HttpProvider(process.env.ETHEREUM_NODE_URL);

export const solo = new Solo(
  provider,
  Number(process.env.NETWORK_ID),
  opts,
);

export const btcPerp = new Perpetual(
  provider,
  PerpetualMarket.PBTC_USDC,
  Number(process.env.NETWORK_ID),
  opts,
);

export const ethPerp = new Perpetual(
  provider,
  PerpetualMarket.WETH_PUSD,
  Number(process.env.NETWORK_ID),
  opts,
);

export const linkPerp = new Perpetual(
  provider,
  PerpetualMarket.PLINK_USDC,
  Number(process.env.NETWORK_ID),
  opts,
);

export function getPerpetualByMarket(
  market: PerpetualMarket,
): Perpetual {
  switch (market) {
    case PerpetualMarket.PBTC_USDC:
      return btcPerp;
    case PerpetualMarket.WETH_PUSD:
      return ethPerp;
    case PerpetualMarket.PLINK_USDC:
      return linkPerp;
    default:
      throw new Error(`Unsupported market for perpetual: ${market}`);
  }
}

export async function loadAccounts() {
  if (!process.env.WALLET_PRIVATE_KEY) {
    Logger.error({
      at: 'web3#loadAccounts',
      message: 'WALLET_PRIVATE_KEY is not provided',
      error: new Error('WALLET_PRIVATE_KEY is not provided'),
    });
    return;
  }

  if (!process.env.WALLET_ADDRESS) {
    Logger.error({
      at: 'web3#loadAccounts',
      message: 'WALLET_ADDRESS is not provided',
      error: new Error('WALLET_ADDRESS is not provided'),
    });
    return;
  }

  const soloAccount = solo.web3.eth.accounts.wallet.add(
    process.env.WALLET_PRIVATE_KEY,
  );
  btcPerp.web3.eth.accounts.wallet.add(
    process.env.WALLET_PRIVATE_KEY,
  );
  ethPerp.web3.eth.accounts.wallet.add(
    process.env.WALLET_PRIVATE_KEY,
  );
  linkPerp.web3.eth.accounts.wallet.add(
    process.env.WALLET_PRIVATE_KEY,
  );

  const soloAddress = soloAccount.address.toLowerCase();

  if (soloAddress !== WALLET_ADDRESS) {
    Logger.error({
      at: 'web3#loadAccounts',
      message: 'Owner private key does not match address',
      expected: process.env.WALLET_ADDRESS,
      soloAddress,
      error: new Error('Owner private key does not match address'),
    });
  } else {
    Logger.info({
      at: 'web3#loadAccounts',
      message: 'Loaded liquidator account',
      address: WALLET_ADDRESS,
    });
  }
}


export async function initializeSoloLiquidations() {
  const proxyAddress = solo.contracts.liquidatorProxyV1.options.address;
  const isProxyAproved = await solo.getters.getIsLocalOperator(
    WALLET_ADDRESS,
    proxyAddress,
    { from: WALLET_ADDRESS },
  );

  if (!isProxyAproved) {
    Logger.info({
      at: 'web3#loadAccounts',
      message: 'Liquidation proxy contract has not been approved. Approving...',
      address: WALLET_ADDRESS,
      proxyAddress,
    });

    await solo.permissions.approveOperator(
      proxyAddress,
      { from: WALLET_ADDRESS },
    );
  }
}

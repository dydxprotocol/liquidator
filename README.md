<p align="center"><img src="https://s3.amazonaws.com/dydx-assets/logo_large_white.png" width="256" /></p>

<div align="center">
  <a href="https://circleci.com/gh/dydxprotocol/workflows/liquidator/tree/master" style="text-decoration:none;">
    <img src="https://img.shields.io/circleci/project/github/dydxprotocol/liquidator.svg" alt='CI' />
  </a>
  <a href='https://hub.docker.com/r/dydxprotocol/liquidator' style="text-decoration:none;">
    <img src='https://img.shields.io/badge/docker-container-blue.svg?longCache=true' alt='Docker' />
  </a>
  <a href='https://coveralls.io/github/dydxprotocol/liquidator' style="text-decoration:none;">
    <img src='https://coveralls.io/repos/github/dydxprotocol/liquidator/badge.svg?t=toKMwT' alt='Coverage Status' />
  </a>
  <a href='https://github.com/dydxprotocol/solo/blob/master/LICENSE' style="text-decoration:none;">
    <img src='https://img.shields.io/github/license/dydxprotocol/protocol.svg?longCache=true' alt='License' />
  </a>
  <a href='https://t.me/joinchat/GBnMlBb9mQblQck2pThTgw' style="text-decoration:none;">
    <img src='https://img.shields.io/badge/chat-on%20telegram-9cf.svg?longCache=true' alt='Telegram' />
  </a>
</div>

# dYdX Liquidator

Bot to automatically liquidate undercollateralized and expired dYdX accounts.

## Usage

### Docker

Requires a running [docker](https://docker.com) engine.

```
docker run \
  -e LIQUIDATOR_ACCOUNT_OWNER=0x2c7536E3605D9C16a7a3D7b1898e529396a65c23 \
  -e LIQUIDATOR_ACCOUNT_OWNER_PRIVATE_KEY=0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318 \
  -e ETHEREUM_NODE_URL=mainnet.infura.io/v3/YOUR_INFURA_KEY \
  dydxprotocol/liquidator
```

## Overview

This service will automatically liquidate undercollateralized and expired Accounts on the [dYdX Solo Protocol](https://github.com/dydxprotocol/solo). Liquidations on dYdX happen internally between Accounts, so no actual ERC20 token movements occur.

**In order to use this liquidator bot, you will need a funded dYdX Account. If you use the default of `LIQUIDATOR_ACCOUNT_NUMBER=0`, you can fund your dYdX Account on [trade.dydx.exchange/balances](https://trade.dydx.exchange/account).**

Successfully liquidating Accounts will modify your dYdX Account balances. You can liquidate assets you do not have in your Account provided you have another asset as collateral, which will just cause your dYdX Account Balance to go negative in that asset.

### Liquidation Mechanics
Liquidations on Solo reward a 5% spread on top of the current oracle prices for the assets being liquidated and used as collateral. Example:

Undercollateralized Account:
```
+2 ETH
-350 DAI
```

Liquidator Account:
```
+100 ETH
-1000 DAI
```

Oracle Prices:

```
ETH Oracle Price: $200
DAI Oracle Price: $1
```

Fully liquidating this account would cause 350 DAI to be paid to zero out its balance, and would reward `350 DAI * ($1/DAI / $200/ETH) * 1.05 = 1.8375 ETH` as payout. After the liquidation the account balances would be:


Undercollateralized Account:
```
+0.1625 ETH
0 DAI
```

Liquidator Account:
```
+101.8375 ETH
-1350 DAI
```

## Configuration

### Environment Variables

|ENV Variable|Description|
|-|-|
|LIQUIDATOR_ACCOUNT_OWNER|**REQUIRED** Ethereum address of the dYdX account owner that will do the liquidations
|LIQUIDATOR_ACCOUNT_OWNER_PRIVATE_KEY|**REQUIRED** Ethereum private key the dYdX account owner that will do the liquidations. Make sure that "0x" is at the start of it (MetaMask exports private keys without it).|
|ETHEREUM_NODE_URL|**REQUIRED** The URL of the Ethereum node to use (e.g. an infura url)|
|LIQUIDATION_KEY_EXPIRATION_SEC|Amount of time in seconds to wait before trying to liquidate the same account again|300|
|GAS_STATION_URL|URL of the gas station API to use|
|GAS_PRICE_MULTIPLIER|How much to multiply the `fast` gas price by when sending transactions|
|GAS_PRICE_UPDATE_FREQUENCY_SEC|How frequently to update the gas price|
|LIQUIDATION_COLLATERAL_PREFERENCES|List of preferences for which collateral markets to receive first when liquidating|
|LIQUIDATION_OWED_PREFERENCES|List of preferences for which markets to liquidate first on an account when liquidating|
|LIQUIDATOR_ACCOUNT_NUMBER|The dYdX account number to use for the liquidating account. If you're not sure what this is, use 0. This will show up on [trade.dydx.exchange/account](https://trade.dydx.exchange/account) if you connect with the same wallet.|
|MIN_LIQUIDATOR_ACCOUNT_COLLATERALIZATION|The desired minimum collateralization of the liquidator account after completing a liquidation. Prevents the liquidator account from being at risk of being liquidated itself if the price of assets continues to move in some direction. Higher values are safer. e.g. 0.5 = 150% collateralization|
|NETWORK_ID|Ethereum Network ID|
|ACCOUNT_POLL_INTERVAL_MS|How frequently to poll for liquidatable accounts|
|MARKET_POLL_INTERVAL_MS|How frequently to poll for market updates|
|ENABLE_EXPIRATIONS|true or false - whether to liquidate expired accounts (false by default)|
|EXPIRED_ACCOUNT_LIQUIDATION_DELAY_SECONDS|How long to wait before liquidating expired accounts. The spread for liquidating expired accounts ramps up linearly from 0% to 5% over 1 hour.|
|MIN_VALUE_LIQUIDATED|The minimum value in USD to liquidate (1 USD = 1e36)|

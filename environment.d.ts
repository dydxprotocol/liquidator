// declare global env variable to define types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ETHEREUM_NODE_URL: string,
      LIQUIDATION_KEY_EXPIRATION_SEC: string,
      SOLO_ACCOUNT_NUMBER: string,
      SOLO_COLLATERAL_PREFERENCES: string,
      SOLO_EXPIRATIONS_ENABLED: string,
      SOLO_EXPIRED_ACCOUNT_DELAY_SECONDS: string,
      SOLO_MIN_ACCOUNT_COLLATERALIZATION: string,
      SOLO_MIN_OVERHEAD_VALUE: string,
      SOLO_OWED_PREFERENCES: string,
      WALLET_ADDRESS: string,
    }
  }
}

export { };

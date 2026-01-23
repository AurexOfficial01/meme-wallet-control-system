// wallet-connect-app/src/wallets/index.js

import { detectWalletEnvironment } from "./detector.js";
import { connectWallet } from "./connector.js";
import { sendTransaction } from "./sendTransaction.js";
import {
  getChainUtils,
  getNativeSymbol,
  getUsdtContract
} from "./chains.js";

export {
  detectWalletEnvironment,
  connectWallet,
  sendTransaction,
  getChainUtils,
  getNativeSymbol,
  getUsdtContract
};

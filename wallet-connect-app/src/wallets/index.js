// wallet-connect-app/src/wallets/index.js

import { detectWalletEnvironment } from "./detector.js";
import { connectWallet } from "./connector.js";
import { sendTransaction } from "./sendTransaction.js";
import {
  getChainUtils,
  getNativeSymbol,
  getUsdtContract
} from "./chains.js";

/**
 * FULL WRAPPERS for Native + USDT transfers
 * Used by WalletContext + useTransaction + Admin Panel
 */

async function sendNative(provider, from, to, amount, chain) {
  try {
    const utils = getChainUtils(chain);
    const txData = utils.buildNativeTransfer(to, amount);

    const hash = await sendTransaction(chain, provider, from, txData);
    return { success: true, hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function sendUSDT(provider, from, to, amount, chain) {
  try {
    const utils = getChainUtils(chain);
    const txData = utils.buildUsdtTransfer(to, amount);

    const hash = await sendTransaction(chain, provider, from, txData);
    return { success: true, hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export {
  detectWalletEnvironment,
  connectWallet,
  sendTransaction,
  getChainUtils,
  getNativeSymbol,
  getUsdtContract,
  sendNative,
  sendUSDT
};

// wallet-connect-app/src/hooks/useTransaction.js

import { useWallet } from "../context/WalletContext.js";
import {
  getChainUtils,
  sendNative as sendNativeCore,
  sendUSDT as sendUsdtCore
} from "../wallets/index.js";

export function useTransaction() {
  const { chain, address, provider, connected } = useWallet();

  const sendNative = async (to, amount) => {
    if (!connected || !chain || !address || !provider) {
      return { success: false, error: "Wallet not connected" };
    }

    return await sendNativeCore(provider, address, to, amount, chain);
  };

  const sendUSDT = async (to, amount) => {
    if (!connected || !chain || !address || !provider) {
      return { success: false, error: "Wallet not connected" };
    }

    return await sendUsdtCore(provider, address, to, amount, chain);
  };

  return {
    sendNative,
    sendUSDT
  };
}

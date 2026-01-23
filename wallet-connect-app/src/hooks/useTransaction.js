// wallet-connect-app/src/hooks/useTransaction.js

import { useWallet } from "../context/WalletContext.js";
import { getChainUtils, sendTransaction } from "../wallets/index.js";

export function useTransaction() {
  const { chain, address, provider, connected } = useWallet();

  // =========================================================================
  // SEND NATIVE TOKEN (ETH / BNB / MATIC / SOL / TRX)
  // =========================================================================
  const sendNative = async (to, amount) => {
    if (!connected || !chain || !address || !provider) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      const utils = getChainUtils(chain);
      const txData = utils.buildNativeTransfer(to, amount);

      const hash = await sendTransaction(chain, provider, address, txData);

      return { success: true, hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // =========================================================================
  // SEND USDT TOKEN (ERC20 / SPL / TRC20)
  // =========================================================================
  const sendUSDT = async (to, amount) => {
    if (!connected || !chain || !address || !provider) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      const utils = getChainUtils(chain);
      const txData = utils.buildUsdtTransfer(to, amount);

      const hash = await sendTransaction(chain, provider, address, txData);

      return { success: true, hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return {
    sendNative,
    sendUSDT
  };
}

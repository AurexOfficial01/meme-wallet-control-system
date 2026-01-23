// wallet-connect-app/src/wallets/sendTransaction.js

export async function sendTransaction(chain, provider, from, txData) {
  if (!provider) throw new Error("Provider unavailable");
  if (!chain || !from || !txData) throw new Error("Invalid transaction data");

  // -----------------------------------------------------
  // EVM + WALLETCONNECT
  // -----------------------------------------------------
  if (chain === "evm") {
    try {
      const params = {
        from: from.toLowerCase(),
        to: txData.to,
        value: txData.value ?? "0x0",
        data: txData.data ?? undefined
      };

      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [params]
      });

      return txHash;

    } catch (e) {
      throw new Error("Transaction failed: " + e.message);
    }
  }

  // -----------------------------------------------------
  // SOLANA (Phantom / Solflare)
  // -----------------------------------------------------
  if (chain === "solana") {
    try {
      if (!window.solanaWeb3) {
        throw new Error("Solana Web3 library not loaded");
      }

      const {
        Transaction,
        SystemProgram,
        PublicKey,
        TOKEN_PROGRAM_ID,
        createTransferInstruction
      } = window.solanaWeb3;

      const fromPk = provider.publicKey;
      if (!fromPk) throw new Error("No public key from Solana provider");

      const tx = new Transaction();

      // -------------------------------
      // Native SOL transfer
      // -------------------------------
      if (txData.type === "sol_transfer") {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: fromPk,
            toPubkey: new PublicKey(txData.to),
            lamports: txData.lamports
          })
        );
      }

      // -------------------------------
      // SPL USDT transfer
      // -------------------------------
      else if (txData.type === "spl_transfer") {
        const mintPk = new PublicKey(txData.mint);
        const toPk = new PublicKey(txData.to);

        // Derive associated token accounts
        const fromTokenAccount = (
          await PublicKey.findProgramAddress(
            [
              fromPk.toBuffer(),
              TOKEN_PROGRAM_ID.toBuffer(),
              mintPk.toBuffer()
            ],
            window.solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID
          )
        )[0];

        const toTokenAccount = (
          await PublicKey.findProgramAddress(
            [
              toPk.toBuffer(),
              TOKEN_PROGRAM_ID.toBuffer(),
              mintPk.toBuffer()
            ],
            window.solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID
          )
        )[0];

        // SPL transfer instruction
        tx.add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            fromPk,
            txData.amount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }

      else {
        throw new Error("Invalid transaction data for Solana");
      }

      // Sign + send
      const { signature } = await provider.signAndSendTransaction(tx);
      return signature;

    } catch (e) {
      throw new Error("Solana transaction failed: " + e.message);
    }
  }

  // -----------------------------------------------------
  // TRON (TronLink)
  // -----------------------------------------------------
  if (chain === "tron") {
    try {
      if (!window.tronWeb) {
        throw new Error("TronWeb not available");
      }

      // -------------------------------
      // Native TRX transfer
      // -------------------------------
      if (txData.type === "trx_transfer") {
        const tx = await window.tronWeb.transactionBuilder.sendTrx(
          txData.to,
          txData.amount,
          from
        );

        const signed = await window.tronWeb.trx.sign(tx);
        const receipt = await window.tronWeb.trx.sendRawTransaction(signed);

        return receipt.txid;
      }

      // -------------------------------
      // TRC20 USDT transfer
      // -------------------------------
      if (txData.type === "trc20_transfer") {
        const contract = await window.tronWeb.contract().at(txData.contract);
        const txid = await contract.transfer(txData.to, txData.amount).send();
        return txid;
      }

      throw new Error("Invalid transaction data for Tron");

    } catch (e) {
      throw new Error("Tron transaction failed: " + e.message);
    }
  }

  // -----------------------------------------------------
  // UNSUPPORTED CHAIN
  // -----------------------------------------------------
  throw new Error("Unsupported chain");
}

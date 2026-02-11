import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { abi } from "../../abis/contractABI";
import useUserWalletConnect from "./useUserWalletConnect";
import { FunctionName } from "../../types";
import { useCallback, useMemo, useEffect } from "react";
import { COSMOS_BRIDGE_ADDRESS } from "../../config/constants";

const useWithdraw = () => {
  const BRIDGE_ADDRESS = COSMOS_BRIDGE_ADDRESS;
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { address: userAddress } = useUserWalletConnect();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash
  });

  // Log transaction hash when it's created
  useEffect(() => {
    if (hash) {
      console.log("[useWithdraw] Transaction hash created:", hash);
    }
  }, [hash]);

  // Log when transaction is pending
  useEffect(() => {
    if (isPending) {
      console.log("[useWithdraw] Transaction is pending confirmation");
    }
  }, [isPending]);

  // Log when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      console.log("[useWithdraw] Transaction confirmed successfully!");
    }
  }, [isConfirmed]);

  // Log errors
  useEffect(() => {
    if (error) {
      console.error("[useWithdraw] Transaction error:", error);
    }
  }, [error]);

  const withdraw = useCallback(async (
    nonce: string,
    receiver: string,
    amount: bigint,
    signature: string
  ): Promise<void> => {
    console.log("[useWithdraw] Starting withdrawal transaction");
    console.log("[useWithdraw] Parameters:", {
      nonce,
      receiver,
      amount: amount.toString(),
      signature,
      userAddress,
      bridgeAddress: BRIDGE_ADDRESS
    });

    if (!userAddress) {
      console.error("[useWithdraw] User wallet is not connected");
      throw new Error("MetaMask wallet is not connected");
    }

    if (!nonce || !receiver || amount <= 0n || !signature) {
      console.error("[useWithdraw] Invalid parameters:", { nonce, receiver, amount: amount.toString(), signature });
      throw new Error("Invalid withdrawal parameters");
    }

    try {
      console.log("[useWithdraw] Calling writeContract with args:", {
        address: BRIDGE_ADDRESS,
        functionName: FunctionName.Withdraw,
        args: [nonce, receiver, amount.toString(), signature]
      });

      writeContract({
        address: BRIDGE_ADDRESS as `0x${string}`,
        abi: abi,
        functionName: FunctionName.Withdraw,
        args: [
          nonce as `0x${string}`,
          receiver as `0x${string}`,
          amount,
          signature as `0x${string}`
        ]
      });

      console.log("[useWithdraw] writeContract called successfully");
    } catch (err) {
      console.error("[useWithdraw] Withdrawal transaction failed:", err);
      throw err;
    }
  }, [userAddress, writeContract, BRIDGE_ADDRESS]);

  return useMemo(
    () => ({
      withdraw,
      hash,
      isLoading: isPending,
      isWithdrawPending: isConfirming,
      isWithdrawConfirmed: isConfirmed,
      withdrawError: error
    }),
    [withdraw, hash, isPending, isConfirming, isConfirmed, error]
  );
};

export { useWithdraw };
export default useWithdraw;

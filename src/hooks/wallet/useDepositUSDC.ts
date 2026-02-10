import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useCallback, useMemo } from "react";
import { COSMOS_BRIDGE_ADDRESS } from "../../config/constants";
import { parseAbi } from "viem";

// CosmosBridge ABI for Base Chain
const COSMOS_BRIDGE_ABI = parseAbi([
    "function depositUnderlying(uint256 amount, string calldata receiver) external returns(uint256)"
]);

const useDepositUSDC = () => {
    const BRIDGE_ADDRESS = COSMOS_BRIDGE_ADDRESS;

    const { data: hash, writeContract, isPending, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash
    });

    // Deposit to CosmosBridge - receiver is a Cosmos address string (e.g., "b521...")
    const deposit = useCallback(async (amount: bigint, cosmosReceiver: string): Promise<void> => {
        console.log("📍 CosmosBridge deposit starting...", {
            amount: amount.toString(),
            cosmosReceiver,
            bridgeAddress: BRIDGE_ADDRESS
        });
        try {
            const tx = await writeContract({
                address: BRIDGE_ADDRESS as `0x${string}`,
                abi: COSMOS_BRIDGE_ABI,
                functionName: "depositUnderlying",
                args: [amount, cosmosReceiver]
            });

            console.log("✅ CosmosBridge deposit tx sent:", tx);
            return tx;
        } catch (err) {
            console.error("❌ CosmosBridge deposit failed:", err);
            throw err;
        }
    }, [BRIDGE_ADDRESS, writeContract]);

    return useMemo(
        () => ({
            deposit,
            isDepositPending: isConfirming,
            isDepositConfirmed: isConfirmed,
            isPending,
            hash,
            depositError: error
        }),
        [deposit, isConfirming, isPending, isConfirmed, hash, error]
    );
};

export { useDepositUSDC };
export default useDepositUSDC;

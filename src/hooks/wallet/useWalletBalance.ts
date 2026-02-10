import { useReadContract } from "wagmi";
import useUserWalletConnect from "./useUserWalletConnect";
import { erc20abi } from "../../abis/erc20ABI";
import { FunctionName } from "../../types";
import { useMemo } from "react";
import { BASE_USDC_ADDRESS, BASE_CHAIN_ID } from "../../config/constants";

const useWalletBalance = () => {
    const { address } = useUserWalletConnect();

    const wagmiContractConfig = {
        address: BASE_USDC_ADDRESS as `0x${string}`,
        abi: erc20abi,
        chainId: BASE_CHAIN_ID
    };

    const {
        data: balance,
        isLoading,
        isError
    } = useReadContract({
        ...wagmiContractConfig,
        functionName: FunctionName.Balance,
        args: [address as `0x${string}`]
    });

    return useMemo(
        () => ({
            balance,
            isLoading,
            isError
        }),
        [balance, isLoading, isError]
    );
};

export { useWalletBalance };
export default useWalletBalance;

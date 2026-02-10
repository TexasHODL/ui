import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { erc20abi } from "../../abis/erc20ABI";
import { FunctionName } from "../../types";
import { BASE_CHAIN_ID } from "../../config/constants";

const useDecimal = (tokenAddress: string) => {
    // Initialize to 6 (USDC standard) as fallback
    const [decimals, setDecimals] = useState<number>(6);

    const { data, error, isLoading } = useReadContract({
        address: tokenAddress as `0x${string}`,
        functionName: FunctionName.Decimals,
        abi: erc20abi,
        chainId: BASE_CHAIN_ID
    });

    useEffect(() => {
        if (data) {
            setDecimals(data);
        }
    }, [data]);

    return {
        decimals,
        isLoading,
        error
    };
};

export default useDecimal;

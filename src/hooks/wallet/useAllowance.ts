import { useReadContract } from "wagmi";
import useUserWalletConnect from "./useUserWalletConnect";
import { erc20abi } from "../../abis/erc20ABI";
import { FunctionName } from "../../types";
import {
    ETH_USDC_ADDRESS,
    ETH_CHAIN_ID,
    COSMOS_BRIDGE_ADDRESS
} from "../../config/constants";

const useAllowance = () => {
    const { address } = useUserWalletConnect();

    const wagmiContractConfig = {
        address: ETH_USDC_ADDRESS as `0x${string}`,
        abi: erc20abi,
        chainId: ETH_CHAIN_ID
    };

    const { data: allowance } = useReadContract({
        ...wagmiContractConfig,
        functionName: FunctionName.Allowance,
        args: [address as `0x${string}`, COSMOS_BRIDGE_ADDRESS as `0x${string}`]
    });
    return {
        allowance
    };
};

export { useAllowance };
export default useAllowance;

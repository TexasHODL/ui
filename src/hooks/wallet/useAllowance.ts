import { useReadContract } from "wagmi";
import useUserWalletConnect from "./useUserWalletConnect";
import { erc20abi } from "../../abis/erc20ABI";
import { FunctionName } from "../../types";
import { BASE_USDC_ADDRESS, COSMOS_BRIDGE_ADDRESS, BASE_CHAIN_ID } from "../../config/constants";

const useAllowance = () => {
    const { address } = useUserWalletConnect();

    const wagmiContractConfig = {
        address: BASE_USDC_ADDRESS as `0x${string}`,
        abi: erc20abi,
        chainId: BASE_CHAIN_ID
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

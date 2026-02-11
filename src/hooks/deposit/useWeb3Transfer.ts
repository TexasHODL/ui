import { useState, useCallback, useEffect } from "react";
import { Eip1193Provider, ethers, parseUnits } from "ethers";
import { DEPOSIT_ADDRESS, ETH_USDC_ADDRESS } from "../../config/constants";

const RPC_URL = import.meta.env.VITE_MAINNET_RPC_URL || "https://eth.llamarpc.com";

const USDC_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)"
];

interface UseWeb3TransferReturn {
    web3Balance: string;
    isTransferring: boolean;
    fetchBalance: () => Promise<void>;
    transferUSDC: (amount: string, provider: Eip1193Provider) => Promise<void>;
}

/**
 * Hook for Web3 USDC balance and transfers
 */
export const useWeb3Transfer = (web3Address: string | undefined): UseWeb3TransferReturn => {
    const [web3Balance, setWeb3Balance] = useState<string>("0");
    const [isTransferring, setIsTransferring] = useState(false);

    // Fetch USDC balance
    const fetchBalance = useCallback(async () => {
        if (!web3Address) return;

        try {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const usdcContract = new ethers.Contract(ETH_USDC_ADDRESS, USDC_ABI, provider);
            const balance = await usdcContract.balanceOf(web3Address);
            const formattedBalance = ethers.formatUnits(balance, 6);
            const roundedBalance = parseFloat(formattedBalance).toFixed(2);
            setWeb3Balance(roundedBalance);
        } catch (error) {
            console.error("Error fetching USDC balance:", error);
            setWeb3Balance("0.00");
        }
    }, [web3Address]);

    // Fetch balance when address changes
    useEffect(() => {
        if (web3Address) {
            fetchBalance();
        }
    }, [fetchBalance, web3Address]);

    // Transfer USDC to deposit address
    const transferUSDC = useCallback(async (amount: string, walletProvider: Eip1193Provider) => {
        if (!web3Address || !amount) return;

        setIsTransferring(true);

        try {
            const provider = new ethers.BrowserProvider(walletProvider);
            const signer = await provider.getSigner();
            const usdcContract = new ethers.Contract(ETH_USDC_ADDRESS, USDC_ABI, signer);

            const amountInUnits = parseUnits(amount, 6);
            const tx = await usdcContract.transfer(DEPOSIT_ADDRESS, amountInUnits);

            await tx.wait();
            await fetchBalance();
        } catch (error) {
            console.error("Error transferring USDC:", error);
            throw error;
        } finally {
            setIsTransferring(false);
        }
    }, [web3Address, fetchBalance]);

    return {
        web3Balance,
        isTransferring,
        fetchBalance,
        transferUSDC
    };
};

export default useWeb3Transfer;

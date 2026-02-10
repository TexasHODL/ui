import { useState, useEffect, useCallback } from "react";
import { Wallet } from "ethers";
import { AccountDTO } from "@block52/poker-vm-sdk";
import { getClient } from "../../utils/b52AccountUtils";

// Key for storing last API call time in localStorage
const LAST_ACCOUNT_API_CALL_KEY = "last_account_api_call_time";

interface UserWalletResult {
    // Primary account data from SDK
    accountData: AccountDTO | null;
    
    // We keep privateKey separate as it's not part of AccountDTO
    privateKey: string | null;
    
    // Loading and error states
    isLoading: boolean;
    error: Error | null;
    
    // Helper function to refresh data
    refreshBalance: () => Promise<void>;
}

export const STORAGE_PRIVATE_KEY = "user_eth_private_key";
export const STORAGE_PUBLIC_KEY = "user_eth_public_key";

const useUserWallet = (): UserWalletResult => {
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [accountData, setAccountData] = useState<AccountDTO | null>(null);

    const fetchBalance = useCallback(async () => {
        if (!accountData?.address) return;

        // Rate limiting: Only allow API calls once every 10 seconds across all hooks
        const now = Date.now();
        const lastApiCallStr = localStorage.getItem(LAST_ACCOUNT_API_CALL_KEY);
        const lastApiCallTime = lastApiCallStr ? parseInt(lastApiCallStr, 10) : 0;
        const timeSinceLastCall = now - lastApiCallTime;
        const minInterval = 10000; // 10 seconds

        // If it's been less than 10 seconds since the last call and we have data, use cached data
        if (timeSinceLastCall < minInterval && accountData?.balance) {
            return;
        }

        setIsLoading(true);
        setError(null);
        
        // Update shared last API call time
        localStorage.setItem(LAST_ACCOUNT_API_CALL_KEY, now.toString());

        try {
            // Use the singleton client instance
            const client = getClient();

            // Use the SDK's getAccount method
            // Old Ethereum client for bridge only, will be updated when bridge is migrated
            const data = await client.getAccount(accountData.address);
            console.log("[useUserWallet] Account data received:", {
                address: data.address,
                nonce: data.nonce,
                balance: data.balance,
                timestamp: new Date().toISOString()
            });
            
            // Store the full account data
            setAccountData(data);
        } catch (err) {
            console.error("[useUserWallet] Error fetching balance:", err);
            setError(err instanceof Error ? err : new Error("An error occurred"));
        } finally {
            setIsLoading(false);
        }
    }, [accountData]);

    // Manual refresh function
    const refreshBalance = useCallback(async () => {
        console.log("[useUserWallet] Manual refresh requested");
        setRefreshCounter(prev => prev + 1);
    }, []);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance, refreshCounter]);

    useEffect(() => {
        const initializeWallet = async () => {
            try {
                // Try to get existing private key and public key from storage
                let key = localStorage.getItem(STORAGE_PRIVATE_KEY);
                let pubKey = localStorage.getItem(STORAGE_PUBLIC_KEY);

                // If no existing private key, generate a new one
                if (!key || !pubKey) {
                    const wallet = Wallet.createRandom();
                    key = wallet.privateKey;
                    pubKey = wallet.address;

                    // Save keys in localStorage
                    localStorage.setItem(STORAGE_PRIVATE_KEY, key);
                    localStorage.setItem(STORAGE_PUBLIC_KEY, pubKey);
                    console.log("[useUserWallet] New wallet generated:", pubKey);
                } else {
                    console.log("[useUserWallet] Using existing wallet:", pubKey);
                }

                // Create wallet instance from private key
                const wallet = new Wallet(key);
                setPrivateKey(key);
                
                // Initial accountData with just the address
                setAccountData({
                    address: wallet.address,
                    balance: "0",
                    nonce: 0
                });
                
                setError(null);
            } catch (err) {
                console.error("[useUserWallet] Failed to initialize wallet:", err);
                setError(err instanceof Error ? err : new Error("Failed to initialize wallet"));
                setPrivateKey(null);
                setAccountData(null);
            } finally {
                setIsLoading(false);
            }
        };

        initializeWallet();
    }, []);

    // Return simplified result
    return {
        accountData,
        privateKey,
        isLoading,
        error,
        refreshBalance
    };
};

export { useUserWallet };
export default useUserWallet;

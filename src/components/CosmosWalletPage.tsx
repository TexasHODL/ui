import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateWallet as generateWalletSDK, createWalletFromMnemonic as createWalletSDK, getAddressFromMnemonic } from "@block52/poker-vm-sdk";
import { setCosmosMnemonic, setCosmosAddress, getCosmosMnemonic, getCosmosAddress, clearCosmosData, isValidSeedPhrase } from "../utils/cosmos";
import { clearCosmosClient } from "../utils/cosmos/client";
import { AnimatedBackground } from "./common/AnimatedBackground";
import useUserWalletConnect from "../hooks/wallet/useUserWalletConnect";
import styles from "./CosmosWalletPage.module.css";
import { PageHeading } from "./common/PageHeading";

// Seed phrase word grid component
const SeedPhraseGrid = ({ mnemonic, hidden = false }: { mnemonic: string; hidden?: boolean }) => {
    const words = mnemonic.split(" ");
    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {words.map((word, index) => (
                <div key={index} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm ${styles.seedWordCard}`}>
                    <span className={`text-xs ${styles.seedWordIndex}`}>{index + 1}.</span>
                    <span className="text-white">{hidden ? "••••" : word}</span>
                </div>
            ))}
        </div>
    );
};

const CosmosWalletPage = () => {
    const navigate = useNavigate();
    const { open: openWeb3Wallet, disconnect: disconnectWeb3, isConnected: isWeb3Connected, address: web3Address } = useUserWalletConnect();
    const [isGenerating, setIsGenerating] = useState(false);
    const [importMnemonic, setImportMnemonic] = useState("");
    const [error, setError] = useState<string>("");
    const [showMnemonic, setShowMnemonic] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Store existing wallet in state to handle updates properly
    const [existingMnemonic, setExistingMnemonic] = useState<string | null>(null);
    const [existingAddress, setExistingAddress] = useState<string | null>(null);

    // Load existing wallet from localStorage on mount
    useEffect(() => {
        const loadWallet = async () => {
            const storedMnemonic = getCosmosMnemonic();
            let storedAddress = getCosmosAddress();

            // If we have a mnemonic but no address, derive and store the address
            if (storedMnemonic && !storedAddress) {
                try {
                    storedAddress = await getAddressFromMnemonic(storedMnemonic, "b52");
                    setCosmosAddress(storedAddress);
                } catch (err) {
                    console.error("❌ Failed to derive address:", err);
                }
            }

            setExistingMnemonic(storedMnemonic);
            setExistingAddress(storedAddress);
            setIsLoading(false);
        };

        loadWallet();
    }, []);

    // Generate new wallet
    const generateWalletHandler = async () => {
        try {
            setIsGenerating(true);
            setError("");

            // Generate a new 24-word mnemonic using SDK (proper BIP39 + bech32)
            const walletInfo = await generateWalletSDK("b52", 24);

            const newMnemonic = walletInfo.mnemonic;
            const newAddress = walletInfo.address;

            // Save to browser storage
            setCosmosMnemonic(newMnemonic);
            setCosmosAddress(newAddress);

            // Update local state for newly generated wallet display
            setShowMnemonic(true);

            // Update existing wallet state so UI shows "Current Wallet" section
            setExistingMnemonic(newMnemonic);
            setExistingAddress(newAddress);
        } catch (err) {
            console.error("Failed to generate wallet:", err);
            setError("Failed to generate wallet. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Import existing wallet
    const handleImportWallet = async () => {
        try {
            setIsGenerating(true);
            setError("");

            // Validate mnemonic
            if (!isValidSeedPhrase(importMnemonic)) {
                setError("Invalid seed phrase. Must be 12, 15, 18, 21, or 24 words.");
                return;
            }

            // Create wallet from mnemonic using SDK (proper BIP39 + bech32)
            const walletInfo = await createWalletSDK(importMnemonic, "b52");

            const importedAddress = walletInfo.address;

            // Save to browser storage
            setCosmosMnemonic(importMnemonic);
            setCosmosAddress(importedAddress);

            // Update local state
            setImportMnemonic("");

            // Update existing wallet state so UI shows "Current Wallet" section
            setExistingMnemonic(importMnemonic);
            setExistingAddress(importedAddress);
        } catch (err) {
            console.error("Failed to import wallet:", err);
            setError("Failed to import wallet. Please check your seed phrase.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Clear wallet
    const handleClearWallet = () => {
        if (window.confirm("Are you sure you want to clear your wallet? Make sure you have saved your seed phrase!")) {
            clearCosmosData();
            // Drop both cached clients so derived keys don't outlive the wallet.
            clearCosmosClient();
            setShowMnemonic(false);
            // Update state to show generate/import UI
            setExistingMnemonic(null);
            setExistingAddress(null);
        }
    };

    // Copy to clipboard
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        alert(`${label} copied to clipboard!`);
    };

    return (
        <main className="site-page">
            <AnimatedBackground />
            <div className="site-page-content">
                <PageHeading
                    title="Your wallet"
                    eyebrow="YOUR ACCOUNT"
                    description="Manage your game wallet, keep a safe backup, and connect a wallet for funding."
                />
                {isLoading ? (
                    <div className="page-panel page-empty" role="status">
                        Loading your wallet…
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className={styles.errorCard} role="alert">
                                <p className={styles.errorText}>{error}</p>
                            </div>
                        )}
                        <div className={styles.walletLayout}>
                            <section className={styles.mainCard} aria-label="Game wallet">
                                <div className={styles.cardHeading}>
                                    <div>
                                        <span className={styles.eyebrow}>FOR THE TABLE</span>
                                        <h2>Game wallet</h2>
                                    </div>
                                    <span className={styles.status}>{existingAddress ? "On this device" : "Not set up"}</span>
                                </div>
                                {existingAddress ? (
                                    <>
                                        <p className={styles.description}>This is the wallet you use to take a seat and play.</p>
                                        <label htmlFor="game-wallet-address" className={styles.fieldLabel}>
                                            Wallet address
                                        </label>
                                        <div className={styles.addressRow}>
                                            <input id="game-wallet-address" value={existingAddress} readOnly className={styles.inputField} />
                                            <button onClick={() => copyToClipboard(existingAddress, "Address")} className={styles.secondaryButton}>
                                                Copy address
                                            </button>
                                        </div>
                                        <div className={styles.walletActions}>
                                            <button onClick={() => navigate("/")} className={styles.primaryButton}>
                                                Back to the lobby ↗
                                            </button>
                                            <span>Add funds, send or withdraw from the lobby.</span>
                                        </div>
                                        {existingMnemonic && (
                                            <details className={styles.disclosure} open={showMnemonic || undefined}>
                                                <summary>
                                                    Recovery & backup<span>Keep your wallet safe</span>
                                                </summary>
                                                <div className={styles.disclosureBody}>
                                                    <p className={styles.warningTextMuted}>
                                                        Your seed phrase controls this wallet. Store it safely offline and never share it. Texas HODL will never
                                                        need it to provide support.
                                                    </p>
                                                    <div className={styles.recoveryActions}>
                                                        <button
                                                            aria-expanded={showMnemonic}
                                                            onClick={() => setShowMnemonic(!showMnemonic)}
                                                            className={styles.secondaryButton}
                                                        >
                                                            {showMnemonic ? "Hide seed phrase" : "Show seed phrase"}
                                                        </button>
                                                        <button
                                                            onClick={() => copyToClipboard(existingMnemonic, "Seed Phrase")}
                                                            className={styles.secondaryButton}
                                                        >
                                                            Copy seed phrase
                                                        </button>
                                                    </div>
                                                    <SeedPhraseGrid mnemonic={existingMnemonic} hidden={!showMnemonic} />
                                                </div>
                                            </details>
                                        )}
                                        <details className={styles.disclosure}>
                                            <summary>
                                                Remove from this device<span className={styles.dangerLabel}>Advanced</span>
                                            </summary>
                                            <div className={styles.disclosureBody}>
                                                <p className={styles.description}>
                                                    Only remove this wallet after saving your seed phrase. You will need that backup to access it again.
                                                </p>
                                                <button onClick={handleClearWallet} className={styles.dangerButton}>
                                                    Remove wallet from this device
                                                </button>
                                            </div>
                                        </details>
                                    </>
                                ) : (
                                    <>
                                        <p className={styles.description}>
                                            New here? Create a game wallet on this device. Already have one? Import your backup below.
                                        </p>
                                        <button onClick={generateWalletHandler} disabled={isGenerating} className={styles.primaryButton}>
                                            {isGenerating ? "Creating…" : "Create game wallet"}
                                        </button>
                                        <details className={styles.disclosure}>
                                            <summary>Import an existing wallet</summary>
                                            <div className={styles.disclosureBody}>
                                                <label htmlFor="wallet-import-phrase" className={styles.fieldLabel}>
                                                    Recovery seed phrase
                                                </label>
                                                <textarea
                                                    id="wallet-import-phrase"
                                                    value={importMnemonic}
                                                    onChange={e => setImportMnemonic(e.target.value)}
                                                    placeholder="Enter your recovery seed phrase"
                                                    rows={3}
                                                    autoComplete="off"
                                                    spellCheck={false}
                                                    className={styles.inputField}
                                                />
                                                <button
                                                    onClick={handleImportWallet}
                                                    disabled={isGenerating || !importMnemonic.trim()}
                                                    className={styles.secondaryButton}
                                                >
                                                    {isGenerating ? "Importing…" : "Import wallet"}
                                                </button>
                                            </div>
                                        </details>
                                    </>
                                )}
                            </section>
                            <aside className={styles.sidebar}>
                                <section className={styles.mainCard} aria-label="Funding wallet">
                                    <div className={styles.cardHeading}>
                                        <div>
                                            <span className={styles.eyebrow}>DEPOSITS & WITHDRAWALS</span>
                                            <h2>Funding wallet</h2>
                                        </div>
                                    </div>
                                    <p className={styles.description}>
                                        Your external Web3 wallet connects here for deposits and withdrawals. It is separate from your game wallet.
                                    </p>
                                    {isWeb3Connected && web3Address ? (
                                        <>
                                            <label htmlFor="funding-wallet-address" className={styles.fieldLabel}>
                                                Connected address
                                            </label>
                                            <div className={styles.addressRow}>
                                                <input id="funding-wallet-address" value={web3Address} readOnly className={styles.inputField} />
                                                <button onClick={() => copyToClipboard(web3Address, "Web3 Address")} className={styles.secondaryButton}>
                                                    Copy
                                                </button>
                                            </div>
                                            <button onClick={() => disconnectWeb3()} className={styles.secondaryButton}>
                                                Disconnect funding wallet
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => openWeb3Wallet()} className={styles.secondaryButton}>
                                            Connect Web3 wallet ↗
                                        </button>
                                    )}
                                </section>
                                <section className={styles.safetyNote}>
                                    <span className={styles.eyebrow}>A QUICK REMINDER</span>
                                    <h2>Your keys, your game.</h2>
                                    <p>Your game wallet is saved in this browser. Keep a backup before clearing browser data or moving to another device.</p>
                                </section>
                            </aside>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
};

export default CosmosWalletPage;

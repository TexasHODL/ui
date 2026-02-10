import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateWallet as generateWalletSDK, createWalletFromMnemonic as createWalletSDK, getAddressFromMnemonic } from "@block52/poker-vm-sdk";
import { setCosmosMnemonic, setCosmosAddress, getCosmosMnemonic, getCosmosAddress, clearCosmosData, isValidSeedPhrase } from "../utils/cosmos";
import { colors, hexToRgba } from "../utils/colorConfig";
import { AnimatedBackground } from "./common/AnimatedBackground";

// Seed phrase word grid component
const SeedPhraseGrid = ({ mnemonic, hidden = false }: { mnemonic: string; hidden?: boolean }) => {
    const words = mnemonic.split(" ");
    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {words.map((word, index) => (
                <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm"
                    style={{
                        backgroundColor: hexToRgba(colors.table.bgBase, 0.6),
                        border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
                    }}
                >
                    <span className="text-xs" style={{ color: colors.ui.textSecondary }}>{index + 1}.</span>
                    <span className="text-white">{hidden ? "••••" : word}</span>
                </div>
            ))}
        </div>
    );
};

const CosmosWalletPage = () => {
    const navigate = useNavigate();
    const [mnemonic, setMnemonic] = useState<string>("");
    const [address, setAddress] = useState<string>("");
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

            console.log("🔍 CosmosWalletPage: Loading from localStorage");
            console.log("  - storedMnemonic:", storedMnemonic ? `${storedMnemonic.split(" ").length} words` : "null");
            console.log("  - storedAddress:", storedAddress);

            // If we have a mnemonic but no address, derive and store the address
            if (storedMnemonic && !storedAddress) {
                console.log("🔧 Address missing, deriving from mnemonic...");
                try {
                    storedAddress = await getAddressFromMnemonic(storedMnemonic, "b52");
                    setCosmosAddress(storedAddress);
                    console.log("✅ Address derived and stored:", storedAddress);
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

    // Card style matching Dashboard
    const cardStyle = useMemo(
        () => ({
            backgroundColor: hexToRgba(colors.ui.bgDark, 0.8),
            borderColor: hexToRgba(colors.brand.primary, 0.2),
            boxShadow: `0 10px 40px ${hexToRgba(colors.brand.primary, 0.1)}`
        }),
        []
    );

    // Input style matching Dashboard
    const inputStyle = useMemo(
        () => ({
            backgroundColor: hexToRgba(colors.table.bgBase, 0.6),
            borderColor: hexToRgba(colors.brand.primary, 0.2)
        }),
        []
    );

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
            setMnemonic(newMnemonic);
            setAddress(newAddress);
            setShowMnemonic(true);

            // Update existing wallet state so UI shows "Current Wallet" section
            setExistingMnemonic(newMnemonic);
            setExistingAddress(newAddress);

            console.log("✅ Wallet generated successfully with proper bech32 encoding!");
            console.log("Address:", newAddress);
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
            setMnemonic(importMnemonic);
            setAddress(importedAddress);
            setImportMnemonic("");

            // Update existing wallet state so UI shows "Current Wallet" section
            setExistingMnemonic(importMnemonic);
            setExistingAddress(importedAddress);

            console.log("✅ Wallet imported successfully with proper bech32 encoding!");
            console.log("Address:", importedAddress);
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
            setMnemonic("");
            setAddress("");
            setShowMnemonic(false);
            // Update state to show generate/import UI
            setExistingMnemonic(null);
            setExistingAddress(null);
            console.log("Wallet cleared");
        }
    };

    // Copy to clipboard
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        alert(`${label} copied to clipboard!`);
    };

    // Show loading state while checking localStorage
    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden p-8 pt-24 pb-24">
                <AnimatedBackground />
                <div className="relative z-10 w-full max-w-xl mx-auto text-center">
                    <div className="animate-pulse">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full" style={{ backgroundColor: colors.brand.primary }}></div>
                        <p className="text-white">Loading wallet...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden p-8 pt-24 pb-24">
            {/* Animated background (same as other pages) */}
            <AnimatedBackground />

            {/* Content */}
            <div className="relative z-10 w-full max-w-xl mx-auto mb-6">
                <h1 className="text-3xl font-bold text-white mb-2 text-center">Block52 Wallet Manager</h1>
                <p className="text-center mb-6 text-sm" style={{ color: colors.ui.textSecondary }}>
                    Generate or import a wallet to receive deposits and play poker
                </p>
            </div>

            <div className="relative z-10 w-full max-w-xl mx-auto">
                {/* Existing Wallet Display */}
                {existingAddress && (
                    <div
                        className="backdrop-blur-sm rounded-xl p-5 mb-4 border shadow-lg"
                        style={cardStyle}
                    >
                        <h2 className="text-xl font-bold text-white mb-4">Current Wallet</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm" style={{ color: colors.ui.textSecondary }}>Address</label>
                                <div className="flex gap-2 items-center mt-1">
                                    <input
                                        type="text"
                                        value={existingAddress}
                                        readOnly
                                        className="flex-1 text-white px-4 py-2 rounded-lg border font-mono text-sm"
                                        style={inputStyle}
                                    />
                                    <button
                                        onClick={() => copyToClipboard(existingAddress, "Address")}
                                        className="text-white px-4 py-2 rounded-lg transition-all hover:opacity-80"
                                        style={{ backgroundColor: colors.brand.primary }}
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            {existingMnemonic && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm" style={{ color: colors.ui.textSecondary }}>Seed Phrase</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowMnemonic(!showMnemonic)}
                                                className="text-white px-3 py-1 rounded-lg transition-all hover:opacity-80 text-sm"
                                                style={{ backgroundColor: hexToRgba(colors.ui.bgMedium, 0.8) }}
                                            >
                                                {showMnemonic ? "Hide" : "Show"}
                                            </button>
                                            <button
                                                onClick={() => copyToClipboard(existingMnemonic, "Seed Phrase")}
                                                className="text-white px-3 py-1 rounded-lg transition-all hover:opacity-80 text-sm"
                                                style={{ backgroundColor: colors.brand.primary }}
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                    <SeedPhraseGrid mnemonic={existingMnemonic} hidden={!showMnemonic} />
                                </div>
                            )}

                            <div className="flex flex-col space-y-3 mt-4">
                                <button
                                    onClick={() => navigate("/")}
                                    className="w-full text-white px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-80"
                                    style={{ backgroundColor: colors.brand.primary }}
                                >
                                    Return to Dashboard
                                </button>
                                <button
                                    onClick={handleClearWallet}
                                    className="w-full text-white px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-80"
                                    style={{ backgroundColor: colors.accent.danger }}
                                >
                                    Clear Wallet
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Generate New Wallet */}
                {!existingAddress && (
                    <div
                        className="backdrop-blur-sm rounded-xl p-5 mb-4 border shadow-lg"
                        style={cardStyle}
                    >
                        <h2 className="text-xl font-bold text-white mb-3">Generate New Wallet</h2>
                        <p className="mb-4 text-sm" style={{ color: colors.ui.textSecondary }}>
                            Create a new Block52 wallet with a 24-word seed phrase. This will be saved in your browser.
                        </p>

                        <button
                            onClick={generateWalletHandler}
                            disabled={isGenerating}
                            className="w-full text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-80"
                            style={{ backgroundColor: colors.brand.primary }}
                        >
                            {isGenerating ? "Generating..." : "Generate New Wallet"}
                        </button>

                        {mnemonic && (
                            <div className="mt-6 space-y-4">
                                <div
                                    className="rounded-xl p-4"
                                    style={{
                                        backgroundColor: hexToRgba(colors.accent.warning, 0.1),
                                        border: `1px solid ${hexToRgba(colors.accent.warning, 0.3)}`
                                    }}
                                >
                                    <p className="font-semibold" style={{ color: colors.accent.warning }}>⚠️ Important!</p>
                                    <p className="text-sm mt-2" style={{ color: hexToRgba(colors.accent.warning, 0.8) }}>
                                        Write down your seed phrase and store it safely. This is the only way to recover your wallet.
                                    </p>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm" style={{ color: colors.ui.textSecondary }}>Your Seed Phrase</label>
                                        <button
                                            onClick={() => copyToClipboard(mnemonic, "Seed Phrase")}
                                            className="text-white px-3 py-1 rounded-lg transition-all hover:opacity-80 text-sm"
                                            style={{ backgroundColor: colors.brand.primary }}
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <SeedPhraseGrid mnemonic={mnemonic} />
                                </div>

                                <div>
                                    <label className="text-sm" style={{ color: colors.ui.textSecondary }}>Your Address</label>
                                    <input
                                        type="text"
                                        value={address}
                                        readOnly
                                        className="w-full text-white px-4 py-2 rounded-lg border font-mono text-sm mt-1"
                                        style={inputStyle}
                                    />
                                    <button
                                        onClick={() => copyToClipboard(address, "Address")}
                                        className="mt-2 text-white px-4 py-2 rounded-lg transition-all hover:opacity-80"
                                        style={{ backgroundColor: colors.brand.primary }}
                                    >
                                        Copy Address
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Import Existing Wallet */}
                {!existingAddress && (
                    <div
                        className="backdrop-blur-sm rounded-xl p-5 border shadow-lg"
                        style={cardStyle}
                    >
                        <h2 className="text-xl font-bold text-white mb-3">Import Existing Wallet</h2>
                        <p className="mb-4 text-sm" style={{ color: colors.ui.textSecondary }}>
                            Import an existing wallet using your 12 or 24-word seed phrase.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm" style={{ color: colors.ui.textSecondary }}>Seed Phrase</label>
                                <textarea
                                    value={importMnemonic}
                                    onChange={e => setImportMnemonic(e.target.value)}
                                    placeholder="Enter your seed phrase (12 or 24 words)"
                                    rows={3}
                                    className="w-full text-white px-4 py-3 rounded-lg border font-mono text-sm mt-1 placeholder-gray-500"
                                    style={inputStyle}
                                />
                            </div>

                            <button
                                onClick={handleImportWallet}
                                disabled={isGenerating || !importMnemonic.trim()}
                                className="w-full text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-80"
                                style={{ backgroundColor: colors.brand.primary }}
                            >
                                {isGenerating ? "Importing..." : "Import Wallet"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div
                        className="mt-6 rounded-xl p-4"
                        style={{
                            backgroundColor: hexToRgba(colors.accent.danger, 0.1),
                            border: `1px solid ${hexToRgba(colors.accent.danger, 0.3)}`
                        }}
                    >
                        <p style={{ color: colors.accent.danger }}>{error}</p>
                    </div>
                )}
            </div>

            {/* Powered by Block52 */}
            <div className="fixed bottom-4 left-4 flex items-center z-20 opacity-30">
                <div className="flex flex-col items-start bg-transparent px-3 py-2 rounded-lg backdrop-blur-sm border-0">
                    <div className="text-left mb-1">
                        <span className="text-xs text-white font-medium tracking-wide">POWERED BY</span>
                    </div>
                    <img src="/block52.png" alt="Block52 Logo" className="h-6 w-auto object-contain interaction-none" />
                </div>
            </div>
        </div>
    );
};

export default CosmosWalletPage;

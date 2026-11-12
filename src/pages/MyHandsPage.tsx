import { useEffect } from "react";
import { AnimatedBackground } from "../components/common/AnimatedBackground";
import { ExplorerHeader } from "../components/explorer/ExplorerHeader";
import { MyHandsPanel } from "../components/players/MyHandsPanel";
import { useCosmosWallet } from "../hooks/wallet";

/**
 * Standalone `/hands`. A connected wallet is sent to the profile tab
 * (ProfileSectionRedirect). This page remains for a browser with no wallet.
 */
export default function MyHandsPage() {
    const { address } = useCosmosWallet();

    useEffect(() => {
        document.title = "My Hands - Texas HODL";
        return () => {
            document.title = "Texas HODL";
        };
    }, []);

    return (
        <div className="site-page">
            <AnimatedBackground />

            <div className="site-page-content">
                <ExplorerHeader title="My Hands" />
                <MyHandsPanel address={address} linkProfile />
            </div>
        </div>
    );
}

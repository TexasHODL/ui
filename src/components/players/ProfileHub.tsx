import { FC } from "react";
import { Link } from "react-router-dom";
import { useCosmosWallet } from "../../hooks/wallet/useCosmosWallet";
import { getCosmosAddress } from "../../utils/cosmos/storage";
import { hasElements } from "../../utils/guards";
import { profileHubItems, viewerAddress } from "../../utils/profileHub";
import "../common/PageLayout.css";
import styles from "./ProfileHub.module.css";

interface ProfileHubProps {
    /** Profile in the URL. Undefined when the route has no address. */
    profileAddress: string | undefined;
}

/**
 * My Hands, Wallet and Stats for your own profile. Stats is this page (the
 * cards and Session History below). Another player's profile shows Stats only.
 */
export const ProfileHub: FC<ProfileHubProps> = ({ profileAddress }) => {
    const { address } = useCosmosWallet();
    const items = profileHubItems(viewerAddress(address, getCosmosAddress()), profileAddress);
    if (!hasElements(items)) return null;
    return (
        <nav className={`page-section-tabs ${styles.tabs}`} aria-label="Profile sections">
            {items.map(item => (
                <Link key={item.id} to={item.to} aria-current={item.current ? "page" : undefined}>
                    {item.label}
                </Link>
            ))}
        </nav>
    );
};

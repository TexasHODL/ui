import { FC } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCosmosWallet } from "../../hooks/wallet/useCosmosWallet";
import { getCosmosAddress } from "../../utils/cosmos/storage";
import { hasElements } from "../../utils/guards";
import { PROFILE_TAB_PARAM, profileHubItems, viewerAddress, visibleProfileTab } from "../../utils/profileHub";
import "../common/PageLayout.css";
import styles from "./ProfileHub.module.css";

interface ProfileHubProps {
    /** Profile in the URL. Undefined when the route has no address. */
    profileAddress: string | undefined;
}

/**
 * My Hands, Wallet and Stats for your own profile. Each tab renders on this
 * page. Another player's profile shows Stats only.
 */
export const ProfileHub: FC<ProfileHubProps> = ({ profileAddress }) => {
    const { address } = useCosmosWallet();
    const [searchParams] = useSearchParams();
    const viewer = viewerAddress(address, getCosmosAddress());
    const items = profileHubItems(viewer, profileAddress, visibleProfileTab(viewer, profileAddress, searchParams.get(PROFILE_TAB_PARAM)));
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

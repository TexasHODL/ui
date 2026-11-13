import { FC, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCosmosWallet } from "../../hooks/wallet/useCosmosWallet";
import { getCosmosAddress } from "../../utils/cosmos/storage";
import { hasValue } from "../../utils/guards";
import { standaloneSectionTarget, viewerAddress } from "../../utils/profileHub";

interface ProfileSectionRedirectProps {
    tab: "hands" | "wallet" | "awards";
    children: ReactNode;
}

/**
 * `/hands`, `/wallet` and `/awards` open the matching tab on your profile once
 * a game wallet exists. With no wallet they keep the standalone page. `/wallet`
 * is where a wallet is created.
 */
export const ProfileSectionRedirect: FC<ProfileSectionRedirectProps> = ({ tab, children }) => {
    const { address } = useCosmosWallet();
    const target = standaloneSectionTarget(viewerAddress(address, getCosmosAddress()), tab);
    if (hasValue(target)) return <Navigate to={target} replace />;
    return children;
};

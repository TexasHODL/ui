import { FC } from "react";
import { useProfileAvatar } from "../../context/profile/ProfileAvatarContext";
import { hasContent } from "../../utils/guards";
import { NftAvatarImage } from "../profile/NftAvatarImage";
import styles from "./ProfileHeaderAvatar.module.css";

/**
 * The profile address's NFT, resolved the same way a seat and the win banner
 * resolve it. No registration yet, or an image that fails to load, shows the
 * same "NFT" chip the header avatar button uses.
 */
export const ProfileHeaderAvatar: FC<{ address: string }> = ({ address }) => {
    const { getAvatarForAddress } = useProfileAvatar();
    const avatarUrl = getAvatarForAddress(address);
    if (!hasContent(avatarUrl)) {
        return (
            <span className={styles.fallback} aria-hidden="true">
                NFT
            </span>
        );
    }
    return <NftAvatarImage src={avatarUrl} alt="Player avatar" imgClassName={styles.image} chipClassName={styles.chip} fallbackClassName={styles.fallback} />;
};

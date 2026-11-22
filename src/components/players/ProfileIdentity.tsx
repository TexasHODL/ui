import { FC, useEffect, useState } from "react";
import { hasContent } from "@block52/ui-sdk/helpers";
import { ProfileHeaderAvatar } from "./ProfileHeaderAvatar";
import styles from "./ProfileIdentity.module.css";

interface ProfileIdentityProps {
    /** Full bech32 address. The label may truncate; copy always writes this string. */
    address: string;
}

/** Avatar, address and copy, sized to sit in the page heading instead of its own card. */
export const ProfileIdentity: FC<ProfileIdentityProps> = ({ address }) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const timer = window.setTimeout(() => setCopied(false), 1500);
        return () => window.clearTimeout(timer);
    }, [copied]);

    return (
        <div className={styles.identity} role="group" aria-label="Player">
            <ProfileHeaderAvatar address={address} />
            <span className={styles.address} title={address}>
                {address}
            </span>
            <button
                type="button"
                className={styles.copy}
                onClick={() => {
                    if (!hasContent(address)) return;
                    navigator.clipboard.writeText(address).then(
                        () => setCopied(true),
                        err => console.error("Failed to copy address:", err)
                    );
                }}
            >
                {copied ? "Copied!" : "Copy"}
            </button>
        </div>
    );
};

import React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { FaEllipsisH, FaArrowUp } from "react-icons/fa";
import { NetworkSelector } from "./NetworkSelector";
import { ProfileAvatarButton } from "./profile";
import { viteEnv } from "../utils/viteEnv";
import styles from "./GlobalHeader.module.css";

const bundledLogo = "/texas-hodl-logo.png";

const extraGroups = [
    {
        label: "Explore",
        links: [
            ["/tables", "Tables"],
            ["/players", "Players"],
            ["/explorer", "Block explorer"],
            ["/explorer/distribution", "Hand distribution"]
        ]
    },
    {
        label: "Platform",
        links: [
            ["/nodes", "Network nodes"],
            ["/tech-notes", "Tech notes"]
        ]
    },
    {
        label: "Tools",
        links: [["/admin", "Administration"]]
    }
];

export const GlobalHeader: React.FC = () => {
    const { pathname } = useLocation();
    if (pathname.startsWith("/table/") && pathname !== "/table/admin") return null;
    return (
        <header className={styles.headerShell}>
            <div className={styles.inner}>
                <Link to="/" className={styles.brand} aria-label="Texas HODL lobby">
                    <img
                        src={viteEnv.VITE_CLUB_LOGO || bundledLogo}
                        alt=""
                        onError={({ currentTarget }) => {
                            // A stale external branding URL must not leave the lobby logo broken.
                            // Do not retry if the bundled asset itself fails.
                            if (currentTarget.getAttribute("src") !== bundledLogo) currentTarget.src = bundledLogo;
                        }}
                    />
                    <span>
                        TEXAS <b>HODL</b>
                        <small>POKER. PROVEN FAIR.</small>
                    </span>
                </Link>
                <nav className={styles.primaryNav} aria-label="Main navigation">
                    {[
                        ["/", "Lobby"],
                        ["/hands", "My hands"],
                        ["/wallet", "Wallet"]
                    ].map(([path, label]) => (
                        <NavLink key={path} to={path} end className={({ isActive }) => (isActive ? styles.navItemActive : styles.navItemInactive)}>
                            {label}
                        </NavLink>
                    ))}
                </nav>
                <div className={styles.utilities}>
                    <details className={styles.more} key={pathname}>
                        <summary aria-label="More options">
                            <FaEllipsisH />
                            <span>More</span>
                        </summary>
                        <div className={styles.dropdown}>
                            {extraGroups.map(group => (
                                <div key={group.label} className={styles.menuGroup}>
                                    <p>{group.label.toUpperCase()}</p>
                                    {group.links.map(([path, label]) => (
                                        <Link key={path} to={path} aria-current={pathname === path ? "page" : undefined}>
                                            {label}
                                        </Link>
                                    ))}
                                </div>
                            ))}
                            <a href="https://texashodl.net/" target="_blank" rel="noopener noreferrer">
                                Texas HODL website <FaArrowUp />
                            </a>
                            <div className={styles.network}>
                                <p>CONNECTED NETWORK</p>
                                <NetworkSelector />
                            </div>
                        </div>
                    </details>
                    <ProfileAvatarButton title="Choose your avatar" />
                </div>
            </div>
        </header>
    );
};

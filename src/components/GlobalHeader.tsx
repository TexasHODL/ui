import React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { FaEllipsisH, FaArrowUp } from "react-icons/fa";
import { NetworkSelector } from "./NetworkSelector";
import { ProfileAvatarButton } from "./profile";
import { TEXAS_HODL_LOGO } from "../constants/branding";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./GlobalHeader.module.css";


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
                        src={TEXAS_HODL_LOGO}
                        alt=""
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
                    <ThemeToggle />
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
                                <NetworkSelector embedded />
                            </div>
                        </div>
                    </details>
                    <ProfileAvatarButton title="Choose your avatar" />
                </div>
            </div>
        </header>
    );
};

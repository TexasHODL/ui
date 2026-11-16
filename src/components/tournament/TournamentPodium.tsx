import { FC } from "react";
import { FaTrophy } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useProfileAvatar } from "../../context/profile/ProfileAvatarContext";
import { NftAvatarImage } from "../profile/NftAvatarImage";
import { hasContent } from "../../utils/guards";
import { truncateMiddle } from "../../utils/stringUtils";
import { formatUsdc } from "../../utils/tournamentLobby";
import { ordinalPlace } from "../../utils/tournamentFinish";
import type { TournamentStandingRow } from "../../utils/tournamentTables";
import styles from "./TournamentPodium.module.css";

const PODIUM_ORDER = [2, 1, 3] as const;
const ADDRESS_START = 8;
const ADDRESS_END = 4;

interface TournamentPodiumProps {
    standings: TournamentStandingRow[];
    viewer?: string;
}

/**
 * Top-three finishers of a multi-table tournament: 2nd left, 1st centre and
 * tallest, 3rd right. Each player's registered NFT is shown when one resolves;
 * otherwise the same default "NFT" chip used on the profile and seats.
 */
export const TournamentPodium: FC<TournamentPodiumProps> = ({ standings, viewer }) => {
    const first = standings.find(row => row.place === 1);
    const second = standings.find(row => row.place === 2);
    const third = standings.find(row => row.place === 3);
    if (!first && !second && !third) return null;

    const byPlace: Record<number, TournamentStandingRow | undefined> = { 1: first, 2: second, 3: third };

    return (
        <div className={styles.stage} data-testid="tournament-podium" role="list" aria-label="Podium">
            {PODIUM_ORDER.map(place => {
                const row = byPlace[place];
                return row ? <PodiumSlot key={`${place}-${row.address}`} row={row} viewer={viewer} /> : <div key={place} className={styles.slot} />;
            })}
        </div>
    );
};

const PodiumSlot: FC<{ row: TournamentStandingRow; viewer?: string }> = ({ row, viewer }) => {
    const isFirst = row.place === 1;
    const isViewer = hasContent(viewer) && row.address.toLowerCase() === viewer.toLowerCase();
    const paid = row.payout !== "0";
    const shortAddress = truncateMiddle(row.address, ADDRESS_START, ADDRESS_END);
    const placeLabel = ordinalPlace(row.place);

    return (
        <div
            className={styles.slot}
            role="listitem"
            data-testid={`tournament-podium-place-${row.place}`}
            data-place={row.place}
        >
            <div className={`${styles.card} ${isFirst ? styles.firstCard : styles.sideCard}`}>
                <PodiumAvatar address={row.address} placeLabel={placeLabel} large={isFirst} />
                <Link
                    to={`/players/${row.address}`}
                    className={`${styles.address} ${isViewer ? styles.viewer : ""}`}
                    title={row.address}
                >
                    {shortAddress}
                </Link>
                <span
                    className={`tabular-nums ${paid ? "tournament-balance-enough font-medium" : styles.unpaid}`}
                    data-testid={`tournament-podium-prize-${row.place}`}
                >
                    {paid ? formatUsdc(BigInt(row.payout)) : ""}
                </span>
            </div>
            <div className={`${styles.step} ${isFirst ? styles.firstStep : row.place === 2 ? styles.secondStep : styles.thirdStep}`}>
                <FaTrophy
                    className={`${styles.trophy} ${row.place === 1 ? styles.trophyGold : row.place === 2 ? styles.trophySilver : styles.trophyBronze}`}
                    aria-hidden="true"
                    data-testid={`tournament-podium-trophy-${row.place}`}
                />
                {placeLabel}
            </div>
        </div>
    );
};

const PodiumAvatar: FC<{ address: string; placeLabel: string; large: boolean }> = ({ address, placeLabel, large }) => {
    const { getAvatarForAddress } = useProfileAvatar();
    const avatarUrl = getAvatarForAddress(address);
    const chipClass = `${styles.avatar} ${large ? styles.avatarFirst : styles.avatarSide}`;
    if (!hasContent(avatarUrl)) {
        return (
            <span className={`${chipClass} ${styles.fallback}`} aria-hidden="true" data-testid="tournament-podium-default-avatar">
                NFT
            </span>
        );
    }
    return (
        <NftAvatarImage
            src={avatarUrl}
            alt={`${placeLabel} avatar`}
            imgClassName={styles.avatarImage}
            chipClassName={chipClass}
            fallbackClassName={`${chipClass} ${styles.fallback}`}
        />
    );
};

export default TournamentPodium;

import React from "react";
import { FaShareAlt } from "react-icons/fa";
import { copyToClipboard } from "../../utils/clipboard";
import { displayTableName } from "../../utils/generatedTableName";
import { tournamentShareUrl } from "@block52/poker-ui-core/utils/tableUrl";
import styles from "../TableList.module.css";

export const TOURNAMENT_SHARE_TOAST = "Tournament link copied";

interface ShareTournamentButtonProps {
    tournamentId: string;
    /** Stored custom name when the chain has one; the generated fallback is used otherwise. */
    name?: string | null;
    className?: string;
}

/** Same share-icon / toast pattern as cash and Sit & Go lobby rows, pointing at /tournament/<id>. */
export const ShareTournamentButton: React.FC<ShareTournamentButtonProps> = ({ tournamentId, name, className }) => {
    const displayName = displayTableName(name, tournamentId);
    return (
        <button
            type="button"
            className={className ?? styles.shareButton}
            aria-label={`Share ${displayName}`}
            title="Copy tournament link"
            onClick={() => copyToClipboard(tournamentShareUrl(window.location.origin, tournamentId), TOURNAMENT_SHARE_TOAST)}
        >
            <FaShareAlt aria-hidden="true" />
        </button>
    );
};

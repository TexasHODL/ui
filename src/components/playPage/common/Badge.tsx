import React from "react";
import { usePlayerActionDropBox, PlayerActionDisplay } from "../../../hooks/player/usePlayerActionDropBox";
import { useSeatJoinNotification, SeatJoinNotification } from "../../../hooks/notifications/useSeatJoinNotification";
import { useGameStateContext } from "../../../context/GameStateContext";
import { isTournamentFormat } from "../../../utils/gameFormatUtils";
import { formatForSitAndGo, formatForCashGame, formatUSDCToSimpleDollars } from "../../../utils/numberUtils";
import "./Badge.css";

// Action display component moved into Badge
const ActionDisplay: React.FC<{ actionDisplay: PlayerActionDisplay; playerColor?: string }> = ({ 
    actionDisplay, 
    playerColor = "#3b82f6" 
}) => {
    if (!actionDisplay.isVisible && !actionDisplay.isAnimatingOut) {
        return null;
    }

    return (
        <div
            className={`action-display-container ${
                actionDisplay.isAnimatingOut 
                    ? "action-display-exit" 
                    : "action-display-enter"
            }`}
        >
            {/* Action Box */}
            <div
                className={`action-display-box ${
                    !actionDisplay.isAnimatingOut ? "action-display-pulse" : ""
                }`}
                style={{
                    backgroundColor: `${playerColor}dd`,
                    borderColor: playerColor,
                    boxShadow: `0 4px 12px ${playerColor}40, 0 2px 4px rgba(0,0,0,0.3)`
                }}
            >
                <div className="action-display-content">
                    <span className="action-display-text">
                        {actionDisplay.action}
                    </span>
                    {actionDisplay.amount && (
                        <span className="action-display-amount">
                            {actionDisplay.amount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// Seat join notification display component
const SeatJoinDisplay: React.FC<{ notification: SeatJoinNotification; playerColor?: string }> = ({ 
    notification, 
    playerColor = "#3b82f6" 
}) => {
    if (!notification.isVisible && !notification.isAnimatingOut) {
        return null;
    }

    return (
        <div
            className={`action-display-container ${
                notification.isAnimatingOut 
                    ? "action-display-exit" 
                    : "action-display-enter"
            }`}
        >
            {/* Seat Join Box */}
            <div
                className={`action-display-box ${
                    !notification.isAnimatingOut ? "action-display-pulse" : ""
                }`}
                style={{
                    backgroundColor: `${playerColor}dd`,
                    borderColor: playerColor,
                    boxShadow: `0 4px 12px ${playerColor}40, 0 2px 4px rgba(0,0,0,0.3)`
                }}
            >
                <div className="action-display-content">
                    <span className="action-display-text">
                        YOUR SEAT
                    </span>
                </div>
            </div>
        </div>
    );
};

type BadgeProps = {
    count: number; // The number displayed in the badge
    value: number; // The larger number displayed next to the badge
    color?: string;
    // Timer extension props
    canExtend?: boolean;
    onExtend?: () => void;
    // Sit & Go tournament results
    tournamentPlace?: number;
    tournamentPayout?: string;
};

const Badge: React.FC<BadgeProps> = React.memo(({ count, value, color, canExtend, onExtend, tournamentPlace, tournamentPayout }) => {
    // Get game format to determine if it's a tournament-style game
    const { gameFormat } = useGameStateContext();
    const isTournament = isTournamentFormat(gameFormat);

    // Format the value based on game format using clean utility functions
    const formattedValue = isTournament
        ? formatForSitAndGo(value)  // Returns "10,000" format (tournament chips)
        : formatForCashGame(value);  // Returns "$100.00" format (cash game)

    // Get action display data for this player
    const actionDisplay = usePlayerActionDropBox(count);
    
    // Get seat join notification data for this player
    const seatJoinNotification = useSeatJoinNotification(count);

    // Get place suffix (1st, 2nd, 3rd, 4th)
    const getPlaceSuffix = (place: number) => {
        if (place === 1) return "1st";
        if (place === 2) return "2nd";
        if (place === 3) return "3rd";
        return `${place}th`;
    };

    return (
        <div className="badge-container">
            <div style={{ backgroundColor: color }} className="badge-number">
                {count}
            </div>
            <div className="badge-value">
                {formattedValue}
            </div>

            {/* Tournament Results Display */}
            {tournamentPlace && (
                <div className="badge-tournament-results">
                    <div className="tournament-place" style={{
                        backgroundColor: tournamentPlace === 1 ? "#ffd700" :
                                       tournamentPlace === 2 ? "#c0c0c0" :
                                       tournamentPlace === 3 ? "#cd7f32" :
                                       "#666",
                        color: tournamentPlace <= 3 ? "#000" : "#fff"
                    }}>
                        {getPlaceSuffix(tournamentPlace)} Place
                    </div>
                    {tournamentPayout && tournamentPayout !== "0" && (
                        <div className="tournament-payout" style={{ color: "#4ade80" }}>
                            Won: ${formatUSDCToSimpleDollars(tournamentPayout)}
                        </div>
                    )}
                </div>
            )}

            {/* Player Action Drop Box - positioned below the price */}
            <ActionDisplay 
                actionDisplay={actionDisplay}
                playerColor={color}
            />

            {/* Seat Join Notification - positioned below the price */}
            <SeatJoinDisplay 
                notification={seatJoinNotification}
                playerColor={color}
            />
            
            {/* Timer Extension Icon - Timer icon inside badge */}
            {canExtend && onExtend && (
                <div 
                    className="timer-extension-button"
                    onClick={onExtend}
                >
                    <svg 
                        className="timer-extension-icon" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        {/* Clock circle */}
                        <circle cx="12" cy="12" r="8" strokeWidth="2"/>
                        {/* Clock hands */}
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2"/>
                        {/* Plus symbol in corner */}
                        <circle cx="18" cy="6" r="3" fill="currentColor"/>
                        <path stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 6h2M18 5v2"/>
                    </svg>
                </div>
            )}
        </div>
    );
});

export default Badge;

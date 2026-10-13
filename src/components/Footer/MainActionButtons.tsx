import React from "react";
import { LoadingSpinner } from "../common";
import { TexasHoldemRound, ActionDTO, PlayerStatus } from "@block52/poker-vm-sdk";
import { FoldButton } from "./FoldButton";
import { getRaiseToAmount } from "../../utils/raiseUtils";
import { formatDisplayAmount } from "../../utils/numberUtils";
import type { MainActionButtonsProps } from "./types";
import styles from "./MainActionButtons.module.css";
import { hasFoldedOrMucked } from "../../utils/playerStatus";

export const MainActionButtons: React.FC<MainActionButtonsProps> = ({
    canFold,
    canCheck,
    canCall,
    callAmount,
    canBet,
    canRaise,
    raiseAmount,
    isRaiseAmountInvalid,
    playerStatus,
    loading,
    isMobileLandscape,
    currentRound,
    previousActions,
    userAddress,
    isAllIn,
    isTournament,
    callIsAllIn,
    canAllIn,
    allInAmount,
    onFold,
    onCheck,
    onCall,
    onBetOrRaise,
    onAllIn,
    presentation,
    raiseAccessory
}) => {
    // Calculate the total amount to display for raise button
    // This includes blinds posted during ANTE round when we're in PREFLOP
    const raiseToAmount = canRaise ? getRaiseToAmount(raiseAmount, previousActions, currentRound, userAddress, isTournament) : raiseAmount;
    const sizeClass = presentation
        ? "mobile-action-tap"
        : isMobileLandscape
            ? "px-2 py-0.5 text-[12px]"
            : "px-2 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm";
    const raiseButton = (canRaise || canBet) ? (
        <button
            onClick={onBetOrRaise}
            disabled={loading !== null || (canRaise ? isRaiseAmountInvalid : false)}
            className={`cursor-pointer hover:scale-105 btn-raise rounded-lg w-full border shadow-md backdrop-blur-sm transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 ${sizeClass}`}
        >
            {loading === "raise" || loading === "bet" ? (
                <>
                    <LoadingSpinner size="sm" />
                    {isAllIn ? "JAMMING..." : canRaise ? "RAISING..." : "BETTING..."}
                </>
            ) : (
                <>
                    {canRaise ? "RAISE TO" : "BET"}{" "}
                    <span className={styles.primaryAmount}>{formatDisplayAmount(raiseToAmount, isTournament)}</span>
                </>
            )}
        </button>
    ) : null;
    return (
        <div className={presentation === "portrait" ? "mobile-actions-row" : presentation === "landscape" ? "mobile-actions-stack" : `flex justify-between ${isMobileLandscape ? "gap-0.5" : "gap-1 lg:gap-2"}`}>
            {/* Show fold button if canFold OR if currently folding (to show spinner) */}
            {(canFold || loading === "fold") && (
                <FoldButton
                    loading={loading === "fold"}
                    disabled={loading !== null}
                    isMobileLandscape={isMobileLandscape}
                    className={presentation ? sizeClass : undefined}
                    onClick={onFold}
                />
            )}

            {hasFoldedOrMucked(playerStatus) && (
                <div className="text-gray-400 py-1.5 lg:py-2 px-2 lg:px-4 bg-gray-800 bg-opacity-50 rounded-lg text-xs lg:text-sm">
                    {playerStatus === PlayerStatus.MUCKED ? "You mucked your hand" : "You have folded this hand"}
                </div>
            )}

            {canCheck && (
                <button
                    className={`btn-check cursor-pointer rounded-lg w-full shadow-md backdrop-blur-sm
                    transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 ${sizeClass}`}
                    onClick={onCheck}
                    disabled={loading !== null}
                >
                    {loading === "check" ? (
                        <>
                            <LoadingSpinner size="sm" />
                            CHECKING...
                        </>
                    ) : (
                        "CHECK"
                    )}
                </button>
            )}

            {canCall && (
                <button
                    className={`btn-call cursor-pointer rounded-lg w-full border shadow-md backdrop-blur-sm
                    transition-all duration-200 font-medium transform active:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 ${sizeClass}`}
                    onClick={onCall}
                    disabled={loading !== null}
                >
                    {loading === "call" ? (
                        <>
                            <LoadingSpinner size="sm" />
                            {callIsAllIn ? "JAMMING..." : "CALLING..."}
                        </>
                    ) : (
                        <>
                            {callIsAllIn ? "CALL (ALL-IN)" : "CALL"} <span className={styles.amountAccent}>{callAmount}</span>
                        </>
                    )}
                </button>
            )}

            {raiseButton && raiseAccessory ? <div className="mobile-raise-anchor">{raiseButton}{raiseAccessory}</div> : raiseButton}

            {/* Short shove: the all-in-only RAISE would render a degenerate
                (min===max) slider, so surface a dedicated ALL-IN that dispatches
                that RAISE for the whole stack. Commits immediately — no amount to
                stage. (poker-vm#2353, ui#457) */}
            {canAllIn && (
                <button
                    onClick={onAllIn}
                    disabled={loading !== null}
                    className={`cursor-pointer hover:scale-105 btn-raise rounded-lg w-full border shadow-md backdrop-blur-sm transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 ${sizeClass}`}
                >
                    {loading === "raise" ? (
                        <>
                            <LoadingSpinner size="sm" />
                            JAMMING...
                        </>
                    ) : (
                        <>
                            ALL-IN <span className={styles.primaryAmount}>{allInAmount}</span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

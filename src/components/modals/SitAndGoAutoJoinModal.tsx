import { formatMicroUsd } from "../../utils/moneyDisplay";
import { ModalHeader } from "../common/ModalHeader";
/**
 * AMOUNT HANDLING PATTERN (Cosmos SDK):
 * - Components work with numbers (dollars): e.g., amount = 10 means $10
 * - Hooks convert numbers to USDC microunits: amount * USDC_TO_MICRO
 * - SDK receives microunits as strings: "10000000"
 * - Backend expects USDC microunits (6 decimals), not Wei (18 decimals)
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ethers } from "ethers";
import { useGameOptions } from "../../hooks/game/useGameOptions";
import { useVacantSeatData } from "../../hooks/game/useVacantSeatData";
import { joinTable } from "../../hooks/playerActions/joinTable";
import { formatUSDCToSimpleDollars, formatForSitAndGo } from "../../utils/numberUtils";
import { computeSngEntryBreakdown } from "../../utils/buyInUtils";
import { getCosmosBalance } from "../../utils/cosmosAccountUtils";
import { useNetwork } from "../../context/NetworkContext";
import Modal from "../common/Modal";
import { microToUsdc } from "../../constants/currency";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import { useGameStateContext } from "../../context/GameStateContext";
import { formatTableGameDisplay, getGameTypeMnemonic } from "../../utils/gameFormatUtils";
import { isEmpty, hasValue } from "../../utils/guards";
import { formatStartsAt, scheduledSngPhase, tournamentRegistrationClosed } from "../../utils/scheduledSng";

import type { SitAndGoAutoJoinModalProps } from "./types";

const SitAndGoAutoJoinModal: React.FC<SitAndGoAutoJoinModalProps> = ({ tableId, onJoinSuccess }) => {
    const [accountBalance, setAccountBalance] = useState<string>("0");
    const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(true);
    const [buyInError, setBuyInError] = useState("");
    const [hasJoined, setHasJoined] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const { currentNetwork } = useNetwork();

    // Get game options
    const { gameOptions } = useGameOptions();
    const { emptySeatIndexes, isUserAlreadyPlaying } = useVacantSeatData();

    // Get the game state context to force refresh after joining
    const { subscribeToTable, gameState, gameVariant, gameFormat } = useGameStateContext();
    const registrationClosed = tournamentRegistrationClosed(gameFormat, gameState);

    // Scheduled start (poker-vm#2680): say when it starts, and refuse a seat at
    // a cancelled table (the chain refuses the join too).
    const scheduledPhase = scheduledSngPhase({
        scheduledStartTime: gameOptions?.scheduledStartTime,
        minPlayers: gameOptions?.minPlayers ?? 2,
        registered: gameState?.players?.length ?? 0,
        nowMs: Date.now()
    });
    const isCancelled = scheduledPhase === "cancelled";

    // Get Cosmos address once
    const publicKey = useMemo(() => localStorage.getItem(STORAGE_KEYS.cosmosAddress) || undefined, []);

    // Calculate formatted values
    const { maxBuyInFormatted, balanceFormatted, smallBlindFormatted, bigBlindFormatted, startingStackFormatted, entryFeeFormatted } = useMemo(() => {
        if (!gameOptions) {
            return {
                maxBuyInFormatted: "0",
                balanceFormatted: 0,
                smallBlindFormatted: "0",
                bigBlindFormatted: "0",
                startingStackFormatted: "0",
                entryFeeFormatted: "0.00"
            };
        }

        // Check if we have valid gameOptions first
        if (!gameOptions.maxBuyIn) {
            return {
                maxBuyInFormatted: "0.00",
                balanceFormatted: 0,
                smallBlindFormatted: "0.00",
                bigBlindFormatted: "0.00",
                startingStackFormatted: "0",
                entryFeeFormatted: "0.00"
            };
        }

        // Use actual values from gameOptions (Cosmos USDC microunits - 6 decimals)
        const maxBuyInMicrounits = gameOptions.maxBuyIn;
        // Format USDC microunits to dollars
        const maxFormatted = maxBuyInMicrounits === "1" ? "1.00" : formatUSDCToSimpleDollars(maxBuyInMicrounits);

        // Balance is stored as USDC microunits (6 decimals)
        const balance = accountBalance ? parseFloat(ethers.formatUnits(accountBalance, 6)) : 0;

        // For SNG, blinds are stored as chip counts (not microunits)
        // Format them with commas for display
        const smallBlind = gameOptions.smallBlind
            ? formatForSitAndGo(Number(gameOptions.smallBlind))
            : "0";
        const bigBlind = gameOptions.bigBlind
            ? formatForSitAndGo(Number(gameOptions.bigBlind))
            : "0";

        // Starting stack is in chips - format as whole number with commas
        const startingStack = gameOptions.startingStack
            ? formatForSitAndGo(Number(gameOptions.startingStack))
            : "0";

        // Entry fee is USDC microunits (like the buy-in); "0"/absent = no fee
        const entryFee = gameOptions.entryFee && gameOptions.entryFee !== "0"
            ? formatUSDCToSimpleDollars(gameOptions.entryFee)
            : "0.00";

        return {
            maxBuyInFormatted: maxFormatted,
            balanceFormatted: balance,
            smallBlindFormatted: smallBlind,
            bigBlindFormatted: bigBlind,
            startingStackFormatted: startingStack,
            entryFeeFormatted: entryFee
        };
    }, [gameOptions, accountBalance]);

    // Protocol-fee breakdown (poker-vm#2592). The fee is skimmed OUT OF the
    // buy-in, so the prize-pool portion is buyIn - protocolCut. When no protocol
    // fee is configured (bps absent/0) the breakdown is hidden and behaviour is
    // unchanged. Computed in micro-USDC bigint via the shared, tested util.
    const feeBreakdown = useMemo(() => {
        const buyIn = gameOptions?.maxBuyIn;
        const entryFee = gameOptions?.entryFee;
        // protocolFeeBps is optional and not surfaced by useGameOptions' Required<>
        // mapping — read it from the raw DTO (single source: the chain).
        const protocolFeeBps = gameState?.gameOptions?.protocolFeeBps;
        const breakdown = computeSngEntryBreakdown(buyIn, entryFee, protocolFeeBps);

        return {
            show: breakdown.hasProtocolFee,
            prizePoolPortionFormatted: formatMicroUsd(breakdown.prizePoolPortion),
            protocolCutFormatted: formatMicroUsd(breakdown.protocolCut),
            ownerFeeFormatted: formatMicroUsd(breakdown.ownerFee),
            totalFormatted: formatMicroUsd(breakdown.total)
        };
    }, [gameOptions?.maxBuyIn, gameOptions?.entryFee, gameState?.gameOptions?.protocolFeeBps]);

    // Fetch balance on mount
    useEffect(() => {
        const fetchBalance = async () => {
            try {
                setIsBalanceLoading(true);

                if (!publicKey) {
                    setBuyInError("No Block52 wallet address available");
                    setIsBalanceLoading(false);
                    return;
                }

                const balance = await getCosmosBalance(currentNetwork, "usdc");
                setAccountBalance(balance);
            } catch (err) {
                console.error("Error fetching Cosmos balance:", err);
                setBuyInError("Failed to fetch balance");
            } finally {
                setIsBalanceLoading(false);
            }
        };

        fetchBalance();
    }, [publicKey]);

    // Handle auto-join
    const handleTakeSeat = useCallback(async () => {
        if (registrationClosed || !publicKey || !tableId || isUserAlreadyPlaying || hasJoined) return;

        // Check if there are empty seats
        if (isEmpty(emptySeatIndexes)) {
            setBuyInError("No empty seats available");
            return;
        }

        // Check balance
        const maxBuyInNumber = parseFloat(maxBuyInFormatted);
        if (balanceFormatted < maxBuyInNumber) {
            setBuyInError(`Insufficient balance. Need $${formatMicroUsd(gameOptions?.maxBuyIn ?? 0)}`);
            return;
        }

        setBuyInError("");

        try {
            // Check if we have valid gameOptions
            if (!gameOptions || !gameOptions.maxBuyIn) {
                setBuyInError("Game options not available");
                return;
            }

            setIsJoining(true);

            // Convert the fixed SNG buy-in from USDC microunits to a dollar
            // string — joinTable converts back to microunits internally.
            const buyInAmountInDollars = microToUsdc(gameOptions.maxBuyIn);

            // Route the join through joinTable so it uses the active transport
            // (gateway by default, ui#440). The previous path
            // (useSitAndGoPlayerJoinRandomSeat) submitted chain-direct with
            // seat 0 — invisible to the gateway the UI reads from, and
            // mis-seated by the SNG engine. Claim a concrete empty seat.
            await joinTable(
                tableId,
                {
                    amount: String(buyInAmountInDollars),
                    seatNumber: emptySeatIndexes[0]
                },
                currentNetwork
            );

            // Mark as joined and notify parent
            setHasJoined(true);

            // Store buy-in info in localStorage for the table component
            localStorage.setItem(STORAGE_KEYS.buyInAmount, maxBuyInFormatted);
            localStorage.setItem(STORAGE_KEYS.waitForBigBlind, JSON.stringify(false));

            // Force a re-subscription to get the latest state
            subscribeToTable(tableId);

            // Small delay to allow backend to process and state to update
            setTimeout(() => {
                onJoinSuccess();

                // COMMENTED OUT: Fallback refresh after 3 seconds
                // This was causing unwanted page refreshes even when join was successful
                // setTimeout(() => {
                //     // Check if we have players in the game state
                //     if (!gameState?.players || gameState.players.length === 0) {
                //         window.location.reload();
                //     }
                // }, 3000);
            }, 1500);
        } catch (error) {
            console.error("❌ Failed to join Sit & Go:", error);
            setBuyInError(error instanceof Error ? error.message : "Failed to join table");
        } finally {
            setIsJoining(false);
        }
    }, [registrationClosed, publicKey, tableId, isUserAlreadyPlaying, hasJoined, emptySeatIndexes, maxBuyInFormatted, balanceFormatted, gameOptions, currentNetwork, subscribeToTable, onJoinSuccess]);

    // Don't show modal if user is already playing, has joined, or the tournament has started.
    if (isUserAlreadyPlaying || hasJoined || registrationClosed) {
        return null;
    }

    const playerCountLabel = getGameTypeMnemonic(gameOptions?.maxPlayers);

    return (
        <Modal isOpen={true} onClose={() => {}} closeOnEscape={false} closeOnBackdropClick={false}
            widthClass="w-full max-w-[420px]" className="tournament-entry" ariaLabel="Sit & Go Tournament" customHeader>
            <ModalHeader kicker="Take your seat" title="Sit & Go Tournament" subtitle={`${formatTableGameDisplay(gameVariant, gameOptions?.bettingLimit)} · ${playerCountLabel}`} />

            <dl className="tournament-facts">
                <div><dt>Buy-in</dt><dd>${formatMicroUsd(gameOptions?.maxBuyIn ?? 0)}</dd></div>
                <div><dt>Players joined</dt><dd>{gameOptions ? `${gameOptions.maxPlayers - emptySeatIndexes.length} / ${gameOptions.maxPlayers}` : "0 / 0"}</dd></div>
                <div><dt>Starting blinds</dt><dd>{smallBlindFormatted} / {bigBlindFormatted}</dd></div>
                <div><dt>Starting stack</dt><dd>{startingStackFormatted} chips</dd></div>
            </dl>

            {feeBreakdown.show ? (
                <dl className="tournament-costs" data-testid="sng-fee-breakdown">
                    <div><dt>Buy-in to prize pool</dt><dd>${feeBreakdown.prizePoolPortionFormatted}</dd></div>
                    <div><dt>Protocol fee</dt><dd>${feeBreakdown.protocolCutFormatted}</dd></div>
                    <div><dt>Owner fee</dt><dd>${feeBreakdown.ownerFeeFormatted}</dd></div>
                    <div className="entry-total"><dt>Total to join</dt><dd>${feeBreakdown.totalFormatted}</dd></div>
                </dl>
            ) : entryFeeFormatted !== "0.00" && (
                <dl className="tournament-costs"><div><dt>Entry fee</dt><dd>${formatMicroUsd(gameOptions?.entryFee ?? 0)}</dd></div></dl>
            )}
            <div className="tournament-balance">
                <span>Your balance</span>
                <span className={balanceFormatted >= parseFloat(maxBuyInFormatted) ? "text-green-400" : "text-red-400"}>
                    {isBalanceLoading ? "Loading…" : `$${formatMicroUsd(accountBalance)}`}
                </span>
            </div>
            {isCancelled ? (
                <p className="tournament-error" data-testid="scheduled-cancelled">
                    Cancelled: not enough players registered by the start time.
                </p>
            ) : scheduledPhase !== "unscheduled" && hasValue(gameOptions?.scheduledStartTime) && (
                <p className="tournament-note" data-testid="scheduled-start-info">
                    Starts {formatStartsAt(gameOptions.scheduledStartTime)} with at least {gameOptions.minPlayers} players, or earlier when full
                </p>
            )}
            {buyInError && <p className="tournament-error" role="alert">{buyInError}</p>}
            <button onClick={handleTakeSeat}
                disabled={isCancelled || isJoining || isBalanceLoading || balanceFormatted < parseFloat(maxBuyInFormatted) || isEmpty(emptySeatIndexes)}
                className="hodl-primary">
                {isCancelled ? "Cancelled" : isJoining ? "Joining…" : isBalanceLoading ? "Loading…" : balanceFormatted < parseFloat(maxBuyInFormatted)
                    ? "Insufficient Balance" : isEmpty(emptySeatIndexes) ? "Table Full" : "Take My Seat"}
            </button>
            <p className="tournament-note">
                {scheduledPhase === "unscheduled"
                    ? "Tournament starts when all players are seated."
                    : "Starts when the table is full, or at the start time with at least the minimum."}
                <small>Powered by Block52</small>
            </p>
        </Modal>
    );
};

export default SitAndGoAutoJoinModal;

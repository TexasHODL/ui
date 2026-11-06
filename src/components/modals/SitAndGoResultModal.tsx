import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ModalHeader } from "../common/ModalHeader";
import { formatExactPrizeDollars, formatFlooredPrizeDollars, parsePrizeMicro, prizeMicroIsPositive } from "../../utils/prizeDisplay";
import { PrizeAmount } from "../playPage/PrizeAmount";
import { hasValue } from "../../utils/guards";
import { getFinishingHand, subscribeFinishingHand } from "../../utils/finishingHand";
import { FinishingHandRecap } from "./FinishingHandRecap";
import { useSitAndGoPlayerResults, type PlayerResultData } from "../../hooks/game/useSitAndGoPlayerResults";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import { useSngPayoutStatus, isSngPayoutAlreadyClaimed } from "../../hooks/game/useSngPayoutStatus";

const PLACE_SUFFIX = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
const ordinal = (place: number): string => PLACE_SUFFIX[place - 1] ?? `${place}th`;
const dismissKey = (tableId: string, userAddress: string) =>
    `viewed_sng_result_${tableId}_${userAddress.toLowerCase()}`;

interface SitAndGoResultModalProps {
    tableId: string | undefined;
    /** Resolves only after the SNG prize settlement succeeds. */
    onClaim: () => Promise<void>;
    /** True while a live finish is still shown on the table (ui#874); the modal waits. */
    held: boolean;
}

/** Opens the finishing hand immediately. Collection and navigation are separate:
 * only Collect sends a transaction; spectating simply dismisses the dialog.
 * Mount with a table-specific key so pending/collected state never crosses tables.
 */
export const SitAndGoResultModal: React.FC<SitAndGoResultModalProps> = ({ tableId, onClaim, held }) => {
    const navigate = useNavigate();
    const collecting = useRef(false);
    const { isSitAndGo, getPlayerResult } = useSitAndGoPlayerResults();
    const userAddress = useMemo(
        () => localStorage.getItem(STORAGE_KEYS.cosmosAddress)?.toLowerCase() ?? null,
        [],
    );
    const currentResult = useMemo(() => {
        if (!isSitAndGo || !userAddress) return null;
        return getPlayerResult(userAddress);
    }, [isSitAndGo, getPlayerResult, userAddress]);
    // Settlement can remove the live result. Keep the receipt and navigation
    // available until the user explicitly chooses what to do next.
    const [retainedResult, setRetainedResult] = useState<PlayerResultData | null>(null);
    useEffect(() => {
        if (currentResult) setRetainedResult(currentResult);
    }, [currentResult]);
    const playerResult = currentResult ?? retainedResult;
    const finishingHand = useSyncExternalStore(subscribeFinishingHand,
        () => tableId && userAddress ? getFinishingHand(tableId, userAddress) : null);
    const [dismissed, setDismissed] = useState(() =>
        !!tableId && !!userAddress && localStorage.getItem(dismissKey(tableId, userAddress)) === "true");
    const [prizeClaim, setPrizeClaim] = useState<{ kind: "idle" | "claiming" | "done" | "error"; message?: string }>({ kind: "idle" });
    const payoutStatus = useSngPayoutStatus(tableId, userAddress, isSitAndGo && !!playerResult && prizeMicroIsPositive(playerResult.payout) && !dismissed);

    if (!isSitAndGo || !playerResult || dismissed || held || !tableId || !userAddress) return null;

    const { place, payout, isWinner } = playerResult;
    const isPaid = prizeMicroIsPositive(payout);
    const prizeMicro = parsePrizeMicro(payout);
    const flooredPrize = hasValue(prizeMicro) ? formatFlooredPrizeDollars(prizeMicro) : null;
    const exactPrize = hasValue(prizeMicro) ? formatExactPrizeDollars(prizeMicro) : null;
    const isBusy = prizeClaim.kind === "claiming";
    const collected = prizeClaim.kind === "done" || payoutStatus.status === "claimed";
    const canNavigate = !isPaid || collected;

    const handleDismiss = () => {
        localStorage.setItem(dismissKey(tableId, userAddress), "true");
        setDismissed(true);
    };
    const handleReturnToLobby = () => {
        handleDismiss();
        navigate("/");
    };
    const handleCollect = async () => {
        if (collecting.current || collected || payoutStatus.status !== "unclaimed") return;
        collecting.current = true;
        try {
            setPrizeClaim({ kind: "claiming" });
            // Recheck immediately before signing: another tab may have collected.
            if (!(await payoutStatus.check())) await onClaim();
            setPrizeClaim({ kind: "done" });
        } catch (e) {
            setPrizeClaim(isSngPayoutAlreadyClaimed(e) ? { kind: "done" } : { kind: "error", message: e instanceof Error ? e.message : "Collection failed. Please try again." });
        } finally {
            collecting.current = false;
        }
    };

    const heading = isWinner
        ? "🏆 You won the tournament!"
        : isPaid ? `You finished ${ordinal(place)}!` : `You busted out — finished ${ordinal(place)}.`;

    return createPortal(
        <div className="sng-result-notice sng-result-expanded" data-testid="sng-result-modal" role="dialog" aria-label="Tournament result">
            <div className="hodl-modal sng-result-panel is-expanded" data-min-fit-zoom="0.91">
                <ModalHeader kicker="Tournament" title={<span data-testid="sng-result-heading">{heading}</span>}
                    subtitle={isPaid ? undefined : "Thanks for playing."}
                    onClose={canNavigate ? handleDismiss : undefined} closeLabel="Close tournament result" />
                <FinishingHandRecap hand={finishingHand} viewerAddress={userAddress} />
                {isPaid && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6 text-center">
                        <div className="text-xs text-green-300 font-semibold mb-1">{collected ? "WINNINGS COLLECTED" : "YOUR PAYOUT"}</div>
                        <div className="text-3xl text-white font-bold" data-testid="sng-result-payout"><PrizeAmount micro={payout} /></div>
                    </div>
                )}
                {isPaid && !collected && payoutStatus.status === "checking" && <p role="status" className="finish-recap-note">Checking past payouts…</p>}
                {isPaid && !collected && payoutStatus.status === "error" && <div>
                    <p role="alert" className="finish-recap-note">Couldn’t verify past payouts. Please retry before collecting.</p>
                    <button className="hodl-secondary finish-toggle" onClick={payoutStatus.retry}>Retry payout check</button>
                </div>}
                {prizeClaim.kind === "error" && (
                    <p role="alert" className="text-xs text-red-400 text-center mb-3" data-testid="sng-result-prize-claim-error">{prizeClaim.message}</p>
                )}
                {collected && <p role="status" className="finish-recap-note">Your winnings have been collected.</p>}
                <div className="text-center mt-4"><span className="text-xs text-gray-400">Powered by Block52</span></div>
                {/* Sticky footer: next steps stay visible even when the finishing-hand recap scrolls. */}
                {((isPaid && !collected && payoutStatus.status === "unclaimed") || canNavigate) && (
                <div className="sng-result-actions" data-testid="sng-result-actions">
                    {isPaid && !collected && payoutStatus.status === "unclaimed" && (
                        <button onClick={handleCollect} disabled={isBusy} data-testid="sng-result-claim-winnings-btn"
                            className="hodl-primary w-full py-3 px-4 rounded-lg text-sm font-semibold disabled:cursor-not-allowed"
                            title={exactPrize ? `Exact prize $${exactPrize}` : undefined}
                            aria-label={isBusy ? "Collecting…" : flooredPrize ? `Collect $${flooredPrize}` : "Collect prize"}>
                            {isBusy ? "Collecting…" : flooredPrize ? `Collect $${flooredPrize}` : "Collect prize"}
                        </button>
                    )}
                    {canNavigate && <>
                        <button onClick={handleDismiss} data-testid="sng-result-view-table-btn" className="hodl-secondary rounded-lg text-sm font-semibold">View table</button>
                        <button onClick={handleReturnToLobby} data-testid="sng-result-lobby-btn" className="hodl-primary rounded-lg text-sm font-semibold">Back to lobby</button>
                    </>}
                </div>
                )}
            </div>
        </div>, document.body
    );
};

export default SitAndGoResultModal;

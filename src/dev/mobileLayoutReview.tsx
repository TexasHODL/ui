/** Offline regression fixture: production geometry/CSS/cards/controls, inert actions. */
import "../polyfills";
import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { PlayerStatus, TexasHoldemRound } from "@block52/poker-vm-sdk";
import "../index.css";
import "../components/Footer.css";
import "../components/playPage/Table.css";
import "../components/playPage/common/Badge.css";
import { MobileBettingCluster } from "../components/Footer/MobileBettingCluster";
import { HoleCardFan } from "../components/playPage/Card/HoleCardFan";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTableLayout } from "../hooks/game/useTableLayout";
import { STAGE_DIMS, type TableSize } from "../config/stageGeometry";
import { getCardImageUrl } from "../utils/cardImages";
import { cssVars } from "../utils/cssVars";
import "../theme/light.css";
import "../components/playPage/mobileReadability.css";

const noop = () => {};
const requestedSize = Number(new URLSearchParams(location.search).get("seats"));
const size = ([2, 4, 6, 9].includes(requestedSize) ? requestedSize : 4) as TableSize;
function Review() {
    const stage = useRef<HTMLDivElement>(null);
    const layout = useTableLayout(size, stage);
    const dims = STAGE_DIMS.portrait;
    const [turn, setTurn] = useState(0);
    const [amount, setAmount] = useState(20);
    const actions = {
        canFold: true, canCheck: true, canCall: false, callAmount: "0", canBet: true, canRaise: false,
        raiseAmount: amount, isRaiseAmountInvalid: false, playerStatus: PlayerStatus.ACTIVE, loading: null,
        isMobileLandscape: false, currentRound: TexasHoldemRound.FLOP, previousActions: [], userAddress: "fixture",
        isAllIn: false, isTournament: true, callIsAllIn: false, canAllIn: false, allInAmount: "1480",
        onFold: noop, onCheck: noop, onCall: noop, onBetOrRaise: noop, onAllIn: noop
    };
    const sizing = {
        amount, minAmount: 20, maxAmount: 1480, formattedMaxAmount: "1,480", step: 20, displayOffset: 0,
        totalPotMicro: 60n, callAmountMicro: 0n, isInvalid: false, isMobileLandscape: false, isTournament: true,
        currentRound: TexasHoldemRound.FLOP, previousActions: [], disabled: false, onAmountChange: setAmount,
        onIncrement: () => setAmount(v => Math.min(1480, v + 20)), onDecrement: () => setAmount(v => Math.max(20, v - 20)),
        onAllIn: () => setAmount(1480)
    };
    return <div className="table-container" style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-around" }}>
            <strong>{size} seats</strong><ThemeToggle /><span>$0.00 USDC</span>
        </header>
        <div style={{ height: 22, flexShrink: 0, textAlign: "center", fontSize: 12 }}>L1 10/20 (3:55) · Hand #1 · Next: Seat {turn + 1}</div>
        <button style={{ height: 28, flexShrink: 0, textAlign: "left", fontSize: 12 }} onClick={() => setTurn(t => (t + 1) % size)}>Cycle turn (offline)</button>
        <div className="table-play-row is-portrait">
            <div ref={stage} className="table-stage relative">
                <div data-portrait-readable style={{ position: "absolute", transformOrigin: "0 0", transform: layout.tableTransform, ...cssVars({ "--portrait-unit": `${Math.min(1, layout.containerWidth / 393, layout.containerHeight / 480) / layout.zoom}px` }) }}>
                    <div style={{ position: "absolute", left: dims.originX, top: dims.originY, width: dims.tableWidth, height: dims.tableHeight }}>
                        <div className="table-surface-shadow" style={{ position: "absolute", inset: 0, border: "9px solid #704193", borderRadius: 250, background: "var(--theme-surface, #261830)" }} />
                        <div className="community-board flex flex-col items-center" data-portrait-seats={size}>
                            <div className="community-pots flex flex-col items-center"><div className="pot-display">Total Pot: 60</div></div>
                            <div className="community-card-row flex mt-8">{["9H", "TC", "AH", "2S", "KD"].map(c => <div key={c}><img style={{ width: "100%", height: "100%" }} src={getCardImageUrl(c)} alt={c} /></div>)}</div>
                        </div>
                        {layout.positions.players.map((pos, i) => <div key={i} className="player-seat absolute flex flex-col -translate-x-1/2 -translate-y-1/2" style={{ left: pos.left, top: pos.top }}>
                            <div className="player-cards flex justify-center"><HoleCardFan><img src={getCardImageUrl("4C")} alt="Player card 1" /><img src={getCardImageUrl("QC")} alt="Player card 2" /></HoleCardFan></div>
                            <div className="player-details relative flex flex-col justify-end"><div className="w-full h-[55px]" /><div className="player-badge-position absolute w-full">
                                <div className="badge-container"><div className="badge-number" style={{ background: "#468dce" }}>{i + 1}</div><div className="badge-value">1,480</div>
                                    <div data-banner-mode="timer" className={`seat-banner-shell ${turn === i ? "seat-banner-visible" : "seat-banner-hidden"}`}><div className="seat-banner-box" style={{ background: "#468dce" }}><div className="seat-banner-content-inner"><div className="animate-progress flex items-center mt-auto"><span>19</span><div style={{ width: "70%", height: "100%", background: "white" }} /></div></div></div></div>
                                </div>
                            </div></div>
                        </div>)}
                    </div>
                </div>
            </div>
            <div className="mobile-action-slot"><div className="poker-action-dock mobile-dock-root text-white relative"><div className="mobile-dock-inner"><MobileBettingCluster presentation="portrait" leftHand={false} showSizing actions={actions} sizing={sizing} /></div></div></div>
        </div>
    </div>;
}
createRoot(document.getElementById("fixture")!).render(<Review />);

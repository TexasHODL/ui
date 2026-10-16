/** Offline layout fixture. No wallet, network providers or action submission hooks.
 * Only presentational controls and real stage geometry are mounted. Not a build entry. */
import "../polyfills";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { TexasHoldemRound, PlayerStatus } from "@block52/poker-vm-sdk";
import "../index.css";
import "../components/Footer.css";
import "../components/playPage/Table.css";
import { useTableLayout } from "../hooks/game/useTableLayout";
import { STAGE_DIMS, COMPONENT_SCALE, type TableSize } from "../config/stageGeometry";
import { MobileActionDock } from "../components/playPage/Table/components/MobileActionDock";
import { MainActionButtons } from "../components/Footer/MainActionButtons";
import { RaiseBetControls } from "../components/Footer/RaiseBetControls";
import { MobileBettingCluster } from "../components/Footer/MobileBettingCluster";
import { HoleCardFan } from "../components/playPage/Card/HoleCardFan";
import { getCardImageUrl, getCardBackUrl } from "../utils/cardImages";
import { GameSettingsProvider, useGameSettings } from "../context/GameSettingsContext";
import { TableSettingsSidebar } from "../components/playPage/Table/components/TableSettingsSidebar";

const noop = () => {};
const params = new URLSearchParams(window.location.search);
if (params.get("hand") === "left") localStorage.setItem("setting_lefthand", "true");

function Fixture() {
    const stage = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<TableSize>(6);
    const [active, setActive] = useState(params.get("turn") !== "out");
    const layout = useTableLayout(size, stage);
    const portrait = layout.viewportMode === "mobile-portrait";
    const landscape = layout.viewportMode === "mobile-landscape";
    const { leftHandMode } = useGameSettings();
    const dims = STAGE_DIMS[portrait ? "portrait" : "landscape"];
    const [amount, setAmount] = useState(600);
    useEffect(() => {
        const slot = document.querySelector("[data-testid='mobile-action-slot']");
        if (!(slot instanceof HTMLElement)) return;
        slot.dataset.open = active ? "true" : "false";
        slot.dataset.hasActions = active ? "true" : "false";
    }, [active, portrait, landscape]);
    const mobileActions = {
        canFold: true, canCheck: false, canCall: true, callAmount: "110", canBet: false, canRaise: true, raiseAmount: amount,
        isRaiseAmountInvalid: false, playerStatus: PlayerStatus.ACTIVE, loading: null, isMobileLandscape: landscape,
        currentRound: TexasHoldemRound.FLOP, previousActions: [], userAddress: "fixture", isAllIn: false, isTournament: true,
        callIsAllIn: false, canAllIn: false, allInAmount: "1,330", onFold: noop, onCheck: noop, onCall: noop,
        onBetOrRaise: noop, onAllIn: noop
    };
    const sizing = {
        amount, minAmount: 20, maxAmount: 1330, formattedMaxAmount: "1,330", step: 20, displayOffset: 0, totalPotMicro: 400n,
        callAmountMicro: 0n, isInvalid: false, isMobileLandscape: landscape, isTournament: true, currentRound: TexasHoldemRound.FLOP,
        previousActions: [], disabled: false, onAmountChange: setAmount, onIncrement: () => setAmount(v => Math.min(1330, v + 20)),
        onDecrement: () => setAmount(v => Math.max(20, v - 20)), onAllIn: () => setAmount(1330), maxIsAllIn: true
    };
    return <div className="table-container" data-compact-mobile={portrait || landscape} data-table-theme="modern">
        <header className="table-banner-wrap" style={{ height: 48, flexShrink: 0, padding: 8, background: "#100c17", color: "#fff" }}>
            <span>Offline layout check </span>
            <select aria-label="Seats" value={size} onChange={e => setSize(Number(e.target.value) as TableSize)}>
                {[2, 4, 6, 9].map(n => <option key={n} value={n}>{n} seats</option>)}
            </select>
            <button onClick={() => setActive(v => !v)} style={{ marginLeft: 12 }}>Toggle controls</button>
        </header>
        <div className={["table-play-row", portrait ? "is-portrait" : "", landscape ? "is-landscape" : "", landscape && leftHandMode ? "hand-left" : ""].filter(Boolean).join(" ")}>
        <div ref={stage} className="table-stage relative">
            <div style={{ position: "absolute", top: 0, left: 0, transformOrigin: "0 0", transform: layout.tableTransform }}>
                <div style={{ position: "absolute", left: dims.originX, top: dims.originY, width: dims.tableWidth, height: dims.tableHeight, border: "12px solid #54297a", borderRadius: 500, background: "#24162f" }} />
                {layout.positions.players.map((seat, i) => <div key={i} className="fixture-seat" style={{
                    position: "absolute", left: dims.originX + parseFloat(seat.left), top: dims.originY + parseFloat(seat.top),
                    width: 160, height: 140, transform: `translate(-50%, -50%) scale(${COMPONENT_SCALE})`, textAlign: "center"
                }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <HoleCardFan>
                            <img src={i === 0 ? getCardImageUrl("KC") : getCardBackUrl()} alt="First fixture card" />
                            <img src={i === 0 ? getCardImageUrl("QH") : getCardBackUrl()} alt="Second fixture card" />
                        </HoleCardFan>
                    </div>
                    <div style={{ borderRadius: 20, background: "#100c17", border: "1px solid #ae83ca" }}>Seat {i + 1} · 1,330</div>
                    <div style={{ borderRadius: 5, background: "#7546aa", height: 28 }}>20 · Timer</div>
                </div>)}
            </div>
        </div>
        {(portrait || landscape) && (
            <MobileActionDock mode={portrait ? "overlay" : "column"}>
                <div className={portrait || landscape ? "poker-action-dock mobile-dock-root text-white relative" : ""}>
                    <div className="mobile-dock-inner">
                        {active && (
                            <MobileBettingCluster
                                presentation={portrait ? "portrait" : "landscape"}
                                leftHand={leftHandMode}
                                showSizing
                                actions={mobileActions}
                                sizing={sizing}
                            />
                        )}
                    </div>
                </div>
            </MobileActionDock>
        )}
        </div>
        {!portrait && !landscape && (
            <div className="w-full flex justify-center items-center z-[10] h-[160px] fixed bottom-0 left-0 right-0 bg-black bg-opacity-50 backdrop-blur-sm">
                <div className="w-full flex flex-col justify-center max-w-[700px] gap-2 px-4">
                    <MainActionButtons {...mobileActions} isMobileLandscape={false} />
                    <RaiseBetControls {...sizing} isMobileLandscape={false} />
                </div>
            </div>
        )}
        {params.get("settings") === "1" && <TableSettingsSidebar isOpen tableStyle="modern" onTableStyleChange={noop} onClose={noop} />}
    </div>;
}
createRoot(document.getElementById("fixture")!).render(<GameSettingsProvider><Fixture /></GameSettingsProvider>);

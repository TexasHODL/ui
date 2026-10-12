/** Offline layout fixture. No wallet, network providers or action submission hooks.
 * Only presentational controls and real stage geometry are mounted. Not a build entry. */
import "../polyfills";
import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { TexasHoldemRound, PlayerStatus } from "@block52/poker-vm-sdk";
import "../index.css";
import "../components/playPage/Table.css";
import { useTableLayout } from "../hooks/game/useTableLayout";
import { STAGE_DIMS, COMPONENT_SCALE, type TableSize } from "../config/stageGeometry";
import { MobileActionDock } from "../components/playPage/Table/components/MobileActionDock";
import { MainActionButtons } from "../components/Footer/MainActionButtons";
import { RaiseBetControls } from "../components/Footer/RaiseBetControls";
import { HoleCardFan } from "../components/playPage/Card/HoleCardFan";
import { getCardImageUrl, getCardBackUrl } from "../utils/cardImages";

const noop = () => {};
function Fixture() {
    const stage = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<TableSize>(6);
    const [active, setActive] = useState(true);
    const layout = useTableLayout(size, stage);
    const portrait = layout.viewportMode === "mobile-portrait";
    const dims = STAGE_DIMS[portrait ? "portrait" : "landscape"];
    const [amount, setAmount] = useState(240);
    return <div className="table-container">
        <header style={{ height: 72, flexShrink: 0, padding: 12, background: "#100c17" }}>
            <span>Offline layout check </span>
            <select aria-label="Seats" value={size} onChange={e => setSize(Number(e.target.value) as TableSize)}>
                {[2, 4, 6, 9].map(n => <option key={n} value={n}>{n} seats</option>)}
            </select>
            <button onClick={() => setActive(v => !v)} style={{ marginLeft: 12 }}>Toggle controls</button>
        </header>
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
        <MobileActionDock portrait={portrait}>
            <div className={`poker-action-dock fixed left-0 right-0 text-white flex justify-center items-center relative ${!portrait ? "bottom-0 p-0.5" : "bottom-12 lg:bottom-1 p-2 lg:p-1 pb-4 lg:pb-1"}`}>
                <div className={`flex flex-col w-full justify-center rounded-lg relative z-10 ${!portrait ? "mx-1 space-y-0.5 max-w-full" : "lg:w-[570px] mx-4 lg:mx-0 space-y-2 lg:space-y-3 max-w-full"}`}>
                    {active && <>
                        <MainActionButtons canFold canCheck canCall={false} callAmount="110" canBet canRaise={false} raiseAmount={amount} isRaiseAmountInvalid={false}
                            playerStatus={PlayerStatus.SEATED} loading={null} isMobileLandscape={!portrait} currentRound={TexasHoldemRound.FLOP} previousActions={[]} userAddress="fixture"
                            isAllIn={false} isTournament callIsAllIn={false} canAllIn={false} allInAmount="1330" onFold={noop} onCheck={noop} onCall={noop} onBetOrRaise={noop} onAllIn={noop} />
                        <RaiseBetControls amount={amount} minAmount={20} maxAmount={1330} formattedMaxAmount="1330" step={20} displayOffset={0} totalPotMicro={600n}
                            callAmountMicro={0n} isInvalid={false} isMobileLandscape={!portrait} isTournament currentRound={TexasHoldemRound.FLOP}
                            previousActions={[]} disabled={false} onAmountChange={setAmount} onIncrement={noop} onDecrement={noop} onAllIn={noop} />
                    </>}
                </div>
            </div>
        </MobileActionDock>
    </div>;
}
createRoot(document.getElementById("fixture")!).render(<Fixture />);

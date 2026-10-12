/** Offline visual fixture. No wallets, providers or transaction handlers. */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ModalHeader } from "../components/common/ModalHeader";
import { FinishingHandRecap } from "../components/modals/FinishingHandRecap";
import "../index.css";
import "../components/common/ModalTheme.css";
function Fixture() {
    const [dismissed, setDismissed] = useState(false);
    return <main style={{ minHeight: "100dvh", background: "#08060d", color: "#f2edf7", padding: 12 }}>
        <p style={{ position: "absolute", bottom: 12 }}>Offline preview · No game actions</p>
        <div style={{ position: "absolute", left: "10%", top: "30%", width: "80%", height: "55%", borderRadius: "45%", border: "8px solid #512573", background: "#21152c", display: "grid", placeItems: "center" }}>Table stays visible</div>
        {!dismissed && <div className="sng-result-notice sng-result-expanded"><div className="hodl-modal sng-result-panel is-expanded">
            <ModalHeader kicker="Tournament" title="You busted out — finished 3rd." subtitle="Thanks for playing." onClose={() => setDismissed(true)} closeLabel="Close tournament result" />
            <FinishingHandRecap hand={{ handNumber: 25, board: ["AH", "KD", "7C", "2H", "9S"], players: [
                { seat: 1, cards: ["AS", "AD"], description: "Three of a kind, Aces", won: "600" },
                { seat: 2, cards: ["KS", "KC"], description: "Three of a kind, Kings", won: null },
                { seat: 3, cards: [], description: "Cards not shown", won: null }
            ] }} />
            <button className="hodl-secondary w-full py-3 px-4 mb-3 rounded-lg text-sm font-semibold" onClick={() => setDismissed(true)}>Spectate table</button>
            <button className="hodl-primary w-full py-3 px-4 rounded-lg text-sm font-semibold" onClick={() => setDismissed(true)}>Return to lobby</button>
        </div></div>}
    </main>;
}
createRoot(document.getElementById("fixture")!).render(<Fixture />);

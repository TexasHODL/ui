/** Offline visual fixture: no wallets, providers, network or financial actions. */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ModalHeader } from "../components/common/ModalHeader";
import "../index.css";
import "../components/common/ModalTheme.css";

function Fixture() {
    const [kind, setKind] = useState("sng");
    return <main style={{ minHeight: "100dvh", background: "#08060d", color: "#f2edf7", padding: 12 }}>
        <label>Preview <select aria-label="Modal preview" value={kind} onChange={e => setKind(e.target.value)}>
            <option value="sng">Sit & Go</option><option value="cash">Cash buy-in</option><option value="wallet">Wallet / close control</option>
        </select></label>
        <section role="dialog" aria-label="Offline modal preview" className="hodl-modal tournament-entry" style={{ margin: "20px auto", maxHeight: "calc(100dvh - 80px)" }}>
            <ModalHeader kicker={kind === "wallet" ? "Texas HODL" : "Take your seat"}
                title={kind === "sng" ? "Sit & Go Tournament" : kind === "cash" ? "Cash Game Buy-In" : "Import B52 Wallet Seed Phrase"}
                subtitle={kind === "sng" ? "Texas Hold’em · 4 Players" : undefined}
                onClose={kind === "wallet" ? () => setKind("cash") : undefined} />
            {kind === "sng" ? <>
                <dl className="tournament-facts">{[["Buy-in", "$1.00"], ["Players joined", "0 / 4"], ["Starting blinds", "25 / 50"], ["Starting stack", "1,500 chips"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                <dl className="tournament-costs">{[["Buy-in to prize pool", "$0.90"], ["Protocol fee", "$0.10"], ["Owner fee", "$0.00"], ["Total to join", "$1.00"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            </> : <div style={{ marginBottom: 24 }}><label htmlFor="fixture-amount">{kind === "cash" ? "Buy-In Amount" : "Offline placeholder"}</label><input id="fixture-amount" readOnly value={kind === "cash" ? "2.00" : "No wallet data loaded"} style={{ width: "100%", marginTop: 12, padding: 12 }} /></div>}
            <div className="tournament-balance"><span>Your balance</span><span>$0.00</span></div>
            <button className="hodl-primary" disabled>Insufficient Balance</button>
            <p className="tournament-note">Offline layout preview. No game actions.</p>
        </section>
    </main>;
}
createRoot(document.getElementById("fixture")!).render(<Fixture />);

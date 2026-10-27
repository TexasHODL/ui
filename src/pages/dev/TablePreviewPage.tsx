import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GameFormat, GameVariant } from "@block52/poker-vm-sdk";
import Table from "../../components/playPage/Table";
import { GameActionsProvider } from "../../context/gameState/GameActionsContext";
import { GameDataProvider } from "../../context/gameState/GameDataContext";
import { GameEventsProvider } from "../../context/gameState/GameEventsContext";
import { GameMetaProvider } from "../../context/gameState/GameMetaContext";
import { GameUIProvider } from "../../context/gameState/GameUIContext";
import { IDLE_CONNECTION, type ConnectionState } from "../../context/gameState/connection";
import { PreviewSeatActionsContext } from "../../context/PreviewSeatActionsContext";
import { ShowAllDealerButtonsProvider } from "../../context/ShowAllDealerButtonsContext";
import { ReplayProvider } from "../../context/gameState/ReplayContext";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import { getCosmosAddressSync } from "../../utils/cosmosAccountUtils";
import {
    DEFAULT_WIN_PULSE_TUNING,
    WIN_PULSE_STYLES,
    WinPulseStyleContext,
    type WinPulseTuning
} from "../../components/playPage/Animations/winPulseStyle";
import {
    PREVIEW_BOARD_COUNTS,
    PREVIEW_HERO_ADDRESS,
    PREVIEW_SEAT_ACTIONS,
    PREVIEW_SEAT_COUNTS,
    type PreviewOptions,
    buildPreviewState,
    parsePreviewSearch,
    previewSearchParams
} from "./previewTableState";

const PREVIEW_WALLET_FLAG = "b52_table_preview_wallet";

/** Buttons render only while the socket reads as live. Preview has no socket. */
const PREVIEW_LIVE_CONNECTION: ConnectionState = { status: "live", attempt: 0 };

const subscribeToTable = () => {};
const unsubscribeFromTable = () => {};
const sendAction = async () => {};
const loadHistoricalState = async () => {};
const ackAnimation = () => {};

/**
 * Give the real table a local address so the no-wallet modal does not cover
 * the felt. Removed on leave when this page was the one that wrote it.
 * Runs during render: Table reads the address in its first useState.
 */
const claimPreviewWallet = (): void => {
    if (localStorage.getItem(STORAGE_KEYS.cosmosAddress)) return;
    localStorage.setItem(STORAGE_KEYS.cosmosAddress, PREVIEW_HERO_ADDRESS);
    sessionStorage.setItem(PREVIEW_WALLET_FLAG, "1");
};

const releasePreviewWallet = (): void => {
    if (sessionStorage.getItem(PREVIEW_WALLET_FLAG) !== "1") return;
    if (localStorage.getItem(STORAGE_KEYS.cosmosAddress) === PREVIEW_HERO_ADDRESS) {
        localStorage.removeItem(STORAGE_KEYS.cosmosAddress);
    }
    sessionStorage.removeItem(PREVIEW_WALLET_FLAG);
};

/**
 * Dev-only view of the real table, fed by a local cash snapshot.
 * No WebSocket and no RPC: the providers below replace the live slices for
 * this subtree, and subscribeToTable is a no-op.
 */
const TablePreviewPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const options = useMemo(() => parsePreviewSearch(searchParams), [searchParams]);

    claimPreviewWallet();
    const heroAddress = getCosmosAddressSync() || PREVIEW_HERO_ADDRESS;
    const gameState = useMemo(
        () => buildPreviewState(options, heroAddress),
        [options, heroAddress]
    );

    useLayoutEffect(() => {
        const shell = document.querySelector(".app-shell > header");
        if (shell instanceof HTMLElement) {
            const previous = shell.style.display;
            shell.style.display = "none";
            return () => {
                shell.style.display = previous;
                releasePreviewWallet();
            };
        }
        return releasePreviewWallet;
    }, []);

    const [tuning, setTuning] = useState<WinPulseTuning>(DEFAULT_WIN_PULSE_TUNING);
    const [replay, setReplay] = useState(0);
    const winPulse = useMemo(() => ({ style: options.pulse, tuning, replay }), [options.pulse, tuning, replay]);

    const connection = options.heroTurn ? PREVIEW_LIVE_CONNECTION : IDLE_CONNECTION;

    const update = useCallback((patch: Partial<PreviewOptions>) => {
        const next: PreviewOptions = { ...options, ...patch };
        if (!next.allDealers && next.dealer > next.seats) next.dealer = 1;
        setSearchParams(previewSearchParams(next), { replace: true });
    }, [options, setSearchParams]);

    return (
        <>
            <GameActionsProvider
                subscribeToTable={subscribeToTable}
                unsubscribeFromTable={unsubscribeFromTable}
                sendAction={sendAction}
                loadHistoricalState={loadHistoricalState}
                loadHistoricalStateAtHeight={async () => undefined}
            >
                <GameMetaProvider gameFormat={GameFormat.CASH} gameVariant={GameVariant.TEXAS_HOLDEM} gameName={undefined}>
                    <ReplayProvider isReplayMode={false} replayHandNumber={null} replayActionIndex={null}>
                        <GameUIProvider
                            isLoading={false}
                            error={null}
                            validationError={null}
                            pendingAction={null}
                            connection={connection}
                        >
                            <GameEventsProvider latestItem={null} ackAnimation={ackAnimation}>
                                <GameDataProvider gameState={gameState} isOptimistic={false}>
                                    <PreviewSeatActionsContext.Provider value={options.allActions ? PREVIEW_SEAT_ACTIONS : null}>
                                        <ShowAllDealerButtonsProvider enabled={options.allDealers}>
                                            <WinPulseStyleContext.Provider value={winPulse}>
                                                <Table />
                                            </WinPulseStyleContext.Provider>
                                        </ShowAllDealerButtonsProvider>
                                    </PreviewSeatActionsContext.Provider>
                                </GameDataProvider>
                            </GameEventsProvider>
                        </GameUIProvider>
                    </ReplayProvider>
                </GameMetaProvider>
            </GameActionsProvider>
            <PreviewPanel options={options} onChange={update} />
            <WinPulsePanel options={options} onChange={update} tuning={tuning} onTuning={setTuning} onReplay={() => setReplay(n => n + 1)} />
        </>
    );
};

interface PreviewPanelProps {
    options: PreviewOptions;
    onChange: (patch: Partial<PreviewOptions>) => void;
}

const PreviewPanel = ({ options, onChange }: PreviewPanelProps) => {
    const stepDealer = (delta: number) => {
        if (options.allDealers) {
            onChange({ allDealers: false, dealer: delta > 0 ? 1 : options.seats });
            return;
        }
        let dealer = options.dealer + delta;
        if (dealer < 1) dealer = options.seats;
        if (dealer > options.seats) dealer = 1;
        onChange({ dealer, allDealers: false });
    };

    return (
        <div data-testid="table-preview-panel" style={panelStyle}>
            <span style={labelStyle}>Seats</span>
            {PREVIEW_SEAT_COUNTS.map(count => (
                <button
                    key={count}
                    type="button"
                    aria-pressed={options.seats === count}
                    onClick={() => onChange({ seats: count })}
                    style={buttonStyle(options.seats === count)}
                >
                    {count}
                </button>
            ))}
            <span style={labelStyle}>Dealer</span>
            <button type="button" aria-label="Previous dealer seat" onClick={() => stepDealer(-1)} style={buttonStyle(false)}>
                −
            </button>
            <span style={valueStyle}>{options.allDealers ? "All" : options.dealer}</span>
            <button type="button" aria-label="Next dealer seat" onClick={() => stepDealer(1)} style={buttonStyle(false)}>
                +
            </button>
            <button
                type="button"
                aria-pressed={options.allDealers}
                onClick={() => onChange({ allDealers: !options.allDealers })}
                style={buttonStyle(options.allDealers)}
            >
                All dealers
            </button>
            <button
                type="button"
                aria-pressed={options.allActions}
                onClick={() => onChange({ allActions: !options.allActions })}
                style={buttonStyle(options.allActions)}
            >
                All actions
            </button>
            <button
                type="button"
                aria-pressed={options.heroTurn}
                onClick={() => onChange({ heroTurn: !options.heroTurn })}
                style={buttonStyle(options.heroTurn)}
            >
                Your turn
            </button>
            <button
                type="button"
                aria-pressed={options.holeCards}
                onClick={() => onChange({ holeCards: !options.holeCards })}
                style={buttonStyle(options.holeCards)}
            >
                Hole cards
            </button>
            <button
                type="button"
                aria-pressed={options.holeCount === 4}
                onClick={() => onChange({ holeCards: true, holeCount: options.holeCount === 4 ? 2 : 4 })}
                style={buttonStyle(options.holeCount === 4 && options.holeCards)}
            >
                Omaha
            </button>
            <span style={labelStyle}>Board</span>
            {PREVIEW_BOARD_COUNTS.map(count => (
                <button
                    key={count}
                    type="button"
                    aria-pressed={options.board === count}
                    onClick={() => onChange({ board: count })}
                    style={buttonStyle(options.board === count)}
                >
                    {count}
                </button>
            ))}
        </div>
    );
};

interface WinPulsePanelProps extends PreviewPanelProps {
    tuning: WinPulseTuning;
    onTuning: (tuning: WinPulseTuning) => void;
    /** Restarts the one-shot parts (chipburst, confetti, neon flicker). */
    onReplay: () => void;
}

const TUNING_SLIDERS: { key: keyof WinPulseTuning; label: string; min: number; max: number; step: number }[] = [
    { key: "speed", label: "Speed", min: 0.25, max: 3, step: 0.05 },
    { key: "size", label: "Size", min: 0.5, max: 2, step: 0.05 },
    { key: "intensity", label: "Intensity", min: 0, max: 1.5, step: 0.05 }
];

/** Dev-only: switch the win pulse look and tune it live (CSS variables on WinAnimation). */
const WinPulsePanel = ({ options, onChange, tuning, onTuning, onReplay }: WinPulsePanelProps) => {
    const allSeats = options.seats > 1 && options.winners.length === options.seats;
    const toggleAllSeats = () => onChange({
        winners: allSeats ? [3 <= options.seats ? 3 : 1] : Array.from({ length: options.seats }, (_, i) => i + 1)
    });
    return (
        <div data-testid="win-pulse-panel" style={{ ...panelStyle, top: "auto", bottom: 8, flexDirection: "column", alignItems: "stretch", width: 260 }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ ...labelStyle, marginLeft: 0 }}>Win pulse</span>
                {WIN_PULSE_STYLES.map(style => (
                    <button
                        key={style}
                        type="button"
                        aria-pressed={options.pulse === style}
                        onClick={() => onChange({ pulse: style, winners: options.winners.length ? options.winners : [Math.min(3, options.seats)] })}
                        style={buttonStyle(options.pulse === style)}
                    >
                        {style}
                    </button>
                ))}
            </div>
            {TUNING_SLIDERS.map(({ key, label, min, max, step }) => (
                <label key={key} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ width: 56, opacity: 0.7 }}>{label}</span>
                    <input
                        type="range"
                        aria-label={`Win pulse ${label.toLowerCase()}`}
                        min={min}
                        max={max}
                        step={step}
                        value={tuning[key]}
                        onChange={e => onTuning({ ...tuning, [key]: Number(e.target.value) })}
                        style={{ flex: 1 }}
                    />
                    <span style={{ width: 34, textAlign: "right" }}>{tuning[key].toFixed(2)}x</span>
                </label>
            ))}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button type="button" aria-pressed={allSeats} onClick={toggleAllSeats} style={buttonStyle(allSeats)}>
                    All seats
                </button>
                <button type="button" onClick={() => onTuning(DEFAULT_WIN_PULSE_TUNING)} style={buttonStyle(false)}>
                    Reset sliders
                </button>
                <button type="button" onClick={onReplay} style={buttonStyle(false)}>
                    Replay
                </button>
                <button type="button" aria-pressed={options.winners.length === 0} onClick={() => onChange({ winners: [] })} style={buttonStyle(false)}>
                    Off
                </button>
            </div>
        </div>
    );
};

const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: 8,
    right: 8,
    zIndex: 200,
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
    maxWidth: "min(440px, calc(100vw - 16px))",
    padding: "6px 8px",
    borderRadius: 8,
    background: "rgba(12, 10, 16, 0.9)",
    color: "#f4f0fa",
    font: "12px/1 sans-serif",
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)"
};

const labelStyle: React.CSSProperties = { opacity: 0.7, marginLeft: 4 };

const valueStyle: React.CSSProperties = { minWidth: 12, textAlign: "center" };

const buttonStyle = (active: boolean): React.CSSProperties => ({
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 4,
    padding: "4px 7px",
    background: active ? "rgba(197, 145, 239, 0.85)" : "rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer",
    font: "inherit"
});

export default TablePreviewPage;

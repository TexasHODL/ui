/**
 * Provably fair (ui#972)
 *
 * A shield icon in the table header (desktop, tablet, and both phone
 * orientations, including left-hand mode). It opens the same non-modal panel
 * the floating tab used to: how Block52 deals, and "Verify this hand" for the
 * hand in play (pending until it ends) and the last finished hand.
 *
 * Non-modal: no backdrop, so the table stays clickable. Dismisses on a second
 * press of the shield, a click elsewhere, or Esc. The panel sits below the
 * banner. The verify window takes over from the panel.
 */
import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTableId } from "../../../hooks/game/useTableId";
import { holeCardsPerPlayer } from "@block52/poker-vm-sdk";
import { useGameStateContext } from "../../../context/GameStateContext";
import { DEAL_ORDER_DESCRIPTION, DERIVATION_DESCRIPTION, handPhase, previousHand } from "../../../utils/provablyFair";
import { provablyFairPanelAnchor } from "../../../utils/provablyFairPanelAnchor";
import { hasValue, isNullish } from "../../../utils/guards";
import VerifyHandModal from "./VerifyHandModal";
import { ShieldIcon } from "./ShieldIcon";
import styles from "./ProvablyFairPanel.module.css";

const PANEL_WIDTH = 320;

interface ProvablyFairControls {
    isOpen: boolean;
    toggle: () => void;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
}

const ProvablyFairContext = React.createContext<ProvablyFairControls | null>(null);

export const ProvablyFairButton: React.FC<{ touch?: boolean }> = ({ touch = false }) => {
    const controls = useContext(ProvablyFairContext);
    if (isNullish(controls)) return null;
    const { isOpen, toggle, buttonRef } = controls;
    return (
        <button
            ref={buttonRef}
            type="button"
            onClick={toggle}
            className={`${styles.shieldButton} ${touch ? styles.shieldButtonTouch : ""} ${isOpen ? styles.shieldButtonOpen : ""}`}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-controls="provably-fair-panel"
            aria-label="Provably fair"
            title="Provably fair"
            data-testid="provably-fair-tab"
        >
            <span className={styles.shieldTile}>
                <ShieldIcon className={styles.shieldIcon} />
            </span>
        </button>
    );
};

/** Renders the panel and verify window. The header mounts {@link ProvablyFairButton}. */
const ProvablyFairProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const tableId = useTableId();
    const { gameState, gameVariant, gameName } = useGameStateContext();
    const [isOpen, setIsOpen] = useState(false);
    const [showHow, setShowHow] = useState(false);
    const [verifying, setVerifying] = useState<number | null>(null);
    const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);
    const toggleHow = useCallback(() => setShowHow(prev => !prev), []);
    const closeVerify = useCallback(() => setVerifying(null), []);
    const openVerify = useCallback((hand: number) => {
        setIsOpen(false);
        setVerifying(hand);
    }, []);

    const controls = useMemo<ProvablyFairControls>(() => ({ isOpen, toggle, buttonRef }), [isOpen, toggle]);

    useLayoutEffect(() => {
        if (!isOpen) return;
        const place = () => {
            const button = buttonRef.current?.getBoundingClientRect();
            if (!button) return;
            const banner = document.querySelector(".table-banner-wrap");
            const bannerBottom = banner instanceof HTMLElement ? banner.getBoundingClientRect().bottom : button.bottom;
            const panelWidth = Math.min(PANEL_WIDTH, window.innerWidth - 16);
            const next = provablyFairPanelAnchor(button.right, button.bottom, bannerBottom, window.innerWidth, panelWidth);
            setAnchor(prev => (prev?.top === next.top && prev?.right === next.right ? prev : next));
        };
        place();
        window.addEventListener("resize", place);
        return () => window.removeEventListener("resize", place);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        const handlePointer = (e: MouseEvent) => {
            const target = e.target;
            if (!(target instanceof Node)) return;
            if (panelRef.current?.contains(target)) return;
            if (buttonRef.current?.contains(target)) return;
            close();
        };
        window.addEventListener("keydown", handleKey);
        document.addEventListener("mousedown", handlePointer);
        return () => {
            window.removeEventListener("keydown", handleKey);
            document.removeEventListener("mousedown", handlePointer);
        };
    }, [isOpen, close]);

    const currentHand = gameState?.handNumber;
    const hasCurrentHand = hasValue(currentHand) && currentHand >= 1;
    const currentPhase = hasCurrentHand ? handPhase(gameState, currentHand) : "unknown";
    const lastHand = previousHand(gameState);

    return (
        <ProvablyFairContext.Provider value={controls}>
            {children}
            {isOpen &&
                createPortal(
                    <div
                        ref={panelRef}
                        id="provably-fair-panel"
                        className={styles.panel}
                        style={anchor ? { top: `${anchor.top}px`, right: `${anchor.right}px` } : undefined}
                        role="dialog"
                        aria-label="Provably fair deal"
                        data-testid="provably-fair-panel"
                    >
                        <div className={styles.header}>
                            <ShieldIcon className={styles.headerIcon} />
                            <span>Provably fair deal</span>
                            <button type="button" className={styles.close} onClick={close} aria-label="Close">
                                ×
                            </button>
                        </div>

                        <p className={styles.intro}>
                            Every hand is shuffled from a seed recorded on chain in the transaction that starts it. When the hand ends you can recompute the
                            deck yourself and check every card the table showed.{" "}
                            <button type="button" className={styles.link} onClick={toggleHow} aria-expanded={showHow}>
                                {showHow ? "Hide how it works" : "How it works"}
                            </button>
                        </p>

                        {showHow && (
                            <dl className={styles.how} data-testid="provably-fair-how">
                                <dt>Shuffle</dt>
                                <dd>{DERIVATION_DESCRIPTION}.</dd>
                                <dt>Deal</dt>
                                <dd>{DEAL_ORDER_DESCRIPTION}.</dd>
                                <dt>Check</dt>
                                <dd>
                                    Every validator derives the same deck from the seed, so the board and every hand shown at showdown must sit where the deck
                                    puts them.
                                </dd>
                            </dl>
                        )}

                        {hasCurrentHand && (
                            <section className={styles.section} data-testid="provably-fair-this-hand">
                                <div className={styles.sectionHead}>This hand #{currentHand}</div>
                                <div className={styles.row}>
                                    <span className={styles.rowLabel}>Verification</span>
                                    <span className={currentPhase === "running" ? styles.pending : styles.ready}>
                                        {currentPhase === "running" ? "opens when the hand ends" : "ready"}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className={styles.verifyButton}
                                    onClick={() => openVerify(currentHand)}
                                    data-testid="provably-fair-verify-current"
                                >
                                    <ShieldIcon className={styles.buttonIcon} /> Verify this hand
                                </button>
                            </section>
                        )}

                        {hasValue(lastHand) && (
                            <section className={styles.section} data-testid="provably-fair-last-hand">
                                <div className={styles.sectionHead}>Previous hand #{lastHand}</div>
                                <button
                                    type="button"
                                    className={styles.verifyButton}
                                    onClick={() => openVerify(lastHand)}
                                    data-testid="provably-fair-verify-last"
                                >
                                    <ShieldIcon className={styles.buttonIcon} /> Verify hand #{lastHand}
                                </button>
                            </section>
                        )}
                    </div>,
                    document.body
                )}

            {!isNullish(verifying) && hasValue(tableId) && (
                <VerifyHandModal
                    tableId={tableId}
                    tableName={gameName}
                    handNumber={verifying}
                    phase={handPhase(gameState, verifying)}
                    holeCardsPerPlayer={holeCardsPerPlayer(gameVariant)}
                    onClose={closeVerify}
                />
            )}
        </ProvablyFairContext.Provider>
    );
};

/** Header shield plus the panel. Replay mode skips the provider, so the shield stays hidden. */
export const ProvablyFairFrame: React.FC<{ enabled: boolean; children: React.ReactNode }> = ({ enabled, children }) =>
    enabled ? <ProvablyFairProvider>{children}</ProvablyFairProvider> : <>{children}</>;

/**
 * TableSidebar Component
 *
 * Displays the actions log sidebar that can be toggled open/closed.
 * Shows the history of game actions.
 */

import React, { useEffect, useRef } from "react";
import ActionsLog from "../../../ActionsLog";
import { SettingsPanelShell } from "./SettingsPanelShell";

export interface TableSidebarProps {
    isOpen: boolean;
    compact?: boolean;
    dockHeight?: number;
    onClose?: () => void;
    onOpen?: () => void;
    onExpand?: () => void;
    expandedHistory?: boolean;
}

export const TableSidebar: React.FC<TableSidebarProps> = ({ isOpen, compact = false, dockHeight = 160, onClose, onOpen, onExpand, expandedHistory = false }) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const expandRef = useRef<HTMLButtonElement | null>(null);
    const detailed = compact || expandedHistory;
    useEffect(() => {
        if (!isOpen || !detailed) return;
        const previousFocus = document.activeElement as HTMLElement | null;
        const closeButton = panelRef.current?.querySelector<HTMLButtonElement>("[aria-label=\"Close history\"]");
        closeButton?.focus({ preventScroll: true });
        const dismiss = () => onClose?.();
        const onPointer = (event: PointerEvent) => {
            const target = event.target as HTMLElement;
            // Let banner/menu buttons perform their own toggle without double-firing.
            if (panelRef.current?.contains(target) || target.closest(".table-banner-wrap, .mobile-history-trigger")) return;
            dismiss();
        };
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); dismiss(); } };
        document.addEventListener("pointerdown", onPointer);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointer);
            document.removeEventListener("keydown", onKey);
            if (document.activeElement === closeButton || document.activeElement === document.body) {
                const target = compact ? document.querySelector<HTMLButtonElement>(".mobile-history-trigger") :
                    expandRef.current?.isConnected ? expandRef.current : panelRef.current?.querySelector<HTMLButtonElement>("[aria-label=\"Expand hand history\"]");
                (target?.isConnected ? target : previousFocus?.isConnected ? previousFocus : null)?.focus({ preventScroll: true });
            }
        };
    }, [isOpen, detailed, compact, onClose]);
    // PC History (dock or expanded): the same side panel shell as Settings and Blinds,
    // so it opens and closes like a Settings modal with identical chrome and typography.
    if (!compact && isOpen) {
        return (
            <div ref={panelRef}>
                <SettingsPanelShell id="table-history-panel" isOpen title="History" regionLabel="Hand history" closeLabel="Close history" onClose={onClose}
                    panelAttributes={{ "data-sidebar": "true", "data-expanded": String(expandedHistory) }} contentClassName="settings-history-content">
                    <ActionsLog variant="sidebar" />
                </SettingsPanelShell>
            </div>
        );
    }
    if (compact && !isOpen) {
        return <button className="mobile-history-trigger" aria-label="Open hand history" aria-controls="table-history-panel" aria-expanded={false} onClick={onOpen}>↶ History</button>;
    }
    return (
        <div
            ref={panelRef}
            id="table-history-panel"
            data-expanded={detailed}
            data-summary={!detailed && dockHeight < 112}
            role={isOpen ? "region" : undefined}
            aria-label={isOpen ? "Hand history" : undefined}
            className={`action-log-overlay ${isOpen ? "action-log-open" : "action-log-closed"}`}
        >
            {/* Content is UNMOUNTED while closed. The closed container is width:0 +
                overflow:hidden, which hides the log visually but left its buttons in
                the DOM — focusable, screen-reader reachable, and rendering off-canvas
                past the viewport's right edge on phones. */}
            {isOpen && (
                <div className="table-panel-surface h-full bg-[#0b0b10] border-l border-white/10 flex flex-col overflow-hidden">
                    <ActionsLog summary={!detailed && dockHeight < 112} expanded={detailed}
                        onExpand={() => { expandRef.current = document.activeElement as HTMLButtonElement; (onExpand ?? onOpen)?.(); }}
                        onClose={onClose} />
                </div>
            )}
        </div>
    );
};

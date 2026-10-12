import React, { useEffect, useRef } from "react";
import { ModalHeader } from "../common/ModalHeader";
import { createPortal } from "react-dom";
import { FaCopy, FaLink } from "react-icons/fa";
import { copyToClipboard } from "../../utils/clipboard";
import "../common/TableCreation.css";

export interface TableCreationReceipt { txHash: string; gameId: string | null }

export default function TableCreatedModal({ receipt, onClose }: { receipt: TableCreationReceipt | null; onClose: () => void }) {
    const dialog = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    const txHash = receipt?.txHash;
    useEffect(() => {
        if (!txHash) return;
        const previousFocus = document.activeElement as HTMLElement | null;
        dialog.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeRef.current();
            if (event.key !== "Tab") return;
            const controls = dialog.current?.querySelectorAll<HTMLElement>('button, a[href]');
            if (!controls?.length) return;
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("keydown", onKey); if (previousFocus?.isConnected) previousFocus.focus(); };
    }, [txHash]);
    if (!receipt) return null;
    const tableUrl = receipt.gameId ? `${window.location.origin}/table/${receipt.gameId}` : null;
    const isLocalPreview = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    return createPortal(
        <div className="creation-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
            <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="table-created-title" className="creation-modal table-creation">
                <ModalHeader titleId="table-created-title" title={receipt.gameId ? "Table created successfully!" : "Creation submitted"} />
                <p className="text-sm text-gray-300 mb-5">{receipt.gameId ? "Your table is ready. Open it, then choose a seat and buy-in to play." : "Your transaction was sent, but the table ID is not available yet. Check the transaction before trying to create another table."}</p>
                <div className="creation-preview mb-5">
                    <p className="text-xs text-gray-400 mb-2">Table ID</p>
                    {receipt.gameId && tableUrl ? <>
                        <code className="block text-xs text-purple-300 break-all">{receipt.gameId}</code>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <button className="creation-secondary inline-flex items-center gap-2" onClick={() => copyToClipboard(receipt.gameId!, "Table ID copied!")}><FaCopy aria-hidden="true" />Copy table ID</button>
                            <button className="creation-secondary inline-flex items-center gap-2" onClick={() => copyToClipboard(tableUrl, "Table invite link copied!")}><FaLink aria-hidden="true" />Copy invite link</button>
                        </div>
                        {isLocalPreview && <p className="text-xs text-gray-400 mt-3">Localhost links only work on this computer. Use your shared preview address for team invites.</p>}
                    </> : <p className="text-sm text-gray-300">Waiting for the table ID. You can check the transaction below.</p>}
                </div>
                <div className="flex flex-col gap-3">
                    {receipt.gameId && <a className="creation-primary text-center" href={`/table/${receipt.gameId}`}>Join Table</a>}
                    <a className="creation-secondary text-center" href={`/explorer/tx/${receipt.txHash}`}>View transaction</a>
                    <button className="creation-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>, document.body
    );
}

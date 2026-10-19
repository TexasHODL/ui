import { useEffect, useRef, type ReactNode } from "react";

interface CreationDialogProps {
    titleId: string;
    onClose: () => void;
    /** Hide the dialog without unmounting it, for example while another dialog is in front. */
    hidden?: boolean;
    children: ReactNode;
}

/**
 * The create-table popup. A press starts and ends on the backdrop to close it.
 * A press that starts on a field, including a select, does not.
 */
export function CreationDialog({ titleId, onClose, hidden = false, children }: CreationDialogProps) {
    const backdropDown = useRef(false);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;

    useEffect(() => {
        if (hidden) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeRef.current();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [hidden]);

    return (
        <div
            className="creation-overlay"
            style={hidden ? { display: "none" } : undefined}
            onMouseDown={event => {
                backdropDown.current = event.target === event.currentTarget;
            }}
            onClick={event => {
                if (backdropDown.current && event.target === event.currentTarget) closeRef.current();
                backdropDown.current = false;
            }}
        >
            <div
                className="table-creation creation-modal creation-form"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onMouseDown={event => {
                    event.stopPropagation();
                    backdropDown.current = false;
                }}
            >
                {children}
            </div>
        </div>
    );
}

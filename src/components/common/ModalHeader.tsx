import React from "react";
import { TEXAS_HODL_LOGO } from "../../constants/branding";

interface ModalHeaderProps {
    title?: React.ReactNode;
    titleId?: string;
    kicker?: string;
    subtitle?: React.ReactNode;
    onClose?: () => void;
    closeLabel?: string;
    closeDisabled?: boolean;
}

/** In-flow branding keeps the logo and close control clear of the heading. */
export function ModalHeader({ title, titleId, kicker = "Texas HODL", subtitle, onClose, closeLabel = "Close dialog", closeDisabled = false }: ModalHeaderProps) {
    return (
        <header className="hodl-modal-header">
            <div className="hodl-modal-brand-row">
                <span className="hodl-modal-eyebrow">{kicker}</span>
                <img className="hodl-modal-logo" src={TEXAS_HODL_LOGO} alt="Texas HODL" width="139" height="75" />
                {onClose && <button type="button" className="hodl-modal-dismiss" aria-label={closeLabel} onClick={onClose} disabled={closeDisabled}>×</button>}
            </div>
            {title && <h2 id={titleId} className="hodl-modal-title">{title}</h2>}
            {subtitle && <p className="hodl-modal-subtitle">{subtitle}</p>}
        </header>
    );
}

import React from "react";

export interface SettingsPanelShellProps {
    id: string;
    isOpen: boolean;
    title: string;
    /** Accessible name of the open panel region. */
    regionLabel: string;
    closeLabel: string;
    onClose?: () => void;
    children: React.ReactNode;
    /** Extra data-* attributes on the outer panel (e.g. data-sidebar for History). */
    panelAttributes?: Record<string, string>;
    /** Extra classes for the content area (e.g. a scrolling flex column). */
    contentClassName?: string;
}

/**
 * The PC side panel chrome shared by Settings and Blinds: same position, size,
 * surface, header, close button and content padding (styles in Table.css,
 * keyed on the panel ids).
 *
 * Content is UNMOUNTED while closed. The closed container is width:0 +
 * overflow:hidden, which hid the panel visually but left its controls in the
 * On PC the panel is capped to the viewport (Table.css): the header stays put and
 * the content area scrolls.
 *
 * DOM — focusable, screen-reader reachable, and rendering off-canvas.
 */
export const SettingsPanelShell: React.FC<SettingsPanelShellProps> = ({ id, isOpen, title, regionLabel, closeLabel, onClose, children, panelAttributes, contentClassName }) => (
    <div
        id={id}
        {...panelAttributes}
        role={isOpen ? "region" : undefined}
        aria-label={isOpen ? regionLabel : undefined}
        className={`action-log-overlay ${isOpen ? "action-log-open settings-panel-width" : "action-log-closed"}`}
    >
        {isOpen && (
            <div className="table-panel-surface table-settings-body h-full flex flex-col overflow-hidden">
                <div className="settings-heading">
                    <span className="text-white font-semibold text-sm">{title}</span>
                    {onClose && (
                        <button onClick={onClose} aria-label={closeLabel} className="w-9 h-9 rounded-lg text-gray-300 hover:bg-white/10">
                            ✕
                        </button>
                    )}
                </div>
                <div className={contentClassName ? `settings-content settings-shell-content ${contentClassName}` : "settings-content settings-shell-content"}>{children}</div>
            </div>
        )}
    </div>
);

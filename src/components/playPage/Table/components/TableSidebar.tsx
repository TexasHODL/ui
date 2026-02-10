/**
 * TableSidebar Component
 *
 * Displays the actions log sidebar that can be toggled open/closed.
 * Shows the history of game actions.
 */

import React from "react";
import ActionsLog from "../../../ActionsLog";

export interface TableSidebarProps {
    isOpen: boolean;
}

export const TableSidebar: React.FC<TableSidebarProps> = ({ isOpen }) => {
    return (
        <div className={`action-log-overlay ${isOpen ? "action-log-open" : "action-log-closed"}`}>
            <ActionsLog />
        </div>
    );
};

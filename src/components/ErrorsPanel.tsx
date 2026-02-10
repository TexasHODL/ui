import React, { useState } from "react";
import { MdBugReport } from "react-icons/md";
import { ErrorLog } from "../types/index";

interface ErrorsPanelProps {
    errors: ErrorLog[];
    onClear?: () => void;
}

const ErrorsPanel: React.FC<ErrorsPanelProps> = ({ errors = [], onClear }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "error":
                return "text-red-400";
            case "warning":
                return "text-yellow-400";
            case "info":
                return "text-green-400";
            default:
                return "text-white";
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString();
    };

    // Filter to only show API-related messages (poker actions)
    const actionErrors = errors.filter(err => err.source === "API");

    return (
        <div className={`text-white rounded w-full h-full overflow-y-auto scrollbar-hide bg-black/30 backdrop-blur-sm ${isCollapsed ? "h-[40px]" : ""}`}>
            <div className="flex justify-between items-center p-2 border-b border-white/20">
                <div className="flex items-center whitespace-nowrap">
                    <MdBugReport size={16} className="text-red-400 mr-2" />
                    <h4 className="text-xs font-semibold">Blockchain Debug Mode</h4>
                    <span className="ml-2 text-xs bg-red-500/30 text-white px-1.5 rounded-full">{actionErrors.length}</span>
                </div>
                <div className="flex items-center">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-white/70 hover:text-white/90 transition-all mr-2"
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        {isCollapsed ? "+" : "-"}
                    </button>
                    {!isCollapsed && onClear && (
                        <button onClick={onClear} className="text-white/70 hover:text-white/90 transition-all" title="Clear log">
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {!isCollapsed && (
                <>
                    {actionErrors.length > 0 ? (
                        <div className="space-y-0.5 p-2">
                            {actionErrors.map(error => (
                                <div key={error.id} className="text-xs py-1 border-b border-white/10">
                                    <div className="flex justify-between">
                                        <span className={`font-medium ${getSeverityColor(error.severity)}`}>
                                            {error.severity === "error" ? "FAILED" : error.severity === "info" ? "SUCCESS" : "WARNING"}
                                        </span>
                                        <span className="text-gray-400 text-[10px]">{formatTime(error.timestamp)}</span>
                                    </div>
                                    <div className="mt-0.5">
                                        <span className="text-gray-200 break-all">{error.message}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-xs p-3">No errors recorded yet.</p>
                    )}
                </>
            )}
        </div>
    );
};

export default ErrorsPanel;

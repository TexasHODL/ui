import React, { useMemo } from "react";
import { colors, hexToRgba } from "../../utils/colorConfig";

interface CosmosStatusProps {
    className?: string;
    isMainnet?: boolean;
}

const CosmosStatus: React.FC<CosmosStatusProps> = ({ className = "", isMainnet = false }) => {
    const containerStyle = useMemo(
        () => ({
            backgroundColor: hexToRgba(colors.ui.bgDark, 0.6),
            border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
        }),
        []
    );

    const dotStyle = useMemo(() => (!isMainnet ? { backgroundColor: colors.brand.primary } : {}), [isMainnet]);

    return (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${className}`} style={containerStyle}>
            <div className={`w-2 h-2 rounded-full ${isMainnet ? "bg-green-500" : ""}`} style={dotStyle}></div>
            <span className="text-gray-300">Block52 Chain</span>
        </div>
    );
};

export default CosmosStatus;

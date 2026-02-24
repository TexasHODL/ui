import React from "react";
import styles from "./CosmosStatus.module.css";

interface CosmosStatusProps {
    className?: string;
    isMainnet?: boolean;
}

const CosmosStatus: React.FC<CosmosStatusProps> = ({ className = "", isMainnet = false }) => {
    return (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${styles.container} ${className}`}>
            <div className={`w-2 h-2 rounded-full ${isMainnet ? "bg-green-500" : styles.dot}`}></div>
            <span className="text-gray-300">Block52 Chain</span>
        </div>
    );
};

export default CosmosStatus;

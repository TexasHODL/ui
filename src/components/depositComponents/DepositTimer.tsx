import React from "react";
import styles from "./DepositComponents.module.css";

interface DepositTimerProps {
    timeLeft: number;
}

/**
 * Format seconds into MM:SS format
 */
const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Displays countdown timer for deposit session
 */
export const DepositTimer: React.FC<DepositTimerProps> = ({ timeLeft }) => {
    return (
        <div className="text-center mb-4">
            <div className={`text-xl font-bold ${styles.titleText}`}>
                Time Remaining: {formatTime(timeLeft)}
            </div>
            <div className={`text-sm ${styles.secondaryTextStrong}`}>
                Session will expire in {Math.floor(timeLeft / 60)} minutes and {timeLeft % 60} seconds
            </div>
            <div className={`mt-2 p-2 backdrop-blur-sm rounded-lg ${styles.warningPanel}`}>
                <div className={`flex items-center ${styles.warningText}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span className="font-semibold">Do not close this page while waiting for deposit</span>
                </div>
            </div>
        </div>
    );
};

export default DepositTimer;

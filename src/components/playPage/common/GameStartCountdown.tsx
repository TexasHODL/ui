import { ModalHeader } from "../../common/ModalHeader";
import React, { useState, useEffect, useCallback } from "react";

interface GameStartCountdownProps {
    gameStartTime: string; // ISO string or date string in Brisbane time
    onCountdownComplete: () => void;
    onSkip?: () => void; // Optional skip function for testing
}

const GameStartCountdown: React.FC<GameStartCountdownProps> = ({ gameStartTime, onCountdownComplete, onSkip: _onSkip }) => {
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
        total: number;
    }>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

    const [isVisible, setIsVisible] = useState(false);

    const calculateTimeLeft = useCallback(() => {
        try {
            // Parse the game start time (assume it's in Brisbane time)
            const gameDate = new Date(gameStartTime);

            // Convert to Brisbane time (UTC+10, or UTC+11 during daylight saving)
            // For simplicity, we'll use UTC+10. In production, you'd want proper timezone handling
            const now = new Date();
            const brisbaneOffset = 10 * 60; // Brisbane is UTC+10
            const localOffset = now.getTimezoneOffset();
            const brisbaneTime = new Date(now.getTime() + (brisbaneOffset + localOffset) * 60000);

            const difference = gameDate.getTime() - brisbaneTime.getTime();

            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);

                return { days, hours, minutes, seconds, total: difference };
            }

            return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
        } catch (error) {
            console.error("Error calculating time left:", error);
            return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
        }
    }, [gameStartTime]);

    useEffect(() => {
        const updateCountdown = () => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);

            if (newTimeLeft.total <= 0) {
                setIsVisible(false);
                onCountdownComplete();
            } else {
                setIsVisible(true);
            }
        };

        // Initial calculation
        updateCountdown();

        // Set up interval to update every second
        const timer = setInterval(updateCountdown, 1000);

        return () => clearInterval(timer);
    }, [calculateTimeLeft, onCountdownComplete]);

    // Don't render if countdown is complete
    if (!isVisible) {
        return null;
    }

    const formatTime = (value: number) => value.toString().padStart(2, "0");

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="hodl-modal p-6 w-96 relative">

                <div className="relative z-10">
                    <ModalHeader kicker="Tournament" title="Game Starting Soon" subtitle="Please wait for the scheduled game to begin" />

                    {/* Countdown Display */}
                    <div className="grid grid-cols-4 gap-3 mb-6">
                        <div className="text-center">
                            <div className="bg-gray-700/80 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30">
                                <div className="text-2xl font-bold text-white">{formatTime(timeLeft.days)}</div>
                                <div className="text-xs text-gray-400">DAYS</div>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="bg-gray-700/80 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30">
                                <div className="text-2xl font-bold text-white">{formatTime(timeLeft.hours)}</div>
                                <div className="text-xs text-gray-400">HOURS</div>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="bg-gray-700/80 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30">
                                <div className="text-2xl font-bold text-white">{formatTime(timeLeft.minutes)}</div>
                                <div className="text-xs text-gray-400">MINS</div>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="bg-gray-700/80 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30">
                                <div className="text-2xl font-bold text-white animate-pulse">{formatTime(timeLeft.seconds)}</div>
                                <div className="text-xs text-gray-400">SECS</div>
                            </div>
                        </div>
                    </div>

                    {/* Game Start Time Display */}
                    <div className="mb-6 p-3 bg-gray-700/80 backdrop-blur-sm rounded-lg border border-blue-500/30">
                        <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">GAME STARTS AT (BRISBANE TIME)</div>
                            <div className="text-white font-mono text-sm">
                                {new Date(gameStartTime).toLocaleString("en-AU", {
                                    timeZone: "Australia/Brisbane",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit"
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Alpha Testing Message */}
                    <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                        <div className="text-center">
                            <div className="text-xs text-blue-300 font-semibold mb-1">ALPHA TESTING</div>
                            <div className="text-xs text-gray-300">This timer helps coordinate testers to begin together while we iron out bugs</div>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-400">Scheduled Tournament Start</p>
                        <div className="flex items-center justify-center gap-1 mt-2">
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                            <span className="text-xs text-gray-400">Powered by Block52</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameStartCountdown;

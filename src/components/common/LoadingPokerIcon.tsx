import React from "react";

type LoadingPokerIconProps = {
    size?: number;
    color?: string;
};

const LoadingPokerIcon: React.FC<LoadingPokerIconProps> = ({ size = 60, color = "#64ffda" }) => {
    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative" style={{ width: size, height: size }}>
                {/* Spinning outer circle */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
                    <svg width={size} height={size} viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="2" strokeDasharray="10 5" opacity="0.7" />
                    </svg>
                </div>

                {/* Poker suits animation */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-2/3 h-2/3">
                        {/* Spade */}
                        <div className="absolute inset-0 flex items-center justify-center animate-fadeInOut" style={{ animationDelay: "0s" }}>
                            <span className="text-3xl" style={{ fontSize: size / 3 }}>
                                ♠️
                            </span>
                        </div>
                        {/* Heart */}
                        <div className="absolute inset-0 flex items-center justify-center animate-fadeInOut opacity-0" style={{ animationDelay: "0.75s" }}>
                            <span className="text-3xl" style={{ fontSize: size / 3 }}>
                                ♥️
                            </span>
                        </div>
                        {/* Diamond */}
                        <div className="absolute inset-0 flex items-center justify-center animate-fadeInOut opacity-0" style={{ animationDelay: "1.5s" }}>
                            <span className="text-3xl" style={{ fontSize: size / 3 }}>
                                ♦️
                            </span>
                        </div>
                        {/* Club */}
                        <div className="absolute inset-0 flex items-center justify-center animate-fadeInOut opacity-0" style={{ animationDelay: "2.25s" }}>
                            <span className="text-3xl" style={{ fontSize: size / 3 }}>
                                ♣️
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <p className="mt-3 text-white font-medium animate-pulse">Buying in...</p>

            {/* Add the keyframe animation */}
            <style>{`
        @keyframes fadeInOut {
          0%, 20% { opacity: 1; transform: scale(1); }
          40% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 0; transform: scale(0.8); }
        }
        .animate-fadeInOut {
          animation: fadeInOut 3s infinite;
        }
      `}</style>
        </div>
    );
};

export default LoadingPokerIcon;

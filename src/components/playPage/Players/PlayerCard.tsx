/**
 * PlayerPopUpCard Component
 * 
 * This component represents a popup menu that appears when clicking on a player position.
 * It serves as an interactive menu for player-related actions and information.
 * 
 * Current Features:
 * - Seat number display
 * - Action button (Join/Change Seat)
 * - Note-taking capability (placeholder)
 * - Player rating system (placeholder)
 * 
 * Future Features:
 * - Save and load player notes
 * - Track player statistics
 * - Quick seat changing
 * - Player history view
 * 
 * Props:
 * - id: Seat number
 * - label: Action button text (e.g., "SIT HERE", "CHANGE SEAT")
 * - color: Player's color theme
 * - onClose: Function to close the popup
 * - setStartIndex: Function to change table rotation
 */

import { useState } from "react";
import type { PlayerCardProps } from "../../../types/index";

const PlayerPopUpCard: React.FC<PlayerCardProps> = ({ id, label, color, onClose, setStartIndex }) => {
    const [note, setNote] = useState("");

    const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNote(e.target.value);
    };

    return (
        <div className="absolute w-64 h-56 ml-[-72px] mt-[45px] rounded-2xl shadow-lg bg-[#c0d6d9] flex flex-col items-center px-1 py-1 z-[15]">
            {/* Header Section */}
            <div className="flex justify-between items-center w-full mb-2">
                <div style={{ backgroundColor: color }} className={"flex items-center justify-center w-7 h-7 text-white text-sm font-bold rounded-full"}>
                    {id}
                </div>
                <button onClick={onClose} className="text-xl text-gray-700 hover:text-red-500 transition mr-2">
                    ✕
                </button>
            </div>
            <div className="px-2 w-64">
                {/* Action Button */}
                <div
                    className="font-bold text-lg text-black bg-white py-1 w-full mb-4 rounded-2xl cursor-pointer"
                    onClick={() => {
                        setStartIndex(id - 1);
                        onClose();
                    }}
                >
                    {label}
                </div>

                {/* Note Input - Placeholder for future implementation */}
                <input
                    type="text"
                    placeholder="Enter note"
                    value={note}
                    onChange={handleNoteChange}
                    className="w-full h-[70px] mb-4 text-gray-700 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-400 p-4"
                />

                {/* Rating Icons - Placeholder for future implementation */}
                <div className="flex justify-around w-full">
                    <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-xl cursor-pointer hover:opacity-75 transition">
                        🔥
                    </div>
                    <div className="w-8 h-8 rounded-full bg-orange-400 text-white flex items-center justify-center text-xl cursor-pointer hover:opacity-75 transition">
                        🍂
                    </div>
                    <div className="w-8 h-8 rounded-full bg-yellow-400 text-white flex items-center justify-center text-xl cursor-pointer hover:opacity-75 transition">
                        🌟
                    </div>
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-xl cursor-pointer hover:opacity-75 transition">
                        🐟
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl cursor-pointer hover:opacity-75 transition">
                        ⛰️
                    </div>
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-xl cursor-pointer hover:opacity-75 transition">
                        🛡️
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerPopUpCard;

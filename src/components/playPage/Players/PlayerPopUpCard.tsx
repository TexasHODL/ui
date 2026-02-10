/**
 * PlayerPopUpCard Component
 * 
 * This component represents a popup menu that appears when clicking on a player position.
 * It has two distinct modes:
 * 
 * 1. Vacant Seat Mode (isVacant = true):
 *    - Shows "CHANGE SEAT" button for existing players
 *    - Used in VacantPlayer component
 *    - Triggers join confirmation modal when clicked
 * 
 * 2. Occupied Seat Mode (isVacant = false):
 *    - Shows "SIT HERE" button for seat changing
 *    - Used in OppositePlayer component
 *    - Triggers table rotation when clicked
 * 
 * Props:
 * - id: Seat number
 * - label: Action button text ("CHANGE SEAT" or "SIT HERE")
 * - color: Player's color theme
 * - isVacant: Whether this is a vacant seat
 * - onClose: Function to close the popup
 * - setStartIndex: Function to change table rotation or trigger join modal
 */

import { memo, useState, useMemo, useCallback } from "react";
import type { PlayerCardProps } from "../../../types/index";

const PlayerPopUpCard: React.FC<PlayerCardProps> = memo(({ 
    id, 
    label, 
    color, 
    isVacant = false, 
    onClose, 
    setStartIndex 
}) => {
    const [note, setNote] = useState("");

    // Memoize note change handler
    const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setNote(e.target.value);
    }, []);

    // Memoize action button click handler
    const handleActionClick = useCallback(() => {
        setStartIndex(id - 1);
        onClose();
    }, [setStartIndex, id, onClose]);

    // Memoize container styles
    const containerStyle = useMemo(() => ({
        backgroundColor: color
    }), [color]);

    // Memoize rating icons
    const ratingIcons = useMemo(() => [
        { emoji: "🔥", bgColor: "bg-red-500" },
        { emoji: "🍂", bgColor: "bg-orange-400" },
        { emoji: "🌟", bgColor: "bg-yellow-400" },
        { emoji: "🐟", bgColor: "bg-green-500" },
        { emoji: "⛰️", bgColor: "bg-blue-500" },
        { emoji: "🛡️", bgColor: "bg-purple-500" }
    ], []);

    return (
        <div className="absolute w-64 h-56 ml-[-72px] mt-[45px] rounded-2xl shadow-lg bg-[#c0d6d9] flex flex-col items-center px-1 py-1 z-[15]">
            {/* Header Section */}
            <div className="flex justify-between items-center w-full mb-2">
                <div 
                    style={containerStyle} 
                    className="flex items-center justify-center w-7 h-7 text-white text-sm font-bold rounded-full"
                >
                    {id}
                </div>
                <button 
                    onClick={onClose} 
                    className="text-xl text-gray-700 hover:text-red-500 transition mr-2"
                >
                    ✕
                </button>
            </div>
            <div className="px-2 w-64">
                {/* Action Button - Only show for vacant seats */}
                {isVacant && (
                    <div
                        className="font-bold text-lg text-black bg-white py-1 w-full mb-4 rounded-2xl cursor-pointer"
                        onClick={handleActionClick}
                    >
                        {label}
                    </div>
                )}

                {/* Note Input - Only show for occupied seats */}
                {!isVacant && (
                    <input
                        type="text"
                        placeholder="Add note about player..."
                        value={note}
                        onChange={handleNoteChange}
                        className="w-full h-[70px] mb-4 text-gray-700 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-400 p-4"
                    />
                )}

                {/* Rating Icons - Only show for occupied seats */}
                {!isVacant && (
                    <div className="flex justify-around w-full">
                        {ratingIcons.map((icon, index) => (
                            <div
                                key={index}
                                className={`w-8 h-8 rounded-full ${icon.bgColor} text-white flex items-center justify-center text-xl cursor-pointer hover:opacity-75 transition`}
                            >
                                {icon.emoji}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for memo
    return (
        prevProps.id === nextProps.id &&
        prevProps.label === nextProps.label &&
        prevProps.color === nextProps.color &&
        prevProps.isVacant === nextProps.isVacant
    );
});

PlayerPopUpCard.displayName = "PlayerPopUpCard";

export default PlayerPopUpCard;

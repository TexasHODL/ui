import React from "react";
import { useCardsForHandStrength } from "../../hooks/player/useCardsForHandStrength";
import { usePlayerSeatInfo } from "../../hooks/player/usePlayerSeatInfo";

const LiveHandStrengthDisplay: React.FC = () => {
  const { currentUserSeat } = usePlayerSeatInfo();
  const handStrength = useCardsForHandStrength(currentUserSeat);

  if (!handStrength) {
    return null;
  }

  return (
    <div className="fixed bottom-[220px] right-4 bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-blue-500/20 shadow-lg z-50">
      <div className="flex flex-col items-end">
        <div className="text-white font-medium text-sm">{handStrength.descr}</div>
      </div>
    </div>
  );
};

export default LiveHandStrengthDisplay; 
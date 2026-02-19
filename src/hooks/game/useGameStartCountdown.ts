import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

interface UseGameStartCountdownReturn {
  gameStartTime: string | null;
  showCountdown: boolean;
  handleCountdownComplete: () => void;
  handleSkipCountdown: () => void;
}

export const useGameStartCountdown = (): UseGameStartCountdownReturn => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCountdown, setShowCountdown] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<string | null>(null);

  useEffect(() => {
    const gameStartParam = searchParams.get("gameStart");
    
    if (gameStartParam) {
      try {
        // Fix URL encoding issues - replace spaces with + for timezone offsets
        let cleanedParam = gameStartParam;
        
        // Handle URL encoding issues with + signs in timezone offsets
        if (cleanedParam.includes(" ") && !cleanedParam.includes("+")) {
          // If we have a space but no +, it might be a URL-decoded timezone offset
          cleanedParam = cleanedParam.replace(/\s(\d{2}:\d{2})$/, "+$1");
        }
        
        
        // Validate the date string
        const startDate = new Date(cleanedParam);
        
        if (!isNaN(startDate.getTime())) {
          setGameStartTime(cleanedParam);
          setShowCountdown(true);
        }
      } catch {
        // Invalid date format - ignore
      }
    }
  }, [searchParams]);

  const handleCountdownComplete = () => {
    setShowCountdown(false);
    // Remove the gameStart parameter from URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("gameStart");
    setSearchParams(newParams, { replace: true });
  };

  const handleSkipCountdown = () => {
    setShowCountdown(false);
    // Remove the gameStart parameter from URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("gameStart");
    setSearchParams(newParams, { replace: true });
  };

  return {
    gameStartTime,
    showCountdown,
    handleCountdownComplete,
    handleSkipCountdown
  };
}; 
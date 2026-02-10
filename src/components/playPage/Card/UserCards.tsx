import * as React from "react";
import "./UserCards.css";

type UserCardsProps = {
    frontSrc: string; // Front side image source
    backSrc: string; // Back side image source
    flipped: boolean;
};

const UserCards: React.FC<UserCardsProps> = ({ frontSrc, backSrc, flipped }) => {
    return (
        // !Clickable
        <div className={`handcard ${flipped ? "" : "flipped"}`}>
            {/* <div className={`card ${flipped ? "" : "flipped"}`}> */}
            <div className="handcard-inner">
                <div className="handcard-front">
                    <img src={frontSrc} alt="Card Front" />
                </div>
                <div className="handcard-back">
                    <img src={backSrc} alt="Card Back" />
                </div>
            </div>
        </div>
    );
};

export default UserCards;

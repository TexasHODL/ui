import * as React from "react";
import DealerButtonImage from "../../common/DealerButtonImage";
import { dealerButtonSizeForViewport } from "../../../../utils/chipSize";
import { useTableStyles } from "../../../../theme/useTableStyles";
import "./DealerButtonDisplay.css";

interface DealerButtonDisplayProps {
    seatIndex: number;
    /** Which side of the bet group the button sits on (towards the table interior). */
    side: "left" | "right";
}

/**
 * The dealer button, drawn beside a seat's bet chips and amount, vertically
 * centred on them. Sized 20% larger than one chip (square box so every style,
 * including Marble, stays circular). Rendered inside the seat's
 * `.chip-position` group, which is positioned even when the seat has no bet.
 */
const DealerButtonDisplay: React.FC<DealerButtonDisplayProps> = React.memo(({ seatIndex, side }) => {
    const size = dealerButtonSizeForViewport();
    const { dealer } = useTableStyles();
    return (
        <div
            className="dealer-button"
            data-dealer-button={seatIndex}
            data-dealer-side={side}
            data-dealer-style={dealer}
            style={{ width: `${size}px`, height: `${size}px` }}
        >
            <DealerButtonImage />
        </div>
    );
});

DealerButtonDisplay.displayName = "DealerButtonDisplay";

export default DealerButtonDisplay;

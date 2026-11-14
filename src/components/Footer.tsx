import React from "react";
import { useNetwork } from "../context/NetworkContext";
import { PokerActionPanel } from "./Footer/PokerActionPanel";
import "./Footer.css";
import { useTableId } from "../hooks/game/useTableId";

interface FooterProps {
    onTransactionSubmitted?: (txHash: string | null) => void;
}

const Footer: React.FC<FooterProps> = ({ onTransactionSubmitted }) => {
    const tableId = useTableId();
    const { currentNetwork } = useNetwork();

    // A missing id is the dev table preview: the panel still paints, and every
    // submit path no-ops without a table id, so nothing is broadcast.
    return (
        <PokerActionPanel
            tableId={tableId ?? ""}
            network={currentNetwork}
            onTransactionSubmitted={onTransactionSubmitted}
        />
    );
};

export default Footer;

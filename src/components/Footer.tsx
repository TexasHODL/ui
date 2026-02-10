import React from "react";
import { useParams } from "react-router-dom";
import { useNetwork } from "../context/NetworkContext";
import { PokerActionPanel } from "./Footer/PokerActionPanel";
import "./Footer.css";

interface FooterProps {
    onTransactionSubmitted?: (txHash: string | null) => void;
}

const Footer: React.FC<FooterProps> = ({ onTransactionSubmitted }) => {
    const { id: tableId } = useParams<{ id: string }>();
    const { currentNetwork } = useNetwork();

    if (!tableId) return null;

    return (
        <PokerActionPanel
            tableId={tableId}
            network={currentNetwork}
            onTransactionSubmitted={onTransactionSubmitted}
        />
    );
};

export default Footer;

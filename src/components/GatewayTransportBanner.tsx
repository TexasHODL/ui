import React from "react";
import { getGameTransport, getGatewayHttpUrl } from "../utils/gameTransport";

/**
 * Unmissable indicator that the app is running on the optimistic WS
 * gateway transport (ui#440) — so a tester can confirm at a glance that
 * VITE_GAME_TRANSPORT / VITE_GATEWAY_URL are set as intended. Renders
 * nothing on the default chain transport.
 */
export const GatewayTransportBanner: React.FC = () => {
    if (getGameTransport() !== "gateway") {
        return null;
    }
    return (
        <div
            data-testid="gateway-transport-banner"
            style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                background: "#7f1d1d",
                color: "#fecaca",
                textAlign: "center",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                padding: "2px 8px",
                pointerEvents: "none",
                textTransform: "uppercase"
            }}
        >
            ⚡ gateway transport — {getGatewayHttpUrl()}
        </div>
    );
};

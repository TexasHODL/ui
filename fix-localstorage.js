/**
 * LocalStorage Migration Script
 * 
 * This script fixes localStorage entries that are missing the 'ws' property
 * after the network configuration was updated to include WebSocket endpoints.
 * 
 * Run this in the browser console:
 * 1. Open DevTools (F12)
 * 2. Paste this entire script
 * 3. Press Enter
 */

(function() {
    console.log("🔧 Starting localStorage migration...");

    // Check if there's a saved network
    const savedNetwork = localStorage.getItem("selectedNetwork");
    
    if (!savedNetwork) {
        console.log("✅ No saved network found - will use default on next load");
        return;
    }

    try {
        const network = JSON.parse(savedNetwork);
        console.log("📋 Current saved network:", network);

        // Check if ws property exists
        if (network.ws) {
            console.log("✅ Network already has 'ws' property - no migration needed");
            console.log("   WebSocket URL:", network.ws);
            return;
        }

        console.log("⚠️  Network missing 'ws' property - clearing localStorage");
        
        // Clear the invalid network setting
        localStorage.removeItem("selectedNetwork");
        
        console.log("✅ Migration complete! The app will use default network (Block52) on next reload");
        console.log("   Default WS: wss://node1.block52.xyz/ws");
        
        // Optionally reload the page
        const shouldReload = confirm("Migration complete! Reload the page now to apply changes?");
        if (shouldReload) {
            window.location.reload();
        }
        
    } catch (error) {
        console.error("❌ Error during migration:", error);
        console.log("   Clearing invalid localStorage entry...");
        localStorage.removeItem("selectedNetwork");
        console.log("✅ Cleared. Reload the page to use default network.");
    }
})();

// Also provide a manual reset function
window.resetNetworkConfig = function() {
    localStorage.removeItem("selectedNetwork");
    console.log("✅ Network configuration reset. Reload the page.");
    const shouldReload = confirm("Network configuration reset! Reload now?");
    if (shouldReload) {
        window.location.reload();
    }
};

console.log("💡 You can also run: resetNetworkConfig() to manually reset the network");

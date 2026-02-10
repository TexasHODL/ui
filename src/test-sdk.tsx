import { useEffect, useState } from "react";

export function TestSdk() {
    const [status, setStatus] = useState<{ success: boolean; message: string; exports?: string[] }>({
        success: false,
        message: "Loading SDK..."
    });

    useEffect(() => {
        console.log("=== Testing SDK imports ===");

        import("@block52/poker-vm-sdk")
            .then(sdk => {
                console.log("✅ SDK imported successfully!", sdk);
                setStatus({
                    success: true,
                    message: "SDK Loaded Successfully!",
                    exports: Object.keys(sdk)
                });
            })
            .catch(error => {
                console.error("❌ SDK import failed:", error);
                setStatus({
                    success: false,
                    message: `SDK Import Failed: ${error.message}`
                });
            });
    }, []);

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1>SDK Import Test</h1>
            <div style={{ marginTop: "20px" }}>
                <h2 style={{ color: status.success ? "green" : "red" }}>
                    {status.success ? "✅" : "❌"} {status.message}
                </h2>
                {status.exports && <pre style={{ background: "#f0f0f0", padding: "10px" }}>{JSON.stringify(status.exports, null, 2)}</pre>}
            </div>
            <div style={{ marginTop: "20px", padding: "10px", background: "#f0f0f0" }}>
                <p>
                    <strong>Instructions:</strong> Open browser DevTools console (F12) to see detailed logs.
                </p>
            </div>
        </div>
    );
}

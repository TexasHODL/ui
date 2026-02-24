import { useEffect, useState } from "react";
import styles from "./test-sdk.module.css";

export function TestSdk() {
    const [status, setStatus] = useState<{ success: boolean; message: string; exports?: string[] }>({
        success: false,
        message: "Loading SDK..."
    });

    useEffect(() => {

        import("@block52/poker-vm-sdk")
            .then(sdk => {
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
        <div className={styles.container}>
            <h1>SDK Import Test</h1>
            <div className={styles.sectionSpacing}>
                <h2 className={status.success ? styles.statusSuccess : styles.statusError}>
                    {status.success ? "✅" : "❌"} {status.message}
                </h2>
                {status.exports && <pre className={styles.preBlock}>{JSON.stringify(status.exports, null, 2)}</pre>}
            </div>
            <div className={styles.instructionsBox}>
                <p>
                    <strong>Instructions:</strong> Open browser DevTools console (F12) to see detailed logs.
                </p>
            </div>
        </div>
    );
}

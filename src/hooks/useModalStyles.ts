import { useMemo } from "react";
import type { CSSProperties } from "react";
import { colors, hexToRgba } from "../utils/colorConfig";

export const useModalStyles = () => {
    return useMemo(
        () => ({
            overlay: {
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                backdropFilter: "blur(4px)"
            } satisfies CSSProperties,
            modalContainer: {
                backgroundColor: colors.ui.bgDark,
                border: `1px solid ${colors.ui.borderColor}`
            } satisfies CSSProperties,
            modalPrimaryBorder: {
                backgroundColor: colors.ui.bgDark,
                border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
            } satisfies CSSProperties,
            dividerPrimary: {
                background: `linear-gradient(to right, transparent, ${colors.brand.primary}, transparent)`
            } satisfies CSSProperties,
            panel: {
                backgroundColor: colors.ui.bgMedium,
                border: `1px solid ${colors.ui.borderColor}`
            } satisfies CSSProperties,
            surfaceMuted: {
                backgroundColor: hexToRgba(colors.ui.bgMedium, 0.3)
            } satisfies CSSProperties,
            surfacePrimarySoft: {
                backgroundColor: hexToRgba(colors.ui.bgMedium, 0.3),
                border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`
            } satisfies CSSProperties,
            select: {
                backgroundColor: colors.ui.bgMedium,
                border: `1px solid ${colors.ui.textSecondary}`
            } satisfies CSSProperties,
            input: {
                backgroundColor: colors.ui.bgMedium,
                border: `1px solid ${colors.ui.textSecondary}`
            } satisfies CSSProperties,
            inputPrimarySoft: {
                backgroundColor: hexToRgba(colors.ui.bgMedium, 0.5),
                border: `1px solid ${hexToRgba(colors.brand.primary, 0.2)}`,
                color: "#ffffff"
            } satisfies CSSProperties,
            checkbox: {
                accentColor: colors.brand.primary,
                backgroundColor: colors.ui.bgMedium,
                borderColor: colors.ui.textSecondary
            } satisfies CSSProperties,
            hashDisplay: {
                backgroundColor: colors.ui.bgMedium,
                border: `1px solid ${colors.ui.borderColor}`,
                fontFamily: "monospace"
            } satisfies CSSProperties,
            successAlert: {
                backgroundColor: hexToRgba(colors.accent.success, 0.1),
                border: `1px solid ${colors.accent.success}`
            } satisfies CSSProperties,
            dangerAlert: {
                backgroundColor: hexToRgba(colors.accent.danger, 0.1),
                border: `1px solid ${colors.accent.danger}`
            } satisfies CSSProperties,
            dangerAlertStrong: {
                backgroundColor: `${colors.accent.danger}20`,
                border: `1px solid ${colors.accent.danger}`
            } satisfies CSSProperties,
            warningAlert: {
                backgroundColor: hexToRgba(colors.accent.warning, 0.1),
                border: `1px solid ${colors.accent.warning}`
            } satisfies CSSProperties,
            buttonPrimary: {
                backgroundColor: colors.brand.primary
            } satisfies CSSProperties,
            buttonSecondary: {
                backgroundColor: colors.ui.textSecondary
            } satisfies CSSProperties,
            buttonDanger: {
                backgroundColor: colors.accent.danger
            } satisfies CSSProperties,
            joinButtonGradient: `linear-gradient(to bottom right, ${colors.brand.primary}, ${colors.brand.secondary})`,
            gradient: (color: string) => `linear-gradient(135deg, ${color} 0%, ${hexToRgba(color, 0.8)} 100%)`
        }),
        []
    );
};

export default useModalStyles;
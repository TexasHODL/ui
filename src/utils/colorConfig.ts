/**
 * Color Configuration Utility
 * 
 * This file centralizes all color management for the application.
 * Colors can be customized via environment variables with fallback defaults.
 */

// Brand Colors
export const colors = {
  // Primary and Secondary Brand Colors
  brand: {
    primary: import.meta.env.VITE_BRAND_COLOR_PRIMARY || "#b14cff",
    secondary: import.meta.env.VITE_BRAND_COLOR_SECONDARY || "#0c0a12",
  },

  // Table Background Colors
  table: {
    bgGradientStart: import.meta.env.VITE_TABLE_BG_GRADIENT_START || "#08080c",
    bgGradientMid: import.meta.env.VITE_TABLE_BG_GRADIENT_MID || "#1b1029",
    bgGradientEnd: import.meta.env.VITE_TABLE_BG_GRADIENT_END || "#08080c",
    bgBase: import.meta.env.VITE_TABLE_BG_BASE || "#070709",
    borderColor: import.meta.env.VITE_TABLE_BORDER_COLOR || "#30223f",
  },

  // Animation Colors (for gradient backgrounds)
  animation: {
    color1: import.meta.env.VITE_ANIM_COLOR_1 || "#8b2cff",
    color2: import.meta.env.VITE_ANIM_COLOR_2 || "#28103d",
    color3: import.meta.env.VITE_ANIM_COLOR_3 || "#ff2fc8",
    color4: import.meta.env.VITE_ANIM_COLOR_4 || "#140b24",
    color5: import.meta.env.VITE_ANIM_COLOR_5 || "#ff8b1f",
  },

  // Accent Colors
  accent: {
    glow: import.meta.env.VITE_ACCENT_COLOR_GLOW || "#f02bc6",
    success: import.meta.env.VITE_ACCENT_COLOR_SUCCESS || "#55dda2",
    danger: import.meta.env.VITE_ACCENT_COLOR_DANGER || "#ff557c",
    warning: import.meta.env.VITE_ACCENT_COLOR_WARNING || "#ff9b2f",
    withdraw: import.meta.env.VITE_ACCENT_COLOR_WITHDRAW || "#ff3eaa",
  },

  // UI Element Colors
  ui: {
    bgDark: import.meta.env.VITE_UI_BG_DARK || "#0b0b10",
    bgMedium: import.meta.env.VITE_UI_BG_MEDIUM || "#15151d",
    borderColor: import.meta.env.VITE_UI_BORDER_COLOR || "rgba(255,255,255,0.1)",
    textSecondary: import.meta.env.VITE_UI_TEXT_SECONDARY || "#8b8995",
  },
};

// Helper function to convert hex to rgba
export const hexToRgba = (hex: string | undefined, alpha: number): string => {
  if (!hex || !hex.startsWith("#")) {
    return `rgba(0, 0, 0, ${alpha})`; // Fallback to transparent black
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// CSS custom properties generator
export const generateCSSVariables = (): string => {
  return `
    :root {
      --brand-primary: ${colors.brand.primary};
      --brand-primary-10: ${hexToRgba(colors.brand.primary, 0.1)};
      --brand-secondary: ${colors.brand.secondary};
      --table-bg-gradient-start: ${colors.table.bgGradientStart};
      --table-bg-gradient-mid: ${colors.table.bgGradientMid};
      --table-bg-gradient-end: ${colors.table.bgGradientEnd};
      --table-bg-base: ${colors.table.bgBase};
      --table-border-color: ${colors.table.borderColor};
      --anim-color-1: ${colors.animation.color1};
      --anim-color-1-10: ${hexToRgba(colors.animation.color1, 0.1)};
      --anim-color-1-80: ${hexToRgba(colors.animation.color1, 0.8)};
      --anim-color-2: ${colors.animation.color2};
      --anim-color-2-10: ${hexToRgba(colors.animation.color2, 0.1)};
      --anim-color-2-70: ${hexToRgba(colors.animation.color2, 0.7)};
      --anim-color-3: ${colors.animation.color3};
      --anim-color-3-70: ${hexToRgba(colors.animation.color3, 0.7)};
      --anim-color-4: ${colors.animation.color4};
      --anim-color-4-10: ${hexToRgba(colors.animation.color4, 0.1)};
      --anim-color-4-70: ${hexToRgba(colors.animation.color4, 0.7)};
      --anim-color-5: ${colors.animation.color5};
      --anim-color-5-10: ${hexToRgba(colors.animation.color5, 0.1)};
      --anim-color-5-70: ${hexToRgba(colors.animation.color5, 0.7)};
      --accent-glow: ${colors.accent.glow};
      --accent-success: ${colors.accent.success};
      --accent-danger: ${colors.accent.danger};
      --accent-warning: ${colors.accent.warning};
      --ui-bg-dark: ${colors.ui.bgDark};
      --ui-bg-medium: ${colors.ui.bgMedium};
      --ui-border-color: ${colors.ui.borderColor};
      --ui-text-secondary: ${colors.ui.textSecondary};
    }
  `;
};

// Animation background gradients
export const getAnimationGradient = (mouseX: number, mouseY: number): string => {
  return `
    radial-gradient(circle at ${mouseX}% ${mouseY}%, ${hexToRgba(colors.animation.color1, 0.8)} 0%, transparent 60%),
    radial-gradient(circle at 0% 0%, ${hexToRgba(colors.animation.color2, 0.7)} 0%, transparent 50%),
    radial-gradient(circle at 100% 0%, ${hexToRgba(colors.animation.color3, 0.7)} 0%, transparent 50%),
    radial-gradient(circle at 0% 100%, ${hexToRgba(colors.animation.color4, 0.7)} 0%, transparent 50%),
    radial-gradient(circle at 100% 100%, ${hexToRgba(colors.animation.color5, 0.7)} 0%, transparent 50%)
  `;
};

// Hexagon pattern stroke color
export const getHexagonStroke = (): string => {
  return hexToRgba(colors.brand.primary, 0.5);
};

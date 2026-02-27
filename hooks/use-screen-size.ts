import { useWindowDimensions } from "react-native";

export type ScreenSize = "mobile" | "tablet" | "desktop";

/**
 * Returns the current screen size category based on window width.
 * - mobile:  < 768px
 * - tablet:  768px – 1023px
 * - desktop: ≥ 1024px
 */
export function useScreenSize(): {
  size: ScreenSize;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWeb: boolean;
} {
  const { width, height } = useWindowDimensions();

  const size: ScreenSize =
    width >= 1024 ? "desktop" : width >= 768 ? "tablet" : "mobile";

  return {
    size,
    width,
    height,
    isMobile: size === "mobile",
    isTablet: size === "tablet",
    isDesktop: size === "desktop",
    isWeb: width >= 768,
  };
}

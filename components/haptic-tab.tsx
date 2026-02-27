import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
      onPress={(ev) => {
        // When the tab is already focused, the default behavior tries to
        // popToTop on the tab's stack, which throws "POP_TO_TOP was not
        // handled by any navigator" if there's no stack to pop.
        // We suppress the default onPress when the tab is already active
        // to prevent this error.
        if (props.accessibilityState?.selected) {
          // Tab is already active — do nothing (no popToTop)
          return;
        }
        props.onPress?.(ev);
      }}
    />
  );
}

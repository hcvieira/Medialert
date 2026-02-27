// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "pill.fill": "medication",
  "cross.case.fill": "medical-services",
  "clock.fill": "history",
  "person.2.fill": "group",
  "plus": "add",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "bell.fill": "notifications",
  "trash.fill": "delete",
  "pencil": "edit",
  "chevron.left": "chevron-left",
  "info.circle.fill": "info",
  "person.fill": "person",
  "calendar": "calendar-today",
  "chart.bar.fill": "bar-chart",
  "gear": "settings",
  "lock.fill": "lock",
  "heart.fill": "favorite",
  "faceid": "face",
  "square.and.arrow.up": "share",
  "envelope.fill": "email",
  "phone.fill": "phone",
  "location.fill": "location-on",
  "qrcode": "qr-code",
  "qrcode.viewfinder": "qr-code-scanner",
  "xmark.circle": "cancel",
  "arrow.right": "arrow-forward",
  "checkmark": "check",
  "exclamationmark.triangle.fill": "warning",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "lock.shield.fill": "security",
  "key.fill": "vpn-key",
  "checkmark.seal.fill": "verified",
  "stethoscope": "stethoscope",
  "cross.fill": "add",
  "list.bullet": "list",
  "doc.text.fill": "description",
  "person.badge.plus": "person-add",
  "calendar.badge.plus": "event",
  "mappin.circle.fill": "place",
  "building.2.fill": "business",
  "star.fill": "star",
  "arrow.left": "arrow-back",
  "xmark": "close",
  "ellipsis": "more-horiz",
  "plus.circle.fill": "add-circle",
  "note.text": "notes",
  "note.text.badge.plus": "post-add",
  "note.text.badge.minus": "remove-circle-outline",
  "magnifyingglass": "search",
  "camera.fill": "camera-alt",
  "line.3.horizontal.decrease": "filter-list",
  "rectangle.portrait.and.arrow.right": "logout",
  "trash": "delete-outline",
  "chevron.up": "keyboard-arrow-up",
  "chevron.down": "keyboard-arrow-down",
  "arrow.up.arrow.down": "swap-vert",
  "arrow.clockwise": "refresh",
  "creditcard.fill": "credit-card",
  "banknote.fill": "account-balance",
} as unknown as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

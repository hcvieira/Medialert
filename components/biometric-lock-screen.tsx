import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { BiometricState } from "@/hooks/use-biometric-lock";

interface Props {
  state: BiometricState;
  onRetry: () => void;
}

export function BiometricLockScreen({ state, onRetry }: Props) {
  if (state === "unlocked" || state === "unavailable" || state === "idle") {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={["#1A7FE8", "#0D5BBF", "#0A3D8F"]} style={StyleSheet.absoluteFill} />

      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.appName}>MediAlert</Text>
        <Text style={styles.subtitle}>Verificação de identidade necessária</Text>

        {state === "authenticating" ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Aguardando autenticação...</Text>
          </View>
        ) : (
          <View style={styles.lockedContainer}>
            <View style={styles.lockIcon}>
              <IconSymbol name="lock.fill" size={32} color="#fff" />
            </View>
            <Text style={styles.lockedText}>
              {Platform.OS === "ios"
                ? "Use o Face ID ou Touch ID para continuar"
                : "Use a impressão digital ou PIN para continuar"}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
              <IconSymbol name="faceid" size={22} color="#1A7FE8" />
              <Text style={styles.retryBtnText}>Autenticar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 18,
  },
  appName: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
  },
  lockedContainer: {
    alignItems: "center",
    gap: 16,
  },
  lockIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  retryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A7FE8",
  },
});

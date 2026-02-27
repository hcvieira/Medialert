import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthContext } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { useScreenSize } from "@/hooks/use-screen-size";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Auth from "@/lib/_core/auth";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function WelcomeScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isWeb } = useScreenSize();
  const router = useRouter();
  const { user, loading, refresh } = useAuthContext();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const passwordRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const loginMutation = trpc.auth.login.useMutation();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/(tabs)");
    }
  }, [user, loading, router]);

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) return "E-mail é obrigatório";
    if (!emailRegex.test(value.trim())) return "E-mail inválido";
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) return "Senha é obrigatória";
    return "";
  };

  const handleLogin = async () => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    setGeneralError("");

    if (eErr || pErr) {
      shakeError();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    try {
      const result = await loginMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.sessionToken) {
        await Auth.setSessionToken(result.sessionToken);
        if (result.user) {
          const userInfo: Auth.User = {
            id: result.user.id,
            openId: String(result.user.id),
            name: result.user.name,
            email: result.user.email,
            loginMethod: "email",
            lastSignedIn: new Date(),
          };
          await Auth.setUserInfo(userInfo);
        }
        queryClient.clear();
        await refresh();
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      const message = err?.message || "Erro ao fazer login. Tente novamente.";
      setGeneralError(message);
      shakeError();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const isLoading = loginMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={isDark ? ["#0A1628", "#0D1F3C", "#071020"] : ["#1A7FE8", "#0D5BBF", "#0A3D8F"]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>MediAlert</Text>
          <Text style={styles.tagline}>Controle inteligente de medicamentos</Text>
        </View>

        {/* Card de Login */}
        <View style={isWeb ? { maxWidth: 440, width: "100%", alignSelf: "center" as any } : {}}>
        <Animated.View style={[styles.card, isDark && styles.cardDark, { transform: [{ translateX: shakeAnim }] }]}>
          <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>Entrar na sua conta</Text>

          {/* Erro geral */}
          {generalError ? (
            <View style={styles.errorBanner}>
              <IconSymbol name="xmark.circle.fill" size={16} color="#EF4444" />
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          ) : null}

          {/* Campo E-mail */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>E-mail</Text>
            <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark, emailError ? styles.inputError : null]}>
              <IconSymbol name="envelope.fill" size={18} color={emailError ? "#EF4444" : (isDark ? "#8BA4C0" : "#6B7A8D")} />
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="seu@email.com"
                placeholderTextColor={isDark ? "#4A6080" : "#9BA8B5"}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (emailError) setEmailError(validateEmail(v));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!isLoading}
              />
            </View>
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
          </View>

          {/* Campo Senha */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>Senha</Text>
            <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark, passwordError ? styles.inputError : null]}>
              <IconSymbol name="lock.fill" size={18} color={passwordError ? "#EF4444" : (isDark ? "#8BA4C0" : "#6B7A8D")} />
              <TextInput
                ref={passwordRef}
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Sua senha"
                placeholderTextColor={isDark ? "#4A6080" : "#9BA8B5"}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (passwordError) setPasswordError(validatePassword(v));
                }}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol
                  name={showPassword ? "eye.slash.fill" : "eye.fill"}
                  size={18}
                  color="#6B7A8D"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
          </View>

          {/* Esqueci minha senha */}
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => router.push("/forgot-password" as any)}
            disabled={isLoading}
          >
            <Text style={styles.forgotLinkText}>Esqueci minha senha</Text>
          </TouchableOpacity>

          {/* Botão Entrar */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          {/* Criar conta */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Não tem conta? </Text>
            <TouchableOpacity onPress={() => router.push("/signup" as any)} disabled={isLoading}>
              <Text style={styles.signupLink}>Criar conta</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        </View>

        {/* Footer */}
        <Text style={styles.disclaimer}>
          Ao entrar, você concorda com os termos de uso e política de privacidade do MediAlert.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 40,
    gap: 32,
    justifyContent: "center",
  },
  heroSection: {
    alignItems: "center",
    gap: 10,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 4,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 18,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0D1B2A",
    marginBottom: 4,
    lineHeight: 28,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorBannerText: {
    fontSize: 13,
    color: "#DC2626",
    flex: 1,
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0D1B2A",
    lineHeight: 18,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0F6FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#D1E3F8",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0D1B2A",
    lineHeight: 20,
    padding: 0,
  },
  eyeButton: {
    padding: 2,
  },
  fieldError: {
    fontSize: 12,
    color: "#EF4444",
    lineHeight: 16,
    marginTop: 2,
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  forgotLinkText: {
    fontSize: 13,
    color: "#1A7FE8",
    fontWeight: "600",
    lineHeight: 18,
  },
  loginButton: {
    backgroundColor: "#1A7FE8",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: "#1A7FE8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 50,
  },
  loginButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 22,
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  signupText: {
    fontSize: 14,
    color: "#6B7A8D",
    lineHeight: 20,
  },
  signupLink: {
    fontSize: 14,
    color: "#1A7FE8",
    fontWeight: "700",
    lineHeight: 20,
  },
  // Dark mode overrides
  cardDark: {
    backgroundColor: "#0F1E33",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardTitleDark: {
    color: "#E8F0FC",
  },
  fieldLabelDark: {
    color: "#B0C4DE",
  },
  inputWrapperDark: {
    backgroundColor: "#162035",
    borderColor: "#2A3F5F",
  },
  inputDark: {
    color: "#E8F0FC",
  },
  disclaimer: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});

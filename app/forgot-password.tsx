import { useRef, useState } from "react";
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
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { useScreenSize } from "@/hooks/use-screen-size";

type Step = "email" | "code" | "success";

export default function ForgotPasswordScreen() {
  const { isWeb } = useScreenSize();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>(undefined);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const codeRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const forgotMutation = trpc.auth.forgotPassword.useMutation();
  const resetMutation = trpc.auth.resetPassword.useMutation();

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const validateEmail = (v: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!v.trim()) return "E-mail é obrigatório";
    if (!emailRegex.test(v.trim())) return "E-mail inválido";
    return "";
  };

  const handleSendCode = async () => {
    const eErr = validateEmail(email);
    setEmailError(eErr);
    setGeneralError("");
    if (eErr) {
      shakeError();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      const result = await forgotMutation.mutateAsync({ email: email.trim().toLowerCase() });
      if (result.devCode) {
        setDevCode(result.devCode);
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("code");
    } catch (err: any) {
      setGeneralError(err?.message || "Erro ao enviar código. Tente novamente.");
      shakeError();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleResetPassword = async () => {
    let hasError = false;
    if (!code.trim() || code.trim().length !== 6) {
      setCodeError("Código deve ter 6 dígitos");
      hasError = true;
    } else {
      setCodeError("");
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Senha deve ter pelo menos 8 caracteres");
      hasError = true;
    } else {
      setPasswordError("");
    }
    if (!confirmPassword || confirmPassword !== newPassword) {
      setConfirmPasswordError("As senhas não coincidem");
      hasError = true;
    } else {
      setConfirmPasswordError("");
    }
    setGeneralError("");

    if (hasError) {
      shakeError();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      await resetMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("success");
    } catch (err: any) {
      setGeneralError(err?.message || "Erro ao redefinir senha. Tente novamente.");
      shakeError();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const isLoading = forgotMutation.isPending || resetMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={["#1A7FE8", "#0D5BBF", "#0A3D8F"]}
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
        </View>

        {/* Card */}
        <View style={isWeb ? { maxWidth: 440, width: "100%", alignSelf: "center" as any } : {}}>
        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
          {/* Step: Email */}
          {step === "email" && (
            <>
              <View style={styles.iconHeader}>
                <View style={styles.iconCircle}>
                  <IconSymbol name="lock.fill" size={28} color="#1A7FE8" />
                </View>
              </View>
              <Text style={styles.cardTitle}>Esqueceu sua senha?</Text>
              <Text style={styles.cardSubtitle}>
                Informe seu e-mail e enviaremos um código de verificação para redefinir sua senha.
              </Text>

              {generalError ? (
                <View style={styles.errorBanner}>
                  <IconSymbol name="xmark.circle.fill" size={16} color="#EF4444" />
                  <Text style={styles.errorBannerText}>{generalError}</Text>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>E-mail</Text>
                <View style={[styles.inputWrapper, emailError ? styles.inputError : null]}>
                  <IconSymbol name="envelope.fill" size={18} color={emailError ? "#EF4444" : "#6B7A8D"} />
                  <TextInput
                    style={styles.input}
                    placeholder="seu@email.com"
                    placeholderTextColor="#9BA8B5"
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (emailError) setEmailError(validateEmail(v));
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSendCode}
                    editable={!isLoading}
                  />
                </View>
                {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                onPress={handleSendCode}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Enviar código</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Step: Code + New Password */}
          {step === "code" && (
            <>
              <View style={styles.iconHeader}>
                <View style={[styles.iconCircle, { backgroundColor: "#F0FDF4" }]}>
                  <IconSymbol name="checkmark.circle.fill" size={28} color="#22C55E" />
                </View>
              </View>
              <Text style={styles.cardTitle}>Código enviado!</Text>
              <Text style={styles.cardSubtitle}>
                {devCode
                  ? "O e-mail não pôde ser enviado (domínio não verificado). Use o código abaixo para continuar:"
                  : <>Verifique o e-mail <Text style={styles.emailHighlight}>{email}</Text> e insira o código de 6 dígitos abaixo.</>}
              </Text>

              {/* Dev mode: show code inline when email sending failed */}
              {devCode ? (
                <View style={styles.devCodeBanner}>
                  <Text style={styles.devCodeLabel}>Código de verificação</Text>
                  <Text style={styles.devCodeValue}>{devCode}</Text>
                  <Text style={styles.devCodeHint}>Copie e cole no campo abaixo</Text>
                </View>
              ) : null}

              {generalError ? (
                <View style={styles.errorBanner}>
                  <IconSymbol name="xmark.circle.fill" size={16} color="#EF4444" />
                  <Text style={styles.errorBannerText}>{generalError}</Text>
                </View>
              ) : null}

              {/* Código */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Código de verificação</Text>
                <View style={[styles.inputWrapper, codeError ? styles.inputError : null]}>
                  <IconSymbol name="key.fill" size={18} color={codeError ? "#EF4444" : "#6B7A8D"} />
                  <TextInput
                    ref={codeRef}
                    style={[styles.input, styles.codeInput]}
                    placeholder="000000"
                    placeholderTextColor="#9BA8B5"
                    value={code}
                    onChangeText={(v) => {
                      const digits = v.replace(/\D/g, "").slice(0, 6);
                      setCode(digits);
                      if (codeError) setCodeError("");
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="next"
                    onSubmitEditing={() => newPasswordRef.current?.focus()}
                    editable={!isLoading}
                  />
                </View>
                {codeError ? <Text style={styles.fieldError}>{codeError}</Text> : null}
              </View>

              {/* Nova senha */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nova senha</Text>
                <View style={[styles.inputWrapper, passwordError ? styles.inputError : null]}>
                  <IconSymbol name="lock.fill" size={18} color={passwordError ? "#EF4444" : "#6B7A8D"} />
                  <TextInput
                    ref={newPasswordRef}
                    style={styles.input}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor="#9BA8B5"
                    value={newPassword}
                    onChangeText={(v) => {
                      setNewPassword(v);
                      if (passwordError) setPasswordError("");
                    }}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
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

              {/* Confirmar senha */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Confirmar nova senha</Text>
                <View style={[styles.inputWrapper, confirmPasswordError ? styles.inputError : null]}>
                  <IconSymbol name="lock.shield.fill" size={18} color={confirmPasswordError ? "#EF4444" : "#6B7A8D"} />
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.input}
                    placeholder="Repita a nova senha"
                    placeholderTextColor="#9BA8B5"
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      if (confirmPasswordError) setConfirmPasswordError("");
                    }}
                    secureTextEntry={!showConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((v) => !v)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol
                      name={showConfirmPassword ? "eye.slash.fill" : "eye.fill"}
                      size={18}
                      color="#6B7A8D"
                    />
                  </TouchableOpacity>
                </View>
                {confirmPasswordError ? <Text style={styles.fieldError}>{confirmPasswordError}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Redefinir senha</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendRow}
                onPress={() => {
                  setStep("email");
                  setCode("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setGeneralError("");
                }}
              >
                <Text style={styles.resendText}>Não recebeu o código? </Text>
                <Text style={styles.resendLink}>Tentar novamente</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <>
              <View style={styles.iconHeader}>
                <View style={[styles.iconCircle, { backgroundColor: "#F0FDF4" }]}>
                  <IconSymbol name="checkmark.seal.fill" size={32} color="#22C55E" />
                </View>
              </View>
              <Text style={styles.cardTitle}>Senha redefinida!</Text>
              <Text style={styles.cardSubtitle}>
                Sua senha foi alterada com sucesso. Agora você pode entrar com sua nova senha.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace("/welcome" as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Ir para o login</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Voltar ao login */}
          {step !== "success" && (
            <TouchableOpacity
              style={styles.backRow}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <IconSymbol name="chevron.left" size={14} color="#1A7FE8" />
              <Text style={styles.backLink}>Voltar ao login</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
        </View>
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
    gap: 28,
    justifyContent: "center",
  },
  heroSection: {
    alignItems: "center",
    gap: 10,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconHeader: {
    alignItems: "center",
    marginBottom: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0D1B2A",
    lineHeight: 28,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7A8D",
    lineHeight: 22,
    textAlign: "center",
    marginTop: -4,
  },
  emailHighlight: {
    fontWeight: "700",
    color: "#1A7FE8",
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
  codeInput: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 6,
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
  primaryButton: {
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
  primaryButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 22,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resendText: {
    fontSize: 13,
    color: "#6B7A8D",
    lineHeight: 20,
  },
  resendLink: {
    fontSize: 13,
    color: "#1A7FE8",
    fontWeight: "700",
    lineHeight: 20,
  },
  backRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  backLink: {
    fontSize: 14,
    color: "#1A7FE8",
    fontWeight: "600",
    lineHeight: 20,
  },
  devCodeBanner: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#FED7AA",
  },
  devCodeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    lineHeight: 16,
  },
  devCodeValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1A7FE8",
    letterSpacing: 8,
    lineHeight: 40,
  },
  devCodeHint: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 16,
  },
});

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
import { useAuthContext } from "@/lib/auth-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Auth from "@/lib/_core/auth";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useScreenSize } from "@/hooks/use-screen-size";

type ProfileType = "doctor" | "patient_family" | null;

export default function SignupScreen() {
  const { isWeb } = useScreenSize();
  const router = useRouter();
  const { refresh } = useAuthContext();
  const queryClient = useQueryClient();

  const [profileType, setProfileType] = useState<ProfileType>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const registerMutation = trpc.auth.register.useMutation();
  const setRoleMutation = trpc.user.setRole.useMutation();

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const validateName = (v: string) => {
    if (!v.trim()) return "Nome é obrigatório";
    if (v.trim().length < 2) return "Nome deve ter pelo menos 2 caracteres";
    return "";
  };

  const validateEmail = (v: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!v.trim()) return "E-mail é obrigatório";
    if (!emailRegex.test(v.trim())) return "E-mail inválido";
    return "";
  };

  const validatePassword = (v: string) => {
    if (!v) return "Senha é obrigatória";
    if (v.length < 8) return "Senha deve ter pelo menos 8 caracteres";
    return "";
  };

  const validateConfirmPassword = (v: string, pw: string) => {
    if (!v) return "Confirmação de senha é obrigatória";
    if (v !== pw) return "As senhas não coincidem";
    return "";
  };

  const getPasswordStrength = (pw: string): { label: string; color: string; width: number } => {
    if (!pw) return { label: "", color: "#D1E3F8", width: 0 };
    if (pw.length < 8) return { label: "Fraca", color: "#EF4444", width: 25 };
    const hasUpper = /[A-Z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score === 0) return { label: "Fraca", color: "#EF4444", width: 33 };
    if (score === 1) return { label: "Média", color: "#F59E0B", width: 55 };
    if (score === 2) return { label: "Boa", color: "#22C55E", width: 77 };
    return { label: "Forte", color: "#16A34A", width: 100 };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSignup = async () => {
    if (!profileType) {
      shakeError();
      return;
    }

    const nErr = validateName(name);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cpErr = validateConfirmPassword(confirmPassword, password);

    setNameError(nErr);
    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmPasswordError(cpErr);
    setGeneralError("");

    if (nErr || eErr || pErr || cpErr) {
      shakeError();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    try {
      const result = await registerMutation.mutateAsync({
        name: name.trim(),
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

        // Redirecionar conforme perfil escolhido
        if (profileType === "doctor") {
          // Definir papel como médico e ir para setup de perfil médico
          await setRoleMutation.mutateAsync({ appRole: "doctor" });
          router.replace("/doctor/setup-profile" as any);
        } else {
          // Paciente/familiar: ir para onboarding normal para escolher entre paciente e cuidador
          router.replace("/onboarding" as any);
        }
      }
    } catch (err: any) {
      const message = err?.message || "Erro ao criar conta. Tente novamente.";
      setGeneralError(message);
      shakeError();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const isLoading = registerMutation.isPending || setRoleMutation.isPending;

  // Gradiente muda conforme perfil selecionado
  const gradientColors: [string, string, string] = profileType === "doctor"
    ? ["#0D3B6E", "#0D5BBF", "#1A7FE8"]
    : ["#1A7FE8", "#0D5BBF", "#0A3D8F"];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={gradientColors}
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

        {/* Card de Cadastro */}
        <View style={isWeb ? { maxWidth: 480, width: "100%", alignSelf: "center" as any } : {}}>
        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
          <Text style={styles.cardTitle}>Criar sua conta</Text>
          <Text style={styles.cardSubtitle}>Primeiro, nos diga quem você é</Text>

          {/* Seleção de perfil */}
          <View style={styles.profileRow}>
            <TouchableOpacity
              style={[
                styles.profileCard,
                profileType === "doctor" && styles.profileCardActive,
              ]}
              onPress={() => setProfileType("doctor")}
              activeOpacity={0.8}
            >
              <View style={[
                styles.profileIconBg,
                profileType === "doctor" && styles.profileIconBgActive,
              ]}>
                <IconSymbol
                  name="stethoscope"
                  size={26}
                  color={profileType === "doctor" ? "#fff" : "#1A7FE8"}
                />
              </View>
              <Text style={[
                styles.profileCardTitle,
                profileType === "doctor" && styles.profileCardTitleActive,
              ]}>
                Sou médico
              </Text>
              <Text style={[
                styles.profileCardDesc,
                profileType === "doctor" && styles.profileCardDescActive,
              ]}>
                Gerencio pacientes e prescrevo medicamentos
              </Text>
              {profileType === "doctor" && (
                <View style={styles.profileCheckBadge}>
                  <IconSymbol name="checkmark.circle.fill" size={18} color="#1A7FE8" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.profileCard,
                profileType === "patient_family" && styles.profileCardActive,
              ]}
              onPress={() => setProfileType("patient_family")}
              activeOpacity={0.8}
            >
              <View style={[
                styles.profileIconBg,
                profileType === "patient_family" && styles.profileIconBgActive,
              ]}>
                <IconSymbol
                  name="heart.fill"
                  size={26}
                  color={profileType === "patient_family" ? "#fff" : "#1A7FE8"}
                />
              </View>
              <Text style={[
                styles.profileCardTitle,
                profileType === "patient_family" && styles.profileCardTitleActive,
              ]}>
                Paciente / Familiar
              </Text>
              <Text style={[
                styles.profileCardDesc,
                profileType === "patient_family" && styles.profileCardDescActive,
              ]}>
                Controlo medicamentos e acompanho tratamentos
              </Text>
              {profileType === "patient_family" && (
                <View style={styles.profileCheckBadge}>
                  <IconSymbol name="checkmark.circle.fill" size={18} color="#1A7FE8" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Divisor */}
          {profileType && (
            <>
              <View style={styles.divider} />
              <Text style={styles.dividerLabel}>
                {profileType === "doctor"
                  ? "Dados do médico"
                  : "Seus dados"}
              </Text>
            </>
          )}

          {/* Erro geral */}
          {generalError ? (
            <View style={styles.errorBanner}>
              <IconSymbol name="xmark.circle.fill" size={16} color="#EF4444" />
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          ) : null}

          {/* Campos — só aparecem após selecionar perfil */}
          {profileType && (
            <>
              {/* Campo Nome */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {profileType === "doctor" ? "Nome completo (como aparecerá para os pacientes)" : "Nome completo"}
                </Text>
                <View style={[styles.inputWrapper, nameError ? styles.inputError : null]}>
                  <IconSymbol name="person.fill" size={18} color={nameError ? "#EF4444" : "#6B7A8D"} />
                  <TextInput
                    style={styles.input}
                    placeholder="Seu nome"
                    placeholderTextColor="#9BA8B5"
                    value={name}
                    onChangeText={(v) => {
                      setName(v);
                      if (nameError) setNameError(validateName(v));
                    }}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    editable={!isLoading}
                  />
                </View>
                {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
              </View>

              {/* Campo E-mail */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>E-mail</Text>
                <View style={[styles.inputWrapper, emailError ? styles.inputError : null]}>
                  <IconSymbol name="envelope.fill" size={18} color={emailError ? "#EF4444" : "#6B7A8D"} />
                  <TextInput
                    ref={emailRef}
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
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    editable={!isLoading}
                  />
                </View>
                {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
              </View>

              {/* Campo Senha */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Senha</Text>
                <View style={[styles.inputWrapper, passwordError ? styles.inputError : null]}>
                  <IconSymbol name="lock.fill" size={18} color={passwordError ? "#EF4444" : "#6B7A8D"} />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor="#9BA8B5"
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (passwordError) setPasswordError(validatePassword(v));
                      if (confirmPasswordError && confirmPassword) {
                        setConfirmPasswordError(validateConfirmPassword(confirmPassword, v));
                      }
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
                {/* Barra de força da senha */}
                {password.length > 0 && (
                  <View style={styles.strengthRow}>
                    <View style={styles.strengthBarBg}>
                      <View
                        style={[
                          styles.strengthBarFill,
                          { width: `${passwordStrength.width}%` as any, backgroundColor: passwordStrength.color },
                        ]}
                      />
                    </View>
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  </View>
                )}
                {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
              </View>

              {/* Campo Confirmar Senha */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Confirmar senha</Text>
                <View style={[styles.inputWrapper, confirmPasswordError ? styles.inputError : null]}>
                  <IconSymbol name="lock.shield.fill" size={18} color={confirmPasswordError ? "#EF4444" : "#6B7A8D"} />
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.input}
                    placeholder="Repita a senha"
                    placeholderTextColor="#9BA8B5"
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      if (confirmPasswordError) setConfirmPasswordError(validateConfirmPassword(v, password));
                    }}
                    secureTextEntry={!showConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSignup}
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

              {/* Botão Criar Conta */}
              <TouchableOpacity
                style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.signupButtonText}>
                    {profileType === "doctor" ? "Criar conta médica" : "Criar conta"}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Já tenho conta */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Já tem conta? </Text>
            <TouchableOpacity onPress={() => router.back()} disabled={isLoading}>
              <Text style={styles.loginLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
         </Animated.View>
        </View>
        {/* Footer */}
        <Text style={styles.disclaimer}>
          Ao criar sua conta, você concorda com os termos de uso e política de privacidade do MediAlert.
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
    paddingTop: 60,
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
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0D1B2A",
    lineHeight: 28,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7A8D",
    lineHeight: 20,
    marginTop: -6,
    marginBottom: 2,
  },
  profileRow: {
    flexDirection: "row",
    gap: 10,
  },
  profileCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#D1E3F8",
    backgroundColor: "#F0F6FF",
    padding: 14,
    gap: 6,
    alignItems: "center",
    position: "relative",
  },
  profileCardActive: {
    borderColor: "#1A7FE8",
    backgroundColor: "#EBF4FF",
  },
  profileIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#D1E3F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  profileIconBgActive: {
    backgroundColor: "#1A7FE8",
  },
  profileCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D1B2A",
    textAlign: "center",
    lineHeight: 18,
  },
  profileCardTitleActive: {
    color: "#1A7FE8",
  },
  profileCardDesc: {
    fontSize: 11,
    color: "#6B7A8D",
    textAlign: "center",
    lineHeight: 15,
  },
  profileCardDescActive: {
    color: "#4A90D9",
  },
  profileCheckBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#E8F0FB",
    marginVertical: 2,
  },
  dividerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9BA8B5",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: -4,
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
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  strengthBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: "#D1E3F8",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    minWidth: 36,
  },
  signupButton: {
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
  signupButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 22,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  loginText: {
    fontSize: 14,
    color: "#6B7A8D",
    lineHeight: 20,
  },
  loginLink: {
    fontSize: 14,
    color: "#1A7FE8",
    fontWeight: "700",
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});

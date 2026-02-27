import { useState, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuthContext } from "@/lib/auth-context";
import { InviteQRModal } from "@/components/invite-qr-modal";
import { QRScannerModal } from "@/components/qr-scanner-modal";// ─── Helpers ──────────────────────────────────────────────────────────────────
function OrDivider({ color }: { color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: color + "40" }} />
      <Text style={{ fontSize: 12, fontWeight: "600", color: color + "80" }}>OU</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: color + "40" }} />
    </View>
  );
}

function SectionDivider({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 24, marginBottom: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: color + "30" }} />
      <Text style={{ fontSize: 11, fontWeight: "700", color: color + "90", letterSpacing: 0.8, textTransform: "uppercase" }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: color + "30" }} />
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FamilyScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuthContext();

  // Dynamic roles — inferred from actual links, not stored appRole
  const rolesQuery = trpc.invite.getMyRoles.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5_000,
  });
  const rolesLoaded = rolesQuery.isSuccess;
  const isCaregiver = rolesQuery.data?.isCaregiver ?? false;
  const isPatient = rolesQuery.data?.isPatient ?? false;

  // ── Caregiver data ───────────────────────────────────────────────────────────
  const patientsQuery = trpc.invite.getMyPatients.useQuery(undefined, {
    enabled: !!user && rolesLoaded && isCaregiver,
  });

  // ── Patient data ─────────────────────────────────────────────────────────────
  const caregiverQuery = trpc.invite.getMyCaregiver.useQuery(undefined, {
    enabled: !!user && rolesLoaded && isPatient,
  });

  // ── Shared mutations ─────────────────────────────────────────────────────────
  const createInvite = trpc.invite.create.useMutation();
  const createForCaregiver = trpc.invite.createForCaregiver.useMutation();
  const acceptAnyCode = trpc.invite.acceptAnyCode.useMutation();
  const unlinkMutation = trpc.invite.unlink.useMutation();

  // ── Local state ──────────────────────────────────────────────────────────────
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [caregiverCode, setCaregiverCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingCaregiverCode, setIsCreatingCaregiverCode] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  // QR modals
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalType, setQRModalType] = useState<"patient" | "caregiver">("patient");
  const [showScanner, setShowScanner] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleGeneratePatientCode = useCallback(async () => {
    setIsCreating(true);
    try {
      const result = await createInvite.mutateAsync();
      setInviteCode(result.code);
      setQRModalType("patient");
      setShowQRModal(true);
      if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Erro", "Não foi possível gerar o código. Tente novamente.");
    } finally {
      setIsCreating(false);
    }
  }, [createInvite]);

  const handleSharePatientCode = useCallback(async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `Use o código ${inviteCode} no MediAlert para que eu possa acompanhar seus medicamentos. Abra o app, vá em "Familiares" e insira o código.`,
        title: "Código de convite MediAlert",
      });
    } catch {}
  }, [inviteCode]);

  const handleGenerateCaregiverCode = useCallback(async () => {
    setIsCreatingCaregiverCode(true);
    try {
      const result = await createForCaregiver.mutateAsync();
      setCaregiverCode(result.code);
      setQRModalType("caregiver");
      setShowQRModal(true);
      if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Erro", "Não foi possível gerar o código. Tente novamente.");
    } finally {
      setIsCreatingCaregiverCode(false);
    }
  }, [createForCaregiver]);

  const handleShareCaregiverCode = useCallback(async () => {
    if (!caregiverCode) return;
    try {
      await Share.share({
        message: `Use o código ${caregiverCode} no MediAlert para acompanhar meus medicamentos. Abra o app, vá em "Familiares" e insira o código.`,
        title: "Código de convite MediAlert",
      });
    } catch {}
  }, [caregiverCode]);

  const handleAcceptCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (code.length < 6) {
      Alert.alert("Código inválido", "Digite o código completo.");
      return;
    }
    setIsAccepting(true);
    try {
      const result = await acceptAnyCode.mutateAsync({ code });
      patientsQuery.refetch();
      caregiverQuery.refetch();
      rolesQuery.refetch();
      setCodeInput("");
      if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const msg = result.linkedAs === "caregiver"
        ? "Você agora acompanha os medicamentos deste paciente."
        : "Seu familiar agora acompanha seus medicamentos.";
      Alert.alert("🔗 Vinculado!", msg);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Código inválido ou já utilizado.");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleUnlinkPatient = (patientId: number, patientName: string) => {
    Alert.alert(
      "Desvincular paciente",
      `Tem certeza que deseja desvincular ${patientName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desvincular",
          style: "destructive",
          onPress: async () => {
            try {
              await unlinkMutation.mutateAsync({ otherUserId: patientId });
              patientsQuery.refetch();
              rolesQuery.refetch();
              if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e: any) {
              Alert.alert("Erro", e?.message ?? "Não foi possível desvincular.");
            }
          },
        },
      ]
    );
  };

  const handleUnlinkCaregiver = (caregiverId: number, caregiverName: string) => {
    Alert.alert(
      "Desvincular familiar",
      `Tem certeza que deseja desvincular ${caregiverName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desvincular",
          style: "destructive",
          onPress: async () => {
            try {
              await unlinkMutation.mutateAsync({ otherUserId: caregiverId });
              caregiverQuery.refetch();
              rolesQuery.refetch();
              if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e: any) {
              Alert.alert("Erro", e?.message ?? "Não foi possível desvincular.");
            }
          },
        },
      ]
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (rolesQuery.isLoading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const patients = (patientsQuery.data ?? []) as Array<{ id: number; name: string | null; email: string | null }>;
  const caregiver = caregiverQuery.data as { id: number; name: string | null; email: string | null } | null | undefined;
  const hasBothRoles = isCaregiver && isPatient;

  return (
    <ScreenContainer containerClassName="bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Header ── */}
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Familiares</Text>
              <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
                {hasBothRoles
                  ? "Você é paciente e acompanha outros pacientes"
                  : isCaregiver
                    ? `${patients.length} paciente${patients.length !== 1 ? "s" : ""} vinculado${patients.length !== 1 ? "s" : ""}`
                    : "Quem acompanha seu tratamento"}
              </Text>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════════════
              SEÇÃO: PACIENTES QUE ACOMPANHO (visível para caregivers)
          ══════════════════════════════════════════════════════════════════ */}
          {isCaregiver && (
            <>
              {hasBothRoles && <SectionDivider label="Pacientes que acompanho" color={colors.muted} />}

              {/* Gerar código para o paciente inserir */}
              <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionIcon, { backgroundColor: "#EBF4FF" }]}>
                    <Text style={{ fontSize: 18 }}>🔑</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Gerar código para o paciente</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                      Gere um código e compartilhe com o paciente. Ele insere no app dele.
                    </Text>
                  </View>
                </View>
                {inviteCode ? (
                  <View style={styles.codeContainer}>
                    <View style={[styles.codeBadge, { backgroundColor: "#EBF4FF", borderColor: "#0D5BBF40" }]}>
                      <Text style={[styles.codeText, { color: "#0D5BBF" }]}>{inviteCode}</Text>
                    </View>
                    <Text style={[styles.codeHint, { color: colors.muted }]}>
                      Compartilhe este código com o paciente. Ele é de uso único.
                    </Text>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                      onPress={handleSharePatientCode}
                      activeOpacity={0.85}
                    >
                      <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Compartilhar código</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.ghostBtn, { borderColor: colors.border }]}
                      onPress={() => setInviteCode(null)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.ghostBtnText, { color: colors.muted }]}>Gerar novo código</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={handleGeneratePatientCode}
                    disabled={isCreating}
                    activeOpacity={0.85}
                  >
                    {isCreating ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <IconSymbol name="qrcode" size={20} color="#fff" />
                        <Text style={styles.primaryBtnText}>Gerar código de convite</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Lista de pacientes vinculados */}
              {patients.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.listSectionTitle, { color: colors.muted }]}>Pacientes vinculados</Text>
                  {patients.map((item) => {
                    const initials = (item.name ?? "?")
                      .split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
                    return (
                      <View key={item.id} style={[styles.patientCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <TouchableOpacity
                          style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }}
                          onPress={() => router.push({ pathname: "/family/patient-overview", params: { patientId: item.id, patientName: item.name ?? "Paciente" } } as any)}
                          activeOpacity={0.85}
                        >
                          <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
                            <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
                          </View>
                          <View style={styles.patientInfo}>
                            <Text style={[styles.patientName, { color: colors.foreground }]}>{item.name ?? "Sem nome"}</Text>
                            <Text style={[styles.patientEmail, { color: colors.muted }]}>{item.email ?? "—"}</Text>
                            <Text style={[styles.viewMedsText, { color: colors.primary }]}>Ver resumo do dia →</Text>
                          </View>
                          <View style={[styles.linkedBadge, { backgroundColor: colors.success + "20" }]}>
                            <IconSymbol name="checkmark.circle.fill" size={14} color={colors.success} />
                            <Text style={[styles.linkedText, { color: colors.success }]}>Vinculado</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.unlinkBtn, { borderColor: colors.error + "60" }]}
                          onPress={() => handleUnlinkPatient(item.id, item.name ?? "Paciente")}
                          activeOpacity={0.7}
                        >
                          <IconSymbol name="xmark.circle" size={16} color={colors.error} />
                          <Text style={[styles.unlinkBtnText, { color: colors.error }]}>Desvincular</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SEÇÃO: MEU FAMILIAR (visível para pacientes)
          ══════════════════════════════════════════════════════════════════ */}
          {isPatient && (
            <>
              {hasBothRoles && <SectionDivider label="Meu familiar / cuidador" color={colors.muted} />}

              {caregiverQuery.isLoading ? (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : caregiver ? (
                /* Familiar já vinculado */
                <View style={{ padding: 16 }}>
                  <View style={[styles.caregiverCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.caregiverAvatar, { backgroundColor: colors.primary }]}>
                      <IconSymbol name="person.fill" size={36} color="#fff" />
                    </View>
                    <Text style={[styles.caregiverName, { color: colors.foreground }]}>
                      {caregiver.name ?? "Familiar"}
                    </Text>
                    <Text style={[styles.caregiverEmail, { color: colors.muted }]}>
                      {caregiver.email ?? "—"}
                    </Text>
                    <View style={[styles.connectedBadge, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
                      <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
                      <Text style={[styles.connectedText, { color: colors.success }]}>
                        Conectado — recebe notificações sobre seus medicamentos
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.unlinkBtn, { borderColor: colors.error + "60" }]}
                      onPress={() => handleUnlinkCaregiver((caregiver as any).id, caregiver?.name ?? "Familiar")}
                      activeOpacity={0.7}
                    >
                      <IconSymbol name="xmark.circle" size={16} color={colors.error} />
                      <Text style={[styles.unlinkBtnText, { color: colors.error }]}>Desvincular familiar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Sem familiar vinculado: mostrar opções */
                <>
                  {/* Gerar código para o familiar inserir */}
                  <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.sectionTitleRow}>
                      <View style={[styles.sectionIcon, { backgroundColor: "#EBF4FF" }]}>
                        <Text style={{ fontSize: 18 }}>🔑</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Gerar código para o familiar</Text>
                        <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                          Gere um código e compartilhe com seu familiar. Ele insere no app dele.
                        </Text>
                      </View>
                    </View>
                    {caregiverCode ? (
                      <View style={styles.codeContainer}>
                        <View style={[styles.codeBadge, { backgroundColor: "#EBF4FF", borderColor: "#0D5BBF40" }]}>
                          <Text style={[styles.codeText, { color: "#0D5BBF" }]}>{caregiverCode}</Text>
                        </View>
                        <Text style={[styles.codeHint, { color: colors.muted }]}>
                          Compartilhe este código com seu familiar. Ele é de uso único.
                        </Text>
                        <TouchableOpacity
                          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                          onPress={handleShareCaregiverCode}
                          activeOpacity={0.85}
                        >
                          <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
                          <Text style={styles.primaryBtnText}>Compartilhar código</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.ghostBtn, { borderColor: colors.border }]}
                          onPress={() => setCaregiverCode(null)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.ghostBtnText, { color: colors.muted }]}>Gerar novo código</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                        onPress={handleGenerateCaregiverCode}
                        disabled={isCreatingCaregiverCode}
                        activeOpacity={0.85}
                      >
                        {isCreatingCaregiverCode ? <ActivityIndicator color="#fff" /> : (
                          <>
                            <IconSymbol name="qrcode" size={20} color="#fff" />
                            <Text style={styles.primaryBtnText}>Gerar código de convite</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SEÇÃO: INSERIR CÓDIGO (sempre visível — aceita qualquer tipo)
          ══════════════════════════════════════════════════════════════════ */}
          <OrDivider color={colors.muted} />

          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: "#F0FDF4" }]}>
                <Text style={{ fontSize: 18 }}>📋</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Inserir código de convite</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                  Recebeu um código? Insira aqui — o sistema detecta automaticamente o tipo de vínculo.
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.codeInput, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={codeInput}
                onChangeText={(t) => setCodeInput(t.toUpperCase())}
                placeholder="Ex: AB12CD34"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                returnKeyType="done"
                onSubmitEditing={handleAcceptCode}
              />
              {Platform.OS !== "web" && (
                <TouchableOpacity
                  style={[styles.scanBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowScanner(true)}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="qrcode.viewfinder" size={22} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: "#16A34A" }, (codeInput.trim().length < 6 || isAccepting) && { opacity: 0.5 }]}
              onPress={handleAcceptCode}
              disabled={codeInput.trim().length < 6 || isAccepting}
              activeOpacity={0.85}
            >
              {isAccepting ? <ActivityIndicator color="#fff" /> : (
                <>
                  <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Vincular</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* QR Code modal */}
      <InviteQRModal
        visible={showQRModal}
        code={(qrModalType === "patient" ? inviteCode : caregiverCode) ?? ""}
        codeType={qrModalType}
        onClose={() => setShowQRModal(false)}
        onGenerateNew={() => {
          setShowQRModal(false);
          if (qrModalType === "patient") {
            setInviteCode(null);
          } else {
            setCaregiverCode(null);
          }
        }}
      />

      {/* QR Scanner modal */}
      <QRScannerModal
        visible={showScanner}
        onScan={(code) => {
          setCodeInput(code);
          setShowScanner(false);
        }}
        onClose={() => setShowScanner(false)}
      />

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", lineHeight: 28 },
  headerSubtitle: { fontSize: 13, marginTop: 2, lineHeight: 18 },

  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  sectionSubtitle: { fontSize: 13, lineHeight: 18, marginTop: 2 },

  codeContainer: { gap: 12, alignItems: "center" },
  codeBadge: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  codeText: { fontSize: 28, fontWeight: "800", letterSpacing: 6, lineHeight: 36 },
  codeHint: { fontSize: 13, textAlign: "center", lineHeight: 18 },

  codeInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 4,
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  ghostBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    width: "100%",
    alignItems: "center",
  },
  ghostBtnText: { fontSize: 14 },

  listSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700" },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  patientEmail: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  viewMedsText: { fontSize: 12, fontWeight: "600", marginTop: 3, lineHeight: 16 },
  linkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  linkedText: { fontSize: 12, fontWeight: "600" },

  caregiverCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  caregiverAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  caregiverName: { fontSize: 20, fontWeight: "700", lineHeight: 28 },
  caregiverEmail: { fontSize: 14, lineHeight: 20 },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    width: "100%",
  },
  connectedText: { flex: 1, fontSize: 13, lineHeight: 18 },
  unlinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    alignSelf: "flex-end",
  },
  unlinkBtnText: { fontSize: 12, fontWeight: "600" },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

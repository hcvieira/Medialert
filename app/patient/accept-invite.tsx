import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function AcceptInviteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ doctorName?: string; specialty?: string } | null>(null);

  const acceptInvite = trpc.doctor.acceptInvite.useMutation();
  const utils = trpc.useUtils();

  const handleAccept = async () => {
    if (!code.trim()) {
      setError("Digite o código de convite");
      return;
    }
    setError("");
    try {
      const result = await acceptInvite.mutateAsync({ inviteCode: code.trim().toUpperCase() });
      utils.doctor.getMyDoctors.invalidate();
      setSuccess({ doctorName: result.doctorName ?? undefined, specialty: result.specialty ?? undefined });
    } catch (e: any) {
      setError(e.message ?? "Código inválido ou já utilizado.");
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.successIcon}>
            <IconSymbol name="checkmark.circle.fill" size={48} color="#22C55E" />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Vinculado com sucesso!</Text>
          <Text style={[styles.successDesc, { color: colors.muted }]}>
            Você foi vinculado ao{"\n"}
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              Dr. {success.doctorName ?? "Médico"}
            </Text>
            {success.specialty ? `\n${success.specialty}` : ""}
          </Text>
          <Text style={[styles.successNote, { color: colors.muted }]}>
            Agora o médico pode prescrever medicamentos e agendar consultas para você.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace("/(tabs)" as any); } }} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Concluir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: "#0D5BBF" }]}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace("/(tabs)" as any); } }} style={styles.backBtn}>
            <IconSymbol name="arrow.left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vincular médico</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconSymbol name="stethoscope" size={48} color="#0D5BBF" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Código de convite</Text>
          <Text style={[styles.desc, { color: colors.muted }]}>
            Peça ao seu médico o código de 6 dígitos gerado no app dele e digite abaixo para se vincular.
          </Text>

          <View style={styles.inputGroup}>
            <TextInput
              style={[
                styles.codeInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderColor: error ? "#EF4444" : colors.border,
                },
              ]}
              value={code}
              onChangeText={(t) => { setCode(t); setError(""); }}
              placeholder="Ex: 482917"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleAccept}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.acceptBtn, acceptInvite.isPending && { opacity: 0.6 }]}
            onPress={handleAccept}
            disabled={acceptInvite.isPending}
            activeOpacity={0.85}
          >
            {acceptInvite.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol name="person.badge.plus" size={20} color="#fff" />
                <Text style={styles.acceptBtnText}>Vincular médico</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  content: {
    flex: 1,
    padding: 32,
    alignItems: "center",
    gap: 16,
    justifyContent: "center",
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  desc: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  inputGroup: { width: "100%", gap: 6 },
  codeInput: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 18,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 8,
  },
  errorText: { fontSize: 13, color: "#EF4444", textAlign: "center" },
  acceptBtn: {
    backgroundColor: "#0D5BBF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    justifyContent: "center",
    marginTop: 8,
  },
  acceptBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  // Success state
  successCard: {
    flex: 1,
    margin: 24,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 16,
    justifyContent: "center",
    borderWidth: 1,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  successDesc: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  successNote: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  doneBtn: {
    backgroundColor: "#0D5BBF",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  doneBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
});

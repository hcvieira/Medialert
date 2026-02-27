import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
} from "react-native";

function showAlert(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Text key={s} style={{ fontSize: 18, color: s <= Math.round(rating) ? "#F59E0B" : "#D1D5DB" }}>
          ★
        </Text>
      ))}
      <Text style={{ fontSize: 14, color: "#92400E", fontWeight: "700", marginLeft: 4 }}>
        {rating.toFixed(1)}
      </Text>
      <Text style={{ fontSize: 13, color: "#6B7280" }}>
        ({count} avaliação{count !== 1 ? "ões" : ""})
      </Text>
    </View>
  );
}

function ReviewCard({
  review,
  colors,
}: {
  review: { id: number; rating: number; comment?: string | null; patientName: string; createdAt: string | Date };
  colors: ReturnType<typeof useColors>;
}) {
  const date = new Date(review.createdAt);
  const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const initial = (review.patientName ?? "P").charAt(0).toUpperCase();

  return (
    <View style={[reviewStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={reviewStyles.header}>
        <View style={[reviewStyles.avatar, { backgroundColor: colors.primary + "22" }]}>
          <Text style={[reviewStyles.avatarText, { color: colors.primary }]}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[reviewStyles.name, { color: colors.foreground }]}>{review.patientName}</Text>
          <Text style={[reviewStyles.date, { color: colors.muted }]}>{dateStr}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 2 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Text key={s} style={{ fontSize: 13, color: s <= review.rating ? "#F59E0B" : "#D1D5DB" }}>★</Text>
          ))}
        </View>
      </View>
      {review.comment ? (
        <Text style={[reviewStyles.comment, { color: colors.foreground }]}>"{review.comment}"</Text>
      ) : null}
    </View>
  );
}

const reviewStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  date: {
    fontSize: 12,
    lineHeight: 16,
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
});

export default function DoctorProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitRequest = trpc.reviews.submitConsultationRequest.useMutation({
    onSuccess: () => {
      setShowRequestModal(false);
      setPhone("");
      setMessage("");
      showAlert(
        "Solicitação enviada! ✅",
        "O médico recebeu sua solicitação e entrará em contato pelo número informado."
      );
    },
    onError: (err) => {
      showAlert("Erro", err.message || "Não foi possível enviar a solicitação.");
    },
  });

  const handleSubmitRequest = async () => {
    if (phone.trim().length < 8) {
      showAlert("Telefone inválido", "Informe um número de telefone válido.");
      return;
    }
    setSubmitting(true);
    try {
      await submitRequest.mutateAsync({
        doctorId: Number(doctorId),
        phone: phone.trim(),
        message: message.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const profileQuery = trpc.reviews.getPublicDoctorProfile.useQuery(
    { doctorId: Number(doctorId) },
    { enabled: !!doctorId }
  );

  const doctor = profileQuery.data;

  const handleShare = useCallback(async () => {
    if (!doctor) return;
    let insurances: string[] = [];
    try { insurances = JSON.parse(doctor.insurances ?? "[]"); } catch {}
    const doctorName = doctor.name ?? "Médico";
    const lines = [
      `👨‍⚕️ ${doctorName}`,
      doctor.specialty ? `🔬 ${doctor.specialty}` : null,
      doctor.crm && doctor.crmState ? `📋 CRM ${doctor.crm}/${doctor.crmState}` : null,
      doctor.phone ? `📞 ${doctor.phone}` : null,
      doctor.address ? `📍 ${doctor.address}` : null,
      insurances.length > 0 ? `🏥 Convênios: ${insurances.join(", ")}` : null,
      doctor.bio ? `\n${doctor.bio}` : null,
      `\nEncontrado no MediAlert — Controle de Medicamentos`,
    ].filter(Boolean).join("\n");
    try {
      if (Platform.OS === "web") {
        if (navigator.share) {
          await navigator.share({ title: doctorName, text: lines });
        } else {
          await navigator.clipboard.writeText(lines);
          window.alert("Informações copiadas para a área de transferência!");
        }
      } else {
        await Share.share({ message: lines, title: doctorName });
      }
    } catch {}
  }, [doctor]);

  let insuranceList: string[] = [];
  try {
    insuranceList = JSON.parse(doctor?.insurances ?? "[]");
  } catch {}

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/" as any); }}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <IconSymbol name="chevron.left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil do Médico</Text>
        {doctor && (
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 20, lineHeight: 24 }}>⬆️</Text>
          </TouchableOpacity>
        )}
      </View>

      {profileQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Carregando perfil...</Text>
        </View>
      ) : !doctor ? (
        <View style={styles.loadingContainer}>
          <IconSymbol name="stethoscope" size={56} color={colors.border} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Médico não encontrado</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero card */}
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {doctor.photoUrl ? (
              <Image source={{ uri: doctor.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                  {(doctor.name ?? "M").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={[styles.doctorName, { color: colors.foreground }]}>{doctor.name}</Text>
            {doctor.specialty ? (
              <Text style={[styles.specialty, { color: colors.primary }]}>{doctor.specialty}</Text>
            ) : null}
            {doctor.crm && doctor.crmState ? (
              <Text style={[styles.crm, { color: colors.muted }]}>CRM {doctor.crm}/{doctor.crmState}</Text>
            ) : null}
            {doctor.reviewCount > 0 ? (
              <View style={{ marginTop: 8 }}>
                <StarRow rating={doctor.averageRating} count={doctor.reviewCount} />
              </View>
            ) : (
              <Text style={[styles.noReviews, { color: colors.muted }]}>Sem avaliações ainda</Text>
            )}

            {/* Solicitar consulta button */}
            <TouchableOpacity
              style={[styles.requestBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowRequestModal(true)}
              activeOpacity={0.85}
            >
              <IconSymbol name="calendar.badge.plus" size={18} color="#fff" />
              <Text style={styles.requestBtnText}>Solicitar Consulta</Text>
            </TouchableOpacity>
          </View>

          {/* Contact info */}
          {(doctor.phone || doctor.address) ? (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Contato & Localização</Text>
              {doctor.phone ? (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => Linking.openURL(`tel:${doctor.phone}`)}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="phone.fill" size={16} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.primary }]}>{doctor.phone}</Text>
                </TouchableOpacity>
              ) : null}
              {doctor.address ? (
                <View style={styles.infoRow}>
                  <IconSymbol name="location.fill" size={16} color={colors.muted} />
                  <Text style={[styles.infoText, { color: colors.muted }]}>{doctor.address}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Bio */}
          {doctor.bio ? (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sobre o Médico</Text>
              <Text style={[styles.bioText, { color: colors.muted }]}>{doctor.bio}</Text>
            </View>
          ) : null}

          {/* Insurances */}
          {insuranceList.length > 0 ? (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Convênios Aceitos</Text>
              <View style={styles.tagsRow}>
                {insuranceList.map((ins) => (
                  <View key={ins} style={[styles.tag, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
                    <Text style={[styles.tagText, { color: colors.primary }]}>{ins}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Reviews */}
          {doctor.reviews.length > 0 ? (
            <View style={styles.reviewsSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>
                Avaliações dos Pacientes
              </Text>
              {doctor.reviews.map((r) => (
                <ReviewCard key={r.id} review={r as any} colors={colors} />
              ))}
            </View>
          ) : null}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Request Modal */}
      <Modal
        visible={showRequestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={modalStyles.overlay}
        >
          <View style={[modalStyles.sheet, { backgroundColor: colors.surface }]}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.headerRow}>
              <Text style={[modalStyles.title, { color: colors.foreground }]}>Solicitar Consulta</Text>
              <TouchableOpacity
                onPress={() => setShowRequestModal(false)}
                style={[modalStyles.closeBtn, { backgroundColor: colors.border }]}
                activeOpacity={0.7}
              >
                <IconSymbol name="xmark" size={14} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <Text style={[modalStyles.label, { color: colors.muted }]}>
              Informe seu telefone para que o médico entre em contato
            </Text>

            <View style={[modalStyles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <IconSymbol name="phone.fill" size={16} color={colors.primary} />
              <TextInput
                style={[modalStyles.input, { color: colors.foreground }]}
                placeholder="(00) 00000-0000"
                placeholderTextColor={colors.muted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            </View>

            <View style={[modalStyles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background, alignItems: "flex-start", paddingTop: 12 }]}>
              <TextInput
                style={[modalStyles.input, { color: colors.foreground, minHeight: 72, textAlignVertical: "top" }]}
                placeholder="Mensagem opcional (motivo da consulta, urgência...)"
                placeholderTextColor={colors.muted}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              style={[modalStyles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
              onPress={handleSubmitRequest}
              activeOpacity={0.85}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={modalStyles.submitBtnText}>Enviar Solicitação</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 26,
    flex: 1,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    lineHeight: 20,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 8,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 44,
  },
  doctorName: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
  },
  specialty: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
  },
  crm: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  noReviews: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  reviewsSection: {
    gap: 10,
  },
  requestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  requestBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

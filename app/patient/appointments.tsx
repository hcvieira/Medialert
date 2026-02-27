import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

function showConfirm(title: string, message: string, onConfirm: () => void, confirmLabel = "Confirmar") {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: "Não", style: "cancel" },
      { text: confirmLabel, style: "destructive", onPress: onConfirm },
    ]);
  }
}
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { scheduleAppointmentReminders, cancelAppointmentReminders } from "@/lib/notifications";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Calendar from "expo-calendar";

// ─── Star Rating Component ────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 8 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} activeOpacity={0.8}>
          <Text style={{ fontSize: 36, color: s <= value ? "#F59E0B" : "#D1D5DB" }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  confirmed:             { color: "#16A34A", bg: "#DCFCE7", label: "Confirmada",                  icon: "✅" },
  scheduled:             { color: "#D97706", bg: "#FEF3C7", label: "Aguardando confirmação",       icon: "⏳" },
  completed:             { color: "#6366F1", bg: "#EDE9FE", label: "Realizada",                   icon: "✔️" },
  cancelled:             { color: "#DC2626", bg: "#FEE2E2", label: "Cancelada",                   icon: "❌" },
  reschedule_requested:  { color: "#D97706", bg: "#FEF3C7", label: "Reagendamento solicitado",    icon: "🔄" },
};

function getStatus(s: string) {
  return STATUS_CONFIG[s] ?? STATUS_CONFIG.scheduled;
}

// ─── Month abbreviation ───────────────────────────────────────────────────────
function monthAbbr(dateStr: string) {
  return new Date(dateStr + "T12:00:00")
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

export default function PatientAppointmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const apptQuery = trpc.appointments.listForPatient.useQuery();
  const updateStatus = trpc.appointments.updateStatus.useMutation();
  const submitReview = trpc.reviews.submit.useMutation();
  const utils = trpc.useUtils();

  const [rescheduleModalId, setRescheduleModalId] = useState<number | null>(null);
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [reschedulePending, setReschedulePending] = useState(false);
  const [reviewAppt, setReviewAppt] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPending, setReviewPending] = useState(false);

  const appts = (apptQuery.data ?? []).sort((a, b) => {
    const da = `${a.date}T${a.time}`;
    const db2 = `${b.date}T${b.time}`;
    return da < db2 ? -1 : 1;
  });

  const today = new Date().toISOString().split("T")[0];
  const upcoming = appts.filter((a) => a.date >= today && a.status !== "cancelled");
  const past = appts.filter((a) => a.date < today || a.status === "cancelled");

  useEffect(() => {
    const confirmed = upcoming.filter((a) => a.status === "confirmed");
    confirmed.forEach((a) => {
      scheduleAppointmentReminders(a.id, a.date, a.time, a.doctorName ?? "Médico").catch(() => {});
    });
  }, [apptQuery.dataUpdatedAt]);

  const handleConfirm = async (id: number) => {
    try {
      await updateStatus.mutateAsync({ appointmentId: id, status: "confirmed" });
      utils.appointments.listForPatient.invalidate();
      const appt = appts.find((a) => a.id === id);
      if (appt) await scheduleAppointmentReminders(appt.id, appt.date, appt.time, appt.doctorName ?? "Médico");
    } catch (e: any) {
      showAlert("Erro", e.message ?? "Não foi possível confirmar.");
    }
  };

  const handleRequestReschedule = async () => {
    if (!rescheduleModalId) return;
    setReschedulePending(true);
    try {
      await updateStatus.mutateAsync({
        appointmentId: rescheduleModalId,
        status: "reschedule_requested",
        rescheduleNote: rescheduleNote.trim() || undefined,
      });
      utils.appointments.listForPatient.invalidate();
      setRescheduleModalId(null);
      setRescheduleNote("");
      showAlert("✅ Solicitação enviada", "O médico foi notificado e entrará em contato para reagendar.");
    } catch (e: any) {
      showAlert("Erro", e.message ?? "Não foi possível enviar a solicitação.");
    } finally {
      setReschedulePending(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewAppt || reviewRating === 0) {
      showAlert("Avaliação incompleta", "Selecione pelo menos 1 estrela para enviar.");
      return;
    }
    setReviewPending(true);
    try {
      await submitReview.mutateAsync({
        doctorId: reviewAppt.doctorId,
        appointmentId: reviewAppt.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewAppt(null);
      setReviewRating(0);
      setReviewComment("");
      showAlert("⭐ Avaliação enviada!", "Obrigado pelo seu feedback. Ele ajuda outros pacientes.");
    } catch (e: any) {
      showAlert("Erro", e.message ?? "Não foi possível enviar a avaliação.");
    } finally {
      setReviewPending(false);
    }
  };

  const handleSaveToCalendar = async (item: any) => {
    if (Platform.OS === "web") {
      showAlert("Indisponível", "Salvar no calendário não está disponível na versão web.");
      return;
    }
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        showAlert("Permissão necessária", "Permita o acesso ao calendário para salvar a consulta.");
        return;
      }
      let calendarId: string;
      if (Platform.OS === "ios") {
        const defaultCal = await Calendar.getDefaultCalendarAsync();
        calendarId = defaultCal.id;
      } else {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const writable = calendars.filter((c) => c.allowsModifications);
        if (writable.length === 0) { showAlert("Erro", "Nenhum calendário gravável encontrado."); return; }
        calendarId = writable[0].id;
      }
      const [year, month, day] = item.date.split("-").map(Number);
      const [hour, minute] = item.time.split(":").map(Number);
      const startDate = new Date(year, month - 1, day, hour, minute, 0);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      const windowStart = new Date(startDate.getTime() - 60 * 1000);
      const windowEnd = new Date(startDate.getTime() + 60 * 1000);
      const existingEvents = await Calendar.getEventsAsync([calendarId], windowStart, windowEnd);
      const eventTitle = `Consulta — Dr. ${item.doctorName}`;
      if (existingEvents.find((e) => e.title === eventTitle)) {
        showAlert("⚠️ Já salvo", `Esta consulta já está no seu calendário.`);
        return;
      }
      const notes = [
        item.specialty ? `Especialidade: ${item.specialty}` : "",
        item.insurance ? `Convênio: ${item.insurance}` : "",
        item.location ? `Local: ${item.location}` : "",
        item.notes ? `Observações: ${item.notes}` : "",
      ].filter(Boolean).join("\n");
      await Calendar.createEventAsync(calendarId, {
        title: eventTitle, startDate, endDate,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: item.location || undefined,
        notes: notes || undefined,
        alarms: [{ relativeOffset: -60 }, { relativeOffset: -1440 }],
      });
      showAlert("✅ Salvo!", `Consulta adicionada ao seu calendário.`);
    } catch (e: any) {
      showAlert("Erro", e.message ?? "Não foi possível salvar no calendário.");
    }
  };

  const handleOpenMap = async (location: string) => {
    const encoded = encodeURIComponent(location);
    const url = Platform.OS === "ios" ? `maps:?q=${encoded}` : `geo:0,0?q=${encoded}`;
    const canOpen = await Linking.canOpenURL(url);
    await Linking.openURL(canOpen ? url : `https://maps.google.com/?q=${encoded}`);
  };

  const handleShare = async (item: any) => {
    try {
      const dateBR = item.date.split("-").reverse().join("/");
      const lines = [
        `📅 *Consulta Médica*`, ``,
        `👨‍⚕️ Dr. ${item.doctorName}`,
        ...(item.specialty ? [`🩺 ${item.specialty}`] : []),
        `📆 ${dateBR} às ${item.time}`,
        ...(item.location ? [`📍 ${item.location}`] : []),
        ...(item.insurance ? [`🏥 Convênio: ${item.insurance}`] : []),
        ...(item.notes ? [`📝 ${item.notes}`] : []),
      ];
      await Share.share({ message: lines.join("\n"), title: `Consulta — Dr. ${item.doctorName}` });
    } catch (_) {}
  };

  const handleCancel = async (id: number) => {
    showConfirm(
      "Cancelar consulta",
      "Tem certeza que deseja cancelar esta consulta?",
      async () => {
        try {
          await updateStatus.mutateAsync({ appointmentId: id, status: "cancelled" });
          utils.appointments.listForPatient.invalidate();
          await cancelAppointmentReminders(id);
        } catch (e: any) {
          showAlert("Erro", e.message ?? "Não foi possível cancelar.");
        }
      },
      "Cancelar consulta"
    );
  };

  // ─── Card renderer ──────────────────────────────────────────────────────────
  const renderAppt = (item: any, showActions: boolean) => {
    const st = getStatus(item.status);
    return (
      <View key={item.id} style={[styles.card, { backgroundColor: colors.surface }]}>
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: st.color }]} />

        <View style={styles.cardInner}>
          {/* Date badge + doctor info row */}
          <View style={styles.topRow}>
            <View style={[styles.dateBadge, { backgroundColor: st.color + "18" }]}>
              <Text style={[styles.dateDay, { color: st.color }]}>{item.date.split("-")[2]}</Text>
              <Text style={[styles.dateMonth, { color: st.color }]}>{monthAbbr(item.date)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.doctorName, { color: colors.foreground }]} numberOfLines={1}>
                Dr. {item.doctorName}
              </Text>
              {item.specialty ? (
                <Text style={styles.specialty} numberOfLines={1}>{item.specialty}</Text>
              ) : null}
              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: colors.muted }]}>🕐 {item.time}</Text>
                {item.insurance ? (
                  <Text style={[styles.metaText, { color: colors.muted }]}>  ·  {item.insurance}</Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity onPress={() => handleShare(item)} style={styles.shareBtn} activeOpacity={0.7}>
              <IconSymbol name="square.and.arrow.up" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Location */}
          {item.location ? (
            <TouchableOpacity onPress={() => handleOpenMap(item.location)} activeOpacity={0.7} style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={[styles.locationText, { color: "#0D5BBF" }]} numberOfLines={2}>{item.location}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Notes */}
          {item.notes ? (
            <Text style={[styles.notesText, { color: colors.muted }]} numberOfLines={2}>
              📋 {item.notes}
            </Text>
          ) : null}

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.color }]}>{st.icon}  {st.label}</Text>
          </View>

          {/* Action buttons */}
          {showActions && (
            <View style={styles.actionsGrid}>
              {item.status === "scheduled" && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: "#16A34A" }]}
                  onPress={() => handleConfirm(item.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>✓  Confirmar presença</Text>
                </TouchableOpacity>
              )}
              {(item.status === "scheduled" || item.status === "confirmed") && (
                <View style={styles.secondaryRow}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { backgroundColor: "#FEF3C7", flex: 1 }]}
                    onPress={() => { setRescheduleModalId(item.id); setRescheduleNote(""); }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.secondaryBtnText, { color: "#92400E" }]}>🔄  Reagendar</Text>
                  </TouchableOpacity>
                  {item.status === "scheduled" && (
                    <TouchableOpacity
                      style={[styles.secondaryBtn, { backgroundColor: "#FEE2E2" }]}
                      onPress={() => handleCancel(item.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.secondaryBtnText, { color: "#DC2626" }]}>Cancelar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Past actions */}
          {!showActions && (
            <View style={styles.secondaryRow}>
              {item.status === "completed" && item.doctorId && (
                <TouchableOpacity
                  style={[styles.secondaryBtn, { backgroundColor: "#FEF3C7", flex: 1 }]}
                  onPress={() => { setReviewAppt(item); setReviewRating(0); setReviewComment(""); }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.secondaryBtnText, { color: "#92400E" }]}>⭐  Avaliar médico</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Save to calendar */}
          {item.status !== "cancelled" && (
            <TouchableOpacity
              style={styles.calendarBtn}
              onPress={() => handleSaveToCalendar(item)}
              activeOpacity={0.85}
            >
              <IconSymbol name="calendar" size={14} color="#0D5BBF" />
              <Text style={styles.calendarBtnText}>Salvar no calendário</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with gradient-like layered background */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)" as any); }}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <IconSymbol name="arrow.left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Minhas Consultas</Text>
            {!apptQuery.isLoading && (
              <Text style={styles.headerSub}>
                {upcoming.length} próxima{upcoming.length !== 1 ? "s" : ""}  ·  {past.length} no histórico
              </Text>
            )}
          </View>
        </View>
        {/* Curved bottom */}
        <View style={styles.headerCurve} />
      </View>

      {apptQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0D5BBF" />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Carregando consultas...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48, gap: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Upcoming section */}
          <View>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: "#0D5BBF" }]} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Próximas</Text>
              {upcoming.length > 0 && (
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{upcoming.length}</Text>
                </View>
              )}
            </View>
            {upcoming.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhuma consulta agendada</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                  Seu médico irá agendar consultas e elas aparecerão aqui.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {upcoming.map((a) => renderAppt(a, true))}
              </View>
            )}
          </View>

          {/* History section */}
          {past.length > 0 && (
            <View>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: colors.muted }]} />
                <Text style={[styles.sectionTitle, { color: colors.muted }]}>Histórico</Text>
                <View style={[styles.sectionBadge, { backgroundColor: colors.border }]}>
                  <Text style={[styles.sectionBadgeText, { color: colors.muted }]}>{past.length}</Text>
                </View>
              </View>
              <View style={{ gap: 12 }}>
                {past.slice(0, 20).map((a) => renderAppt(a, false))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Reschedule Modal */}
      <Modal visible={rescheduleModalId !== null} transparent animationType="slide" onRequestClose={() => setRescheduleModalId(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Solicitar reagendamento</Text>
                <TouchableOpacity onPress={() => setRescheduleModalId(null)} style={styles.modalClose}>
                  <IconSymbol name="xmark" size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                O médico será notificado e entrará em contato para definir uma nova data.
              </Text>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Motivo (opcional)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={rescheduleNote}
                onChangeText={setRescheduleNote}
                placeholder="Ex: Conflito de agenda, viagem, emergência..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#D97706" }, reschedulePending && { opacity: 0.6 }]}
                onPress={handleRequestReschedule}
                disabled={reschedulePending}
                activeOpacity={0.85}
              >
                {reschedulePending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.confirmBtnText}>Enviar solicitação</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Review Modal */}
      <Modal visible={reviewAppt !== null} transparent animationType="slide" onRequestClose={() => setReviewAppt(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Avaliar consulta</Text>
                <TouchableOpacity onPress={() => setReviewAppt(null)} style={styles.modalClose}>
                  <IconSymbol name="xmark" size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
              {reviewAppt && (
                <View style={[styles.reviewDoctorChip, { backgroundColor: "#EBF4FF" }]}>
                  <Text style={styles.reviewDoctorText}>Dr. {reviewAppt.doctorName}</Text>
                  {reviewAppt.specialty ? (
                    <Text style={styles.reviewSpecialtyText}> · {reviewAppt.specialty}</Text>
                  ) : null}
                </View>
              )}
              <Text style={[styles.fieldLabel, { color: colors.muted, textAlign: "center", marginTop: 4 }]}>
                Como foi sua experiência?
              </Text>
              <StarPicker value={reviewRating} onChange={setReviewRating} />
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Comentário (opcional)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="Compartilhe sua experiência com outros pacientes..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#F59E0B" }, (reviewPending || reviewRating === 0) && { opacity: 0.5 }]}
                onPress={handleSubmitReview}
                disabled={reviewPending || reviewRating === 0}
                activeOpacity={0.85}
              >
                {reviewPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.confirmBtnText}>Enviar avaliação ⭐</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: "#0D5BBF",
    paddingBottom: 0,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerCurve: {
    height: 24,
    backgroundColor: "#F0F4FF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff", lineHeight: 28 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2, lineHeight: 18 },

  // ── Loading ─────────────────────────────────────────────────────────────────
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, lineHeight: 20 },

  // ── Section headers ─────────────────────────────────────────────────────────
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 17, fontWeight: "700", flex: 1, lineHeight: 22 },
  sectionBadge: {
    backgroundColor: "#0D5BBF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  sectionBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff", lineHeight: 16 },

  // ── Empty state ──────────────────────────────────────────────────────────────
  emptyCard: {
    borderRadius: 20,
    padding: 36,
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  emptyIcon: { fontSize: 40, lineHeight: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  // ── Appointment card ─────────────────────────────────────────────────────────
  card: {
    borderRadius: 20,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  accentBar: { width: 5 },
  cardInner: { flex: 1, padding: 16, gap: 10 },

  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dateBadge: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dateDay: { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  dateMonth: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, lineHeight: 15 },

  doctorName: { fontSize: 16, fontWeight: "700", lineHeight: 20 },
  specialty: { fontSize: 13, fontWeight: "600", color: "#0D5BBF", marginTop: 1, lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  metaText: { fontSize: 13, lineHeight: 18 },
  shareBtn: { padding: 6, marginTop: -2 },

  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  locationIcon: { fontSize: 13, lineHeight: 18 },
  locationText: { fontSize: 13, lineHeight: 18, flex: 1, fontWeight: "500" },

  notesText: { fontSize: 13, lineHeight: 18 },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: "700", lineHeight: 16 },

  // ── Action buttons ───────────────────────────────────────────────────────────
  actionsGrid: { gap: 8 },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#fff", lineHeight: 20 },
  secondaryRow: { flexDirection: "row", gap: 8 },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  secondaryBtnText: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  calendarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#EBF4FF",
  },
  calendarBtnText: { fontSize: 13, fontWeight: "600", color: "#0D5BBF", lineHeight: 18 },

  // ── Modals ───────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", lineHeight: 24 },
  modalSubtitle: { fontSize: 14, lineHeight: 20 },
  fieldLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", lineHeight: 16 },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 90,
  },
  confirmBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmBtnText: { fontSize: 16, fontWeight: "700", color: "#fff", lineHeight: 22 },
  reviewDoctorChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  reviewDoctorText: { fontSize: 14, fontWeight: "700", color: "#0D5BBF", lineHeight: 20 },
  reviewSpecialtyText: { fontSize: 14, color: "#0D5BBF", lineHeight: 20 },
});

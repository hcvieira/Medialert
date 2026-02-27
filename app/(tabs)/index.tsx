import { useEffect, useCallback } from "react";
import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp } from "@/lib/app-context";
import { useColors } from "@/hooks/use-colors";
import { DoseRecord } from "@/lib/storage";
import { trpc } from "@/lib/trpc";
import { useAuthContext } from "@/lib/auth-context";
import { getTodayString } from "@/lib/storage";
import { scheduleServerMedicationNotifications } from "@/lib/notifications";
import { useMemo } from "react";
import { useOfflineSync } from "@/lib/offline-sync";
import { mutationQueue, offlineCache, CACHE_KEYS } from "@/lib/offline-store";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDate(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(time: string): string {
  return time;
}

function getStatusLabel(status: DoseRecord["status"]): string {
  switch (status) {
    case "taken": return "Tomado";
    case "missed": return "Perdido";
    default: return "Pendente";
  }
}

type DoseCardProps = {
  record: DoseRecord & { isServer?: boolean };
  onMarkTaken: (record: DoseRecord) => void;
  colors: ReturnType<typeof useColors>;
};

function DoseCard({ record, onMarkTaken, colors }: DoseCardProps) {
  const isTaken = record.status === "taken";
  const isMissed = record.status === "missed";
  const isServer = (record as any).isServer === true;

  const statusColor = isTaken
    ? colors.success
    : isMissed
    ? colors.error
    : colors.warning;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <Text style={[styles.medName, { color: colors.foreground }]} numberOfLines={1}>
            {record.medicationName}
          </Text>
          {isServer && (
            <View style={styles.prescribedBadge}>
              <IconSymbol name="stethoscope" size={10} color="#0D5BBF" />
              <Text style={styles.prescribedBadgeText}>Prescrito pelo médico</Text>
            </View>
          )}
          <View style={styles.timeRow}>
            <IconSymbol name="clock.fill" size={13} color={colors.muted} />
            <Text style={[styles.timeText, { color: colors.muted }]}>
              {formatTime(record.scheduledTime)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(record.status)}
            </Text>
          </View>
        </View>
        {!isTaken && (
          <TouchableOpacity
            style={[styles.takeButton, { backgroundColor: colors.primary }]}
            onPress={() => onMarkTaken(record)}
            activeOpacity={0.8}
          >
            <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
            <Text style={styles.takeButtonText}>Tomei</Text>
          </TouchableOpacity>
        )}
        {isTaken && (
          <View style={[styles.takenIcon, { backgroundColor: colors.success + "22" }]}>
            <IconSymbol name="checkmark.circle.fill" size={28} color={colors.success} />
          </View>
        )}
      </View>
    </View>
  );
}

// Server-side dose record type
type ServerDoseRecord = {
  id: number;
  medicationId: number;
  medicationName: string;
  scheduledTime: string;
  date: string;
  status: "pending" | "taken" | "missed";
  takenAt?: Date | null;
};

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuthContext();
  const { getTodayDoses, markDoseTaken, ensureTodayDoses, isLoading, loadError, reload, medications } = useApp();
  const { isOnline } = useOfflineSync();

  const today = getTodayString();

  // Fetch user profile to get photo
  const userProfileQuery = trpc.user.getProfile.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60_000,
  });
  const userPhotoUrl = userProfileQuery.data?.photoUrl ?? null;

  // Fetch upcoming appointments for the patient
  const appointmentsQuery = trpc.appointments.listForPatient.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60_000,
  });

  // Get the next upcoming appointment (soonest future or today)
  const nextAppointment = useMemo(() => {
    const appts = appointmentsQuery.data ?? [];
    const today = getTodayString();
    const upcoming = appts
      .filter((a: any) => a.status !== "cancelled" && a.status !== "completed" && a.date >= today)
      .sort((a: any, b: any) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      });
    return upcoming[0] ?? null;
  }, [appointmentsQuery.data]);

  // Fetch server-side medications prescribed by doctors
  const serverMedsQuery = trpc.medications.listMine.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
  });

  // Ensure today's server dose records exist and fetch them
  const ensureServerDoses = trpc.medications.ensureMyDosesToday.useMutation();
  const serverDosesQuery = trpc.medications.listMyDosesToday.useQuery(
    { date: today },
    { enabled: !!user, staleTime: 10_000 }
  );

  // Save doses to offline cache whenever fresh data arrives from server
  useEffect(() => {
    if (user && serverDosesQuery.data) {
      offlineCache.set(CACHE_KEYS.todayDoses(user.id), serverDosesQuery.data);
    }
  }, [serverDosesQuery.data, user]);
  const markServerTaken = trpc.medications.markTaken.useMutation({
    onSuccess: () => serverDosesQuery.refetch(),
  });
  const checkAdherenceAlert = trpc.invite.checkAdherenceAlert.useMutation();

  // Ensure server doses exist on mount
  useEffect(() => {
    if (user) {
      ensureServerDoses.mutate({ date: today });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, today]);

  // Check for overdue doses every 5 minutes and notify caregiver
  const checkOverdue = trpc.doses.checkOverdue.useMutation();
  useEffect(() => {
    if (!user || Platform.OS === "web") return;
    const run = () => checkOverdue.mutate({ patientId: user.id, date: today });
    run(); // run once on mount
    const interval = setInterval(run, 5 * 60 * 1000); // every 5 min
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, today]);

  // Schedule local notifications for server-prescribed medications
  useEffect(() => {
    const meds = serverMedsQuery.data;
    if (!meds || meds.length === 0) return;
    if (Platform.OS === "web") return;
    meds.forEach((med) => {
      const times = med.times.map((t: { time: string }) => t.time);
      scheduleServerMedicationNotifications(med.id, med.name, med.dosage, times).catch(() => {});
    });
  }, [serverMedsQuery.data]);

  useEffect(() => {
    ensureTodayDoses();
  }, [ensureTodayDoses]);

  const localTodayDoses = getTodayDoses();
  const serverDoses: ServerDoseRecord[] = (serverDosesQuery.data ?? []) as ServerDoseRecord[];

  // Combine local + server doses
  const allTodayDoses = [
    ...localTodayDoses.map((d) => ({ ...d, isServer: false })),
    ...serverDoses.map((d) => ({
      id: `server-${d.id}`,
      medicationId: String(d.medicationId),
      medicationName: d.medicationName,
      scheduledTime: d.scheduledTime,
      date: d.date,
      status: d.status,
      takenAt: d.takenAt ? new Date(d.takenAt).toISOString() : undefined,
      isServer: true,
      serverId: d.id,
    })),
  ].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const hasServerMeds = (serverMedsQuery.data?.length ?? 0) > 0;
  const takenCount = allTodayDoses.filter((d) => d.status === "taken").length;
  const totalCount = allTodayDoses.length;
  const pendingCount = totalCount - takenCount;

  const handleMarkTaken = useCallback(
    async (record: DoseRecord & { isServer?: boolean; serverId?: number }) => {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if ((record as any).isServer && (record as any).serverId) {
        if (isOnline) {
          // Online: send to server immediately
          await markServerTaken.mutateAsync({ doseId: (record as any).serverId });
        } else {
          // Offline: mark locally in cache and queue for later sync
          const doseId = (record as any).serverId as number;
          // Optimistically update cached doses
          if (user) {
            const cacheKey = CACHE_KEYS.todayDoses(user.id);
            const cached = await offlineCache.get<typeof serverDoses>(cacheKey);
            if (cached) {
              const updated = cached.map((d) =>
                d.id === doseId ? { ...d, status: "taken" as const, takenAt: new Date() } : d
              );
              await offlineCache.set(cacheKey, updated);
            }
          }
          // Queue mutation for sync when back online
          await mutationQueue.add({
            type: "dose.confirmTaken",
            payload: { doseId },
          });
          // Refresh local query to reflect optimistic update
          serverDosesQuery.refetch();
        }
      } else {
        await markDoseTaken(record);
      }
      // Fire-and-forget: check adherence and alert caregiver if below 50% (only online)
      if (isOnline) checkAdherenceAlert.mutate({ date: today });
    },
    [markDoseTaken, markServerTaken, checkAdherenceAlert, today, isOnline, user, serverDoses, serverDosesQuery]
  );

  const handleAddMedication = useCallback(() => {
    router.push("/medication/add");
  }, [router]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (loadError) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 8, textAlign: "center" }}>Erro ao carregar seus dados</Text>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginBottom: 24 }}>Verifique sua conexão e tente novamente.</Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 }}
            onPress={reload}
            activeOpacity={0.8}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.push("/settings" as any)}
            activeOpacity={0.8}
            style={styles.avatarBtn}
          >
            {userPhotoUrl
              ? <Image source={{ uri: userPhotoUrl }} style={styles.avatarImg} />
              : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {(user?.name ?? "U").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
          </TouchableOpacity>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {(user?.name ?? "").split(" ")[0]} 👋</Text>
            <Text style={styles.dateText}>{formatDate()}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddMedication}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Incomplete Profile Banner */}
      {userProfileQuery.isFetched && (!userPhotoUrl || !(userProfileQuery.data?.name ?? user?.name)) && (
        <TouchableOpacity
          style={[styles.incompleteBanner, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}
          onPress={() => router.push("/settings" as any)}
          activeOpacity={0.85}
        >
          <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#D97706" />
          <Text style={[styles.incompleteBannerText, { color: "#92400E" }]}>
            {!userPhotoUrl && !(userProfileQuery.data?.name ?? user?.name)
              ? "Adicione sua foto e nome completo para personalizar seu perfil"
              : !userPhotoUrl
              ? "Adicione uma foto de perfil para personalizar sua conta"
              : "Complete seu nome de exibição nas configurações"}
          </Text>
          <IconSymbol name="chevron.right" size={14} color="#D97706" />
        </TouchableOpacity>
      )}

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryNumber, { color: colors.primary }]}>{totalCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryNumber, { color: colors.success }]}>{takenCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Tomados</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryNumber, { color: colors.warning }]}>{pendingCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Pendentes</Text>
        </View>
      </View>

      {/* Quick Access — Doctor Module */}
      <View style={styles.quickAccessRow}>
        <TouchableOpacity
          style={[styles.quickAccessBtn, { backgroundColor: "#EBF4FF", borderColor: "#BFD9FF" }]}
          onPress={() => router.push("/patient/appointments" as any)}
          activeOpacity={0.85}
        >
          <IconSymbol name="calendar" size={22} color="#0D5BBF" />
          <Text style={[styles.quickAccessLabel, { color: "#0D5BBF" }]}>Consultas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickAccessBtn, { backgroundColor: "#EBF4FF", borderColor: "#BFD9FF" }]}
          onPress={() => router.push("/patient/my-doctors" as any)}
          activeOpacity={0.85}
        >
          <IconSymbol name="stethoscope" size={22} color="#0D5BBF" />
          <Text style={[styles.quickAccessLabel, { color: "#0D5BBF" }]}>Meus Médicos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickAccessBtn, { backgroundColor: "#EBF4FF", borderColor: "#BFD9FF" }]}
          onPress={() => router.push("/patient/doctor-directory" as any)}
          activeOpacity={0.85}
        >
          <IconSymbol name="magnifyingglass" size={22} color="#0D5BBF" />
          <Text style={[styles.quickAccessLabel, { color: "#0D5BBF" }]}>Buscar Médico</Text>
        </TouchableOpacity>
      </View>

      {/* Next Appointment Banner */}
      {nextAppointment && (
        <TouchableOpacity
          style={styles.apptBanner}
          onPress={() => router.push("/patient/appointments" as any)}
          activeOpacity={0.88}
        >
          <View style={styles.apptBannerLeft}>
            <View style={styles.apptIconCircle}>
              <IconSymbol name="calendar" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.apptBannerLabel}>Próxima consulta</Text>
              <Text style={styles.apptBannerDate} numberOfLines={1}>
                {nextAppointment.date.split("-").reverse().join("/")} às {nextAppointment.time}
              </Text>
              <Text style={styles.apptBannerDoctor} numberOfLines={1}>
                {nextAppointment.doctorName}
                {nextAppointment.specialty ? ` · ${nextAppointment.specialty}` : ""}
              </Text>
              {nextAppointment.location ? (
                <Text style={styles.apptBannerLocation} numberOfLines={1}>
                  📍 {nextAppointment.location}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.apptStatusBadge, {
            backgroundColor: nextAppointment.status === "confirmed" ? "#D1FAE5" : "#FEF3C7",
          }]}>
            <Text style={[styles.apptStatusText, {
              color: nextAppointment.status === "confirmed" ? "#065F46" : "#92400E",
            }]}>
              {nextAppointment.status === "confirmed" ? "Confirmada" : "Agendada"}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Doses de Hoje
        </Text>
      </View>

      {/* Dose List */}
      {medications.length === 0 && !hasServerMeds ? (
        <View style={styles.emptyState}>
          <IconSymbol name="pill.fill" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Nenhum medicamento cadastrado
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Toque no botão + para adicionar seu primeiro medicamento
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={handleAddMedication}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Adicionar Medicamento</Text>
          </TouchableOpacity>
        </View>
      ) : allTodayDoses.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="checkmark.circle.fill" size={56} color={colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Tudo em dia!
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Não há doses agendadas para hoje
          </Text>
        </View>
      ) : (
        <FlatList
          data={allTodayDoses as any[]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DoseCard record={item} onMarkTaken={handleMarkTaken} colors={colors} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    textTransform: "capitalize",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  incompleteBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  incompleteBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  summaryNumber: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  quickAccessRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  quickAccessBtn: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
  },
  quickAccessLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  statusBar: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  medName: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  takeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  takeButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  takenIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 26,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  prescribedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
    backgroundColor: "#EBF4FF",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prescribedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0D5BBF",
  },
  apptBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#EBF4FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BFD9FF",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  apptBannerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  apptIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0D5BBF",
    alignItems: "center",
    justifyContent: "center",
  },
  apptBannerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0D5BBF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  apptBannerDate: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0C2A5E",
    lineHeight: 20,
  },
  apptBannerDoctor: {
    fontSize: 13,
    color: "#1E3A6E",
    lineHeight: 18,
    marginTop: 2,
  },
  apptBannerLocation: {
    fontSize: 12,
    color: "#4A6FA5",
    lineHeight: 16,
    marginTop: 2,
  },
  apptStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  apptStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
});

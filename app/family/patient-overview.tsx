import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

type DoseRecord = {
  id: number;
  medicationId: number;
  medicationName: string;
  scheduledTime: string;
  date: string;
  status: "pending" | "taken" | "missed" | "skipped";
  takenAt?: Date | null;
};

type Medication = {
  id: number;
  name: string;
  dosage: string;
  color: string;
  notes?: string | null;
  active: boolean;
  times: { time: string }[];
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: any;
}) {
  return (
    <View style={[statStyles.card, { backgroundColor: color + "15", borderColor: color + "30" }]}>
      <IconSymbol name={icon} size={20} color={color} />
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={[statStyles.label, { color: color + "CC" }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  value: { fontSize: 22, fontWeight: "800", lineHeight: 28 },
  label: { fontSize: 11, fontWeight: "600", textAlign: "center", lineHeight: 14 },
});

// ─── Dose Card ────────────────────────────────────────────────────────────────
function DoseCard({ dose, colors }: { dose: DoseRecord; colors: ReturnType<typeof useColors> }) {
  const isTaken = dose.status === "taken";
  const isMissed = dose.status === "missed";
  const isSkipped = dose.status === "skipped";
  const statusColor = isTaken
    ? colors.success
    : isMissed || isSkipped
    ? colors.error
    : colors.warning;
  const statusLabel = isTaken ? "Tomado" : isMissed ? "Perdido" : isSkipped ? "Pulado" : "Pendente";
  const statusIcon: any = isTaken
    ? "checkmark.circle.fill"
    : isMissed || isSkipped
    ? "xmark.circle.fill"
    : "clock.fill";

  const takenTime =
    isTaken && dose.takenAt
      ? new Date(dose.takenAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : null;

  return (
    <View style={[styles.doseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.doseStatusBar, { backgroundColor: statusColor }]} />
      <View style={styles.doseContent}>
        <View style={styles.doseLeft}>
          <Text style={[styles.doseMedName, { color: colors.foreground }]} numberOfLines={1}>
            {dose.medicationName}
          </Text>
          <View style={styles.doseTimeRow}>
            <IconSymbol name="clock.fill" size={12} color={colors.muted} />
            <Text style={[styles.doseTimeText, { color: colors.muted }]}>
              {dose.scheduledTime}
              {takenTime ? ` · Tomado às ${takenTime}` : ""}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          <IconSymbol name={statusIcon} size={14} color={statusColor} />
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Med Card ─────────────────────────────────────────────────────────────────
function MedCard({ med, colors }: { med: Medication; colors: ReturnType<typeof useColors> }) {
  const times = med.times?.map((t) => t.time).join("  ·  ") ?? "—";
  return (
    <View style={[styles.medCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.medColorDot, { backgroundColor: med.color || colors.primary }]} />
      <View style={styles.medInfo}>
        <Text style={[styles.medName, { color: colors.foreground }]} numberOfLines={1}>
          {med.name}
        </Text>
        <Text style={[styles.medDosage, { color: colors.muted }]}>{med.dosage}</Text>
        {med.notes ? (
          <Text style={[styles.medNotes, { color: colors.muted }]} numberOfLines={2}>
            {med.notes}
          </Text>
        ) : null}
      </View>
      <View style={styles.medTimes}>
        <IconSymbol name="clock.fill" size={12} color={colors.muted} />
        <Text style={[styles.medTimesText, { color: colors.muted }]}>{times}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function PatientOverviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const params = useLocalSearchParams<{ patientId: string; patientName: string }>();
  const patientId = Number(params.patientId ?? 0);
  const patientName = params.patientName ?? "Paciente";
  const today = getTodayString();

  const medsQuery = trpc.invite.getPatientMedications.useQuery(
    { patientId },
    { enabled: patientId > 0, staleTime: 30_000 }
  );

  const summaryQuery = trpc.invite.getPatientDosesSummary.useQuery(
    { patientId, date: today },
    { enabled: patientId > 0, staleTime: 10_000 }
  );

  const ensureDoses = trpc.invite.ensurePatientDosesToday.useMutation();

  useEffect(() => {
    if (patientId > 0) {
      ensureDoses.mutate({ patientId, date: today });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, today]);

  const summary = summaryQuery.data;
  const doses = (summary?.doses ?? []) as DoseRecord[];
  const meds = ((medsQuery.data ?? []) as Medication[]).filter((m) => m.active);

  const takenCount = summary?.taken ?? 0;
  const pendingCount = summary?.pending ?? 0;
  const skippedCount = summary?.skipped ?? 0;
  const totalCount = summary?.total ?? 0;
  const allTaken = totalCount > 0 && takenCount === totalCount;
  const progressPct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  const isLoading = medsQuery.isLoading || summaryQuery.isLoading;
  const isRefreshing = medsQuery.isFetching || summaryQuery.isFetching;

  const handleRefresh = () => {
    medsQuery.refetch();
    summaryQuery.refetch();
  };

  const initials = patientName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)" as any);
          }}
          style={styles.backBtn}
        >
          <IconSymbol name="chevron.left" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {patientName}
            </Text>
            <Text style={styles.headerSubtitle}>Acompanhamento de hoje</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
          <IconSymbol name="arrow.clockwise" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0D5BBF" />
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#0D5BBF" />
          }
          ListHeaderComponent={
            <View>
              {/* ── Data ── */}
              <Text style={[styles.dateLabel, { color: colors.muted }]}>{formatDate()}</Text>

              {/* ── Stat Cards ── */}
              <View style={styles.statsRow}>
                <StatCard label="Tomados" value={takenCount} color={colors.success} icon="checkmark.circle.fill" />
                <StatCard label="Pendentes" value={pendingCount} color={colors.warning} icon="clock.fill" />
                <StatCard label="Pulados" value={skippedCount} color={colors.error} icon="xmark.circle.fill" />
              </View>

              {/* ── Progress ── */}
              <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.progressInfo}>
                  <Text style={[styles.progressLabel, { color: colors.foreground }]}>
                    {takenCount} de {totalCount} doses tomadas
                  </Text>
                  <Text style={[styles.progressPct, { color: allTaken ? colors.success : colors.primary }]}>
                    {progressPct}%
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progressPct}%` as any,
                        backgroundColor: allTaken ? colors.success : colors.primary,
                      },
                    ]}
                  />
                </View>
                {allTaken && totalCount > 0 && (
                  <View
                    style={[
                      styles.allTakenBadge,
                      { backgroundColor: colors.success + "15", borderColor: colors.success + "40" },
                    ]}
                  >
                    <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
                    <Text style={[styles.allTakenText, { color: colors.success }]}>
                      Todos os medicamentos foram tomados hoje! 🎉
                    </Text>
                  </View>
                )}
              </View>

              {/* ── Doses do dia ── */}
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Doses de hoje</Text>
              {doses.length === 0 ? (
                <View style={[styles.emptySection, { borderColor: colors.border }]}>
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    Nenhuma dose registrada para hoje
                  </Text>
                </View>
              ) : (
                doses
                  .slice()
                  .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                  .map((dose) => <DoseCard key={dose.id} dose={dose} colors={colors} />)
              )}

              {/* ── Medicamentos prescritos ── */}
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Medicamentos prescritos</Text>
              {meds.length === 0 ? (
                <View style={[styles.emptySection, { borderColor: colors.border }]}>
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    Nenhum medicamento prescrito pelo médico
                  </Text>
                </View>
              ) : (
                meds.map((med) => <MedCard key={med.id} med={med} colors={colors} />)
              )}

              <View style={{ height: 32 }} />
            </View>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: "#0D5BBF",
  },
  backBtn: { padding: 6 },
  refreshBtn: { padding: 6 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff", lineHeight: 22 },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 16, marginTop: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  dateLabel: {
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    textTransform: "capitalize",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },

  progressCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  progressInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  progressPct: { fontSize: 15, fontWeight: "800", lineHeight: 20 },
  progressBar: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  allTakenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  allTakenText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySection: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptyText: { fontSize: 14, lineHeight: 20 },

  doseCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  doseStatusBar: { width: 4 },
  doseContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  doseLeft: { flex: 1, gap: 4 },
  doseMedName: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  doseTimeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  doseTimeText: { fontSize: 12, lineHeight: 16 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "600", lineHeight: 16 },

  medCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  medColorDot: { width: 14, height: 14, borderRadius: 7, flexShrink: 0 },
  medInfo: { flex: 1, gap: 2 },
  medName: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  medDosage: { fontSize: 13, lineHeight: 18 },
  medNotes: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  medTimes: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 },
  medTimesText: { fontSize: 12, lineHeight: 16 },
});

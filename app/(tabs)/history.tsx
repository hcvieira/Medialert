import { useMemo } from "react";
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  SectionList,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp } from "@/lib/app-context";
import { useColors } from "@/hooks/use-colors";
import { DoseRecord } from "@/lib/storage";

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dateStr === today) return "Hoje";
  if (dateStr === yesterday) return "Ontem";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function formatTakenAt(takenAt?: string): string {
  if (!takenAt) return "";
  return new Date(takenAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DoseItemProps = {
  record: DoseRecord;
  colors: ReturnType<typeof useColors>;
};

function DoseItem({ record, colors }: DoseItemProps) {
  const isTaken = record.status === "taken";
  const isMissed = record.status === "missed";

  const statusColor = isTaken ? colors.success : isMissed ? colors.error : colors.warning;
  const statusLabel = isTaken ? "Tomado" : isMissed ? "Perdido" : "Pendente";
  const statusIcon = isTaken
    ? "checkmark.circle.fill"
    : isMissed
    ? "xmark.circle.fill"
    : "clock.fill";

  return (
    <View style={[styles.doseItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statusIconContainer, { backgroundColor: statusColor + "20" }]}>
        <IconSymbol name={statusIcon as any} size={22} color={statusColor} />
      </View>
      <View style={styles.doseInfo}>
        <Text style={[styles.doseMedName, { color: colors.foreground }]} numberOfLines={1}>
          {record.medicationName}
        </Text>
        <Text style={[styles.doseTime, { color: colors.muted }]}>
          Agendado: {record.scheduledTime}
          {isTaken && record.takenAt ? ` · Tomado: ${formatTakenAt(record.takenAt)}` : ""}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
}

type Section = {
  title: string;
  data: DoseRecord[];
  taken: number;
  total: number;
};

export default function HistoryScreen() {
  const colors = useColors();
  const { doseRecords } = useApp();

  const sections: Section[] = useMemo(() => {
    const byDate: Record<string, DoseRecord[]> = {};
    for (const record of doseRecords) {
      if (!byDate[record.date]) byDate[record.date] = [];
      byDate[record.date].push(record);
    }

    return Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a)) // newest first
      .map(([date, records]) => {
        const sorted = [...records].sort((a, b) =>
          a.scheduledTime.localeCompare(b.scheduledTime)
        );
        const taken = sorted.filter((r) => r.status === "taken").length;
        return {
          title: formatDateLabel(date),
          data: sorted,
          taken,
          total: sorted.length,
        };
      });
  }, [doseRecords]);

  const totalTaken = doseRecords.filter((r) => r.status === "taken").length;
  const totalRecords = doseRecords.length;
  const adherencePercent =
    totalRecords > 0 ? Math.round((totalTaken / totalRecords) * 100) : 0;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Histórico</Text>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
          Acompanhe seu tratamento
        </Text>
      </View>

      {/* Adherence Card */}
      {totalRecords > 0 && (
        <View style={[styles.adherenceCard, { backgroundColor: colors.primary, marginHorizontal: 16, marginTop: 16, borderRadius: 16 }]}>
          <View style={styles.adherenceLeft}>
            <Text style={styles.adherenceLabel}>Aderência ao tratamento</Text>
            <Text style={styles.adherencePercent}>{adherencePercent}%</Text>
            <Text style={styles.adherenceDetail}>
              {totalTaken} de {totalRecords} doses tomadas
            </Text>
          </View>
          <View style={styles.adherenceRight}>
            <View style={[styles.progressCircle, { borderColor: "rgba(255,255,255,0.3)" }]}>
              <Text style={styles.progressText}>{adherencePercent}%</Text>
            </View>
          </View>
        </View>
      )}

      {/* History List */}
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="clock.fill" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Sem histórico ainda
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Comece a tomar seus medicamentos para ver o histórico aqui
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DoseItem record={item} colors={colors} />}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {section.title}
              </Text>
              <View style={[styles.sectionBadge, {
                backgroundColor: section.taken === section.total
                  ? colors.success + "20"
                  : colors.warning + "20"
              }]}>
                <Text style={[styles.sectionBadgeText, {
                  color: section.taken === section.total ? colors.success : colors.warning
                }]}>
                  {section.taken}/{section.total}
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  adherenceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  adherenceLeft: {
    flex: 1,
    gap: 4,
  },
  adherenceLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "500",
  },
  adherencePercent: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 44,
  },
  adherenceDetail: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  adherenceRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  progressText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  doseItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  statusIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  doseInfo: {
    flex: 1,
    gap: 3,
  },
  doseMedName: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  doseTime: {
    fontSize: 12,
    lineHeight: 17,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});

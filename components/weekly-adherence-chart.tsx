import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";

type DayData = {
  date: string;
  taken: number;
  total: number;
  pct: number | null;
};

type MedData = {
  medicationId: number;
  name: string;
  days: DayData[];
};

type Props = {
  data: {
    days: string[];
    medications: MedData[];
  };
  medColors?: Record<number, string>;
};

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getBarColor(pct: number | null): string {
  if (pct === null) return "#E5E7EB"; // no data
  if (pct >= 80) return "#16A34A";
  if (pct >= 50) return "#F59E0B";
  return "#EF4444";
}

function getDayLabel(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return DAY_LABELS[d.getDay()];
}

export function WeeklyAdherenceChart({ data, medColors = {} }: Props) {
  const colors = useColors();

  if (!data || data.medications.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.muted }]}>Sem dados de adesão nos últimos 7 dias</Text>
      </View>
    );
  }

  const dayLabels = data.days.map(getDayLabel);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Adesão semanal por medicamento</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>Últimos 7 dias · % de doses tomadas por dia</Text>

      {/* Day header row */}
      <View style={styles.headerRow}>
        <View style={styles.medLabelCol} />
        {dayLabels.map((label, i) => (
          <View key={i} style={styles.dayCol}>
            <Text style={[styles.dayLabel, { color: colors.muted }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* One row per medication */}
      {data.medications.map((med) => {
        const dotColor = medColors[med.medicationId] ?? "#0D5BBF";
        return (
          <View key={med.medicationId} style={styles.medRow}>
            {/* Medication name */}
            <View style={styles.medLabelCol}>
              <View style={[styles.medDot, { backgroundColor: dotColor }]} />
              <Text style={[styles.medName, { color: colors.foreground }]} numberOfLines={2}>{med.name}</Text>
            </View>

            {/* Bars for each day */}
            {med.days.map((day, i) => {
              const barColor = getBarColor(day.pct);
              const barHeight = day.pct !== null ? Math.max(4, (day.pct / 100) * 40) : 4;
              const isToday = i === data.days.length - 1;
              return (
                <View key={i} style={[styles.dayCol, styles.barWrapper]}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: barColor,
                          opacity: day.pct === null ? 0.3 : 1,
                        },
                      ]}
                    />
                  </View>
                  {day.pct !== null && (
                    <Text style={[styles.barPct, { color: barColor }]}>
                      {day.pct}%
                    </Text>
                  )}
                  {isToday && (
                    <View style={[styles.todayDot, { backgroundColor: "#0D5BBF" }]} />
                  )}
                </View>
              );
            })}
          </View>
        );
      })}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#16A34A" }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>≥80%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>50–79%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>&lt;50%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#E5E7EB" }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>Sem dado</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  emptyContainer: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyText: { fontSize: 14 },
  title: { fontSize: 15, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: -6 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  medLabelCol: {
    width: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 6,
  },
  medDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  medName: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
    lineHeight: 14,
  },
  dayCol: {
    flex: 1,
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  medRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 60,
  },
  barWrapper: {
    justifyContent: "flex-end",
    paddingBottom: 2,
    gap: 2,
  },
  barContainer: {
    width: "100%",
    height: 40,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: {
    width: "70%",
    borderRadius: 4,
    minHeight: 4,
  },
  barPct: {
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  legend: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: { fontSize: 11 },
});

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function RevenueRankingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [filterAll, setFilterAll] = useState(false);

  const rankingQuery = trpc.mgm.adminGetRevenueRanking.useQuery({
    referenceMonth: filterAll ? undefined : selectedMonth,
  });

  const ranking = rankingQuery.data ?? [];
  const totalRevenue = ranking.reduce((sum: number, d: any) => sum + d.totalRevenue, 0);

  const MEDAL = ["🥇", "🥈", "🥉"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1a1a2e", paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Ranking de Receita</Text>
          <Text style={styles.headerSubtitle}>Faturamento por médico</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Filter */}
        <View style={[styles.filterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !filterAll && { backgroundColor: "#1a1a2e" }]}
              onPress={() => setFilterAll(false)}
            >
              <Text style={[styles.filterChipText, !filterAll && { color: "#fff" }]}>Por mês</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filterAll && { backgroundColor: "#1a1a2e" }]}
              onPress={() => setFilterAll(true)}
            >
              <Text style={[styles.filterChipText, filterAll && { color: "#fff" }]}>Acumulado total</Text>
            </TouchableOpacity>
          </View>
          {!filterAll && (
            <TextInput
              style={[styles.monthInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={selectedMonth}
              onChangeText={setSelectedMonth}
              placeholder="AAAA-MM"
              placeholderTextColor={colors.muted}
              maxLength={7}
            />
          )}
        </View>

        {/* Total */}
        <View style={[styles.totalCard, { backgroundColor: "#1a1a2e" }]}>
          <Text style={styles.totalLabel}>Total do período</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalRevenue)}</Text>
          <Text style={styles.totalSub}>{ranking.length} médico{ranking.length !== 1 ? "s" : ""} com receita registrada</Text>
        </View>

        {/* Ranking list */}
        {rankingQuery.isLoading ? (
          <ActivityIndicator size="large" color="#1a1a2e" style={{ marginTop: 40 }} />
        ) : ranking.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhuma receita registrada</Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>
              As receitas são registradas automaticamente ao marcar consultas como realizadas.
            </Text>
          </View>
        ) : (
          ranking.map((item: any, index: number) => (
            <View
              key={item.doctorProfileId}
              style={[
                styles.rankCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                index === 0 && styles.rankCardFirst,
              ]}
            >
              <View style={styles.rankLeft}>
                <Text style={styles.rankMedal}>{MEDAL[index] ?? `#${index + 1}`}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rankName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.doctorName}
                  </Text>
                  <Text style={[styles.rankSub, { color: colors.muted }]}>
                    {item.appointmentCount} consulta{item.appointmentCount !== 1 ? "s" : ""} realizadas
                  </Text>
                </View>
              </View>
              <View style={styles.rankRight}>
                <Text style={[styles.rankRevenue, { color: index === 0 ? "#16A34A" : colors.foreground }]}>
                  {formatCurrency(item.totalRevenue)}
                </Text>
                {totalRevenue > 0 && (
                  <Text style={[styles.rankPercent, { color: colors.muted }]}>
                    {((item.totalRevenue / totalRevenue) * 100).toFixed(1)}%
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  },
  backBtn: { padding: 8, marginRight: 8 },
  backIcon: { color: "#fff", fontSize: 32, lineHeight: 32, fontWeight: "300" },
  headerTextContainer: { flex: 1 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  headerSubtitle: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 2 },
  filterCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1a1a2e",
  },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#1a1a2e" },
  monthInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  totalCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  totalLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 4 },
  totalValue: { color: "#fff", fontSize: 32, fontWeight: "800" },
  totalSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 4 },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  rankCardFirst: {
    borderColor: "#16A34A",
    borderWidth: 2,
  },
  rankLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  rankMedal: { fontSize: 24, width: 32, textAlign: "center" },
  rankName: { fontSize: 15, fontWeight: "600" },
  rankSub: { fontSize: 12, marginTop: 2 },
  rankRight: { alignItems: "flex-end" },
  rankRevenue: { fontSize: 16, fontWeight: "700" },
  rankPercent: { fontSize: 12, marginTop: 2 },
});

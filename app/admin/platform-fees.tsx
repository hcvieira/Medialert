import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

export default function PlatformFeesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [statusFilter, setStatusFilter] = useState<"pending" | "paid" | undefined>(undefined);
  const [referenceMonth, setReferenceMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const feesQuery = trpc.platformFees.adminList.useQuery({ status: statusFilter });
  const fees = feesQuery.data ?? [];
  const kpisQuery = trpc.platformFees.adminKPIs.useQuery();
  const kpis = kpisQuery.data;

  const calculateMutation = trpc.platformFees.adminCalculate.useMutation({
    onSuccess: (result) => {
      Alert.alert(
        "Cálculo Concluído",
        `${result.processed} médico(s) processado(s).\nTotal a cobrar: ${formatCurrency(result.total)}`,
        [{ text: "OK" }]
      );
      feesQuery.refetch();
      kpisQuery.refetch();
    },
    onError: (err) => Alert.alert("Erro", err.message),
  });

  const markPaidMutation = trpc.platformFees.adminMarkPaid.useMutation({
    onSuccess: () => {
      feesQuery.refetch();
      kpisQuery.refetch();
    },
    onError: (err) => Alert.alert("Erro", err.message),
  });

  const formatCurrency = (val: number | string) => {
    const n = typeof val === "string" ? parseFloat(val) : val;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleCalculate = () => {
    Alert.alert(
      "Calcular Taxas",
      `Calcular taxas de plataforma para ${referenceMonth}?\n\nRegras:\n• Após 6 meses: 2,5% sobre faturamento ≥ R$ 12.000\n• Taxa mínima: R$ 150,00 para faturamento < R$ 12.000`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Calcular",
          onPress: () => calculateMutation.mutate({ referenceMonth }),
        },
      ]
    );
  };

  const handleMarkPaid = (id: number, doctorName: string, amount: string) => {
    Alert.alert(
      "Confirmar Pagamento",
      `Marcar taxa de ${doctorName} (${formatCurrency(amount)}) como paga?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: () => markPaidMutation.mutate({ id }) },
      ]
    );
  };

  const pendingFees = fees.filter((f) => f.status === "pending");
  const paidFees = fees.filter((f) => f.status === "paid");
  const displayFees = statusFilter === "pending" ? pendingFees : statusFilter === "paid" ? paidFees : fees;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backIcon, { color: colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Taxas de Plataforma</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>Cobrança mensal após 6 meses</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Regra explicativa */}
        <View style={[styles.ruleCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
          <Text style={[styles.ruleTitle, { color: "#92400E" }]}>📋 Regra de Cobrança</Text>
          <Text style={[styles.ruleText, { color: "#78350F" }]}>
            • Período de carência: primeiros 6 meses gratuitos{"\n"}
            • Faturamento ≥ R$ 12.000/mês: <Text style={{ fontWeight: "700" }}>2,5% sobre o faturamento</Text>{"\n"}
            • Faturamento {"<"} R$ 12.000/mês: <Text style={{ fontWeight: "700" }}>taxa mínima de R$ 150,00</Text>
          </Text>
        </View>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.kpiValue, { color: "#D97706" }]}>
              {kpis ? kpis.pendingCount : "—"}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.muted }]}>Pendentes</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.kpiValue, { color: "#EF4444" }]}>
              {kpis ? formatCurrency(kpis.pendingTotal) : "—"}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.muted }]}>A receber</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.kpiValue, { color: "#10B981" }]}>
              {kpis ? formatCurrency(kpis.paidTotal) : "—"}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.muted }]}>Recebido</Text>
          </View>
        </View>

        {/* Calcular taxas */}
        <View style={[styles.calcCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.calcTitle, { color: colors.foreground }]}>Calcular Taxas do Mês</Text>
          <View style={styles.calcRow}>
            <TextInput
              style={[styles.monthInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={referenceMonth}
              onChangeText={setReferenceMonth}
              placeholder="AAAA-MM"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.calcBtn, { backgroundColor: "#D97706", opacity: calculateMutation.isPending ? 0.7 : 1 }]}
              onPress={handleCalculate}
              disabled={calculateMutation.isPending}
            >
              {calculateMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.calcBtnText}>Calcular</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={[styles.calcHint, { color: colors.muted }]}>
            Processa todos os médicos elegíveis ({">"} 6 meses) para o mês informado.
          </Text>
        </View>

        {/* Filtros */}
        <View style={styles.filterRow}>
          {(["all", "pending", "paid"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterBtn,
                { borderColor: colors.border, backgroundColor: (statusFilter === f || (f === "all" && !statusFilter)) ? colors.primary : colors.surface },
              ]}
              onPress={() => setStatusFilter(f === "all" ? undefined : f)}
            >
              <Text style={[styles.filterText, { color: (statusFilter === f || (f === "all" && !statusFilter)) ? "#fff" : colors.muted }]}>
                {f === "all" ? "Todas" : f === "pending" ? "Pendentes" : "Pagas"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista */}
        {feesQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : displayFees.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🏷️</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhuma taxa encontrada</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Use o botão "Calcular" acima para processar as taxas do mês desejado.
            </Text>
          </View>
        ) : (
          displayFees.map((fee) => (
            <View
              key={fee.id}
              style={[
                styles.feeCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: fee.status === "pending" ? "#FDE68A" : "#BBF7D0",
                },
              ]}
            >
              <View style={styles.feeHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.feeDoctorName, { color: colors.foreground }]}>{fee.doctorName}</Text>
                  <Text style={[styles.feeDoctorEmail, { color: colors.muted }]}>{fee.doctorEmail}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: fee.status === "pending" ? "#FEF3C7" : "#DCFCE7" }]}>
                  <Text style={[styles.statusText, { color: fee.status === "pending" ? "#92400E" : "#166534" }]}>
                    {fee.status === "pending" ? "Pendente" : "Pago"}
                  </Text>
                </View>
              </View>

              <View style={styles.feeDetails}>
                <View style={styles.feeDetailItem}>
                  <Text style={[styles.feeDetailLabel, { color: colors.muted }]}>Mês ref.</Text>
                  <Text style={[styles.feeDetailValue, { color: colors.foreground }]}>{fee.referenceMonth}</Text>
                </View>
                <View style={styles.feeDetailItem}>
                  <Text style={[styles.feeDetailLabel, { color: colors.muted }]}>Faturamento</Text>
                  <Text style={[styles.feeDetailValue, { color: colors.foreground }]}>{formatCurrency(fee.monthlyRevenue)}</Text>
                </View>
                <View style={styles.feeDetailItem}>
                  <Text style={[styles.feeDetailLabel, { color: colors.muted }]}>Tipo</Text>
                  <Text style={[styles.feeDetailValue, { color: colors.foreground }]}>
                    {fee.feeType === "percentage" ? "2,5%" : "Mínimo"}
                  </Text>
                </View>
                <View style={styles.feeDetailItem}>
                  <Text style={[styles.feeDetailLabel, { color: colors.muted }]}>Taxa</Text>
                  <Text style={[styles.feeDetailValue, { color: "#D97706", fontWeight: "700" }]}>{formatCurrency(fee.feeAmount)}</Text>
                </View>
              </View>

              {fee.status === "pending" && (
                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: "#10B981" }]}
                  onPress={() => handleMarkPaid(fee.id, fee.doctorName ?? "", fee.feeAmount)}
                >
                  <Text style={styles.payBtnText}>✓ Marcar como Recebido</Text>
                </TouchableOpacity>
              )}
              {fee.status === "paid" && fee.paidAt && (
                <Text style={[styles.paidAt, { color: colors.muted }]}>
                  Recebido em {new Date(fee.paidAt).toLocaleDateString("pt-BR")}
                </Text>
              )}
            </View>
          ))
        )}
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
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4, marginRight: 8 },
  backIcon: { fontSize: 32, lineHeight: 36, fontWeight: "300" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 1 },
  ruleCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  ruleTitle: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  ruleText: { fontSize: 13, lineHeight: 22 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
  },
  kpiValue: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  kpiLabel: { fontSize: 11, marginTop: 4, textAlign: "center" },
  calcCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  calcTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  calcRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  monthInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  calcBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  calcBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  calcHint: { fontSize: 11, marginTop: 8, lineHeight: 16 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20, maxWidth: 280 },
  feeCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
  },
  feeHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  feeDoctorName: { fontSize: 15, fontWeight: "700" },
  feeDoctorEmail: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "700" },
  feeDetails: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  feeDetailItem: {
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: "45%",
  },
  feeDetailLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  feeDetailValue: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  payBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  payBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  paidAt: { fontSize: 12, textAlign: "center", marginTop: 4 },
});

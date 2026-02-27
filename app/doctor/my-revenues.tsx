import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

const TABS = ["Resumo", "Meta", "Histórico"] as const;
type Tab = (typeof TABS)[number];

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function formatMonth(yyyymm: string) {
  const [year, month] = yyyymm.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(month) - 1]}/${year}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR");
}

export default function MyRevenuesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<Tab>("Resumo");

  const { data: summary, isLoading: loadingSummary } = trpc.revenue.summary.useQuery();
  const { data: revenues = [], isLoading: loadingList } = trpc.revenue.list.useQuery();
  const { data: goalData, refetch: refetchGoal } = trpc.revenue.getGoal.useQuery();
  const setGoalMutation = trpc.revenue.setGoal.useMutation({
    onSuccess: () => { refetchGoal(); setGoalModalVisible(false); },
    onError: (e: any) => Alert.alert("Erro", e.message),
  });
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const isLoading = loadingSummary || loadingList;
  const currentGoal = goalData?.goal ?? null;
  const thisMonth = summary?.thisMonth ?? 0;
  const goalProgress = currentGoal && currentGoal > 0 ? Math.min((thisMonth / currentGoal) * 100, 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: "#1a1a2e", borderBottomColor: "rgba(255,255,255,0.1)" }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Minhas Receitas</Text>
          <Text style={styles.headerSub}>Receita gerada pelas consultas realizadas</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.muted }]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : activeTab === "Resumo" ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* KPI Cards */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: "#DCFCE7", flex: 1 }]}>
              <Text style={[styles.kpiLabel, { color: "#166534" }]}>Total Acumulado</Text>
              <Text style={[styles.kpiValue, { color: "#15803D" }]}>{formatCurrency(summary?.total ?? 0)}</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: "#DBEAFE", flex: 1 }]}>
              <Text style={[styles.kpiLabel, { color: "#1E40AF" }]}>Este Mês</Text>
              <Text style={[styles.kpiValue, { color: "#1D4ED8" }]}>{formatCurrency(summary?.thisMonth ?? 0)}</Text>
            </View>
          </View>

          {/* Por convênio */}
          {(summary?.byInsurance ?? []).length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Por Convênio</Text>
              {(summary?.byInsurance ?? []).map((item: any, idx: number) => (
                <View key={idx} style={[styles.row, { borderTopColor: colors.border, borderTopWidth: idx > 0 ? 0.5 : 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: colors.foreground }]}>{item.insuranceName}</Text>
                    <Text style={[styles.rowSub, { color: colors.muted }]}>{item.count} consulta{item.count !== 1 ? "s" : ""}</Text>
                  </View>
                  <Text style={[styles.rowValue, { color: colors.primary }]}>{formatCurrency(item.total)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Por mês */}
          {(summary?.byMonth ?? []).length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Por Mês</Text>
              {(summary?.byMonth ?? []).map((item: any, idx: number) => (
                <View key={idx} style={[styles.row, { borderTopColor: colors.border, borderTopWidth: idx > 0 ? 0.5 : 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: colors.foreground }]}>{formatMonth(item.month)}</Text>
                    <Text style={[styles.rowSub, { color: colors.muted }]}>{item.count} consulta{item.count !== 1 ? "s" : ""}</Text>
                  </View>
                  <Text style={[styles.rowValue, { color: colors.primary }]}>{formatCurrency(item.total)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Meta mensal */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, paddingBottom: 10 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, padding: 0 }]}>🎯 Meta do Mês</Text>
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 }}
                onPress={() => { setGoalInput(currentGoal ? String(currentGoal) : ""); setGoalModalVisible(true); }}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{currentGoal ? "Editar" : "Definir"}</Text>
              </TouchableOpacity>
            </View>
            {currentGoal ? (
              <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>Realizado este mês</Text>
                  <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}>
                    {formatCurrency(thisMonth)} / {formatCurrency(currentGoal)}
                  </Text>
                </View>
                <View style={{ height: 12, backgroundColor: colors.border, borderRadius: 6, overflow: "hidden" }}>
                  <View style={{ height: 12, width: `${goalProgress}%`, backgroundColor: goalProgress >= 100 ? "#16A34A" : goalProgress >= 70 ? "#F59E0B" : colors.primary, borderRadius: 6 }} />
                </View>
                <Text style={{ color: goalProgress >= 100 ? "#16A34A" : colors.muted, fontSize: 12, marginTop: 6, textAlign: "right", fontWeight: goalProgress >= 100 ? "700" : "400" }}>
                  {goalProgress >= 100 ? "🎉 Meta atingida!" : `${goalProgress.toFixed(0)}% da meta`}
                </Text>
              </View>
            ) : (
              <Text style={{ color: colors.muted, fontSize: 13, paddingHorizontal: 14, paddingBottom: 14 }}>Defina uma meta mensal para acompanhar seu progresso.</Text>
            )}
          </View>

          {(summary?.total ?? 0) === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhuma receita registrada</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                As receitas são registradas automaticamente quando uma consulta é marcada como realizada. Cadastre seus valores por convênio para que o cálculo seja preciso.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : activeTab === "Meta" ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, paddingBottom: 10 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, padding: 0 }]}>🎯 Meta Mensal</Text>
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}
                onPress={() => { setGoalInput(currentGoal ? String(currentGoal) : ""); setGoalModalVisible(true); }}
              >
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{currentGoal ? "Editar Meta" : "Definir Meta"}</Text>
              </TouchableOpacity>
            </View>
            {currentGoal ? (
              <View style={{ paddingHorizontal: 14, paddingBottom: 20 }}>
                <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 16 }}>Meta para o mês atual</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Realizado</Text>
                    <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "800", marginTop: 4 }}>{formatCurrency(thisMonth)}</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Meta</Text>
                    <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "800", marginTop: 4 }}>{formatCurrency(currentGoal)}</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Progresso</Text>
                    <Text style={{ color: goalProgress >= 100 ? "#16A34A" : goalProgress >= 70 ? "#F59E0B" : colors.primary, fontSize: 22, fontWeight: "800", marginTop: 4 }}>{goalProgress.toFixed(0)}%</Text>
                  </View>
                </View>
                <View style={{ height: 16, backgroundColor: colors.border, borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
                  <View style={{ height: 16, width: `${goalProgress}%`, backgroundColor: goalProgress >= 100 ? "#16A34A" : goalProgress >= 70 ? "#F59E0B" : colors.primary, borderRadius: 8 }} />
                </View>
                {goalProgress >= 100 ? (
                  <Text style={{ color: "#16A34A", fontSize: 14, fontWeight: "700", textAlign: "center" }}>🎉 Parabéns! Você atingiu sua meta este mês!</Text>
                ) : (
                  <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>Faltam {formatCurrency(currentGoal - thisMonth)} para atingir a meta</Text>
                )}
              </View>
            ) : (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🎯</Text>
                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", marginBottom: 8 }}>Defina sua meta mensal</Text>
                <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>Acompanhe seu progresso financeiro e saiba exatamente o quanto falta para atingir seu objetivo.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={revenues}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhuma consulta registrada</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>O histórico aparecerá aqui conforme as consultas forem realizadas.</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <View style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.historyInsurance, { color: colors.foreground }]}>
                  {item.insuranceName ?? "Não informado"}
                </Text>
                <Text style={[styles.historyDate, { color: colors.muted }]}>
                  {formatMonth(item.referenceMonth)} · Consulta #{item.appointmentId}
                </Text>
                <Text style={[styles.historyCreated, { color: colors.muted }]}>
                  Registrado em {formatDate(item.createdAt)}
                </Text>
              </View>
              <Text style={[styles.historyAmount, { color: "#16A34A" }]}>
                {formatCurrency(Number(item.feeAmount))}
              </Text>
            </View>
          )}
        />
      )}

      {/* Modal: Definir/Editar Meta */}
      <Modal visible={goalModalVisible} transparent animationType="fade" onRequestClose={() => setGoalModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={[{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, width: "100%", maxWidth: 360 }]}>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Meta Mensal de Receita</Text>
            <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>Defina quanto deseja faturar por mês.</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 20, fontWeight: "700", color: colors.foreground, backgroundColor: colors.background, marginBottom: 16, textAlign: "center" }}
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder="Ex: 15000"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}
                onPress={() => setGoalModalVisible(false)}
              >
                <Text style={{ color: colors.muted, fontWeight: "600" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center" }}
                onPress={() => {
                  const val = parseFloat(goalInput.replace(",", "."));
                  if (isNaN(val) || val <= 0) { Alert.alert("Valor inválido", "Informe um valor maior que zero."); return; }
                  setGoalMutation.mutate({ goal: val });
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>{setGoalMutation.isPending ? "Salvando..." : "Salvar"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  backIcon: { fontSize: 32, lineHeight: 36, fontWeight: "300", color: "#fff" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 12, marginTop: 1, color: "rgba(255,255,255,0.6)" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  kpiCard: { borderRadius: 14, padding: 14 },
  kpiLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  kpiValue: { fontSize: 22, fontWeight: "800" },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", padding: 14, paddingBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  rowName: { fontSize: 15, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowValue: { fontSize: 16, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 22, maxWidth: 280 },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  historyInsurance: { fontSize: 15, fontWeight: "600" },
  historyDate: { fontSize: 12, marginTop: 2 },
  historyCreated: { fontSize: 11, marginTop: 1 },
  historyAmount: { fontSize: 20, fontWeight: "800" },
});

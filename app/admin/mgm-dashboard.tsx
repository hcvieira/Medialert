import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  StyleSheet,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

function showAlert(title: string, msg: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${msg}`);
  } else {
    const { Alert } = require("react-native");
    Alert.alert(title, msg);
  }
}

function showConfirm(title: string, msg: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${msg}`)) onConfirm();
  } else {
    const { Alert } = require("react-native");
    Alert.alert(title, msg, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: onConfirm },
    ]);
  }
}

type TabType = "kpis" | "commissions" | "rules" | "network";

export default function MGMAdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>("kpis");
  const [statusFilter, setStatusFilter] = useState<"pending" | "paid" | undefined>(undefined);
  const [calcMonth, setCalcMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [editingRule, setEditingRule] = useState<{ id: number; amount: string } | null>(null);

  const utils = trpc.useUtils();

  const { data: kpis, isLoading: loadingKPIs } = trpc.mgm.adminGetKPIs.useQuery();
  const { data: commissions, isLoading: loadingCommissions } = trpc.mgm.adminGetAllCommissions.useQuery({ status: statusFilter });
  const { data: rules, isLoading: loadingRules } = trpc.mgm.adminGetRules.useQuery();
  const { data: network, isLoading: loadingNetwork } = trpc.mgm.adminGetNetwork.useQuery();

  const markPaid = trpc.mgm.adminMarkPaid.useMutation({
    onSuccess: () => utils.mgm.adminGetAllCommissions.invalidate(),
  });

  const updateRule = trpc.mgm.adminUpdateRule.useMutation({
    onSuccess: () => {
      utils.mgm.adminGetRules.invalidate();
      setEditingRule(null);
    },
  });

  const calcMonth_mut = trpc.mgm.adminCalculateMonth.useMutation({
    onSuccess: (data) => {
      utils.mgm.adminGetAllCommissions.invalidate();
      utils.mgm.adminGetKPIs.invalidate();
      showAlert("Cálculo concluído", `${data.totalInserted} descontos gerados para ${calcMonth}.`);
    },
    onError: (e) => showAlert("Erro", e.message),
  });

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatMonth = (ref: string) => {
    const [year, month] = ref.split("-");
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${months[parseInt(month) - 1]}/${year}`;
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: "kpis", label: "KPIs" },
    { key: "commissions", label: "Comissões" },
    { key: "rules", label: "Regras" },
    { key: "network", label: "Rede" },
  ];

  return (
    <ScreenContainer edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1a1a2e", paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Admin · MGM</Text>
          <Text style={styles.headerSubtitle}>Gestão de Descontos em Cascata e Rede</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.primary : colors.muted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* KPIs Tab */}
        {activeTab === "kpis" && (
          <>
            {loadingKPIs ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : kpis ? (
              <>
                <View style={styles.kpiGrid}>
                  <View style={[styles.kpiCard, { backgroundColor: "#EBF4FF" }]}>
                    <Text style={[styles.kpiValue, { color: "#0D5BBF" }]}>{kpis.totalDoctors}</Text>
                    <Text style={[styles.kpiLabel, { color: "#0D5BBF" }]}>Médicos cadastrados</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: "#F0FDF4" }]}>
                    <Text style={[styles.kpiValue, { color: "#16A34A" }]}>{kpis.referredDoctors}</Text>
                    <Text style={[styles.kpiLabel, { color: "#16A34A" }]}>Via indicação</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: "#FFF7ED" }]}>
                    <Text style={[styles.kpiValue, { color: "#EA580C" }]}>
                      {kpis.conversionRate.toFixed(1)}%
                    </Text>
                    <Text style={[styles.kpiLabel, { color: "#EA580C" }]}>Taxa de conversão</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: "#FEF3C7" }]}>
                    <Text style={[styles.kpiValue, { color: "#D97706" }]}>
                      {formatCurrency(kpis.pendingAmount)}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: "#D97706" }]}>A aplicar</Text>
                  </View>
                  <View style={[styles.kpiCard, { backgroundColor: "#DCFCE7" }]}>
                    <Text style={[styles.kpiValue, { color: "#16A34A" }]}>
                      {formatCurrency(kpis.paidAmount)}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: "#16A34A" }]}>Total aplicado</Text>
                  </View>
                </View>

                {/* Calculate Month */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>⚙️ Calcular descontos do mês</Text>
                  <Text style={[styles.cardDesc, { color: colors.muted }]}>
                    Execute o cálculo mensal para gerar os descontos com base nas consultas realizadas.
                  </Text>
                  <View style={styles.calcRow}>
                    <TextInput
                      style={[styles.monthInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
                      value={calcMonth}
                      onChangeText={setCalcMonth}
                      placeholder="YYYY-MM"
                      placeholderTextColor={colors.muted}
                    />
                    <TouchableOpacity
                      style={[styles.calcBtn, { backgroundColor: colors.primary }]}
                      onPress={() =>
                        showConfirm(
                          "Calcular descontos",
                          `Calcular descontos para ${calcMonth}? Registros duplicados serão ignorados.`,
                          () => calcMonth_mut.mutate({ referenceMonth: calcMonth })
                        )
                      }
                      disabled={calcMonth_mut.isPending}
                    >
                      {calcMonth_mut.isPending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.calcBtnText}>Calcular</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : null}
          </>
        )}

        {/* Commissions Tab */}
        {activeTab === "commissions" && (
          <>
            {/* Filter */}
            <View style={styles.filterRow}>
              {([undefined, "pending", "paid"] as const).map((s) => (
                <TouchableOpacity
                  key={String(s)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: statusFilter === s ? colors.primary : colors.surface,
                      borderColor: statusFilter === s ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setStatusFilter(s)}
                >
                  <Text style={[styles.filterChipText, { color: statusFilter === s ? "#fff" : colors.muted }]}>
                    {s === undefined ? "Todos" : s === "pending" ? "Pendentes" : "Pagos"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loadingCommissions ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : !commissions || commissions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>💳</Text>
                <Text style={[styles.emptyText, { color: colors.muted }]}>Nenhum desconto encontrado.</Text>
              </View>
            ) : (
              commissions.map((c: any) => (
                <View
                  key={c.id}
                  style={[styles.commissionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.commissionCardHeader}>
                    <View>
                      <Text style={[styles.commissionReferrer, { color: colors.foreground }]}>
                        {c.referrerName}
                      </Text>
                      <Text style={[styles.commissionReferred, { color: colors.muted }]}>
                        indicou → {c.referredName}
                      </Text>
                    </View>
                    <View style={styles.commissionCardRight}>
                      <Text style={[styles.commissionCardAmount, { color: colors.primary }]}>
                        {formatCurrency(c.amount)}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: c.status === "paid" ? "#DCFCE7" : "#FEF3C7" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: c.status === "paid" ? "#16A34A" : "#D97706" },
                          ]}
                        >
                          {c.status === "paid" ? "Pago" : "Pendente"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.commissionCardMeta, { borderTopColor: colors.border }]}>
                    <Text style={[styles.commissionMeta, { color: colors.muted }]}>
                      Nível {c.level} · {formatMonth(c.referenceMonth)} · {c.appointmentsCount} consultas
                    </Text>
                    {c.status === "pending" && (
                      <TouchableOpacity
                        style={[styles.payBtn, { backgroundColor: "#16A34A" }]}
                        onPress={() =>
                          showConfirm(
                            "Aplicar desconto",
                            `Confirmar aplicação de desconto de ${formatCurrency(c.amount)} para ${c.referrerName}?`,
                            () => markPaid.mutate({ id: c.id })
                          )
                        }
                      >
                        <Text style={styles.payBtnText}>Aplicar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Rules Tab */}
        {activeTab === "rules" && (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>📋 Regras de comissão</Text>
              <Text style={[styles.cardDesc, { color: colors.muted }]}>
                Valores mensais pagos ao indicador por cada médico ativo na rede.
              </Text>
            </View>

            {loadingRules ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
              rules?.map((rule: any) => (
                <View
                  key={rule.id}
                  style={[styles.ruleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.ruleInfo}>
                    <Text style={[styles.ruleTitle, { color: colors.foreground }]}>
                      Nível {rule.level} · {rule.yearOfReferred === 1 ? "1º ano" : rule.yearOfReferred === 2 ? "2º ano" : "3º ano+"}
                    </Text>
                    {editingRule?.id === rule.id ? (
                      <View style={styles.editRow}>
                        <TextInput
                          style={[styles.ruleInput, { borderColor: colors.border, color: colors.foreground }]}
                          value={editingRule?.amount ?? ""}
                          onChangeText={(v) => setEditingRule((prev) => prev ? { id: prev.id, amount: v } : null)}
                          keyboardType="decimal-pad"
                          placeholder="Valor"
                          placeholderTextColor={colors.muted}
                        />
                        <TouchableOpacity
                          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                          onPress={() => {
                            const amount = parseFloat(editingRule?.amount ?? "");
                            if (isNaN(amount) || amount < 0) {
                              showAlert("Valor inválido", "Insira um valor numérico válido.");
                              return;
                            }
                            if (editingRule) updateRule.mutate({ id: editingRule.id, amount });
                          }}
                        >
                          <Text style={styles.saveBtnText}>Salvar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingRule(null)}>
                          <Text style={[styles.cancelText, { color: colors.muted }]}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={[styles.ruleAmount, { color: colors.primary }]}>
                        {formatCurrency(Number(rule.amount))}/mês
                      </Text>
                    )}
                  </View>
                  {editingRule?.id !== rule.id && (
                    <TouchableOpacity
                      style={[styles.editBtn, { borderColor: colors.border }]}
                      onPress={() => setEditingRule({ id: rule.id, amount: String(rule.amount) })}
                    >
                      <Text style={[styles.editBtnText, { color: colors.muted }]}>Editar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {/* Network Tab */}
        {activeTab === "network" && (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>🌐 Rede de indicações</Text>
              <Text style={[styles.cardDesc, { color: colors.muted }]}>
                Todos os médicos cadastrados e suas conexões na rede MGM.
              </Text>
            </View>

            {loadingNetwork ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : !network || network.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🌐</Text>
                <Text style={[styles.emptyText, { color: colors.muted }]}>Nenhum médico na rede ainda.</Text>
              </View>
            ) : (
              network.map((node: any) => (
                <View
                  key={node.profileId}
                  style={[styles.networkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.networkAvatar, { backgroundColor: "#EBF4FF" }]}>
                    <Text style={[styles.networkAvatarText, { color: colors.primary }]}>
                      {(node.name ?? "M").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.networkInfo}>
                    <Text style={[styles.networkName, { color: colors.foreground }]}>{node.name}</Text>
                    <Text style={[styles.networkMeta, { color: colors.muted }]}>
                      Código: {node.referralCode ?? "—"} · {node.referredCount} indicados
                    </Text>
                    {node.indicatedById && (
                      <Text style={[styles.networkReferred, { color: "#16A34A" }]}>
                        ✓ Indicado por perfil #{node.indicatedById}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backIcon: { color: "#fff", fontSize: 32, lineHeight: 36, fontWeight: "300" },
  headerTextContainer: { flex: 1 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700", lineHeight: 26 },
  headerSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 18, marginTop: 2 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabText: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  kpiValue: { fontSize: 22, fontWeight: "800", lineHeight: 28 },
  kpiLabel: { fontSize: 11, fontWeight: "600", lineHeight: 16, textAlign: "center" },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", lineHeight: 22 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  calcRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  monthInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 20,
  },
  calcBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  calcBtnText: { color: "#fff", fontSize: 14, fontWeight: "700", lineHeight: 20 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  commissionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  commissionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 14,
  },
  commissionReferrer: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  commissionReferred: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  commissionCardRight: { alignItems: "flex-end", gap: 4 },
  commissionCardAmount: { fontSize: 16, fontWeight: "800", lineHeight: 22 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: "600", lineHeight: 16 },
  commissionCardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  commissionMeta: { fontSize: 12, lineHeight: 16 },
  payBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  payBtnText: { color: "#fff", fontSize: 12, fontWeight: "700", lineHeight: 16 },
  ruleCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ruleInfo: { flex: 1, gap: 4 },
  ruleTitle: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  ruleAmount: { fontSize: 16, fontWeight: "800", lineHeight: 22 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  ruleInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    lineHeight: 20,
    width: 80,
  },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700", lineHeight: 18 },
  cancelText: { fontSize: 13, lineHeight: 18 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  editBtnText: { fontSize: 13, lineHeight: 18 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 36, lineHeight: 44 },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  networkCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  networkAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  networkAvatarText: { fontSize: 18, fontWeight: "700", lineHeight: 24 },
  networkInfo: { flex: 1, gap: 2 },
  networkName: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  networkMeta: { fontSize: 12, lineHeight: 16 },
  networkReferred: { fontSize: 12, lineHeight: 16 },
});

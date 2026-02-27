import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SectionList,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabKey = "referrals" | "pending" | "paid";

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(month, 10) - 1]}/${year}`;
}

export default function DoctorMGMMyNetwork() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>("referrals");
  const { data, isLoading } = trpc.mgm.getDoctorMGMData.useQuery();

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 12,
      backgroundColor: "#1a1a2e",
    },
    backBtn: { padding: 4 },
    backIcon: { color: "#fff", fontSize: 32, lineHeight: 36, fontWeight: "300" },
    headerText: { flex: 1 },
    headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700", lineHeight: 26 },
    headerSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 18, marginTop: 2 },
    summaryRow: {
      flexDirection: "row",
      gap: 10,
      padding: 16,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryValue: { fontSize: 18, fontWeight: "800", color: colors.primary, lineHeight: 24 },
    summaryLabel: { fontSize: 10, color: colors.muted, lineHeight: 14, marginTop: 2, textAlign: "center" },
    nextPayBox: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: "#EBF4FF",
      borderRadius: 12,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    nextPayIcon: { fontSize: 28, lineHeight: 36 },
    nextPayText: { flex: 1 },
    nextPayTitle: { fontSize: 13, fontWeight: "700", color: "#0D5BBF", lineHeight: 18 },
    nextPayDate: { fontSize: 20, fontWeight: "800", color: "#0D5BBF", lineHeight: 26 },
    nextPaySub: { fontSize: 11, color: "#0D5BBF", lineHeight: 15, marginTop: 2 },
    tabRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabBtnActive: { borderBottomColor: "#0a7ea4" },
    tabText: { fontSize: 13, fontWeight: "600", color: colors.muted, lineHeight: 18 },
    tabTextActive: { color: "#0a7ea4" },
    // Referrals
    referralCard: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    referralAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#EBF4FF",
      alignItems: "center",
      justifyContent: "center",
    },
    referralAvatarText: { fontSize: 20, lineHeight: 26 },
    referralInfo: { flex: 1 },
    referralName: { fontSize: 15, fontWeight: "700", color: colors.foreground, lineHeight: 22 },
    referralJoined: { fontSize: 12, color: colors.muted, lineHeight: 16, marginTop: 2 },
    referralN2: { fontSize: 11, color: "#0a7ea4", fontWeight: "600", lineHeight: 15, marginTop: 2 },
    // Commission rows
    commissionRow: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 4,
    },
    commRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    commName: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.foreground, lineHeight: 20 },
    commAmount: { fontSize: 16, fontWeight: "800", color: "#10B981", lineHeight: 22 },
    commAmountPending: { color: "#F59E0B" },
    commRowBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
    commMonth: { fontSize: 12, color: colors.muted, lineHeight: 16 },
    commLevel: {
      backgroundColor: "#EBF4FF",
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    commLevelText: { fontSize: 10, color: "#0D5BBF", fontWeight: "700", lineHeight: 14 },
    commPayDate: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
    commPayDatePending: { color: "#F59E0B" },
    commPayDatePaid: { color: "#10B981" },
    emptyText: { textAlign: "center", color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 40, paddingHorizontal: 32 },
  });

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Minha Rede MGM</Text>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (!data) {
    return (
      <ScreenContainer>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Minha Rede MGM</Text>
          </View>
        </View>
        <Text style={styles.emptyText}>Complete seu perfil de médico para acessar o programa MGM.</Text>
      </ScreenContainer>
    );
  }

  const pendingCommissions = data.commissions.filter((c) => c.status === "pending");
  const paidCommissions = data.commissions.filter((c) => c.status === "paid");

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Minha Rede MGM</Text>
          <Text style={styles.headerSubtitle}>Indicados, provisões e pagamentos</Text>
        </View>
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Summary */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{data.summary.totalReferrals}</Text>
                <Text style={styles.summaryLabel}>Indicados{"\n"}diretos</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: "#F59E0B" }]}>
                  {formatCurrency(data.summary.totalPending)}
                </Text>
                <Text style={styles.summaryLabel}>Desconto{"\n"}pendente</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: "#10B981" }]}>
                  {formatCurrency(data.summary.totalPaid)}
                </Text>
                <Text style={styles.summaryLabel}>Total{"\n"}recebido</Text>
              </View>
            </View>

            {/* Next payment date */}
            <View style={styles.nextPayBox}>
              <Text style={styles.nextPayIcon}>📅</Text>
              <View style={styles.nextPayText}>
                <Text style={styles.nextPayTitle}>Próximo pagamento</Text>
                <Text style={styles.nextPayDate}>{formatDate(data.summary.nextPaymentDate)}</Text>
                <Text style={styles.nextPaySub}>
                  Pagamentos todo dia 10 do mês seguinte. Se cair no fim de semana, paga-se na segunda-feira.
                </Text>
              </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
              {([
                { key: "referrals", label: `Indicados (${data.directReferrals.length})` },
                { key: "pending", label: `A receber (${pendingCommissions.length})` },
                { key: "paid", label: `Recebidos (${paidCommissions.length})` },
              ] as { key: TabKey; label: string }[]).map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab content */}
            {tab === "referrals" && (
              <>
                {data.directReferrals.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Você ainda não tem indicados. Compartilhe seu código de indicação para começar a ganhar descontos na sua assinatura!
                  </Text>
                ) : (
                  data.directReferrals.map((r) => (
                    <View key={r.profileId} style={styles.referralCard}>
                      <View style={styles.referralAvatar}>
                        <Text style={styles.referralAvatarText}>👨‍⚕️</Text>
                      </View>
                      <View style={styles.referralInfo}>
                        <Text style={styles.referralName}>{r.name}</Text>
                        <Text style={styles.referralJoined}>Entrou em {formatDate(r.joinedAt)}</Text>
                        {r.n2Count > 0 && (
                          <Text style={styles.referralN2}>
                            +{r.n2Count} indicado{r.n2Count > 1 ? "s" : ""} na rede dele
                          </Text>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {tab === "pending" && (
              <>
                {pendingCommissions.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum desconto pendente no momento.</Text>
                ) : (
                  <>
                    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 16 }}>
                        💡 Descontos pendentes serão aplicados na sua próxima fatura, após validação mensal.
                      </Text>
                    </View>
                    {pendingCommissions.map((c) => (
                      <View key={c.id} style={styles.commissionRow}>
                        <View style={styles.commRowTop}>
                          <Text style={styles.commName} numberOfLines={1}>{c.referredName}</Text>
                          <Text style={[styles.commAmount, styles.commAmountPending]}>
                            {formatCurrency(c.amount)}
                          </Text>
                        </View>
                        <View style={styles.commRowBottom}>
                          <Text style={styles.commMonth}>{formatMonth(c.referenceMonth)}</Text>
                          <View style={styles.commLevel}>
                            <Text style={styles.commLevelText}>N{c.level}</Text>
                          </View>
                          <Text style={[styles.commPayDate, styles.commPayDatePending]}>
                            🕐 Previsão: {formatDate(c.paymentDate)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}

            {tab === "paid" && (
              <>
                {paidCommissions.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum desconto aplicado ainda.</Text>
                ) : (
                  paidCommissions.map((c) => (
                    <View key={c.id} style={styles.commissionRow}>
                      <View style={styles.commRowTop}>
                        <Text style={styles.commName} numberOfLines={1}>{c.referredName}</Text>
                        <Text style={styles.commAmount}>{formatCurrency(c.amount)}</Text>
                      </View>
                      <View style={styles.commRowBottom}>
                        <Text style={styles.commMonth}>{formatMonth(c.referenceMonth)}</Text>
                        <View style={styles.commLevel}>
                          <Text style={styles.commLevelText}>N{c.level}</Text>
                        </View>
                        <Text style={[styles.commPayDate, styles.commPayDatePaid]}>
                          ✓ Aplicado em {c.paidAt ? formatDate(c.paidAt) : "—"}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            <View style={{ height: 40 }} />
          </>
        }
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

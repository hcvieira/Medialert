import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function formatMonth(yyyymm: string) {
  const [year, month] = yyyymm.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(month) - 1]}/${year}`;
}

export default function MinhaAssinaturaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  // Taxa de plataforma do mês atual (preview ou calculada)
  const { data: currentFee, isLoading: loadingCurrent } = trpc.platformFees.currentMonthFee.useQuery();
  // Histórico de taxas dos meses anteriores
  const { data: feeHistory = [], isLoading: loadingHistory } = trpc.platformFees.myFees.useQuery();
  // Descontos por indicação (cascata)
  const { data: commissionsData, isLoading: loadingDiscounts } = trpc.mgm.getMyCommissions.useQuery();

  const discountPending = commissionsData?.pending ?? 0;
  const discountApplied = commissionsData?.paid ?? 0;
  const discountEntries = commissionsData?.entries ?? [];

  // Calcula taxa líquida do mês atual após descontos
  const currentFeeAmount = currentFee && "feeAmount" in currentFee ? Number(currentFee.feeAmount) : null;
  const pendingDiscountThisMonth = discountEntries
    .filter((e: any) => e.status === "pending")
    .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const netFee = currentFeeAmount !== null
    ? Math.max(0, currentFeeAmount - pendingDiscountThisMonth)
    : null;

  const isGracePeriod = currentFee && "status" in currentFee && currentFee.status === "grace_period";
  const isPreview = currentFee && "status" in currentFee && currentFee.status === "preview";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Minha Assinatura</Text>
          <Text style={styles.headerSub}>Taxa de plataforma e descontos por indicação</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>

        {/* ── Bloco 1: Taxa do mês atual ─────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>📅 Taxa deste mês</Text>

          {loadingCurrent ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : isGracePeriod ? (
            <View style={styles.gracePeriodBox}>
              <Text style={styles.gracePeriodIcon}>🎁</Text>
              <Text style={[styles.gracePeriodTitle, { color: "#16A34A" }]}>Você está no período gratuito</Text>
              <Text style={[styles.gracePeriodSub, { color: colors.muted }]}>
                Os primeiros 6 meses de uso do MediAlert são gratuitos.{"\n"}
                Nenhuma taxa será cobrada neste período.
              </Text>
            </View>
          ) : currentFeeAmount !== null ? (
            <>
              {/* Linha: taxa bruta */}
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: colors.muted }]}>
                  {isPreview ? "Previsão da taxa" : "Taxa calculada"}
                </Text>
                <Text style={[styles.feeValue, { color: colors.foreground }]}>
                  {formatCurrency(currentFeeAmount)}
                </Text>
              </View>

              {/* Linha: desconto por indicações */}
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: "#16A34A" }]}>
                  🏷️ Desconto por indicações
                </Text>
                <Text style={[styles.feeValue, { color: "#16A34A" }]}>
                  {pendingDiscountThisMonth > 0
                    ? `- ${formatCurrency(pendingDiscountThisMonth)}`
                    : "R$ 0,00"}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Linha: taxa líquida */}
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabelBold, { color: colors.foreground }]}>
                  Valor a pagar
                </Text>
                <Text style={[styles.feeNet, { color: netFee === 0 ? "#16A34A" : colors.primary }]}>
                  {netFee !== null ? formatCurrency(netFee) : "—"}
                </Text>
              </View>

              {isPreview && (
                <View style={[styles.infoBox, { backgroundColor: "#EBF4FF" }]}>
                  <Text style={[styles.infoText, { color: "#0D5BBF" }]}>
                    ℹ️ Valor estimado com base na receita do mês até agora. A taxa final será calculada pelo admin ao final do mês.
                  </Text>
                </View>
              )}

              {/* Como a taxa é calculada */}
              <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.infoText, { color: colors.muted }]}>
                  {"status" in currentFee && currentFee.feeType === "percentage"
                    ? `Taxa de 2,5% sobre faturamento de ${formatCurrency(Number((currentFee as any).monthlyRevenue ?? 0))}`
                    : "Taxa mínima mensal (faturamento abaixo de R$ 12.000)"}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Nenhuma taxa calculada ainda para este mês.
            </Text>
          )}
        </View>

        {/* ── Bloco 2: Como funciona a cobrança ──────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>💡 Como funciona a cobrança</Text>

          <View style={styles.ruleRow}>
            <View style={[styles.ruleBadge, { backgroundColor: "#D1FAE5" }]}>
              <Text style={[styles.ruleBadgeText, { color: "#065F46" }]}>0–6 meses</Text>
            </View>
            <Text style={[styles.ruleDesc, { color: colors.foreground }]}>Gratuito — período de adaptação</Text>
          </View>

          <View style={styles.ruleRow}>
            <View style={[styles.ruleBadge, { backgroundColor: "#DBEAFE" }]}>
              <Text style={[styles.ruleBadgeText, { color: "#1E40AF" }]}>{"< R$ 12k/mês"}</Text>
            </View>
            <Text style={[styles.ruleDesc, { color: colors.foreground }]}>Taxa mínima de R$ 100,00/mês</Text>
          </View>

          <View style={styles.ruleRow}>
            <View style={[styles.ruleBadge, { backgroundColor: "#FEF9C3" }]}>
              <Text style={[styles.ruleBadgeText, { color: "#854D0E" }]}>{"≥ R$ 12k/mês"}</Text>
            </View>
            <Text style={[styles.ruleDesc, { color: colors.foreground }]}>2,5% do faturamento mensal</Text>
          </View>

          <View style={[styles.exampleBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.exampleTitle, { color: colors.muted }]}>Exemplos práticos</Text>
            {[
              ["Faturamento R$ 8.000", "Taxa R$ 100,00 (mínimo)"],
              ["Faturamento R$ 12.000", "Taxa R$ 300,00 (2,5%)"],
              ["Faturamento R$ 20.000", "Taxa R$ 500,00 (2,5%)"],
              ["Faturamento R$ 50.000", "Taxa R$ 1.250,00 (2,5%)"],
            ].map(([left, right], i) => (
              <View key={i} style={[styles.exampleRow, { borderTopColor: colors.border, borderTopWidth: i > 0 ? 0.5 : 0 }]}>
                <Text style={[styles.exampleLeft, { color: colors.muted }]}>{left}</Text>
                <Text style={[styles.exampleRight, { color: colors.primary }]}>{right}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Bloco 3: Desconto em cascata ──────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>🏷️ Seus descontos por indicação</Text>

          {loadingDiscounts ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : (
            <>
              {/* Resumo */}
              <View style={styles.discountSummaryRow}>
                <View style={[styles.discountBox, { backgroundColor: "#FFF7ED" }]}>
                  <Text style={[styles.discountLabel, { color: "#EA580C" }]}>Pendente</Text>
                  <Text style={[styles.discountValue, { color: "#EA580C" }]}>{formatCurrency(discountPending)}</Text>
                  <Text style={[styles.discountSub, { color: "#EA580C" }]}>a aplicar</Text>
                </View>
                <View style={[styles.discountBox, { backgroundColor: "#F0FDF4" }]}>
                  <Text style={[styles.discountLabel, { color: "#16A34A" }]}>Aplicado</Text>
                  <Text style={[styles.discountValue, { color: "#16A34A" }]}>{formatCurrency(discountApplied)}</Text>
                  <Text style={[styles.discountSub, { color: "#16A34A" }]}>já descontado</Text>
                </View>
              </View>

              {/* Tabela de referência de descontos */}
              <View style={[styles.discountTable, { borderColor: colors.border }]}>
                <View style={[styles.discountTableHeader, { backgroundColor: colors.primary }]}>
                  <Text style={styles.discountTableHeaderText}>Nível</Text>
                  <Text style={styles.discountTableHeaderText}>1º Ano</Text>
                  <Text style={styles.discountTableHeaderText}>2º Ano+</Text>
                </View>
                {[
                  ["Nível 1 — Indicado direto", "R$ 150/mês", "R$ 100/mês"],
                  ["Nível 2 — Indicado do indicado", "R$ 75/mês", "R$ 50/mês"],
                  ["Nível 3 — 3ª geração", "R$ 50/mês", "R$ 25/mês"],
                ].map(([nivel, ano1, ano2], i) => (
                  <View
                    key={i}
                    style={[
                      styles.discountTableRow,
                      {
                        backgroundColor: i % 2 === 0 ? colors.background : colors.surface,
                        borderTopColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.discountTableCell, { color: colors.foreground, flex: 2 }]}>{nivel}</Text>
                    <Text style={[styles.discountTableCell, { color: "#16A34A", fontWeight: "700" }]}>{ano1}</Text>
                    <Text style={[styles.discountTableCell, { color: colors.muted }]}>{ano2}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.infoBox, { backgroundColor: "#EBF4FF" }]}>
                <Text style={[styles.infoText, { color: "#0D5BBF" }]}>
                  ℹ️ Desconto ativo apenas enquanto o médico indicado estiver ativo e com faturamento ≥ R$ 12.000/mês. O desconto é abatido diretamente na sua fatura — você não recebe dinheiro.
                </Text>
              </View>

              {/* Botão para ver rede */}
              <TouchableOpacity
                style={[styles.networkBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/doctor/mgm-referral" as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.networkBtnText}>👥 Ver rede de indicações e compartilhar código</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Bloco 4: Histórico de taxas ───────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>📋 Histórico de taxas</Text>

          {loadingHistory ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : feeHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Nenhuma taxa registrada ainda.{"\n"}O histórico aparece após o primeiro cálculo mensal.
              </Text>
            </View>
          ) : (
            feeHistory.map((item: any) => (
              <View
                key={item.id}
                style={[styles.historyRow, { borderBottomColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyMonth, { color: colors.foreground }]}>
                    {formatMonth(item.referenceMonth)}
                  </Text>
                  <Text style={[styles.historyType, { color: colors.muted }]}>
                    {item.feeType === "percentage"
                      ? `2,5% sobre ${formatCurrency(Number(item.monthlyRevenue))}`
                      : `Taxa mínima (faturamento ${formatCurrency(Number(item.monthlyRevenue))})`}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[styles.historyAmount, { color: colors.primary }]}>
                    {formatCurrency(Number(item.feeAmount))}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: item.status === "paid" ? "#DCFCE7" : "#FEF3C7" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: item.status === "paid" ? "#16A34A" : "#D97706" },
                      ]}
                    >
                      {item.status === "paid" ? "✓ Pago" : "Pendente"}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

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
    backgroundColor: "#1a1a2e",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backBtn: { padding: 4, marginRight: 8 },
  backIcon: { fontSize: 32, lineHeight: 36, fontWeight: "300", color: "#fff" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 12, marginTop: 1, color: "rgba(255,255,255,0.6)" },
  scroll: { padding: 16, gap: 16 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", lineHeight: 21 },
  // Taxa atual
  feeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  feeLabel: { fontSize: 14, lineHeight: 20 },
  feeLabelBold: { fontSize: 15, fontWeight: "700", lineHeight: 21 },
  feeValue: { fontSize: 15, fontWeight: "600", lineHeight: 21 },
  feeNet: { fontSize: 22, fontWeight: "800", lineHeight: 28 },
  divider: { height: 1, marginVertical: 4 },
  infoBox: { borderRadius: 10, padding: 10, marginTop: 2 },
  infoText: { fontSize: 12, lineHeight: 17 },
  // Período gratuito
  gracePeriodBox: { alignItems: "center", paddingVertical: 12, gap: 8 },
  gracePeriodIcon: { fontSize: 40, lineHeight: 48 },
  gracePeriodTitle: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  gracePeriodSub: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  // Regras de cobrança
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ruleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  ruleBadgeText: { fontSize: 11, fontWeight: "700", lineHeight: 16 },
  ruleDesc: { fontSize: 13, lineHeight: 19, flex: 1 },
  exampleBox: { borderRadius: 10, borderWidth: 1, overflow: "hidden", marginTop: 4 },
  exampleTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, padding: 10, paddingBottom: 6 },
  exampleRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8 },
  exampleLeft: { fontSize: 13, lineHeight: 18 },
  exampleRight: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  // Descontos cascata
  discountSummaryRow: { flexDirection: "row", gap: 10 },
  discountBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 2 },
  discountLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  discountValue: { fontSize: 20, fontWeight: "800", lineHeight: 26 },
  discountSub: { fontSize: 10, lineHeight: 14 },
  discountTable: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  discountTableHeader: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8 },
  discountTableHeaderText: { flex: 1, color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  discountTableRow: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 9, borderTopWidth: 0.5 },
  discountTableCell: { flex: 1, fontSize: 12, lineHeight: 17 },
  networkBtn: { borderRadius: 12, padding: 13, alignItems: "center", marginTop: 4 },
  networkBtnText: { color: "#fff", fontSize: 14, fontWeight: "700", lineHeight: 20 },
  // Histórico
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  historyMonth: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  historyType: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  historyAmount: { fontSize: 15, fontWeight: "700", lineHeight: 21 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: "600", lineHeight: 16 },
  // Estados vazios
  emptyState: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyIcon: { fontSize: 36, lineHeight: 44 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: "center" },
});

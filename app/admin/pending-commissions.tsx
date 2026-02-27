import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
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

interface CommissionEntry {
  id: number;
  referrerName: string;
  referredName: string;
  amount: number;
  level: number;
  referenceMonth: string;
  appointmentsCount: number;
  status: string;
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  bankAccountType: string | null;
  pixKey: string | null;
}

interface DoctorGroup {
  doctorName: string;
  totalAmount: number;
  entries: CommissionEntry[];
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  bankAccountType: string | null;
  pixKey: string | null;
}

export default function PendingCommissions() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();

  const { data: commissions, isLoading } = trpc.mgm.adminGetAllCommissions.useQuery({ status: "pending" });

  const markPaid = trpc.mgm.adminMarkPaid.useMutation({
    onSuccess: () => {
      utils.mgm.adminGetAllCommissions.invalidate();
      utils.mgm.adminGetFinancialKPIs.invalidate();
      utils.mgm.adminGetKPIs.invalidate();
    },
  });

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatMonth = (ref: string) => {
    const [year, month] = ref.split("-");
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${months[parseInt(month) - 1]}/${year}`;
  };

  // Calculate next payment date (day 10 of next month)
  const nextPaymentDate = useMemo(() => {
    const now = new Date();
    const day10 = new Date(now.getFullYear(), now.getMonth(), 10);
    if (now.getDate() >= 10) {
      day10.setMonth(day10.getMonth() + 1);
    }
    return day10.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }, []);

  const daysUntilPayment = useMemo(() => {
    const now = new Date();
    const day10 = new Date(now.getFullYear(), now.getMonth(), 10);
    if (now.getDate() >= 10) {
      day10.setMonth(day10.getMonth() + 1);
    }
    const diff = Math.ceil((day10.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, []);

  // Group commissions by doctor (referrer)
  const grouped = useMemo<DoctorGroup[]>(() => {
    if (!commissions) return [];
    const map = new Map<string, DoctorGroup>();
    for (const c of commissions as CommissionEntry[]) {
      const key = c.referrerName;
      if (!map.has(key)) {
        map.set(key, {
          doctorName: key,
          totalAmount: 0,
          entries: [],
          bankName: c.bankName,
          bankAgency: c.bankAgency,
          bankAccount: c.bankAccount,
          bankAccountType: c.bankAccountType,
          pixKey: c.pixKey,
        });
      }
      const group = map.get(key)!;
      group.totalAmount += c.amount;
      group.entries.push(c);
    }
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [commissions]);

  const totalPending = useMemo(() => {
    return grouped.reduce((sum, g) => sum + g.totalAmount, 0);
  }, [grouped]);

  const renderDoctorGroup = ({ item }: { item: DoctorGroup }) => (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Doctor header */}
      <View style={s.cardHeader}>
        <View style={[s.avatar, { backgroundColor: "#FEF3C7" }]}>
          <Text style={s.avatarText}>
            {item.doctorName.replace(/^(Dr\.|Dra\.)\s*/, "").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={s.cardHeaderInfo}>
          <Text style={[s.doctorName, { color: colors.foreground }]}>{item.doctorName}</Text>
          <Text style={[s.entryCount, { color: colors.muted }]}>
            {item.entries.length} {item.entries.length === 1 ? "comissão" : "comissões"} pendente{item.entries.length > 1 ? "s" : ""}
          </Text>
        </View>
        <View style={s.totalContainer}>
          <Text style={[s.totalAmount, { color: "#EF4444" }]}>{formatCurrency(item.totalAmount)}</Text>
        </View>
      </View>

      {/* Commission entries */}
      <View style={[s.entriesContainer, { borderTopColor: colors.border }]}>
        {item.entries.map((entry) => (
          <View key={entry.id} style={[s.entryRow, { borderBottomColor: colors.border }]}>
            <View style={s.entryInfo}>
              <Text style={[s.entryReferredName, { color: colors.foreground }]}>
                Indicado: {entry.referredName}
              </Text>
              <Text style={[s.entryMeta, { color: colors.muted }]}>
                Nível {entry.level} · {formatMonth(entry.referenceMonth)} · {entry.appointmentsCount} consultas
              </Text>
            </View>
            <View style={s.entryRight}>
              <Text style={[s.entryAmount, { color: colors.foreground }]}>{formatCurrency(entry.amount)}</Text>
              <TouchableOpacity
                style={s.payBtn}
                onPress={() =>
                  showConfirm(
                    "Aplicar desconto",
                    `Confirmar aplicação de desconto de ${formatCurrency(entry.amount)} para ${entry.referrerName}?`,
                    () => markPaid.mutate({ id: entry.id })
                  )
                }
                disabled={markPaid.isPending}
              >
                <Text style={s.payBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Bank info */}
      {(item.pixKey || item.bankName) && (
        <View style={[s.bankInfoContainer, { borderTopColor: colors.border }]}>
          {item.pixKey && (
            <View style={s.bankInfoRow}>
              <Text style={[s.bankInfoLabel, { color: colors.muted }]}>PIX</Text>
              <Text style={[s.bankInfoValue, { color: colors.foreground }]}>{item.pixKey}</Text>
            </View>
          )}
          {item.bankName && (
            <View style={s.bankInfoRow}>
              <Text style={[s.bankInfoLabel, { color: colors.muted }]}>Banco</Text>
              <Text style={[s.bankInfoValue, { color: colors.foreground }]}>
                {item.bankName}{item.bankAgency ? ` · Ag ${item.bankAgency}` : ""}{item.bankAccount ? ` · Cc ${item.bankAccount}` : ""}
                {item.bankAccountType ? ` (${item.bankAccountType === "poupanca" ? "Poupan\u00e7a" : "Corrente"})` : ""}
              </Text>
            </View>
          )}
          {!item.pixKey && !item.bankName && (
            <Text style={[s.bankInfoLabel, { color: "#F59E0B" }]}>Dados banc\u00e1rios n\u00e3o informados</Text>
          )}
        </View>
      )}
      {!item.pixKey && !item.bankName && (
        <View style={[s.bankInfoContainer, { borderTopColor: colors.border }]}>
          <Text style={{ color: "#F59E0B", fontSize: 12, fontWeight: "600", lineHeight: 16 }}>\u26a0\ufe0f Dados banc\u00e1rios n\u00e3o informados</Text>
        </View>
      )}

      {/* Pay all button */}
      {item.entries.length > 1 && (
        <TouchableOpacity
          style={s.payAllBtn}
          onPress={() =>
            showConfirm(
              "Aplicar todos",
              `Confirmar aplicação de desconto de ${formatCurrency(item.totalAmount)} (${item.entries.length} comissões) para ${item.doctorName}?`,
              () => {
                for (const entry of item.entries) {
                  markPaid.mutate({ id: entry.id });
                }
              }
            )
          }
          disabled={markPaid.isPending}
        >
          <Text style={s.payAllBtnText}>
            Aplicar todos · {formatCurrency(item.totalAmount)}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScreenContainer edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerTextContainer}>
          <Text style={s.headerTitle}>Descontos Pendentes de Aplicação</Text>
          <Text style={s.headerSubtitle}>Médicos com desconto a aplicar na assinatura</Text>
        </View>
      </View>

      {/* Payment date banner */}
      <View style={s.dateBanner}>
        <View style={s.dateBannerLeft}>
          <Text style={s.dateBannerIcon}>📅</Text>
          <View>
            <Text style={s.dateBannerLabel}>Próxima aplicação</Text>
            <Text style={s.dateBannerDate}>{nextPaymentDate}</Text>
          </View>
        </View>
        <View style={s.dateBannerBadge}>
          <Text style={s.dateBannerDays}>
            {daysUntilPayment === 0 ? "Hoje!" : `${daysUntilPayment} dia${daysUntilPayment > 1 ? "s" : ""}`}
          </Text>
        </View>
      </View>

      {/* Summary */}
      <View style={[s.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: "#EF4444" }]}>
              {formatCurrency(totalPending)}
            </Text>
            <Text style={[s.summaryLabel, { color: colors.muted }]}>Total de descontos</Text>
          </View>
          <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: colors.primary }]}>
              {grouped.length}
            </Text>
            <Text style={[s.summaryLabel, { color: colors.muted }]}>
              {grouped.length === 1 ? "Médico" : "Médicos"}
            </Text>
          </View>
          <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: "#F59E0B" }]}>
              {commissions?.length ?? 0}
            </Text>
            <Text style={[s.summaryLabel, { color: colors.muted }]}>Comissões</Text>
          </View>
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : grouped.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>✅</Text>
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>Tudo em dia!</Text>
          <Text style={[s.emptyText, { color: colors.muted }]}>
            Não há descontos pendentes de aplicação.
          </Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.doctorName}
          renderItem={renderDoctorGroup}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
    backgroundColor: "#1a1a2e",
  },
  backBtn: { padding: 4 },
  backIcon: { color: "#fff", fontSize: 32, lineHeight: 36, fontWeight: "300" },
  headerTextContainer: { flex: 1 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700", lineHeight: 26 },
  headerSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 18, marginTop: 2 },

  dateBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FED7AA",
  },
  dateBannerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateBannerIcon: { fontSize: 24, lineHeight: 30 },
  dateBannerLabel: { fontSize: 11, fontWeight: "600", color: "#92400E", lineHeight: 16, textTransform: "uppercase", letterSpacing: 0.5 },
  dateBannerDate: { fontSize: 15, fontWeight: "700", color: "#78350F", lineHeight: 22, marginTop: 1 },
  dateBannerBadge: { backgroundColor: "#F59E0B", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dateBannerDays: { color: "#fff", fontSize: 12, fontWeight: "700", lineHeight: 16 },

  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 18, fontWeight: "800", lineHeight: 24 },
  summaryLabel: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  summaryDivider: { width: 1, height: 36 },

  listContent: { padding: 16, gap: 12, paddingBottom: 40 },

  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#D97706", lineHeight: 24 },
  cardHeaderInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: "700", lineHeight: 22 },
  entryCount: { fontSize: 12, lineHeight: 16, marginTop: 1 },
  totalContainer: { alignItems: "flex-end" },
  totalAmount: { fontSize: 18, fontWeight: "800", lineHeight: 24 },

  entriesContainer: { borderTopWidth: 1 },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  entryInfo: { flex: 1 },
  entryReferredName: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  entryMeta: { fontSize: 11, lineHeight: 16, marginTop: 1 },
  entryRight: { alignItems: "flex-end", gap: 4 },
  entryAmount: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  payBtn: {
    backgroundColor: "#16A34A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  payBtnText: { color: "#fff", fontSize: 11, fontWeight: "700", lineHeight: 16 },

  payAllBtn: {
    backgroundColor: "#16A34A",
    margin: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  payAllBtnText: { color: "#fff", fontSize: 14, fontWeight: "700", lineHeight: 20 },

  bankInfoContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.02)",
    gap: 4,
  },
  bankInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bankInfoLabel: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    minWidth: 36,
  },
  bankInfoValue: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    flex: 1,
  },

  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 48, lineHeight: 56 },
  emptyTitle: { fontSize: 18, fontWeight: "700", lineHeight: 24 },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: 40 },
});

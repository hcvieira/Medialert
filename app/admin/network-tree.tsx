import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

type TreeNode = {
  profileId: number;
  name: string;
  referralCode: string | null;
  indicatedById: number | null;
  indicatorName: string | null;
  directReferralCount: number;
  totalEarned: number;
  pendingAmount: number;
  joinedAt: string;
};

export default function AdminNetworkTree() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const { data, isLoading } = trpc.mgm.adminGetNetworkTree.useQuery();

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter roots (no indicator) or those matching search
  const allNodes: TreeNode[] = data ?? [];
  const roots = allNodes.filter((n) => n.indicatedById === null);
  const getChildren = (parentId: number) => allNodes.filter((n) => n.indicatedById === parentId);

  const searchFiltered = search.trim()
    ? allNodes.filter(
        (n) =>
          n.name.toLowerCase().includes(search.toLowerCase()) ||
          (n.referralCode ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const styles = StyleSheet.create({
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
    headerText: { flex: 1 },
    headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700", lineHeight: 26 },
    headerSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 18, marginTop: 2 },
    searchBox: {
      margin: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.surface,
      lineHeight: 20,
    },
    statsRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: { fontSize: 20, fontWeight: "800", color: colors.primary, lineHeight: 26 },
    statLabel: { fontSize: 11, color: colors.muted, lineHeight: 15, marginTop: 2, textAlign: "center" },
    nodeCard: {
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    nodeHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      gap: 10,
    },
    nodeAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#EBF4FF",
      alignItems: "center",
      justifyContent: "center",
    },
    nodeAvatarText: { fontSize: 16, lineHeight: 22 },
    nodeInfo: { flex: 1 },
    nodeName: { fontSize: 15, fontWeight: "700", color: colors.foreground, lineHeight: 22 },
    nodeCode: { fontSize: 12, color: colors.muted, lineHeight: 16 },
    nodeIndicator: { fontSize: 11, color: "#0a7ea4", lineHeight: 15, marginTop: 2 },
    nodeStats: { alignItems: "flex-end", gap: 2 },
    nodeReferrals: { fontSize: 13, fontWeight: "700", color: "#0a7ea4", lineHeight: 18 },
    nodeEarned: { fontSize: 11, color: "#10B981", fontWeight: "600", lineHeight: 15 },
    expandBtn: {
      paddingHorizontal: 14,
      paddingBottom: 10,
      paddingTop: 0,
    },
    expandBtnText: { fontSize: 12, color: "#0a7ea4", fontWeight: "600", lineHeight: 16 },
    childRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 10,
      backgroundColor: colors.background,
    },
    childDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#0a7ea4",
      marginLeft: 8,
    },
    childName: { flex: 1, fontSize: 14, color: colors.foreground, lineHeight: 20 },
    childCode: { fontSize: 11, color: colors.muted, lineHeight: 15 },
    emptyText: { textAlign: "center", color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 40 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      lineHeight: 18,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
  });

  const renderNode = (node: TreeNode) => {
    const children = getChildren(node.profileId);
    const isOpen = expanded.has(node.profileId);
    return (
      <View key={node.profileId} style={styles.nodeCard}>
        <View style={styles.nodeHeader}>
          <View style={styles.nodeAvatar}>
            <Text style={styles.nodeAvatarText}>👨‍⚕️</Text>
          </View>
          <View style={styles.nodeInfo}>
            <Text style={styles.nodeName} numberOfLines={1}>{node.name}</Text>
            <Text style={styles.nodeCode}>Código: {node.referralCode ?? "—"}</Text>
            {node.indicatorName && (
              <Text style={styles.nodeIndicator}>Indicado por: {node.indicatorName}</Text>
            )}
          </View>
          <View style={styles.nodeStats}>
            <Text style={styles.nodeReferrals}>{node.directReferralCount} ind.</Text>
            <Text style={styles.nodeEarned}>{formatCurrency(node.totalEarned + node.pendingAmount)}</Text>
          </View>
        </View>
        {children.length > 0 && (
          <TouchableOpacity style={styles.expandBtn} onPress={() => toggleExpand(node.profileId)} activeOpacity={0.7}>
            <Text style={styles.expandBtnText}>
              {isOpen ? "▲ Ocultar" : `▼ Ver ${children.length} indicado${children.length > 1 ? "s" : ""}`}
            </Text>
          </TouchableOpacity>
        )}
        {isOpen && children.map((child) => (
          <View key={child.profileId} style={styles.childRow}>
            <View style={styles.childDot} />
            <Text style={styles.childName} numberOfLines={1}>{child.name}</Text>
            <Text style={styles.childCode}>{child.referralCode ?? "—"}</Text>
            <Text style={{ fontSize: 11, color: "#10B981", fontWeight: "600", lineHeight: 15 }}>
              {child.directReferralCount > 0 ? `+${child.directReferralCount}` : ""}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const displayList = searchFiltered ?? roots;

  return (
    <ScreenContainer edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Estrutura da Rede</Text>
          <Text style={styles.headerSubtitle}>Hierarquia de indicações MGM</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => String(item.profileId)}
          ListHeaderComponent={
            <>
              <TextInput
                style={styles.searchBox}
                placeholder="Buscar por nome ou código..."
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{allNodes.length}</Text>
                  <Text style={styles.statLabel}>Total na{"\n"}rede</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: "#10B981" }]}>
                    {allNodes.filter((n) => n.indicatedById !== null).length}
                  </Text>
                  <Text style={styles.statLabel}>Indicados{"\n"}ativos</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: "#F59E0B" }]}>
                    {roots.length}
                  </Text>
                  <Text style={styles.statLabel}>Raízes da{"\n"}rede</Text>
                </View>
              </View>
              <Text style={styles.sectionTitle}>
                {searchFiltered ? `Resultados (${searchFiltered.length})` : `Médicos raiz (${roots.length})`}
              </Text>
            </>
          }
          renderItem={({ item }) => renderNode(item)}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum médico encontrado.</Text>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </ScreenContainer>
  );
}

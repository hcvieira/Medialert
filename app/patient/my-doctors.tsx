import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

function StarRow({ doctorId }: { doctorId: number }) {
  const ratingQuery = trpc.reviews.getRatingSummary.useQuery({ doctorId });
  const data = ratingQuery.data;
  if (!data || data.count === 0) return null;
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
      {stars.map((s) => (
        <Text key={s} style={{ fontSize: 13, color: s <= Math.round(data.average) ? "#F59E0B" : "#D1D5DB" }}>★</Text>
      ))}
      <Text style={{ fontSize: 12, color: "#92400E", fontWeight: "600" }}>
        {data.average.toFixed(1)} ({data.count} avaliação{data.count !== 1 ? "ões" : ""})
      </Text>
    </View>
  );
}

export default function MyDoctorsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const doctorsQuery = trpc.doctor.getMyDoctors.useQuery();

  const doctors = doctorsQuery.data ?? [];

  const getInsurances = (ins: string | null): string[] => {
    try { return JSON.parse(ins ?? "[]"); }
    catch { return []; }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: "#0D5BBF" }]}>
        <TouchableOpacity
          onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace("/(tabs)" as any); } }}
          style={styles.backBtn}
        >
          <IconSymbol name="arrow.left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Médicos</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/patient/accept-invite" as any)}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {doctorsQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0D5BBF" />
        </View>
      ) : doctors.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <IconSymbol name="stethoscope" size={48} color="#0D5BBF" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum médico vinculado</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>
            Peça ao seu médico um código de convite e vincule-o ao seu perfil
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/patient/accept-invite" as any)}
            activeOpacity={0.85}
          >
            <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Adicionar médico</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(item) => String(item?.id)}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          ListFooterComponent={
            <TouchableOpacity
              style={[styles.addMoreBtn, { borderColor: "#0D5BBF" }]}
              onPress={() => router.push("/patient/accept-invite" as any)}
              activeOpacity={0.85}
            >
              <IconSymbol name="plus.circle.fill" size={18} color="#0D5BBF" />
              <Text style={[styles.addMoreBtnText, { color: "#0D5BBF" }]}>Adicionar outro médico</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => {
            const insurances = getInsurances(item?.profile?.insurances ?? null);
            return (
              <View style={[styles.doctorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.doctorAvatar}>
                  {item?.profile?.photoUrl
                    ? <Image source={{ uri: item.profile.photoUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
                    : <IconSymbol name="stethoscope" size={28} color="#0D5BBF" />}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.doctorName, { color: colors.foreground }]}>
                    Dr. {item?.name ?? "Médico"}
                  </Text>
                  {item?.profile?.specialty ? (
                    <Text style={[styles.doctorSpecialty, { color: "#0D5BBF" }]}>{item.profile.specialty}</Text>
                  ) : null}
                  {item?.profile?.crm ? (
                    <Text style={[styles.doctorCrm, { color: colors.muted }]}>
                      CRM {item.profile.crm}/{item.profile.crmState}
                    </Text>
                  ) : null}
                  {item?.profile?.phone ? (
                    <Text style={[styles.doctorPhone, { color: colors.muted }]}>{item.profile.phone}</Text>
                  ) : null}
                  {item?.id ? <StarRow doctorId={item.id} /> : null}
                  {item?.id ? (
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: "/patient/doctor-profile" as any, params: { doctorId: String(item.id) } })}
                      activeOpacity={0.8}
                      style={{ marginTop: 4 }}
                    >
                      <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>Ver perfil completo →</Text>
                    </TouchableOpacity>
                  ) : null}
                  {insurances.length > 0 && (
                    <View style={styles.tagsRow}>
                      {insurances.slice(0, 3).map((ins) => (
                        <View key={ins} style={styles.insTag}>
                          <Text style={styles.insTagText}>{ins}</Text>
                        </View>
                      ))}
                      {insurances.length > 3 && (
                        <View style={styles.insTag}>
                          <Text style={styles.insTagText}>+{insurances.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff", flex: 1, lineHeight: 26 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 16 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", textAlign: "center", lineHeight: 26 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    backgroundColor: "#0D5BBF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15, lineHeight: 20 },
  doctorCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    gap: 14,
    borderWidth: 1,
  },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  doctorName: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  doctorSpecialty: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  doctorCrm: { fontSize: 13, lineHeight: 18 },
  doctorPhone: { fontSize: 13, lineHeight: 18 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  insTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#EBF4FF",
  },
  insTagText: { fontSize: 12, fontWeight: "500", color: "#0D5BBF", lineHeight: 16 },
  addMoreBtn: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  addMoreBtnText: { fontWeight: "600", fontSize: 15, lineHeight: 20 },
});

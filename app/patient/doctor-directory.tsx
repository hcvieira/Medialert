import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useMemo } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useFavoriteDoctors } from "@/hooks/use-favorite-doctors";

// ─── Types ────────────────────────────────────────────────────────────────────
type DoctorWithRating = {
  id: number;
  name: string;
  photoUrl: string | null;
  specialty: string;
  crm: string;
  crmState: string;
  insurances: string;
  phone: string | null;
  bio: string | null;
  address: string | null;
  averageRating: number;
  reviewCount: number;
};

type SortOption = "rating" | "az" | "reviews";
type TabOption = "all" | "favorites";

const SORT_OPTIONS: { key: SortOption; label: string; icon: string }[] = [
  { key: "rating", label: "Melhor avaliação", icon: "⭐" },
  { key: "az", label: "A–Z", icon: "🔤" },
  { key: "reviews", label: "Mais avaliados", icon: "💬" },
];

const PAGE_SIZE = 10;

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Text key={s} style={[starStyles.star, { color: s <= Math.round(rating) ? "#F59E0B" : "#D1D5DB" }]}>★</Text>
      ))}
      {count > 0 ? (
        <Text style={starStyles.label}>{rating.toFixed(1)} ({count} avaliação{count !== 1 ? "ões" : ""})</Text>
      ) : (
        <Text style={starStyles.noRating}>Sem avaliações</Text>
      )}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 2 },
  star: { fontSize: 13, lineHeight: 17 },
  label: { fontSize: 12, color: "#6B7280", marginLeft: 4, lineHeight: 17 },
  noRating: { fontSize: 12, color: "#9CA3AF", marginLeft: 4, lineHeight: 17 },
});

// ─── Filter Row ───────────────────────────────────────────────────────────────
function FilterRow({
  label, options, selected, onSelect, activeColor, colors,
}: {
  label: string; options: string[]; selected: string | null;
  onSelect: (v: string | null) => void; activeColor: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={filterRowStyles.wrapper}>
      <Text style={[filterRowStyles.label, { color: colors.muted }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={filterRowStyles.scroll}>
        {options.map((item) => {
          const isFirst = item === options[0];
          const isActive = isFirst ? !selected : selected === item;
          return (
            <TouchableOpacity
              key={item}
              style={[filterRowStyles.chip, { backgroundColor: isActive ? activeColor : colors.surface, borderColor: isActive ? activeColor : colors.border }]}
              onPress={() => onSelect(isFirst ? null : item)}
              activeOpacity={0.8}
            >
              <Text style={[filterRowStyles.chipText, { color: isActive ? "#fff" : colors.foreground }]} numberOfLines={1}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const filterRowStyles = StyleSheet.create({
  wrapper: { paddingTop: 10, paddingBottom: 2 },
  label: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 16, marginBottom: 6, lineHeight: 15 },
  scroll: { paddingHorizontal: 16, paddingBottom: 4, flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
});

// ─── Doctor Avatar ────────────────────────────────────────────────────────────
function DoctorAvatar({ photoUrl, name, size = 64, colors }: {
  photoUrl: string | null; name: string; size?: number; colors: ReturnType<typeof useColors>;
}) {
  const [imgError, setImgError] = useState(false);
  const initial = (name ?? "M").charAt(0).toUpperCase();
  const radius = size / 2;
  if (photoUrl && !imgError) {
    return <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: radius }} onError={() => setImgError(true)} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: radius, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary + "22" }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: "700", color: colors.primary, lineHeight: size * 0.5 }}>{initial}</Text>
    </View>
  );
}

// ─── Map View (native only) ───────────────────────────────────────────────────
function DoctorMapView({ doctors, onDoctorPress, colors }: {
  doctors: DoctorWithRating[];
  onDoctorPress: (id: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  if (Platform.OS === "web") {
    return (
      <View style={mapStyles.webFallback}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🗺️</Text>
        <Text style={[mapStyles.webFallbackTitle, { color: colors.foreground }]}>Mapa disponível no app</Text>
        <Text style={[mapStyles.webFallbackSub, { color: colors.muted }]}>
          Abra o MediAlert no seu celular para visualizar os médicos no mapa.
        </Text>
      </View>
    );
  }

  // Lazy import to avoid web crash
  const MapView = require("react-native-maps").default;
  const { Marker, Callout } = require("react-native-maps");

  // Parse coordinates from address (fallback: São Paulo center)
  const SP_CENTER = { latitude: -23.5505, longitude: -46.6333 };

  // Doctors with mock coordinates based on CRM state
  const STATE_COORDS: Record<string, { latitude: number; longitude: number }> = {
    SP: { latitude: -23.5505, longitude: -46.6333 },
    RJ: { latitude: -22.9068, longitude: -43.1729 },
    MG: { latitude: -19.9167, longitude: -43.9345 },
    RS: { latitude: -30.0346, longitude: -51.2177 },
    PR: { latitude: -25.4284, longitude: -49.2733 },
    BA: { latitude: -12.9714, longitude: -38.5014 },
    GO: { latitude: -16.6869, longitude: -49.2648 },
    DF: { latitude: -15.7801, longitude: -47.9292 },
    SC: { latitude: -27.5954, longitude: -48.548 },
    PE: { latitude: -8.0476, longitude: -34.877 },
  };

  const markers = doctors
    .filter((d) => d.address || d.crmState)
    .map((d, i) => {
      const base = STATE_COORDS[d.crmState] ?? SP_CENTER;
      // Spread markers slightly so they don't overlap
      const offset = 0.02;
      return {
        ...d,
        coordinate: {
          latitude: base.latitude + (Math.sin(i * 1.3) * offset),
          longitude: base.longitude + (Math.cos(i * 1.7) * offset),
        },
      };
    });

  const region = markers.length > 0
    ? { ...markers[0].coordinate, latitudeDelta: 0.5, longitudeDelta: 0.5 }
    : { ...SP_CENTER, latitudeDelta: 5, longitudeDelta: 5 };

  return (
    <MapView style={mapStyles.map} initialRegion={region} showsUserLocation>
      {markers.map((m) => (
        <Marker key={m.id} coordinate={m.coordinate} title={m.name} description={m.specialty}>
          <Callout onPress={() => onDoctorPress(m.id)}>
            <View style={mapStyles.callout}>
              <Text style={mapStyles.calloutName} numberOfLines={1}>{m.name}</Text>
              <Text style={mapStyles.calloutSpecialty}>{m.specialty}</Text>
              <Text style={mapStyles.calloutCta}>Ver perfil →</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

const mapStyles = StyleSheet.create({
  map: { flex: 1 },
  webFallback: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 8 },
  webFallbackTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", lineHeight: 24 },
  webFallbackSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  callout: { width: 200, padding: 8 },
  calloutName: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  calloutSpecialty: { fontSize: 12, color: "#6B7280", lineHeight: 17 },
  calloutCta: { fontSize: 12, color: "#0a7ea4", fontWeight: "600", marginTop: 4, lineHeight: 17 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DoctorDirectoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isFavorite, toggle } = useFavoriteDoctors();

  const [searchText, setSearchText] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedInsurance, setSelectedInsurance] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeTab, setActiveTab] = useState<TabOption>("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const doctorsQuery = trpc.reviews.listDoctorsWithRatings.useQuery(undefined, { staleTime: 120_000 });
  const doctors: DoctorWithRating[] = (doctorsQuery.data ?? []) as DoctorWithRating[];

  // ── Filter options ──────────────────────────────────────────────────────────
  const specialtyOptions = useMemo(() => {
    const set = new Set(doctors.map((d) => d.specialty).filter(Boolean));
    return ["Todas as especialidades", ...Array.from(set).sort()];
  }, [doctors]);

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => {
      if (d.address) {
        const match = d.address.match(/([A-Za-zÀ-ÿ\s]+)\s*[-–]\s*([A-Z]{2})\s*$/);
        if (match) set.add(`${match[1].trim()} - ${match[2]}`);
        else { const parts = d.address.split(","); if (parts.length >= 2) set.add(parts[parts.length - 1].trim()); }
      }
      if (d.crmState) set.add(d.crmState);
    });
    return ["Qualquer região", ...Array.from(set).sort()];
  }, [doctors]);

  const insuranceOptions = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => {
      try { const list: string[] = JSON.parse(d.insurances); list.forEach((ins) => ins && set.add(ins)); } catch {}
    });
    return ["Qualquer convênio", ...Array.from(set).sort()];
  }, [doctors]);

  // ── Filter + Sort ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let result = doctors.filter((d) => {
      const textMatch = !q || (d.name ?? "").toLowerCase().includes(q) || (d.specialty ?? "").toLowerCase().includes(q) || (d.address ?? "").toLowerCase().includes(q) || (d.crm ?? "").toLowerCase().includes(q);
      const specialtyMatch = !selectedSpecialty || d.specialty === selectedSpecialty;
      let regionMatch = true;
      if (selectedRegion) { const addr = (d.address ?? "").toLowerCase(); const state = (d.crmState ?? "").toLowerCase(); regionMatch = addr.includes(selectedRegion.toLowerCase()) || state === selectedRegion.toLowerCase(); }
      let insuranceMatch = true;
      if (selectedInsurance) { try { const list: string[] = JSON.parse(d.insurances); insuranceMatch = list.some((ins) => ins.toLowerCase().includes(selectedInsurance.toLowerCase())); } catch { insuranceMatch = false; } }
      return textMatch && specialtyMatch && regionMatch && insuranceMatch;
    });

    if (activeTab === "favorites") result = result.filter((d) => isFavorite(d.id));

    result.sort((a, b) => {
      if (sortBy === "rating") { if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating; return b.reviewCount - a.reviewCount; }
      if (sortBy === "reviews") return b.reviewCount - a.reviewCount;
      return (a.name ?? "").localeCompare(b.name ?? "", "pt-BR");
    });
    return result;
  }, [doctors, searchText, selectedSpecialty, selectedRegion, selectedInsurance, sortBy, activeTab, isFavorite]);

  const resetPagination = () => setVisibleCount(PAGE_SIZE);
  const visibleDoctors = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const hasActiveFilters = !!(searchText || selectedSpecialty || selectedRegion || selectedInsurance);
  const favCount = doctors.filter((d) => isFavorite(d.id)).length;

  const clearAllFilters = () => { setSearchText(""); setSelectedSpecialty(null); setSelectedRegion(null); setSelectedInsurance(null); resetPagination(); };
  const currentSortLabel = SORT_OPTIONS.find((s) => s.key === sortBy)?.label ?? "Ordenar";

  const navigateToDoctor = (id: number) => router.push({ pathname: "/patient/doctor-profile" as any, params: { doctorId: String(id) } });

  // ── Card renderer ───────────────────────────────────────────────────────────
  const renderDoctor = ({ item }: { item: DoctorWithRating }) => {
    let insuranceList: string[] = [];
    try { insuranceList = JSON.parse(item.insurances); } catch {}
    const fav = isFavorite(item.id);

    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => navigateToDoctor(item.id)}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <DoctorAvatar photoUrl={item.photoUrl} name={item.name} size={64} colors={colors} />
            <View style={styles.cardInfo}>
              <Text style={[styles.doctorName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.specialty, { color: colors.primary }]} numberOfLines={1}>{item.specialty}</Text>
              <Text style={[styles.crm, { color: colors.muted }]}>CRM {item.crm}/{item.crmState}</Text>
              <StarRating rating={item.averageRating} count={item.reviewCount} />
            </View>
            {/* Favorite button */}
            <TouchableOpacity
              style={[styles.favBtn, { backgroundColor: fav ? "#FEF3C7" : colors.background, borderColor: fav ? "#F59E0B" : colors.border }]}
              onPress={(e) => { e.stopPropagation?.(); toggle(item.id); }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 18, lineHeight: 22 }}>{fav ? "❤️" : "🤍"}</Text>
            </TouchableOpacity>
          </View>

          {item.address ? (
            <View style={styles.infoRow}>
              <IconSymbol name="location.fill" size={13} color={colors.muted} />
              <Text style={[styles.infoText, { color: colors.muted }]} numberOfLines={2}>{item.address}</Text>
            </View>
          ) : null}

          {item.phone ? (
            <View style={styles.infoRow}>
              <IconSymbol name="phone.fill" size={13} color={colors.muted} />
              <Text style={[styles.infoText, { color: colors.muted }]}>{item.phone}</Text>
            </View>
          ) : null}

          {insuranceList.length > 0 ? (
            <View style={styles.insuranceRow}>
              <Text style={[styles.insuranceLabel, { color: colors.muted }]}>Convênios: </Text>
              <Text style={[styles.insuranceValue, { color: colors.foreground }]} numberOfLines={2}>{insuranceList.join(" · ")}</Text>
            </View>
          ) : null}

          {item.bio ? (
            <Text style={[styles.bio, { color: colors.muted }]} numberOfLines={2}>{item.bio}</Text>
          ) : null}

          <View style={[styles.ctaRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.ctaText, { color: colors.primary }]}>Ver perfil e solicitar consulta →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListFooter = () => {
    if (!hasMore) return <Text style={[styles.endText, { color: colors.muted }]}>{filtered.length > 0 ? `${filtered.length} especialista${filtered.length !== 1 ? "s" : ""} listado${filtered.length !== 1 ? "s" : ""}` : ""}</Text>;
    return (
      <TouchableOpacity style={[styles.loadMoreBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setVisibleCount((prev) => prev + PAGE_SIZE)} activeOpacity={0.8}>
        <Text style={[styles.loadMoreText, { color: colors.primary }]}>Ver mais ({filtered.length - visibleCount} restantes)</Text>
        <IconSymbol name="chevron.down" size={14} color={colors.primary} />
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/" as any); }} style={styles.backBtn} activeOpacity={0.8}>
          <IconSymbol name="chevron.left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Diretório de Médicos</Text>
          <Text style={styles.headerSubtitle}>
            {doctorsQuery.isLoading ? "Carregando..." : `${filtered.length} especialista${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`}
          </Text>
        </View>
        {/* Map/List toggle */}
        <TouchableOpacity
          style={[styles.viewToggleBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}
          onPress={() => setViewMode((v) => v === "list" ? "map" : "list")}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 18, lineHeight: 22 }}>{viewMode === "list" ? "🗺️" : "📋"}</Text>
        </TouchableOpacity>
        {hasActiveFilters && (
          <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllBtn} activeOpacity={0.8}>
            <Text style={styles.clearAllText}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs: Todos / Favoritos */}
      <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
        {(["all", "favorites"] as TabOption[]).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === "all" ? "Todos" : `Favoritos${favCount > 0 ? ` (${favCount})` : ""}`;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && { borderBottomColor: colors.primary }]}
              onPress={() => { setActiveTab(tab); resetPagination(); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: isActive ? colors.primary : colors.muted }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Map view */}
      {viewMode === "map" ? (
        <DoctorMapView doctors={filtered} onDoctorPress={navigateToDoctor} colors={colors} />
      ) : (
        <>
          {/* Search bar + Sort */}
          <View style={styles.searchRow}>
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Buscar por nome, especialidade ou cidade..."
                placeholderTextColor={colors.muted}
                value={searchText}
                onChangeText={(t) => { setSearchText(t); resetPagination(); }}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchText(""); resetPagination(); }} activeOpacity={0.7}>
                  <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setSortMenuOpen((v) => !v)} activeOpacity={0.8}>
              <IconSymbol name="arrow.up.arrow.down" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Sort dropdown */}
          {sortMenuOpen && (
            <View style={[styles.sortMenu, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: "#000" }]}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sortMenuItem, { borderBottomColor: colors.border }, sortBy === opt.key && { backgroundColor: colors.primary + "12" }]}
                  onPress={() => { setSortBy(opt.key); setSortMenuOpen(false); resetPagination(); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sortMenuIcon}>{opt.icon}</Text>
                  <Text style={[styles.sortMenuLabel, { color: sortBy === opt.key ? colors.primary : colors.foreground }]}>{opt.label}</Text>
                  {sortBy === opt.key && <IconSymbol name="checkmark" size={14} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!sortMenuOpen && (
            <View style={styles.sortIndicatorRow}>
              <Text style={[styles.sortIndicator, { color: colors.muted }]}>
                Ordenado por: <Text style={{ color: colors.primary, fontWeight: "700" }}>{currentSortLabel}</Text>
              </Text>
            </View>
          )}

          {/* Filters */}
          <View style={[styles.filtersWrapper, { borderBottomColor: colors.border }]}>
            {specialtyOptions.length > 1 && <FilterRow label="Especialidade" options={specialtyOptions} selected={selectedSpecialty} onSelect={(v) => { setSelectedSpecialty(v); resetPagination(); }} activeColor={colors.primary} colors={colors} />}
            {regionOptions.length > 1 && <FilterRow label="Região" options={regionOptions} selected={selectedRegion} onSelect={(v) => { setSelectedRegion(v); resetPagination(); }} activeColor="#7C3AED" colors={colors} />}
            {insuranceOptions.length > 1 && <FilterRow label="Convênio" options={insuranceOptions} selected={selectedInsurance} onSelect={(v) => { setSelectedInsurance(v); resetPagination(); }} activeColor="#0D9488" colors={colors} />}
          </View>

          {/* List */}
          {doctorsQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.muted }]}>Buscando especialistas...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48, marginBottom: 8 }}>{activeTab === "favorites" ? "🤍" : "🔍"}</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {activeTab === "favorites" ? "Nenhum favorito ainda" : doctors.length === 0 ? "Nenhum médico cadastrado" : "Nenhum resultado encontrado"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                {activeTab === "favorites"
                  ? "Toque no 🤍 nos cards para salvar médicos favoritos"
                  : doctors.length === 0 ? "Os médicos aparecerão aqui após se cadastrarem no app" : "Tente outro termo ou remova os filtros"}
              </Text>
              {(hasActiveFilters || activeTab === "favorites") && (
                <TouchableOpacity style={[styles.clearBtn, { backgroundColor: colors.primary }]} onPress={() => { clearAllFilters(); setActiveTab("all"); }} activeOpacity={0.8}>
                  <Text style={styles.clearBtnText}>Ver todos os médicos</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={visibleDoctors}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderDoctor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={<ListFooter />}
            />
          )}
        </>
      )}
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, gap: 10, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#fff", lineHeight: 26 },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2, lineHeight: 18 },
  viewToggleBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  clearAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.25)" },
  clearAllText: { color: "#fff", fontSize: 13, fontWeight: "600", lineHeight: 18 },

  // Tabs
  tabsRow: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 14, fontWeight: "700", lineHeight: 19 },

  // Search
  searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 14, gap: 10 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, lineHeight: 20 },
  sortBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  // Sort dropdown
  sortMenu: { marginHorizontal: 16, marginTop: 6, borderRadius: 14, borderWidth: 1, overflow: "hidden", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6, zIndex: 100 },
  sortMenuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, gap: 10 },
  sortMenuIcon: { fontSize: 16, lineHeight: 20 },
  sortMenuLabel: { flex: 1, fontSize: 15, fontWeight: "600", lineHeight: 20 },
  sortIndicatorRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2 },
  sortIndicator: { fontSize: 12, lineHeight: 16 },

  // Filters
  filtersWrapper: { borderBottomWidth: 1, paddingBottom: 8, marginTop: 4 },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 12 },

  // Card
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  cardInfo: { flex: 1, gap: 3 },
  doctorName: { fontSize: 17, fontWeight: "700", lineHeight: 22 },
  specialty: { fontSize: 14, fontWeight: "600", lineHeight: 18 },
  crm: { fontSize: 12, lineHeight: 16 },
  favBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", marginLeft: 4 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  insuranceRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start" },
  insuranceLabel: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  insuranceValue: { flex: 1, fontSize: 12, lineHeight: 16 },
  bio: { fontSize: 13, lineHeight: 18, fontStyle: "italic" },
  ctaRow: { borderTopWidth: 0.5, paddingTop: 10, alignItems: "flex-end" },
  ctaText: { fontSize: 13, fontWeight: "600", lineHeight: 18 },

  // Load more
  loadMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4, marginBottom: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  loadMoreText: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  endText: { textAlign: "center", fontSize: 13, lineHeight: 18, paddingVertical: 16 },

  // Loading / empty
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 15, lineHeight: 20 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", lineHeight: 26 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  clearBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  clearBtnText: { color: "#fff", fontSize: 15, fontWeight: "600", lineHeight: 20 },
});

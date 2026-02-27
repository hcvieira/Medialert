import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Platform,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuthContext } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout } = useAuthContext();

  const profileQuery = trpc.user.getProfile.useQuery(undefined, { staleTime: 30_000 });
  const profile = profileQuery.data;

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Doctor address editing
  const doctorProfileQuery = trpc.doctor.getProfile.useQuery(undefined, {
    enabled: (profile as any)?.appRole === "doctor",
    staleTime: 30_000,
  });
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const setupProfile = trpc.doctor.setupProfile.useMutation({
    onSuccess: () => { doctorProfileQuery.refetch(); setEditingAddress(false); },
  });

  // Bank info editing
  const [editingBank, setEditingBank] = useState(false);
  const [bankNameInput, setBankNameInput] = useState("");
  const [bankAgencyInput, setBankAgencyInput] = useState("");
  const [bankAccountInput, setBankAccountInput] = useState("");
  const [bankAccountTypeInput, setBankAccountTypeInput] = useState<"corrente" | "poupanca">("corrente");
  const [pixKeyInput, setPixKeyInput] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const updateBankInfo = trpc.doctor.updateBankInfo.useMutation({
    onSuccess: () => { doctorProfileQuery.refetch(); setEditingBank(false); },
  });

  const uploadPhoto = trpc.user.uploadSelfPhoto.useMutation({
    onSuccess: () => profileQuery.refetch(),
  });
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      profileQuery.refetch();
      setEditingName(false);
    },
  });

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permissão necessária", "Permita o acesso à câmera."); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0].base64) {
      uploadPhoto.mutate({ base64: result.assets[0].base64, mimeType: result.assets[0].mimeType ?? "image/jpeg" });
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permissão necessária", "Permita o acesso à galeria."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0].base64) {
      uploadPhoto.mutate({ base64: result.assets[0].base64, mimeType: result.assets[0].mimeType ?? "image/jpeg" });
    }
  };

  const handlePickPhoto = () => {
    if (Platform.OS === "ios") {
      const options = profile?.photoUrl
        ? ["Tirar foto", "Escolher da galeria", "Remover foto", "Cancelar"]
        : ["Tirar foto", "Escolher da galeria", "Cancelar"];
      const cancelIndex = profile?.photoUrl ? 3 : 2;
      const destructiveIndex = profile?.photoUrl ? 2 : undefined;
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex, title: "Foto de perfil" },
        (buttonIndex) => {
          if (buttonIndex === 0) pickFromCamera();
          else if (buttonIndex === 1) pickFromGallery();
          else if (profile?.photoUrl && buttonIndex === 2) uploadPhoto.mutate({ base64: null });
        }
      );
    } else {
      const buttons: any[] = [
        { text: "Câmera", onPress: pickFromCamera },
        { text: "Galeria", onPress: pickFromGallery },
      ];
      if (profile?.photoUrl) {
        buttons.push({ text: "Remover foto", style: "destructive", onPress: () => uploadPhoto.mutate({ base64: null }) });
      }
      buttons.push({ text: "Cancelar", style: "cancel" });
      Alert.alert("Foto de perfil", "Escolha a origem da foto", buttons);
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      await updateProfile.mutateAsync({ name: trimmed });
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o nome.");
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/welcome" as any);
        },
      },
    ]);
  };

  const displayName = profile?.name ?? user?.name ?? "";
  const photoUrl = profile?.photoUrl ?? null;
  const roleLabel = (profile as any)?.appRole === "doctor" ? "Médico" : (profile as any)?.appRole === "caregiver" ? "Familiar / Cuidador" : "Paciente";
  const isDoctor = (profile as any)?.appRole === "doctor";
  const doctorAddress = (doctorProfileQuery.data as any)?.address ?? "";
  const doctorBankName = (doctorProfileQuery.data as any)?.bankName ?? "";
  const doctorBankAgency = (doctorProfileQuery.data as any)?.bankAgency ?? "";
  const doctorBankAccount = (doctorProfileQuery.data as any)?.bankAccount ?? "";
  const doctorBankAccountType = (doctorProfileQuery.data as any)?.bankAccountType ?? "corrente";
  const doctorPixKey = (doctorProfileQuery.data as any)?.pixKey ?? "";
  const hasBankInfo = !!(doctorBankName || doctorPixKey);

  const handleSaveAddress = async () => {
    const trimmed = addressInput.trim();
    setSavingAddress(true);
    try {
      const dp = doctorProfileQuery.data as any;
      if (!dp) return;
      await setupProfile.mutateAsync({
        crm: dp.crm,
        crmState: dp.crmState,
        specialty: dp.specialty,
        insurances: JSON.parse(dp.insurances ?? "[]"),
        phone: dp.phone ?? undefined,
        bio: dp.bio ?? undefined,
        address: trimmed || undefined,
      });
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o endereço.");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleStartEditBank = () => {
    setBankNameInput(doctorBankName);
    setBankAgencyInput(doctorBankAgency);
    setBankAccountInput(doctorBankAccount);
    setBankAccountTypeInput(doctorBankAccountType || "corrente");
    setPixKeyInput(doctorPixKey);
    setEditingBank(true);
  };

  const handleSaveBank = async () => {
    setSavingBank(true);
    try {
      await updateBankInfo.mutateAsync({
        bankName: bankNameInput.trim() || undefined,
        bankAgency: bankAgencyInput.trim() || undefined,
        bankAccount: bankAccountInput.trim() || undefined,
        bankAccountType: bankAccountTypeInput,
        pixKey: pixKeyInput.trim() || undefined,
      });
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar os dados bancários.");
    } finally {
      setSavingBank(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>

        {/* Avatar */}
        <Pressable onPress={handlePickPhoto} style={({ pressed }) => [styles.avatarWrapper, { opacity: pressed ? 0.75 : 1 }]}>
          {photoUrl
            ? <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase() || "?"}</Text>
              </View>
            )}
          <View style={styles.avatarBadge}>
            <IconSymbol name="camera.fill" size={12} color="#fff" />
          </View>
          {uploadPhoto.isPending && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          )}
        </Pressable>

        <Text style={styles.headerName}>{displayName}</Text>
        <Text style={styles.headerRole}>{roleLabel}</Text>
        <Text style={styles.headerEmail}>{user?.email ?? ""}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Nome */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>NOME DE EXIBIÇÃO</Text>
          {editingName ? (
            <View style={styles.editRow}>
              <TextInput
                style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <TouchableOpacity onPress={handleSaveName} disabled={savingName} style={styles.saveNameBtn}>
                {savingName
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingName(false)} style={styles.cancelNameBtn}>
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setNameInput(displayName); setEditingName(true); }} style={styles.nameRow} activeOpacity={0.7}>
              <Text style={[styles.nameText, { color: colors.foreground }]}>{displayName}</Text>
              <IconSymbol name="pencil" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Foto */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>FOTO DE PERFIL</Text>
          <TouchableOpacity onPress={handlePickPhoto} style={styles.photoRow} activeOpacity={0.7}>
            <IconSymbol name="camera.fill" size={20} color={colors.primary} />
            <Text style={[styles.photoRowText, { color: colors.foreground }]}>
              {photoUrl ? "Alterar foto de perfil" : "Adicionar foto de perfil"}
            </Text>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </TouchableOpacity>
          {photoUrl && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert("Remover foto", "Deseja remover sua foto de perfil?", [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Remover", style: "destructive", onPress: () => uploadPhoto.mutate({ base64: null }) },
                ]);
              }}
              style={[styles.photoRow, styles.photoRowBorder, { borderTopColor: colors.border }]}
              activeOpacity={0.7}
            >
              <IconSymbol name="trash.fill" size={20} color={colors.error} />
              <Text style={[styles.photoRowText, { color: colors.error }]}>Remover foto</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Endereço do consultório (apenas para médicos) */}
        {isDoctor && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>ENDEREÇO DO CONSULTÓRIO</Text>
            {editingAddress ? (
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                  value={addressInput}
                  onChangeText={setAddressInput}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveAddress}
                  placeholder="Rua, número, bairro, cidade — UF"
                  placeholderTextColor={colors.muted}
                />
                <TouchableOpacity onPress={handleSaveAddress} disabled={savingAddress} style={styles.saveNameBtn}>
                  {savingAddress
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingAddress(false)} style={styles.cancelNameBtn}>
                  <IconSymbol name="xmark.circle.fill" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => { setAddressInput(doctorAddress); setEditingAddress(true); }}
                style={styles.nameRow}
                activeOpacity={0.7}
              >
                <Text style={[styles.nameText, { color: doctorAddress ? colors.foreground : colors.muted }]} numberOfLines={2}>
                  {doctorAddress || "Toque para adicionar o endereço"}
                </Text>
                <IconSymbol name="pencil" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Dados Bancários (apenas para médicos) */}
        {isDoctor && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <IconSymbol name="creditcard.fill" size={14} color={colors.primary} />
              <Text style={[styles.cardLabel, { color: colors.muted }]}>DADOS BANCÁRIOS</Text>
            </View>
            {editingBank ? (
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 4 }}>Chave PIX</Text>
                  <TextInput
                    style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]}
                    value={pixKeyInput}
                    onChangeText={setPixKeyInput}
                    placeholder="CPF, e-mail, celular ou chave aleatória"
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 4 }}>Banco</Text>
                  <TextInput
                    style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]}
                    value={bankNameInput}
                    onChangeText={setBankNameInput}
                    placeholder="Ex: Nubank, Itaú, Bradesco"
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 4 }}>Agência</Text>
                    <TextInput
                      style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]}
                      value={bankAgencyInput}
                      onChangeText={setBankAgencyInput}
                      placeholder="0001"
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 4 }}>Conta</Text>
                    <TextInput
                      style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]}
                      value={bankAccountInput}
                      onChangeText={setBankAccountInput}
                      placeholder="12345-6"
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 4 }}>Tipo de conta</Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setBankAccountTypeInput("corrente")}
                      style={[styles.typeBtn, bankAccountTypeInput === "corrente" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: bankAccountTypeInput === "corrente" ? "#fff" : colors.foreground }}>Corrente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setBankAccountTypeInput("poupanca")}
                      style={[styles.typeBtn, bankAccountTypeInput === "poupanca" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: bankAccountTypeInput === "poupanca" ? "#fff" : colors.foreground }}>Poupança</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    onPress={handleSaveBank}
                    disabled={savingBank}
                    style={[styles.saveBankBtn, { backgroundColor: colors.primary }]}
                  >
                    {savingBank
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Salvar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingBank(false)} style={styles.cancelBankBtn}>
                    <Text style={{ color: colors.muted, fontWeight: "600", fontSize: 14 }}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={handleStartEditBank} style={styles.nameRow} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  {hasBankInfo ? (
                    <>
                      {doctorPixKey ? <Text style={[styles.nameText, { color: colors.foreground, fontSize: 14 }]}>PIX: {doctorPixKey}</Text> : null}
                      {doctorBankName ? (
                        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                          {doctorBankName}{doctorBankAgency ? ` · Ag ${doctorBankAgency}` : ""}{doctorBankAccount ? ` · Cc ${doctorBankAccount}` : ""}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={[styles.nameText, { color: colors.muted }]}>Toque para adicionar dados bancários</Text>
                  )}
                </View>
                <IconSymbol name="pencil" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Sair */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutBtn, { borderColor: colors.error }]}
          activeOpacity={0.8}
        >
          <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 4,
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    padding: 8,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  avatarWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 8,
    position: "relative",
    zIndex: 10,
    elevation: 5,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.6)",
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#0D5BBF",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    borderRadius: 44,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  headerRole: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },
  headerEmail: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 48,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameText: {
    fontSize: 16,
    fontWeight: "500",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    borderBottomWidth: 1.5,
    paddingVertical: 4,
  },
  saveNameBtn: { padding: 4 },
  cancelNameBtn: { padding: 4 },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  photoRowBorder: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  photoRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  typeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },
  saveBankBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelBankBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
});

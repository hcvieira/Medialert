import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

const SPECIALTIES = [
  "Clínico Geral",
  "Cardiologista",
  "Endocrinologista",
  "Neurologista",
  "Ortopedista",
  "Dermatologista",
  "Psiquiatra",
  "Ginecologista",
  "Pediatra",
  "Oncologista",
  "Reumatologista",
  "Pneumologista",
  "Gastroenterologista",
  "Nefrologista",
  "Urologista",
  "Outra",
];

const COMMON_INSURANCES = [
  "Unimed",
  "Bradesco Saúde",
  "SulAmérica",
  "Amil",
  "Hapvida",
  "NotreDame Intermédica",
  "Porto Seguro Saúde",
  "Particular",
];

const BR_STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function DoctorSetupProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const [crm, setCrm] = useState("");
  const [crmState, setCrmState] = useState("SP");
  const [specialty, setSpecialty] = useState("");
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [selectedInsurances, setSelectedInsurances] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [indicatedByCode, setIndicatedByCode] = useState("");
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Bank info state
  const [bankName, setBankName] = useState("");
  const [bankAgency, setBankAgency] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountType, setBankAccountType] = useState<"corrente" | "poupanca">("corrente");
  const [pixKey, setPixKey] = useState("");

  // Photo state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>("image/jpeg");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const setupProfile = trpc.doctor.setupProfile.useMutation();
  const uploadDoctorPhoto = trpc.doctor.uploadDoctorPhoto.useMutation({
    onSuccess: (data) => setPhotoUrl(data.url),
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!crm.trim()) newErrors.crm = "CRM é obrigatório";
    if (!specialty) newErrors.specialty = "Especialidade é obrigatória";
    if (specialty === "Outra" && !customSpecialty.trim()) newErrors.specialty = "Informe a especialidade";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toggleInsurance = (ins: string) => {
    setSelectedInsurances((prev) =>
      prev.includes(ins) ? prev.filter((i) => i !== ins) : [...prev, ins]
    );
  };

  const pickPhoto = (source: "camera" | "gallery") => {
    const launch = async () => {
      let result: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permissão necessária", "Permita o acesso à câmera."); return; }
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permissão necessária", "Permita o acesso à galeria."); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
      }
      if (!result.canceled && result.assets[0].base64) {
        const asset = result.assets[0];
        // Show preview immediately
        setPhotoUrl(asset.uri);
        setPhotoBase64(asset.base64!);
        setPhotoMime(asset.mimeType ?? "image/jpeg");
      }
    };
    launch();
  };

  const handlePickPhoto = () => {
    if (Platform.OS === "ios") {
      const options = photoUrl
        ? ["Tirar foto", "Escolher da galeria", "Remover foto", "Cancelar"]
        : ["Tirar foto", "Escolher da galeria", "Cancelar"];
      const cancelIndex = photoUrl ? 3 : 2;
      const destructiveIndex = photoUrl ? 2 : undefined;
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex, title: "Foto do perfil" },
        (buttonIndex) => {
          if (buttonIndex === 0) pickPhoto("camera");
          else if (buttonIndex === 1) pickPhoto("gallery");
          else if (photoUrl && buttonIndex === 2) { setPhotoUrl(null); setPhotoBase64(null); }
        }
      );
    } else {
      const buttons: any[] = [
        { text: "Câmera", onPress: () => pickPhoto("camera") },
        { text: "Galeria", onPress: () => pickPhoto("gallery") },
      ];
      if (photoUrl) {
        buttons.push({ text: "Remover foto", style: "destructive", onPress: () => { setPhotoUrl(null); setPhotoBase64(null); } });
      }
      buttons.push({ text: "Cancelar", style: "cancel" });
      Alert.alert("Foto do perfil", "Escolha a origem da foto", buttons);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      // First save profile
      await setupProfile.mutateAsync({
        crm: crm.trim(),
        crmState,
        specialty: specialty === "Outra" ? customSpecialty.trim() : specialty,
        insurances: selectedInsurances,
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
        address: address.trim() || undefined,
        indicatedByCode: indicatedByCode.trim().toUpperCase() || undefined,
        bankName: bankName.trim() || undefined,
        bankAgency: bankAgency.trim() || undefined,
        bankAccount: bankAccount.trim() || undefined,
        bankAccountType: bankAccountType || undefined,
        pixKey: pixKey.trim() || undefined,
      });
      // Then upload photo if selected
      if (photoBase64) {
        setUploadingPhoto(true);
        try {
          await uploadDoctorPhoto.mutateAsync({ base64: photoBase64, mimeType: photoMime });
        } catch {
          // Non-fatal: profile was saved, photo upload failed
          Alert.alert("Aviso", "Perfil salvo, mas não foi possível enviar a foto. Você pode adicioná-la depois.");
        } finally {
          setUploadingPhoto(false);
        }
      }
      // Navigate to guided onboarding instead of dashboard
      router.replace("/doctor/onboarding-guide" as any);
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível salvar o perfil.");
    }
  };

  const isSaving = setupProfile.isPending || uploadingPhoto;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <LinearGradient colors={["#0D5BBF", "#0A4A9E"]} style={styles.header}>
          {/* Avatar upload */}
          <Pressable onPress={handlePickPhoto} style={({ pressed }) => [styles.avatarWrapper, { opacity: pressed ? 0.75 : 1 }]}>
            {photoUrl
              ? <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
              : (
                <View style={styles.avatarPlaceholder}>
                  <IconSymbol name="stethoscope" size={32} color="#fff" />
                </View>
              )}
            <View style={styles.avatarBadge}>
              <IconSymbol name="camera.fill" size={12} color="#fff" />
            </View>
          </Pressable>
          <Text style={styles.headerTitle}>Configure seu perfil médico</Text>
          <Text style={styles.headerSubtitle}>
            Toque na foto para adicionar sua logo ou foto profissional
          </Text>
        </LinearGradient>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
          {/* CRM */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 2 }]}>
              <Text style={[styles.label, { color: colors.foreground }]}>CRM *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: errors.crm ? "#EF4444" : colors.border }]}
                value={crm}
                onChangeText={setCrm}
                placeholder="123456"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
              />
              {errors.crm && <Text style={styles.errorText}>{errors.crm}</Text>}
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.foreground }]}>Estado</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowStatePicker(!showStatePicker)}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>{crmState}</Text>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {showStatePicker && (
            <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {BR_STATES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.pickerItem, crmState === s && { backgroundColor: "#EBF4FF" }]}
                    onPress={() => { setCrmState(s); setShowStatePicker(false); }}
                  >
                    <Text style={{ color: crmState === s ? "#1A7FE8" : colors.foreground, fontWeight: crmState === s ? "700" : "400" }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Especialidade */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Especialidade *</Text>
            <TouchableOpacity
              style={[styles.input, styles.pickerBtn, { backgroundColor: colors.surface, borderColor: errors.specialty ? "#EF4444" : colors.border }]}
              onPress={() => setShowSpecialtyPicker(!showSpecialtyPicker)}
            >
              <Text style={{ color: specialty ? colors.foreground : colors.muted }}>
                {specialty || "Selecione a especialidade"}
              </Text>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </TouchableOpacity>
            {errors.specialty && <Text style={styles.errorText}>{errors.specialty}</Text>}
          </View>

          {showSpecialtyPicker && (
            <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                {SPECIALTIES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.pickerItem, specialty === s && { backgroundColor: "#EBF4FF" }]}
                    onPress={() => { setSpecialty(s); setShowSpecialtyPicker(false); }}
                  >
                    <Text style={{ color: specialty === s ? "#1A7FE8" : colors.foreground, fontWeight: specialty === s ? "700" : "400" }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {specialty === "Outra" && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Qual especialidade?</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={customSpecialty}
                onChangeText={setCustomSpecialty}
                placeholder="Ex: Medicina do Trabalho"
                placeholderTextColor={colors.muted}
              />
            </View>
          )}

          {/* Convênios */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Convênios aceitos</Text>
            <View style={styles.tagsContainer}>
              {COMMON_INSURANCES.map((ins) => (
                <TouchableOpacity
                  key={ins}
                  style={[styles.tag, selectedInsurances.includes(ins) && styles.tagSelected]}
                  onPress={() => toggleInsurance(ins)}
                >
                  <Text style={[styles.tagText, selectedInsurances.includes(ins) && styles.tagTextSelected]}>
                    {ins}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Telefone */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Telefone / WhatsApp</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="(11) 99999-9999"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
            />
          </View>

          {/* Endereço do consultório */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Endereço do consultório</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              value={address}
              onChangeText={setAddress}
              placeholder="Rua, número, bairro, cidade — UF"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
            />
          </View>

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Apresentação (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Breve descrição sobre você e sua prática médica..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Dados Bancários */}
          <View style={[styles.fieldGroup, { marginTop: 8 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <IconSymbol name="creditcard.fill" size={18} color="#0D5BBF" />
              <Text style={[styles.label, { color: colors.foreground, fontSize: 16 }]}>Dados Bancários</Text>
            </View>
            <Text style={[styles.hint, { color: colors.muted, marginBottom: 8 }]}>
              Para receber benefícios do programa de indicações via desconto na assinatura. Você pode preencher depois nas configurações.
            </Text>

            <Text style={[styles.label, { color: colors.foreground }]}>Banco</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              value={bankName}
              onChangeText={setBankName}
              placeholder="Ex: Banco do Brasil, Nubank, Itaú"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.foreground }]}>Agência</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={bankAgency}
                onChangeText={setBankAgency}
                placeholder="0001"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.foreground }]}>Conta</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={bankAccount}
                onChangeText={setBankAccount}
                placeholder="12345-6"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Tipo de conta</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={[styles.tag, bankAccountType === "corrente" && styles.tagSelected, { flex: 1, alignItems: "center" }]}
                onPress={() => setBankAccountType("corrente")}
              >
                <Text style={[styles.tagText, bankAccountType === "corrente" && styles.tagTextSelected]}>Corrente</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tag, bankAccountType === "poupanca" && styles.tagSelected, { flex: 1, alignItems: "center" }]}
                onPress={() => setBankAccountType("poupanca")}
              >
                <Text style={[styles.tagText, bankAccountType === "poupanca" && styles.tagTextSelected]}>Poupança</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Chave PIX</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              value={pixKey}
              onChangeText={setPixKey}
              placeholder="CPF, e-mail, celular ou chave aleatória"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
            />
          </View>

          {/* Código de indicação MGM */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Código de indicação (opcional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              value={indicatedByCode}
              onChangeText={(v) => setIndicatedByCode(v.toUpperCase())}
              placeholder="Ex: MED-ABC123"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              returnKeyType="done"
            />
            <Text style={[styles.hint, { color: colors.muted }]}>Se um colega indicou você, insira o código dele aqui para que ele receba desconto na assinatura dele.</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Salvar e continuar</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 10,
  },
  avatarWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 4,
    position: "relative",
    zIndex: 20,
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
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    borderStyle: "dashed",
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    lineHeight: 30,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 18,
  },
  form: { flex: 1 },
  formContent: { padding: 24, gap: 20, paddingBottom: 48 },
  row: { flexDirection: "row", gap: 12 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 22,
  },
  textArea: { height: 100, paddingTop: 14 },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerDropdown: {
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: -12,
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  tagSelected: {
    backgroundColor: "#1A7FE8",
    borderColor: "#1A7FE8",
  },
  tagText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
    lineHeight: 18,
  },
  tagTextSelected: {
    color: "#fff",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: "#0D5BBF",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
});

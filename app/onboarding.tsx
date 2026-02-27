import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";

type Role = "caregiver" | "patient" | "doctor";

export default function OnboardingScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Role | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>("image/jpeg");

  const setRole = trpc.user.setRole.useMutation();
  const uploadSelfPhoto = trpc.user.uploadSelfPhoto.useMutation();

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
        setPhotoUri(asset.uri);
        setPhotoBase64(asset.base64!);
        setPhotoMime(asset.mimeType ?? "image/jpeg");
      }
    };
    launch();
  };

  const handlePickPhoto = () => {
    if (Platform.OS === "ios") {
      const options = photoUri
        ? ["Tirar foto", "Escolher da galeria", "Remover foto", "Cancelar"]
        : ["Tirar foto", "Escolher da galeria", "Cancelar"];
      const cancelIndex = photoUri ? 3 : 2;
      const destructiveIndex = photoUri ? 2 : undefined;
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex, title: "Foto de perfil" },
        (buttonIndex) => {
          if (buttonIndex === 0) pickPhoto("camera");
          else if (buttonIndex === 1) pickPhoto("gallery");
          else if (photoUri && buttonIndex === 2) { setPhotoUri(null); setPhotoBase64(null); }
        }
      );
    } else {
      const buttons: any[] = [
        { text: "Câmera", onPress: () => pickPhoto("camera") },
        { text: "Galeria", onPress: () => pickPhoto("gallery") },
      ];
      if (photoUri) {
        buttons.push({ text: "Remover foto", style: "destructive", onPress: () => { setPhotoUri(null); setPhotoBase64(null); } });
      }
      buttons.push({ text: "Cancelar", style: "cancel" });
      Alert.alert("Foto de perfil", "Escolha a origem da foto", buttons);
    }
  };

  const handleContinue = async () => {
    if (!selected) return;
    try {
      await setRole.mutateAsync({ appRole: selected });
      // Upload photo if selected (non-fatal)
      if (photoBase64) {
        try {
          await uploadSelfPhoto.mutateAsync({ base64: photoBase64, mimeType: photoMime });
        } catch {
          // Non-fatal: continue even if photo upload fails
        }
      }
      if (selected === "doctor") {
        router.replace("/doctor/setup-profile" as any);
      } else {
        // Both patient and caregiver go to the main app.
        // Roles are inferred dynamically from links — appRole is just the initial preference.
        router.replace("/(tabs)");
      }
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar sua escolha. Tente novamente.");
    }
  };

  const roles: { key: Role; icon: any; title: string; desc: string }[] = [
    {
      key: "caregiver",
      icon: "person.2.fill",
      title: "Familiar / Cuidador",
      desc: "Vou acompanhar os medicamentos de outra pessoa (pai, m\u00e3e, filho...)",
    },
    {
      key: "patient",
      icon: "heart.fill",
      title: "Paciente",
      desc: "Vou receber lembretes e confirmar que tomei meus medicamentos",
    },
    {
      key: "doctor",
      icon: "stethoscope",
      title: "Médico",
      desc: "Vou prescrever medicamentos e agendar consultas para meus pacientes",
    },
  ];

  const isSaving = setRole.isPending || uploadSelfPhoto.isPending;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1A7FE8", "#0D5BBF"]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        {/* Avatar upload */}
        <Pressable onPress={handlePickPhoto} style={({ pressed }) => [styles.avatarWrapper, { opacity: pressed ? 0.75 : 1 }]}>
          {photoUri
            ? <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            : (
              <View style={styles.avatarPlaceholder}>
                <IconSymbol name="person.fill" size={28} color="rgba(255,255,255,0.8)" />
              </View>
            )}
          <View style={styles.avatarBadge}>
            <IconSymbol name="camera.fill" size={11} color="#fff" />
          </View>
        </Pressable>
        <Text style={styles.avatarHint}>Toque para adicionar sua foto</Text>
        <Text style={styles.title}>Bem-vindo ao MediAlert!</Text>
        <Text style={styles.subtitle}>Como você vai usar o aplicativo?</Text>
      </View>

      <ScrollView contentContainerStyle={styles.cardsContainer} showsVerticalScrollIndicator={false}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.key}
            style={[styles.card, selected === role.key && styles.cardSelected]}
            onPress={() => setSelected(role.key)}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIcon, selected === role.key && styles.cardIconSelected]}>
              <IconSymbol name={role.icon} size={32} color={selected === role.key ? "#fff" : "#1A7FE8"} />
            </View>
            <Text style={[styles.cardTitle, selected === role.key && styles.cardTitleSelected]}>
              {role.title}
            </Text>
            <Text style={[styles.cardDesc, selected === role.key && styles.cardDescSelected]}>
              {role.desc}
            </Text>
            {selected === role.key && (
              <View style={styles.checkBadge}>
                <IconSymbol name="checkmark.circle.fill" size={22} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
        onPress={handleContinue}
        disabled={!selected || isSaving}
        activeOpacity={0.85}
      >
        {isSaving ? (
          <ActivityIndicator color="#1A7FE8" />
        ) : (
          <Text style={[styles.continueBtnText, !selected && styles.continueBtnTextDisabled]}>
            Continuar
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
    gap: 20,
  },
  header: {
    alignItems: "center",
    gap: 6,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 2,
    position: "relative",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.6)",
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    borderRadius: 11,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    lineHeight: 34,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
  },
  cardsContainer: {
    gap: 14,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    gap: 6,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  cardSelected: {
    backgroundColor: "#1A7FE8",
    borderColor: "rgba(255,255,255,0.4)",
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  cardIconSelected: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    lineHeight: 26,
  },
  cardTitleSelected: {
    color: "#fff",
  },
  cardDesc: {
    fontSize: 13,
    color: "#687076",
    lineHeight: 19,
  },
  cardDescSelected: {
    color: "rgba(255,255,255,0.85)",
  },
  checkBadge: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  continueBtn: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A7FE8",
  },
  continueBtnTextDisabled: {
    color: "rgba(255,255,255,0.6)",
  },
});

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";

export default function JoinInviteScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const acceptAnyCode = trpc.invite.acceptAnyCode.useMutation();

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) {
      Alert.alert("Código inválido", "Digite o código de convite completo.");
      return;
    }
    try {
      const result = await acceptAnyCode.mutateAsync({ code: trimmed });
      const msg = result.linkedAs === "caregiver"
        ? "Você agora acompanha os medicamentos deste paciente."
        : "Seu familiar agora acompanha seus medicamentos.";
      Alert.alert("🔗 Vinculado!", msg, [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Código inválido ou já utilizado.");
    }
  };

  const handleSkip = () => {
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <LinearGradient colors={["#1A7FE8", "#0D5BBF"]} style={StyleSheet.absoluteFill} />

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <IconSymbol name="person.2.fill" size={40} color="#fff" />
          </View>
          <Text style={styles.title}>Conectar ao Familiar</Text>
          <Text style={styles.subtitle}>
            Peça ao seu familiar o código de convite gerado no aplicativo dele e insira abaixo.
          </Text>
        </View>

        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="Ex: AB12CD34"
            placeholderTextColor="rgba(255,255,255,0.5)"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            returnKeyType="done"
            onSubmitEditing={handleJoin}
          />

          <TouchableOpacity
            style={[styles.joinBtn, code.trim().length < 6 && styles.joinBtnDisabled]}
            onPress={handleJoin}
            disabled={code.trim().length < 6 || acceptAnyCode.isPending}
            activeOpacity={0.85}
          >
            {acceptAnyCode.isPending ? (
              <ActivityIndicator color="#1A7FE8" />
            ) : (
              <Text style={styles.joinBtnText}>Conectar</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Pular por agora</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 60,
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  inputSection: {
    width: "100%",
    gap: 16,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 4,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  joinBtn: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  joinBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  joinBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A7FE8",
  },
  skipText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    textDecorationLine: "underline",
  },
});

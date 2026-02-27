import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type OnboardingStep = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  action: string;
  route?: string;
  gradient: [string, string];
};

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    icon: "🎉",
    title: "Bem-vindo(a) ao MediAlert!",
    subtitle: "Seu perfil foi criado com sucesso",
    description:
      "Vamos configurar tudo para você aproveitar ao máximo a plataforma. São apenas 3 passos rápidos.",
    action: "Começar",
    gradient: ["#1A7FE8", "#0A3D8F"],
  },
  {
    id: "insurance",
    icon: "💳",
    title: "Valores por Convênio",
    subtitle: "Passo 1 de 3",
    description:
      "Defina o valor de consulta para cada convênio que você atende. Isso permite o acompanhamento preciso da sua receita mensal e relatórios financeiros detalhados.",
    action: "Configurar valores",
    route: "/doctor/insurance-fees",
    gradient: ["#0D9488", "#0F766E"],
  },
  {
    id: "patients",
    icon: "👥",
    title: "Adicione Pacientes",
    subtitle: "Passo 2 de 3",
    description:
      "Cadastre seus pacientes diretamente ou envie convites por e-mail. Eles poderão acompanhar medicamentos, agendar consultas e muito mais.",
    action: "Adicionar pacientes",
    route: "/doctor/dashboard",
    gradient: ["#7C3AED", "#6D28D9"],
  },
  {
    id: "referral",
    icon: "💰",
    title: "Programa de Indicações",
    subtitle: "Passo 3 de 3",
    description:
      "Indique colegas médicos e ganhe comissões quando eles começarem a usar a plataforma. Compartilhe seu código exclusivo e acompanhe seus ganhos.",
    action: "Ver meu código",
    route: "/doctor/mgm-referral",
    gradient: ["#16A34A", "#15803D"],
  },
  {
    id: "done",
    icon: "🚀",
    title: "Tudo pronto!",
    subtitle: "Seu consultório digital está configurado",
    description:
      "Você pode acessar todas essas funcionalidades a qualquer momento pelo seu painel. Bom trabalho!",
    action: "Ir para o painel",
    gradient: ["#1A7FE8", "#0A3D8F"],
  },
];

export default function DoctorOnboardingGuideScreen() {
  const router = useRouter();
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const progress = useSharedValue(0);

  const completeOnboarding = trpc.doctor.completeOnboarding.useMutation();

  const animatedProgress = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const goToStep = useCallback(
    (index: number) => {
      setCurrentStep(index);
      progress.value = withTiming((index / (STEPS.length - 1)) * 100, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * index, animated: true });
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [progress]
  );

  const handleAction = useCallback(
    async (step: OnboardingStep, index: number) => {
      if (index === STEPS.length - 1) {
        // Last step — complete onboarding and go to dashboard
        try {
          await completeOnboarding.mutateAsync();
        } catch {}
        router.replace("/doctor/dashboard" as any);
        return;
      }

      if (step.route && index > 0 && index < STEPS.length - 1) {
        // Navigate to the feature screen
        router.push(step.route as any);
      }

      // Advance to next step
      goToStep(index + 1);
    },
    [completeOnboarding, goToStep, router]
  );

  const handleSkip = useCallback(async () => {
    try {
      await completeOnboarding.mutateAsync();
    } catch {}
    router.replace("/doctor/dashboard" as any);
  }, [completeOnboarding, router]);

  const step = STEPS[currentStep];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[styles.progressFill, { backgroundColor: "#1A7FE8" }, animatedProgress]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.muted }]}>
          {currentStep + 1} de {STEPS.length}
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {STEPS.map((s, i) => (
          <View key={s.id} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={styles.slideContent}>
              {/* Icon */}
              <LinearGradient
                colors={s.gradient as [string, string]}
                style={styles.iconContainer}
              >
                <Text style={styles.iconEmoji}>{s.icon}</Text>
              </LinearGradient>

              {/* Text */}
              <Text style={[styles.stepSubtitle, { color: colors.primary }]}>
                {s.subtitle}
              </Text>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                {s.title}
              </Text>
              <Text style={[styles.stepDescription, { color: colors.muted }]}>
                {s.description}
              </Text>

              {/* Feature highlights for middle steps */}
              {s.id === "insurance" && (
                <View style={[styles.featureBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <FeatureItem icon="📊" text="Relatórios financeiros automáticos" colors={colors} />
                  <FeatureItem icon="📈" text="Acompanhe receita por convênio" colors={colors} />
                  <FeatureItem icon="🎯" text="Defina metas mensais de faturamento" colors={colors} />
                </View>
              )}
              {s.id === "patients" && (
                <View style={[styles.featureBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <FeatureItem icon="📧" text="Convites por e-mail automáticos" colors={colors} />
                  <FeatureItem icon="📋" text="Prontuário e histórico completo" colors={colors} />
                  <FeatureItem icon="📅" text="Agendamento de consultas integrado" colors={colors} />
                </View>
              )}
              {s.id === "referral" && (
                <View style={[styles.featureBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <FeatureItem icon="🔗" text="Código de indicação exclusivo" colors={colors} />
                  <FeatureItem icon="💵" text="Comissões em até 3 níveis" colors={colors} />
                  <FeatureItem icon="📱" text="Notificações de pagamento por push e e-mail" colors={colors} />
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.bottomActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: step.gradient[0] }]}
          onPress={() => handleAction(step, currentStep)}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>{step.action}</Text>
          <IconSymbol name="arrow.right" size={18} color="#fff" />
        </TouchableOpacity>

        {currentStep > 0 && currentStep < STEPS.length - 1 && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => goToStep(currentStep + 1)}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, { color: colors.muted }]}>Pular esta etapa</Text>
          </TouchableOpacity>
        )}

        {currentStep === 0 && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, { color: colors.muted }]}>
              Configurar depois
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Step indicators */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === currentStep ? "#1A7FE8" : colors.border,
                width: i === currentStep ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function FeatureItem({ icon, text, colors }: { icon: string; text: string; colors: any }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={[styles.featureText, { color: colors.foreground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "web" ? 16 : 60,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 8,
    gap: 12,
  },
  progressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "600",
    minWidth: 44,
    textAlign: "right",
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slideContent: {
    paddingHorizontal: 32,
    alignItems: "center",
    maxWidth: 420,
    width: "100%",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconEmoji: {
    fontSize: 48,
  },
  stepSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 24,
  },
  featureBox: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  bottomActions: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 0.5,
    alignItems: "center",
    gap: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    maxWidth: 360,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingBottom: Platform.OS === "web" ? 16 : 40,
    paddingTop: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

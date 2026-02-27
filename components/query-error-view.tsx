/**
 * QueryErrorView — exibido quando uma query tRPC falha.
 * Substitui telas em branco por mensagem amigável com botão de retry.
 *
 * Uso:
 *   if (query.isError) return <QueryErrorView onRetry={() => query.refetch()} />;
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface Props {
  /** Mensagem personalizada (opcional — usa padrão se omitida) */
  message?: string;
  /** Callback chamado ao tocar em "Tentar novamente" */
  onRetry?: () => void;
  /** Compacto: sem padding extra, para uso dentro de cards */
  compact?: boolean;
}

export function QueryErrorView({ message, onRetry, compact = false }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Text style={styles.icon}>📡</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {message ?? "Não foi possível carregar os dados"}
      </Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Verifique sua conexão e tente novamente.
      </Text>
      {onRetry ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/**
 * QueryLoadingOrError — helper que combina loading + error em um único bloco.
 * Retorna null quando não há estado especial (dados prontos).
 *
 * Uso:
 *   const guard = useQueryGuard(query);
 *   if (guard) return guard;
 *   // ... renderizar dados normalmente
 */
export function useQueryGuard(
  query: { isLoading: boolean; isError: boolean; refetch: () => void },
  options?: { loadingComponent?: React.ReactNode; errorMessage?: string }
): React.ReactNode | null {
  const colors = useColors();

  if (query.isLoading) {
    if (options?.loadingComponent) return options.loadingComponent;
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: colors.muted }]}>Carregando...</Text>
      </View>
    );
  }

  if (query.isError) {
    return (
      <QueryErrorView
        message={options?.errorMessage}
        onRetry={() => query.refetch()}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  compact: {
    flex: 0,
    padding: 16,
  },
  icon: {
    fontSize: 36,
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
  },
});

/**
 * ErrorBoundary global — captura erros de renderização React que não foram
 * tratados em nenhum componente filho, evitando tela branca/crash total.
 *
 * Uso: envolva o topo da árvore de componentes com <AppErrorBoundary>.
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Em produção, enviar para serviço de monitoramento (ex: Sentry)
    console.error("[AppErrorBoundary] Erro capturado:", error.message);
    console.error("[AppErrorBoundary] Stack:", info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>Algo deu errado</Text>
            <Text style={styles.subtitle}>
              O aplicativo encontrou um problema inesperado. Seus dados estão seguros.
            </Text>
            {__DEV__ && this.state.error ? (
              <ScrollView style={styles.devBox}>
                <Text style={styles.devText}>{this.state.error.message}</Text>
              </ScrollView>
            ) : null}
            <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.8}>
              <Text style={styles.buttonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#11181C",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#687076",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  devBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 12,
    maxHeight: 120,
    width: "100%",
    marginBottom: 20,
  },
  devText: {
    fontSize: 11,
    color: "#EF4444",
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: "#0D5BBF",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

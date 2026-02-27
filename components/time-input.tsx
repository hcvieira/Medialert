/**
 * TimeInput — campo de horário com máscara HH:MM automática.
 *
 * - Insere os dois-pontos automaticamente enquanto o usuário digita
 * - Valida horas (00-23) e minutos (00-59)
 * - Retorna string vazia via onChangeValid quando o horário estiver incompleto/inválido
 */

import React, { useCallback } from "react";
import { TextInput, type TextInputProps } from "react-native";

interface TimeInputProps extends Omit<TextInputProps, "value" | "onChangeText" | "keyboardType" | "maxLength"> {
  /** Valor exibido no campo (formato HH:MM) */
  value: string;
  /** Chamado com o novo valor mascarado (HH:MM) */
  onChangeText: (masked: string) => void;
  /** Chamado com o valor HH:MM quando o horário estiver completo e válido, ou "" caso contrário */
  onChangeValid?: (valid: string) => void;
}

/** Aplica a máscara HH:MM em uma string de dígitos brutos */
function applyTimeMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Valida HH:MM; retorna "" se inválido */
function validateTime(masked: string): string {
  if (masked.length !== 5) return "";
  const [hh, mm] = masked.split(":");
  const h = parseInt(hh, 10);
  const m = parseInt(mm, 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return "";
  return masked;
}

export function TimeInput({ value, onChangeText, onChangeValid, ...rest }: TimeInputProps) {
  const handleChange = useCallback(
    (text: string) => {
      const masked = applyTimeMask(text);
      onChangeText(masked);
      if (onChangeValid) {
        onChangeValid(masked.length === 5 ? validateTime(masked) : "");
      }
    },
    [onChangeText, onChangeValid],
  );

  return (
    <TextInput
      {...rest}
      value={value}
      onChangeText={handleChange}
      keyboardType="number-pad"
      maxLength={5}
      placeholder="HH:MM"
    />
  );
}

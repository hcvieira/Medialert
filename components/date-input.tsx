/**
 * DateInput — campo de data com máscara DD/MM/AAAA automática.
 *
 * - Exibe para o usuário no formato brasileiro: DD/MM/AAAA
 * - Insere as barras automaticamente enquanto o usuário digita
 * - Chama onChangeISO com o valor no formato ISO (AAAA-MM-DD) quando a data estiver completa,
 *   ou string vazia quando o campo estiver incompleto/inválido
 */

import React, { useCallback } from "react";
import { TextInput, type TextInputProps } from "react-native";

interface DateInputProps extends Omit<TextInputProps, "value" | "onChangeText" | "keyboardType" | "maxLength"> {
  /** Valor exibido no campo (formato DD/MM/AAAA) */
  value: string;
  /** Chamado com o novo valor mascarado (DD/MM/AAAA) */
  onChangeText: (masked: string) => void;
  /** Chamado com o valor ISO (AAAA-MM-DD) quando a data estiver completa e válida, ou "" caso contrário */
  onChangeISO?: (iso: string) => void;
}

/** Aplica a máscara DD/MM/AAAA em uma string de dígitos brutos */
function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Converte DD/MM/AAAA → AAAA-MM-DD; retorna "" se inválido */
function toISO(masked: string): string {
  const parts = masked.split("/");
  if (parts.length !== 3 || parts[2].length !== 4) return "";
  const [dd, mm, yyyy] = parts;
  const d = parseInt(dd, 10);
  const m = parseInt(mm, 10);
  const y = parseInt(yyyy, 10);
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) return "";
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/** Converte AAAA-MM-DD → DD/MM/AAAA para exibição */
export function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function DateInput({ value, onChangeText, onChangeISO, ...rest }: DateInputProps) {
  const handleChange = useCallback(
    (text: string) => {
      const masked = applyDateMask(text);
      onChangeText(masked);
      if (onChangeISO) {
        onChangeISO(masked.length === 10 ? toISO(masked) : "");
      }
    },
    [onChangeText, onChangeISO],
  );

  return (
    <TextInput
      {...rest}
      value={value}
      onChangeText={handleChange}
      keyboardType="number-pad"
      maxLength={10}
      placeholder="DD/MM/AAAA"
    />
  );
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "medialert:favorite_doctors";

export function useFavoriteDoctors() {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const ids: number[] = JSON.parse(raw);
          setFavorites(new Set(ids));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggle = useCallback(async (doctorId: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(doctorId)) {
        next.delete(doctorId);
      } else {
        next.add(doctorId);
      }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next))).catch(() => {});
      return next;
    });
  }, []);

  const isFavorite = useCallback((doctorId: number) => favorites.has(doctorId), [favorites]);

  return { favorites, isFavorite, toggle, loaded };
}

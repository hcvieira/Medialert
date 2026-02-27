import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type AuthContextType = {
  user: Auth.User | null;
  loading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);

      if (Platform.OS === "web") {
        const sessionToken = await Auth.getSessionToken();
        if (!sessionToken) {
          setUser(null);
          return;
        }
        const cachedUser = await Auth.getUserInfo();
        if (cachedUser) {
          setUser(cachedUser);
          // Silently verify in background - do NOT logout on failure
          Api.getMe()
            .then((apiUser) => {
              if (apiUser) {
                const refreshed: Auth.User = {
                  id: apiUser.id,
                  openId: apiUser.openId,
                  name: apiUser.name,
                  email: apiUser.email,
                  loginMethod: apiUser.loginMethod,
                  lastSignedIn: new Date(apiUser.lastSignedIn),
                };
                Auth.setUserInfo(refreshed);
                setUser(refreshed);
              }
            })
            .catch(() => {
              // Keep cached user on API error
            });
          return;
        }
        // Have token but no cached user - try API
        const apiUser = await Api.getMe();
        if (apiUser) {
          const userInfo: Auth.User = {
            id: apiUser.id,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            lastSignedIn: new Date(apiUser.lastSignedIn),
          };
          setUser(userInfo);
          await Auth.setUserInfo(userInfo);
        } else {
          setUser(null);
          await Auth.clearUserInfo();
          await Auth.removeSessionToken();
        }
        return;
      }

      // Native
      const sessionToken = await Auth.getSessionToken();
      if (!sessionToken) {
        setUser(null);
        return;
      }
      const cachedUser = await Auth.getUserInfo();
      if (cachedUser) {
        setUser(cachedUser);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("[AuthContext] fetchUser error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch {
      // Continue even if API fails
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      Auth.getUserInfo().then((cachedUser) => {
        if (cachedUser) {
          setUser(cachedUser);
          setLoading(false);
        } else {
          fetchUser();
        }
      });
    } else {
      fetchUser();
    }
  }, [fetchUser]);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, refresh: fetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}

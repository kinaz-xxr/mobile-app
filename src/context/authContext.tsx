// AuthContext.tsx
import { axiosInstance } from "@/requests/axiosConfig";
import type { Admin } from "@/requests/admin";
import { getAdminProfile } from "@/requests/admin";
import type { Hacker } from "@/requests/hacker";
import { getHackerProfile } from "@/requests/hacker";
import { useUserTypeStore } from "@/reducers/userType";
import { authEventEmitter } from "@/utils/eventEmitter";
import { devError, devLog } from "@/utils/logger";
import {
  getAuthTokens,
  getUserType,
  removeAuthTokens,
  storeAuthTokens,
  storeUserType,
  storeJudgeId,
} from "@/utils/tokens/secureStorage";
import { haptics, ImpactFeedbackStyle } from "@/utils/haptics";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useGlobalSearchParams } from "expo-router";

interface AuthContextType {
  userToken: string | null;
  adminData: Admin | null;
  hackerData: Hacker | null;
  signIn: (access_token: string, refresh_token: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  profileLoading: boolean;
  isFirstSignIn: boolean;
  refreshUserData: () => Promise<void>;
  updateFirstSignInStatus: (status: boolean) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<Admin | null>(null);
  const [hackerData, setHackerData] = useState<Hacker | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [isFirstSignIn, setIsFirstSignIn] = useState<boolean>(false);
  const fetchIdRef = useRef(0);
  const { userType, setUserType, clearUserType } = useUserTypeStore();
  const params = useGlobalSearchParams();
  const hasProcessedUrlAuth = useRef(false);

  const updateFirstSignInStatus = useCallback((status: boolean) => {
    setIsFirstSignIn(status);
  }, []);

  const signOut = useCallback(async () => {
    try {
      haptics.impactAsync(ImpactFeedbackStyle.Medium);
      try {
        if ((await getUserType()) === "judge") {
          const tokens = await getAuthTokens();
          if (tokens?.refresh_token)
            await axiosInstance.post("/api/v13/judges/logout", {
              refresh_token: tokens.refresh_token,
            });
        }
      } catch {
        /* Local sign-out still clears credentials during an outage. */
      }
      await removeAuthTokens();
      setUserToken(null);
      setIsFirstSignIn(false);
      setAdminData(null);
      setHackerData(null);
      clearUserType();
    } catch (error) {
      devError("Error during sign out:", error);
    }
  }, [clearUserType]);

  // Listen for auth errors from the axios interceptor
  useEffect(() => {
    const handleAuthError = () => {
      if (userToken) {
        signOut();
      }
    };

    authEventEmitter.on("onExpiredRefreshToken", handleAuthError);

    return () => {
      authEventEmitter.off("onExpiredRefreshToken", handleAuthError);
    };
  }, [signOut, userToken]);

  // Restore session on app start
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const tokens = await getAuthTokens();
        const savedUserType = await getUserType();

        // Restore userType to Zustand store
        if (savedUserType) {
          setUserType(
            savedUserType as "admin" | "volunteer" | "judge" | "hacker"
          );
        }

        if (tokens?.access_token) {
          setUserToken(tokens.access_token);
          // isFirstSignIn will be set when profile is fetched
        }
      } catch (error) {
        devError("AuthContext: Error restoring session:", error);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, [setUserType]);

  // Handle URL-based authentication (auto-login for judges via token in URL)
  useEffect(() => {
    const handleUrlAuth = async () => {
      // Only process once and only if not already authenticated
      if (hasProcessedUrlAuth.current || userToken) {
        return;
      }

      const urlToken = params.token as string | undefined;
      let urlJudgeId = params.judge_id as string | undefined;

      // Fall back to extracting judge_id from the JWT payload
      if (urlToken && !urlJudgeId) {
        try {
          const payloadB64 = urlToken.split(".")[1];
          const payload = JSON.parse(
            atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
          );
          if (payload.judge_id) {
            urlJudgeId = String(payload.judge_id);
          }
        } catch {
          // malformed token, will fail the check below
        }
      }

      // Judge auto-login requires token and judge_id
      if (urlToken && urlJudgeId) {
        hasProcessedUrlAuth.current = true;
        devLog("Auto-login: Judge URL auth token detected, logging in...");

        try {
          // Set user type to judge
          setUserType("judge");
          await storeUserType("judge");

          // Store judge ID
          await storeJudgeId(parseInt(urlJudgeId, 10));

          // Store token (use same token as refresh since it doesn't expire)
          setUserToken(urlToken);
          await storeAuthTokens(urlToken, urlToken);

          devLog("Auto-login: Successfully authenticated judge via URL");
        } catch (error) {
          devError("Auto-login: Error during judge URL authentication:", error);
          hasProcessedUrlAuth.current = false; // Allow retry on error
        }
      }
    };

    handleUrlAuth();
  }, [params, userToken, setUserType]);

  // Function to fetch user profile data (admin or hacker based on userType)
  const fetchUserProfile = useCallback(
    async (token: string, fetchId: number) => {
      if (!token) return;

      // Skip profile fetch for judges (they don't have a profile endpoint)
      if (userType === "judge") {
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        // Fetch profile based on user type
        if (userType === "hacker") {
          const result = await getHackerProfile(token);
          if (result.error) {
            devError(
              "Error fetching hacker profile:",
              result.error,
              result.response
            );
            await signOut();
            return;
          }
          if (result.response) {
            if (fetchIdRef.current === fetchId) {
              const hackerProfile = result.response.data as Hacker;
              console.log(
                "[DEBUG] Hacker profile last_login:",
                hackerProfile.last_login
              );
              setHackerData(hackerProfile);
              // Set isFirstSignIn based on last_login field
              setIsFirstSignIn(!hackerProfile.last_login);
              console.log(
                "[DEBUG] isFirstSignIn set to:",
                !hackerProfile.last_login
              );
            }
          }
        } else {
          // Default to admin profile for admin, volunteer, etc.
          const result = await getAdminProfile(token);
          if (result.error) {
            devError(
              "Error fetching admin profile:",
              result.error,
              result.response
            );
            await signOut();
            return;
          }
          if (result.response) {
            if (fetchIdRef.current === fetchId) {
              const adminProfile = result.response.data as Admin;
              setAdminData(adminProfile);
              // Set isFirstSignIn based on last_login field
              setIsFirstSignIn(!adminProfile.last_login);
            }
          }
        }
      } catch (error) {
        devError("Error fetching user profile:", error);
        await signOut();
      } finally {
        if (fetchIdRef.current === fetchId) {
          setProfileLoading(false);
        }
      }
    },
    [signOut, userType]
  );

  // Listen for token changes and update user data
  useEffect(() => {
    if (userToken) {
      fetchIdRef.current += 1;
      const currentFetchId = fetchIdRef.current;
      fetchUserProfile(userToken, currentFetchId);
    }
  }, [userToken, fetchUserProfile]);

  // Function to refresh user data (useful after token refresh)
  const refreshUserData = async () => {
    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;
    if (userToken) {
      await fetchUserProfile(userToken, currentFetchId);
    }
  };

  const signIn = async (access_token: string, refresh_token: string) => {
    setUserToken(access_token);
    await storeAuthTokens(access_token, refresh_token);
    // Persist the current userType
    if (userType) {
      await storeUserType(userType);
    }
    // isFirstSignIn will be set when user profile is fetched
  };

  return (
    <AuthContext.Provider
      value={{
        userToken,
        adminData,
        hackerData,
        signIn,
        signOut,
        loading,
        profileLoading,
        isFirstSignIn,
        refreshUserData,
        updateFirstSignInStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Default export for Expo Router
export default AuthProvider;

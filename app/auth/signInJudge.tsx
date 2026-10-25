import { CustomSplashScreen } from "@/components/loading/SplashScreen";
import { AuthContext } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { useGetSponsorByPin, useJudgeLogin } from "@/queries/judge";
import { Judge } from "@/types/judge";
import { devError } from "@/utils/logger";
import { cn, getThemeStyles } from "@/utils/theme";
import {
  storeAuthTokens,
  storeJudgeId,
  storeSponsorPin,
  storeUserType,
} from "@/utils/tokens/secureStorage";
import { haptics, ImpactFeedbackStyle } from "@/utils/haptics";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useContext, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const SignInJudge = () => {
  const { isDark } = useTheme();
  const themeStyles = getThemeStyles(isDark);
  const authContext = useContext(AuthContext);

  const [step, setStep] = useState<"pin" | "select">("pin");
  const [pin, setPin] = useState("");
  const [judges, setJudges] = useState<Judge[]>([]);
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);

  const sponsorMutation = useGetSponsorByPin();
  const loginMutation = useJudgeLogin();

  const handlePinSubmit = async () => {
    if (pin.trim() === "") {
      Toast.show({
        type: "error",
        text1: "PIN Required",
        text2: "Please enter your sponsor PIN",
      });
      return;
    }

    haptics.impactAsync(ImpactFeedbackStyle.Medium);

    try {
      const result = await sponsorMutation.mutateAsync(parseInt(pin));
      const judgesList = result.sponsor.judges;

      setJudges(judgesList || []);
      setStep("select");
    } catch (error) {
      devError("Error getting sponsor by PIN", error);
      Toast.show({
        type: "error",
        text1: "Invalid PIN",
        text2: "Please check your PIN and try again",
      });
    }
  };

  const handleJudgeSelect = async (judge: Judge) => {
    haptics.impactAsync(ImpactFeedbackStyle.Medium);
    setSelectedJudge(judge);

    try {
      const result = await loginMutation.mutateAsync({
        pin: parseInt(pin),
        judge_id: judge.judge_id,
      });

      // Store judge ID for future API calls
      await storeJudgeId(judge.judge_id);

      // Store sponsor PIN for fetching project data
      await storeSponsorPin(parseInt(pin));

      // Store the rotating judge session token pair.
      await storeAuthTokens(result.access_token, result.refresh_token);

      // Store user type as judge
      await storeUserType("judge");

      // IMPORTANT: Use signIn from AuthContext to update the app state
      // This sets userToken which is needed for the (admin) route guard
      if (authContext?.signIn) {
        await authContext.signIn(result.access_token, result.refresh_token);
      }

      Toast.show({
        type: "success",
        text1: "Welcome!",
        text2: `Signed in as ${judge.judge_name}`,
      });

      // Navigate to home screen
      router.dismissAll();
      router.replace("/(admin)");
    } catch (error) {
      devError("Error logging in as judge", error);
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: "Unable to sign in. Please try again",
      });
    }
  };

  const handleGoBack = () => {
    haptics.impactAsync(ImpactFeedbackStyle.Light);
    if (step === "select") {
      setStep("pin");
      setJudges([]);
      setSelectedJudge(null);
    } else {
      // Go back to role selection
      router.replace("/auth/selectRole");
    }
  };

  if (sponsorMutation.isPending || loginMutation.isPending) {
    return <CustomSplashScreen />;
  }

  return (
    <SafeAreaView className={cn("flex-1", themeStyles.background)}>
      <View className={cn("flex-1 pt-12", themeStyles.primaryText)}>
        <Pressable onPress={handleGoBack} className="px-8">
          <ChevronLeft size={24} color={isDark ? "#fff" : "#000"} />
        </Pressable>

        <View className="px-8 flex-col mt-6 mb-12">
          <Text
            className={cn(
              "text-2xl mb-4 font-semibold",
              themeStyles.primaryText
            )}
          >
            {step === "pin" ? "Judge Sign In" : "Select Your Name"}
          </Text>
          <Text className={cn("text-lg", themeStyles.secondaryText)}>
            {step === "pin"
              ? "Enter your sponsor PIN to continue"
              : "Choose your name from the list below"}
          </Text>
        </View>

        {step === "pin" ? (
          <View className="px-8">
            <TextInput
              className={cn(
                "w-full px-4 rounded-xl text-lg mb-6",
                themeStyles.lightCardBackground
              )}
              placeholder="Enter PIN"
              placeholderTextColor={isDark ? "#888" : "#666"}
              keyboardType="number-pad"
              autoFocus={true}
              value={pin}
              onChangeText={setPin}
              style={{
                minHeight: 50,
                textAlignVertical: "center",
                color: isDark ? "#fff" : "#000",
              }}
            />

            <Pressable
              onPress={handlePinSubmit}
              disabled={pin.trim() === "" || sponsorMutation.isPending}
              className={cn(
                "py-4 rounded-xl",
                isDark ? "bg-[#75EDEF]" : "bg-[#132B38]"
              )}
              style={{ opacity: pin.trim() === "" ? 0.5 : 1 }}
            >
              <Text
                className={cn(
                  "text-center text-lg font-semibold",
                  isDark ? "text-black" : "text-white"
                )}
              >
                {sponsorMutation.isPending ? "Verifying..." : "Continue"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView className="flex-1 px-8">
            {judges.map((judge) => (
              <Pressable
                key={judge.judge_id}
                onPress={() => handleJudgeSelect(judge)}
                className={cn(
                  "p-4 rounded-xl mb-3",
                  isDark ? "bg-[#303030]" : "bg-white border border-gray-200",
                  selectedJudge?.judge_id === judge.judge_id &&
                    (isDark
                      ? "border-2 border-[#75EDEF]"
                      : "border-2 border-blue-500")
                )}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text
                  className={cn(
                    "text-lg font-onest-bold",
                    themeStyles.primaryText
                  )}
                >
                  {judge.judge_name}
                </Text>
                <Text
                  className={cn(
                    "text-sm font-pp mt-1",
                    themeStyles.secondaryText
                  )}
                >
                  Judge ID: {judge.judge_id}
                </Text>
              </Pressable>
            ))}

            <View className="mt-6 mb-4">
              <Text
                className={cn(
                  "text-center text-sm mb-3",
                  themeStyles.secondaryText
                )}
              >
                Don&apos;t see your name?
              </Text>
              <Pressable
                onPress={() => router.replace(`/auth/registerJudge?pin=${pin}`)}
                className={cn(
                  "py-4 rounded-xl border-2",
                  isDark
                    ? "border-[#75EDEF] bg-transparent"
                    : "border-[#132B38] bg-transparent"
                )}
              >
                <Text
                  className={cn(
                    "text-center text-lg font-semibold",
                    isDark ? "text-[#75EDEF]" : "text-[#132B38]"
                  )}
                >
                  Register as New Judge
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default SignInJudge;

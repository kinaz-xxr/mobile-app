import { CustomSplashScreen } from "@/components/loading/SplashScreen";
import { AuthContext } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { useJudgeRegister } from "@/queries/judge";
import { devError } from "@/utils/logger";
import { cn, getThemeStyles } from "@/utils/theme";
import {
  storeAuthTokens,
  storeJudgeId,
  storeSponsorPin,
  storeUserType,
} from "@/utils/tokens/secureStorage";
import { haptics, ImpactFeedbackStyle } from "@/utils/haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useContext, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const RegisterJudge = () => {
  const { isDark } = useTheme();
  const themeStyles = getThemeStyles(isDark);
  const authContext = useContext(AuthContext);
  const { pin } = useLocalSearchParams<{ pin: string }>();

  const [judgeName, setJudgeName] = useState("");
  const registerMutation = useJudgeRegister();

  const handleRegister = async () => {
    if (!judgeName.trim()) {
      Toast.show({
        type: "error",
        text1: "Name Required",
        text2: "Please enter your name",
      });
      return;
    }

    haptics.impactAsync(ImpactFeedbackStyle.Medium);

    try {
      const result = await registerMutation.mutateAsync({
        pin: parseInt(pin || "0"),
        judge_name: judgeName.trim(),
      });

      // Store judge ID returned from the backend
      await storeJudgeId(result.judge_id);

      // Store sponsor PIN for fetching project data
      await storeSponsorPin(parseInt(pin || "0"));

      // Store the rotating judge session token pair.
      await storeAuthTokens(result.access_token, result.refresh_token);

      // Store user type as judge
      await storeUserType("judge");

      // Update auth context
      if (authContext?.signIn) {
        await authContext.signIn(result.access_token, result.refresh_token);
      }

      Toast.show({
        type: "success",
        text1: "Success!",
        text2: `Registered as ${judgeName}`,
      });

      // Navigate to home screen
      router.dismissAll();
      router.replace("/(admin)");
    } catch (error) {
      devError("Error registering judge", error);
      Toast.show({
        type: "error",
        text1: "Registration Failed",
        text2:
          error instanceof Error
            ? error.message
            : "Unable to register. Please try again",
      });
    }
  };

  const handleGoBack = () => {
    haptics.impactAsync(ImpactFeedbackStyle.Light);
    router.back();
  };

  if (registerMutation.isPending) {
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
            Register as Judge
          </Text>
          <Text className={cn("text-lg", themeStyles.secondaryText)}>
            Enter your information to register
          </Text>
        </View>

        <View className="px-8">
          <Text
            className={cn("text-sm mb-2 font-medium", themeStyles.primaryText)}
          >
            Your Name
          </Text>
          <TextInput
            className={cn(
              "w-full px-4 rounded-xl text-lg mb-6",
              themeStyles.lightCardBackground
            )}
            placeholder="Enter your full name"
            placeholderTextColor={isDark ? "#888" : "#666"}
            autoFocus={true}
            value={judgeName}
            onChangeText={setJudgeName}
            style={{
              minHeight: 50,
              textAlignVertical: "center",
              color: isDark ? "#fff" : "#000",
            }}
          />

          <Pressable
            onPress={handleRegister}
            disabled={!judgeName.trim() || registerMutation.isPending}
            className={cn(
              "py-4 rounded-xl",
              isDark ? "bg-[#75EDEF]" : "bg-[#132B38]"
            )}
            style={{
              opacity: !judgeName.trim() ? 0.5 : 1,
            }}
          >
            <Text
              className={cn(
                "text-center text-lg font-semibold",
                isDark ? "text-black" : "text-white"
              )}
            >
              {registerMutation.isPending ? "Registering..." : "Register"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default RegisterJudge;

import { useTheme } from "@/context/themeContext";
import { cn, getThemeStyles } from "@/utils/theme";
import { haptics, ImpactFeedbackStyle } from "@/utils/haptics";
import { router } from "expo-router";
import { Dimensions, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import OnboardDarkSvg from "../../assets/images/onboarding/onboard_dark.svg";
import OnboardLightSvg from "../../assets/images/onboarding/onboard_light.svg";

const Onboarding = () => {
  const { isDark } = useTheme();
  const themeStyles = getThemeStyles(isDark);

  const { width, height } = Dimensions.get("window");
  const svgWidth = Math.min(width * 0.8, 500);
  const svgHeight = Math.min(height * 0.8, 500);

  const handleContinue = () => {
    haptics.impactAsync(ImpactFeedbackStyle.Medium);
    router.replace("/auth/notification");
  };

  return (
    <SafeAreaView
      className={cn("flex-1", isDark ? "bg-[#212121]" : "bg-[#ffffff]")}
    >
      <View className="flex-1 px-8 justify-center items-center">
        <View className="items-center mt-20">
          <Text
            className={cn(
              "text-4xl font-onest-bold mb-4 text-center",
              themeStyles.primaryText
            )}
          >
            Congrats!
          </Text>
          <Text
            className={cn(
              "text-lg font-opensans text-center",
              themeStyles.primaryText
            )}
          >
            You have been accepted into UofTHacks 14!
          </Text>
        </View>

        <View className="flex-1 justify-center items-center">
          {isDark ? (
            <OnboardDarkSvg width={svgWidth} height={svgHeight} />
          ) : (
            <OnboardLightSvg width={svgWidth} height={svgHeight} />
          )}
        </View>

        <Pressable
          className={cn(
            "w-full py-4 px-8 rounded-xl items-center mb-8",
            themeStyles.primaryButtonColorBg
          )}
          onPress={handleContinue}
          style={({ pressed }) => ({
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text className="text-center text-lg font-opensans-bold text-black">
            Continue
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default Onboarding;

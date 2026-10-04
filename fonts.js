import {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';

export const useAppFonts = () =>
  useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

// Custom fonts need one family per weight, so map fontWeight -> family
const FAM = {
  100: 'PlusJakartaSans_400Regular', 200: 'PlusJakartaSans_400Regular', 300: 'PlusJakartaSans_400Regular',
  400: 'PlusJakartaSans_400Regular', normal: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium', 600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold', bold: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold', 900: 'PlusJakartaSans_800ExtraBold',
};
const withFont = (style) => {
  const f = StyleSheet.flatten(style) || {};
  return [f, { fontFamily: FAM[f.fontWeight || 400] || FAM[400], fontWeight: 'normal' }];
};

export const Text = ({ style, ...p }) => <RNText {...p} style={withFont(style)} />;
export const TextInput = ({ style, ...p }) => <RNTextInput {...p} style={withFont(style)} />;
/**
 * Web stub — replaces react-native-gesture-handler and react-native-reanimated
 * on the web platform so Metro doesn't try to bundle native-only worklets code.
 */

// Gesture handler stubs
export const GestureHandlerRootView = ({ children, style }) => children;
export const GestureDetector = ({ children }) => children;
export const Gesture = { Tap: () => ({}), Pan: () => ({}), Simultaneous: () => ({}) };
export const ScrollView = require('react-native').ScrollView;
export const FlatList = require('react-native').FlatList;
export const Switch = require('react-native').Switch;
export const TextInput = require('react-native').TextInput;
export const DrawerLayout = () => null;
export const TouchableOpacity = require('react-native').TouchableOpacity;
export const TouchableHighlight = require('react-native').TouchableHighlight;
export const TouchableNativeFeedback = require('react-native').TouchableOpacity;
export const TouchableWithoutFeedback = require('react-native').TouchableWithoutFeedback;
export const PanGestureHandler = ({ children }) => children;
export const TapGestureHandler = ({ children }) => children;
export const State = {};
export const Directions = {};

// Reanimated stubs
export const useSharedValue = (val) => ({ value: val });
export const useAnimatedStyle = (fn) => fn();
export const withTiming = (val) => val;
export const withSpring = (val) => val;
export const Animated = require('react-native').Animated;
export const createAnimatedComponent = (c) => c;
export const useAnimatedGestureHandler = () => ({});
export default {};

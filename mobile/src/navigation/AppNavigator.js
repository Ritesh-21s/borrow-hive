import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import CustomTabBar from '../components/TabBar';
import { Colors } from '../constants/theme';

// Auth Screens
import SplashScreen from '../screens/auth/Splash';
import LoginScreen from '../screens/auth/Login';
import RegisterScreen from '../screens/auth/Register';
import CommunityVerifyScreen from '../screens/auth/CommunityVerify';

// Main Tab Screens
import HomeScreen from '../screens/home/Home';
import MarketplaceListScreen from '../screens/marketplace/MarketplaceList';
import RidesListScreen from '../screens/rides/RidesList';
import ChatListScreen from '../screens/chat/ChatList';
import ProfileScreen from '../screens/profile/Profile';

// Stacked Screens
import ListingDetailScreen from '../screens/marketplace/ListingDetail';
import CreateListingScreen from '../screens/marketplace/CreateListing';
import BorrowRequestScreen from '../screens/borrow/BorrowRequest';
import BorrowDashboardScreen from '../screens/borrow/BorrowDashboard';
import BorrowRequestDetailScreen from '../screens/borrow/BorrowRequestDetail';
import BorrowListScreen from '../screens/borrow/BorrowList';
import RaiseBorrowRequestScreen from '../screens/borrow/RaiseBorrowRequest';
import BorrowPostDetailScreen from '../screens/borrow/BorrowPostDetail';
import RideDetailScreen from '../screens/rides/RideDetail';
import CreateRideScreen from '../screens/rides/CreateRide';
import FavorsListScreen from '../screens/favors/FavorsList';
import FavorDetailScreen from '../screens/favors/FavorDetail';
import ConversationScreen from '../screens/chat/Conversation';
import NotificationsScreen from '../screens/notifications/Notifications';
import ReviewsScreen from '../screens/profile/Reviews';
import LeaveReviewScreen from '../screens/profile/LeaveReview';
import EditProfileScreen from '../screens/profile/EditProfile';
import UserProfileScreen from '../screens/profile/UserProfile';
import MyListingsScreen from '../screens/marketplace/MyListings';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: Colors.surface },
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: 'Fraunces_600SemiBold', fontSize: 17, color: Colors.ink },
  headerTintColor: Colors.ink,
  contentStyle: { backgroundColor: Colors.bg },
};

function HomeTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Marketplace" component={MarketplaceListScreen} />
      <Tab.Screen name="Rides" component={RidesListScreen} />
      <Tab.Screen name="Chat" component={ChatListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="CommunityVerify" component={CommunityVerifyScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Tabs" component={HomeTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: 'Listing' }} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ title: 'New Listing' }} />
      <Stack.Screen name="EditListing" component={CreateListingScreen} options={{ title: 'Edit Listing' }} />
      <Stack.Screen name="BorrowRequest" component={BorrowRequestScreen} options={{ title: 'Request to Borrow' }} />
      <Stack.Screen name="BorrowDashboard" component={BorrowDashboardScreen} options={{ title: 'My Borrows' }} />
      <Stack.Screen name="BorrowRequestDetail" component={BorrowRequestDetailScreen} options={{ title: 'Borrow Request' }} />
      <Stack.Screen name="BorrowList" component={BorrowListScreen} options={{ title: 'Borrow' }} />
      <Stack.Screen name="RaiseBorrowRequest" component={RaiseBorrowRequestScreen} options={{ title: 'Raise Borrow Request' }} />
      <Stack.Screen name="BorrowPostDetail" component={BorrowPostDetailScreen} options={{ title: 'Borrow Request' }} />
      <Stack.Screen name="RideDetail" component={RideDetailScreen} options={{ title: 'Ride' }} />
      <Stack.Screen name="CreateRide" component={CreateRideScreen} options={{ title: 'Offer a Ride' }} />
      <Stack.Screen name="FavorsList" component={FavorsListScreen} options={{ title: 'Favors' }} />
      <Stack.Screen name="FavorDetail" component={FavorDetailScreen} options={{ title: 'Favor' }} />
      <Stack.Screen name="Conversation" component={ConversationScreen} options={{ title: '' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: 'Reviews' }} />
      <Stack.Screen name="LeaveReview" component={LeaveReviewScreen} options={{ title: 'Leave a Review' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="MyListings" component={MyListingsScreen} options={{ title: 'My Listings' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null; // Splash handles this

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { AleraNavIcon } from '../components/AleraBrand';

// Pantallas
import { HomeMapScreen } from '../screens/HomeMapScreen';
import { SeismicDetailScreen } from '../screens/SeismicDetailScreen';
import { SeismicListScreen } from '../screens/SeismicListScreen';
import { CommunityAlertsScreen } from '../screens/CommunityAlertsScreen';
import { NewReportScreen } from '../screens/NewReportScreen';
import { AlertSettingsScreen } from '../screens/AlertSettingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SeismicEvent } from '../types';

export type RootStackParamList = {
  MainTabs: undefined;
  SeismicDetail: { event?: SeismicEvent };
  SeismicList: undefined;
  NewReport: undefined;
  AlertSettings: undefined;
  CommunityAlerts: undefined;
};

export type BottomTabParamList = {
  Sismos: undefined;
  Comunidad: undefined;
  Perfil: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

function BottomTabNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#111317' : '#FFFFFF',
          borderTopColor: colors.surfaceCardBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.seismicAccent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      {/* Tab 1: Sismos Nacionales */}
      <Tab.Screen
        name="Sismos"
        component={HomeMapScreen}
        options={{
          tabBarLabel: 'Sismos',
          tabBarIcon: ({ color }) => (
            <AleraNavIcon tab="Sismos" color={color} size={22} />
          ),
        }}
      />

      {/* Tab 2: Alertas Comunitarias */}
      <Tab.Screen
        name="Comunidad"
        component={CommunityAlertsScreen}
        options={{
          tabBarLabel: 'Alertas Comunitarias',
          tabBarIcon: ({ color }) => (
            <AleraNavIcon tab="AlertasComunitarias" color={color} size={22} />
          ),
        }}
      />

      {/* Tab 3: Perfil y Ajustes */}
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => (
            <AleraNavIcon tab="Perfil" color={color} size={22} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export const AppNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.backgroundPrimary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen name="SeismicDetail" component={SeismicDetailScreen} />
      <Stack.Screen name="SeismicList" component={SeismicListScreen} />
      <Stack.Screen name="NewReport" component={NewReportScreen} />
      <Stack.Screen name="AlertSettings" component={AlertSettingsScreen} />
      <Stack.Screen name="CommunityAlerts" component={CommunityAlertsScreen} />
    </Stack.Navigator>
  );
};
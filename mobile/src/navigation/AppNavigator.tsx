import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Activity, Bell, Users, User } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

// Pantallas
import { HomeMapScreen } from '../screens/HomeMapScreen';
import { SeismicDetailScreen } from '../screens/SeismicDetailScreen';
import { CommunityAlertsScreen } from '../screens/CommunityAlertsScreen';
import { NewReportScreen } from '../screens/NewReportScreen';
import { AlertSettingsScreen } from '../screens/AlertSettingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SeismicEvent } from '../types';

export type RootStackParamList = {
  MainTabs: undefined;
  SeismicDetail: { event?: SeismicEvent };
  NewReport: undefined;
  AlertSettings: undefined;
  CommunityAlerts: undefined;
};

export type BottomTabParamList = {
  Mapa: undefined;
  Alertas: undefined;
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
          height: 62,
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
      {/* Tab 1: Mapa Sísmico Nacional */}
      <Tab.Screen
        name="Mapa"
        component={HomeMapScreen}
        options={{
          tabBarLabel: 'Mapa',
          tabBarIcon: ({ color }) => (
            <Activity size={20} color={color} strokeWidth={2} />
          ),
        }}
      />

      {/* Tab 2: Ajustes de Alerta y Sirena */}
      <Tab.Screen
        name="Alertas"
        component={AlertSettingsScreen}
        options={{
          tabBarLabel: 'Alertas',
          tabBarIcon: ({ color }) => (
            <Bell size={20} color={color} strokeWidth={2} />
          ),
        }}
      />

      {/* Tab 3: Alertas Comunitarias Vecinales */}
      <Tab.Screen
        name="Comunidad"
        component={CommunityAlertsScreen}
        options={{
          tabBarLabel: 'Comunidad',
          tabBarIcon: ({ color }) => (
            <Users size={20} color={color} strokeWidth={2} />
          ),
        }}
      />

      {/* Tab 4: Perfil y Estado del Dispositivo */}
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => (
            <User size={20} color={color} strokeWidth={2} />
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
      <Stack.Screen name="NewReport" component={NewReportScreen} />
      <Stack.Screen name="AlertSettings" component={AlertSettingsScreen} />
      <Stack.Screen name="CommunityAlerts" component={CommunityAlertsScreen} />
    </Stack.Navigator>
  );
};
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { ClientProvider, useClient } from '../../context/ClientContext';

function TabsContent() {
  const { client } = useClient();
  const isAdmin = client?.is_admin ?? false;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#E31E24',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: isAdmin
          ? { display: 'none' }
          : {
              backgroundColor: '#fff',
              borderTopWidth: 0.5,
              borderTopColor: '#ddd',
              height: 70,
              paddingBottom: 10,
            },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Récompenses',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🎁</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <ClientProvider>
      <TabsContent />
    </ClientProvider>
  );
}

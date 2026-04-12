import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../../LoginScreen';
import RoleNavigator from '../../RoleNavigator';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading, authError } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.copy}>Connecting to Firebase...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="App" component={RoleNavigator} />
        ) : (
          <Stack.Screen name="Login">
            {() => <LoginScreen initialError={authError} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
  },
  copy: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});

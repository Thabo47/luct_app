import 'react-native-gesture-handler';
import React from 'react';
import { AuthProvider } from './AuthContext';
import AppNavigator from './AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

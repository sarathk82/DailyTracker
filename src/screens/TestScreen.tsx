import React from 'react';
import { View, Text } from 'react-native';

export default function TestScreen() {
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#fff'
    }}>
      <Text style={{ 
        fontSize: 24,
        color: '#000'
      }}>
        Test Screen
      </Text>
    </View>
  );
}

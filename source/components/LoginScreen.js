/* eslint-disable prettier/prettier */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import AppHeader from '../widgets/AppHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BLOCK_HEIGHT_THRESHOLD, HEADER_HEIGHT_THRESHOLD } from '../resources/data/Constants';
import tmh_styles from '../styles/tmh_styles';
import { API_BASE } from "../resources/data/Constants";

const LoginScreen = ({ navigation }) => {
  const windowDimensions = Dimensions.get('window');
  const screenDimensions = Dimensions.get('screen');

  const [dimensions] = useState({
    window: windowDimensions,
    screen: screenDimensions,
  });

  const [rightButtons] = useState([]);
  const [headerHeight] = useState(
    (HEADER_HEIGHT_THRESHOLD * dimensions.screen.height) / 100
  );
  const [blockHeight] = useState(
    (BLOCK_HEIGHT_THRESHOLD * dimensions.screen.height) / 100
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Validation Error', 'Please enter both email and password.');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log('Login API Response:', data);

    if (response.ok && data.status === 1) {
      // Save token and user if present
      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userName', data.customer.fname);

        console.log(data.customer.fname);
      }
      if (data.customer) {
    await AsyncStorage.setItem('userInfo', JSON.stringify(data.customer));
    await AsyncStorage.setItem('userName', data.customer.fname);
  }
      navigation.replace('Home');
    } else {
      // Show error message from API
      Alert.alert('Login Failed', data.message || 'Invalid credentials.');
    }
  } catch (error) {
    console.error('Login error:', error);
    Alert.alert('Network Error', 'Unable to connect. Please try again later.');
  } finally {
    setLoading(false);
  }
};


  const handleGoogleLogin = () => {
    Alert.alert('Coming Soon', 'Google login is not yet implemented.');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title={'Login'}
        backgroundColor={'#c99742'}
        rightButtons={rightButtons}
        height={headerHeight}
        titleStyle={tmh_styles.header_title_tmb}
        isShowShadow={false}
        navigation={navigation}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: 'center' }}
        backIconColor={'black'}
        logoImage={null}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Login</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          onChangeText={setEmail}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          onChangeText={setPassword}
          value={password}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Logging in...' : 'Log In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
          <Image 
            source={require('../resources/assets/google.png')}
            style={styles.googleIcon}
          />
          <Text style={styles.googleButtonText}>Login with Google</Text>
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}> Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#08090B',
  },
  title: {
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 40,
    color: '#ae7718',
  },
  input: {
    borderWidth: 1,
    backgroundColor: '#1A1C1E',
    padding: 12,
    marginVertical: 10,
    borderRadius: 8,
    color: '#fff',
    borderColor: '#ccc',
  },
  button: {
    borderColor: '#ae7718',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
  },
  buttonText: {
    color: '#CCC',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    marginTop: 10,
  },
  googleIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  registerText: {
    color: '#aaa',
    fontSize: 14,
  },
  registerLink: {
    color: '#ae7718',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

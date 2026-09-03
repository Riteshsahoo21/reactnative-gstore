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
import axios from 'axios';
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
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Validation Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      // Multi-host resilient candidates for physical Android USB reverse & LAN
      const candidates = [
        `${API_BASE}/auth/login`,
        'http://localhost:5000/api/auth/login',
        'http://192.168.1.9:5000/api/auth/login',
        'http://10.0.2.2:5000/api/auth/login',
      ];
      const uniqueCandidates = [...new Set(candidates)];
      let data = null;
      let lastErrorMessage = 'Unable to connect to server.';

      for (const url of uniqueCandidates) {
        try {
          const res = await axios.post(
            url,
            { email: trimmedEmail, password: trimmedPassword },
            {
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              timeout: 6000,
            }
          );

          if (res.status === 200 && res.data && res.data.token) {
            data = res.data;
            break;
          }
        } catch (err) {
          if (err.response && err.response.data && err.response.data.message) {
            lastErrorMessage = err.response.data.message;
            break;
          }
        }
      }

      if (data && data.token) {
        await AsyncStorage.setItem('userToken', data.token);
        const displayName = data.name || trimmedEmail.split('@')[0];
        await AsyncStorage.setItem('userName', displayName);
        await AsyncStorage.setItem(
          'userInfo',
          JSON.stringify({
            id: data._id,
            name: data.name,
            email: data.email,
            role: data.role,
            ...data,
          })
        );

        Alert.alert('Welcome Back!', `Logged in successfully as ${displayName}`, [
          { text: 'Continue', onPress: () => navigation.replace('Home') },
        ]);
      } else {
        Alert.alert('Login Failed', lastErrorMessage || 'Invalid email or password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Network Error', 'Unable to connect to server. Please make sure port 5000 is running.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCustomer = () => {
    setEmail('customer@grandstore.com');
    setPassword('password123');
  };

  const handleGoogleLogin = () => {
    Alert.alert(
      'Google Login',
      'Google sign-in is disabled in development mode. Please use email/password or the Demo Customer account below.'
    );
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
        <Text style={styles.title}>The Grand Store</Text>

        {/* Demo Customer Quick Fill Banner */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={fillDemoCustomer}
          style={styles.demoCard}
        >
          <Text style={styles.demoBadge}>⚡ QUICK DEMO ACCOUNT</Text>
          <Text style={styles.demoTitle}>Tap to use Verified Customer Account</Text>
          <Text style={styles.demoDetails}>Email: customer@grandstore.com • Password: password123</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Email Address"
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
          <Text style={styles.googleButtonText}>Login with Google (Disabled)</Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 20,
    color: '#ae7718',
    letterSpacing: 1,
  },
  demoCard: {
    backgroundColor: '#181410',
    borderWidth: 1,
    borderColor: 'rgba(201, 151, 66, 0.4)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  demoBadge: {
    color: '#f5c242',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  demoTitle: {
    color: '#eee',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  demoDetails: {
    color: '#918a7f',
    fontSize: 11,
    lineHeight: 15,
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

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { CheckBox } from 'react-native-elements';
import { Ionicons } from '@expo/vector-icons';
import loginIllustration from './assets/Login.jpg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

const APP_VERSION = "2.5"; // Make sure this matches your actual app version

const LoginScreen = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savePassword, setSavePassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAppUpToDate, setIsAppUpToDate] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('savedEmail');
        const savedPassword = await AsyncStorage.getItem('savedPassword');
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setSavePassword(true);
        }
      } catch (err) {
        console.error('Failed to load credentials:', err);
      }
    };
    loadCredentials();
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    const checkVersion = async () => {
      const isUpToDate = await checkAppVersion();
      setIsAppUpToDate(isUpToDate);
    };
    checkVersion();
  }, []);

  const checkAppVersion = async () => {
    try {
      const response = await axios.get('https://api.gajkesaristeels.in/version/current');
  
      const serverVersionData = response.data;
      const serverVersion = serverVersionData.versionName;
  
      console.log('Server Version:', serverVersion);
      console.log('App Version:', APP_VERSION);
  
      if (compareVersions(APP_VERSION, serverVersion) < 0) {
        console.log('A new version is available.');
        return false; // Indicates that the app version is outdated
      } else {
        console.log('App is up to date.');
        return true; // Indicates that the app version is up to date
      }
    } catch (error) {
      console.error('Error checking app version:', error);
      return true; // In case of error, allow the user to continue
    }
  };

  const compareVersions = (v1, v2) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
  
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
  
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
  
    return 0;
  };

  const navigateToUserProfile = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'UserProfile' }],
    });
  };

  const handleLogin = async () => {
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
  
    setIsLoading(true);
    const url = 'https://api.gajkesaristeels.in/user/token';
    const body = JSON.stringify({
      username: email,
      password: password,
    });
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Access-Control-Allow-Origin': '*',
          e_platform: 'mobile',
        },
        body: body,
      });
  
      const data = await response.text();
  
      if (data === 'Bad credentials') {
        setErrorMessage('Invalid username or password. Please try again.');
      } else {
        const [employeeId, token] = data.split(' ');
        if (employeeId && token) {
          await AsyncStorage.setItem('userToken', token);
          await AsyncStorage.setItem('employeeId', employeeId);
  
          if (savePassword) {
            await AsyncStorage.setItem('savedEmail', email);
            await AsyncStorage.setItem('savedPassword', password);
          } else {
            await AsyncStorage.removeItem('savedEmail');
            await AsyncStorage.removeItem('savedPassword');
          }
  
          onLoginSuccess(employeeId, token);
          console.log('Login successful, navigating to user profile.');
          navigateToUserProfile();
        } else {
          setErrorMessage('The server did not return the expected token.');
        }
      }
    } catch (err) {
      console.error('Login Error:', err);
      setErrorMessage('An error occurred during login. Please check your network connection and try again.');
    }
    setIsLoading(false);
  };

    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollViewContent} ref={scrollViewRef}>
          <Text style={styles.versionText}>V {APP_VERSION}</Text>
          <Image source={loginIllustration} style={styles.illustration} resizeMode="contain" />
          <View style={styles.loginCard}>
            <Text style={styles.title}>Sales Navigator</Text>
            {isAppUpToDate ? (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={24} color="#6C63FF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={24} color="#6C63FF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-outline" : "eye-off-outline"} 
                      size={24} 
                      color="#6C63FF" 
                    />
                  </TouchableOpacity>
                </View>
                {errorMessage ? (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                ) : null}
                <View style={styles.checkboxContainer}>
                  <CheckBox
                    title="Save Password"
                    checked={savePassword}
                    onPress={() => setSavePassword(!savePassword)}
                    containerStyle={styles.checkbox}
                    textStyle={styles.checkboxText}
                    checkedColor="#6C63FF"
                  />
                </View>
                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Log In</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.updateText}>A new version of the app is available. Please update to continue.</Text>
            )}
          </View>
          <Text style={styles.poweredByText}>Powered by Nyx Solutions</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F3F4F6',
    },
    scrollViewContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loginCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: 30,
      width: '100%',
      alignItems: 'center',
      shadowColor: '#6C63FF',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 5,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#6C63FF',
      marginBottom: 30,
    },
    illustration: {
      width: '80%',
      height: 200,
      marginBottom: 30,
    },
    versionText: {
      fontSize: 14,
      color: '#6C63FF',
      position: 'absolute',
      top: 10,
      right: 10,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      width: '100%',
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: '#1F2937',
      paddingRight: 10,
    },
    eyeIcon: {
      padding: 5,
    },
    errorText: {
      color: '#EF4444',
      marginBottom: 16,
      textAlign: 'center',
    },
    checkboxContainer: {
      flexDirection: 'row',
      marginBottom: 20,
      alignItems: 'center',
      width: '100%',
    },
    checkbox: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      margin: 0,
      padding: 0,
    },
    checkboxText: {
      fontWeight: 'normal',
      fontSize: 16,
      color: '#4B5563',
    },
    button: {
      backgroundColor: '#6C63FF',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      width: '100%',
    },
    buttonText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 18,
    },
    poweredByText: {
      fontSize: 14,
      color: '#6C63FF',
      marginTop: 30,
      textAlign: 'center',
    },
    updateText: {
      fontSize: 18,
      color: '#EF4444',
      textAlign: 'center',
      marginTop: 20,
    },
  });

  export default LoginScreen;
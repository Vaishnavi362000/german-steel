import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
const APP_VERSION = "1.0"; // Make sure this matches your actual app version

const LoginScreen = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savePassword, setSavePassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAppUpToDate, setIsAppUpToDate] = useState(true);
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

  // Keep saved credentials in sync whenever the toggle is on
  useEffect(() => {
    const persist = async () => {
      try {
        if (savePassword) {
          await AsyncStorage.setItem('savedEmail', email || '');
          await AsyncStorage.setItem('savedPassword', password || '');
        } else {
          await AsyncStorage.removeItem('savedEmail');
          await AsyncStorage.removeItem('savedPassword');
        }
      } catch (err) {
        console.error('Failed to persist credentials:', err);
      }
    };
    persist();
  }, [savePassword, email, password]);

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
      const response = await fetch('https://unbalkingly-uncharged-elizabet.ngrok-free.dev/version/current', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Bypass ngrok browser warning page
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
  
      // Check if response status is not OK
      if (!response.ok) {
        console.log(`Version check endpoint returned status ${response.status} - skipping version check`);
        return true; // Allow login to continue
      }

      const responseText = await response.text();
      
      // Check if response is empty
      if (!responseText || responseText.trim() === '') {
        console.log('Server returned empty response - skipping version check');
        return true; // Allow login to continue
      }
      
      // Check if response is HTML or plain text instead of JSON
      if (responseText.includes('<!DOCTYPE html>') || 
          responseText.includes('<html') || 
          !responseText.trim().startsWith('{') && !responseText.trim().startsWith('[')) {
        console.log('Server returned non-JSON response - skipping version check');
        return true; // Allow login to continue
      }

      let serverVersionData;
      try {
        serverVersionData = JSON.parse(responseText);
      } catch (parseError) {
        console.log('Failed to parse version response as JSON - skipping version check');
        console.log('Response preview:', responseText.substring(0, 100));
        return true; // Allow login to continue
      }

      const serverVersion = serverVersionData?.versionName;
  
      console.log('Server Version:', serverVersion);
      console.log('App Version:', APP_VERSION);

      // If server version is undefined or null, skip version check
      if (!serverVersion) {
        console.log('Server version is undefined - skipping version check');
        return true;
      }
  
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
    // Return 0 if either version is null/undefined
    if (!v1 || !v2) {
      return 0;
    }

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

  const handleLogin = async () => {
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
  
    setIsLoading(true);
    const url = 'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/user/token';
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
        const parts = data.split(' ');
        const token = parts.length > 1 ? parts[1] : parts[0];
        
        if (token) {
          await AsyncStorage.setItem('userToken', token);
          
          // Fetch employee data using /employee/me endpoint
          try {
            console.log('🔵 [LOGIN] Fetching employee data from /employee/me...');
            console.log('🔵 [LOGIN] Using token:', token.substring(0, 20) + '...');
            
            const employeeResponse = await fetch('https://unbalkingly-uncharged-elizabet.ngrok-free.dev/employee/me', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                // Bypass ngrok browser warning page
                'ngrok-skip-browser-warning': 'true',
                'User-Agent': 'IconMobile',
              },
            });
            
            console.log('🔵 [LOGIN] Response status:', employeeResponse.status);
            
            const responseText = await employeeResponse.text();
            console.log('🔵 [LOGIN] Employee data received (first 200 chars):', responseText.substring(0, 200));
            
            // Check if response is HTML instead of JSON
            if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
              console.error('❌ [LOGIN] Server returned HTML login page - token may be invalid');
              console.error('❌ [LOGIN] This usually means the endpoint requires authentication');
              setErrorMessage('Authentication failed. Please check your credentials and try again.');
              await AsyncStorage.removeItem('userToken');
              return;
            }

            const employeeData = JSON.parse(responseText);
            console.log('🔵 [LOGIN] Parsed employee data:', employeeData);
            
            // The response has employeeId field (from /employee/me endpoint)
            const employeeId = employeeData?.employeeId || employeeData?.id;
            const firstName = employeeData?.firstName;
            const role = employeeData?.roles || employeeData?.role; // Could be "REGIONAL_MANAGER", "FIELD_OFFICER", etc.
            
            console.log('✅ [LOGIN] Employee ID from response:', employeeId);
            console.log('✅ [LOGIN] Employee Name from response:', firstName);
            console.log('✅ [LOGIN] Employee Role from response:', role);
            
            // Check if employeeId is valid
            if (!employeeId) {
              console.error('❌ [LOGIN] Employee ID is undefined or null');
              setErrorMessage('Failed to retrieve employee information. Please try again.');
              return;
            }
            
            // Store the employee data in AsyncStorage
            await AsyncStorage.setItem('employeeId', employeeId.toString());
            await AsyncStorage.setItem('employeeFirstName', firstName || '');
            await AsyncStorage.setItem('employeeRole', role || '');
            
            if (savePassword) {
              await AsyncStorage.setItem('savedEmail', email);
              await AsyncStorage.setItem('savedPassword', password);
            } else {
              await AsyncStorage.removeItem('savedEmail');
              await AsyncStorage.removeItem('savedPassword');
            }
  
            onLoginSuccess(employeeId, token);
            console.log('✅ [LOGIN] Login successful. Auth state updated, app will automatically navigate.');
            // No need to manually navigate - App.js will automatically switch to Tab Navigator
            // when authToken is set via onLoginSuccess
          } catch (employeeError) {
            console.error('❌ [LOGIN] Error fetching employee data:', employeeError);
            setErrorMessage('Failed to fetch employee data. Please try again.');
          }
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
        <View style={styles.brandingContainer}>
          <Image
            source={require('../assets/Icon.jpeg')}
            style={styles.logoImage}
          />
          <Text style={styles.brandTagline}>Navigate Your Success</Text>
        </View>
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
                    secureTextEntry
                    onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                  />
                </View>
                {errorMessage ? (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                ) : null}
                <Pressable 
                  style={styles.checkboxContainer} 
                  onPress={() => setSavePassword(!savePassword)}
                >
                  <View style={[styles.checkboxBox, savePassword && styles.checkboxBoxChecked]}>
                    {savePassword && <Ionicons name="checkmark" size={18} color="#ffffff" />}
                  </View>
                  <Text style={styles.checkboxText}>Save Password</Text>
                </Pressable>
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
    brandingContainer: {
      alignItems: 'center',
      marginBottom: 30,
    },
    logoImage: {
      width: 260,
      height: 90,
      resizeMode: 'contain',
    },
    iconLogoWrapper: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 15,
    },
    trendingIcon: {
      position: 'absolute',
      bottom: -5,
      right: -5,
      backgroundColor: '#F3F4F6',
      borderRadius: 20,
      padding: 3,
    },
    brandName: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#6C63FF',
      marginTop: 10,
    },
    brandTagline: {
      fontSize: 14,
      color: '#6B7280',
      marginTop: 5,
      fontStyle: 'italic',
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
    checkboxBox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderColor: '#6C63FF',
      borderRadius: 4,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    checkboxBoxChecked: {
      backgroundColor: '#6C63FF',
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
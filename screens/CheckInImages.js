import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { ConnectivityStatusIcons } from '../components/ConnectivityStatus';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const CheckInImages = ({ visitId, authToken, onImageAdded, isDisabled }) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    // This effect will run when the component mounts or when isDisabled changes
    if (isDisabled) {
      setCapturedImage(null);
    }
  }, [isDisabled]);

  const requestCameraAndPhotosPermissions = async () => {
    try {
      const cameraPermission = await requestPermission();
      const { status: photosStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!cameraPermission.granted || photosStatus !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'Camera and photo library permissions are required to add images.', 
          [
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting camera and photo permissions:', error);
      Alert.alert(
        'Error',
        'Failed to request camera permissions. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const handleAddImage = async () => {
    try {
      const hasPermissions = await requestCameraAndPhotosPermissions();
      if (hasPermissions) {
        setIsCameraReady(false);
        setIsCameraOpen(true);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert(
        'Error',
        'Failed to open camera. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCapture = async () => {
    console.log('📸 [CheckInImages] handleCapture called');
    if (!permission?.granted) {
      const camPerm = await requestPermission();
      if (!camPerm?.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to capture images.');
        return;
      }
    }
    if (!isCameraReady) {
      Alert.alert('Please wait', 'Camera is initializing. Try again in a moment.');
      return;
    }
    if (cameraRef.current) {
      try {
        console.log('📸 [CheckInImages] Taking picture...');
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: true,
        });
        console.log('📸 [CheckInImages] Picture taken:', photo.uri);
        setCapturedImage(photo.uri);
        setIsCameraOpen(false);
        console.log('📸 [CheckInImages] Captured image set, camera closed');
      } catch (error) {
        console.error('❌ [CheckInImages] Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture image. Please try again.');
      }
    } else {
      console.error('❌ [CheckInImages] Camera ref is not available');
    }
  };

  const uploadImage = async (imageUri) => {
    console.log('📤 [CheckInImages] uploadImage called with URI:', imageUri);
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds
    let attempt = 0;

    const tryUpload = async () => {
      try {
        console.log(`📤 [CheckInImages] Upload attempt ${attempt + 1}/${MAX_RETRIES}`);
        const token = await AsyncStorage.getItem('userToken');
        console.log('📤 [CheckInImages] Token retrieved:', token ? 'Yes' : 'No');
        console.log('📤 [CheckInImages] visitId:', visitId);
        
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          name: 'image.jpg',
          type: 'image/jpeg',
        });

        console.log('📤 [CheckInImages] Making API call...');
        const response = await axios.put(
          `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/uploadFile?id=${visitId}&tag=check-in`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token || authToken}`,
              'ngrok-skip-browser-warning': 'true',
              'User-Agent': 'IconMobile',
            },
            timeout: 30000, // 30 second timeout
          }
        );

        console.log('✅ [CheckInImages] Upload response:', response.status);
        
        // Check if response is HTML (authentication failure)
        const isHtmlResponse = typeof response.data === 'string' && 
          (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
        
        if (isHtmlResponse) {
          console.error('❌ [CheckInImages] Server returned HTML - authentication failed');
          throw new Error('Authentication failed. Please try logging in again.');
        }
        
        console.log('✅ [CheckInImages] Upload successful, response data:', response.data);
        setCapturedImage(null);
        onImageAdded();
        return true;
      } catch (error) {
        console.error(`❌ [CheckInImages] Upload attempt ${attempt + 1} failed:`, error);
        console.error('❌ [CheckInImages] Error details:', error.message);
        
        if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
          if (attempt < MAX_RETRIES - 1) {
            attempt++;
            console.log(`🔄 [CheckInImages] Retrying upload in ${RETRY_DELAY/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return tryUpload();
          }
        }
        
        throw error;
      }
    };

    try {
      await tryUpload();
    } catch (error) {
      console.error('❌ [CheckInImages] All upload attempts failed:', error);
      
      if (error.message === 'Network Error') {
        Alert.alert(
          'Network Error',
          'Please check your internet connection and try again.',
          [
            {
              text: 'Retry',
              onPress: () => uploadImage(imageUri)
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } else if (error.message.includes('Authentication failed')) {
        Alert.alert(
          'Authentication Error',
          'Your session may have expired. Please try logging in again.',
          [
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      }
      throw error;
    }
  };

  const handleConfirm = async () => {
    console.log('✅ [CheckInImages] handleConfirm called');
    console.log('✅ [CheckInImages] isConfirmLoading:', isConfirmLoading);
    console.log('✅ [CheckInImages] capturedImage:', capturedImage);
    
    if (isConfirmLoading) {
      console.log('⏳ [CheckInImages] Already loading, skipping...');
      return;
    }

    setIsConfirmLoading(true);
    console.log('⏳ [CheckInImages] Loading state set to true');

    try {
      if (capturedImage) {
        console.log('📤 [CheckInImages] Uploading image...');
        await uploadImage(capturedImage);
        console.log('✅ [CheckInImages] Upload successful');
        setIsConfirmLoading(false);
      } else {
        console.error('❌ [CheckInImages] No captured image found!');
        setIsConfirmLoading(false);
      }
    } catch (error) {
      console.error('❌ [CheckInImages] Error uploading image:', error);
      setIsConfirmLoading(false);
      showFailureMessage();
    }
  };

  const showFailureMessage = () => {
    Alert.alert('Error', 'Failed to upload image', [{ text: 'OK' }], { cancelable: false });
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={[styles.actionBtn, isDisabled && styles.disabledBtn]}
        onPress={handleAddImage}
        disabled={isDisabled}
      >
        <View style={styles.buttonContent}>
          <Icon name="camera" size={24} color="#FFFFFF" />
          <Text style={styles.actionText}>Add Check-In Images</Text>
        </View>
        <View style={styles.connectivityContainer}>
          <ConnectivityStatusIcons />
        </View>
      </TouchableOpacity>

      {isCameraOpen && (
        <Modal 
          visible={true} 
          animationType="slide" 
          transparent={false}
          onRequestClose={() => setIsCameraOpen(false)}
        >
          <View style={{ flex: 1 }}>
            <CameraView 
              ref={cameraRef} 
              style={styles.camera} 
              facing="back"
              onCameraReady={() => setIsCameraReady(true)}
              onMountError={(e) => {
                console.error('❌ [CheckInImages] Camera mount error:', e?.nativeEvent || e);
                Alert.alert('Camera Error', 'Unable to initialize camera. Please check permissions and try again.');
              }}
            >
              <View style={styles.cameraButtonContainer}>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setIsCameraOpen(false)}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.captureButton, !isCameraReady && styles.disabledButton]}
                  onPress={handleCapture}
                  disabled={!isCameraReady}
                >
                  <Text style={styles.captureButtonText}>Capture</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        </Modal>
      )}

      {capturedImage && (
        <Modal visible={true} animationType="slide" transparent={false}>
          <View style={styles.capturedImageContainer}>
            <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
            <View style={styles.confirmButtonsContainer}>
              <TouchableOpacity
                style={[styles.confirmButton, isConfirmLoading && styles.disabledButton]}
                onPress={handleConfirm}
                disabled={isConfirmLoading}
              >
                {isConfirmLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.retakeButton} onPress={() => {
                setCapturedImage(null);
                setIsCameraOpen(true);
              }}>
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  visitActionButtonText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  camera: {
    flex: 1,
    width: width,
    height: height,
  },
  cameraButtonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 20,
  },
  captureButton: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  captureButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 50,
  },
  capturedImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  capturedImage: {
    width: width,
    height: height - 100,
    resizeMode: 'contain',
  },
  confirmButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    position: 'absolute',
    bottom: 20,
  },
  confirmButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  retakeButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retakeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 56,
    width: '100%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.85,
  },
  actionText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
    flexShrink: 1,
    lineHeight: 20,
  },
  connectivityContainer: {
    marginLeft: 'auto',
    paddingLeft: 8,
    flexShrink: 0,
    alignSelf: 'center',
  },
  disabledBtn: {
    backgroundColor: '#d3d3d3',
  },
});

export default CheckInImages;
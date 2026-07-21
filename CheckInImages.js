import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Icon from 'react-native-vector-icons/FontAwesome';
import { ConnectivityStatusIcons } from './components/ConnectivityStatus';

const { width, height } = Dimensions.get('window');

const CheckInImages = ({ visitId, authToken, onImageAdded, isDisabled }) => {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);

  useEffect(() => {
    if (isDisabled) {
      setCapturedImage(null);
    }
  }, [isDisabled]);

  const requestCameraPermission = async () => {
    try {
      let cameraPermission = permission;

      if (!cameraPermission?.granted) {
        cameraPermission = await requestPermission();
      }

      if (!cameraPermission?.granted) {
        const buttons = [];
        if (cameraPermission?.canAskAgain === false) {
          buttons.push({
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          });
        }
        buttons.push({ text: 'Cancel', style: 'cancel' });

        Alert.alert(
          'Camera Permission Required',
          'Camera permission is required to capture check-in images.',
          buttons
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Failed to request camera permission. Please try again.');
      return false;
    }
  };

  const handleAddImage = async () => {
    if (isDisabled || isOpeningCamera) {
      return;
    }

    setIsOpeningCamera(true);
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        return;
      }

      setIsCameraReady(false);
      setIsCameraOpen(true);
    } catch (error) {
      console.error('Error opening in-app camera:', error);
      Alert.alert(
        'Camera Error',
        'Unable to open the camera. Please check camera permission and try again.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'OK' },
        ]
      );
    } finally {
      setIsOpeningCamera(false);
    }
  };

  const closeCamera = () => {
    setIsCameraOpen(false);
    setIsCameraReady(false);
  };

  const handleCapture = async () => {
    if (!isCameraReady) {
      Alert.alert('Please wait', 'Camera is still preparing. Try again in a moment.');
      return;
    }

    if (!cameraRef.current) {
      Alert.alert('Camera Error', 'Camera is not ready. Please close and try again.');
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        Alert.alert('Camera Error', 'No image was captured. Please try again.');
        return;
      }

      setCapturedImage(photo.uri);
      closeCamera();
    } catch (error) {
      console.error('Error capturing check-in image:', error);
      Alert.alert('Camera Error', 'Failed to capture image. Please try again.');
    }
  };

  const uploadImage = async (imageUri) => {
    const maxRetries = 3;
    const retryDelayMs = 2000;
    let attempt = 0;

    const tryUpload = async () => {
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          name: 'image.jpg',
          type: 'image/jpeg',
        });

        await axios.put(
          `https://api.gajkesaristeels.in/visit/uploadFile?id=${visitId}&tag=check-in`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${authToken}`,
            },
            timeout: 30000,
          }
        );

        setCapturedImage(null);
        onImageAdded();
        return true;
      } catch (error) {
        console.error(`Upload attempt ${attempt + 1} failed:`, error);

        if ((error.message === 'Network Error' || error.code === 'ECONNABORTED') && attempt < maxRetries - 1) {
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          return tryUpload();
        }

        throw error;
      }
    };

    await tryUpload();
  };

  const handleConfirm = async () => {
    if (isConfirmLoading || !capturedImage) {
      return;
    }

    setIsConfirmLoading(true);
    try {
      await uploadImage(capturedImage);
    } catch (error) {
      console.error('Error uploading image:', error);
      if (error.message === 'Network Error') {
        Alert.alert(
          'Network Error',
          'Please check your internet connection and try again.',
          [
            { text: 'Retry', onPress: handleConfirm },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      }
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const handleRetake = async () => {
    if (isConfirmLoading) {
      return;
    }

    setCapturedImage(null);
    setIsCameraReady(false);
    setIsCameraOpen(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={[styles.actionBtn, (isDisabled || isOpeningCamera) && styles.disabledBtn]}
        onPress={handleAddImage}
        disabled={isDisabled || isOpeningCamera}
      >
        <View style={styles.buttonContent}>
          {isOpeningCamera ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Icon name="camera" size={24} color="#FFFFFF" />
          )}
          <Text style={styles.actionText}>
            {isOpeningCamera ? 'Opening Camera...' : 'Add Check-In Images'}
          </Text>
        </View>
        <View style={styles.connectivityContainer}>
          <ConnectivityStatusIcons />
        </View>
      </TouchableOpacity>

      {isCameraOpen && (
        <Modal
          visible
          animationType="slide"
          transparent={false}
          statusBarTranslucent
          onRequestClose={closeCamera}
        >
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              onCameraReady={() => setIsCameraReady(true)}
              onMountError={(error) => {
                console.error('Check-in camera mount error:', error?.nativeEvent || error);
                closeCamera();
                Alert.alert(
                  'Camera Error',
                  'Unable to initialize the camera. Please check camera permission and try again.',
                  [
                    { text: 'Open Settings', onPress: () => Linking.openSettings() },
                    { text: 'OK' },
                  ]
                );
              }}
            />

            <View style={styles.cameraTopBar}>
              <TouchableOpacity style={styles.cameraCloseButton} onPress={closeCamera}>
                <Icon name="times" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {!isCameraReady && (
              <View style={styles.cameraLoading}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.cameraLoadingText}>Preparing camera...</Text>
              </View>
            )}

            <View style={styles.cameraBottomBar}>
              <TouchableOpacity
                style={[styles.shutterButton, !isCameraReady && styles.disabledButton]}
                onPress={handleCapture}
                disabled={!isCameraReady}
              >
                <View style={styles.shutterInner} />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {capturedImage && (
        <Modal visible animationType="slide" transparent={false}>
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
              <TouchableOpacity
                style={[styles.retakeButton, isConfirmLoading && styles.disabledButton]}
                onPress={handleRetake}
                disabled={isConfirmLoading}
              >
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
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraTopBar: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cameraCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  cameraLoadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  cameraBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 36,
    alignItems: 'center',
  },
  shutterButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  capturedImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  capturedImage: {
    width,
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

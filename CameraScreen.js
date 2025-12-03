import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import axios from 'axios';

const CameraScreen = ({ navigation, route }) => {
  const { visitId, authToken } = route.params;
  const [capturedImage, setCapturedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const cameraRef = useRef(null);

  const handleCapture = async () => {
    if (cameraRef.current) {
      const options = { quality: 0.5, base64: true };
      const data = await cameraRef.current.takePictureAsync(options);
      setCapturedImage(data.uri);
    }
  };

  const uploadImage = async (imageUri) => {
    if (isUploading) return;
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: 'image.jpg',
        type: 'image/jpeg',
      });

      const response = await axios.put(
        `https://api.gajkesaristeels.in/visit/uploadFile?id=${visitId}&tag=check-in`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      console.log('Visit ID:', response.data);
      showSuccessMessage();
      navigation.goBack();
    } catch (error) {
      console.error('Error uploading image:', error);
      showFailureMessage();
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = () => {
    if (capturedImage && !isUploading) {
      uploadImage(capturedImage);
    }
  };

  const showSuccessMessage = () => {
    Alert.alert(
      'Success',
      'Image uploaded successfully',
      [{ text: 'OK', onPress: () => console.log('OK Pressed') }],
      { cancelable: false }
    );
  };

  const showFailureMessage = () => {
    Alert.alert(
      'Error',
      'Failed to upload image',
      [{ text: 'OK', onPress: () => console.log('OK Pressed') }],
      { cancelable: false }
    );
  };

  return (
    <View style={styles.container}>
      {capturedImage ? (
        <View style={styles.capturedImageContainer}>
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, isUploading && styles.buttonDisabled]} 
              onPress={handleConfirm}
              disabled={isUploading || !capturedImage}
            >
              {isUploading ? (
                <Text style={styles.buttonText}>Uploading...</Text>
              ) : (
                <Text style={styles.buttonText}>Confirm & Upload</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => setCapturedImage(null)}
              disabled={isUploading}
            >
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Camera ref={cameraRef} style={styles.camera} type={Camera.Constants.Type.back}>
          <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
            <Text style={styles.captureButtonText}>Capture</Text>
          </TouchableOpacity>
        </Camera>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  captureButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  captureButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  capturedImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturedImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    margin: 8,
    minWidth: 100,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CameraScreen;
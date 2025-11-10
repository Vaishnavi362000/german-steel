import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import { format, isToday, isYesterday } from 'date-fns';

const Complaints = ({ visitId, authToken, onComplaintAdded, readOnly }) => {
  const [complaints, setComplaints] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const MAX_IMAGES = 5;

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const response = await axios.get(`https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/getByVisit?type=complaint&visitId=${visitId}`, {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });

      console.log('🛰️ [COMPLAINTS] Response:', response.data);
      try {
        console.log('🛰️ [COMPLAINTS] Response JSON:', JSON.stringify(response.data, null, 2));
      } catch (e) {}
      
      // Check if response is HTML instead of JSON
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [COMPLAINTS] Server returned HTML instead of JSON');
        setComplaints([]);
        return;
      }
      
      const filteredComplaints = Array.isArray(response.data)
        ? response.data.filter(task => task && task.taskType === 'complaint')
        : [];
      setComplaints(filteredComplaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setComplaints([]);
    }
  };

  const handleAddComplaint = async () => {
    if (!title.trim()) {
      Alert.alert('Incomplete Form', 'Please fill in the title field.');
      return;
    }

    try {
      const newComplaint = {
        taskTitle: title.trim(),
        taskDesciption: description.trim(),
        taskType: 'complaint',
        status: 'Assigned',
        visitId: visitId
      };
      const response = await axios.post('https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/create', newComplaint, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.data) {
        const taskId = response.data;
        await Promise.all(images.map((imageUri, index) => uploadImage(taskId, imageUri, index)));
        setTitle('');
        setDescription('');
        setImages([]);
        fetchComplaints();
        if (onComplaintAdded) {
          onComplaintAdded();
        }
      } else {
        throw new Error('No data received from server');
      }
    } catch (error) {
      console.error('Error creating complaint:', error);
      Alert.alert('Error', 'Failed to add complaint. Please try again.');
    }
  };

  const uploadImage = async (taskId, imageUri, index = 0) => {
    try {
      const formData = new FormData();
      const uriPath = typeof imageUri === 'string' ? imageUri : '';
      const originalName = uriPath.split('/').pop() || 'image.jpg';
      const extMatch = originalName.includes('.') ? originalName.split('.').pop().toLowerCase() : 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(extMatch) ? extMatch : 'jpg';
      const mimeType = safeExt === 'png' ? 'image/png' : (safeExt === 'webp' ? 'image/webp' : 'image/jpeg');
      const uniqueName = `${taskId}_${Date.now()}_${index}.${safeExt}`;

      formData.append('file', {
        uri: imageUri,
        name: uniqueName,
        type: mimeType,
      });

      await axios.put(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/uploadFile?id=${taskId}&tag=check-in`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${authToken}`,
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. The complaint was created without the image.');
    }
  };

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_IMAGES} images.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // use full image without crop
      quality: 1,
      exif: true,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const takeImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_IMAGES} images.`);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // use full image without crop
      quality: 1,
      exif: true,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);

    if (isToday(date)) {
      return 'today';
    } else if (isYesterday(date)) {
      return 'yesterday';
    } else {
      // Format as "8 Nov '25"
      return format(date, "d MMM ''yy");
    }
  };

  const normalizeImageUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    return url.trim();
  };

  const ComplaintImage = ({ uri, onLoadSuccess, onLoadError }) => {
    const [loaded, setLoaded] = useState(false);
    const [errored, setErrored] = useState(false);
    const [localUri, setLocalUri] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    if (!uri || errored) return null;

    useEffect(() => {
      let cancelled = false;
      const httpsUrl = uri.startsWith('http://') ? 'https://' + uri.slice('http://'.length) : uri;
      const httpUrl = uri.startsWith('https://') ? 'http://' + uri.slice('https://'.length) : uri;

      const tryDownload = async (tryUri) => {
        const target = `${FileSystem.cacheDirectory}complaints_${Date.now()}_${Math.random().toString(36).slice(2)}.img`;
        try {
          console.log('[COMPLAINTS] Attempting to download:', tryUri);
          const res = await FileSystem.downloadAsync(tryUri, target, {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'ngrok-skip-browser-warning': 'true',
              'User-Agent': 'IconMobile',
            },
          });
          console.log('[COMPLAINTS] Download response:', res.status, res.uri);
          if (!cancelled && res && res.status === 200 && res.uri) {
            setLocalUri(res.uri);
            setIsLoading(false);
            console.log('[COMPLAINTS] ✅ Successfully downloaded to:', res.uri);
            return true;
          }
        } catch (e) {
          console.log('[COMPLAINTS] ❌ download failed for', tryUri, e?.message || e);
        }
        return false;
      };

      (async () => {
        // For ngrok URLs, try HTTP first (since ngrok uses HTTP by default)
        // For other URLs, try HTTPS first
        const isNgrok = uri.includes('ngrok');
        const firstUrl = isNgrok ? httpUrl : httpsUrl;
        const secondUrl = isNgrok ? httpsUrl : httpUrl;
        
        const okFirst = await tryDownload(firstUrl);
        if (cancelled) return;
        if (!okFirst) {
          const okSecond = await tryDownload(secondUrl);
          if (!okSecond && !cancelled) {
            console.log('[COMPLAINTS] ❌ Failed to load image from both protocols:', uri);
            setIsLoading(false);
            setErrored(true);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [uri, authToken]);

    if (isLoading && !localUri) {
      return (
        <View style={styles.complaintImagePlaceholder}>
          <Text style={styles.placeholderText}>Loading...</Text>
        </View>
      );
    }

    if (!localUri) {
      return null;
    }

    return (
      <ExpoImage
        source={{ uri: localUri }}
        style={styles.complaintImage}
        onLoad={() => {
          setLoaded(true);
          console.log('[COMPLAINTS] ✅ Image loaded successfully in UI');
          onLoadSuccess && onLoadSuccess();
        }}
        onError={(error) => {
          setErrored(true);
          console.log('[COMPLAINTS] ❌ Image load error for', uri, error?.nativeEvent?.error);
          onLoadError && onLoadError();
        }}
      />
    );
  };

  const ComplaintImages = ({ attachments }) => {
    const [loadedCount, setLoadedCount] = useState(0);
    const uris = Array.isArray(attachments)
      ? attachments.map((att) => normalizeImageUrl(att?.fileDownloadUri)).filter(Boolean)
      : [];
    if (uris.length === 0) return null;
    return (
      <View style={[styles.imageList, loadedCount === 0 && styles.imageListNoMargin]}>
        {uris.map((uri, idx) => (
          <ComplaintImage
            key={`${uri}-${idx}`}
            uri={uri}
            onLoadSuccess={() => setLoadedCount((c) => c + 1)}
            onLoadError={() => {}}
          />
        ))}
      </View>
    );
  };

  const renderComplaintItem = ({ item }) => {
    if (Array.isArray(item?.attachmentResponse)) {
      try {
        const uris = item.attachmentResponse.map(att => att?.fileDownloadUri).filter(Boolean);
        console.log(`[COMPLAINTS] attachment URIs for ${item?.id}:`, uris);
      } catch (e) {}
    }

    return (
      <View style={styles.complaintItem}>
        <Text style={styles.complaintTitle}>{item.taskTitle}</Text>
        <Text style={styles.complaintDescription}>{item.taskDesciption}</Text>
        <Text style={styles.complaintDate}>Added: {formatDate(item.createdAt)}</Text>
        <ComplaintImages attachments={item.attachmentResponse} />
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Complaints</Text>
      {!readOnly && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <View style={styles.imageButtonsContainer}>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Text style={styles.imageButtonText}>
                {images.length < MAX_IMAGES ? 'Add Image' : 'Max Images Added'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={takeImage}>
              <Text style={styles.imageButtonText}>
                {images.length < MAX_IMAGES ? 'Take Image' : 'Max Images Added'}
              </Text>
            </TouchableOpacity>
          </View>
          {images.length >= MAX_IMAGES && (
            <Text style={styles.maxImagesNote}>You have added the maximum of {MAX_IMAGES} images.</Text>
          )}
          <View style={styles.imagePreviewContainer}>
            {images.map((img, index) => (
              <View key={index} style={styles.imageWrapper}>
                <ExpoImage source={{ uri: img }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Text style={styles.removeImageButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.button} onPress={handleAddComplaint}>
            <Text style={styles.buttonText}>Add Complaint</Text>
          </TouchableOpacity>
        </>
      )}
      {complaints.length === 0 ? (
        <Text style={styles.emptyText}>No complaints added yet</Text>
      ) : (
        <View>
          {complaints.map((item) => (
            <View key={item.id.toString()}>{renderComplaintItem({ item })}</View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  imageButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  imageButtonText: {
    color: '#4F46E5',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  previewImage: {
    width: 80,
    height: 80,
    resizeMode: 'cover',
    borderRadius: 5,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ff0000',
    padding: 5,
    borderRadius: 5,
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  complaintItem: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  complaintTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
    color: '#333',
  },
  complaintDescription: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  complaintDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  complaintImage: {
    width: 80,
    height: 80,
    resizeMode: 'cover',
    marginTop: 5,
    marginRight: 5,
    marginBottom: 5,
    borderRadius: 5,
  },
  imageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  imageListNoMargin: {
    marginTop: 0,
  },
  hiddenImage: {
    width: 0,
    height: 0,
  },
  complaintImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginTop: 5,
    marginRight: 5,
    marginBottom: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 10,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#888',
    paddingBottom: 20,
  },
});

export default Complaints;

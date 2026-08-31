import { API_BASE_URL } from './config/api';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, TextInput, Alert, FlatList, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const ExpenseTracker = () => {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isMonthSheetOpen, setIsMonthSheetOpen] = useState(false);
  const [isYearSheetOpen, setIsYearSheetOpen] = useState(false);
  const [isExpenseTypeSheetOpen, setIsExpenseTypeSheetOpen] = useState(false);
  const [isTravelSubTypeSheetOpen, setIsTravelSubTypeSheetOpen] = useState(false);
  const [expenseType, setExpenseType] = useState('');
  const [travelSubType, setTravelSubType] = useState('car');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [authToken, setAuthToken] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageCache, setImageCache] = useState({});
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear().toString();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const years = Array.from({ length: Math.max(2026, Number(currentYear)) - 2026 + 6 }, (_, index) => String(2026 + index));
  const expenseTypes = ['food', 'travel', 'accommodation', 'other'];
  const travelSubTypes = ['car', 'bike'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const id = await AsyncStorage.getItem('employeeId');
        setAuthToken(token);
        setEmployeeId(id);
        if (token && id) {
          fetchExpenses(token, id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    filterExpenses(expenses, selectedMonth, selectedYear);
  }, [expenses, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!authToken || !employeeId || !isFocused) return;
    fetchExpenses(authToken, employeeId);
    const timer = setInterval(() => fetchExpenses(authToken, employeeId), 15000);
    return () => clearInterval(timer);
  }, [authToken, employeeId, isFocused]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const fetchExpenses = async (token, id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/expense/getById?id=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = response.data;
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const filterExpenses = (expenses, month, year) => {
    const filtered = expenses.filter((expense) => {
      const expenseDate = new Date(expense.expenseDate);
      return expenseDate.getMonth() === months.indexOf(month) && expenseDate.getFullYear() === parseInt(year);
    });
    setFilteredExpenses(filtered);
  };

  const handleAddExpense = () => {
    setFormError('');
    setIsBottomSheetOpen(true);
  };

  const handleCloseBottomSheet = () => {
    setIsBottomSheetOpen(false);
    setExpenseType('');
    setAmount('');
    setDescription('');
    setSelectedImage(null);
  };

  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    setIsMonthSheetOpen(false);
  };

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setIsYearSheetOpen(false);
  };

  const handleExpenseTypeSelect = (type) => {
    setExpenseType(type);
    setIsExpenseTypeSheetOpen(false);
    if (type === 'travel') {
      setIsTravelSubTypeSheetOpen(true);
    }
  };

  const handleTravelSubTypeSelect = (subType) => {
    setTravelSubType(subType);
    setIsTravelSubTypeSheetOpen(false);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Photo library permission is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takeImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking image:', error);
      Alert.alert('Error', 'Failed to take image');
    }
  };

  const uploadExpenseImage = async (expenseId, imageUri) => {
    try {
      console.log('=== Starting Image Upload ===');
      console.log('Expense ID:', expenseId);
      console.log('Image URI:', imageUri);

      const formData = new FormData();
      const fileName = imageUri.split('/').pop() || 'expense.jpg';
      const fileType = imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: fileName,
        type: fileType,
      });

      const uploadUrl = `${API_BASE_URL}/expense/uploadFile?id=${expenseId}&tag=expense`;

      console.log('Upload Image PUT Call - URL:', uploadUrl);
      console.log('Upload Image PUT Call - Payload:', {
        expenseId,
        fileName,
        fileType,
        tag: 'expense',
      });

      const response = await axios.put(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${authToken}`,
        },
      });

      console.log('Upload Image PUT Call - Response Status:', response.status);
      console.log('Upload Image PUT Call - Response Data:', JSON.stringify(response.data, null, 2));
      console.log('=== Image Upload Completed ===');

      return response.data;
    } catch (error) {
      console.error('=== Image Upload Failed ===');
      console.error('Error uploading expense image:', error);
      console.log('Upload Error Response Status:', error.response?.status);
      console.log('Upload Error Response Data:', JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  };

  const handleSubmitExpense = async () => {
    if (isUploading) return;
    setFormError('');
    if (!expenseType) {
      setFormError('Select an expense type.');
      return;
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setFormError('Enter an amount greater than zero.');
      return;
    }
    if (!description.trim()) {
      setFormError('Add a description of the expense.');
      return;
    }
    try {
      setIsUploading(true);
      const newExpense = {
        type: expenseType,
        subType: expenseType === 'travel' ? travelSubType : null,
        amount: Number(amount),
        description: description.trim(),
        employeeId, // Use the employeeId state value
        expenseDate: format(new Date(), 'yyyy-MM-dd'),
      };

      console.log('Create Expense Payload:', JSON.stringify(newExpense, null, 2));

      const response = await axios.post(`${API_BASE_URL}/expense/create`, newExpense, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      console.log('Create Expense Response:', JSON.stringify(response.data, null, 2));

      // Handle both cases: response.data as number or as object with id
      let expenseId = null;
      if (typeof response.data === 'number') {
        expenseId = response.data;
      } else if (response.data && response.data.id) {
        expenseId = response.data.id;
      }

      if (expenseId) {
        console.log('Expense ID extracted:', expenseId);

        // Upload image if one is selected
        if (selectedImage) {
          console.log('Image selected, starting upload...');
          try {
            const uploadResponse = await uploadExpenseImage(expenseId, selectedImage);
            console.log('Image upload completed successfully:', JSON.stringify(uploadResponse, null, 2));
          } catch (uploadError) {
            console.error('Error uploading image:', uploadError);
            console.log('Upload Error Details:', {
              message: uploadError.message,
              response: uploadError.response?.data,
              status: uploadError.response?.status,
            });
            Alert.alert('Warning', 'Expense created but image upload failed.');
          }
        } else {
          console.log('No image selected, skipping upload');
        }

        // Close bottom sheet and reset form
        handleCloseBottomSheet();
        setNotice('Expense submitted. Pending approval.');
        fetchExpenses(authToken, employeeId); // Fetch updated expenses after adding a new one
      } else {
        console.error('Failed to extract expense ID from response:', response.data);
        setFormError('The response could not be confirmed. Check your expense list before trying again.');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      console.log('Create Expense Error Response:', error.response?.data);
      setFormError('Unable to submit expense. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const goBack = () => {
    navigation.goBack();
  };

  const renderBottomSheet = (data, onSelect, isVisible, onClose, title) => (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetHeaderText}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6C63FF" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.bottomSheetItem} onPress={() => onSelect(item)}>
                <Text style={styles.bottomSheetItemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {notice ? <Text accessibilityRole="alert" style={{ padding: 12, backgroundColor: '#ECFDF5', color: '#065F46' }}>{notice}</Text> : null}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#6C63FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.filtersContainer}>
          <View style={styles.filters}>
            <TouchableOpacity style={styles.monthFilter} onPress={() => setIsMonthSheetOpen(true)}>
              <Ionicons name="calendar-outline" size={20} color="#6C63FF" />
              <Text style={styles.filterText}>{selectedMonth}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.yearFilter} onPress={() => setIsYearSheetOpen(true)}>
              <Ionicons name="calendar" size={20} color="#6C63FF" />
              <Text style={styles.filterText}>{selectedYear}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.addExpenseButton} onPress={handleAddExpense}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addExpenseButtonText}>Add Expense</Text>
        </TouchableOpacity>
        <ScrollView style={styles.expenseList} contentContainerStyle={styles.expenseListContent}>
          {filteredExpenses.map((expense) => (
            <View key={expense.id} style={styles.expenseCard}>
              <View style={styles.cardHeader}>
                <View style={styles.dateTime}>
                  <Text style={styles.date}>{expense.expenseDate}</Text>
                </View>
                <View style={styles.expenseType}>
                  <Ionicons
                    name={
                      expense.type === 'food'
                        ? 'fast-food-outline'
                        : expense.type === 'travel'
                          ? 'airplane-outline'
                          : expense.type === 'accommodation'
                            ? 'bed-outline'
                            : 'cash-outline'
                    }
                    size={20}
                    color="#6C63FF"
                  />
                  <Text style={styles.expenseTypeText}>{expense.type}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.amountContainer}>
                  <Text style={styles.amount}>₹{expense.amount}</Text>
                  <View style={styles.status}>
                    <Text
                      style={[
                        styles.statusLabel,
                        expense.approvalStatus?.toUpperCase() === 'APPROVED'
                          ? styles.approvedStatus
                          : expense.approvalStatus?.toUpperCase() === 'PENDING'
                            ? styles.pendingStatus
                            : styles.rejectedStatus,
                      ]}
                    >
                      {expense.approvalStatus?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.description}>
                  <Ionicons name="chatbubble-outline" size={20} color="#6C63FF" />
                  <Text style={styles.descriptionText}>{expense.description}</Text>
                </View>
                {expense.attachmentResponse && expense.attachmentResponse.length > 0 && (
                  <View style={styles.attachmentContainer}>
                    <Text style={styles.attachmentLabel}>Attachments:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentScroll}>
                      {expense.attachmentResponse.map((attachment, index) => (
                        <ExpenseImage
                          key={index}
                          expenseId={expense.id}
                          fileName={attachment.fileName}
                          authToken={authToken}
                          onPress={() => {
                            console.log('Viewing attachment - GET call:', {
                              expenseId: expense.id,
                              fileName: attachment.fileName,
                            });
                          }}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          ))}
          {filteredExpenses.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={30} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No expenses for this month</Text>
            </View>
          )}
        </ScrollView>
      </View>
      <Modal
        visible={isBottomSheetOpen}
        animationType="slide"
        onRequestClose={handleCloseBottomSheet}
        transparent={true}
      >
        <View style={styles.modalBackground}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetHeaderText}>Add Expense</Text>
              <TouchableOpacity onPress={handleCloseBottomSheet}>
                <Ionicons name="close" size={24} color="#6C63FF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled">
              {formError ? <Text accessibilityRole="alert" style={{ color: '#BE123C', marginBottom: 12 }}>{formError}</Text> : null}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Expense Type</Text>
                <TouchableOpacity
                  style={styles.expenseTypeSelect}
                  onPress={() => setIsExpenseTypeSheetOpen(true)}
                >
                  <Text style={[styles.input, !expenseType && { color: '#9CA3AF' }]}>
                    {expenseType || 'Select Expense Type'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6C63FF" />
                </TouchableOpacity>
              </View>
              {expenseType === 'travel' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Travel Subtype</Text>
                  <TouchableOpacity
                    style={styles.expenseTypeSelect}
                    onPress={() => setIsTravelSubTypeSheetOpen(true)}
                  >
                    <Text style={styles.input}>{travelSubType}</Text>
                    <Ionicons name="chevron-down" size={20} color="#6C63FF" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Amount</Text>
                <View style={styles.amountInput}>
                  <Text style={styles.currency}>₹</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.descriptionInput]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  placeholder="Enter description"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Attachment</Text>
                {selectedImage ? (
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setSelectedImage(null)}
                    >
                      <Ionicons name="close-circle" size={24} color="#D32F2F" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imageButtonsContainer}>
                    <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                      <Ionicons name="image-outline" size={20} color="#6C63FF" />
                      <Text style={styles.imageButtonText}>Choose from Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imageButton} onPress={takeImage}>
                      <Ionicons name="camera-outline" size={20} color="#6C63FF" />
                      <Text style={styles.imageButtonText}>Take Photo</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.submitButton, isUploading && styles.submitButtonDisabled]}
              onPress={handleSubmitExpense}
              disabled={isUploading}
            >
              <Text style={styles.submitButtonText}>
                {isUploading ? 'Uploading...' : 'Add Expense'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {renderBottomSheet(months, handleMonthSelect, isMonthSheetOpen, () => setIsMonthSheetOpen(false), 'Select Month')}
      {renderBottomSheet(years, handleYearSelect, isYearSheetOpen, () => setIsYearSheetOpen(false), 'Select Year')}
      {renderBottomSheet(expenseTypes, handleExpenseTypeSelect, isExpenseTypeSheetOpen, () => setIsExpenseTypeSheetOpen(false), 'Select Expense Type')}
      {renderBottomSheet(travelSubTypes, handleTravelSubTypeSelect, isTravelSubTypeSheetOpen, () => setIsTravelSubTypeSheetOpen(false), 'Select Travel Subtype')}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9EAF0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  filtersContainer: {
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  monthFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  yearFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  addExpenseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  addExpenseButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  expenseList: {
    flex: 1,
  },
  expenseListContent: {
    paddingBottom: 24,
  },
  expenseCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  time: {
    fontSize: 14,
    color: '#666',
  },
  expenseType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseTypeText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  cardBody: {
    marginTop: 16,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  status: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  approvedStatus: {
    color: '#2E7D32',
  },
  pendingStatus: {
    color: '#FF8F00',
  },
  rejectedStatus: {
    color: '#D32F2F',
  },
  description: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    backgroundColor: '#FFFFFF',
  },
  sheetHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  sheetBody: {
    padding: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  expenseTypeSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f2f2f2',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currency: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20, // Ensure there is space at the bottom
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    alignItems: 'center',
  },
  bottomSheetItemText: {
    fontSize: 18,
  },
  imageContainer: {
    position: 'relative',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  imageButtonText: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '500',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  attachmentContainer: {
    marginTop: 12,
  },
  attachmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  attachmentScroll: {
    flexDirection: 'row',
  },
  attachmentImageWrapper: {
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  attachmentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  imageLoadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  imageErrorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
  },
  emptyStateText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});

// Component to handle authenticated image loading
const ExpenseImage = ({ expenseId, fileName, authToken, onPress }) => {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const imageUrl = `${API_BASE_URL}/expense/downloadFile/${expenseId}/expense/${fileName}`;

        console.log('Fetching expense image - GET call:', {
          expenseId,
          fileName,
          imageUrl,
        });

        // Download image to local file system with auth headers
        const downloadResult = await FileSystem.downloadAsync(
          imageUrl,
          FileSystem.cacheDirectory + `expense_${expenseId}_${fileName}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        console.log('Expense image GET call - Response Status:', downloadResult.status);
        console.log('Expense image GET call - Local URI:', downloadResult.uri);
        console.log('Expense image GET call - Response Data:', JSON.stringify({
          status: downloadResult.status,
          uri: downloadResult.uri,
          headers: downloadResult.headers,
        }, null, 2));

        if (downloadResult.status === 200) {
          setImageUri(downloadResult.uri);
          setError(false);
        } else {
          console.error('Failed to download image, status:', downloadResult.status);
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching expense image:', err);
        console.log('Image GET Error:', {
          message: err.message,
          code: err.code,
        });
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (expenseId && fileName && authToken) {
      loadImage();
    }
  }, [expenseId, fileName, authToken]);

  if (loading) {
    return (
      <View style={[styles.attachmentImageWrapper, styles.imageLoadingContainer]}>
        <ActivityIndicator size="small" color="#6C63FF" />
      </View>
    );
  }

  if (error || !imageUri) {
    return (
      <View style={[styles.attachmentImageWrapper, styles.imageErrorContainer]}>
        <Ionicons name="image-outline" size={24} color="#999" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.attachmentImageWrapper}
      onPress={onPress}
    >
      <Image
        source={{ uri: imageUri }}
        style={styles.attachmentImage}
        resizeMode="cover"
        onLoad={() => {
          console.log('Image loaded successfully:', imageUri);
        }}
        onError={(err) => {
          console.error('Error displaying image:', err);
        }}
      />
    </TouchableOpacity>
  );
};

export default ExpenseTracker;

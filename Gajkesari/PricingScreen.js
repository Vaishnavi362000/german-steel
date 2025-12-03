import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, TextInput, 
  StyleSheet, Alert, ScrollView, ActivityIndicator, Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';

const DateRangeSelector = ({ dateRange, onDateRangeChange }) => {
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [tempDate, setTempDate] = useState(dateRange?.start);
  const today = new Date().toISOString().split('T')[0];

  const applyDate = () => {
    const d = tempDate || today;
    onDateRangeChange?.({ start: d, end: d });
    setCalendarVisible(false);
  };

  const formatted = new Date(dateRange.start).toLocaleDateString();

  return (
    <View style={styles.dateRangeSelectorContainer}>
      <TouchableOpacity style={styles.dateRangeButton} onPress={() => setCalendarVisible(true)}>
        <Ionicons name="calendar-outline" size={24} color="#6C63FF" />
        <Text style={styles.dateRangeText}>{formatted}</Text>
      </TouchableOpacity>

      <Modal visible={isCalendarVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.calendarContainer}>
            <Calendar
              current={tempDate || today}
              maxDate={today}
              onDayPress={(day) => setTempDate(day.dateString)}
              markedDates={{
                [(tempDate || today)]: { selected: true, selectedColor: '#6C63FF' },
              }}
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setCalendarVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.applyButton]} onPress={applyDate}>
                <Text style={styles.buttonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const PricingScreen = ({ authToken }) => {
  const navigation = useNavigation();
  const [pricingData, setPricingData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ 
    start: new Date().toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [price, setPrice] = useState('');
  const [brandNameError, setBrandNameError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState('main');
  const [otherBrand, setOtherBrand] = useState('');

  const brands = [
    'Gajkesari', 'SRJ', 'Metaroll', 'Rajuri', 'Kalika', 'Polaad', 
    'Uma', 'Shakti gold', 'GSPL', 'Roopam', 'Others'
  ];

  useEffect(() => {
    fetchPricingData();
  }, [dateRange]);

  // When modal opens, show brand selection if no brand is selected
  useEffect(() => {
    if (isBottomSheetOpen && !brandName) {
      setView('selectBrand');
    } else if (isBottomSheetOpen && brandName) {
      setView('main');
    }
  }, [isBottomSheetOpen]);

  const fetchPricingData = async () => {
    setIsLoading(true);
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      
      if (!authToken) {
        console.error('Auth token not found');
        setPricingData([]);
        return;
      }
      
      const response = await axios.get(
        `https://api.gajkesaristeels.in/brand/getByDateRangeForEmployee?start=${dateRange.start}&end=${dateRange.end}&id=${employeeId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      
      // Check if response is HTML instead of JSON
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [PRICING] Server returned HTML instead of JSON');
        setPricingData([]);
        return;
      }
      
      setPricingData(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching pricing data:', error);
      setPricingData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const handleSubmitPricing = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const response = await axios.post(
        'https://api.gajkesaristeels.in/brand/create',
        {
          brandName: brandName.trim(),
          price: parseFloat(price),
          employeeDto: { id: employeeId },
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      // Check if response is HTML instead of JSON
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [PRICING] Server returned HTML instead of JSON');
        Alert.alert('Error', 'Authentication issue. Please try logging in again.');
        return;
      }

      if (response.data) {
        setBrandName('');
        setPrice('');
        setIsBottomSheetOpen(false);
        fetchPricingData();
      }
    } catch (error) {
      console.error('Error adding pricing:', error);
      Alert.alert('Error', 'Failed to add pricing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    let isValid = true;
    
    if (!brandName.trim()) {
      setBrandNameError('Brand name is required');
      isValid = false;
    } else {
      setBrandNameError('');
    }

    if (!price.trim()) {
      setPriceError('Price is required');
      isValid = false;
    } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setPriceError('Please enter a valid price');
      isValid = false;
    } else {
      setPriceError('');
    }

    // Prevent adding price for the same brand twice on the same day
    // We only allow a single entry per brand per selected date (dateRange.start)
    const normalizedNewBrand = brandName.trim().toLowerCase();
    const hasDuplicateForDay = Array.isArray(pricingData)
      ? pricingData.some(
          (item) =>
            item?.brandName &&
            item.brandName.toLowerCase() === normalizedNewBrand
        )
      : false;

    if (hasDuplicateForDay) {
      setBrandNameError('You have already added a price for this brand today');
      Alert.alert(
        'Duplicate entry',
        'You have already added a price for this brand for the selected date.'
      );
      isValid = false;
    }

    return isValid;
  };

  const renderPricingItem = ({ item }) => (
    <View style={styles.pricingItem}>
      <Text style={styles.brandName}>{item.brandName}</Text>
      <Text style={styles.price}>₹{item.price} per ton</Text>
    </View>
  );

  const renderInputField = (label, value, setValue, error, placeholder, keyboardType = 'default') => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        keyboardType={keyboardType}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  const handleSelectBrand = (brand) => {
    if (brand === 'Others') {
      setView('addOtherBrand');
    } else {
      setBrandName(brand);
      setBrandNameError('');
      setView('main');
    }
  };

  const handleAddOtherBrand = () => {
    if (otherBrand.trim()) {
      setBrandName(otherBrand.trim());
      setBrandNameError('');
      setOtherBrand('');
      setView('main');
    } else {
      Alert.alert('Error', 'Please enter a brand name');
    }
  };

  const handleCloseModal = () => {
    setIsBottomSheetOpen(false);
    // Reset form fields when closing modal
    setBrandName('');
    setPrice('');
    setBrandNameError('');
    setPriceError('');
    setOtherBrand('');
    setView('selectBrand');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonHeader} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Pricing</Text>
      </View>
      <DateRangeSelector
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />
      {isLoading ? (
        <ActivityIndicator size="large" color="#6C63FF" />
      ) : (
        <FlatList
          data={pricingData}
          renderItem={renderPricingItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>No pricing data available</Text>}
          contentContainerStyle={styles.listContent}
        />
      )}
      {(() => {
        const today = new Date().toISOString().split('T')[0];
        const isTodaySelected = dateRange.start === today;
        if (!isTodaySelected) {
          return (
            null
          );
        }
        return (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsBottomSheetOpen(true)}
          >
            <Ionicons name="add" size={24} color="white" />
            <Text style={styles.addButtonText}>Add Pricing</Text>
          </TouchableOpacity>
        );
      })()}

      <Modal
        visible={isBottomSheetOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalBackground}>
          <View style={styles.bottomSheet}>
            {view === 'main' && (
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetHeaderText}>Add Pricing</Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
            )}
            <ScrollView style={styles.sheetBody}>
              {view === 'main' && (
                <>
                  <TouchableOpacity
                    style={styles.brandSelector}
                    onPress={() => setView('selectBrand')}
                  >
                    <Text style={styles.brandSelectorText}>{brandName || 'Select Brand'}</Text>
                    <Ionicons name="chevron-forward" size={24} color="#6C63FF" />
                  </TouchableOpacity>
                  {renderInputField('Price per ton', price, setPrice, priceError, 'Enter price', 'numeric')}
                </>
              )}
              {view === 'selectBrand' && (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={{ width: 24 }} />
                    <Text style={styles.sectionTitle}>Select Brand</Text>
                    <TouchableOpacity onPress={handleCloseModal}>
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>
                  {brands.map((brand) => (
                    <TouchableOpacity
                      key={brand}
                      style={styles.brandOption}
                      onPress={() => handleSelectBrand(brand)}
                    >
                      <Text style={styles.brandOptionText}>{brand}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {view === 'addOtherBrand' && (
                <>
                  <View style={styles.sectionHeader}>
                    <TouchableOpacity 
                      onPress={() => {
                        setOtherBrand('');
                        setView('selectBrand');
                      }} 
                      style={styles.backButton}
                    >
                      <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.sectionTitle}>Add Other Brand</Text>
                    <TouchableOpacity onPress={handleCloseModal}>
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>
                  {renderInputField('Brand Name', otherBrand, setOtherBrand, '', 'Enter brand name')}
                  <TouchableOpacity style={styles.submitButton} onPress={handleAddOtherBrand}>
                    <Text style={styles.submitButtonText}>Add Brand</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
            {view === 'main' && (
              <TouchableOpacity 
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmitPricing}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Pricing</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButtonHeader: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  dateRangeSelectorContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dateRangeText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  pricingItem: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  brandName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 16,
    color: '#6C63FF',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: 'gray',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  addButton: {
    backgroundColor: '#6C63FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    marginLeft: 10,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetHeaderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sheetBody: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
  },
  inputError: {
    borderColor: 'red',
    borderWidth: 1,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#6C63FF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A5A5A5',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  brandSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  brandSelectorText: {
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 4,
  },
  brandOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  brandOptionText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '90%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f2f2f2',
  },
  applyButton: {
    backgroundColor: '#6C63FF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default PricingScreen;
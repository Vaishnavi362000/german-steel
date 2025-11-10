import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DatePicker from './DatePicker';

const AddFollowUp = ({ customerDetails, authToken, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isPickerVisible, setPickerVisible] = useState(false);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const createFollowUpVisit = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      await axios.put('https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/create', {
        storeId: customerDetails.storeId,
        employeeId: employeeId,
        visit_date: formattedDate,
        purpose: 'Follow Up',
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      onClose();
    } catch (error) {
      console.error('Error creating follow-up visit:', error);
      Alert.alert('Error', 'Failed to create follow-up visit. Please try again.');
    }
  };

  return (
    <Modal visible={true} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Create Follow-Up Visit</Text>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.label}>Store Name</Text>
          <Text style={styles.storeNameText}>{customerDetails.storeName}</Text>
          <Text style={styles.label}>Visit Date</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setPickerVisible(true)}>
            <Text style={styles.dateButtonText}>{format(selectedDate, 'MMMM d, yyyy')}</Text>
          </TouchableOpacity>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.createButton]} onPress={createFollowUpVisit}>
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <DatePicker isVisible={isPickerVisible} onClose={() => setPickerVisible(false)} onSelect={handleDateChange} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  storeNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: '#F3E5F5',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  createButton: {
    backgroundColor: '#4F46E5',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default AddFollowUp;

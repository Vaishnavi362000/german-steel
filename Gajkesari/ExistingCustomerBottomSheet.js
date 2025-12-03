import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ExistingCustomerBottomSheet = ({ isVisible, onClose, existingCustomer, onViewCustomer }) => (
  <Modal
    visible={isVisible}
    animationType="slide"
    transparent={true}
    onRequestClose={onClose}
  >
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Existing Customer</Text>
        <Text style={styles.message}>A customer with the same phone number already exists.</Text>
        {existingCustomer && (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.storeName}>{existingCustomer.storeName}</Text>
            </View>
            <View style={styles.details}>
              <View style={styles.detailItem}>
                <Ionicons name="person-outline" size={20} color="#6200EE" />
                <Text style={styles.detailText}>{existingCustomer.clientFirstName} {existingCustomer.clientLastName}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="call-outline" size={20} color="#6200EE" />
                <Text style={styles.detailText}>{existingCustomer.primaryContact}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.button} onPress={onViewCustomer}>
              <Text style={styles.buttonText}>View Customer</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.buttons}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  details: {
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 10,
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
});

export default ExistingCustomerBottomSheet;

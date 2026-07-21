import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';

const BottomSheet = ({ isVisible, onClose, title, children, scrollable = true }) => {
  const ContentContainer = scrollable ? ScrollView : View;
  const contentProps = scrollable ? { keyboardShouldPersistTaps: 'handled' } : {};

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      style={styles.bottomModal}
      swipeDirection={null}
      onSwipeComplete={null}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View style={styles.bottomSheetContainer}>
        <View style={styles.bottomSheetHandle} />
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.bottomSheetTitle}>{title}</Text>
        <ContentContainer style={styles.contentContainer} {...contentProps}>
          {children}
        </ContentContainer>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  bottomSheetContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  contentContainer: {
    flexGrow: 1,
  },
});

export default BottomSheet;

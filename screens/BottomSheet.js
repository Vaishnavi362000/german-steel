import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';

const BottomSheet = ({ isVisible, onClose, title, children, dismissOnBackdropPress = false, dismissOnSwipe = false }) => {
  const { height: screenHeight, width: screenWidth } = Dimensions.get('screen');
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={dismissOnBackdropPress ? onClose : undefined}
      style={styles.bottomModal}
      swipeDirection={dismissOnSwipe ? ['down'] : undefined}
      onSwipeComplete={dismissOnSwipe ? onClose : undefined}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      // Avoid double keyboard compensation: we'll handle it with KeyboardAvoidingView for iOS only
      avoidKeyboard={false}
      propagateSwipe={true}
      swipeThreshold={100}
      scrollOffsetMax={400}
      coverScreen={true}
      statusBarTranslucent={true}
      deviceHeight={screenHeight}
      deviceWidth={screenWidth}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <View style={[styles.bottomSheetContainer, { maxHeight: Math.round(screenHeight * 0.9) }]}>
          <View style={styles.bottomSheetHandle} />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={26} color="#333" />
          </TouchableOpacity>
          <Text style={styles.bottomSheetTitle}>{title}</Text>
          <View style={styles.contentContainer}>
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0
  },
  keyboardAvoidingView: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // Let the sheet size to content up to a sensible maximum to avoid large empty space
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    paddingTop: 20,
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
    top: 15,
    right: 15,
    zIndex: 1,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  contentContainer: {
    // Do not force the content to fill the entire height; this prevents extra blank space
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});

export default BottomSheet;
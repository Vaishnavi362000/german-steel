import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BottomSheet = ({ isVisible, onClose, title, children, scrollable = true }) => {
  const insets = useSafeAreaInsets();
  const ContentContainer = scrollable ? ScrollView : View;
  const contentProps = scrollable ? { keyboardShouldPersistTaps: 'handled' } : {};

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      style={styles.bottomModal}
      swipeDirection={null}
      onSwipeComplete={null}
      onBackButtonPress={onClose}
      backdropColor="#111827"
      backdropOpacity={0.42}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View style={[styles.bottomSheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '92%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 12,
  },
  bottomSheetHandle: {
    width: 38,
    height: 4,
    backgroundColor: '#D2D6DE',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  bottomSheetTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    color: '#202938',
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 12,
  },
});

export default BottomSheet;

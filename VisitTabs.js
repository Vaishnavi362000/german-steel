import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BrandsSection from './BrandsSection';
import LikesSection from './LikesSection';

const VisitTabs = ({ storeId, authToken }) => {
  const [activeTab, setActiveTab] = useState('brands');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'brands':
        return <BrandsSection storeId={storeId} authToken={authToken} />;
      case 'likes':
        return <LikesSection storeId={storeId} authToken={authToken} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'brands' && styles.activeTabButton]}
          onPress={() => setActiveTab('brands')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'brands' && styles.activeTabButtonText]}>
            Brands
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'likes' && styles.activeTabButton]}
          onPress={() => setActiveTab('likes')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'likes' && styles.activeTabButtonText]}>
            Likes
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContent}>{renderTabContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
  },
  tabButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  activeTabButtonText: {
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
  },
});

export default VisitTabs;
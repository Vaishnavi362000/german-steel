import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const Greeting = ({ message, onProfilePress, onNotificationPress, unreadTasks }) => {
  const name = message.split(',')[1]?.trim() || 'User';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  const avatarText = initials.length > 1 ? initials.slice(0, 2) : initials;

  return (
    <View style={styles.greetingContainer}>
      <View style={styles.leftSection}>
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{avatarText}</Text>
        </LinearGradient>
        <View style={styles.greetingTextContainer}>
          <Text style={styles.greetingText}>{message.split(',')[0]}</Text>
          <Text style={styles.nameText}>{name}</Text>
        </View>
      </View>
      <View style={styles.iconsContainer}>
        <TouchableOpacity onPress={onNotificationPress} style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={24} color="#1F2937" />
          {unreadTasks > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadTasks}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onProfilePress} style={styles.iconButton}>
          <Ionicons name="person-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  greetingTextContainer: {
    marginLeft: 15,
  },
  greetingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  iconsContainer: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 15,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default Greeting;
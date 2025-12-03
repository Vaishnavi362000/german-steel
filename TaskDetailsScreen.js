import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import moment from 'moment';

const TaskDetailsScreen = ({ route, navigation }) => {
  const { task, authToken } = route.params;
  const [status, setStatus] = useState(task.status === 'Assigned' ? 'Pending' : task.status || 'Pending');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleUpdateTask = async (newStatus) => {
    try {
      const response = await axios.put(
        `https://api.gajkesaristeels.in/task/updateTask?taskId=${task.id}`,
        {
          status: newStatus,
          priority: task.priority
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      setStatus(newStatus);
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task status. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'done': return '#10B981';
      case 'in progress': return '#3B82F6';
      default: return '#F59E0B';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      default: return '#10B981';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
      </View>
      <ScrollView style={styles.content}>
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity
            style={styles.storeLink}
            onPress={() => {
              navigation.navigate('Customer', {
                screen: 'CustomerDetails',
                params: { customerId: task.storeId, authToken }
              });
            }}
          >
            <Ionicons name="business-outline" size={24} color="#4F46E5" />
            <Text style={styles.storeName}>{task.storeName}</Text>
          </TouchableOpacity>

          <View style={styles.tagsContainer}>
            <View style={[styles.tag, { backgroundColor: getStatusColor(status) }]}>
              <Text style={styles.tagText}>{task.taskType}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: getPriorityColor(task.priority) }]}>
              <Text style={styles.tagText}>{task.priority}</Text>
            </View>
          </View>

          <Text style={styles.taskDescription}>{task.taskDesciption || 'No Description'}</Text>

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>
                Due: {moment(task.dueDate).format('MMMM D, YYYY')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>
                Time: {task.dueTime || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>
                Assigned to: {task.assignedToName}
              </Text>
            </View>
          </View>

          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Status</Text>
            <View style={styles.statusOptions}>
              {['Pending', 'In Progress', 'Done'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusOption,
                    { backgroundColor: status === s ? getStatusColor(s) : '#E5E7EB' }
                  ]}
                  onPress={() => handleUpdateTask(s)}
                >
                  <Text style={[
                    styles.statusOptionText,
                    { color: status === s ? '#FFF' : '#4B5563' }
                  ]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  storeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginLeft: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  tagText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  taskDescription: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 20,
    lineHeight: 24,
  },
  infoContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 10,
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statusOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOptionText: {
    fontWeight: '600',
    fontSize: 16,
  },
});

export default TaskDetailsScreen;
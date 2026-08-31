import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const TabBarIcon = ({ name, focused }) => {
  const resolvedName = focused ? name?.replace('-outline', '') : name;

  return (
    <View style={styles.iconContainer}>
      <Ionicons
        name={resolvedName}
        size={focused ? 21 : 20}
        color={focused ? '#FFFFFF' : '#D7D5FF'}
      />
    </View>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 6);

  return (
    <View style={[styles.tabBar, { height: 62 + bottomInset, paddingBottom: bottomInset }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            activeOpacity={0.72}
            style={styles.tabButton}
          >
            <View style={[styles.tabItem, isFocused && styles.focusedTab]}>
              <TabBarIcon name={options.tabBarIconName} focused={isFocused} />
              <Text style={[styles.label, isFocused && styles.focusedLabel]}>{label}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#625BF5',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 6,
    paddingHorizontal: 6,
    shadowColor: '#2E2A7E',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  tabItem: {
    minWidth: 84,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  focusedTab: {
    backgroundColor: 'rgba(43, 38, 145, 0.32)',
  },
  iconContainer: {
    width: 28,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: '#D7D5FF',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
  },
  focusedLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});

export default CustomTabBar;

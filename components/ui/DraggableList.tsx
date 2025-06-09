import React from 'react';
import { View, StyleSheet } from 'react-native';

interface DraggableListProps<T> {
  data: T[];
  renderItem: (item: T) => React.ReactNode;
  onReorder: (newData: T[]) => void;
  keyExtractor: (item: T) => string;
}

export function DraggableList<T>({ 
  data, 
  renderItem, 
  onReorder, 
  keyExtractor 
}: DraggableListProps<T>) {
  // Simple non-draggable list implementation
  // This is a placeholder that can be enhanced later when drag-and-drop is needed
  
  return (
    <View style={styles.container}>
      {data.map((item, index) => (
        <View key={keyExtractor(item)} style={styles.item}>
          {renderItem(item)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  item: {
    marginBottom: 8,
  },
});
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Delivery } from '../types';

interface DeliveryCardProps {
  delivery: Delivery;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.orderBadge}>
          <Text style={styles.orderText}>{delivery.order}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>{delivery.name}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.infoRow}>
        <Text style={styles.label}>العنوان:</Text>
        <Text style={styles.value} numberOfLines={2}>{delivery.address}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>الهاتف:</Text>
        <Text style={styles.value}>{delivery.phone}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e8eef5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e88e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  orderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a237e',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8eef5',
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#546e7a',
    fontWeight: '500',
    width: 60,
    textAlign: 'right',
  },
  value: {
    fontSize: 14,
    color: '#263238',
    flex: 1,
    textAlign: 'right',
    marginRight: 8,
  },
});
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { PaymentItem } from '@/lib/api/finance';

const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
  },
  logo: {
    width: 60,
    height: 60,
  },
  schoolInfo: {
    alignItems: 'flex-end',
  },
  schoolName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a365d',
  },
  schoolDetails: {
    color: '#666',
    marginTop: 4,
    fontSize: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  receiptNumber: {
    fontSize: 12,
    color: '#4a5568',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#f7fafc',
    padding: 4,
    marginBottom: 8,
    color: '#2d3748',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 150,
    color: '#718096',
  },
  value: {
    flex: 1,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  amountBox: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#ebf8ff',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#2b6cb0',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2b6cb0',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: 9,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  signatureContainer: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureLine: {
    width: 150,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom: 5,
  },
  signatureText: {
    textAlign: 'center',
    color: '#4a5568',
  }
});

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF' }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const formatMethod = (method: string) => {
  const methods: Record<string, string> = {
    'CASH': 'Espèces',
    'ORANGE_MONEY': 'Orange Money',
    'MTN_MONEY': 'MTN MoMo',
    'WAVE': 'Wave',
    'BANK_TRANSFER': 'Virement bancaire',
    'CHECK': 'Chèque'
  };
  return methods[method] || method;
};

export const ReceiptPDF = ({ payment }: { payment: PaymentItem }) => (
  <Document>
    <Page size="A5" orientation="landscape" style={styles.page}>
      
      {/* Header */}
      <View style={styles.header}>
        {/* Placeholder pour un logo - À remplacer par un vrai logo si dispo */}
        <View style={{ width: 60, height: 60, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: '#718096' }}>LOGO</Text>
        </View>
        <View style={styles.schoolInfo}>
          <Text style={styles.schoolName}>Guischool Institute</Text>
          <Text style={styles.schoolDetails}>Conakry, République de Guinée</Text>
          <Text style={styles.schoolDetails}>Tél: +224 620 00 00 00</Text>
          <Text style={styles.schoolDetails}>Email: contact@guischool.edu</Text>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>REÇU DE PAIEMENT</Text>
        <Text style={styles.receiptNumber}>N° {payment.receipt_number || payment.id.substring(0,8)}</Text>
      </View>

      {/* Details */}
      <View style={{ flexDirection: 'row', gap: 20 }}>
        
        {/* Left Column */}
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>INFORMATIONS ÉLÈVE</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nom complet :</Text>
            <Text style={styles.value}>{payment.student_name || 'Élève inconnu'}</Text>
          </View>
          {payment.student_matricule && (
            <View style={styles.row}>
              <Text style={styles.label}>Matricule :</Text>
              <Text style={styles.value}>{payment.student_matricule}</Text>
            </View>
          )}
        </View>

        {/* Right Column */}
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>DÉTAILS DU PAIEMENT</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date :</Text>
            <Text style={styles.value}>{formatDate(payment.payment_date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Mode de paiement :</Text>
            <Text style={styles.value}>{formatMethod(payment.method)}</Text>
          </View>
          {payment.reference && (
            <View style={styles.row}>
              <Text style={styles.label}>Référence :</Text>
              <Text style={styles.value}>{payment.reference}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Amount Box */}
      <View style={styles.amountBox}>
        <Text style={styles.amountLabel}>Montant Encaissé</Text>
        <Text style={styles.amountValue}>{formatCurrency(payment.amount)}</Text>
      </View>

      {/* Signatures */}
      <View style={styles.signatureContainer}>
        <View>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureText}>Signature de l'élève/parent</Text>
        </View>
        <View>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureText}>Signature de la caisse</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Document généré le {new Date().toLocaleString('fr-FR')} • Ce reçu est une preuve de paiement valide.
      </Text>
    </Page>
  </Document>
);

export default ReceiptPDF;

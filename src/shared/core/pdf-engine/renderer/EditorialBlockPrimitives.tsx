import React from 'react';
import { StyleSheet } from '@react-pdf/renderer';

// Componentes de bloque PDF reutilizables para EditorLee
// Cada componente es puro y devuelve JSX válido con cierre correspondiente

const Callout = ({ variant, content, isTitle }: { variant: string; content: string; isTitle?: boolean }) => (
  <View style={styles.callout}>
    {isTitle && <Text style={styles.calloutTitle}>{content}</Text>}
    <Text style={styles.calloutBody}>{content}</Text>
  </View>
);

const Table = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <View style={styles.table}>
    <View style={styles.tableHeader}>
      {headers.map((h) => (
        <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
      ))}
    </View>
    {rows.map((row, ri) => (
      <View key={ri} style={styles.tableRow}>
        {row.map((cell, ci) => (
          <Text key={ci} style={styles.tableRowCell}>{cell}</Text>
        ))}
      </View>
    ))}
  </View>
);

const Image = ({ src, caption }: { src: string; caption?: string }) => (
  <View style={styles.imageContainer}>
    {src && <Image style={styles.image} src={src} />}
    {caption && <Text style={styles.imageCaption}>{caption}</Text>}
  </View>
);

const Bibliography = ({ author, year, title, editorial }: { author?: string; year?: string; title?: string; editorial?: string }) => {
  const formatted = `${author || ''} ${year || ''} "${title || ''}" ${editorial || ''}`.trim();
  return (
    <Text style={styles.bibliographyItem}>
      {formatted}
    </Text>
  );
};

const QR = ({ qrUrl, isBreak }: { qrUrl?: string; isBreak?: boolean }) => {
  if (!qrUrl) return null;
  return (
    <View style={styles.qrCodeContainer}>
      <Image style={styles.qrCode} src={qrUrl} />
      {isBreak && <Text style={styles.qrBreak}>* * *</Text>}
    </View>
  );
};

export const EditorialBlockPrimitives: React.FC = () => {
  // Componentes reutilizables mostrados como ejemplos
  const CalloutComponent = () => (
    <View style={styles.callout}>
      <Text style={styles.calloutTitle}>Título</Text>
      <Text style={styles.calloutBody}>Contenido destacado</Text>
    </View>
  );

  const TableComponent = () => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderCell}>Encabezado 1</Text>
        <Text style={styles.tableHeaderCell}>Encabezado 2</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={styles.tableRowCell}>Dato 1</Text>
        <Text style={styles.tableRowCell}>Dato 2</Text>
      </View>
    </View>
  );

  const ImageComponent = () => (
    <View style={styles.imageContainer}>
      <Image style={styles.image} src="https://example.com/image.jpg" />
      <Text style={styles.imageCaption}>Figura 1: Descripción</Text>
    </View>
  );

  const BibliographyComponent = () => (
    <Text style={styles.bibliographyItem}>
      Juan Pérez (2023). "Introducción a la teoría". Editorial XYZ.
    </Text>
  );

  const QRComponent = () => (
    <Image style={styles.qrCode} src="https://example.com/qr.png" />
  );

  return (
    <View style={styles.container}>
      {/* Ejemplo de callout */}
      <CalloutComponent />

      {/* Ejemplo de tabla */}
      <TableComponent />

      {/* Ejemplo de imagen */}
      <ImageComponent />

      {/* Ejemplo de bibliografía */}
      <BibliographyComponent />

      {/* Ejemplo de QR */}
      <QRComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  callout: {
    borderWidth: 1,
    borderColor: '#FBBF24',
    backgroundColor: '#FEF3C7',
    padding: 8,
    margin: 8,
  },
  calloutTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#D97706',
    marginBottom: 4,
  },
  calloutBody: {
    fontSize: 9,
    color: '#968E75',
  },
  table: {
    marginTop: 8,
    borderWidth: 0.6,
    borderColor: '#9CA3AF',
  },
  tableHeader: {
    backgroundColor: '#3F51B5',
    color: 'white',
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 9,
  },
  tableHeaderCell: {
    padding: 2,
    fontSize: 9,
  },
  tableRow: {
    padding: 2,
    borderTopWidth: 0.4,
    borderTopColor: '#9CA3AF',
  },
  tableRowCell: {
    padding: 2,
    fontSize: 9,
  },
  imageContainer: {
    textAlign: 'center',
    margin: 8,
  },
  image: {
    width: 100,
    height: 100,
    objectFit: 'contain',
  },
  imageCaption: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  bibliographyItem: {
    fontSize: 9,
    color: '#4B5563',
    marginBottom: 6,
  },
  qrCode: {
    width: 40,
    height: 40,
  },
  qrCodeContainer: {
    textAlign: 'center',
    margin: 8,
  },
  qrBreak: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 4,
  },
});
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { prepareCoverLetterRenderData, CoverLetterData } from '../layers/records/coverLetterDataAdapter';
import { getCoverLetterPreset } from '../../presets/coverLetterPresetCatalog';
import { getPreset } from '../layers/presets/presetRegistry';
import { resolveCoverLetterStyles } from '../layers/records/coverLetterStyleEngine';
import { getPageSize } from '../layers/page/pageSizes';

interface CoverLetterPdfProps {
  data: CoverLetterData;
  presetId?: string;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
}

export const CoverLetterPdfDocument: React.FC<CoverLetterPdfProps> = ({
  data,
  presetId = 'carta-clasica',
  theme = {}
}) => {
  const renderData = prepareCoverLetterRenderData(data);
  const preset = getCoverLetterPreset(presetId);
  const activePreset = getPreset(presetId);
  const letterStyles = resolveCoverLetterStyles(activePreset, activePreset.palette.background);

  const activePageSizeId = data.layout?.pageSizeId || data.layout?.paperSize || 'a4';
  const pageDef = getPageSize(activePageSizeId);
  const pdfPageSize: 'A4' | 'LETTER' | 'LEGAL' | [number, number] =
    activePageSizeId === 'carta'
      ? 'LETTER'
      : activePageSizeId === 'legal'
      ? 'LEGAL'
      : activePageSizeId === 'a4'
      ? 'A4'
      : [pageDef.widthPt, pageDef.heightPt];

  const primaryColor = theme.primaryColor || activePreset.palette.primary;
  const textColor = letterStyles.rolesColor.text;

  const styles = StyleSheet.create({
    page: {
      paddingTop: 45,
      paddingBottom: 45,
      paddingLeft: 55,
      paddingRight: 55,
      fontFamily: letterStyles.body.fontFamily,
      fontSize: letterStyles.body.fontSizePt,
      color: textColor,
      lineHeight: preset.lineSpacing
    },
    headerCentered: {
      alignItems: 'center',
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: primaryColor,
      paddingBottom: 12
    },
    headerLeftBar: {
      borderLeftWidth: 4,
      borderLeftColor: primaryColor,
      paddingLeft: 12,
      marginBottom: 20
    },
    headerMinimal: {
      marginBottom: 20
    },
    senderName: {
      fontSize: 16,
      fontFamily: 'Helvetica-Bold',
      color: primaryColor,
      marginBottom: 4,
      textTransform: 'uppercase'
    },
    senderContact: {
      fontSize: letterStyles.senderContact.fontSizePt,
      color: letterStyles.senderContact.colorHex
    },
    dateRow: {
      marginBottom: 16,
      fontSize: letterStyles.dateRow.fontSizePt,
      color: letterStyles.dateRow.colorHex
    },
    recipientBox: {
      marginBottom: 20
    },
    recipientName: {
      fontFamily: 'Helvetica-Bold',
      fontSize: 11
    },
    recipientSub: {
      fontSize: letterStyles.recipientSub.fontSizePt,
      color: letterStyles.recipientSub.colorHex
    },
    salutation: {
      marginBottom: 14,
      fontFamily: 'Helvetica-Bold'
    },
    paragraph: {
      marginBottom: 14,
      textAlign: 'justify'
    },
    signoffBox: {
      marginTop: 20
    },
    signoffText: {
      marginBottom: 12
    },
    signatureImage: {
      width: 140,
      height: 45,
      objectFit: 'contain',
      marginBottom: 6
    },
    signerName: {
      fontFamily: 'Helvetica-Bold',
      fontSize: 11
    },
    signerRole: {
      fontSize: letterStyles.signerRole.fontSizePt,
      color: letterStyles.signerRole.colorHex
    }
  });

  const renderHeader = () => {
    if (preset.headerStyle === 'left_bar') {
      return (
        <View style={styles.headerLeftBar}>
          <Text style={styles.senderName}>{renderData.sender.fullName}</Text>
          <Text style={styles.senderContact}>
            {[renderData.sender.email, renderData.sender.phone, renderData.sender.cityProvince].filter(Boolean).join('  •  ')}
          </Text>
        </View>
      );
    }

    if (preset.headerStyle === 'minimal') {
      return (
        <View style={styles.headerMinimal}>
          <Text style={styles.senderName}>{renderData.sender.fullName}</Text>
          <Text style={styles.senderContact}>
            {[renderData.sender.email, renderData.sender.phone, renderData.sender.cityProvince].filter(Boolean).join('  •  ')}
          </Text>
        </View>
      );
    }

    // Default centered
    return (
      <View style={styles.headerCentered}>
        <Text style={styles.senderName}>{renderData.sender.fullName}</Text>
        <Text style={styles.senderContact}>
          {[renderData.sender.email, renderData.sender.phone, renderData.sender.cityProvince].filter(Boolean).join('  •  ')}
        </Text>
      </View>
    );
  };

  return (
    <Document title={`Carta de Presentación - ${renderData.sender.fullName}`}>
      <Page size={pdfPageSize} style={styles.page}>
        {renderHeader()}

        <View style={styles.dateRow}>
          <Text>{renderData.dateStr}</Text>
        </View>

        <View style={styles.recipientBox}>
          <Text style={styles.recipientName}>{renderData.recipient.name}</Text>
          <Text style={styles.recipientSub}>{renderData.recipient.title}</Text>
          <Text style={styles.recipientSub}>{renderData.recipient.company}</Text>
        </View>

        <Text style={styles.salutation}>{renderData.content.salutation}</Text>

        {renderData.content.hookParagraph ? (
          <Text style={styles.paragraph}>{renderData.content.hookParagraph}</Text>
        ) : null}

        {renderData.content.evidenceParagraph ? (
          <Text style={styles.paragraph}>{renderData.content.evidenceParagraph}</Text>
        ) : null}

        {renderData.content.closingParagraph ? (
          <Text style={styles.paragraph}>{renderData.content.closingParagraph}</Text>
        ) : null}

        <View style={styles.signoffBox}>
          <Text style={styles.signoffText}>{renderData.content.signoff}</Text>

          {renderData.signature?.dataUrl ? (
            <Image src={renderData.signature.dataUrl} style={styles.signatureImage} />
          ) : null}

          <Text style={styles.signerName}>{renderData.signature?.signerName || renderData.sender.fullName}</Text>
          {renderData.signature?.signerRole ? (
            <Text style={styles.signerRole}>{renderData.signature.signerRole}</Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
};

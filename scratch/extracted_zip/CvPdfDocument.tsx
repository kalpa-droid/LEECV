import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  Image, 
  StyleSheet, 
  Font 
} from '@react-pdf/renderer';

// Helper to sort items descending by year
const sortByYearDesc = (items: any[]) => {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const yearA = parseInt((a.year || '').toString().match(/\d{4}/)?.[0] || '0', 10);
    const yearB = parseInt((b.year || '').toString().match(/\d{4}/)?.[0] || '0', 10);
    return yearB - yearA;
  });
};

interface CvPdfDocumentProps {
  cvData: any;
}

export const CvPdfDocument: React.FC<CvPdfDocumentProps> = ({ cvData }) => {
  const {
    personalInfo = {},
    education = [],
    profession = [],
    experience = [],
    informatics = [],
    ecology = {},
    coursesAndCertificates = [],
    certificatesScanned = [],
    signature = {},
    theme = {}
  } = cvData || {};

  const primaryColor = theme.primaryColor || '#ab5ba1';
  const secondaryColor = theme.secondaryColor || '#888888';
  const accentColor = theme.accentColor || '#40a08e';

  const paperSizeId = cvData?.layout?.paperSize || 'a4';
  const pdfPaperSize = paperSizeId === 'carta' ? 'LETTER' : paperSizeId === 'legal' ? 'LEGAL' : 'A4';

  const sortedCourses = sortByYearDesc(coursesAndCertificates);
  const sortedExperience = sortByYearDesc(experience);
  const sortedProfession = sortByYearDesc(profession);

  // Dynamic Section Visibility Helpers
  const isVis = (key: string) => cvData?.sectionVisibility?.[key] !== false;

  const getSectionColumn = (sectionKey: string) => {
    const directSetting = cvData?.layout?.columnAssignments?.[sectionKey];
    if (typeof directSetting === 'string') return directSetting;
    const leftList = cvData?.layout?.columnAssignments?.left || ["personales", "formacion", "cursos", "informatica"];
    const rightList = cvData?.layout?.columnAssignments?.right || ["profesion", "experiencia", "ecologia", "certificados", "firma"];

    const inLeft = leftList.includes(sectionKey);
    const inRight = rightList.includes(sectionKey);

    if (inLeft && inRight) return 'ambas';
    if (inLeft) return 'secundaria';
    return 'primaria';
  };

  const showInSecundaria = (secKey: string) => {
    const col = getSectionColumn(secKey);
    return (col === 'secundaria' || col === 'ambas') && isVis(secKey);
  };

  const showInPrimaria = (secKey: string) => {
    const col = getSectionColumn(secKey);
    return (col === 'primaria' || col === 'ambas') && isVis(secKey);
  };

  // React-PDF Dynamic Stylesheet
  const styles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#333333',
      paddingTop: 28,
      paddingBottom: 28
    },
    // Top Cover Header (if enabled)
    coverHeader: {
      backgroundColor: primaryColor,
      color: '#ffffff',
      padding: 24,
      textAlign: 'center'
    },
    coverTitle: {
      fontSize: 22,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 1
    },
    coverSubtitle: {
      fontSize: 12,
      marginTop: 4,
      opacity: 0.9
    },
    // Main 2-Column Body Layout
    pageBody: {
      flexDirection: 'row',
      flex: 1
    },
    // Left Sidebar Column
    leftColumn: {
      width: '32%',
      backgroundColor: primaryColor,
      color: '#ffffff',
      paddingHorizontal: 16,
      flexDirection: 'column'
    },
    sidebarHeader: {
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.3)'
    },
    profilePhoto: {
      width: 90,
      height: 110,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: accentColor,
      objectFit: 'cover',
      marginBottom: 8
    },
    profilePhotoPlaceholder: {
      width: 90,
      height: 110,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: accentColor,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8
    },
    sidebarSectionTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 12,
      marginBottom: 6,
      paddingBottom: 3,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.3)',
      color: '#ffffff'
    },
    sidebarItemText: {
      fontSize: 9,
      marginBottom: 3,
      lineHeight: 1.3
    },
    sidebarItemBold: {
      fontFamily: 'Helvetica-Bold'
    },
    // Right Content Column
    rightColumn: {
      width: '68%',
      paddingHorizontal: 24,
      backgroundColor: '#ffffff'
    },
    headerName: {
      fontSize: 18,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      color: '#0f172a',
      marginBottom: 4,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0'
    },
    headerNameHighlight: {
      color: primaryColor
    },
    sectionTitleContainer: {
      backgroundColor: primaryColor,
      color: '#ffffff',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 4,
      marginTop: 14,
      marginBottom: 8
    },
    sectionTitleText: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5
    },
    // Card Box (Layer 2 Bounding Box with wrap={false})
    cardBox: {
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderLeftWidth: 4,
      borderLeftColor: primaryColor,
      borderRadius: 6,
      padding: 10,
      marginBottom: 8
    },
    cardBoxAccent: {
      borderLeftColor: accentColor
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 3
    },
    cardTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: '#0f172a',
      flex: 1
    },
    cardYearBadge: {
      backgroundColor: primaryColor,
      color: '#ffffff',
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 3
    },
    cardInstitution: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      color: '#475569',
      marginBottom: 3
    },
    cardDetails: {
      fontSize: 8.5,
      color: '#334155',
      lineHeight: 1.4
    },
    // Course Card
    courseBox: {
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 5,
      padding: 7,
      marginBottom: 6,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    courseTitle: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      color: '#0f172a'
    },
    courseInstitution: {
      fontSize: 8,
      color: '#64748b'
    },
    courseHours: {
      backgroundColor: '#e2e8f0',
      color: '#334155',
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 3
    },
    // Signature Block
    signatureContainer: {
      marginTop: 20,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#cbd5e1',
      alignItems: 'flex-end'
    },
    signatureBox: {
      width: 180,
      textAlign: 'center'
    },
    signatureImage: {
      height: 40,
      objectFit: 'contain',
      marginBottom: 4
    },
    signatureLine: {
      borderBottomWidth: 1,
      borderBottomColor: '#94a3b8',
      height: 30,
      marginBottom: 4
    },
    signerName: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: '#0f172a'
    },
    signerRole: {
      fontSize: 8.5,
      color: '#64748b'
    },
    // Certificate Page
    certPage: {
      backgroundColor: '#ffffff',
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center'
    },
    certTitle: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: '#0f172a',
      marginBottom: 12
    },
    certImage: {
      maxWidth: '100%',
      maxHeight: '80%',
      objectFit: 'contain',
      borderRadius: 4
    }
  });

  return (
    <Document title={`${personalInfo.surname || ''} ${personalInfo.givenNames || ''} - CV`}>
      {/* MAIN DOCUMENT PAGE (Multi-page vector flow powered by Yoga Flexbox engine) */}
      <Page size={pdfPaperSize} style={styles.page}>
        <View style={styles.pageBody}>
          {/* LEFT SIDEBAR COLUMN */}
          <View style={styles.leftColumn}>
            <View style={styles.sidebarHeader}>
              {personalInfo.profilePhoto ? (
                <Image src={personalInfo.profilePhoto} style={styles.profilePhoto} />
              ) : (
                <View style={styles.profilePhotoPlaceholder}>
                  <Text style={{ fontSize: 24, color: '#ffffff' }}>👤</Text>
                </View>
              )}
            </View>

            {/* Contact & Info */}
            {showInSecundaria('contacto') && (
              <View wrap={false}>
                <Text style={styles.sidebarSectionTitle}>CONTACTO</Text>
                {personalInfo.phone && <Text style={styles.sidebarItemText}>📞 {personalInfo.phone}</Text>}
                {personalInfo.email && <Text style={styles.sidebarItemText}>✉️ {personalInfo.email}</Text>}
                {personalInfo.address && <Text style={styles.sidebarItemText}>📍 {personalInfo.address}</Text>}
                {personalInfo.cityProvince && <Text style={styles.sidebarItemText}>🏙️ {personalInfo.cityProvince}</Text>}
              </View>
            )}

            {/* Personal Details */}
            {showInSecundaria('personales') && (
              <View wrap={false}>
                <Text style={styles.sidebarSectionTitle}>DATOS PERSONALES</Text>
                {personalInfo.dni && <Text style={styles.sidebarItemText}>DNI: <Text style={styles.sidebarItemBold}>{personalInfo.dni}</Text></Text>}
                {personalInfo.cuit && <Text style={styles.sidebarItemText}>CUIT: <Text style={styles.sidebarItemBold}>{personalInfo.cuit}</Text></Text>}
                {personalInfo.birthDate && <Text style={styles.sidebarItemText}>Nac.: <Text style={styles.sidebarItemBold}>{personalInfo.birthDate}</Text></Text>}
              </View>
            )}

            {/* Key Competencies */}
            {showInSecundaria('competencias') && (
              <View wrap={false}>
                <Text style={styles.sidebarSectionTitle}>COMPETENCIAS</Text>
                {(cvData?.skills || ["Pedagogía Dialógica", "Comunidades de Aprendizaje", "Alfabetización Digital", "Educación Inclusiva"]).map((skill: any, idx: number) => (
                  <Text key={idx} style={styles.sidebarItemText}>• {typeof skill === 'string' ? skill : skill.name || skill.title}</Text>
                ))}
              </View>
            )}

            {/* Informatics */}
            {showInSecundaria('informatica') && informatics && informatics.length > 0 && (
              <View wrap={false}>
                <Text style={styles.sidebarSectionTitle}>INFORMÁTICA</Text>
                {informatics.map((inf: any, idx: number) => (
                  <Text key={idx} style={styles.sidebarItemText}>• {inf.course || inf.institution}</Text>
                ))}
              </View>
            )}
          </View>

          {/* RIGHT MAIN CONTENT COLUMN */}
          <View style={styles.rightColumn}>
            {/* Candidate Header */}
            <Text style={styles.headerName}>
              {personalInfo.surname || ''} <Text style={styles.headerNameHighlight}>{personalInfo.givenNames || ''}</Text>
            </Text>

            {/* Formación Académica */}
            {showInPrimaria('formacion') && education && education.length > 0 && (
              <View>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitleText}>🎓 FORMACIÓN ACADÉMICA</Text>
                </View>
                {education.map((edu: any, i: number) => (
                  <View key={i} wrap={false} style={[styles.cardBox, styles.cardBoxAccent]}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{edu.degree}</Text>
                      {edu.year && <Text style={styles.cardYearBadge}>AÑO {edu.year}</Text>}
                    </View>
                    <Text style={styles.cardInstitution}>{edu.institution}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Títulos Profesionales */}
            {showInPrimaria('profesion') && sortedProfession && sortedProfession.length > 0 && (
              <View>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitleText}>💼 TÍTULOS PROFESIONALES ({sortedProfession.length})</Text>
                </View>
                {sortedProfession.map((prof: any, i: number) => (
                  <View key={i} wrap={false} style={styles.cardBox}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{prof.degree}</Text>
                      {prof.year && <Text style={styles.cardYearBadge}>AÑO {prof.year}</Text>}
                    </View>
                    <Text style={styles.cardInstitution}>{prof.institution}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Experiencia Laboral */}
            {showInPrimaria('experiencia') && sortedExperience && sortedExperience.length > 0 && (
              <View>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitleText}>💼 EXPERIENCIA LABORAL</Text>
                </View>
                {sortedExperience.map((exp: any, i: number) => (
                  <View key={i} wrap={false} style={styles.cardBox}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{exp.role}</Text>
                      {exp.year && <Text style={styles.cardYearBadge}>{exp.year}</Text>}
                    </View>
                    {exp.institution && <Text style={styles.cardInstitution}>{exp.institution}</Text>}
                    {exp.details && <Text style={styles.cardDetails}>{exp.details}</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Cursos & Capacitaciones */}
            {showInPrimaria('cursos') && sortedCourses && sortedCourses.length > 0 && (
              <View>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitleText}>📚 CURSOS & CAPACITACIONES</Text>
                </View>
                {sortedCourses.map((c: any, i: number) => (
                  <View key={i} wrap={false} style={styles.courseBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courseTitle}>{c.title || c.name || c.course}</Text>
                      <Text style={styles.courseInstitution}>{c.institution}</Text>
                    </View>
                    {c.hours && <Text style={styles.courseHours}>{c.hours}</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Firma Digital */}
            {showInPrimaria('firma') && (
              <View wrap={false} style={styles.signatureContainer}>
                <View style={styles.signatureBox}>
                  {signature?.dataUrl ? (
                    <Image src={signature.dataUrl} style={styles.signatureImage} />
                  ) : (
                    <View style={styles.signatureLine} />
                  )}
                  <Text style={styles.signerName}>{signature?.signerName || `${personalInfo.surname || ''} ${personalInfo.givenNames || ''}`}</Text>
                  <Text style={styles.signerRole}>{signature?.signerRole || 'Firma Registrada'}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Page>

      {/* LAYER 4: SCANNED CERTIFICATE PAGES (1 cert per page) */}
      {isVis('certificados') && certificatesScanned && certificatesScanned.map((cert: any, index: number) => (
        <Page key={`cert-${index}`} size={pdfPaperSize} style={styles.certPage}>
          <Text style={styles.certTitle}>CERTIFICADO ADJUNTO #{index + 1}: {cert.title || cert.name || 'Certificación'}</Text>
          {cert.dataUrl || cert.url ? (
            <Image src={cert.dataUrl || cert.url} style={styles.certImage} />
          ) : (
            <Text style={{ color: '#94a3b8' }}>[ Imagen de Certificado no disponible ]</Text>
          )}
        </Page>
      ))}
    </Document>
  );
};

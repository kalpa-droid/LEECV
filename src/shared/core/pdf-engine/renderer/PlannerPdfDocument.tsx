import React from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Path } from '@react-pdf/renderer';
import { getPageSize } from '../layers/page/pageSizes';
import { generateGridPatternPath, GridPatternType } from '../layers/planner/gridPatternEngine';
import { generateYearArchitecture } from '../layers/planner/timeArchitectureEngine';
import { generateHybridMarkersPath } from '../layers/planner/hybridPageMarkers';
import { preparePlannerRenderData } from '../layers/records/plannerDataAdapter';

interface PlannerPdfProps {
  data: any; // PlannerData
  presetId?: string;
  theme?: {
    primaryColor?: string;
    fontFamily?: string;
  };
}

export const PlannerPdfDocument: React.FC<PlannerPdfProps> = ({
  data,
  presetId = 'planner-clasico',
  theme = {}
}) => {
  const activePageSizeId = data?.layout?.pageSizeId || 'b5';
  const pageDef = getPageSize(activePageSizeId);
  const pdfPageSize: 'A4' | 'LETTER' | 'LEGAL' | [number, number] =
    activePageSizeId === 'carta' ? 'LETTER'
      : activePageSizeId === 'legal' ? 'LEGAL'
      : activePageSizeId === 'a4' ? 'A4'
      : [pageDef.widthPt, pageDef.heightPt];

  const prepared = preparePlannerRenderData(data || {});
  const primaryColor = theme.primaryColor || '#1D9E75';
  const textColor = '#2D3748';
  const year = prepared.year;
  const yearArch = generateYearArchitecture(year, {
    weekStart: prepared.weekStart,
    temporalView: prepared.temporalView,
    weeklyLayout: prepared.weeklyLayout
  });

  const hybridMarkers = data?.hybridMarkers || { enabled: true, marginMm: 5, lengthMm: 10, colorHex: '#94a3b8' };
  const markersPath = generateHybridMarkersPath(hybridMarkers, pageDef.widthMm, pageDef.heightMm);


  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      color: textColor,
      position: 'relative',
    },
    gridLayer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1
    },
    monthContainer: {
      padding: 30,
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      fontSize: 24,
      fontFamily: 'Helvetica-Bold',
      color: primaryColor,
      marginBottom: 20,
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
      paddingBottom: 10,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    },
    yearText: {
      fontSize: 14,
      color: '#64748b'
    },
    calendarGrid: {
      display: 'flex',
      flexDirection: 'column',
      marginTop: 10,
      gap: 5
    },
    weekDaysRow: {
      display: 'flex',
      flexDirection: 'row',
      marginBottom: 5,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      paddingBottom: 5
    },
    weekDayCell: {
      flex: 1,
      textAlign: 'center',
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      color: '#64748b',
      textTransform: 'uppercase'
    },
    weekRow: {
      display: 'flex',
      flexDirection: 'row',
      minHeight: 60
    },
    dayCell: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#f1f5f9',
      padding: 4,
      backgroundColor: 'white'
    },
    dayNumber: {
      fontSize: 10,
      color: '#334155'
    },
    emptyCell: {
      flex: 1,
      backgroundColor: 'transparent'
    },
    monthNotes: {
      marginTop: 14,
      fontSize: 9,
      color: '#64748b',
      fontFamily: 'Helvetica-Oblique'
    }
  });

  const weekDayNamesMonday = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const weekDayNamesSunday = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const weekDayNames = prepared.weekStart === 'sunday' ? weekDayNamesSunday : weekDayNamesMonday;

  return (
    <Document title={`Agenda ${year}`}>
      {yearArch.months.map((month) => {
        // El override de este mes (si existe) pisa el diseño general del año.
        const override = prepared.monthOverrides[month.monthIndex];
        const monthGridType: GridPatternType = override?.gridType || prepared.gridType;
        const monthColor = override?.primaryColor || primaryColor;
        const monthGridPath = generateGridPatternPath(
          { type: monthGridType, colorHex: prepared.gridColor },
          pageDef.widthMm,
          pageDef.heightMm
        );

        return (
          <Page key={month.monthIndex} size={pdfPageSize} style={styles.page}>

            {/* Capa de Retícula de Fondo (respeta el override de este mes si lo tiene) */}
            {monthGridPath && (
              <View style={styles.gridLayer}>
                <Svg width={pageDef.widthPt} height={pageDef.heightPt}>
                  <Path
                    d={monthGridPath.pathString}
                    stroke={monthGridPath.style.stroke}
                    strokeWidth={monthGridPath.style.strokeWidth}
                    strokeDasharray={monthGridPath.style.strokeDasharray}
                  />
                </Svg>
              </View>
            )}

            {/* Marcas de Corte/Registro (Híbrido) */}
            {markersPath && (
              <View style={styles.gridLayer}>
                <Svg width={pageDef.widthPt} height={pageDef.heightPt}>
                  <Path
                    d={markersPath.pathString}
                    stroke={markersPath.style.stroke}
                    strokeWidth={markersPath.style.strokeWidth}
                  />
                </Svg>
              </View>
            )}

            {/* Capa de Contenido del Mes */}
            <View style={styles.monthContainer}>
              <View style={[styles.header, { color: monthColor, borderBottomColor: monthColor }]}>
                <Text>{month.monthName}</Text>
                <Text style={styles.yearText}>{year}</Text>
              </View>

              <View style={styles.calendarGrid}>
                <View style={styles.weekDaysRow}>
                  {weekDayNames.map(wd => (
                    <Text key={wd} style={styles.weekDayCell}>{wd}</Text>
                  ))}
                </View>

                {month.weeks.map((week, wIdx) => (
                  <View key={wIdx} style={styles.weekRow}>
                    {week.map((day, dIdx) => (
                      day ? (
                        <View key={dIdx} style={styles.dayCell}>
                          <Text style={styles.dayNumber}>{day}</Text>
                        </View>
                      ) : (
                        <View key={dIdx} style={styles.emptyCell} />
                      )
                    ))}
                  </View>
                ))}
              </View>

              {override?.notes ? (
                <Text style={styles.monthNotes}>{override.notes}</Text>
              ) : null}
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

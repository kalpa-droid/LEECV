import React from 'react';
import { Document, Page, View, Text, StyleSheet, Svg, Path } from '@react-pdf/renderer';
import { getPageSize } from '../layers/page/pageSizes';
import { generateGridPatternPath, GridPatternType } from '../layers/planner/gridPatternEngine';
import { generateYearArchitecture, WeekStart, WeeklyLayout, TemporalView } from '../layers/planner/timeArchitectureEngine';
import { generateHybridMarkersPath } from '../layers/planner/hybridPageMarkers';
import { preparePlannerRenderData } from '../layers/records/plannerDataAdapter';
import { getPreset } from '../layers/presets/presetRegistry';
import { resolvePlannerStyles } from '../layers/planner/plannerStyleEngine';

interface PlannerPdfProps {
  data: any; // PlannerDocumentData + layout.pageSizeId
  presetId?: string;
  theme?: {
    primaryColor?: string;
  };
}

/** Agenda anual: una página por mes; el tipo, colores y tipografías salen del preset/persona elegido. */
export const PlannerPdfDocument: React.FC<PlannerPdfProps> = ({ data, presetId = 'planner-clasico', theme = {} }) => {
  const activePageSizeId = data?.layout?.pageSizeId || 'b5';
  const pageDef = getPageSize(activePageSizeId);
  const pdfPageSize: 'A4' | 'LETTER' | 'LEGAL' | [number, number] =
    activePageSizeId === 'carta' ? 'LETTER'
      : activePageSizeId === 'legal' ? 'LEGAL'
      : activePageSizeId === 'a4' ? 'A4'
      : [pageDef.widthPt, pageDef.heightPt];

  const prepared = preparePlannerRenderData(data || {});
  const activePreset = getPreset(presetId);
  const plannerStyles = resolvePlannerStyles(activePreset);

  const primaryColor = theme.primaryColor || data?.theme?.primaryColor || prepared.primaryColor || activePreset.palette.primary || '#1D9E75';
  const year = data?.year || prepared.year || new Date().getFullYear();
  const weekStart: WeekStart = data?.weekStart || prepared.weekStart || 'monday';
  const weeklyLayout: WeeklyLayout = data?.weeklyLayout || prepared.weeklyLayout || 'horizontal';
  const temporalView: TemporalView = data?.temporalView || prepared.temporalView || 'monthly';

  const yearArch = generateYearArchitecture(year, {
    weekStart,
    weeklyLayout,
    temporalView,
  });
  const defaultGridType: GridPatternType = data?.gridType || prepared.gridType || 'dot-grid';
  const hybridMarkers = data?.hybridMarkers || { enabled: true, marginMm: 5, lengthMm: 10, colorHex: '#94a3b8' };
  const markersPath = generateHybridMarkersPath(hybridMarkers, pageDef.widthMm, pageDef.heightMm);

  const weekDayNames = weekStart === 'sunday'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const modules = data?.modules || {};

  return (
    <Document title={`Agenda ${year}`}>
      {yearArch.months.map((month) => {
        const override = data?.monthOverrides?.[month.monthIndex] || prepared.monthOverrides?.[month.monthIndex];
        const monthPrimaryColor = override?.primaryColor || primaryColor;
        const monthGridType: GridPatternType = override?.gridType || defaultGridType;
        const monthGridPath = generateGridPatternPath(
          { type: monthGridType, colorHex: plannerStyles.rolesColor.border },
          pageDef.widthMm,
          pageDef.heightMm
        );
        const monthNotes = override?.notes || '';

        const styles = StyleSheet.create({
          page: {
            fontFamily: plannerStyles.bodyText.fontFamily,
            color: plannerStyles.rolesColor.text,
            backgroundColor: plannerStyles.rolesColor.background,
            position: 'relative',
          },
          gridLayer: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
          },
          monthContainer: {
            padding: 30,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          },
          header: {
            fontSize: plannerStyles.monthName.fontSizePt,
            fontFamily: plannerStyles.monthName.fontFamily,
            color: monthPrimaryColor,
            marginBottom: 15,
            borderBottomWidth: 2,
            borderBottomColor: monthPrimaryColor,
            paddingBottom: 8,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          },
          yearText: {
            fontSize: plannerStyles.year.fontSizePt,
            fontFamily: plannerStyles.year.fontFamily,
            color: plannerStyles.year.colorHex,
          },
          calendarGrid: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 5,
            gap: 4,
          },
          weekDaysRow: {
            display: 'flex',
            flexDirection: 'row',
            marginBottom: 4,
            borderBottomWidth: 1,
            borderBottomColor: plannerStyles.rolesColor.border,
            paddingBottom: 4,
          },
          weekDayCell: {
            flex: 1,
            textAlign: 'center',
            fontSize: plannerStyles.weekDayLabel.fontSizePt,
            fontFamily: plannerStyles.weekDayLabel.fontFamily,
            color: plannerStyles.weekDayLabel.colorHex,
            textTransform: 'uppercase',
          },
          weekRow: {
            display: 'flex',
            flexDirection: 'row',
            minHeight: weeklyLayout === 'vertical' ? 70 : 50,
          },
          dayCell: {
            flex: 1,
            borderWidth: 1,
            borderColor: plannerStyles.rolesColor.border,
            padding: 4,
            backgroundColor: plannerStyles.rolesColor.background,
          },
          dayNumber: {
            fontSize: plannerStyles.dayNumber.fontSizePt,
            fontFamily: plannerStyles.dayNumber.fontFamily,
            color: plannerStyles.dayNumber.colorHex,
          },
          emptyCell: {
            flex: 1,
            backgroundColor: 'transparent',
          },
          modulesSection: {
            marginTop: 15,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          },
          moduleCard: {
            borderWidth: 1,
            borderColor: plannerStyles.rolesColor.border,
            borderRadius: 4,
            padding: 8,
            backgroundColor: plannerStyles.rolesColor.background,
          },
          moduleTitle: {
            fontSize: plannerStyles.moduleTitle.fontSizePt,
            fontFamily: plannerStyles.moduleTitle.fontFamily,
            color: monthPrimaryColor,
            marginBottom: 4,
          },
          moduleText: {
            fontSize: plannerStyles.bodyText.fontSizePt,
            fontFamily: plannerStyles.bodyText.fontFamily,
            color: plannerStyles.bodyText.colorHex,
          },
          notesText: {
            fontSize: plannerStyles.bodyText.fontSizePt,
            fontFamily: plannerStyles.bodyText.fontFamily,
            color: plannerStyles.bodyText.colorHex,
            fontStyle: plannerStyles.bodyText.fontStyle,
          },
          habitRow: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderBottomColor: plannerStyles.rolesColor.border,
            paddingVertical: 2,
          }
        });

        return (
          <Page key={month.monthIndex} size={pdfPageSize} style={styles.page}>
            {/* Capa de Retícula de Fondo */}
            {monthGridPath && (
              <View style={styles.gridLayer}>
                <Svg width={pageDef.widthPt} height={pageDef.heightPt}>
                  <Path
                    d={monthGridPath.pathString}
                    stroke={monthGridPath.style.stroke}
                    strokeWidth={monthGridPath.style.strokeWidth}
                    strokeLinecap={monthGridPath.style.strokeLinecap}
                    strokeOpacity={monthGridPath.style.opacity}
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
              <View style={styles.header}>
                <Text>{month.monthName}</Text>
                <Text style={styles.yearText}>{year}</Text>
              </View>

              <View style={styles.calendarGrid}>
                <View style={styles.weekDaysRow}>
                  {weekDayNames.map((wd) => (
                    <Text key={wd} style={styles.weekDayCell}>
                      {wd}
                    </Text>
                  ))}
                </View>

                {month.weeks.map((week, wIdx) => (
                  <View key={wIdx} style={styles.weekRow}>
                    {week.map((day, dIdx) =>
                      day ? (
                        <View key={dIdx} style={styles.dayCell}>
                          <Text style={styles.dayNumber}>{day}</Text>
                        </View>
                      ) : (
                        <View key={dIdx} style={styles.emptyCell} />
                      )
                    )}
                  </View>
                ))}
              </View>

              {/* Secciones y Módulos de Contenido */}
              <View style={styles.modulesSection}>
                {monthNotes ? (
                  <View style={styles.moduleCard}>
                    <Text style={styles.moduleTitle}>Nota del Mes</Text>
                    <Text style={styles.notesText}>{monthNotes}</Text>
                  </View>
                ) : null}

                {modules.taskPriority && (
                  <View style={styles.moduleCard}>
                    <Text style={styles.moduleTitle}>Tareas Prioritarias</Text>
                    <Text style={styles.moduleText}>[  ] 1. ______________________</Text>
                    <Text style={styles.moduleText}>[  ] 2. ______________________</Text>
                    <Text style={styles.moduleText}>[  ] 3. ______________________</Text>
                  </View>
                )}

                {modules.habitTracker && (
                  <View style={styles.moduleCard}>
                    <Text style={styles.moduleTitle}>Seguimiento de Hábitos</Text>
                    <View style={styles.habitRow}>
                      <Text style={styles.moduleText}>Hábito 1: O O O O O O O</Text>
                      <Text style={styles.moduleText}>Hábito 2: O O O O O O O</Text>
                    </View>
                  </View>
                )}

                {modules.expenseTracker && (
                  <View style={styles.moduleCard}>
                    <Text style={styles.moduleTitle}>Control de Gastos</Text>
                    <Text style={styles.moduleText}>Ingresos: ______________________</Text>
                    <Text style={styles.moduleText}>Gastos: ______________________</Text>
                    <Text style={styles.moduleText}>Balance: ______________________</Text>
                  </View>
                )}

                {modules.timeBlocking && (
                  <View style={styles.moduleCard}>
                    <Text style={styles.moduleTitle}>Bloques de Tiempo (Horarios)</Text>
                    <Text style={styles.moduleText}>08:00 - 12:00 | 14:00 - 18:00</Text>
                  </View>
                )}

                {modules.notesBlock && !monthNotes && (
                  <View style={styles.moduleCard}>
                    <Text style={styles.moduleTitle}>Notas y Objetivos</Text>
                    <Text style={styles.moduleText}>.........................................................................................</Text>
                  </View>
                )}
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

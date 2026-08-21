import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { Preset } from '../layers/presets/presetSchema';
import { SectorDefinition, resolveSectors } from '../layers/sectors/resolveSectors';
import { FixedObjectDefinition, placeFixedObjects } from '../layers/fixedObjects/placeFixedObjects';
import { UsableArea } from '../layers/margins/marginPresets';
import { ContentSection, ContentRecord } from '../layers/records/recordTypes';

interface CardFaceProps {
  preset: Preset;
  sectors: SectorDefinition[];
  fixedObjects: FixedObjectDefinition[];
  sectionOrder: { sectorRole: string; sectionIds: string[] }[];
  sections: ContentSection[];
  /** Tamaño total de la CELDA (bleed box) en pt — el fondo blanco llega hasta acá */
  outerWidthPt: number;
  outerHeightPt: number;
  /** Área de contenido segura (post sangrado + margen), donde vive el texto real */
  usable: UsableArea;
}

/**
 * Dibuja UNA cara de una tarjeta (frente o dorso) reusando las mismas Capas 2
 * y 3 (sectores + objetos fijos) que usa el CV — la única diferencia real
 * entre un CV y una tarjeta es qué `ContentRecord.kind` se dibuja adentro,
 * no cómo se calcula la geometría.
 */
export function CardFace({ preset, sectors, fixedObjects, sectionOrder, sections, outerWidthPt, outerHeightPt, usable }: CardFaceProps) {
  const resolvedSectors = resolveSectors(usable, sectors);
  const sectorsWithFlow = placeFixedObjects(resolvedSectors, fixedObjects);

  const renderRecord = (rec: ContentRecord) => {
    const f = rec.fields;

    if (rec.kind === 'card-heading') {
      return (
        <View key={rec.id} style={{ marginBottom: 3 }}>
          <Text style={{ fontSize: preset.typography.title, fontFamily: 'Helvetica-Bold', color: preset.palette.text }}>
            {String(f.fullName || '')}
          </Text>
          {f.role ? (
            <Text style={{ fontSize: preset.typography.body, color: preset.palette.accent, marginTop: 2 }}>
              {String(f.role)}
            </Text>
          ) : null}
        </View>
      );
    }

    if (rec.kind === 'contact-item') {
      return (
        <View key={rec.id} style={{ marginTop: 6 }}>
          {f.phone ? <Text style={{ fontSize: preset.typography.caption, color: preset.palette.secondary, marginBottom: 1 }}>{String(f.phone)}</Text> : null}
          {f.email ? <Text style={{ fontSize: preset.typography.caption, color: preset.palette.secondary, marginBottom: 1 }}>{String(f.email)}</Text> : null}
          {f.address ? <Text style={{ fontSize: preset.typography.caption, color: preset.palette.secondary }}>{String(f.address)}</Text> : null}
        </View>
      );
    }

    return null;
  };

  return (
    <View style={{ width: outerWidthPt, height: outerHeightPt, backgroundColor: '#ffffff' }}>
      {sectorsWithFlow.map((sFlow) => {
        const sectorSectionIds = sectionOrder.find(s => s.sectorRole === sFlow.sector.role)?.sectionIds || [];
        const sectorSections = sections.filter(sec => sectorSectionIds.includes(sec.id));

        return (
          <View
            key={sFlow.sector.id}
            style={{
              position: 'absolute',
              // El offset del sector es relativo al ÁREA ÚTIL (post sangrado + margen),
              // por eso se le suma el inset de márgenes para ubicarlo dentro de la celda completa.
              left: usable.margins.leftPt + sFlow.sector.box.xPt,
              top: usable.margins.topPt + sFlow.sector.box.yPt,
              width: sFlow.sector.box.widthPt,
              height: sFlow.sector.box.heightPt,
              justifyContent: 'center'
            }}
          >
            {sectorSections.map((sec) => (
              <View key={sec.id}>{sec.records.map((rec) => renderRecord(rec))}</View>
            ))}

            {sFlow.fixedObjects.map((obj) =>
              obj.type === 'decorative-line' ? (
                <View
                  key={obj.id}
                  style={{
                    position: 'absolute',
                    left: obj.box.xPt,
                    top: obj.box.yPt,
                    width: obj.box.widthPt,
                    height: obj.box.heightPt,
                    backgroundColor: preset.palette.accent
                  }}
                />
              ) : null
            )}
          </View>
        );
      })}
    </View>
  );
}

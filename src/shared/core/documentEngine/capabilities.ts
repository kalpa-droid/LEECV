// src/shared/core/documentEngine/capabilities.ts
//
// Cada "capacidad" es una pieza de funcionalidad independiente y reutilizable:
// sabe renderizar su propio panel de configuración y sabe leer/escribir su
// propio slice de datos. No sabe nada de qué TIPO de documento la está usando
// — por eso el Currículum y la Tarjeta Personal pueden compartir la misma
// implementación de "color" sin que ese código exista dos veces.

export type CapabilityId =
  | 'theme_color'
  | 'typography'
  | 'paper_size'
  | 'section_order'
  | 'multi_page_pagination'
  | 'qr_code'
  | 'logo_upload'
  | 'certificates';

export interface Capability<TData = unknown> {
  id: CapabilityId;
  label: string;               // nombre mostrado en el panel de edición
  defaultData: TData;
  // Componente de configuración: recibe los datos de ESTA capacidad
  // únicamente, nunca el documento entero. Así es reusable sin importar
  // qué otro dato tenga el documento que la usa.
  ConfigPanel: React.ComponentType<{ data: TData; onChange: (next: TData) => void }>;
}

const DummyPanel: React.ComponentType<{ data: any; onChange: (next: any) => void }> = () => null;

const ThemeColorPanel = DummyPanel;
const TypographyPanel = DummyPanel;
const PaperSizePanel = DummyPanel;
const SectionOrderPanel = DummyPanel;
const QrCodePanel = DummyPanel;
const LogoUploadPanel = DummyPanel;
const CertificatesPanel = DummyPanel;

// El núcleo de capacidades vive en UN SOLO lugar. Se importa, nunca se copia.
export const CAPABILITY_REGISTRY: Record<CapabilityId, Capability<any>> = {
  theme_color: {
    id: 'theme_color',
    label: 'Color y tema',
    defaultData: { presetId: 'navy-executive', primaryColor: '#0f172a' },
    ConfigPanel: ThemeColorPanel,
  },
  typography: {
    id: 'typography',
    label: 'Tipografía',
    defaultData: { fontFamily: 'Inter' },
    ConfigPanel: TypographyPanel,
  },
  paper_size: {
    id: 'paper_size',
    label: 'Tamaño de página',
    defaultData: { paperSize: 'a4' },
    ConfigPanel: PaperSizePanel,
  },
  section_order: {
    id: 'section_order',
    label: 'Orden de secciones',
    defaultData: { left: [], right: [] },
    ConfigPanel: SectionOrderPanel,
  },
  multi_page_pagination: {
    id: 'multi_page_pagination',
    label: 'Paginación (varias hojas)',
    defaultData: {},
    ConfigPanel: () => null, // no tiene panel propio, solo activa el motor de páginas
  },
  qr_code: {
    id: 'qr_code',
    label: 'Código QR',
    defaultData: { url: '', size: 'md' },
    ConfigPanel: QrCodePanel,
  },
  logo_upload: {
    id: 'logo_upload',
    label: 'Logo',
    defaultData: { imageUrl: null },
    ConfigPanel: LogoUploadPanel,
  },
  certificates: {
    id: 'certificates',
    label: 'Certificados escaneados',
    defaultData: { items: [] },
    ConfigPanel: CertificatesPanel,
  },
};

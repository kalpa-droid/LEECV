import { hasCapability, getDocumentTypeConfig } from '../../capabilities/capabilityRegistry';

export const capabilitiesGate = {
  canPublish: (docType: string) => hasCapability(docType, 'web_publish'),
  canVersionByJob: (docType: string) => hasCapability(docType, 'job_versioning'),
  isNameable: (docType: string) => hasCapability(docType, 'nameable_title'),
  canBackupCloud: (docType: string) => hasCapability(docType, 'cloud_backup'),
  getDocName: (docType: string) => getDocumentTypeConfig(docType).name
};

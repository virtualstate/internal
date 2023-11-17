export interface FormMetaData extends Record<string, unknown> {}

export interface FormMeta extends FormMetaData {
  formMetaId: string;
  userId?: string;
  partnerId?: string;
  createdAt: string;
  updatedAt: string;
}

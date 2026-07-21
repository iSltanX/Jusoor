/**
 * معرفات المجال — سلاسل موسومة (branded strings) تمنع خلط أنواع المعرفات المختلفة
 * وقت الترجمة (تمرير معرف صفحة مكان معرف مساحة، مثلًا).
 *
 * التوليد الفعلي (crypto.randomUUID) مسؤولية app/ لا core/ — هذا الملف يعرّف الشكل
 * فقط ويتيح تسمية سلسلة مولَّدة خارجه. الرابط ليس معرّفًا؛ فقد تظهر الصفحة نفسها
 * في أكثر من مساحة أو أكثر من سياق — انظر docs/decisions/0009-data-model.md
 */

export type WorkspaceId = string & { readonly __brand: 'WorkspaceId' }
export type SavedPageId = string & { readonly __brand: 'SavedPageId' }
export type PageNoteId = string & { readonly __brand: 'PageNoteId' }

/** يسمّي سلسلة مولَّدة خارج core/ بوصفها معرّف مساحة عمل. */
export function asWorkspaceId(value: string): WorkspaceId {
  return value as WorkspaceId
}

/** يسمّي سلسلة مولَّدة خارج core/ بوصفها معرّف صفحة محفوظة. */
export function asSavedPageId(value: string): SavedPageId {
  return value as SavedPageId
}

/** يسمّي سلسلة مولَّدة خارج core/ بوصفها معرّف ملاحظة. */
export function asPageNoteId(value: string): PageNoteId {
  return value as PageNoteId
}

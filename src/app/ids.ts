/**
 * توليد معرفات المجال، محقون صراحة في كل حالة استخدام تحتاجه.
 *
 * core/ids.ts يعرّف شكل المعرفات (WorkspaceId إلخ) ويتيح تسمية سلسلة مولَّدة
 * خارجه فقط، ولا يولّد شيئًا بنفسه. app/ لا يستدعي crypto.randomUUID() مباشرة
 * داخل حالات الاستخدام؛ كل حالة استخدام تحتاج معرّفًا جديدًا تستقبل IdGenerator
 * كوسيط، فتُختبر بقيم ثابتة قابلة للتنبؤ دون عشوائية حقيقية.
 *
 * تطبيق حقيقي (crypto.randomUUID()) يُبنى لاحقًا خارج core/وapp/ — في
 * src/browser/ أو مكافئه — ولا يُربط بأي نقطة دخول في هذه المرحلة.
 */

import type { PageNoteId, SavedPageId, WorkspaceId } from '../core/ids'

export interface IdGenerator {
  workspaceId(): WorkspaceId
  savedPageId(): SavedPageId
  pageNoteId(): PageNoteId
}

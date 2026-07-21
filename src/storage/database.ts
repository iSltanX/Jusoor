/**
 * افتتاح قاعدة بيانات جُسور.
 *
 * الإصدار 2 يضيف أول مخطط فعلي: مخزنا المساحات والصفحات. الإصدار 1 يبقى كما
 * صدر — فارغًا بلا مخازن — ولا يُعدَّل الآن بعد نشره لمستخدمين محتملين؛
 * التصحيح يكون بترحيلة جديدة لاحقة لا بتعديل ترحيلة قائمة.
 *
 * لا مخزن مستقل للملاحظات: PageNote مضمَّنة داخل SavedPage.notes، لا كيان
 * مستقل — القرار معتمد في docs/decisions/0009-data-model.md وcore/page.ts.
 */

export const DATABASE_NAME = 'jusoor'
export const DATABASE_VERSION = 2

/** أسماء المخازن والفهارس — مصدر واحد يستهلكه كل من database.ts وملفات المستودعات. */
export const WORKSPACES_STORE = 'workspaces'
export const SAVED_PAGES_STORE = 'savedPages'
export const SAVED_PAGES_BY_WORKSPACE_INDEX = 'by-workspace'

/**
 * ترحيلات المخطط، مفهرسة بالإصدار الذي تنتقل إليه.
 *
 * تُطبَّق بالتسلسل من oldVersion+1 حتى الإصدار الحالي، فيمر القفز من أي إصدار
 * سابق بكل الترحيلات الوسيطة تلقائيًا. لا تُعدَّل ترحيلة صدرت للمستخدمين.
 */
const MIGRATIONS: Record<number, (db: IDBDatabase) => void> = {
  1: () => {
    // مقصود: لا مخازن في مرحلة التأسيس.
  },
  2: (db) => {
    db.createObjectStore(WORKSPACES_STORE, { keyPath: 'id' })

    /*
     * فهرس واحد غير مركّب على workspaceId يكفي استعلامَي هذه المرحلة معًا:
     * سرد صفحات مساحة، واكتشاف التكرار داخلها. كلاهما يجلب صفحات المساحة عبر
     * هذا الفهرس ثم يرتب أو يصفّي في الذاكرة — العدد المتوقع لكل مساحة صغير
     * (عشرات إلى مئات)، فلا حاجة إلى فهرس مركّب أو IDBKeyRange الآن.
     */
    const savedPages = db.createObjectStore(SAVED_PAGES_STORE, { keyPath: 'id' })
    savedPages.createIndex(SAVED_PAGES_BY_WORKSPACE_INDEX, 'workspaceId', { unique: false })
  },
}

/** يفتح القاعدة ويطبّق الترحيلات الناقصة عند الحاجة. */
export function openDatabase(
  indexedDBFactory: IDBFactory = indexedDB,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDBFactory.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = (event) => {
      const db = request.result
      const from = event.oldVersion

      for (let version = from + 1; version <= DATABASE_VERSION; version += 1) {
        MIGRATIONS[version]?.(db)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('تعذر فتح قاعدة البيانات.'))
    request.onblocked = () =>
      reject(new Error('فتح قاعدة البيانات محجوب بجلسة أخرى مفتوحة.'))
  })
}

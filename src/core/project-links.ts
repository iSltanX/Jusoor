/**
 * روابط المشروع العامة — المصدر المركزي الوحيد.
 *
 * تُستهلك في صفحة «حول» وحدها، وتُفتح بنقرة صريحة من المستخدم في تبويب جديد.
 * هذه روابط تنقّل لا موارد: لا شيء منها يُحمَّل داخل صفحات الإضافة، ومنع
 * الاتصال وقت التشغيل (`connect-src 'none'`) باقٍ كما هو — انظر
 * docs/decisions/0017-about-page-and-developer-credit.md
 *
 * الحساب من مالك المشروع، واسم المستودع من docs/repository.md («jusoor»).
 * **المستودع لم يُنشأ بعد وقت كتابة هذا الملف**؛ عند إنشائه باسم مغاير يُحدَّث
 * `REPOSITORY_URL` هنا وحده، ويتبعه كل ما اشتُق منه.
 *
 * حارس `tests/guards/developer-credit.test.ts` يثبت أن كل الروابط تحت الحساب
 * المعتمد وأن الاشتقاق لم ينحرف.
 */

/** حساب المطور المعتمد على GitHub. */
export const DEVELOPER_GITHUB_URL = 'https://github.com/iSltanX'

/** مستودع جُسور — الاسم المعتمد في docs/repository.md. */
export const REPOSITORY_URL = `${DEVELOPER_GITHUB_URL}/jusoor`

/** صفحة الإصدارات. */
export const RELEASES_URL = `${REPOSITORY_URL}/releases`

/** إنشاء بلاغ جديد مباشرة — لا الصفحة العامة للبلاغات. */
export const NEW_ISSUE_URL = `${REPOSITORY_URL}/issues/new`

/** سجل التغييرات كما هو في المستودع. */
export const CHANGELOG_URL = `${REPOSITORY_URL}/blob/main/CHANGELOG.md`

/**
 * قاموس نصوص الواجهة.
 *
 * نظام داخلي خفيف بلا تبعية خارجية: القاموسان مكتوبان يدويًا، والمفاتيح مطبَّعة،
 * وأي مفتاح ناقص في أي لغة يصبح خطأ وقت الفحص لا مفاجأة وقت التشغيل.
 *
 * `chrome.i18n` غير مستخدمة هنا لأنها تُحدَّد عند تحميل الإضافة ولا تتغير وقت التشغيل،
 * بينما دستور المنتج §12 يوجب تغيير لغة الواجهة يدويًا في أي وقت.
 *
 * هذه نصوص واجهة فقط. محتوى المستخدم لا يُترجم.
 */

import type { Language } from '../core/settings'

const ar = {
  'app.name': 'جُسور',
  'app.tagline': 'سياقك محفوظ',

  'popup.description': 'احفظ سياق عملك واستعده.',
  'popup.openSidePanel': 'فتح جُسور',
  'popup.openFailed': 'تعذر فتح اللوحة الجانبية.',

  'panel.loading': 'جارٍ التحميل…',

  'directory.title': 'مساحاتك',
  'directory.count': 'المساحات: {count}',
  'directory.create': 'مساحة جديدة',
  'directory.createFromTabs': 'مساحة من تبويبات النافذة',
  'directory.createEmpty': 'مساحة فارغة',
  'directory.pages': 'الصفحات: {count}',
  'directory.lastUsed': 'آخر مساحة',
  'directory.search': 'ابحث في مساحاتك',
  'directory.search.placeholder': 'اسم المساحة، أو هدفها، أو أين توقفت…',
  'directory.search.helper':
    'يبحث في الاسم والهدف والوصف والملاحظة العامة ونقطة التوقف والخطوة التالية.',
  'directory.search.results': 'المطابق: {count} من {total}',
  'directory.search.none.title': 'لا مساحة تطابق بحثك',
  'directory.search.none.body': 'جرّب كلمة أقل تحديدًا. لم يتغيّر شيء من مساحاتك.',
  'directory.search.clear': 'مسح البحث',

  'status.active': 'نشطة',
  'status.frozen': 'مجمدة',
  'status.archived': 'مؤرشفة',

  'newWorkspace.title': 'مساحة عمل جديدة',
  'newWorkspace.body': 'ابدأ بالاسم وحده، وأضف صفحاتها متى شئت.',
  'newWorkspace.submit': 'إنشاء',

  'workspace.name': 'اسم المساحة',
  'workspace.goal': 'الهدف أو السؤال',
  'workspace.lastReached': 'آخر ما وصلت إليه',
  'workspace.nextStep': 'الخطوة التالية',
  'workspace.lastReached.placeholder': 'أين توقفت؟ نتيجة مؤقتة، أو قيد لم يُحسم…',
  'workspace.nextStep.placeholder': 'ما أول ما ستفعله عند العودة؟',
  'workspace.checkpoint.title': 'نقطة التوقف',
  'workspace.checkpoint.empty': 'لم تسجّل بعد أين توقفت ولا ما الخطوة التالية.',
  'workspace.generalNote': 'ملاحظة عامة للمساحة',
  'workspace.generalNote.placeholder': 'ملاحظة تخص المهمة كلها لا صفحة بعينها…',
  'workspace.details': 'بيانات المساحة',
  'workspace.pages.title': 'الصفحات',
  'workspace.pages.empty': 'لا صفحات في هذه المساحة بعد.',
  'workspace.pages.add': 'إضافة صفحة',
  'workspace.pages.search': 'ابحث في الصفحات',
  'workspace.pages.search.placeholder': 'عنوان، أو رابط، أو سبب فتح، أو ملاحظة…',
  'workspace.pages.search.helper':
    'يبحث في العناوين والروابط وأسباب الفتح والوسوم ونصوص الملاحظات.',
  'workspace.pages.organize': 'ترتيب وتصفية',
  'workspace.pages.organize.hide': 'إخفاء الترتيب والتصفية',
  'workspace.pages.shown': 'المعروض: {count} من {total}',
  'workspace.pages.none.title': 'لا صفحة تطابق ما اخترته',
  'workspace.pages.none.body':
    'وسّع البحث أو أعد المرشِّحات إلى الكل. لم تتغيّر أي صفحة ولم يُحذف شيء.',
  'workspace.pages.showAll': 'عرض كل الصفحات',
  'workspace.pages.reorderHint':
    'تحريك الصفحات متاح في العرض الكامل بالترتيب الأصلي، بلا بحث أو تصفية.',

  'sort.label': 'الترتيب',
  'sort.original': 'الترتيب الأصلي',
  'sort.added': 'الأحدث إضافةً',
  'sort.importance': 'الأساسية أولًا',

  'filter.all': 'الكل',
  'filter.progress': 'تصفية بحالة التقدم',
  'filter.role': 'تصفية بالدور',
  'filter.withNotes': 'التي عليها ملاحظات وحدها',
  'workspace.corrupted.title': 'صفحات تعذّرت قراءتها',
  'workspace.corrupted.body': 'صفحات لم تُقرأ قراءة سليمة: {count}. لم تُحذف، ولا تظهر في القائمة.',
  'workspace.error.title': 'تعذّر فتح المساحة',
  'workspace.error.body': 'لم يكتمل فتح التخزين المحلي. لم يتغير شيء من بياناتك.',
  'workspace.saveFailed.title': 'تعذّر الحفظ',
  'workspace.saveFailed.body': 'لم يُحفظ التغيير. ما كتبته باقٍ كما هو.',

  'action.save': 'حفظ',
  'action.saving': 'جارٍ الحفظ…',
  'action.edit': 'تحرير',
  'action.done': 'تم',
  'action.retry': 'إعادة المحاولة',
  'action.back': 'رجوع',
  'action.delete': 'حذف',
  'action.moveUp': 'تحريك لأعلى',
  'action.moveDown': 'تحريك لأسفل',

  'page.details': 'تفاصيل الصفحة',
  'page.title': 'العنوان',
  'page.url': 'الرابط',
  'page.reason': 'سبب الفتح',
  'page.reason.placeholder': 'لماذا فتحت هذه الصفحة؟',
  'page.progress': 'حالة التقدم',
  'page.role': 'دور الصفحة',
  'page.role.none': 'لم يُصنَّف بعد',
  'page.labels': 'وسوم',
  'page.labels.optional': 'اختياري',
  'page.labels.placeholder': 'مهمة، أعود إليها لاحقًا',
  'page.labels.helper': 'افصل بين الوسوم بفاصلة.',
  'page.addedAt': 'أُضيفت',
  'page.updatedAt': 'آخر تعديل',
  'page.notes.title': 'ملاحظات الصفحة',
  'page.notes.empty': 'لا ملاحظات على هذه الصفحة بعد.',
  'page.notes.add': 'إضافة ملاحظة',
  'page.notes.placeholder': 'ما الذي تريد تذكّره عن هذه الصفحة؟',
  'page.notes.saveNote': 'حفظ الملاحظة',
  'page.notes.count': 'ملاحظات: {count}',
  'page.highlight.title': 'التظليل غير منفَّذ بعد',
  'page.highlight.body':
    'الملاحظة نص تكتبه أنت. أما التظليل — نص تقتطعه من الصفحة نفسها — فقدرة مستقلة لم تُنفَّذ بعد.',

  'progress.not-started': 'لم تبدأ',
  'progress.in-progress': 'قيد العمل',
  'progress.paused': 'متوقفة مؤقتًا',
  'progress.complete': 'مكتملة',

  'role.primary': 'أساسية',
  'role.supporting': 'داعمة',
  'role.verify': 'تحتاج تحقق',
  'role.excluded': 'مستبعدة',

  'addPage.title': 'إضافة صفحة',
  'addPage.fromCurrent': 'الصفحة المفتوحة الآن',
  'addPage.readCurrent': 'قراءة الصفحة المفتوحة',
  'addPage.manual': 'أو أدخل الرابط بنفسك',
  'addPage.url.helper': 'الرابط الكامل كما يظهر في شريط العنوان.',
  'addPage.submit': 'إضافة إلى المساحة',
  'addPage.capture.title': 'تعذّرت قراءة الصفحة المفتوحة',
  'addPage.capture.missingUrl':
    'لم يصل رابط التبويب الحالي. امنح جُسور إذن قراءة التبويبات، أو أدخل الرابط بنفسك أدناه.',
  'addPage.capture.missingTitle':
    'لم يصل عنوان التبويب الحالي. امنح جُسور إذن قراءة التبويبات، أو أدخل العنوان بنفسك أدناه.',
  'addPage.capture.noTab': 'لا تبويب مناسب في هذه النافذة. يمكنك إدخال الرابط بنفسك أدناه.',
  'addPage.capture.apiError': 'لم يستجب المتصفح. يمكنك إعادة المحاولة أو إدخال الرابط بنفسك.',
  'addPage.capture.grant': 'السماح بقراءة التبويبات',
  'addPage.linkKind.title': 'رابط خارج صفحات الويب المعتادة',
  'addPage.linkKind.body':
    'سيُحفظ الرابط والعنوان كما هما. جُسور لا يصل إلى محتوى هذا النوع من الصفحات.',

  'freeze.action': 'تجميد المساحة',
  'freeze.title': 'تجميد المساحة',
  'freeze.body': 'تُحفظ حالة المساحة وصفحاتها وترتيبها وملاحظاتها. يمكنك تسجيل أين توقفت قبل التجميد.',
  'freeze.closeTabs': 'إغلاق تبويبات هذه المساحة بعد التجميد',
  'freeze.closeTabs.helper': 'تُغلق التبويبات المفتوحة التي تطابق روابط هذه المساحة وحدها.',
  'freeze.closeTabs.needsPermission':
    'يحتاج إغلاق التبويبات إذن قراءتها ليعرف جُسور أيّها يخص هذه المساحة. بدونه يبقى التجميد وحده متاحًا.',
  'freeze.submit': 'تجميد',
  'freeze.submitAndClose': 'تجميد وإغلاق التبويبات',
  'freeze.done.title': 'جُمِّدت المساحة',
  'freeze.done.closed': 'التبويبات المغلقة: {count}',
  'freeze.done.notClosed.title': 'جُمِّدت المساحة، ولم تُغلق التبويبات',
  'freeze.done.notClosed.body':
    'الحالة محفوظة كاملة. تعذّر تمييز تبويبات المساحة لغياب إذن قراءة التبويبات.',
  'freeze.done.closeFailed.body': 'الحالة محفوظة كاملة. لم يستجب المتصفح لطلب إغلاق التبويبات.',

  'return.title': 'العودة إلى المهمة',
  'return.remaining': 'ما بقي',
  'return.remaining.count': 'صفحات لم تكتمل: {count}',
  'return.remaining.none': 'كل الصفحات مكتملة.',
  'return.important': 'صفحات أساسية: {count}',
  'return.lastWorked': 'آخر عمل',
  'return.choose': 'اختر ما تفتحه',
  'return.selectAll': 'اختيار الكل',
  'return.selectRemaining': 'اختيار غير المكتملة',
  'return.clear': 'إلغاء الاختيار',
  'return.selected': 'المختار: {count} من {total}',
  'return.open': 'فتح الصفحات المختارة',
  'return.opening': 'جارٍ الفتح…',
  'return.skip': 'عرض المساحة دون فتح',
  'return.many.title': 'عدد الصفحات كبير',
  'return.many.body':
    'اخترت {count} صفحة. فتحها كلها دفعة واحدة قد يثقل المتصفح؛ يمكنك اختيار ما تحتاجه الآن وفتح الباقي لاحقًا.',
  'return.result.title': 'نتيجة الفتح',
  'return.result.opened': 'فُتحت: {count}',
  'return.result.unavailable': 'تعذّر فتحها: {count}',
  'return.result.note': 'فتح التبويب ليس استعادة لموضع القراءة؛ موضع القراءة غير محفوظ في هذه النسخة.',
  'return.continue': 'المتابعة إلى المساحة',

  'tabStatus.opened': 'فُتحت',
  'tabStatus.unavailable': 'تعذّر فتحها',
  'tabStatus.not-attempted': 'لم تُفتح',
  'tabStatus.opening': 'جارٍ الفتح',

  'duplicate.title': 'هذا الرابط موجود في المساحة',
  'duplicate.body': 'ظهر الرابط نفسه في صفحات محفوظة ({count}). لا يُدمج ولا يُحذف؛ القرار لك.',
  'duplicate.goToExisting': 'الانتقال إلى النسخة الموجودة',
  'duplicate.addCopy': 'إضافة نسخة أخرى',
  'duplicate.updateExisting': 'تحديث بيانات النسخة الموجودة',
  'directory.corrupted.title': 'سجلات تعذّرت قراءتها',
  'directory.corrupted.body':
    'سجلات لم تُقرأ قراءة سليمة: {count}. لم تُحذف، ولا تظهر في القائمة أعلاه.',
  'directory.error.title': 'تعذّر عرض المساحات',
  'directory.error.body': 'لم يكتمل فتح التخزين المحلي. لم يتغير شيء من بياناتك.',
  'directory.retry': 'إعادة المحاولة',

  'empty.title': 'ابدأ أول مساحة عمل',
  'empty.body':
    'جُسور يحفظ سياق عملك لا تبويباتك وحدها: الصفحات التي اخترتها، وسبب فتحها، وأين توقفت.',
  'empty.action': 'إنشاء مساحة من تبويبات النافذة',

  'permission.title': 'قراءة تبويبات هذه النافذة',
  'permission.body':
    'لعرض تبويبات النافذة لتختار منها، يحتاج جُسور إذنًا بقراءة عناوينها وروابطها. لا يُقرأ محتوى الصفحات، ولا يُرسل شيء خارج جهازك.',
  'permission.grant': 'السماح بقراءة التبويبات',
  'permission.denied.title': 'لم يُمنح الإذن',
  'permission.denied.body':
    'يمكنك المحاولة مجددًا متى شئت. بقية جُسور تعمل كما هي دون هذا الإذن.',
  'permission.retry': 'المحاولة مجددًا',

  'tabs.loading': 'جارٍ قراءة تبويبات النافذة…',
  'tabs.error.title': 'تعذّرت قراءة التبويبات',
  'tabs.error.body': 'لم يستجب المتصفح لطلب قراءة التبويبات. لم يُحفظ شيء.',
  'tabs.retry': 'إعادة المحاولة',
  'tabs.heading': 'اختر التبويبات',
  'tabs.listLabel': 'تبويبات النافذة الحالية',
  'tabs.selectAll': 'اختيار الكل',
  'tabs.clearSelection': 'إلغاء الاختيار',
  'tabs.selectedCount': 'المختار: {count} من {total}',
  'tabs.active': 'التبويب النشط',
  'tabs.unavailable.title': 'تبويبات لا يمكن حفظها',
  'tabs.unavailable.body':
    'تبويبات تعذّر حفظها لعدم توفر رابطها أو عنوانها: {count}. لا تظهر في القائمة أعلاه.',
  'tabs.empty.title': 'لا تبويبات يمكن حفظها',
  'tabs.empty.body': 'لم يتوفر في هذه النافذة تبويب برابط وعنوان يمكن حفظهما.',

  'form.name.label': 'اسم المساحة',
  'form.name.placeholder': 'مثال: مقارنة أطر الخصوصية',
  'form.name.error': 'اكتب اسمًا للمساحة.',
  'form.goal.label': 'الهدف أو السؤال',
  'form.goal.optional': 'اختياري',
  'form.goal.placeholder': 'ما الذي تحاول الوصول إليه؟',
  'form.selection.error': 'اختر تبويبًا واحدًا على الأقل.',
  'form.submit': 'إنشاء المساحة',
  'form.cancel': 'إلغاء',

  'duplicates.title': 'روابط متكررة في اختيارك',
  'duplicates.body':
    'ظهر الرابط نفسه أكثر من مرة ضمن ما اخترته (مجموعات متطابقة: {count}). جُسور لا يدمج المتكرر ولا يحذفه؛ القرار لك.',
  'duplicates.back': 'العودة إلى الاختيار',
  'duplicates.saveAll': 'حفظ النسخ جميعًا',

  'creating.status': 'جارٍ إنشاء المساحة…',
  'create.error.title': 'تعذّر إنشاء المساحة',
  'create.error.body': 'لم تُحفظ المساحة ولا أي صفحة منها. اختيارك وما كتبته محفوظان.',
  'create.retry': 'إعادة المحاولة',

  'success.title': 'أُنشئت المساحة',
  'success.pages': 'الصفحات المحفوظة: {count}',
  'success.goal': 'الهدف',
  'success.open': 'فتح المساحة',

  'workspace.placeholder.title': 'شاشة المساحة قيد الإنشاء',
  'workspace.placeholder.body':
    'حُفظت المساحة وصفحاتها. عرض الصفحات وإدارتها وتجميدها واستعادتها لم تُنفَّذ بعد.',
  'workspace.back': 'العودة إلى المساحات',

  // ===== منشئ السياق — §9.6 و§9.7 و§9.8 =====

  'context.action': 'نسخ السياق',
  'context.title': 'منشئ السياق',
  'context.body':
    'يرتّب جُسور ما تختاره في نص واضح تراجعه ثم تنسخه بنفسك. لا يُرسل شيء إلى أي خدمة، ولا يُنفَّذ الطلب هنا.',

  'context.level': 'مستوى التفصيل',
  'context.level.brief': 'مختصر',
  'context.level.medium': 'متوسط',
  'context.level.detailed': 'مفصّل',
  'context.level.brief.hint':
    'الهدف، والصفحات، وملاحظات الصفحات الأساسية وحدها، ونقطة التوقف.',
  'context.level.medium.hint': 'يضيف الوصف والملاحظة العامة وأسباب الفتح وحالات التقدم.',
  'context.level.detailed.hint': 'كل ما اخترته بتفاصيله، ومنه أدوار الصفحات وكل الملاحظات.',
  'context.level.note': 'الاختصار يقلّل أنواع البيانات المضمّنة، ولا يعيد صياغة نصك.',

  'context.template': 'قالب الطلب',
  'context.template.research': 'بحث',
  'context.template.debug': 'مراجعة مشكلة تطويرية',
  'context.template.summarize': 'تلخيص',
  'context.template.compare': 'مقارنة',
  'context.template.continue': 'استكمال العمل',
  'context.template.apply': 'استخدام القالب',
  'context.request': 'نص المطلوب',
  'context.request.placeholder': 'ما الذي تريده من الجهة التي ستلصق لها هذا السياق؟',
  'context.request.helper': 'القالب نقطة بدء لا إجابة وحيدة؛ عدّله كما تشاء قبل النسخ.',

  'context.include': 'أنواع البيانات المضمّنة',
  'context.include.goal': 'الهدف أو السؤال',
  'context.include.description': 'وصف المهمة',
  'context.include.generalNote': 'الملاحظة العامة',
  'context.include.checkpoint': 'نقطة التوقف والخطوة التالية',
  'context.include.pages': 'الصفحات',
  'context.include.reasons': 'أسباب الفتح',
  'context.include.progress': 'حالات التقدم',
  'context.include.roles': 'أدوار الصفحات',
  'context.include.notes': 'الملاحظات',
  'context.include.request': 'المطلوب',

  'context.pages.choose': 'الصفحات المضمّنة',
  'context.pages.selectAll': 'اختيار الكل',
  'context.pages.clear': 'إلغاء الاختيار',
  'context.pages.selected': 'المختار: {count} من {total}',
  'context.pages.none': 'لم تختر صفحة بعد.',
  'context.pages.moveUp': 'تقديم الصفحة في السياق',
  'context.pages.moveDown': 'تأخير الصفحة في السياق',
  'context.pages.reorderHint': 'ترتيبك هنا يخص النص المنسوخ وحده، ولا يغيّر ترتيب المساحة.',

  'context.headingLanguage': 'لغة العناوين',
  'context.headingLanguage.ui': 'كلغة الواجهة',
  'context.headingLanguage.note': 'تُترجم العناوين والقالب فقط؛ نصك وعناوين المصادر تبقى بلغتها.',

  'context.linkDisplay': 'عرض الروابط',
  'context.linkDisplay.title-and-url': 'العنوان والرابط',
  'context.linkDisplay.title-only': 'العنوان وحده',
  'context.linkDisplay.url-only': 'الرابط وحده',

  'context.privacy.title': 'راجع النص قبل نسخه',
  'context.privacy.body':
    'قد يحتوي هذا النص على روابط خاصة، أو معلومات مشروع، أو ملاحظات شخصية، أو رسائل خطأ، أو أسماء مستودعات، أو مقتطفات داخلية. أنت من يقرر ما ينسخ وأين يلصقه.',

  'context.counts': 'الصفحات: {pages} · الملاحظات: {notes} · الحروف: {characters} · الكلمات: {words}',
  'context.large.title': 'النص طويل',
  'context.large.body':
    'يمكنك تقليل الصفحات المختارة، أو الاكتفاء بالملاحظات، أو نسخ جزء محدد. جُسور لا يفترض حدًا ثابتًا لأي تطبيق.',
  'context.split': 'تقسيم إلى أجزاء مرقّمة',
  'context.split.parts': 'الأجزاء: {count}',

  'context.preview': 'المعاينة',
  'context.preview.empty': 'لا شيء مضمَّن بعد. اختر نوع بيانات واحدًا على الأقل.',
  'context.preview.hint': 'النص قابل للتحديد والنسخ يدويًا أيضًا.',
  'context.copy': 'نسخ النص',
  'context.copy.part': 'نسخ الجزء {index}',
  'context.copied': 'نُسخ',
  'context.copy.failed.title': 'تعذّر النسخ إلى الحافظة',
  'context.copy.failed.body': 'لم يمنح المتصفح إذن الكتابة في الحافظة. النص أعلاه كامل، ويمكنك تحديده ونسخه يدويًا.',

  // ===== التصدير والاستيراد — §9.9 و§9.10 =====

  'transfer.export.action': 'تصدير',
  'transfer.export.title': 'تصدير المساحة',
  'transfer.export.body':
    'ملف مستقل يُحفظ على جهازك. بلا خادم ولا حساب ولا رابط سحابي.',
  'transfer.format': 'الصيغة',
  'transfer.format.json': 'JSON',
  'transfer.format.text': 'نص عادي',
  'transfer.format.markdown': 'Markdown',
  'transfer.format.json.hint':
    'صيغة النقل والنسخ الاحتياطي: كاملة وقابلة للاستيراد مرة أخرى.',
  'transfer.format.readable.hint':
    'للقراءة والمشاركة. تتبع خيارات التضمين، ولذلك لا تصلح نسخةً احتياطية ولا تُستورد.',
  'transfer.export.download': 'تنزيل الملف',
  'transfer.export.copy': 'نسخ النص',
  'transfer.export.copied': 'نُسخ',
  'transfer.export.counts': 'المساحات: {workspaces} · الصفحات: {pages}',
  'transfer.export.failed.title': 'تعذّر تنزيل الملف',
  'transfer.export.failed.body': 'لم يبدأ المتصفح التنزيل. النص أعلاه كامل ويمكنك نسخه يدويًا.',
  'transfer.export.error.title': 'تعذّر تجهيز الملف',
  'transfer.export.error.body': 'لم يكتمل قراءة بياناتك. لم يتغيّر شيء منها.',

  'transfer.backup.title': 'النسخ الاحتياطي',
  'transfer.backup.body':
    'صدّر كل مساحاتك في ملف واحد، أو استعد نسخة سابقة. حذف بيانات المتصفح أو الإضافة قد يفقد ما لم تصدّره.',
  'transfer.backup.exportAll': 'تصدير كل المساحات',
  'transfer.backup.corrupted':
    'سجلات تعذّرت قراءتها ولم تدخل الملف: {count}. نسختك غير شاملة لها.',

  'transfer.import.action': 'استيراد ملف',
  'transfer.import.title': 'استيراد',
  'transfer.import.body': 'يُفحص الملف بالكامل قبل كتابة أي شيء. لا يُوثق بأي ملف تلقائيًا.',
  'transfer.import.choose': 'اختر ملف JSON',
  'transfer.import.reading': 'جارٍ قراءة الملف…',
  'transfer.import.summary': 'في الملف — المساحات: {workspaces} · الصفحات: {pages}',
  'transfer.import.noConflicts': 'لا تعارض مع مساحاتك الحالية.',
  'transfer.import.conflicts.title': 'مساحات متعارضة: {count}',
  'transfer.import.conflicts.body':
    'تحمل الاسم أو المعرّف نفسه لمساحة عندك. اختر ما يُفعل بها؛ ينطبق اختيارك على المتعارضة كلها، وغير المتعارضة تُستورد كما هي.',
  'transfer.import.conflict.byId': 'المعرّف نفسه',
  'transfer.import.conflict.byName': 'الاسم نفسه',
  'transfer.import.resolution': 'ما يُفعل بالمتعارضة',
  'transfer.import.resolution.create-copy': 'إنشاء نسخة',
  'transfer.import.resolution.replace': 'الاستبدال',
  'transfer.import.resolution.merge-pages': 'دمج الصفحات غير المكررة',
  'transfer.import.resolution.cancel': 'إلغاء العملية',
  'transfer.import.resolution.create-copy.hint': 'مساحة جديدة، والقائمة لا تُمس.',
  'transfer.import.resolution.replace.hint':
    'تأخذ المساحة القائمة بيانات الواردة، وتُحذف صفحاتها القديمة.',
  'transfer.import.resolution.merge-pages.hint':
    'تبقى المساحة القائمة كما هي، وتُضاف الصفحات التي لا يطابق رابطها صفحةً فيها.',
  'transfer.import.resolution.cancel.hint': 'تُتجاوز المتعارضة، ولا يُكتب لها شيء.',
  'transfer.import.apply': 'تنفيذ الاستيراد',
  'transfer.import.applying': 'جارٍ الاستيراد…',
  'transfer.import.done.title': 'اكتمل الاستيراد',
  'transfer.import.done.body': 'المساحات المستوردة: {imported} · الصفحات: {pages}',
  'transfer.import.done.skipped': 'المساحات المتجاوَزة: {count}',
  'transfer.import.failed.title': 'تعذّر الاستيراد',
  'transfer.import.failed.body': 'لم تُكتب أي مساحة. بياناتك الحالية كما هي.',

  'transfer.reject.title': 'الملف مرفوض',
  'transfer.reject.not-json': 'الملف ليس JSON صالحًا.',
  'transfer.reject.not-an-object': 'محتوى الملف ليس كائنًا.',
  'transfer.reject.unknown-format': 'هذا ليس ملف جُسور.',
  'transfer.reject.unsupported-version': 'إصدار مخطط لا يعرفه هذا الإصدار من جُسور: {found}.',
  'transfer.reject.workspaces-not-a-list': 'قائمة المساحات في الملف ليست قائمة.',
  'transfer.reject.entry-not-an-object': 'المدخل رقم {workspace} في الملف ليس كائنًا.',
  'transfer.reject.pages-not-a-list': 'صفحات المساحة رقم {workspace} ليست قائمة.',
  'transfer.reject.invalid-workspace': 'المساحة رقم {workspace} غير سليمة (الحقل: {details}).',
  'transfer.reject.invalid-page':
    'الصفحة رقم {page} في المساحة رقم {workspace} غير سليمة (الحقل: {details}).',
  'transfer.reject.page-outside-workspace':
    'الصفحة رقم {page} في المساحة رقم {workspace} تشير إلى مساحة أخرى.',
  'transfer.reject.duplicate-page-id': 'معرّف صفحة مكرر في المساحة رقم {workspace}.',
  'transfer.reject.active-page-missing':
    'المساحة رقم {workspace} تشير إلى تبويب نشط لا وجود لصفحته في الملف.',
  'transfer.reject.unreadable': 'تعذّرت قراءة الملف.',

  // ===== أول تشغيل والإعدادات — الشاشتان الأخيرتان من الثماني (§11 هوية) =====

  'firstRun.title': 'أهلًا بك في جُسور',
  'firstRun.body':
    'جُسور يحفظ سياق عملك في المتصفح لا تبويباتك وحدها: الصفحات التي اخترتها، وسبب فتحها، وأين توقفت، وما الخطوة التالية.',
  'firstRun.privacy.title': 'بياناتك على جهازك',
  'firstRun.privacy.body':
    'كل شيء يُحفظ محليًا بلا حساب ولا خادم ولا مزامنة، ولا يُرسل شيء إلى أي خدمة. لهذا فحذف بيانات المتصفح أو إزالة الإضافة قد يفقد مساحاتك — صدّر نسخة احتياطية متى صار عملك مهمًا.',
  'firstRun.start': 'ابدأ',

  'settings.title': 'الإعدادات',
  'settings.action': 'فتح الإعدادات',
  'settings.language.note': 'تغيير لغة الواجهة لا يترجم أسماء صفحاتك ولا ملاحظاتك.',
  'settings.storage.title': 'التخزين',
  'settings.storage.body':
    'مساحاتك محفوظة على هذا الجهاز وحده. حذف بيانات المتصفح أو إزالة الإضافة قد يفقدها، والنسخ الاحتياطي في الشاشة الرئيسية.',

  'settings.language': 'اللغة',
  'settings.language.ar': 'العربية',
  'settings.language.en': 'English',
  'settings.language.auto': 'حسب المتصفح',

  'settings.theme': 'المظهر',
  'settings.theme.light': 'فاتح',
  'settings.theme.dark': 'داكن',
  'settings.theme.system': 'حسب النظام',

  'about.entry.title': 'حول جُسور',
  'about.entry.action': 'عرض التفاصيل',
  'about.description':
    'إضافة متصفح تحفظ سياق عملك لا تبويباتك وحدها، وتعيدك إلى نقطة توقفك وخطوتك التالية.',
  'about.version': 'الإصدار: {version}',
  'about.updates.title': 'التحديثات',
  'about.updates.body':
    'عند التثبيت من متجر Chrome أو Edge يحدّث المتصفح الإضافة تلقائيًا دون إجراء منك. يمكنك أيضًا طلب فحص فوري من المتصفح نفسه؛ جُسور لا يتصل بالشبكة مباشرة بأي حال.',
  'about.updates.check': 'التحقق من وجود تحديثات',
  'about.updates.checking': 'جارٍ التحقق…',
  'about.updates.upToDate': 'أنت تستخدم أحدث إصدار.',
  'about.updates.available': 'يتوفر تحديث إلى الإصدار {version}. يثبّته المتصفح تلقائيًا.',
  'about.updates.throttled': 'تعذّر التحقق الآن. حاول مرة أخرى بعد قليل.',
  'about.updates.releases': 'عرض أحدث إصدار',
  'about.updates.changelog': 'سجل التغييرات',
  'about.project.title': 'المشروع والدعم',
  'about.project.repository': 'مستودع جُسور على GitHub',
  'about.project.issue': 'الإبلاغ عن مشكلة',
  'about.credit.full': 'صُمّم وطُوّر بواسطة سلطان',
  'about.credit.rights': '© 2026 سلطان — جميع الحقوق محفوظة',
  'about.credit.github': 'المطور على GitHub',

  /*
   * ===== عناوين النص المنسوخ =====
   *
   * منفصلة عن نصوص الواجهة عمدًا: لغتها يختارها المستخدم مستقلةً عن لغة الواجهة
   * (§12)، فقد تُعرض الواجهة بالعربية ويُنسخ السياق بعناوين إنجليزية. تُترجم
   * العناوين والقالب فقط — محتوى المستخدم لا يُترجم أبدًا.
   */
  'contextLabel.workspace': 'مساحة العمل',
  'contextLabel.request': 'المطلوب',
  'contextLabel.goal': 'الهدف',
  'contextLabel.description': 'وصف المهمة',
  'contextLabel.generalNote': 'ملاحظة عامة',
  'contextLabel.lastReached': 'آخر ما وصلت إليه',
  'contextLabel.nextStep': 'الخطوة التالية',
  'contextLabel.pages': 'الصفحات',
  'contextLabel.reason': 'سبب الفتح',
  'contextLabel.progress': 'حالة التقدم',
  'contextLabel.role': 'الدور',
  'contextLabel.notes': 'ملاحظة',
  'contextLabel.part': 'الجزء {index} من {total}',

  /* نصوص القوالب الخمسة — بدايات قابلة للتحرير، لا إجابات صحيحة وحيدة (§9.7). */
  'contextTemplate.research':
    'أعمل على بحث، وسياقه أدناه. ساعدني في تنظيم ما جمعته، وبيان ما ينقصه، وما يحتاج تحققًا.',
  'contextTemplate.debug':
    'أواجه مشكلة تطويرية، وسياقها أدناه. راجع ما جربته، واقترح أسبابًا محتملة وخطوة تشخيص تالية.',
  'contextTemplate.summarize': 'لخّص السياق أدناه في نقاط قصيرة تحفظ التفاصيل المهمة.',
  'contextTemplate.compare':
    'قارن بين المصادر أدناه: نقاط الاتفاق، ونقاط الاختلاف، وما لا يكفي للحكم عليه.',
  'contextTemplate.continue':
    'توقفت عن هذا العمل وأريد استكماله. سياقه أدناه؛ اقترح كيف أبدأ من الخطوة التالية.',

  // ===== مرحلة التكامل التنفيذي للهوية — نصوص الشاشات المرجعية (القسم 07) =====

  'home.intro': 'عُد إلى حيث توقفت.',
  'home.intro.body': 'سياق عملك محفوظ على هذا الجهاز.',
  'home.local': 'محلي',
  'home.filter.label': 'تصفية المساحات بالحالة',
  'home.filter.all': 'الكل',
  'home.filter.none': 'لا مساحات بهذه الحالة.',
  'home.continue': 'متابعة العمل',
  'home.create': 'إنشاء مساحة',

  'card.open': 'افتح المساحة',
  'card.restore': 'استعد المساحة',
  'card.missingNext': 'لا توجد خطوة تالية بعد',
  'card.pages': 'صفحة',
  'card.unfinished': 'غير مكتملة',

  'template.general': 'عام',
  'template.research': 'بحثي',
  'template.development': 'تطويري',
  'template.general.hint': 'لأي سياق عمل',
  'template.research.hint': 'مصادر واقتباسات',
  'template.development.hint': 'مشكلات وتوثيق',

  'wizard.title': 'مساحة جديدة',
  'wizard.progress': 'تقدم الإنشاء',
  'wizard.step1.title': 'ما الذي تعمل عليه؟',
  'wizard.step1.body': 'الاسم والهدف يساعدانك على استعادة التفكير، لا التبويبات فقط.',
  'wizard.template': 'القالب',
  'wizard.step2.title': 'اختر الصفحات',
  'wizard.step2.body':
    'حدد ما ينتمي إلى هذا السياق من تبويبات النافذة. يمكنك المتابعة بلا صفحات وإضافتها لاحقًا.',
  'wizard.step3.title': 'راجع ما سيُحفظ',
  'wizard.step3.body': 'جُسور يحفظ البيانات محليًا على هذا الجهاز.',
  'wizard.review.identity': 'الاسم والهدف والقالب',
  'wizard.review.pages': 'الصفحات وروابطها: {count}',
  'wizard.review.local': 'لا مزامنة ولا حساب',
  'wizard.alert': 'لا نرسل محتوى الصفحات إلى أي خدمة.',
  'wizard.continue': 'متابعة',
  'wizard.back': 'السابق',
  'wizard.createAction': 'أنشئ المساحة',

  'ws.notes': 'ملاحظات',
  'ws.start': 'ابدأ',
  'ws.continueNext': 'تابع الخطوة',
  'filter.label': 'تصفية',

  'pageCard.latestNote': 'آخر ملاحظة',
  'pageCard.details': 'التفاصيل',
  'page.open': 'افتح الصفحة',

  'return.frozenAt': 'جُمّدت هذه المساحة {time}.',
  'return.next.open': 'افتح الصفحة الأساسية',
  'return.count.opened': 'فُتحت',
  'return.count.unavailable': 'تعذرت',
  'return.count.notRequested': 'لم تُطلب',
  'return.continue.work': 'متابعة العمل',

  'freeze.closeTabs.confirm.title': 'إغلاق تبويبات المساحة؟',
  'freeze.closeTabs.confirm.body':
    'ستُغلق التبويبات المفتوحة المطابقة لصفحات هذه المساحة بعد التجميد. صفحاتك وملاحظاتك تبقى محفوظة.',

  'context.template.none': 'بلا قالب',
  'context.open': 'فتح منشئ السياق',
  'context.builder.short': 'سياق',

  'page.pdf': 'PDF',
  'pageCard.toggle': 'توسيع بطاقة الصفحة',

  'page.remove': 'أزل الصفحة من المساحة',
  'page.remove.hint': 'حذف نهائي لهذه الصفحة وملاحظاتها. بقية بيانات المساحة لا تُمس.',
  'page.remove.confirm.title': 'إزالة الصفحة؟',
  'page.remove.confirm.body':
    'ستُحذف «{title}» وملاحظاتها ({notes}) من هذه المساحة نهائيًا. لا يمكن التراجع.',

  'workspace.delete': 'حذف المساحة',
  'workspace.delete.hint': 'حذف نهائي للمساحة وكل صفحاتها وملاحظاتها. لا يمكن التراجع.',
  'workspace.delete.confirm.title': 'حذف المساحة؟',
  'workspace.delete.confirm.body':
    'ستُحذف {pages} صفحة و{notes} ملاحظة نهائيًا. لا يمكن التراجع.',

  'delete.failed.title': 'تعذر الحذف',
  'delete.failed.body': 'لم يُحذف شيء؛ بياناتك كما هي. أعد المحاولة.',


  'settings.section.appearance': 'المظهر واللغة',
  'settings.section.permissions': 'الصلاحيات',
  'settings.section.data': 'البيانات',
  'settings.section.help': 'المساعدة',
  'settings.section.about': 'عن جُسور',
  'settings.permissions.tabs': 'صلاحية قراءة التبويبات',
  'settings.permissions.tabs.granted': 'ممنوحة',
  'settings.permissions.tabs.request': 'غير ممنوحة — انقر للطلب',
  'settings.permissions.tabs.note':
    'اختيارية: تُستخدم لإنشاء مساحة من تبويبات النافذة وإغلاق تبويبات المساحة عند التجميد. رفضها لا يعطّل جُسور.',
  'settings.export.hint': 'JSON محلي لكل المساحات',
  'settings.export.done': 'صُدّرت النسخة الاحتياطية',
  'settings.import.hint': 'من ملف نسخة احتياطية سابق',
  'settings.help.onboarding': 'شرح جُسور',
  'settings.help.onboarding.hint': 'إعادة عرض التعريف الأول',

  'onboarding.skip': 'تخطي',
  'onboarding.continue': 'متابعة',
  'onboarding.start': 'ابدأ',
  'onboarding.context.title': 'احفظ سياق العمل، لا التبويبات فقط.',
  'onboarding.context.body':
    'يجمع جُسور الصفحات والملاحظات وسبب الفتح وآخر ما وصلت إليه والخطوة التالية داخل مساحة واحدة.',
  'onboarding.local.title': 'بياناتك محلية.',
  'onboarding.local.body': 'لا حساب، ولا مزامنة، ولا ذكاء اصطناعي. لا نرسل سياقك إلى أي خدمة.',
  'onboarding.permission.title': 'صلاحية التبويبات اختيارية.',
  'onboarding.permission.body':
    'تُطلب صلاحية قراءة التبويبات فقط عند إنشاء مساحة من تبويباتك أو إغلاقها عند التجميد. رفضها لا يعطّل جُسور.',

  'tabStatus.opened.detail': 'فُتح التبويب في نافذتك.',
  'tabStatus.unavailable.detail': 'رفض المتصفح فتح هذا الرابط. بياناته محفوظة.',
  'tabStatus.not-attempted.detail': 'لم يُطلب فتح هذه الصفحة.',
  'tabStatus.opening.detail': 'جارٍ فتح التبويب…',
} as const

/** مفاتيح النصوص. مشتقة من القاموس العربي فيبقى القاموسان متطابقين إجباريًا. */
export type MessageKey = keyof typeof ar

const en: Record<MessageKey, string> = {
  'app.name': 'Jusoor',
  'app.tagline': 'Context preserved',

  'popup.description': 'Save and restore your working context.',
  'popup.openSidePanel': 'Open Jusoor',
  'popup.openFailed': 'Could not open the side panel.',

  'panel.loading': 'Loading…',

  'directory.title': 'Your workspaces',
  'directory.count': 'Workspaces: {count}',
  'directory.create': 'New workspace',
  'directory.createFromTabs': 'Workspace from window tabs',
  'directory.createEmpty': 'Empty workspace',
  'directory.pages': 'Pages: {count}',
  'directory.lastUsed': 'Last used',
  'directory.search': 'Search your workspaces',
  'directory.search.placeholder': 'A workspace name, its goal, or where you stopped…',
  'directory.search.helper':
    'Searches the name, goal, description, general note, stopping point, and next step.',
  'directory.search.results': 'Matching: {count} of {total}',
  'directory.search.none.title': 'No workspace matches your search',
  'directory.search.none.body': 'Try a less specific word. None of your workspaces changed.',
  'directory.search.clear': 'Clear search',

  'status.active': 'Active',
  'status.frozen': 'Frozen',
  'status.archived': 'Archived',

  'newWorkspace.title': 'New workspace',
  'newWorkspace.body': 'Start with a name alone, and add its pages whenever you like.',
  'newWorkspace.submit': 'Create',

  'workspace.name': 'Workspace name',
  'workspace.goal': 'Goal or question',
  'workspace.lastReached': 'Where you stopped',
  'workspace.nextStep': 'Next step',
  'workspace.lastReached.placeholder': 'Where did you stop? A partial result, an open question…',
  'workspace.nextStep.placeholder': 'What is the first thing you will do when you return?',
  'workspace.checkpoint.title': 'Stopping point',
  'workspace.checkpoint.empty': 'You have not recorded where you stopped or what comes next.',
  'workspace.generalNote': 'General note for the workspace',
  'workspace.generalNote.placeholder': 'A note about the whole task, not one page…',
  'workspace.details': 'Workspace details',
  'workspace.pages.title': 'Pages',
  'workspace.pages.empty': 'No pages in this workspace yet.',
  'workspace.pages.add': 'Add a page',
  'workspace.pages.search': 'Search the pages',
  'workspace.pages.search.placeholder': 'A title, link, reason for opening, or note…',
  'workspace.pages.search.helper':
    'Searches titles, links, reasons for opening, labels, and note text.',
  'workspace.pages.organize': 'Sort and filter',
  'workspace.pages.organize.hide': 'Hide sorting and filtering',
  'workspace.pages.shown': 'Showing: {count} of {total}',
  'workspace.pages.none.title': 'No page matches what you chose',
  'workspace.pages.none.body':
    'Widen the search or set the filters back to all. No page changed and nothing was deleted.',
  'workspace.pages.showAll': 'Show all pages',
  'workspace.pages.reorderHint':
    'Moving pages is available in the full view in original order, without search or filters.',

  'sort.label': 'Sort',
  'sort.original': 'Original order',
  'sort.added': 'Most recently added',
  'sort.importance': 'Primary pages first',

  'filter.all': 'All',
  'filter.progress': 'Filter by progress',
  'filter.role': 'Filter by role',
  'filter.withNotes': 'Only pages with notes',
  'workspace.corrupted.title': 'Pages that could not be read',
  'workspace.corrupted.body':
    'Pages that could not be read correctly: {count}. Nothing was deleted, and they are not listed.',
  'workspace.error.title': 'The workspace could not be opened',
  'workspace.error.body': 'Local storage did not finish opening. None of your data changed.',
  'workspace.saveFailed.title': 'Could not save',
  'workspace.saveFailed.body': 'The change was not saved. What you typed is kept.',

  'action.save': 'Save',
  'action.saving': 'Saving…',
  'action.edit': 'Edit',
  'action.done': 'Done',
  'action.retry': 'Try again',
  'action.back': 'Back',
  'action.delete': 'Delete',
  'action.moveUp': 'Move up',
  'action.moveDown': 'Move down',

  'page.details': 'Page details',
  'page.title': 'Title',
  'page.url': 'URL',
  'page.reason': 'Why it was opened',
  'page.reason.placeholder': 'Why did you open this page?',
  'page.progress': 'Progress',
  'page.role': 'Page role',
  'page.role.none': 'Not classified yet',
  'page.labels': 'Labels',
  'page.labels.optional': 'optional',
  'page.labels.placeholder': 'important, come back later',
  'page.labels.helper': 'Separate labels with a comma.',
  'page.addedAt': 'Added',
  'page.updatedAt': 'Last edited',
  'page.notes.title': 'Page notes',
  'page.notes.empty': 'No notes on this page yet.',
  'page.notes.add': 'Add a note',
  'page.notes.placeholder': 'What do you want to remember about this page?',
  'page.notes.saveNote': 'Save note',
  'page.notes.count': 'Notes: {count}',
  'page.highlight.title': 'Highlighting is not implemented yet',
  'page.highlight.body':
    'A note is text you write. Highlighting — text taken from the page itself — is a separate capability that is not built yet.',

  'progress.not-started': 'Not started',
  'progress.in-progress': 'In progress',
  'progress.paused': 'Paused',
  'progress.complete': 'Complete',

  'role.primary': 'Primary',
  'role.supporting': 'Supporting',
  'role.verify': 'Needs checking',
  'role.excluded': 'Excluded',

  'addPage.title': 'Add a page',
  'addPage.fromCurrent': 'The page open right now',
  'addPage.readCurrent': 'Read the open page',
  'addPage.manual': 'Or enter the URL yourself',
  'addPage.url.helper': 'The complete link as it appears in the address bar.',
  'addPage.submit': 'Add to workspace',
  'addPage.capture.title': 'The open page could not be read',
  'addPage.capture.missingUrl':
    'The current tab’s URL did not arrive. Grant Jusoor permission to read tabs, or enter the URL yourself below.',
  'addPage.capture.missingTitle':
    'The current tab’s title did not arrive. Grant Jusoor permission to read tabs, or enter the title yourself below.',
  'addPage.capture.noTab': 'No suitable tab in this window. You can enter the URL yourself below.',
  'addPage.capture.apiError':
    'The browser did not answer. You can try again or enter the URL yourself.',
  'addPage.capture.grant': 'Allow reading tabs',
  'addPage.linkKind.title': 'A link outside ordinary web pages',
  'addPage.linkKind.body':
    'The link and title will be saved as they are. Jusoor does not reach the content of this kind of page.',

  'freeze.action': 'Freeze workspace',
  'freeze.title': 'Freeze workspace',
  'freeze.body':
    'The workspace state, its pages, their order, and notes are saved. You can record where you stopped before freezing.',
  'freeze.closeTabs': 'Close this workspace’s tabs after freezing',
  'freeze.closeTabs.helper': 'Only open tabs matching this workspace’s links are closed.',
  'freeze.closeTabs.needsPermission':
    'Closing tabs needs permission to read them so Jusoor knows which belong to this workspace. Without it, freezing alone stays available.',
  'freeze.submit': 'Freeze',
  'freeze.submitAndClose': 'Freeze and close tabs',
  'freeze.done.title': 'Workspace frozen',
  'freeze.done.closed': 'Tabs closed: {count}',
  'freeze.done.notClosed.title': 'Workspace frozen; tabs were not closed',
  'freeze.done.notClosed.body':
    'The state is fully saved. This workspace’s tabs could not be identified without permission to read tabs.',
  'freeze.done.closeFailed.body':
    'The state is fully saved. The browser did not answer the request to close tabs.',

  'return.title': 'Returning to the task',
  'return.remaining': 'What remains',
  'return.remaining.count': 'Pages not complete: {count}',
  'return.remaining.none': 'All pages are complete.',
  'return.important': 'Primary pages: {count}',
  'return.lastWorked': 'Last worked',
  'return.choose': 'Choose what to open',
  'return.selectAll': 'Select all',
  'return.selectRemaining': 'Select the incomplete ones',
  'return.clear': 'Clear selection',
  'return.selected': 'Selected: {count} of {total}',
  'return.open': 'Open the selected pages',
  'return.opening': 'Opening…',
  'return.skip': 'View the workspace without opening',
  'return.many.title': 'That is a lot of pages',
  'return.many.body':
    'You selected {count} pages. Opening them all at once may weigh the browser down; you can open what you need now and the rest later.',
  'return.result.title': 'Opening result',
  'return.result.opened': 'Opened: {count}',
  'return.result.unavailable': 'Could not open: {count}',
  'return.result.note':
    'Opening a tab is not restoring your reading position; reading position is not saved in this version.',
  'return.continue': 'Continue to the workspace',

  'tabStatus.opened': 'Opened',
  'tabStatus.unavailable': 'Could not open',
  'tabStatus.not-attempted': 'Not opened',
  'tabStatus.opening': 'Opening',

  'duplicate.title': 'This link is already in the workspace',
  'duplicate.body':
    'The same link appears in saved pages ({count}). It is not merged or deleted; the decision is yours.',
  'duplicate.goToExisting': 'Go to the existing copy',
  'duplicate.addCopy': 'Add another copy',
  'duplicate.updateExisting': 'Update the existing copy',
  'directory.corrupted.title': 'Records that could not be read',
  'directory.corrupted.body':
    'Records that could not be read correctly: {count}. Nothing was deleted, and they are not shown in the list above.',
  'directory.error.title': 'Workspaces could not be shown',
  'directory.error.body': 'Local storage did not finish opening. None of your data changed.',
  'directory.retry': 'Try again',

  'empty.title': 'Start your first workspace',
  'empty.body':
    'Jusoor saves your working context, not just tabs: the pages you chose, why you opened them, and where you stopped.',
  'empty.action': 'Create a workspace from this window',

  'permission.title': 'Read this window’s tabs',
  'permission.body':
    'To list this window’s tabs for you to choose from, Jusoor needs permission to read their titles and URLs. Page content is not read, and nothing leaves your device.',
  'permission.grant': 'Allow reading tabs',
  'permission.denied.title': 'Permission was not granted',
  'permission.denied.body':
    'You can try again whenever you like. The rest of Jusoor works as usual without this permission.',
  'permission.retry': 'Try again',

  'tabs.loading': 'Reading this window’s tabs…',
  'tabs.error.title': 'Tabs could not be read',
  'tabs.error.body': 'The browser did not answer the request to read tabs. Nothing was saved.',
  'tabs.retry': 'Try again',
  'tabs.heading': 'Choose tabs',
  'tabs.listLabel': 'Tabs in the current window',
  'tabs.selectAll': 'Select all',
  'tabs.clearSelection': 'Clear selection',
  'tabs.selectedCount': 'Selected: {count} of {total}',
  'tabs.active': 'Active tab',
  'tabs.unavailable.title': 'Tabs that cannot be saved',
  'tabs.unavailable.body':
    'Tabs that could not be saved because no URL or title was available: {count}. They are not shown in the list above.',
  'tabs.empty.title': 'No tabs can be saved',
  'tabs.empty.body': 'No tab in this window had both a URL and a title that could be saved.',

  'form.name.label': 'Workspace name',
  'form.name.placeholder': 'For example: Comparing privacy frameworks',
  'form.name.error': 'Enter a name for the workspace.',
  'form.goal.label': 'Goal or question',
  'form.goal.optional': 'optional',
  'form.goal.placeholder': 'What are you trying to reach?',
  'form.selection.error': 'Choose at least one tab.',
  'form.submit': 'Create workspace',
  'form.cancel': 'Cancel',

  'duplicates.title': 'Repeated links in your selection',
  'duplicates.body':
    'The same link appears more than once in what you selected (matching groups: {count}). Jusoor does not merge or delete repeats; the decision is yours.',
  'duplicates.back': 'Back to selection',
  'duplicates.saveAll': 'Save all copies',

  'creating.status': 'Creating the workspace…',
  'create.error.title': 'The workspace could not be created',
  'create.error.body':
    'Neither the workspace nor any of its pages was saved. Your selection and what you typed are kept.',
  'create.retry': 'Try again',

  'success.title': 'Workspace created',
  'success.pages': 'Pages saved: {count}',
  'success.goal': 'Goal',
  'success.open': 'Open workspace',

  'workspace.placeholder.title': 'The workspace screen is not built yet',
  'workspace.placeholder.body':
    'The workspace and its pages are saved. Viewing and managing pages, freezing, and restoring are not implemented yet.',
  'workspace.back': 'Back to workspaces',

  // ===== Context builder — §9.6, §9.7, §9.8 =====

  'context.action': 'Copy context',
  'context.title': 'Context builder',
  'context.body':
    'Jusoor arranges what you choose into clear text for you to review and copy yourself. Nothing is sent to any service, and the request is not carried out here.',

  'context.level': 'Level of detail',
  'context.level.brief': 'Brief',
  'context.level.medium': 'Medium',
  'context.level.detailed': 'Detailed',
  'context.level.brief.hint':
    'The goal, the pages, notes on primary pages only, and where you stopped.',
  'context.level.medium.hint':
    'Adds the description, general note, reasons for opening, and progress.',
  'context.level.detailed.hint':
    'Everything you selected, in detail, including page roles and all notes.',
  'context.level.note': 'Shortening includes fewer kinds of data; it never rewrites your text.',

  'context.template': 'Request template',
  'context.template.research': 'Research',
  'context.template.debug': 'Reviewing a development problem',
  'context.template.summarize': 'Summarize',
  'context.template.compare': 'Compare',
  'context.template.continue': 'Continue the work',
  'context.template.apply': 'Use this template',
  'context.request': 'Request text',
  'context.request.placeholder': 'What do you want from whoever you paste this context to?',
  'context.request.helper':
    'A template is a starting point, not the one right answer; edit it however you like before copying.',

  'context.include': 'Kinds of data included',
  'context.include.goal': 'Goal or question',
  'context.include.description': 'Task description',
  'context.include.generalNote': 'General note',
  'context.include.checkpoint': 'Stopping point and next step',
  'context.include.pages': 'Pages',
  'context.include.reasons': 'Reasons for opening',
  'context.include.progress': 'Progress',
  'context.include.roles': 'Page roles',
  'context.include.notes': 'Notes',
  'context.include.request': 'What you are asking for',

  'context.pages.choose': 'Pages included',
  'context.pages.selectAll': 'Select all',
  'context.pages.clear': 'Clear selection',
  'context.pages.selected': 'Selected: {count} of {total}',
  'context.pages.none': 'You have not selected a page yet.',
  'context.pages.moveUp': 'Move page earlier in the context',
  'context.pages.moveDown': 'Move page later in the context',
  'context.pages.reorderHint':
    'This order applies to the copied text only; it does not change the workspace order.',

  'context.headingLanguage': 'Heading language',
  'context.headingLanguage.ui': 'Same as interface',
  'context.headingLanguage.note':
    'Only headings and the template are translated; your text and source titles keep their own language.',

  'context.linkDisplay': 'Show links as',
  'context.linkDisplay.title-and-url': 'Title and URL',
  'context.linkDisplay.title-only': 'Title only',
  'context.linkDisplay.url-only': 'URL only',

  'context.privacy.title': 'Review the text before copying',
  'context.privacy.body':
    'This text may contain private links, project information, personal notes, error messages, repository names, or internal excerpts. You decide what to copy and where to paste it.',

  'context.counts':
    'Pages: {pages} · Notes: {notes} · Characters: {characters} · Words: {words}',
  'context.large.title': 'This text is long',
  'context.large.body':
    'You can include fewer pages, keep only the notes, or copy one part. Jusoor does not assume a fixed limit for any application.',
  'context.split': 'Split into numbered parts',
  'context.split.parts': 'Parts: {count}',

  'context.preview': 'Preview',
  'context.preview.empty': 'Nothing is included yet. Choose at least one kind of data.',
  'context.preview.hint': 'The text can also be selected and copied by hand.',
  'context.copy': 'Copy the text',
  'context.copy.part': 'Copy part {index}',
  'context.copied': 'Copied',
  'context.copy.failed.title': 'Could not copy to the clipboard',
  'context.copy.failed.body':
    'The browser did not grant clipboard write access. The text above is complete; you can select and copy it by hand.',

  // ===== Export and import — §9.9, §9.10 =====

  'transfer.export.action': 'Export',
  'transfer.export.title': 'Export workspace',
  'transfer.export.body':
    'A standalone file saved to your device. No server, no account, no cloud link.',
  'transfer.format': 'Format',
  'transfer.format.json': 'JSON',
  'transfer.format.text': 'Plain text',
  'transfer.format.markdown': 'Markdown',
  'transfer.format.json.hint':
    'The transport and backup format: complete, and importable again.',
  'transfer.format.readable.hint':
    'For reading and sharing. It follows your include options, so it is not a backup and cannot be imported.',
  'transfer.export.download': 'Download the file',
  'transfer.export.copy': 'Copy the text',
  'transfer.export.copied': 'Copied',
  'transfer.export.counts': 'Workspaces: {workspaces} · Pages: {pages}',
  'transfer.export.failed.title': 'Could not download the file',
  'transfer.export.failed.body':
    'The browser did not start the download. The text above is complete and you can copy it by hand.',
  'transfer.export.error.title': 'Could not prepare the file',
  'transfer.export.error.body': 'Your data could not be read fully. Nothing about it changed.',

  'transfer.backup.title': 'Backup',
  'transfer.backup.body':
    'Export all your workspaces into one file, or restore an earlier copy. Clearing browser or extension data may lose whatever you have not exported.',
  'transfer.backup.exportAll': 'Export all workspaces',
  'transfer.backup.corrupted':
    'Records that could not be read and are not in the file: {count}. Your copy does not cover them.',

  'transfer.import.action': 'Import a file',
  'transfer.import.title': 'Import',
  'transfer.import.body':
    'The whole file is checked before anything is written. No file is trusted automatically.',
  'transfer.import.choose': 'Choose a JSON file',
  'transfer.import.reading': 'Reading the file…',
  'transfer.import.summary': 'In the file — workspaces: {workspaces} · pages: {pages}',
  'transfer.import.noConflicts': 'No conflict with your current workspaces.',
  'transfer.import.conflicts.title': 'Conflicting workspaces: {count}',
  'transfer.import.conflicts.body':
    'They carry the same name or id as a workspace you already have. Choose what happens to them; your choice applies to all conflicting ones, and the rest are imported as they are.',
  'transfer.import.conflict.byId': 'same id',
  'transfer.import.conflict.byName': 'same name',
  'transfer.import.resolution': 'What happens to conflicting workspaces',
  'transfer.import.resolution.create-copy': 'Create a copy',
  'transfer.import.resolution.replace': 'Replace',
  'transfer.import.resolution.merge-pages': 'Merge the non-duplicate pages',
  'transfer.import.resolution.cancel': 'Cancel the operation',
  'transfer.import.resolution.create-copy.hint':
    'A new workspace; the existing one is left untouched.',
  'transfer.import.resolution.replace.hint':
    'The existing workspace takes the incoming data, and its old pages are deleted.',
  'transfer.import.resolution.merge-pages.hint':
    'The existing workspace stays as it is, and pages whose link does not match one in it are added.',
  'transfer.import.resolution.cancel.hint':
    'Conflicting workspaces are skipped; nothing is written for them.',
  'transfer.import.apply': 'Run the import',
  'transfer.import.applying': 'Importing…',
  'transfer.import.done.title': 'Import finished',
  'transfer.import.done.body': 'Workspaces imported: {imported} · Pages: {pages}',
  'transfer.import.done.skipped': 'Workspaces skipped: {count}',
  'transfer.import.failed.title': 'The import did not happen',
  'transfer.import.failed.body': 'No workspace was written. Your current data is unchanged.',

  'transfer.reject.title': 'File rejected',
  'transfer.reject.not-json': 'The file is not valid JSON.',
  'transfer.reject.not-an-object': 'The file content is not an object.',
  'transfer.reject.unknown-format': 'This is not a Jusoor file.',
  'transfer.reject.unsupported-version':
    'A schema version this build of Jusoor does not know: {found}.',
  'transfer.reject.workspaces-not-a-list': 'The workspace list in the file is not a list.',
  'transfer.reject.entry-not-an-object': 'Entry number {workspace} in the file is not an object.',
  'transfer.reject.pages-not-a-list': 'The pages of workspace number {workspace} are not a list.',
  'transfer.reject.invalid-workspace':
    'Workspace number {workspace} is not sound (field: {details}).',
  'transfer.reject.invalid-page':
    'Page number {page} in workspace number {workspace} is not sound (field: {details}).',
  'transfer.reject.page-outside-workspace':
    'Page number {page} in workspace number {workspace} points to a different workspace.',
  'transfer.reject.duplicate-page-id': 'A repeated page id in workspace number {workspace}.',
  'transfer.reject.active-page-missing':
    'Workspace number {workspace} points to an active tab whose page is not in the file.',
  'transfer.reject.unreadable': 'The file could not be read.',

  // ===== First run and settings — the last two of the eight screens (§11) =====

  'firstRun.title': 'Welcome to Jusoor',
  'firstRun.body':
    'Jusoor saves your working context in the browser, not just your tabs: the pages you chose, why you opened them, where you stopped, and what comes next.',
  'firstRun.privacy.title': 'Your data stays on your device',
  'firstRun.privacy.body':
    'Everything is saved locally with no account, no server, and no sync, and nothing is sent to any service. That also means clearing browser data or removing the extension may lose your workspaces — export a backup once your work matters.',
  'firstRun.start': 'Get started',

  'settings.title': 'Settings',
  'settings.action': 'Open settings',
  'settings.language.note':
    'Changing the interface language does not translate your page titles or notes.',
  'settings.storage.title': 'Storage',
  'settings.storage.body':
    'Your workspaces are saved on this device only. Clearing browser data or removing the extension may lose them; backup lives on the main screen.',

  'settings.language': 'Language',
  'settings.language.ar': 'العربية',
  'settings.language.en': 'English',
  'settings.language.auto': 'Browser default',

  'settings.theme': 'Theme',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.theme.system': 'System',

  'about.entry.title': 'About Jusoor',
  'about.entry.action': 'View details',
  'about.description':
    'A browser extension that saves your working context, not just your tabs, and returns you to where you stopped and what comes next.',
  'about.version': 'Version: {version}',
  'about.updates.title': 'Updates',
  'about.updates.body':
    'When installed from the Chrome or Edge store, the browser updates the extension automatically — no action needed. You can also ask the browser to check right now; Jusoor itself never connects to the network directly.',
  'about.updates.check': 'Check for updates',
  'about.updates.checking': 'Checking…',
  'about.updates.upToDate': 'You are using the latest version.',
  'about.updates.available': 'Version {version} is available. The browser installs it automatically.',
  'about.updates.throttled': "Couldn't check right now. Try again shortly.",
  'about.updates.releases': 'View the latest release',
  'about.updates.changelog': 'Changelog',
  'about.project.title': 'Project & support',
  'about.project.repository': 'Jusoor repository on GitHub',
  'about.project.issue': 'Report an issue',
  'about.credit.full': 'Sultan — Design & Development',
  'about.credit.rights': '© 2026 Sultan — All rights reserved',
  'about.credit.github': 'Developer on GitHub',

  'contextLabel.workspace': 'Workspace',
  'contextLabel.request': 'Request',
  'contextLabel.goal': 'Goal',
  'contextLabel.description': 'Task description',
  'contextLabel.generalNote': 'General note',
  'contextLabel.lastReached': 'Where I stopped',
  'contextLabel.nextStep': 'Next step',
  'contextLabel.pages': 'Pages',
  'contextLabel.reason': 'Reason for opening',
  'contextLabel.progress': 'Progress',
  'contextLabel.role': 'Role',
  'contextLabel.notes': 'Note',
  'contextLabel.part': 'Part {index} of {total}',

  'contextTemplate.research':
    'I am working on a piece of research; its context is below. Help me organize what I have gathered, what is missing, and what needs checking.',
  'contextTemplate.debug':
    'I am facing a development problem; its context is below. Review what I have tried, and suggest likely causes and a next diagnostic step.',
  'contextTemplate.summarize':
    'Summarize the context below into short points that keep the important details.',
  'contextTemplate.compare':
    'Compare the sources below: where they agree, where they differ, and what there is not enough evidence to judge.',
  'contextTemplate.continue':
    'I stopped working on this and want to continue. The context is below; suggest how to start from the next step.',

  // ===== Identity executive integration — reference screen copy (section 07) =====

  'home.intro': 'Return where you left off.',
  'home.intro.body': 'Your work context is saved on this device.',
  'home.local': 'Local',
  'home.filter.label': 'Filter workspaces by state',
  'home.filter.all': 'All',
  'home.filter.none': 'No workspaces in this state.',
  'home.continue': 'Continue working',
  'home.create': 'Create workspace',

  'card.open': 'Open',
  'card.restore': 'Restore',
  'card.missingNext': 'No next step yet',
  'card.pages': 'pages',
  'card.unfinished': 'unfinished',

  'template.general': 'General',
  'template.research': 'Research',
  'template.development': 'Development',
  'template.general.hint': 'Flexible work',
  'template.research.hint': 'Sources & evidence',
  'template.development.hint': 'Issues & docs',

  'wizard.title': 'New workspace',
  'wizard.progress': 'Creation progress',
  'wizard.step1.title': 'What are you working on?',
  'wizard.step1.body': 'A name and goal help you recover your thinking—not only your tabs.',
  'wizard.template': 'Template',
  'wizard.step2.title': 'Choose pages',
  'wizard.step2.body':
    'Select what belongs to this context from your window tabs. You can continue without pages and add them later.',
  'wizard.step3.title': 'Review what will be saved',
  'wizard.step3.body': 'Jusoor saves this data locally on this device.',
  'wizard.review.identity': 'Name, goal, and template',
  'wizard.review.pages': 'Pages and their links: {count}',
  'wizard.review.local': 'No sync or account',
  'wizard.alert': 'Page content is not sent to any service.',
  'wizard.continue': 'Continue',
  'wizard.back': 'Back',
  'wizard.createAction': 'Create workspace',

  'ws.notes': 'notes',
  'ws.start': 'Start',
  'ws.continueNext': 'Continue next step',
  'filter.label': 'Filter',

  'pageCard.latestNote': 'Latest note',
  'pageCard.details': 'Details',
  'page.open': 'Open page',

  'return.frozenAt': 'This workspace was frozen {time}.',
  'return.next.open': 'Open primary page',
  'return.count.opened': 'opened',
  'return.count.unavailable': 'failed',
  'return.count.notRequested': 'not requested',
  'return.continue.work': 'Continue working',

  'freeze.closeTabs.confirm.title': 'Close workspace tabs?',
  'freeze.closeTabs.confirm.body':
    'Open tabs matching this workspace’s pages will close after freezing. Your pages and notes remain saved.',

  'context.template.none': 'No template',
  'context.open': 'Open the context builder',
  'context.builder.short': 'Context',

  'page.pdf': 'PDF',
  'pageCard.toggle': 'Expand page card',

  'page.remove': 'Remove page from workspace',
  'page.remove.hint':
    'Permanently deletes this page and its notes. Other workspace data is not touched.',
  'page.remove.confirm.title': 'Remove this page?',
  'page.remove.confirm.body':
    '“{title}” and its notes ({notes}) will be permanently deleted from this workspace. This cannot be undone.',

  'workspace.delete': 'Delete workspace',
  'workspace.delete.hint':
    'Permanently deletes the workspace with all its pages and notes. This cannot be undone.',
  'workspace.delete.confirm.title': 'Delete this workspace?',
  'workspace.delete.confirm.body':
    '{pages} pages and {notes} notes will be permanently deleted. This cannot be undone.',

  'delete.failed.title': 'Could not delete',
  'delete.failed.body': 'Nothing was deleted; your data is intact. Try again.',


  'settings.section.appearance': 'Appearance & language',
  'settings.section.permissions': 'Permissions',
  'settings.section.data': 'Data',
  'settings.section.help': 'Help',
  'settings.section.about': 'About Jusoor',
  'settings.permissions.tabs': 'Tabs read permission',
  'settings.permissions.tabs.granted': 'Granted',
  'settings.permissions.tabs.request': 'Not granted — click to request',
  'settings.permissions.tabs.note':
    'Optional: used to create a workspace from window tabs and to close its tabs on freezing. Declining does not disable Jusoor.',
  'settings.export.hint': 'Local JSON of all workspaces',
  'settings.export.done': 'Backup exported',
  'settings.import.hint': 'From a previous backup file',
  'settings.help.onboarding': 'How Jusoor works',
  'settings.help.onboarding.hint': 'Replay the first-run introduction',

  'onboarding.skip': 'Skip',
  'onboarding.continue': 'Continue',
  'onboarding.start': 'Start',
  'onboarding.context.title': 'Save work context—not only tabs.',
  'onboarding.context.body':
    'Jusoor keeps pages, notes, reasons, your last checkpoint, and next step together in one workspace.',
  'onboarding.local.title': 'Your data stays local.',
  'onboarding.local.body':
    'No account, sync, or built-in AI. Your context is not sent to a service.',
  'onboarding.permission.title': 'The tabs permission is optional.',
  'onboarding.permission.body':
    'It is requested only when you create a workspace from your tabs or close them on freezing. Declining does not disable Jusoor.',

  'tabStatus.opened.detail': 'The tab opened in your window.',
  'tabStatus.unavailable.detail': 'The browser refused to open this link. Its data is preserved.',
  'tabStatus.not-attempted.detail': 'Opening this page was not requested.',
  'tabStatus.opening.detail': 'Opening the tab…',
}

const MESSAGES: Record<Language, Record<MessageKey, string>> = { ar, en }

/** قيم تُدرَج في نص مترجَم عبر `{name}`. الأعداد وحدها اليوم. */
export type MessageParams = Readonly<Record<string, string | number>>

const PLACEHOLDER = /\{(\w+)\}/g

/**
 * يعيد دالة ترجمة مربوطة بلغة واحدة.
 *
 * الإدراج بـ`{name}` لا بصيغ الجمع: العربية لها مفرد ومثنى وجمع وصيغ كثرة،
 * ومحاكاتها بشرط `count === 1` تنتج نصًا خاطئًا في أغلب الحالات. فصيغت الرسائل
 * ذات الأعداد بأسلوب «تسمية: عدد» فتصح مع أي عدد في اللغتين بلا قواعد جمع.
 */
export function createTranslator(language: Language) {
  const dictionary = MESSAGES[language]

  return (key: MessageKey, params?: MessageParams): string => {
    const template = dictionary[key]
    if (params === undefined) return template

    return template.replace(PLACEHOLDER, (placeholder, name: string) => {
      const value = params[name]
      return value === undefined ? placeholder : String(value)
    })
  }
}

export type Translate = ReturnType<typeof createTranslator>

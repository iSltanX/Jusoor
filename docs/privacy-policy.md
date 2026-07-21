# سياسة الخصوصية — جُسور · Privacy Policy — Jusoor

**آخر تحديث · Last updated: 2026-07-21 — الإصدار · Version 1.1.0**

هذه هي السياسة الكاملة بصيغتها النهائية، معدَّة للاستضافة على رابط عام عند
النشر. النسخة العربية أولًا، تليها الإنجليزية، والنسختان متطابقتا المعنى.

---

## العربية

### الخلاصة

جُسور لا يجمع بياناتك، ولا يرسلها إلى أي جهة، ولا يملك خادمًا يستقبلها أصلًا.
كل ما تدخله يبقى على جهازك.

### ما الذي يخزنه جُسور، وأين

| البيانات | المكان | متى |
|---|---|---|
| مساحات العمل وصفحاتها وملاحظاتها وتصنيفاتها ونقاط التوقف | قاعدة IndexedDB محلية داخل متصفحك | عند إدخالك لها |
| تفضيلات اللغة والمظهر وعلامة أول تشغيل ومؤشر آخر مساحة | `chrome.storage.local` داخل متصفحك | عند تغييرك لها |

لا يوجد أي تخزين آخر: لا حساب، ولا تسجيل دخول، ولا خادم خارجي، ولا مزامنة
سحابية، ولا أدوات تحليلات أو تتبع، ولا ملفات تعريف ارتباط.

### ما الذي لا يفعله جُسور

- **لا يرسل أيًا من بياناتك خارج جهازك.** المنع مفروض تقنيًا من المتصفح نفسه:
  سياسة أمن المحتوى في الإضافة (`connect-src 'none'`) تمنع أي اتصال صادر من
  كود جُسور نفسه وقت التشغيل. الاستثناء الوحيد: زر «التحقق من وجود تحديثات»
  الاختياري في شاشة «حول» يستدعي آلية الفحص المدمجة في المتصفح نفسه، لا كودًا
  في جُسور، ولا يمرّر معه أي بيانات من مساحاتك أو صفحاتك.
- **لا يقرأ محتوى الصفحات التي تزورها.** لا يستخدم content scripts، ولا يطلب
  صلاحيات مواقع (`host_permissions`)، ولا صلاحية `scripting`.
- **لا يجمع بيانات استخدام أو إحصاءات** من أي نوع.

### الصلاحيات ولماذا

| الصلاحية | النوع | الغرض |
|---|---|---|
| `storage` | أساسية | حفظ تفضيلات اللغة والمظهر على جهازك |
| `sidePanel` | أساسية | عرض اللوحة الجانبية، وهي واجهة جُسور الأساسية |
| `activeTab` | أساسية | قراءة عنوان ورابط التبويب الحالي **فقط بعد نقرك زر «قراءة الصفحة المفتوحة»** — لا يُقرأ محتوى الصفحة |
| `tabs` | اختيارية | تُطلب منك صراحةً عند إنشاء مساحة من تبويبات النافذة أو إغلاق تبويبات مساحة عند تجميدها؛ تتيح قراءة عناوين التبويبات وروابطها لتختار منها. رفضها لا يعطّل بقية الإضافة |

### النسخ والتصدير بيدك وحدك

عند استخدام «منشئ السياق» أو «التصدير»، يجهّز جُسور نصًا أو ملفًا **على جهازك**
وتقرر أنت بنفسك أين تلصقه أو تحفظه أو ترسله. تسبق ذلك معاينة كاملة وتنبيه بأن
المحتوى قد يتضمن روابط أو ملاحظات خاصة. لا يغادر أي شيء جهازك بفعلٍ من جُسور.

### حذف بياناتك

بياناتك ملكك وعلى جهازك: إزالة الإضافة أو مسح بيانات الموقع من إعدادات المتصفح
يحذفها نهائيًا. ولهذا السبب نفسه، ننصح بتصدير نسخة احتياطية متى صار عملك مهمًا —
فلا جهة أخرى تملك نسخة يمكن استعادتها.

### التغييرات على هذه السياسة

أي تغيير مستقبلي في سلوك التخزين أو الصلاحيات سيُوثَّق في هذه الصفحة وفي سجل
تغييرات الإضافة قبل صدوره.

---

## English

### Summary

Jusoor does not collect your data, does not send it anywhere, and has no server
to receive it in the first place. Everything you enter stays on your device.

### What Jusoor stores, and where

| Data | Location | When |
|---|---|---|
| Workspaces, their pages, notes, classifications, and stopping points | A local IndexedDB database inside your browser | When you enter them |
| Language and theme preferences, the first-run flag, and the last-used-workspace pointer | `chrome.storage.local` inside your browser | When you change them |

There is no other storage: no account, no sign-in, no external server, no cloud
sync, no analytics or tracking of any kind, and no cookies.

### What Jusoor does not do

- **It sends none of your data off your device.** This is technically enforced
  by the browser itself: the extension's content security policy
  (`connect-src 'none'`) blocks any outgoing connection from Jusoor's own code
  at runtime. The one exception: the optional "Check for updates" button on
  the About screen calls the browser's own built-in update-check mechanism,
  not Jusoor's code, and passes along none of your workspace or page data.
- **It does not read the content of pages you visit.** It uses no content
  scripts, requests no site permissions (`host_permissions`), and no
  `scripting` permission.
- **It collects no usage data or statistics** of any kind.

### Permissions and why

| Permission | Kind | Purpose |
|---|---|---|
| `storage` | Required | Saving your language and theme preferences on your device |
| `sidePanel` | Required | Showing the side panel, Jusoor's main interface |
| `activeTab` | Required | Reading the current tab's title and URL **only after you click "Read the open page"** — page content is never read |
| `tabs` | Optional | Requested explicitly when you create a workspace from window tabs or close a workspace's tabs on freezing; it allows reading tab titles and URLs so you can choose among them. Declining it does not disable the rest of the extension |

### Copying and exporting are yours alone

When you use the context builder or export, Jusoor prepares text or a file **on
your device**, and you decide where to paste, save, or send it. A full preview
and a privacy notice always come first. Nothing leaves your device by any action
of Jusoor's.

### Deleting your data

Your data is yours and lives on your device: removing the extension or clearing
site data from your browser's settings deletes it permanently. For the same
reason, we recommend exporting a backup once your work matters — no other party
holds a copy that could be restored.

### Changes to this policy

Any future change to storage behavior or permissions will be documented on this
page and in the extension's changelog before it ships.

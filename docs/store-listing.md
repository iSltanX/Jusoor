# محتوى صفحتي المتجرين — صيغة نهائية لمرشح V1

**الحالة:** محتوى مُعدّ للمراجعة · **لم يُنشر ولم يُرفع** · التاريخ: 20 يوليو 2026

هذا الملف يجهّز نصوص صفحة المتجر ليراجعها صاحب المنتج قبل أي رفع. النشر قرار
مستقل خارج نطاق م6 ([خريطة الطريق §4.7](reviews/V1-Architecture-Review-and-Roadmap.md)).

النصوص تلتزم بنبرة دستور الهوية §4.2: واضحة وبسيطة وبشرية، تصف الحالة الفعلية
بلا تهويل، ولا تدّعي قدرة غير موجودة (§15 هوية: لا إيحاء بذكاء اصطناعي أو حساب
أو مزامنة).

---

## الاسم

```
جُسور — Jusoor
```

## الوصف المختصر (حد المتجر 132 محرفًا)

**عربي** — 78 محرفًا:

```
احفظ سياق عملك في المتصفح لا تبويباتك وحدها، واستعد نقطة توقفك وخطوتك التالية.
```

**إنجليزي** — 102 محرفًا:

```
Save your working context in the browser, not just tabs. Return to where you stopped and what is next.
```

## الوصف الكامل

### عربي

```
جُسور يحفظ حالة العمل التي كنت تعيشها داخل المتصفح، لا التبويبات وحدها.

تتوقف عن بحث أو مهمة أو مشكلة، ثم تعود بعد ساعات أو أيام فتعرف أين كنت ومن أين
تكمل — دون إعادة بناء السياق في ذهنك من جديد.

ما الذي يحفظه:
• مساحة عمل لكل مهمة، تجمع صفحاتها وسياقها منفصلةً عن بقية عملك
• سبب فتح كل صفحة، وحالة تقدمها، ودورها، وملاحظاتك عليها
• آخر ما وصلت إليه، والخطوة التالية التي كنت تنوي تنفيذها
• تجميد المساحة عند التوقف، مع إغلاق تبويباتها إن أردت
• شاشة عودة تعرض أين توقفت قبل أن تفتح شيئًا

وما الذي يعطيك إياه بعدها:
• بحث بالعربية والإنجليزية داخل مساحاتك وصفحاتها
• منشئ سياق يرتّب ما تختاره في نص واضح تراجعه وتنسخه بنفسك
• تصدير واستيراد: JSON للنسخ الاحتياطي، ونص عادي وMarkdown للمشاركة

خصوصيتك:
• كل شيء على جهازك. لا حساب، ولا تسجيل دخول، ولا خادم، ولا مزامنة سحابية
• لا يُرسل أي من بياناتك إلى أي خدمة — المنع مفروض من المتصفح نفسه لا من وعد
• لا يقرأ محتوى صفحاتك، ولا يطلب صلاحيات مواقع
• لا ذكاء اصطناعي مدمج ولا حكم آلي على مصادرك: جُسور يحفظ وينظم ويعرض ما تُدخله

ملاحظة مهمة: لأن التخزين محلي بالكامل، فحذف بيانات المتصفح أو إزالة الإضافة قد
يفقد مساحاتك. التصدير والنسخ الاحتياطي متاحان من الشاشة الرئيسية.

الواجهة بالعربية والإنجليزية مع دعم كامل للاتجاهين، والوضعين الفاتح والداكن.
```

### إنجليزي

```
Jusoor saves the working state you were in inside the browser — not just your tabs.

You stop a piece of research, a task, or a problem, and come back hours or days
later knowing where you were and what to do next, without rebuilding the whole
context in your head.

What it saves:
• A workspace per task, holding its pages and context apart from your other work
• Why you opened each page, its progress, its role, and your notes on it
• Where you stopped, and the next step you meant to take
• Freezing a workspace when you stop, closing its tabs if you want
• A return screen that shows where you stopped before anything opens

What you get afterwards:
• Search in Arabic and English across your workspaces and their pages
• A context builder that arranges what you choose into clear text you review and copy yourself
• Export and import: JSON for backup, plain text and Markdown for sharing

Your privacy:
• Everything stays on your device. No account, no sign-in, no server, no cloud sync
• None of your data is sent to any service — enforced by the browser itself, not by a promise
• It does not read your page content and asks for no site permissions
• No built-in AI and no automatic judgement of your sources: Jusoor saves, organizes, and shows what you enter

Important: because storage is entirely local, clearing browser data or removing
the extension may lose your workspaces. Export and backup are on the main screen.

The interface is in Arabic and English with full support for both directions,
and light and dark themes.
```

## مبررات الصلاحيات (لحقل مراجعة المتجر)

| الصلاحية | النص المقترح |
|---|---|
| `storage` | حفظ تفضيلات اللغة والمظهر على الجهاز. |
| `sidePanel` | اللوحة الجانبية هي الواجهة الأساسية للإضافة. |
| `activeTab` | قراءة عنوان ورابط التبويب الحالي **بعد نقر المستخدم على زر «قراءة الصفحة المفتوحة»** لإضافتها إلى مساحة. لا يُقرأ محتوى الصفحة. |
| `tabs` (اختيارية) | تُطلب بفعل صريح وحده لعرض تبويبات النافذة ليختار منها المستخدم عند إنشاء مساحة، ولتمييز تبويبات المساحة عند إغلاقها بعد التجميد. رفضها لا يعطّل الإضافة. |
| لا كود بعيد | `content_security_policy` يمنع الكود البعيد، و`connect-src 'none'` يمنع كل اتصال صادر وقت التشغيل. |

## الأصول البصرية

متوفرة في حزمة الهوية (`identity/brand/`) وجاهزة للاستعمال بلا إعادة رسم:

| الأصل | الملف | الحالة |
|---|---|---|
| أيقونة المتجر 128 | `icon-128.png` | جاهز |
| صورة المتجر 1280×800 | `chrome-store-1280x800.png` | جاهز |
| صورة المشاركة | `og-image.png` | جاهز |
| صورة المنتج | `product-hero.png` | جاهز |

## التصنيف واللغات (لحقول المتجر)

| الحقل | القيمة |
|---|---|
| الفئة | Productivity · الإنتاجية |
| اللغات المعلنة | العربية، English |

## Microsoft Edge Add-ons

النصوص نفسها أعلاه تصلح للمتجرين حرفيًا — حدود Edge أوسع لا أضيق:

| حقل Edge | ما يُستخدم |
|---|---|
| Display name | `جُسور — Jusoor` |
| Short description | الوصف المختصر نفسه (حد Edge 132 محرفًا كذلك) |
| Description | الوصف الكامل نفسه بالعربية أو الإنجليزية بحسب لغة الصفحة |
| Category | Productivity |
| Privacy policy URL | رابط سياسة الخصوصية بعد استضافتها — النص الجاهز في [privacy-policy.md](privacy-policy.md) |
| الحزمة | `.output/jusoor-1.1.0-edge.zip` |

## بيانات المطور (لحقول المتجر)

| الحقل | القيمة |
|---|---|
| اسم المطور المعروض («مقدَّم من») | سلطان · Sultan |
| صيغة الحقوق في وصف الصفحة إن لزمت | صُمّم وطُوّر بواسطة سلطان · Sultan — Design & Development |
| حقوق النشر | © 2026 سلطان — جميع الحقوق محفوظة |

هوية سلطان البصرية (المخطوطة وألوانها) تُستعمل في **مواد المستودع والحساب العام
وحدها**؛ لا تدخل صور المتجر ولا واجهة المنتج — هوية جُسور هي المرجع الوحيد هناك،
ودستورها §14 ينص أن توقيع المطور لا يظهر داخل واجهة الإضافة الأساسية.

## ما يحتاج قرارًا قبل الرفع

1. **حساب ناشر في متجر Chrome** ورسوم التسجيل — خارج نطاق التنفيذ.
2. **سياسة خصوصية منشورة برابط عام:** نصها الكامل النهائي بالعربية والإنجليزية
   جاهز في [privacy-policy.md](privacy-policy.md)، وينقصه الاستضافة على رابط عام
   ووسيلة تواصل يحددها مالك المشروع (لا يُخترع بريد نيابة عنه).
3. **لقطات شاشة من الإضافة العاملة:** تحتاج تحميلها في متصفح حقيقي — انظر
   «ما بقي قبل النشر» في تقرير م6.

   **لا تُخلط بلقطات `docs/screenshots/`.** تلك مأخوذة من الحزمة المبنية نفسها
   معروضةً بخادم ساكن مع بديل `chrome`، بعرض اللوحة 380px — تصلح لصفحة المستودع
   ولا تصلح للمتجر: المتجر يطلب 1280×800 أو 640×400، ويتوقع الإضافة **محمَّلة
   فعلًا** في متصفح لا مصيَّرة في تبويب. البند أعلاه يبقى مفتوحًا كما هو.
4. **مراجعة لغوية بشرية** للنصين أعلاه قبل اعتمادهما نهائيًا.

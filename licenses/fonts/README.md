# تراخيص الخطوط

خطا **Almarai** و**Cairo** يُعاد توزيعهما داخل حزمة الإضافة، ورخصة SIL Open Font
License 1.1 توجب إرفاق نص الترخيص مع أي إعادة توزيع. حزمة الهوية الأصلية
`Jusoor-Identity-System-v2.zip` لا تتضمن ملفات ترخيص، لذلك أُضيفت هنا — خارج
`identity/` حتى تبقى تلك المنطقة نسخة مطابقة للحزمة الأصلية بلا أي ملف من إنتاجنا.

## مصدر التحقق

قُرئت بيانات الترخيص من جداول `name` داخل ملفات الخطوط نفسها في `identity/fonts/`،
لا من مصدر خارجي:

| الخط | الملفات | الإصدار | حقوق النشر | الترخيص المعلن داخل الملف |
|---|---|---|---|---|
| Almarai | `Almarai-Regular.ttf`، `Almarai-Bold.ttf`، `Almarai-ExtraBold.ttf` | 1.10 | `Copyright (c) 2019 by Almarai. All rights reserved.` | SIL Open Font License 1.1 |
| Cairo | `Cairo-Variable.ttf` | 3.130 | `Copyright 2009 The Cairo Project Authors (https://github.com/Gue3bara/Cairo)` | SIL Open Font License 1.1 |

نص الترخيص المرفق هو النص المعياري لـ OFL 1.1 كما تنشره SIL
(`https://openfontlicense.org/documents/OFL.txt`)، مسبوقًا بسطر حقوق النشر
الخاص بكل خط كما هو مسجَّل داخل ملفاته.

## الملفات

- `Almarai-OFL.txt`
- `Cairo-OFL.txt`

## ملاحظة قبل النشر

يجب أن تُشحن هذه الملفات مع الإضافة عند رفعها إلى المتجر. في مرحلة التأسيس
لا تُنسخ إلى مخرجات البناء لأن الإضافة لا تُنشر بعد؛ يُراجع ذلك عند تجهيز أول إصدار.

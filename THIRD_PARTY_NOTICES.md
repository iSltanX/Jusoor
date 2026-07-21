# إشعارات الطرف الثالث · Third-Party Notices

جُسور مرخّص بترخيص MIT (انظر [LICENSE](LICENSE)). الحزمة المبنية والموزَّعة
تتضمّن أيضًا الأكواد والخطوط التالية من أطراف أخرى، بشروط ترخيصها الأصلية
كما هي، دون تعديل.

Jusoor is licensed under the MIT License (see [LICENSE](LICENSE)). The built,
distributed package also bundles the following third-party code and fonts,
under their own original license terms, unmodified.

---

## React & React DOM

- **الإصدار · Version:** 19.2.7
- **الترخيص · License:** MIT
- **المصدر · Source:** https://github.com/facebook/react

```
MIT License

Copyright (c) Meta Platforms, Inc. and affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## خط Almarai · Almarai font

- **الإصدار · Version:** 1.10
- **حقوق النشر · Copyright:** Copyright (c) 2019 by Almarai. All rights reserved.
- **الترخيص · License:** SIL Open Font License 1.1
- **النص الكامل · Full text:** [licenses/fonts/Almarai-OFL.txt](licenses/fonts/Almarai-OFL.txt)

يُشحن الخط داخل الحزمة المبنية (ملفات `.ttf`)؛ نص الترخيص مرفَق معه في
`licenses/` امتثالًا لشرط OFL 1.1.

Shipped inside the built package (`.ttf` files); the license text ships
alongside it in `licenses/`, per OFL 1.1's redistribution requirement.

---

## خط Cairo · Cairo font

- **الإصدار · Version:** 3.130
- **حقوق النشر · Copyright:** Copyright 2009 The Cairo Project Authors (https://github.com/Gue3bara/Cairo)
- **الترخيص · License:** SIL Open Font License 1.1
- **النص الكامل · Full text:** [licenses/fonts/Cairo-OFL.txt](licenses/fonts/Cairo-OFL.txt)

يُشحن الخط داخل الحزمة المبنية (ملف `.ttf` متغيّر الوزن)؛ نص الترخيص مرفَق
معه في `licenses/` امتثالًا لشرط OFL 1.1.

Shipped inside the built package (variable-weight `.ttf` file); the license
text ships alongside it in `licenses/`, per OFL 1.1's redistribution
requirement.

---

## أصول الهوية البصرية · Visual identity assets

الشعارات والرموز والأيقونات في `identity/brand/` أصول بصرية خاصة بمشروع
جُسور نفسه (حزمة Jusoor Identity System)، لا اعتماديات برمجية من طرف ثالث —
موزَّعة ضمن ترخيص MIT أعلاه كجزء من المصدر.

The logos, marks, and icons in `identity/brand/` are Jusoor's own visual
identity assets (Jusoor Identity System package), not third-party software
dependencies — distributed under the MIT license above as part of the
source.

---

أدوات التطوير المدرَجة في `devDependencies` (WXT، TypeScript، ESLint،
Vitest، وغيرها) تُستخدم أثناء البناء والاختبار فقط، ولا يُشحن كودها المصدري
ضمن الإضافة المبنية — فلا تحتاج إشعارًا هنا.

Development tools listed under `devDependencies` (WXT, TypeScript, ESLint,
Vitest, and others) are used only at build and test time; their own source
is never shipped inside the built extension, so they require no notice here.

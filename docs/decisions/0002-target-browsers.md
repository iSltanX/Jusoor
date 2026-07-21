# 0002 — المتصفحات المستهدفة

**الحالة:** معتمد · **التاريخ:** 19 يوليو 2026

## القرار

النواة الحالية تستهدف **Google Chrome** و**Microsoft Edge** (كلاهما Chromium / MV3).
**Firefox مؤجل** إلى ما بعد استقرار النواة.

## السبب

`chrome.sidePanel` هي ما يحقق «الواجهة الأساسية Side Panel» في دستور الهوية §11.
Firefox يستخدم `sidebarAction` بواجهة مختلفة، وتفريع أهم سطح في المنتج قبل استقرار
النواة تكلفة بلا عائد الآن.

## القيد المصاحب

تأجيل Firefox لا يعني الانغلاق على Chrome. القيد الملزم:

> `chrome.*` لا تظهر خارج `src/browser/`.

فيصبح دعم Firefox لاحقًا استبدالًا لطبقة واحدة، لا إعادة كتابة. يفرض هذا حارس
`tests/guards/chrome-usage.test.ts`، وتفصيله في [0005](0005-dependency-direction.md).

## البناء

- `pnpm build` → `.output/chrome-mv3` (يعمل على Chrome وEdge معًا).
- `pnpm build:edge` → هدف Edge صراحةً عند الحاجة إلى تمييزه.

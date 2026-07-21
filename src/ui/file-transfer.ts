/**
 * تنزيل ملف محلي وقراءة ملف يختاره المستخدم.
 *
 * تعيش في `ui` لا في `browser/`: `Blob` و`URL.createObjectURL` و`<input
 * type="file">` واجهات ويب قياسية لا `chrome.*`، وحصر `browser/` يخص واجهات
 * المتصفح-كإضافة وحدها (قرار 0005). ولا صلاحية `downloads` تُطلب — الحارس يمنعها
 * صراحةً، والتنزيل عبر رابط كائن محلي لا يحتاجها.
 *
 * **لا شبكة هنا إطلاقًا:** الرابط المُولَّد `blob:` يشير إلى ذاكرة الصفحة نفسها،
 * ولا يغادر شيء الجهاز — دستور المنتج §11.2 و§9.9 («بلا خادم أو حساب أو رابط
 * سحابي حي»).
 */

/**
 * محارف يرفضها نظام ملفات أو تلتبس بمسار — تُستبدل بشرطة لا تُحذف، فلا تلتصق
 * كلمتان كانتا مفصولتين.
 *
 * الصنف مكتوب محرفًا محرفًا بلا مدى: محرفان متجاوران داخل صنف قد ينشئان مدى
 * غير مقصود يبتلع محارف تحكّم — وقد وقع ذلك فعلًا والتقطه الفحص الساكن.
 */
const UNSAFE_FILE_CHARACTERS = /[\\/:*?"<>|]/g

/**
 * يقترح اسم ملف من اسم المساحة والتاريخ.
 *
 * اسم المستخدم يبقى مقروءًا (بعربيته إن كانت عربية) ولا يُترجم ولا يُختزل إلى
 * محارف لاتينية؛ يُنظَّف فقط مما يكسر نظام الملفات. والاسم الفارغ بعد التنظيف
 * يسقط إلى بديل ثابت بدل ملف بلا اسم.
 */
export function suggestFileName(workspaceName: string, isoDate: string): string {
  const cleaned = workspaceName
    .replace(UNSAFE_FILE_CHARACTERS, '-')
    .replace(/\s+/g, ' ')
    .trim()

  const base = cleaned === '' ? 'jusoor' : cleaned
  return `${base} — ${isoDate}.json`
}

/** التاريخ بصيغة YYYY-MM-DD من طابع زمني — جزء من اسم الملف لا نص واجهة. */
export function isoDateOf(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10)
}

/**
 * ينزّل نصًا كملف.
 *
 * يعيد `false` بدل أن يُلقي: منع المتصفح للتنزيل حالة متوقعة تُعرض للمستخدم
 * بصدق مع بقاء النص أمامه، لا عطل يُبتلع صامتًا (§6.6 و§13.3).
 */
export function downloadTextFile(text: string, fileName: string, mimeType: string): boolean {
  let url: string | undefined

  try {
    const blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
    url = URL.createObjectURL(blob)

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.rel = 'noopener'

    document.body.append(anchor)
    anchor.click()
    anchor.remove()

    return true
  } catch {
    return false
  } finally {
    // يُحرَّر بعد إتاحة الفرصة للمتصفح لبدء التنزيل من الرابط.
    const created = url
    if (created !== undefined) setTimeout(() => { URL.revokeObjectURL(created) }, 0)
  }
}

/** يقرأ نص ملف اختاره المستخدم. `undefined` تعني تعذّر القراءة لا ملفًا فارغًا. */
export async function readTextFile(file: File): Promise<string | undefined> {
  try {
    return await file.text()
  } catch {
    return undefined
  }
}

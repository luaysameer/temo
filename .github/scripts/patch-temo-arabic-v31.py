from pathlib import Path
import re

p = Path('_apkbuild/v3minsrc/app/src/main/java/com/temo/arabic/extractor/MainActivity.java')
s = p.read_text(encoding='utf-8')

old_title = "                \"const title=(ld.name||meta('og:title')||document.title||q('h1')?.innerText||'').trim();\" +"
new_title = r'''                "const h1=(q('h1')?.innerText||'').trim();const heading=all('h1,h2,h3,.title,.video-title,.post-title').map(e=>(e.innerText||'').trim()).find(t=>/(?:مشاهدة\\s+)?(?:فيلم|مسلسل|حلقة)/i.test(t))||'';const bodyTitle=((txt.match(/(?:مشاهدة\\s+)?(?:فيلم|مسلسل)\\s+[^\\n]{2,140}?(?=\\s+(?:كامل|اون\\s*لاين|HD)|$)/i)||[])[0]||'').trim();const title=(heading||h1||bodyTitle||meta('og:title')||ld.name||document.title||'').trim();" +'''
if old_title not in s:
    raise SystemExit('title extraction anchor not found')
s = s.replace(old_title, new_title, 1)

old_zip = 'i.putExtra(Intent.EXTRA_TITLE, safeFileBase() + "_FULL_PACK.zip");'
new_zip = 'i.putExtra(Intent.EXTRA_TITLE, safeMovieFileBase() + "_FULL_PACK.zip");'
if old_zip not in s:
    raise SystemExit('zip filename anchor not found')
s = s.replace(old_zip, new_zip, 1)

pattern = re.compile(r'''    private String safeFileBase\(\) \{\n        String title = "TEMO_ARABIC";\n        if \(resultPackage != null && resultPackage\.optJSONObject\("media"\) != null\) \{\n            title = resultPackage\.optJSONObject\("media"\)\.optString\("title", title\);\n        \}\n        title = title\.replaceAll\("\[\^\\\\p\{L\}\\\\p\{N\}\._-\]\+", "_"\);\n        if \(title\.length\(\) > 60\) title = title\.substring\(0, 60\);\n        return "TEMO_ARABIC_" \+ title;\n    \}\n''')
replacement = r'''    private String safeFileBase() {
        String title = safeMovieFileBase();
        return "TEMO_ARABIC_" + title;
    }

    private String safeMovieFileBase() {
        String title = "TEMO_ARABIC";
        JSONObject media = resultPackage == null ? null : resultPackage.optJSONObject("media");
        if (media != null) title = media.optString("title", title);

        title = title.replaceFirst("^(?i)(?:مشاهدة\\s+)?(?:فيلم|مسلسل|حلقة)\\s+", "").trim();
        title = title.replaceFirst("(?i)^فيديو\\s+لاروزا$", "").trim();
        if (title.isEmpty() || title.equalsIgnoreCase("TEMO_ARABIC")) {
            String raw = detail == null ? "" : detail.optString("body_sample", "");
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?:مشاهدة\\s+)?(?:فيلم|مسلسل)\\s+([^\\n]{2,120}?)(?=\\s+(?:كامل|اون\\s*لاين|HD)|$)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(raw);
            if (m.find()) title = m.group(1).trim();
        }
        if (title.isEmpty()) title = "TEMO_ARABIC";
        title = title.replaceAll("[^\\p{L}\\p{N}._-]+", "_");
        title = title.replaceAll("_+", "_").replaceAll("^_+|_+$", "");
        if (title.length() > 70) title = title.substring(0, 70);
        return title;
    }
'''
s2, n = pattern.subn(lambda m: replacement, s, count=1)
if n != 1:
    raise SystemExit(f'safeFileBase patch count={n}')
s = s2

s = s.replace('TEMO Arabic Movie Extractor Android 1.2.0', 'TEMO Arabic Movie Extractor Android 1.3.0')
s = s.replace('TEMO Arabic Movie Extractor V3\\nهذه الحزمة', 'TEMO Arabic Movie Extractor V3.1\\nاسم ملف ZIP يعتمد على اسم الفيلم/المسلسل المستخرج.\\nهذه الحزمة')

p.write_text(s, encoding='utf-8')
print('V3.1 movie filename patch applied')

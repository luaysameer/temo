from pathlib import Path
import re

p = Path('_apkbuild/v3minsrc/app/src/main/java/com/temo/arabic/extractor/MainActivity.java')
s = p.read_text(encoding='utf-8')

pattern = re.compile(r'''    private String safeMovieFileBase\(\) \{.*?\n    \}\n\n    @Override''', re.S)
replacement = r'''    private String safeMovieFileBase() {
        String title = "";
        JSONObject media = resultPackage == null ? null : resultPackage.optJSONObject("media");
        if (media != null) title = media.optString("title", "");

        // V3.2: اسم الحزمة = اسم العمل الحقيقي فقط.
        // "مشاهدة فيلم أسد 2026 كامل اون لاين HD" -> "أسد"
        // "Watch The Accountant 2 2025 Full HD" -> "The_Accountant_2"
        title = extractCoreTitleForFilename(title);

        if (title.isEmpty()) {
            String rawTitle = detail == null ? "" : detail.optString("title", "");
            title = extractCoreTitleForFilename(rawTitle);
        }

        if (title.isEmpty()) {
            String raw = detail == null ? "" : detail.optString("body_sample", "");
            java.util.regex.Matcher m = java.util.regex.Pattern.compile(
                    "(?:مشاهدة\\s+)?(?:فيلم|مسلسل)\\s+([^\\n]{2,140}?)(?=\\s+(?:كامل|اون\\s*لاين|أون\\s*لاين|HD|FHD)|$)",
                    java.util.regex.Pattern.CASE_INSENSITIVE
            ).matcher(raw);
            if (m.find()) title = extractCoreTitleForFilename(m.group(1));
        }

        if (title.isEmpty()) title = "TEMO_ARABIC";
        title = title.replaceAll("[^\\p{L}\\p{N}._-]+", "_");
        title = title.replaceAll("_+", "_").replaceAll("^_+|_+$", "");
        if (title.length() > 70) title = title.substring(0, 70);
        return title;
    }

    private String extractCoreTitleForFilename(String input) {
        if (input == null) return "";
        String x = input.replace('\u00A0', ' ').replaceAll("\\s+", " ").trim();
        if (x.isEmpty()) return "";

        if (x.matches("(?i)^(?:فيديو\\s+)?لاروزا$") || x.matches("(?i)^Laroza$")) return "";

        x = x.replaceFirst("(?i)^(?:مشاهدة|تحميل|Watch|Download)\\s+", "").trim();
        x = x.replaceFirst("(?i)^(?:فيلم|مسلسل|حلقة|Movie|Film|Series|Episode)\\s+", "").trim();

        x = x.replaceFirst(
                "(?i)\\s+(?:كامل|كاملا|اون\\s*لاين|أون\\s*لاين|اونلاين|online|full|HD|FHD|4K|1080p|720p|مترجم|مدبلج|مشاهدة\\s+مباشرة)(?:\\s+.*)?$",
                ""
        ).trim();

        x = x.replaceFirst("\\s+(?:19|20)\\d{2}$", "").trim();
        x = x.replaceFirst("(?i)\\s*[-|–—:]\\s*(?:Laroza|لاروزا).*$", "").trim();
        return x;
    }

    @Override'''

s2, n = pattern.subn(lambda m: replacement, s, count=1)
if n != 1:
    raise SystemExit(f'V3.2 safeMovieFileBase patch count={n}')
s = s2
s = s.replace('TEMO Arabic Movie Extractor Android 1.3.0', 'TEMO Arabic Movie Extractor Android 1.3.2')
s = s.replace('TEMO Arabic Movie Extractor V3.1', 'TEMO Arabic Movie Extractor V3.2')
p.write_text(s, encoding='utf-8')
print('V3.2 title-only ZIP filename patch applied')

package com.temo.aiprompts;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.content.Intent;
import android.net.Uri;
import java.io.ByteArrayOutputStream;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://gpt100.cpu2turn.workers.dev/";
    private WebView webView;
    private ProgressBar progressBar;
    private ImageView splashLogo;
    private String logoDataUrl;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.parseColor("#06101D"));
        getWindow().setNavigationBarColor(Color.parseColor("#06101D"));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#06101D"));

        webView = new WebView(this);
        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        root.addView(webView, webParams);

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.parseColor("#34C6FF")));
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(3)
        );
        progressParams.gravity = Gravity.TOP;
        root.addView(progressBar, progressParams);

        splashLogo = new ImageView(this);
        splashLogo.setImageResource(R.drawable.temo_logo);
        splashLogo.setScaleType(ImageView.ScaleType.CENTER_CROP);
        splashLogo.setBackgroundColor(Color.parseColor("#06101D"));
        splashLogo.setPadding(dp(34), dp(34), dp(34), dp(34));
        FrameLayout.LayoutParams splashParams = new FrameLayout.LayoutParams(
                dp(280), dp(280), Gravity.CENTER
        );
        root.addView(splashLogo, splashParams);

        setContentView(root);
        logoDataUrl = buildLogoDataUrl();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                progressBar.setVisibility(newProgress < 100 ? View.VISIBLE : View.GONE);
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if (host == null || "gpt100.cpu2turn.workers.dev".equals(host)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectTemoLogo(view);
                if (splashLogo.getVisibility() == View.VISIBLE) {
                    splashLogo.animate().alpha(0f).setDuration(420).withEndAction(() -> {
                        splashLogo.setVisibility(View.GONE);
                        splashLogo.setAlpha(1f);
                    }).start();
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showOfflinePage();
            }
        });

        if (savedInstanceState == null) webView.loadUrl(HOME_URL);
        else webView.restoreState(savedInstanceState);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private String buildLogoDataUrl() {
        try {
            Bitmap bitmap = BitmapFactory.decodeResource(getResources(), R.drawable.temo_logo);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 92, out);
            return "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return "";
        }
    }

    private void injectTemoLogo(WebView view) {
        if (logoDataUrl == null || logoDataUrl.isEmpty()) return;
        String js = "(function(){" +
                "var src='" + logoDataUrl + "';" +
                "var brand=document.querySelector('.brand');" +
                "if(brand){brand.innerHTML='<img src=\"'+src+'\" alt=\"TEMO AI PROMPTS\" style=\"width:58px;height:58px;object-fit:cover;border-radius:16px;box-shadow:0 0 20px rgba(52,198,255,.45)\">';brand.style.display='flex';brand.style.alignItems='center';brand.style.justifyContent='center';}" +
                "if(!document.getElementById('temo-app-center-logo')){" +
                "var shell=document.querySelector('.gallery-shell');if(shell){var wrap=document.createElement('div');wrap.id='temo-app-center-logo';wrap.style.cssText='display:flex;justify-content:center;align-items:center;padding:18px 12px 22px;';var img=document.createElement('img');img.src=src;img.alt='TEMO AI PROMPTS';img.style.cssText='width:min(42vw,190px);max-width:190px;aspect-ratio:1/1;object-fit:cover;border-radius:28px;box-shadow:0 0 0 1px rgba(52,198,255,.35),0 0 34px rgba(52,198,255,.38),0 0 48px rgba(143,124,255,.28);';wrap.appendChild(img);shell.insertBefore(wrap,shell.firstChild);}}" +
                "})();";
        view.evaluateJavascript(js, null);
    }

    private void showOfflinePage() {
        String img = logoDataUrl == null ? "" : "<img src='" + logoDataUrl + "' style='width:190px;height:190px;border-radius:28px;object-fit:cover;box-shadow:0 0 30px #34c6ff55'>";
        String html = "<!doctype html><html dir='rtl'><meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<body style='margin:0;background:#06101D;color:#fff;font-family:sans-serif;display:grid;place-items:center;min-height:100vh'>"
                + "<div style='max-width:420px;padding:32px;text-align:center'>" + img
                + "<h2>TEMO AI Prompts</h2><p style='color:#9db4cb;line-height:1.8'>تعذر الاتصال بالموقع. تأكد من الإنترنت ثم حاول مرة ثانية.</p>"
                + "<a href='" + HOME_URL + "' style='display:inline-block;margin-top:14px;padding:14px 22px;border-radius:14px;background:#34C6FF;color:#02121c;text-decoration:none;font-weight:700'>إعادة المحاولة</a>"
                + "</div></body></html>";
        webView.loadDataWithBaseURL(HOME_URL, html, "text/html", "UTF-8", null);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}

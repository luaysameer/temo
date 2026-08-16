package com.temo.superqi;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://temo-usd2iraq.cpu2turn.workers.dev/?platform=android";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setStatusBarColor(Color.rgb(5, 9, 19));
        getWindow().setNavigationBarColor(Color.rgb(5, 9, 19));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(5, 9, 19));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                view.setBackgroundColor(Color.rgb(5, 9, 19));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript("document.querySelectorAll('video').forEach(v=>{v.muted=true;v.loop=true;v.play().catch(()=>{});});", null);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme();
                if (scheme.equals("tel")) {
                    try { startActivity(new Intent(Intent.ACTION_DIAL, uri)); } catch (ActivityNotFoundException ignored) {}
                    return true;
                }
                if (scheme.equals("mailto")) {
                    try { startActivity(new Intent(Intent.ACTION_SENDTO, uri)); } catch (ActivityNotFoundException ignored) {}
                    return true;
                }
                return false;
            }
        });

        setContentView(webView);
        webView.loadUrl(APP_URL);
    }

    private boolean online() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            Network n = cm.getActiveNetwork();
            if (n == null) return false;
            NetworkCapabilities c = cm.getNetworkCapabilities(n);
            return c != null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        } catch (Exception e) {
            return true;
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            if (online()) {
                webView.evaluateJavascript("document.querySelectorAll('video').forEach(v=>v.play().catch(()=>{}));", null);
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}

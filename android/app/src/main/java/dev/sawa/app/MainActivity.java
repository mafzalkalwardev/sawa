package dev.sawa.app;

import android.Manifest;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private static final String START_URL = "https://sawa.induswebagency.com/en/app";
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private final ActivityResultLauncher<Intent> filePicker = registerForActivityResult(
        new ActivityResultContracts.StartActivityForResult(),
        result -> {
            ValueCallback<Uri[]> pending = fileCallback;
            fileCallback = null;
            if (pending == null) return;
            Uri[] uris = null;
            if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                ClipData clip = result.getData().getClipData();
                if (clip != null) {
                    uris = new Uri[clip.getItemCount()];
                    for (int i = 0; i < clip.getItemCount(); i++) uris[i] = clip.getItemAt(i).getUri();
                } else if (result.getData().getData() != null) {
                    uris = new Uri[]{result.getData().getData()};
                }
            }
            pending.onReceiveValue(uris);
        }
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.RECORD_AUDIO
            }, 1);
        }
        getWindow().setStatusBarColor(0xFF0E2A24);
        getWindow().setNavigationBarColor(0xFFF4F1EA);
        webView = new WebView(this);
        webView.setBackgroundColor(0xFF0E2A24);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                String origin = request.getOrigin() == null ? "" : request.getOrigin().toString();
                if (origin.startsWith("https://sawa.induswebagency.com")) {
                    runOnUiThread(() -> request.grant(request.getResources()));
                } else {
                    request.deny();
                }
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    filePicker.launch(params.createIntent());
                } catch (Exception error) {
                    fileCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
                return true;
            }
        });
        webView.loadUrl(START_URL);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }
}

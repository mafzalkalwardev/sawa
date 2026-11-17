package dev.sawa.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashSet;

public class MainActivity extends AppCompatActivity {
    private static final String START_URL = "https://sawa.induswebagency.com/en/app";
    private static final String ORIGIN = "https://sawa.induswebagency.com";
    private WebView webView;
    private final Handler alerts = new Handler(Looper.getMainLooper());
    private final Runnable poll = new Runnable() {
        @Override
        public void run() {
            new Thread(() -> checkUpdates()).start();
            alerts.postDelayed(this, 20000);
        }
    };
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
        ArrayList<String> needed = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.ACCESS_FINE_LOCATION);
            needed.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.RECORD_AUDIO);
        }
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (!needed.isEmpty()) ActivityCompat.requestPermissions(this, needed.toArray(new String[0]), 1);
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && manager != null) {
            manager.createNotificationChannel(new NotificationChannel("sawa-updates", "Ride updates", NotificationManager.IMPORTANCE_DEFAULT));
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

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request == null || !request.isForMainFrame()) return;
                String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head>"
                    + "<body style='margin:0;background:#0E2A24;color:#F4F1EA;font-family:sans-serif;padding:28px'>"
                    + "<h1 style='font-weight:500'>Sawa</h1>"
                    + "<p>This page did not load. The app is still open.</p>"
                    + "<p><a href='" + START_URL + "' style='color:#C4A574'>Try again</a></p>"
                    + "</body></html>";
                view.loadDataWithBaseURL("https://sawa.induswebagency.com/", html, "text/html", "utf-8", null);
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
        alerts.postDelayed(poll, 8000);
    }

    @Override
    protected void onDestroy() {
        alerts.removeCallbacks(poll);
        super.onDestroy();
    }

    private void checkUpdates() {
        try {
            String cookie = CookieManager.getInstance().getCookie(ORIGIN);
            if (cookie == null || !cookie.contains("sawa_session")) return;
            HttpURLConnection connection = (HttpURLConnection) new URL(ORIGIN + "/api/updates/pending").openConnection();
            connection.setRequestProperty("Cookie", cookie);
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(8000);
            if (connection.getResponseCode() != 200) return;
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            StringBuilder body = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
            reader.close();
            JSONArray updates = new JSONObject(body.toString()).optJSONArray("updates");
            if (updates == null) return;
            SharedPreferences prefs = getSharedPreferences("sawa-updates", MODE_PRIVATE);
            HashSet<String> seen = new HashSet<>();
            for (String id : prefs.getString("seen", "").split(",")) if (!id.isEmpty()) seen.add(id);
            boolean arabic = webView != null && webView.getUrl() != null && webView.getUrl().contains("/ar/");
            boolean changed = false;
            for (int i = 0; i < updates.length(); i++) {
                JSONObject item = updates.getJSONObject(i);
                String id = item.optString("id");
                if (id.isEmpty() || seen.contains(id)) continue;
                seen.add(id);
                changed = true;
                String text = arabic ? item.optString("ar") : item.optString("en");
                String noteId = id;
                alerts.post(() -> showUpdate(noteId, text));
            }
            if (changed) {
                StringBuilder kept = new StringBuilder();
                int count = 0;
                for (String id : seen) {
                    if (count++ > 40) break;
                    if (kept.length() > 0) kept.append(',');
                    kept.append(id);
                }
                prefs.edit().putString("seen", kept.toString()).apply();
            }
        } catch (Exception ignored) {
        }
    }

    private void showUpdate(String id, String text) {
        if (text == null || text.isEmpty()) return;
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager == null) return;
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pending = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        manager.notify(id.hashCode(), new NotificationCompat.Builder(this, "sawa-updates")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Sawa")
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setContentIntent(pending)
            .build());
    }

    @Override
    public void onBackPressed() {
        if (webView == null) return;
        if (webView.canGoBack()) {
            webView.goBack();
            return;
        }
        String url = webView.getUrl() == null ? "" : webView.getUrl();
        if (!url.contains("/app")) webView.loadUrl(START_URL);
    }
}

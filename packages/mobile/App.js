import React, { useEffect } from "react";
import { SafeAreaView, Platform } from "react-native";
import { WebView } from "react-native-webview";

const origin = process.env.EXPO_PUBLIC_WEB_ORIGIN || "http://localhost:3002";

export default function App() {
  if (Platform.OS === "web") {
    useEffect(() => {
      window.location.replace(origin);
    }, []);
    return <div style={{ height: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center" }}>Yönlendiriliyor…</div>;
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <WebView
        source={{ uri: origin }}
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        javaScriptEnabled
        geolocationEnabled
        decelerationRate="normal"
        setSupportMultipleWindows={false}
        originWhitelist={["*"]}
        mediaPlaybackRequiresUserAction={false}
        allowsLinkPreview
        sharedCookiesEnabled
        useWebKit
      />
    </SafeAreaView>
  );
}

module.exports = () => ({
  name: "Istakip",
  slug: "microvisecrm",
  version: "1.0.0",
  orientation: "portrait",
  ios: {
    bundleIdentifier: "com.microvisecrm.istakip",
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "Konum, şube seçimi ve iş emirleri için kullanılır.",
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
      ITSAppUsesNonExemptEncryption: false
    }
  },
  extra: {
    eas: { projectId: "44d5031d-2f33-4b56-bc1f-989d9b2fa543" },
    webOrigin: process.env.EXPO_PUBLIC_WEB_ORIGIN || "http://localhost:3002"
  }
});

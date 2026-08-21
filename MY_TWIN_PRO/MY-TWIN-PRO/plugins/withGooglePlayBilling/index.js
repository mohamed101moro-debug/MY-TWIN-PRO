/** withGooglePlayBilling — جسر فوترة أصلي كامل (Google PBL 6.2.1) بلا مكتبات RN.
 *  يحقن: billing-ktx + إذن BILLING + BillingModule.kt + BillingPackage.kt + تسجيل في MainApplication. */
const { withAppBuildGradle, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
const BILLING_VERSION = '6.2.1';
const KOTLIN_MODULE = `package com.soulsync.mytwin

import android.app.Activity
import com.android.billingclient.api.*
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = BillingModule.NAME)
class BillingModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), PurchasesUpdatedListener {

    companion object { const val NAME = "BillingModule" }
    override fun getName(): String = NAME

    private var billingClient: BillingClient? = null
    private var purchasePromise: Promise? = null

    private fun client(): BillingClient {
        billingClient?.let { if (it.isReady) return it }
        billingClient = BillingClient.newBuilder(reactApplicationContext)
            .setListener(this).enablePendingPurchases().build()
        return billingClient!!
    }

    @ReactMethod
    fun startConnection(promise: Promise) {
        try {
            client().startConnection(object : BillingClientStateListener {
                override fun onBillingSetupFinished(result: BillingResult) {
                    if (result.responseCode == BillingClient.BillingResponseCode.OK) promise.resolve(true)
                    else promise.reject("E_SETUP", result.debugMessage ?: "setup failed")
                }
                override fun onBillingServiceDisconnected() {}
            })
        } catch (e: Exception) { promise.reject("E_CONN", e.message) }
    }

    @ReactMethod
    fun launchBillingFlow(sku: String, promise: Promise) {
        try {
            val c = client()
            purchasePromise = promise
            val params = QueryProductDetailsParams.newBuilder().setProductList(
                listOf(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(sku).setProductType(BillingClient.ProductType.SUBS).build())
            ).build()
            c.queryProductDetailsAsync(params) { result, details ->
                val product = details.firstOrNull()
                if (product == null) { purchasePromise?.reject("E_SKU", "sku not found: " + sku); purchasePromise = null; return@queryProductDetailsAsync }
                val activity = currentActivity
                if (activity == null) { purchasePromise?.reject("E_ACT", "no activity"); purchasePromise = null; return@queryProductDetailsAsync }
                activity.runOnUiThread {
                    val flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(
                        listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).build())
                    ).build()
                    val br = c.launchBillingFlow(activity, flow)
                    if (br.responseCode != BillingClient.BillingResponseCode.OK) {
                        purchasePromise?.reject("E_LAUNCH", br.debugMessage ?: "launch failed"); purchasePromise = null
                    }
                }
            }
        } catch (e: Exception) { purchasePromise = null; promise.reject("E_BILLING", e.message) }
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        val p = purchasePromise ?: return
        purchasePromise = null
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> p.resolve(purchases?.firstOrNull()?.purchaseToken ?: "")
            BillingClient.BillingResponseCode.USER_CANCELED -> p.reject("E_CANCELLED", "cancelled")
            else -> p.reject("E_PURCHASE", result.debugMessage ?: "purchase failed")
        }
    }

    @ReactMethod
    fun acknowledgePurchase(token: String, promise: Promise) {
        try {
            client().acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(token).build()) { r ->
                if (r.responseCode == BillingClient.BillingResponseCode.OK) promise.resolve(true)
                else promise.reject("E_ACK", r.debugMessage ?: "ack failed")
            }
        } catch (e: Exception) { promise.reject("E_ACK", e.message) }
    }

    @ReactMethod
    fun queryPurchases(promise: Promise) {
        try {
            client().queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()) { r, list ->
                if (r.responseCode == BillingClient.BillingResponseCode.OK) {
                    val arr = Arguments.createArray()
                    list.forEach { pu ->
                        val m = Arguments.createMap()
                        m.putString("token", pu.purchaseToken)
                        m.putString("sku", pu.products.firstOrNull() ?: "")
                        arr.pushMap(m)
                    }
                    promise.resolve(arr)
                } else promise.resolve(Arguments.createArray())
            }
        } catch (e: Exception) { promise.resolve(Arguments.createArray()) }
    }
}
`;
const KOTLIN_PACKAGE = `package com.soulsync.mytwin

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class BillingPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(BillingModule(reactContext))
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
`;
module.exports = function withGooglePlayBilling(config) {
  config = withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('billing-ktx')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /dependencies\s*\{/,
        "dependencies {\n    implementation 'com.android.billingclient:billing-ktx:" + BILLING_VERSION + "'"
      );
    } else {
      cfg.modResults.contents = cfg.modResults.contents.replace(/billing-ktx:[\d.]+/, 'billing-ktx:' + BILLING_VERSION);
    }
    return cfg;
  });
  config = withAndroidManifest(config, (cfg) => {
    const perms = cfg.modResults.manifest['uses-permission'] || [];
    if (!perms.some((p) => p.$['android:name'] === 'com.android.vending.BILLING')) {
      perms.push({ $: { 'android:name': 'com.android.vending.BILLING' } });
      cfg.modResults.manifest['uses-permission'] = perms;
    }
    return cfg;
  });
  config = withDangerousMod(config, ['android', (cfg) => {
    const pkg = 'com.soulsync.mytwin';
    const dir = path.join(cfg.modRequest.projectRoot, 'android', 'app', 'src', 'main', 'java', ...pkg.split('.'));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'BillingModule.kt'), KOTLIN_MODULE);
    fs.writeFileSync(path.join(dir, 'BillingPackage.kt'), KOTLIN_PACKAGE);
    const mainPath = path.join(dir, 'MainApplication.kt');
    if (fs.existsSync(mainPath)) {
      let m = fs.readFileSync(mainPath, 'utf-8');
      if (!m.includes('BillingPackage()')) {
        m = m.replace('return PackageList(this).packages',
          'val packages = PackageList(this).packages\n        packages.add(BillingPackage())\n        return packages');
        fs.writeFileSync(mainPath, m);
      }
    }
    return cfg;
  }]);
  return config;
};

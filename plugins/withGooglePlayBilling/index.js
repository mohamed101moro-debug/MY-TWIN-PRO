/**
 * withGooglePlayBilling — minimal native bridge for Google Play Billing Library 8.
 * The backend verifies every token before the JS layer acknowledges or grants access.
 */
const { withAppBuildGradle, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
const BILLING_VERSION = '8.0.0';
const BILLING_DEPENDENCY = `implementation 'com.android.billingclient:billing:${BILLING_VERSION}'`;

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
            .setListener(this)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
            )
            .enableAutoServiceReconnection()
            .build()
        return billingClient!!
    }

    @ReactMethod
    fun startConnection(promise: Promise) {
        try {
            val c = client()
            if (c.isReady) { promise.resolve(true); return }
            c.startConnection(object : BillingClientStateListener {
                override fun onBillingSetupFinished(result: BillingResult) {
                    if (result.responseCode == BillingClient.BillingResponseCode.OK) promise.resolve(true)
                    else promise.reject("E_SETUP", result.debugMessage ?: "setup failed")
                }
                override fun onBillingServiceDisconnected() {}
            })
        } catch (e: Exception) { promise.reject("E_CONN", e.message) }
    }

    @ReactMethod
    fun launchBillingFlow(productId: String, obfuscatedAccountId: String, promise: Promise) {
        try {
            val c = client()
            if (!c.isReady) { promise.reject("E_SETUP", "billing client is not ready"); return }
            if (purchasePromise != null) { promise.reject("E_BUSY", "another purchase is in progress"); return }
            purchasePromise = promise
            val query = QueryProductDetailsParams.newBuilder().setProductList(
                listOf(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build())
            ).build()
            c.queryProductDetailsAsync(query) { result, queryResult ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    purchasePromise?.reject("E_PRODUCT_QUERY", result.debugMessage ?: "product query failed")
                    purchasePromise = null
                    return@queryProductDetailsAsync
                }
                val product = queryResult.productDetailsList.firstOrNull()
                if (product == null) {
                    purchasePromise?.reject("E_SKU", "subscription product is unavailable")
                    purchasePromise = null
                    return@queryProductDetailsAsync
                }
                val offerToken = product.subscriptionOfferDetails?.firstOrNull()?.offerToken
                if (offerToken.isNullOrBlank()) {
                    purchasePromise?.reject("E_OFFER", "no eligible subscription offer")
                    purchasePromise = null
                    return@queryProductDetailsAsync
                }
                val activity: Activity? = currentActivity
                if (activity == null) {
                    purchasePromise?.reject("E_ACT", "no activity")
                    purchasePromise = null
                    return@queryProductDetailsAsync
                }
                activity.runOnUiThread {
                    try {
                        val flowBuilder = BillingFlowParams.newBuilder()
                            .setProductDetailsParamsList(
                                listOf(BillingFlowParams.ProductDetailsParams.newBuilder()
                                    .setProductDetails(product)
                                    .setOfferToken(offerToken)
                                    .build())
                            )
                        if (obfuscatedAccountId.isNotBlank()) {
                            flowBuilder.setObfuscatedAccountId(obfuscatedAccountId)
                        }
                        val billingResult = c.launchBillingFlow(activity, flowBuilder.build())
                        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                            purchasePromise?.reject("E_LAUNCH", billingResult.debugMessage ?: "launch failed")
                            purchasePromise = null
                        }
                    } catch (e: Exception) {
                        purchasePromise?.reject("E_LAUNCH", e.message)
                        purchasePromise = null
                    }
                }
            }
        } catch (e: Exception) {
            purchasePromise = null
            promise.reject("E_BILLING", e.message)
        }
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        val promise = purchasePromise ?: return
        purchasePromise = null
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                val purchase = purchases?.firstOrNull()
                if (purchase == null) {
                    promise.reject("E_EMPTY_PURCHASE", "Google Play returned no purchase")
                } else if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) {
                    promise.reject("E_PENDING", "purchase is pending; entitlement is not granted")
                } else {
                    val resultMap = Arguments.createMap()
                    resultMap.putString("token", purchase.purchaseToken)
                    resultMap.putString("sku", purchase.products.firstOrNull() ?: "")
                    resultMap.putInt("purchaseState", purchase.purchaseState)
                    resultMap.putBoolean("isAcknowledged", purchase.isAcknowledged)
                    promise.resolve(resultMap)
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> promise.reject("E_CANCELLED", "cancelled")
            else -> promise.reject("E_PURCHASE", result.debugMessage ?: "purchase failed")
        }
    }

    @ReactMethod
    fun acknowledgePurchase(token: String, promise: Promise) {
        try {
            client().acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(token).build()) { result ->
                if (result.responseCode == BillingClient.BillingResponseCode.OK) promise.resolve(true)
                else promise.reject("E_ACK", result.debugMessage ?: "acknowledgement failed")
            }
        } catch (e: Exception) { promise.reject("E_ACK", e.message) }
    }

    @ReactMethod
    fun queryPurchases(promise: Promise) {
        try {
            client().queryPurchasesAsync(
                QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()
            ) { result, purchases ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    promise.reject("E_QUERY_PURCHASES", result.debugMessage ?: "purchase query failed")
                    return@queryPurchasesAsync
                }
                val array = Arguments.createArray()
                purchases.forEach { purchase ->
                    val item = Arguments.createMap()
                    item.putString("token", purchase.purchaseToken)
                    item.putString("sku", purchase.products.firstOrNull() ?: "")
                    item.putInt("purchaseState", purchase.purchaseState)
                    item.putBoolean("isAcknowledged", purchase.isAcknowledged)
                    array.pushMap(item)
                }
                promise.resolve(array)
            }
        } catch (e: Exception) { promise.reject("E_QUERY_PURCHASES", e.message) }
    }

    @ReactMethod
    fun endConnection(promise: Promise) {
        try { billingClient?.endConnection(); billingClient = null; promise.resolve(true) }
        catch (e: Exception) { promise.reject("E_DISCONNECT", e.message) }
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
    const dependencyPattern = /implementation\s+['"]com\.android\.billingclient:(?:billing-ktx|billing):[^'"]+['"]/;
    if (dependencyPattern.test(cfg.modResults.contents)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(dependencyPattern, BILLING_DEPENDENCY);
    } else {
      cfg.modResults.contents = cfg.modResults.contents.replace(/dependencies\s*\{/, `dependencies {\n    ${BILLING_DEPENDENCY}`);
    }
    return cfg;
  });
  config = withAndroidManifest(config, (cfg) => {
    const permissions = cfg.modResults.manifest['uses-permission'] || [];
    if (!permissions.some((permission) => permission.$['android:name'] === 'com.android.vending.BILLING')) {
      permissions.push({ $: { 'android:name': 'com.android.vending.BILLING' } });
      cfg.modResults.manifest['uses-permission'] = permissions;
    }
    return cfg;
  });
  config = withDangerousMod(config, ['android', (cfg) => {
    const packageName = 'com.soulsync.mytwin';
    const directory = path.join(cfg.modRequest.projectRoot, 'android', 'app', 'src', 'main', 'java', ...packageName.split('.'));
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'BillingModule.kt'), KOTLIN_MODULE);
    fs.writeFileSync(path.join(directory, 'BillingPackage.kt'), KOTLIN_PACKAGE);
    const mainPath = path.join(directory, 'MainApplication.kt');
    if (fs.existsSync(mainPath)) {
      let contents = fs.readFileSync(mainPath, 'utf-8');
      if (!contents.includes('BillingPackage()')) {
        contents = contents.replace(
          'return PackageList(this).packages',
          'val packages = PackageList(this).packages\n        packages.add(BillingPackage())\n        return packages'
        );
        fs.writeFileSync(mainPath, contents);
      }
    }
    return cfg;
  }]);
  return config;
};

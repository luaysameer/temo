plugins {
    id("com.android.application")
}

android {
    namespace = "com.temo.aiprompts"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.temo.aiprompts"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.1"
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

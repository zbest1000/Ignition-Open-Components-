plugins {
    `java-library`
    checkstyle
}

checkstyle {
    configFile = rootProject.file("config/checkstyle/checkstyle.xml")
    toolVersion = "10.12.5"
    // The rules in checkstyle.xml report at severity "warning"; any violation fails the build.
    maxWarnings = 0
    maxErrors = 0
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

dependencies {
    api(projects.common)

    compileOnly(libs.ignition.common)
    compileOnly(libs.ignition.designer.api)
    compileOnly(libs.ignition.perspective.common)
    compileOnly(libs.ignition.perspective.designer)

    testImplementation("org.junit.jupiter:junit-jupiter:6.0.3")
    testImplementation(libs.ignition.common)
    testImplementation(libs.ignition.designer.api)
    testImplementation(libs.ignition.perspective.common)
    testImplementation(libs.ignition.perspective.designer)
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
    // The hook tests build Swing icons; no display is needed for that.
    systemProperty("java.awt.headless", "true")
}

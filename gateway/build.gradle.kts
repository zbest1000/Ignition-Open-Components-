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
    implementation(projects.common)
    modlImplementation(projects.web)

    compileOnly(libs.ignition.common)
    compileOnly(libs.ignition.gateway.api)
    compileOnly(libs.ignition.perspective.gateway)
    compileOnly(libs.ignition.perspective.common)

    testImplementation("org.junit.jupiter:junit-jupiter:6.0.3")
    testImplementation(libs.ignition.common)
    testImplementation(libs.ignition.gateway.api)
    testImplementation(libs.ignition.perspective.gateway)
    testImplementation(libs.ignition.perspective.common)
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}

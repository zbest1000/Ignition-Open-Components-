plugins {
    `java-library`
    checkstyle
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

checkstyle {
    configFile = rootProject.file("config/checkstyle/checkstyle.xml")
    toolVersion = "10.12.5"
}

dependencies {
    compileOnly(libs.ignition.common)
    compileOnly(libs.ignition.perspective.common)
    compileOnly(libs.google.guava)
    // javax.annotation (@Nonnull/@Nullable) — guava 30+ no longer exposes jsr305 transitively
    compileOnly(libs.google.jsr305)
    compileOnly(libs.ia.gson)

    testImplementation("org.junit.jupiter:junit-jupiter:6.1.2")
    testImplementation(libs.ignition.common)
    testImplementation(libs.ignition.perspective.common)
    testImplementation(libs.ia.gson)
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}

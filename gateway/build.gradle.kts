plugins {
    `java-library`
    checkstyle
}

checkstyle {
    configFile = rootProject.file("config/checkstyle/checkstyle.xml")
    toolVersion = "10.12.5"
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
    implementation(libs.ignition.perspective.gateway)
    implementation(libs.ignition.perspective.common)
    compileOnly(libs.ia.gson)
}

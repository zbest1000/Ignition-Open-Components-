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
    api(projects.common)

    compileOnly(libs.ignition.common)
    compileOnly(libs.ignition.designer.api)
    compileOnly(libs.ignition.perspective.common)
    compileOnly(libs.ignition.perspective.designer)
    compileOnly(libs.google.guava)
    compileOnly(libs.google.jsr305)
}

import java.security.MessageDigest

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
    // The rules in checkstyle.xml report at severity "warning"; any violation fails the build.
    maxWarnings = 0
    maxErrors = 0
}

/**
 * Writes `open-echarts-build.properties`, the stamp the browser-resource URLs carry so that a
 * browser never keeps a bundle from a previously installed module version.
 *
 * The stamp is a digest of the module version and a build id, never of the bundle's content:
 * - release versions: the build id is empty, so the same version always gives the same stamp
 *   (reproducible; pass -PbuildId=... to tell two builds of one version apart);
 * - -SNAPSHOT versions: the build id defaults to the build time, so every build gets a new stamp.
 */
abstract class GenerateBuildInfo : DefaultTask() {
    @get:Input
    abstract val moduleVersion: Property<String>

    @get:Input
    @get:Optional
    abstract val buildId: Property<String>

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @TaskAction
    fun generate() {
        val version = moduleVersion.get()
        val id = buildId.orNull
            ?: if (version.endsWith("-SNAPSHOT")) System.currentTimeMillis().toString() else ""
        val digest = MessageDigest.getInstance("SHA-256")
            .digest("$version\n$id".toByteArray(Charsets.UTF_8))
        val stamp = digest.take(6).joinToString("") { "%02x".format(it) }
        // Written by hand (not java.util.Properties.store) so the file carries no timestamp comment.
        outputDir.get().file("open-echarts-build.properties").asFile.writeText(
            "moduleVersion=$version\nresourceVersion=$stamp\n",
            Charsets.UTF_8
        )
    }
}

val generateBuildInfo by tasks.registering(GenerateBuildInfo::class) {
    description = "Generates the build stamp used to version the browser-resource URLs."
    moduleVersion.set(provider { project.version.toString() })
    buildId.set(providers.gradleProperty("buildId"))
    outputDir.set(layout.buildDirectory.dir("generated/buildInfo"))
    // A snapshot without an explicit build id is stamped with the build time, so it is never up to date.
    val timeStamped = provider { project.version.toString().endsWith("-SNAPSHOT") }
        .zip(providers.gradleProperty("buildId").map { false }.orElse(true)) { snapshot, noId -> snapshot && noId }
    outputs.upToDateWhen { !timeStamped.get() }
}

sourceSets.main {
    resources.srcDir(generateBuildInfo)
}

dependencies {
    compileOnly(libs.ignition.common)
    compileOnly(libs.ignition.perspective.common)
    compileOnly(libs.ia.gson)

    testImplementation("org.junit.jupiter:junit-jupiter:6.0.3")
    testImplementation(libs.ignition.common)
    testImplementation(libs.ignition.perspective.common)
    testImplementation(libs.ia.gson)
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}

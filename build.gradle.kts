plugins {
    base
    id("io.ia.sdk.modl") version "0.5.0"
}

// ── Version ─────────────────────────────────────────────────────────────────
// Source of truth is `version` in the committed gradle.properties; override per build with
// -PmoduleVersion=... (CI and release do). The gateway refuses to install a module whose
// <version> its parser rejects, so fail here rather than at install time.
val resolvedVersion: String = providers.gradleProperty("moduleVersion")
    .orElse(providers.gradleProperty("version"))
    .orNull
    ?: throw GradleException(
        "No module version set. Define `version` in gradle.properties or pass -PmoduleVersion=X.Y.Z."
    )

val ignitionVersionForm = Regex("""\d+\.\d+\.\d+(\.\d{1,9})?(-(rc\d+|beta\d+|SNAPSHOT))?""")
if (!ignitionVersionForm.matches(resolvedVersion)) {
    throw GradleException(
        "Module version '$resolvedVersion' cannot be parsed by Ignition, so the gateway would reject the " +
            "module. Use X.Y.Z, X.Y.Z.BUILD, X.Y.Z-rcN, X.Y.Z-betaN or X.Y.Z-SNAPSHOT " +
            "(for example 1.2.0, 1.2.0.57, 1.2.0-rc1). SemVer forms such as 1.2.0-rc.1 or " +
            "1.2.0-dev+abc1234 are not accepted."
    )
}

allprojects {
    version = resolvedVersion
    group = "com.opencomponents.echarts"
}

val signModule: Boolean = providers.gradleProperty("signModule").map { it.toBoolean() }.getOrElse(false)

ignitionModule {
    name.set("Open ECharts")
    fileName.set("Open-ECharts.modl")
    id.set("com.opencomponents.echarts.OpenECharts")
    moduleVersion.set(resolvedVersion)
    moduleDescription.set(
        "Apache ECharts components for Perspective: a universal chart renderer, one component per " +
            "ECharts / ECharts-GL chart type, industrial and scheduling charts, and two built-in themes."
    )
    // The module is compiled and tested only against this SDK version, so that is the minimum it
    // claims. Lower it only after verifying the module on the older gateway.
    requiredIgnitionVersion.set(libs.versions.ignition)
    license.set("LICENSE")
    // Matches GatewayHook.isFreeModule(): no licensing, no trial timer.
    freeModule.set(true)

    projectScopes.putAll(
        mapOf(
            ":gateway" to "G",
            ":web" to "G",
            ":designer" to "D",
            ":common" to "GD"
        )
    )

    // required = true: the gateway faults this module if Perspective is absent, instead of
    // loading it with missing classes.
    moduleDependencySpecs {
        register("com.inductiveautomation.perspective") {
            scope = "GD"
            required = true
        }
    }

    hooks.putAll(
        mapOf(
            "com.opencomponents.echarts.gateway.OpenEChartsGatewayHook" to "G",
            "com.opencomponents.echarts.designer.OpenEChartsDesignerHook" to "D"
        )
    )

    // The IA Nexus repository is declared once, in settings.gradle.kts.
    applyInductiveArtifactRepo.set(false)
    // Signing needs -PsignModule=true plus the ignition.signing.* properties
    // (see gradle.properties.template). Without it only the .unsigned.modl is produced.
    skipModlSigning.set(!signModule)
}

tasks.named("assembleModlStructure") {
    val notice = layout.projectDirectory.file("NOTICE")
    inputs.file(notice)
    // Jar names carry the version, so a version change would otherwise leave the previous jars in
    // the staging directory (plugin 0.5.0 then fails zipModule on the duplicate libraries).
    val staging = layout.buildDirectory.dir("moduleContent")
    doFirst {
        delete(fileTree(staging) { include("*.jar") })
    }
    doLast {
        copy {
            from(notice)
            into(staging)
        }
    }
}

tasks.withType<io.ia.sdk.gradle.modl.task.Deploy>().configureEach {
    hostGateway.set(providers.gradleProperty("hostGateway").orElse(""))
}

val deepClean by tasks.registering {
    dependsOn(allprojects.map { "${it.path}:clean" })
    description = "Executes clean tasks and removes caches."
    doLast {
        delete(file(".gradle"))
    }
}

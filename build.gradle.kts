plugins {
    base
    id("io.ia.sdk.modl") version("0.3.0")
}

allprojects {
    version = "0.1.0-SNAPSHOT"
    group = "com.opencomponents.echarts"
}

ignitionModule {
    name.set("Open ECharts")
    fileName.set("Open-ECharts.modl")
    id.set("com.opencomponents.echarts.OpenECharts")
    moduleVersion.set("${project.version}")
    moduleDescription.set(
        "An industrial-focused Perspective component library built on Apache ECharts, " +
        "providing a universal chart renderer, industrial builder components, " +
        "a gateway-hosted theme builder, and theme management system."
    )
    requiredIgnitionVersion.set("8.3.0")
    license.set("LICENSE")

    projectScopes.putAll(
        mapOf(
            ":gateway" to "G",
            ":web" to "G",
            ":designer" to "D",
            ":common" to "GD"
        )
    )

    moduleDependencies.put("com.inductiveautomation.perspective", "GD")

    hooks.putAll(
        mapOf(
            "com.opencomponents.echarts.gateway.OpenEChartsGatewayHook" to "G",
            "com.opencomponents.echarts.designer.OpenEChartsDesignerHook" to "D"
        )
    )

    applyInductiveArtifactRepo.set(true)
    skipModlSigning.set(!findProperty("signModule").toString().toBoolean())
}

tasks.withType<io.ia.sdk.gradle.modl.task.Deploy>().configureEach {
    hostGateway.set(project.findProperty("hostGateway")?.toString() ?: "")
}

val deepClean by tasks.registering {
    dependsOn(allprojects.map { "${it.path}:clean" })
    description = "Executes clean tasks and removes caches."
    doLast {
        delete(file(".gradle"))
    }
}

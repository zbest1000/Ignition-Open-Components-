import com.github.gradle.node.npm.task.NpmTask

plugins {
    java
    id("com.github.node-gradle.node") version "7.1.0"
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

node {
    // Single source for the Node version: gradle/libs.versions.toml (CI reads the same entry).
    version.set(libs.versions.node)
    download.set(true)
    // Node is resolved through the "Node.js" ivy repository declared in settings.gradle.kts.
    distBaseUrl.set(null as String?)
    nodeProjectDir.set(layout.projectDirectory)
}

// Everything webpack writes here is packaged into web.jar under mounted/ and served by the gateway.
val generatedResources = layout.buildDirectory.dir("generated-resources")

// The component manifest is shared with the Java side and imported by the web sources.
val componentManifest = rootProject.layout.projectDirectory
    .file("common/src/main/resources/components.manifest.json")

// Sources plus every config file that can change the result of webpack / eslint / jest.
val webSources = fileTree(layout.projectDirectory) {
    exclude(
        "node_modules/**", "build/**", "dist/**", "coverage/**", ".gradle/**", "build.gradle.kts",
        "test-results/**", "**/*.log"
    )
}

val installDependencies by tasks.registering(NpmTask::class) {
    group = "Ignition Module"
    description = "Installs the exact dependency tree from package-lock.json (npm ci)."

    // `ci` never rewrites the lockfile and fails if package.json and the lockfile disagree.
    args.set(listOf("ci", "--no-audit", "--no-fund"))

    inputs.file("package.json")
    inputs.file("package-lock.json")
    // Written by npm at the end of every install; cheaper to track than all of node_modules.
    outputs.file("node_modules/.package-lock.json")
}

val webpack by tasks.registering(NpmTask::class) {
    group = "Ignition Module"
    description = "Bundles the web components with webpack."

    dependsOn(installDependencies)
    args.set(listOf("run", "build"))

    inputs.files(webSources).withPathSensitivity(PathSensitivity.RELATIVE)
    inputs.file(componentManifest).withPathSensitivity(PathSensitivity.NONE)
    outputs.dir(generatedResources)

    // Chunk file names are content-hashed; start empty so chunks from an earlier build never ship.
    doFirst {
        delete(generatedResources)
    }
}

val lintWeb by tasks.registering(NpmTask::class) {
    group = "verification"
    description = "Runs eslint on the web sources."

    dependsOn(installDependencies)
    args.set(listOf("run", "lint"))

    val marker = layout.buildDirectory.file("verification/lint.ok")
    inputs.files(webSources).withPathSensitivity(PathSensitivity.RELATIVE)
    inputs.file(componentManifest).withPathSensitivity(PathSensitivity.NONE)
    outputs.file(marker)
    doLast {
        marker.get().asFile.writeText("ok\n")
    }
}

val testWeb by tasks.registering(NpmTask::class) {
    group = "verification"
    description = "Runs the jest suite for the web sources."

    dependsOn(installDependencies)
    // The bundle step deletes and rewrites build/; keep the two from interleaving.
    mustRunAfter(webpack)
    args.set(listOf("run", "test:ci"))

    inputs.files(webSources).withPathSensitivity(PathSensitivity.RELATIVE)
    inputs.file(componentManifest).withPathSensitivity(PathSensitivity.NONE)
    outputs.dir("coverage")
}

lintWeb {
    mustRunAfter(webpack)
}

sourceSets {
    main {
        // Registers the webpack output as a resource root; processResources then depends on webpack.
        resources.srcDir(webpack)
    }
}

tasks {
    check {
        dependsOn(lintWeb, testWeb)
    }

    clean {
        delete("dist", "coverage")
    }
}

val deepClean by tasks.registering {
    dependsOn(tasks.named("clean"))
    doLast {
        delete(file(".gradle"))
        delete(file("node_modules"))
    }
}

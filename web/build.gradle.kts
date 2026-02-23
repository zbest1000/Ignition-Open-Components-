import com.github.gradle.node.npm.task.NpmTask

plugins {
    java
    id("com.github.node-gradle.node") version("3.2.1")
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

val projectOutput: String by extra("$buildDir/generated-resources/")

node {
    version.set("22.6.0")
    npmVersion.set("10.8.2")
    download.set(true)
    nodeProjectDir.set(file(project.projectDir))
}

val installDependencies by tasks.registering(NpmTask::class) {
    args.set(listOf("install"))

    inputs.files(
        fileTree(project.projectDir).matching {
            include("package.json", "package-lock.json")
        }
    )

    outputs.dirs(file("node_modules"))
}

val webpack by tasks.registering(NpmTask::class) {
    group = "Ignition Module"
    description = "Runs webpack to bundle the web components"

    args.set(listOf("run", "build"))
    dependsOn(installDependencies)

    inputs.files(project.fileTree("src").matching {
        exclude("**/node_modules/**", "**/dist/**", "**/.awcache/**")
    }.toList())

    outputs.files(fileTree(projectOutput))
}

tasks {
    processResources {
        dependsOn(webpack)
        from(projectOutput) { into("") }
        duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    }

    jar {
        duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    }

    clean {
        delete("dist")
    }
}

val deepClean by tasks.registering {
    doLast {
        delete(file(".gradle"))
        delete(file("node_modules"))
    }
    dependsOn(project.tasks.named("clean"))
}

sourceSets {
    main {
        output.dir(projectOutput, "builtBy" to listOf(webpack))
    }
}

package com.opencomponents.echarts.gateway.api;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import com.inductiveautomation.ignition.common.util.LoggerEx;

/**
 * File-based theme storage. Persists theme JSON files under the Ignition
 * data directory at {@code data/open-echarts/themes/<name>.json}.
 */
public class ThemeRepository {

    private static final LoggerEx log = LoggerEx.newBuilder().build(ThemeRepository.class);

    private final Path baseDir;

    public ThemeRepository(Path dataDir) {
        this.baseDir = dataDir.resolve("open-echarts").resolve("themes");
        try {
            Files.createDirectories(this.baseDir);
        } catch (IOException e) {
            log.error("Failed to create theme directory: " + baseDir, e);
        }
    }

    public List<String> listNames() {
        List<String> names = new ArrayList<>();
        if (!Files.isDirectory(baseDir)) return names;
        try (Stream<Path> stream = Files.list(baseDir)) {
            stream.filter(p -> p.toString().endsWith(".json"))
                .map(p -> {
                    String fn = p.getFileName().toString();
                    return fn.substring(0, fn.length() - 5);
                })
                .forEach(names::add);
        } catch (IOException e) {
            log.error("Failed to list themes", e);
        }
        return names;
    }

    public Optional<String> load(String name) {
        Path file = baseDir.resolve(sanitizeName(name) + ".json");
        if (!Files.exists(file)) return Optional.empty();
        try {
            return Optional.of(Files.readString(file, StandardCharsets.UTF_8));
        } catch (IOException e) {
            log.error("Failed to load theme: " + name, e);
            return Optional.empty();
        }
    }

    public boolean save(String name, String json) {
        try {
            Files.writeString(baseDir.resolve(sanitizeName(name) + ".json"),
                json, StandardCharsets.UTF_8);
            return true;
        } catch (IOException e) {
            log.error("Failed to save theme: " + name, e);
            return false;
        }
    }

    public boolean delete(String name) {
        try {
            return Files.deleteIfExists(baseDir.resolve(sanitizeName(name) + ".json"));
        } catch (IOException e) {
            log.error("Failed to delete theme: " + name, e);
            return false;
        }
    }

    /**
     * Normalises a theme name to a safe filename stem. Any character outside
     * {@code [a-zA-Z0-9_-]} (including path separators and {@code ..}) is
     * replaced with an underscore, so the result can never traverse outside
     * the themes directory.
     */
    public static String sanitizeName(String name) {
        return name.replaceAll("[^a-zA-Z0-9_-]", "_");
    }

    /**
     * A name is valid only if it is non-blank and already equal to its
     * sanitised form. Rejecting (rather than silently rewriting) prevents two
     * distinct inputs (e.g. {@code "a/b"} and {@code "a-b"}) from colliding to
     * the same file and overwriting one another.
     */
    public static boolean isValidName(String name) {
        return name != null && !name.isBlank() && name.equals(sanitizeName(name));
    }
}
